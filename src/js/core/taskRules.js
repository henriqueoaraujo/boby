function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayKey(now = new Date()) {
  return toLocalDateKey(now);
}

export function getTaskAgendaGroup(task, now = new Date()) {
  if (!task.dueDate) return "undated";

  const today = getTodayKey(now);
  if (task.dueDate === today) return "today";
  if (task.dueDate < today && !task.done) return "overdue";
  if (task.dueDate > today) return "upcoming";
  return "all";
}

export function matchesAgenda(task, agendaFilter, now = new Date()) {
  if (!agendaFilter || agendaFilter === "all") return true;
  return getTaskAgendaGroup(task, now) === agendaFilter;
}

export function getTaskDueTimestamp(task) {
  if (!task.dueDate || !task.dueTime) return null;

  const date = new Date(`${task.dueDate}T${task.dueTime}:00`);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseDate(text, now) {
  if (/(^|\s)amanh[ãa](?=\s|$)/i.test(text)) return toLocalDateKey(addDays(now, 1));
  if (/\bhoje\b/i.test(text)) return toLocalDateKey(now);

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return isoMatch[0];

  const brMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (!brMatch) return "";

  const year = brMatch[3] || String(now.getFullYear());
  return `${year}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
}

function parseTime(text) {
  const match = text.match(/\b(?:[àa]s?\s*)?(\d{1,2})(?::|h)(\d{2})?\b/i);
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);

  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function cleanTaskTitle(text) {
  return text
    .replace(/^(crie|criar|adicione|adicionar)\s+(uma\s+)?tarefa\s*/i, "")
    .replace(/(?:às?|as)\s*\d{1,2}(?::|h)\d{0,2}/gi, "")
    .replace(/\d{1,2}(?::|h)\d{0,2}/gi, "")
    .replace(/(^|\s)(hoje|amanh[ãa])(?=\s|$)/gi, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/g, "")
    .replace(/\b(às?|as)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:\s]+$/, "")
    .trim();
}

export function parseAssistantCommand(rawText, now = new Date()) {
  const text = String(rawText || "").trim();
  if (!text) return { type: "invalid", message: "Digite um comando." };

  if (/\b(atrasad[ao]s?|vencid[ao]s?)\b/i.test(text)) {
    return { type: "filter", agenda: "overdue", message: "Mostrando tarefas atrasadas." };
  }

  if (/\b(hoje)\b/i.test(text) && /\b(mostre|mostrar|tarefas?|agenda)\b/i.test(text)) {
    return { type: "filter", agenda: "today", message: "Mostrando a agenda de hoje." };
  }

  if (/\b(pr[oó]ximas?|futuras?)\b/i.test(text)) {
    return { type: "filter", agenda: "upcoming", message: "Mostrando próximas tarefas." };
  }

  if (/^(crie|criar|adicione|adicionar)\b/i.test(text)) {
    const title = cleanTaskTitle(text);
    if (!title) return { type: "invalid", message: "Não encontrei o título da tarefa." };

    return {
      type: "create",
      task: {
        title,
        dueDate: parseDate(text, now),
        dueTime: parseTime(text)
      },
      message: `Tarefa “${title}” criada.`
    };
  }

  return {
    type: "invalid",
    message: "Tente “criar tarefa...” ou “mostrar atrasadas”."
  };
}
