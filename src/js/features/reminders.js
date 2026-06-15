import { dom } from "../core/selectors.js";
import { state } from "../core/state.js";
import { getTaskDueTimestamp } from "../core/taskRules.js";
import { getScopedDataKey, loadData, saveData } from "../core/storage.js";
import { t } from "../core/i18n.js";

const CHECK_INTERVAL = 30000;
const NOTIFICATION_WINDOW = 60000;
let reminderTimer = null;

function getNotificationKey() {
  const scope = state.session.user?.id ? `user:${state.session.user.id}` : "local";
  return getScopedDataKey(scope, "notified-reminders");
}

function renderPermission() {
  if (!("Notification" in window)) {
    dom.notificationStatus.textContent = t("unsupported");
    dom.enableNotificationsButton.disabled = true;
    return;
  }

  const labels = {
    granted: t("active"),
    denied: t("blocked"),
    default: t("disabled")
  };

  dom.notificationStatus.textContent = labels[Notification.permission];
  dom.enableNotificationsButton.textContent = Notification.permission === "granted"
    ? t("active")
    : t("activate");
}

export async function requestReminderPermission() {
  if (!("Notification" in window)) {
    renderPermission();
    return false;
  }

  const permission = await Notification.requestPermission();
  renderPermission();

  if (permission === "granted") checkTaskReminders();
  return permission === "granted";
}

async function showTaskNotification(task) {
  const options = {
    body: task.title,
    icon: "./icon.svg",
    tag: `boby-task-${task.id}`
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Boby: tarefa no horário", options);
    return;
  }

  new Notification("Boby: tarefa no horário", options);
}

export async function checkTaskReminders(now = Date.now()) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const notified = new Set(loadData(getNotificationKey(), []));

  for (const task of state.tasks) {
    if (task.done || notified.has(task.id)) continue;

    const dueAt = getTaskDueTimestamp(task);
    if (!dueAt || dueAt > now || now - dueAt > NOTIFICATION_WINDOW) continue;

    await showTaskNotification(task);

    notified.add(task.id);
  }

  saveData(getNotificationKey(), [...notified]);
}

export function initializeReminders() {
  renderPermission();
  checkTaskReminders();
  clearInterval(reminderTimer);
  reminderTimer = setInterval(checkTaskReminders, CHECK_INTERVAL);
}
