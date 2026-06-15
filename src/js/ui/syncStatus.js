import { dom } from "../core/selectors.js";
import { t } from "../core/i18n.js";

const MESSAGES = {
  saved: "saved",
  local: "local",
  syncing: "syncing",
  offline: "offline",
  error: "syncError"
};

export function renderSyncStatus(status, pending = 0, message = "") {
  const suffix = pending > 0 ? ` (${pending})` : "";
  dom.syncStatus.dataset.status = status;
  dom.syncStatusText.textContent = `${t(MESSAGES[status] || MESSAGES.saved)}${suffix}`;
  dom.syncStatus.title = message || t(MESSAGES[status] || MESSAGES.saved);
}

window.addEventListener("boby:language-change", () => {
  renderSyncStatus(dom.syncStatus.dataset.status || "saved");
});

export function initializeSyncStatus() {
  window.addEventListener("boby:sync-status", event => {
    renderSyncStatus(event.detail.status, event.detail.pending, event.detail.message);
  });

  window.addEventListener("offline", () => renderSyncStatus("offline"));
  dom.syncStatus.title = t("syncError");
}
