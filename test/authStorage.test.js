import test from "node:test";
import assert from "node:assert/strict";

function createStorage() {
  const data = new Map();

  return {
    get length() {
      return data.size;
    },
    key(index) {
      return [...data.keys()][index] || null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    }
  };
}

globalThis.localStorage = createStorage();
globalThis.sessionStorage = createStorage();

const {
  authStorage,
  clearStoredAuth,
  getCachedAuthSession,
  setAuthPersistence
} = await import("../src/js/core/authStorage.js");

test.beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test("continuar conectado grava a sessão no armazenamento persistente", () => {
  setAuthPersistence(true);
  authStorage.setItem("sb-project-auth-token", "{\"access_token\":\"token\"}");

  assert.ok(localStorage.getItem("sb-project-auth-token"));
  assert.equal(sessionStorage.getItem("sb-project-auth-token"), null);
});

test("sessão temporária fica apenas na aba", () => {
  setAuthPersistence(false);
  authStorage.setItem("sb-project-auth-token", "{\"access_token\":\"token\"}");

  assert.ok(sessionStorage.getItem("sb-project-auth-token"));
  assert.equal(localStorage.getItem("sb-project-auth-token"), null);
});

test("recupera sessão Supabase para acesso offline", () => {
  setAuthPersistence(true);
  authStorage.setItem("sb-project-auth-token", JSON.stringify({
    access_token: "token",
    user: { id: "user-1", email: "pessoa@exemplo.com" }
  }));

  assert.equal(getCachedAuthSession().user.id, "user-1");
});

test("logout remove tokens persistentes e temporários", () => {
  localStorage.setItem("sb-project-auth-token", "local");
  sessionStorage.setItem("sb-project-auth-token", "session");
  clearStoredAuth();

  assert.equal(localStorage.getItem("sb-project-auth-token"), null);
  assert.equal(sessionStorage.getItem("sb-project-auth-token"), null);
});
