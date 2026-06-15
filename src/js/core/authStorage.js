const PERSISTENCE_KEY = "boby:auth:remember";
const AUTH_SESSION_PATTERN = /^sb-.+-auth-token$/;
const AUTH_STORAGE_PATTERN = /^sb-.+-auth-token(?:-code-verifier)?$/;

function getRememberPreference() {
  const saved = localStorage.getItem(PERSISTENCE_KEY);
  return saved === null ? true : saved === "true";
}

function authKeys(storage) {
  const keys = [];

  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && AUTH_STORAGE_PATTERN.test(key)) keys.push(key);
  }

  return keys;
}

export function setAuthPersistence(remember) {
  localStorage.setItem(PERSISTENCE_KEY, String(Boolean(remember)));

  if (!remember) {
    authKeys(localStorage).forEach(key => localStorage.removeItem(key));
  }
}

export function getAuthPersistence() {
  return getRememberPreference();
}

export function clearStoredAuth() {
  authKeys(localStorage).forEach(key => localStorage.removeItem(key));
  authKeys(sessionStorage).forEach(key => sessionStorage.removeItem(key));
}

export function getCachedAuthSession() {
  const preferredStorage = getRememberPreference() ? localStorage : sessionStorage;
  const fallbackStorage = getRememberPreference() ? sessionStorage : null;
  const keys = authKeys(preferredStorage).filter(key => AUTH_SESSION_PATTERN.test(key));

  if (!keys.length && fallbackStorage) {
    keys.push(
      ...authKeys(fallbackStorage).filter(key => AUTH_SESSION_PATTERN.test(key))
    );
  }

  for (const key of keys) {
    const rawValue = preferredStorage.getItem(key)
      || fallbackStorage?.getItem(key);

    if (!rawValue) continue;

    try {
      const parsed = JSON.parse(rawValue);
      const session = parsed?.currentSession || parsed?.session || parsed;

      if (session?.user?.id && session?.access_token) return session;
    } catch {
      // O Supabase tratará entradas inválidas durante getSession().
    }
  }

  return null;
}

export const authStorage = {
  getItem(key) {
    if (!AUTH_STORAGE_PATTERN.test(key)) {
      return getRememberPreference()
        ? localStorage.getItem(key)
        : sessionStorage.getItem(key);
    }

    if (getRememberPreference()) {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    }

    return sessionStorage.getItem(key);
  },

  setItem(key, value) {
    if (getRememberPreference()) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },

  removeItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};
