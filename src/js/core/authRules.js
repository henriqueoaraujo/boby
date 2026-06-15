import { t } from "./i18n.js";

export function validateEmail(email) {
  const value = String(email || "").trim();
  if (!value) return t("emailRequired");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t("emailInvalid");
  return "";
}

export function validateName(name) {
  const value = String(name || "").trim().replace(/\s+/g, " ");
  if (!value) return t("nameRequired");
  if (value.length < 2) return t("nameInvalid");
  return "";
}

export function validateBirthDate(birthDate, today = new Date()) {
  if (!birthDate) return t("birthRequired");
  const date = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return t("dateInvalid");
  if (date > today) return t("futureDate");
  return "";
}

export function validatePassword(password, mode = "login") {
  const value = String(password || "");
  if (!value) return t("passwordRequired");
  if (mode === "signup" && value.length < 8) {
    return t("passwordLength");
  }
  if (mode === "signup" && !/[A-Za-z]/.test(value)) {
    return t("passwordLetter");
  }
  if (mode === "signup" && !/\d/.test(value)) {
    return t("passwordNumber");
  }
  return "";
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return t("confirmationRequired");
  if (password !== confirmation) return t("passwordMismatch");
  return "";
}

export function validateCaptcha(answer, expectedAnswer) {
  const value = String(answer || "").trim();
  if (!value) return t("captchaRequired");
  if (Number(value) !== Number(expectedAnswer)) return t("captchaWrong");
  return "";
}

export function validateAuthForm({
  email,
  name = "",
  birthDate = "",
  password,
  confirmPassword = "",
  captchaAnswer = "",
  expectedCaptchaAnswer = "",
  mode = "login"
}) {
  const errors = {
    name: mode === "signup" ? validateName(name) : "",
    birthDate: mode === "signup" && birthDate ? validateBirthDate(birthDate) : "",
    email: validateEmail(email),
    password: validatePassword(password, mode),
    confirmPassword: mode === "signup"
      ? validatePasswordConfirmation(password, confirmPassword)
      : "",
    captcha: mode === "signup"
      ? validateCaptcha(captchaAnswer, expectedCaptchaAnswer)
      : ""
  };

  return {
    valid: !Object.values(errors).some(Boolean),
    errors
  };
}
