/* =========================================================
   STORAGE
   ---------------------------------------------------------
   Camada única de leitura/escrita de dados.
   Isso facilita trocar localStorage por IndexedDB/API no futuro.
   ========================================================= */

export function loadData(key, fallback) {
  try {
    const rawData = localStorage.getItem(key);

    if (!rawData) return fallback;

    return JSON.parse(rawData);
  } catch (error) {
    console.warn(`Não foi possível carregar "${key}". Usando valor padrão.`, error);
    return fallback;
  }
}

export function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Não foi possível salvar "${key}".`, error);
    return false;
  }
}

export function loadText(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function saveText(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getScopedDataKey(scope, resource) {
  return `boby:${scope}:${resource}`;
}

export function exportAppData(data, filenamePrefix = "assistente-backup") {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();

  URL.revokeObjectURL(url);
}
