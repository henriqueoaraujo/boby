/* =========================================================
   AUTH REPOSITORY
   ---------------------------------------------------------
   Camada de autenticação.
   Mantém o Boby em modo local quando Supabase não existe.
   ========================================================= */

import { state } from "../core/state.js";
import { translateAuthError } from "../core/authErrors.js";
import {
  validateAuthForm,
  validateBirthDate,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation
} from "../core/authRules.js";
import {
  clearStoredAuth,
  getCachedAuthSession,
  getAuthPersistence,
  setAuthPersistence
} from "../core/authStorage.js";
import {
  IS_SUPABASE_CONFIGURED,
  SUPABASE_ANON_KEY,
  SUPABASE_URL
} from "../config/supabaseConfig.js";
import { getSupabaseClient } from "./supabaseClient.js";
import { getLanguage } from "../core/i18n.js";

const providerLabels = {
  google: "Google",
  github: "GitHub",
  linkedin_oidc: "LinkedIn"
};

let providerAvailability = null;
const APP_REDIRECT_URL = new URL(
  import.meta.env.BASE_URL || "/",
  window.location.origin
).href;

function localized(pt, en, es) {
  return getLanguage() === "en" ? en : getLanguage() === "es" ? es : pt;
}

async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function loadAuthProviderAvailability() {
  if (providerAvailability) return providerAvailability;

  const unavailableProviders = {
    google: false,
    github: false,
    linkedin_oidc: false
  };

  if (!IS_SUPABASE_CONFIGURED || !navigator.onLine) return unavailableProviders;

  try {
    const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY }
    });
    if (!response.ok) return unavailableProviders;

    const settings = await response.json();
    providerAvailability = {
      google: Boolean(settings.external?.google),
      github: Boolean(settings.external?.github),
      linkedin_oidc: Boolean(settings.external?.linkedin_oidc)
    };
  } catch (error) {
    console.warn("Não foi possível verificar os provedores de acesso.", error);
    return unavailableProviders;
  }

  return providerAvailability;
}

function applySession(session) {
  const user = session?.user || null;

  state.session = {
    user,
    isAuthenticated: Boolean(user),
    mode: user ? (navigator.onLine ? "supabase" : "offline") : "locked",
    isSupabaseConfigured: IS_SUPABASE_CONFIGURED,
    isLoading: false
  };

  return state.session;
}

export async function initializeAuth() {
  state.session.isLoading = true;
  state.session.isSupabaseConfigured = IS_SUPABASE_CONFIGURED;

  if (!navigator.onLine) {
    return applySession(getCachedAuthSession());
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    return applySession(null);
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.warn("Não foi possível recuperar sessão.", error);
    const session = data?.session || null;
    return applySession(session);
  }

  return applySession(data.session);
}

export async function signInWithEmail(email, password, remember = true) {
  const validation = validateAuthForm({ email, password, mode: "login" });
  if (!validation.valid) {
    return {
      ok: false,
      message: validation.errors.email || validation.errors.password
    };
  }

  if (!navigator.onLine) {
    return { ok: false, message: localized("Conecte-se à internet para entrar.", "Connect to the internet to sign in.", "Conéctate a internet para entrar.") };
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      message: localized("A autenticação ainda não foi configurada.", "Authentication is not configured yet.", "La autenticación aún no está configurada.")
    };
  }

  setAuthPersistence(remember);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return {
      ok: false,
      code: error.code,
      message: translateAuthError(error)
    };
  }

  applySession(data.session);

  return { ok: true, session: data.session };
}

