import { validateAuthForm } from "../core/authRules.js";
import { dom } from "../core/selectors.js";
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";

let authMode = "login";
let captchaAnswer = 0;
let authTransitionId = 0;

export function refreshAuthCaptcha() {
  const first = Math.floor(Math.random() * 8) + 2;
  const second = Math.floor(Math.random() * 8) + 1;
  captchaAnswer = first + second;
  dom.authCaptchaQuestion.textContent = `${first} + ${second} =`;
  dom.authCaptchaInput.value = "";
  setFieldError(dom.authCaptchaInput, dom.authCaptchaError, "");
}

function setProtectedAppState(locked) {
  document.body.classList.toggle("auth-locked", locked);
  document.body.classList.remove("auth-booting");

  document.querySelectorAll(".protected-app").forEach(element => {
    element.inert = locked;
    element.setAttribute("aria-hidden", String(locked));
  });
}

function setFieldError(input, errorElement, message) {
  input.classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", String(Boolean(message)));
  errorElement.textContent = message;
}

function applyAuthMode(mode) {
  authMode = mode;
  const isSignup = authMode === "signup";
  showResendConfirmation(false);
  dom.authPanel.classList.toggle("signup-mode", isSignup);

  dom.authLoginTab.classList.toggle("active", !isSignup);
  dom.authSignupTab.classList.toggle("active", isSignup);
  dom.authLoginTab.setAttribute("aria-selected", String(!isSignup));
  dom.authSignupTab.setAttribute("aria-selected", String(isSignup));
  dom.authConfirmPasswordField.hidden = !isSignup;
  dom.authNameField.hidden = !isSignup;
  dom.authBirthDateField.hidden = true;
  dom.authNameInput.required = isSignup;
  dom.authBirthDateInput.required = false;
  dom.authConfirmPasswordInput.required = isSignup;
  dom.authCaptchaField.hidden = !isSignup;
  dom.authCaptchaInput.required = isSignup;
  dom.authPasswordInput.autocomplete = isSignup ? "new-password" : "current-password";
  dom.authRememberField.hidden = isSignup;
  dom.authPasswordInput.placeholder = isSignup
    ? (document.documentElement.lang === "en" ? "At least 8 characters" : document.documentElement.lang === "es" ? "Mínimo 8 caracteres" : "Mínimo de 8 caracteres")
    : (document.documentElement.lang === "en" ? "Your password" : document.documentElement.lang === "es" ? "Tu contraseña" : "Sua senha");
  dom.authTitle.textContent = "";
  dom.authDescription.textContent = "";
  dom.authSubmitButton.textContent = isSignup ? t("signup") : t("login");
  dom.authResetPasswordButton.hidden = isSignup;
  if (isSignup) refreshAuthCaptcha();
  clearAuthErrors();
  setAuthStatus("");
}

export async function setAuthMode(mode) {
  const nextMode = mode === "signup" ? "signup" : "login";
  const card = dom.authForm.closest(".auth-card");
  const shouldAnimate = authMode !== nextMode
    && dom.authPanel.classList.contains("open")
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!shouldAnimate || !card?.animate) {
    applyAuthMode(nextMode);
    return;
  }

  const transitionId = ++authTransitionId;
  const direction = nextMode === "signup" ? -1 : 1;
  dom.authPanel.classList.add("switching");

  await card.animate([
    { opacity: 1, transform: "translateX(0)" },
    { opacity: 0, transform: `translateX(${direction * 42}px)` }
  ], {
    duration: 180,
    easing: "cubic-bezier(.4, 0, 1, 1)",
    fill: "forwards"
  }).finished.catch(() => {});

  if (transitionId !== authTransitionId) return;
  applyAuthMode(nextMode);

  await card.animate([
    { opacity: 0, transform: `translateX(${direction * -42}px)` },
    { opacity: 1, transform: "translateX(0)" }
  ], {
    duration: 260,
    easing: "cubic-bezier(.22, 1, .36, 1)",
    fill: "forwards"
  }).finished.catch(() => {});

  if (transitionId === authTransitionId) {
    dom.authPanel.classList.remove("switching");
    card.getAnimations().forEach(animation => animation.cancel());
  }
}

export function openAuthPanel() {
  setProtectedAppState(true);
  dom.authPanel.classList.add("open");
  dom.authPanel.setAttribute("aria-hidden", "false");
  updateOfflineState();
  setTimeout(() => dom.authEmailInput.focus(), 100);
}

export function closeAuthPanel() {
  if (!state.session.isAuthenticated) return;

  dom.authPanel.classList.remove("open");
  dom.authPanel.setAttribute("aria-hidden", "true");
  setProtectedAppState(false);
}

export function setAuthStatus(message, type = "") {
  dom.authStatusText.textContent = message || "";
  dom.authStatusText.dataset.type = type;
}

export function showResendConfirmation(show) {
  dom.authResendButton.hidden = !show;
}

