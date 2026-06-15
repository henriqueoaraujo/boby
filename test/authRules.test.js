import test from "node:test";
import assert from "node:assert/strict";

import {
  validateCaptcha,
  validateAuthForm,
  validateBirthDate,
  validateEmail,
  validateName,
  validatePassword
} from "../src/js/core/authRules.js";

test("captcha exige a resposta correta", () => {
  assert.equal(validateCaptcha("", 8), "Resolva a verificação de segurança.");
  assert.equal(validateCaptcha("7", 8), "Resposta incorreta. Tente novamente.");
  assert.equal(validateCaptcha("8", 8), "");
});

test("valida formato de e-mail", () => {
  assert.equal(validateEmail("pessoa@exemplo.com"), "");
  assert.equal(validateEmail("pessoa"), "Digite um e-mail válido.");
});

test("valida nome e data de nascimento", () => {
  assert.equal(validateName("Maria Silva"), "");
  assert.equal(validateName(""), "Informe seu nome.");
  assert.equal(validateBirthDate("1995-04-12", new Date("2026-06-15")), "");
  assert.equal(
    validateBirthDate("2030-01-01", new Date("2026-06-15")),
    "A data não pode estar no futuro."
  );
});

test("cadastro exige senha forte mínima", () => {
  assert.equal(validatePassword("abc12345", "signup"), "");
  assert.equal(validatePassword("abcdefgh", "signup"), "Inclua pelo menos um número.");
  assert.equal(validatePassword("12345678", "signup"), "Inclua pelo menos uma letra.");
});

test("cadastro exige confirmação idêntica", () => {
  const result = validateAuthForm({
    name: "Pessoa Teste",
    birthDate: "1990-01-01",
    email: "pessoa@exemplo.com",
    password: "abc12345",
    confirmPassword: "abc12346",
    captchaAnswer: "8",
    expectedCaptchaAnswer: 8,
    mode: "signup"
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.confirmPassword, "As senhas não coincidem.");
});

test("login não exige confirmação de senha", () => {
  const result = validateAuthForm({
    email: "pessoa@exemplo.com",
    password: "qualquer",
    mode: "login"
  });

  assert.equal(result.valid, true);
});
