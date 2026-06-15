import { getLanguage, t } from "./i18n.js";

const messages = {
  invalid: {
    "pt-BR": "E-mail ou senha incorretos.",
    en: "Incorrect email or password.",
    es: "Correo o contraseña incorrectos."
  },
  unconfirmed: {
    "pt-BR": "Confirme seu e-mail antes de entrar.",
    en: "Confirm your email before signing in.",
    es: "Confirma tu correo antes de entrar."
  },
  exists: {
    "pt-BR": "Este e-mail já possui uma conta.",
    en: "This email already has an account.",
    es: "Este correo ya tiene una cuenta."
  },
  weak: {
    "pt-BR": "Use uma senha mais forte, com letras e números.",
    en: "Use a stronger password with letters and numbers.",
    es: "Usa una contraseña más fuerte con letras y números."
  },
  rate: {
    "pt-BR": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    en: "Too many attempts. Wait a few minutes and try again.",
    es: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
  },
  provider: {
    "pt-BR": "Este provedor ainda não está habilitado.",
    en: "This provider is not enabled yet.",
    es: "Este proveedor aún no está habilitado."
  }
};

function localize(key) {
  return messages[key]?.[getLanguage()] || messages[key]?.["pt-BR"] || t("authFailed");
}

const codeKeys = {
  invalid_credentials: "invalid",
  email_not_confirmed: "unconfirmed",
  user_already_exists: "exists",
  email_exists: "exists",
  weak_password: "weak",
  over_email_send_rate_limit: "rate",
  over_request_rate_limit: "rate",
  provider_disabled: "provider",
  oauth_provider_not_supported: "provider"
};

const messageKeys = {
  "Invalid login credentials": "invalid",
  "Email not confirmed": "unconfirmed",
  "User already registered": "exists",
  "Password should be at least 6 characters": "weak",
  "Email rate limit exceeded": "rate"
};

export function translateAuthError(error) {
  const key = codeKeys[error?.code]
    || codeKeys[error?.error_code]
    || messageKeys[error?.message];
  return key ? localize(key) : t("authFailed");
}