export function getAuthCredentials() {
  return {
    email: dom.authEmailInput.value.trim(),
    name: dom.authNameInput.value.trim(),
    birthDate: dom.authBirthDateInput.value,
    password: dom.authPasswordInput.value,
    confirmPassword: dom.authConfirmPasswordInput.value,
    captchaAnswer: dom.authCaptchaInput.value,
    expectedCaptchaAnswer: captchaAnswer,
    remember: dom.authRememberInput.checked,
    mode: authMode
  };
}

export function validateCurrentAuthForm() {
  const credentials = getAuthCredentials();
  const validation = validateAuthForm(credentials);

  setFieldError(dom.authNameInput, dom.authNameError, validation.errors.name);
  setFieldError(dom.authBirthDateInput, dom.authBirthDateError, validation.errors.birthDate);
  setFieldError(dom.authEmailInput, dom.authEmailError, validation.errors.email);
  setFieldError(dom.authPasswordInput, dom.authPasswordError, validation.errors.password);
  setFieldError(
    dom.authConfirmPasswordInput,
    dom.authConfirmPasswordError,
    validation.errors.confirmPassword
  );
  setFieldError(dom.authCaptchaInput, dom.authCaptchaError, validation.errors.captcha);

  return validation;
}

export function clearAuthErrors() {
  setFieldError(dom.authNameInput, dom.authNameError, "");
  setFieldError(dom.authBirthDateInput, dom.authBirthDateError, "");
  setFieldError(dom.authEmailInput, dom.authEmailError, "");
  setFieldError(dom.authPasswordInput, dom.authPasswordError, "");
  setFieldError(dom.authConfirmPasswordInput, dom.authConfirmPasswordError, "");
  setFieldError(dom.authCaptchaInput, dom.authCaptchaError, "");
}

export function clearAuthPasswords() {
  dom.authPasswordInput.value = "";
  dom.authConfirmPasswordInput.value = "";
}

export function togglePasswordVisibility(input, button) {
  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  button.textContent = willShow ? t("hide") : t("show");
  button.setAttribute("aria-label", willShow ? "Ocultar senha" : "Mostrar senha");
}

export function setAuthBusy(isBusy) {
  [
    dom.authSubmitButton,
    dom.authGoogleButton,
    dom.authGithubButton,
    dom.authLinkedinButton,
    dom.authResendButton,
    dom.authResetPasswordButton,
    dom.authLoginTab,
    dom.authSignupTab
  ].forEach(button => {
    button.disabled = isBusy;
  });

  dom.authSubmitButton.textContent = isBusy
    ? t("waiting")
    : authMode === "signup" ? t("signup") : t("login");
  dom.authPanel.classList.toggle("busy", isBusy);
  if (!isBusy) updateOfflineState();
}

export function updateOfflineState() {
  const offlineWithoutSession = !navigator.onLine && !state.session.isAuthenticated;
  const authUnavailable = !state.session.isSupabaseConfigured;
  dom.authOfflineNote.hidden = !offlineWithoutSession;
  dom.authSubmitButton.disabled = offlineWithoutSession || authUnavailable;
  dom.authGoogleButton.disabled = offlineWithoutSession || authUnavailable;
  dom.authGithubButton.disabled = offlineWithoutSession || authUnavailable;
  dom.authLinkedinButton.disabled = offlineWithoutSession || authUnavailable;
  dom.authResendButton.disabled = offlineWithoutSession || authUnavailable;
  dom.authResetPasswordButton.disabled = offlineWithoutSession || authUnavailable;

  if (authUnavailable && !state.session.isAuthenticated) {
    setAuthStatus(
      "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o acesso.",
      "error"
    );
  } else if (dom.authStatusText.textContent.includes("VITE_SUPABASE")) {
    setAuthStatus("");
  }
}

export function renderAuthState() {
  if (state.session.isAuthenticated) {
    const metadata = state.session.user.user_metadata || {};
    const displayName = metadata.full_name || metadata.name || state.session.user.email || t("userRequired");
    dom.authUserName.textContent = displayName;
    dom.authUserLabel.textContent = state.session.user.email || "";
    const avatarUrl = metadata.avatar_url || metadata.picture || "";
    dom.profileAvatar.replaceChildren();
    if (avatarUrl) {
      const image = document.createElement("img");
      image.src = avatarUrl;
      image.alt = "";
      dom.profileAvatar.appendChild(image);
    } else {
      dom.profileAvatar.textContent = displayName.trim().charAt(0).toUpperCase() || "U";
    }
    dom.profileNameInput.value = metadata.full_name || metadata.name || "";
    dom.profileBirthDateInput.value = metadata.birth_date || "";
    dom.profileCityInput.value = metadata.city || "";
    dom.logoutButton.textContent = t("logout");
    closeAuthPanel();
    return;
  }

  dom.authUserName.textContent = t("userRequired");
  dom.authUserLabel.textContent = "";
  dom.profileAvatar.textContent = "U";
  dom.profileCityInput.value = "";
  dom.logoutButton.textContent = t("logout");
  openAuthPanel();
}
