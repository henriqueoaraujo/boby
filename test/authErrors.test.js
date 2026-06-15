import assert from "node:assert/strict";
import test from "node:test";

import { translateAuthError } from "../src/js/core/authErrors.js";

test("traduz credenciais inválidas", () => {
  assert.equal(
    translateAuthError({ code: "invalid_credentials" }),
    "E-mail ou senha incorretos."
  );
});

test("traduz limite de tentativas", () => {
  assert.match(
    translateAuthError({ code: "over_request_rate_limit" }),
    /Muitas tentativas/
  );
});

test("não exibe mensagens desconhecidas em inglês", () => {
  assert.equal(
    translateAuthError({ message: "Unexpected provider error" }),
    "Não foi possível concluir a autenticação. Tente novamente."
  );
});
