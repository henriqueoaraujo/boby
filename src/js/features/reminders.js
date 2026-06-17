import { dom } from "../core/selectors.js";
import { state } from "../core/state.js";
import { getTaskDueTimestamp } from "../core/taskRules.js";
import { getScopedDataKey, loadData, saveData } from "../core/storage.js";
import { t } from "../core/i18n.js";
import { alertUser } from "../ui/pageAlerts.js";

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

function canShowSystemNotification() {
  return "Notification" in window && Notification.permission === "granted";
}

async function showTaskNotification(task, isOverdue = false) {
  const options = {
    body: [task.title, task.location ? `Local: ${task.location}` : ""].filter(Boolean).join("\n"),
    icon: "/apple-touch-icon-180x180.png",
    tag: `boby-task-${task.id}`
  };
  const title = isOverdue ? "Boby: atividade atrasada" : "Boby: tarefa no horário";

  if ("serviceWorker" in navigator) {
    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error("Service worker indisponível")), 1200);
        })
      ]);
      await registration.showNotification(title, options);
      return;
    } catch {
      // Se o service worker ainda não estiver pronto, a notificação padrão cobre o aviso.
    }
  }

  new Notification(title, options);
}

function getTaskReminderTimestamp(task) {
  if (task.reminderAt) {
    const reminderDate = new Date(task.reminderAt);
    return Number.isNaN(reminderDate.getTime()) ? null : reminderDate.getTime();
  }

  return getTaskDueTimestamp(task);
}

function getNotifiedKeyForTask(task) {
  return `${task.id}:${task.reminderAt || task.dueTime || task.dueDate || "manual"}`;
}

function formatTaskAlertTime(task) {
  const source = task.reminderAt || (task.dueDate && task.dueTime ? `${task.dueDate}T${task.dueTime}` : "");
  if (!source) return "Sem horário definido";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(source));
}

function getNotificationItems(now = Date.now()) {
  return state.tasks
    .filter(task => !task.done)
    .map(task => {
      const timestamp = getTaskReminderTimestamp(task);
      const isOverdue = timestamp && timestamp < now - NOTIFICATION_WINDOW;
      const isDueNow = timestamp && timestamp <= now && now - timestamp <= NOTIFICATION_WINDOW;
      const status = isDueNow ? "now" : isOverdue ? "overdue" : "upcoming";

      return { task, timestamp, status };
    })
    .filter(item => item.timestamp)
    .sort((a, b) => {
      const rank = { now: 0, overdue: 1, upcoming: 2 };
      return rank[a.status] - rank[b.status] || a.timestamp - b.timestamp;
    });
}

export function renderNotificationsPanel() {
  dom.openNotificationsPanelButton.hidden = Boolean(state.preferences.blockNotifications);

  if (state.preferences.blockNotifications) {
    dom.notificationsMenuBadge.hidden = true;
    dom.notificationsList.innerHTML = "";
    closeNotificationsPanel();
    return;
  }

  const items = getNotificationItems();
  const urgentCount = items.filter(item => item.status !== "upcoming").length;

  dom.notificationsMenuBadge.textContent = String(urgentCount);
  dom.notificationsMenuBadge.hidden = urgentCount === 0;

  dom.notificationsList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "notifications-empty";
    empty.textContent = "Nenhum aviso pendente por enquanto.";
    dom.notificationsList.appendChild(empty);
    return;
  }

  items.slice(0, 12).forEach(({ task, status }) => {
    const item = document.createElement("article");
    item.className = `notification-item ${status}`;

    const badge = document.createElement("span");
    badge.textContent = status === "now" ? "Agora" : status === "overdue" ? "Atrasada" : "Próxima";

    const title = document.createElement("strong");
    title.textContent = task.title;

    const details = document.createElement("p");
    details.textContent = [
      formatTaskAlertTime(task),
      task.location ? `Local: ${task.location}` : "",
      task.category
    ].filter(Boolean).join(" · ");

    item.append(badge, title, details);
    dom.notificationsList.appendChild(item);
  });
}

export function openNotificationsPanel() {
  if (state.preferences.blockNotifications) return;

  renderNotificationsPanel();
  dom.notificationsPanel.classList.add("open");
  dom.notificationsPanel.setAttribute("aria-hidden", "false");
}

export function closeNotificationsPanel() {
  dom.notificationsPanel.classList.remove("open");
  dom.notificationsPanel.setAttribute("aria-hidden", "true");
}

export function closeNotificationsPanelOnBackdrop(event) {
  if (event.target === event.currentTarget) closeNotificationsPanel();
}

function showDueTasksNotice(dueItems, now) {
  const overdueCount = dueItems.filter(item => now - item.dueAt > NOTIFICATION_WINDOW).length;
  const firstTask = dueItems[0].task;

  alertUser({
    title: dueItems.length === 1
      ? overdueCount ? "Atividade atrasada" : "Hora da atividade"
      : `${dueItems.length} atividades precisam de atenção`,
    message: dueItems.length === 1
      ? firstTask.title
      : overdueCount
        ? `${overdueCount} atrasada(s) e ${dueItems.length - overdueCount} no horário.`
        : "Tem lembrete chegando agora.",
    type: overdueCount ? "overdue" : "reminder",
    sound: overdueCount ? "overdue" : "reminder",
    actionLabel: "Ver",
    onAction: openNotificationsPanel
  });
}

export async function checkTaskReminders(now = Date.now()) {
  if (state.preferences.blockNotifications) {
    renderNotificationsPanel();
    return;
  }

  const notified = new Set(loadData(getNotificationKey(), []));
  const dueItems = [];

  for (const task of state.tasks) {
    const notifiedKey = getNotifiedKeyForTask(task);
    if (task.done || notified.has(notifiedKey)) continue;

    const dueAt = getTaskReminderTimestamp(task);
    if (!dueAt || dueAt > now) continue;

    const isOverdue = now - dueAt > NOTIFICATION_WINDOW;
    dueItems.push({ task, dueAt, notifiedKey });

    if (canShowSystemNotification()) await showTaskNotification(task, isOverdue);
    notified.add(notifiedKey);
  }

  if (dueItems.length) {
    showDueTasksNotice(dueItems, now);
    saveData(getNotificationKey(), [...notified]);
  }

  renderNotificationsPanel();
}

export function initializeReminders() {
  renderPermission();
  renderNotificationsPanel();
  checkTaskReminders();
  clearInterval(reminderTimer);
  reminderTimer = setInterval(checkTaskReminders, CHECK_INTERVAL);
}