export async function signUpWithEmail(
  email,
  password,
  confirmPassword,
  remember = true,
  captchaAnswer = "",
  expectedCaptchaAnswer = "",
  name = "",
  birthDate = ""
) {
  const validation = validateAuthForm({
    email,
    name,
    birthDate,
    password,
    confirmPassword,
    captchaAnswer,
    expectedCaptchaAnswer,
    mode: "signup"
  });
  if (!validation.valid) {
    return {
      ok: false,
      message: Object.values(validation.errors).find(Boolean)
    };
  }

  if (!navigator.onLine) {
    return { ok: false, message: localized("Conecte-se à internet para criar sua conta.", "Connect to the internet to create your account.", "Conéctate a internet para crear tu cuenta.") };
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      message: localized("A autenticação ainda não foi configurada.", "Authentication is not configured yet.", "La autenticación aún no está configurada.")
    };
  }

  setAuthPersistence(remember);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: APP_REDIRECT_URL,
      data: {
        full_name: name.trim().replace(/\s+/g, " "),
        birth_date: birthDate
      }
    }
  });

  if (error) {
    return {
      ok: false,
      code: error.code,
      message: translateAuthError(error)
    };
  }

  applySession(data.session);

  return {
    ok: true,
    session: data.session,
    message: data.session
      ? localized("Conta criada e sessão iniciada.", "Account created and signed in.", "Cuenta creada y sesión iniciada.")
      : localized("Conta criada. Confirme o link enviado ao seu e-mail antes de entrar.", "Account created. Confirm the link sent to your email before signing in.", "Cuenta creada. Confirma el enlace enviado a tu correo antes de entrar.")
  };
}

export async function updateUserProfile(name, birthDate, city = "", avatarUrl = "") {
  const nameError = validateName(name);
  const birthDateError = validateBirthDate(birthDate);
  if (nameError || birthDateError) {
    return { ok: false, message: nameError || birthDateError };
  }

  if (!navigator.onLine) {
    return { ok: false, message: localized("Conecte-se à internet para atualizar o perfil.", "Connect to the internet to update your profile.", "Conéctate a internet para actualizar tu perfil.") };
  }

  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, message: localized("A autenticação não está disponível.", "Authentication is unavailable.", "La autenticación no está disponible.") };

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: name.trim().replace(/\s+/g, " "),
      birth_date: birthDate,
      city: city.trim().replace(/\s+/g, " "),
      avatar_url: avatarUrl || state.session.user?.user_metadata?.avatar_url || ""
    }
  });

  if (error) return { ok: false, message: translateAuthError(error) };

  state.session.user = data.user;
  return { ok: true, user: data.user, message: localized("Perfil atualizado.", "Profile updated.", "Perfil actualizado.") };
}

export async function updateUserPassword(currentPassword, password, confirmation) {
  if (!currentPassword) {
    return {
      ok: false,
      message: localized(
        "Informe sua senha atual.",
        "Enter your current password.",
        "Introduce tu contraseña actual."
      )
    };
  }

  const passwordError = validatePassword(password, "signup");
  const confirmationError = validatePasswordConfirmation(password, confirmation);
  if (passwordError || confirmationError) {
    return { ok: false, message: passwordError || confirmationError };
  }

  if (!navigator.onLine) {
    return { ok: false, message: localized("Conecte-se à internet para alterar a senha.", "Connect to the internet to change your password.", "Conéctate a internet para cambiar tu contraseña.") };
  }

  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, message: localized("A autenticação não está disponível.", "Authentication is unavailable.", "La autenticación no está disponible.") };

  const email = state.session.user?.email;
  if (!email) {
    return {
      ok: false,
      message: localized(
        "Esta conta não possui e-mail para confirmar a senha.",
        "This account has no email available for password confirmation.",
        "Esta cuenta no tiene correo para confirmar la contraseña."
      )
    };
  }

  const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });
  if (reauthenticationError) {
    return {
      ok: false,
      message: localized(
        "A senha atual está incorreta.",
        "The current password is incorrect.",
        "La contraseña actual es incorrecta."
      )
    };
  }

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: translateAuthError(error) };

  state.session.user = data.user;
  return { ok: true, message: localized("Senha alterada com sucesso.", "Password changed successfully.", "Contraseña cambiada correctamente.") };
}

export async function deleteUserAccount(currentPassword, confirmation) {
  const expectedConfirmation = {
    "pt-BR": "EXCLUIR",
    en: "DELETE",
    es: "ELIMINAR"
  }[getLanguage()] || "EXCLUIR";
  if (String(confirmation || "").trim().toUpperCase() !== expectedConfirmation) {
    return {
      ok: false,
      message: localized(
        "Digite EXCLUIR para confirmar.",
        "Type DELETE to confirm.",
        "Escribe ELIMINAR para confirmar."
      )
    };
  }
  if (!navigator.onLine) {
    return {
      ok: false,
      message: localized(
        "Conecte-se à internet para excluir a conta.",
        "Connect to the internet to delete the account.",
        "Conéctate a internet para eliminar la cuenta."
      )
    };
  }

  const supabase = await getSupabaseClient();
  if (!supabase || !state.session.user) {
    return { ok: false, message: localized("Sessão inválida.", "Invalid session.", "Sesión inválida.") };
  }

  const providers = state.session.user.app_metadata?.providers || [];
  if (providers.includes("email")) {
    if (!currentPassword) {
      return {
        ok: false,
        message: localized(
          "Informe sua senha atual.",
          "Enter your current password.",
          "Introduce tu contraseña actual."
        )
      };
    }

    const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
      email: state.session.user.email,
      password: currentPassword
    });
    if (reauthenticationError) {
      return {
        ok: false,
        message: localized(
          "A senha atual está incorreta.",
          "The current password is incorrect.",
          "La contraseña actual es incorrecta."
        )
      };
    }
  }

  const { error } = await supabase.functions.invoke("delete-account", {
    body: { confirmation: "EXCLUIR" }
  });
  if (error) {
    return {
      ok: false,
      message: localized(
        "Não foi possível excluir a conta. Verifique a função delete-account no Supabase.",
        "The account could not be deleted. Check the delete-account Supabase function.",
        "No se pudo eliminar la cuenta. Revisa la función delete-account en Supabase."
      )
    };
  }

  clearStoredAuth();
  applySession(null);
  return { ok: true, message: localized("Conta excluída.", "Account deleted.", "Cuenta eliminada.") };
}

export async function signInWithProvider(provider, remember = true) {
  const label = providerLabels[provider];
  if (!label) return { ok: false, message: localized("Plataforma de acesso inválida.", "Invalid sign-in platform.", "Plataforma de acceso inválida.") };

  if (!navigator.onLine) {
    return { ok: false, message: localized(`Conecte-se à internet para entrar com ${label}.`, `Connect to the internet to sign in with ${label}.`, `Conéctate a internet para entrar con ${label}.`) };
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      message: localized("A autenticação ainda não foi configurada.", "Authentication is not configured yet.", "La autenticación aún no está configurada.")
    };
  }

  const providers = await loadAuthProviderAvailability();
  if (!providers[provider]) {
    return {
      ok: false,
      message: localized(`${label} ainda não está habilitado no Supabase.`, `${label} is not enabled in Supabase yet.`, `${label} aún no está habilitado en Supabase.`)
    };
  }

  setAuthPersistence(remember);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: APP_REDIRECT_URL
    }
  });

  if (error) return { ok: false, message: translateAuthError(error) };

  return { ok: true };
}

export async function resendSignupConfirmation(email) {
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, message: emailError };
  if (!navigator.onLine) {
    return { ok: false, message: "Conecte-se à internet para reenviar a confirmação." };
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "A autenticação ainda não foi configurada." };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email
  });

  if (error) return { ok: false, message: translateAuthError(error) };
  return { ok: true, message: localized("Novo e-mail de confirmação enviado.", "A new confirmation email was sent.", "Se envió un nuevo correo de confirmación.") };
}

export async function resetPassword(email) {
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, message: emailError };
  if (!navigator.onLine) {
    return { ok: false, message: "Conecte-se à internet para recuperar sua senha." };
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Configure o Supabase para recuperar a senha."
    };
  }

  if (!email) {
    return { ok: false, message: "Digite seu e-mail primeiro." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: APP_REDIRECT_URL
  });

  if (error) return { ok: false, message: translateAuthError(error) };
  return { ok: true, message: localized("Enviamos o link de recuperação para seu e-mail.", "We sent a recovery link to your email.", "Enviamos un enlace de recuperación a tu correo.") };
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  let signOutError = null;

  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    signOutError = error;
  }

  clearStoredAuth();
  applySession(null);

  return {
    ok: true,
    message: signOutError
      ? "Sessão removida deste dispositivo."
      : "Você saiu da sua conta."
  };
}

export async function onAuthChange(callback) {
  const supabase = await getSupabaseClient();

  if (!supabase) return null;

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session);
    callback?.(state.session);
  });

  return data.subscription;
}

export function shouldRememberSession() {
  return getAuthPersistence();
}
