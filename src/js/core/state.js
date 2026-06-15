/* =========================================================
   STATE
   ---------------------------------------------------------
   Estado global do Boby.
   v44 prepara os dados para calendário, lembretes e Supabase.
   ========================================================= */

import { getScopedDataKey, loadData } from "./storage.js";
import { getTodayKey } from "./taskRules.js";

export const DEFAULT_CATEGORIES = ["Trabalho", "Pessoal", "Estudos", "Outros"];

export const DEFAULT_PREFERENCES = {
  hideCompleted: false,
  confirmDelete: false,
  carryIncomplete: false
};

export const DEFAULT_SESSION = {
  user: null,
  isAuthenticated: false,
  mode: "locked",
  isSupabaseConfigured: false,
  isLoading: false
};

export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getNowIso() {
  return new Date().toISOString();
}

export function normalizeCategories(savedCategories) {
  if (!Array.isArray(savedCategories)) return [...DEFAULT_CATEGORIES];

  const cleanCategories = [];
  const usedNames = new Set();

  savedCategories.forEach(category => {
    if (typeof category !== "string") return;

    const name = category.trim().replace(/\s+/g, " ").slice(0, 60);

    if (!name || usedNames.has(name.toLowerCase())) return;

    usedNames.add(name.toLowerCase());
    cleanCategories.push(name);
  });

  return cleanCategories.length ? cleanCategories : [...DEFAULT_CATEGORIES];
}

export function normalizeTask(rawTask, categories, index = 0) {
  const fallbackCategory = categories[0] || "Outros";
  const now = getNowIso();

  const title = typeof rawTask?.title === "string" && rawTask.title.trim()
    ? rawTask.title.trim().slice(0, 200)
    : "Tarefa sem título";

  const category = categories.includes(rawTask?.category)
    ? rawTask.category
    : fallbackCategory;

  const createdAt = typeof rawTask?.createdAt === "string"
    ? rawTask.createdAt
    : typeof rawTask?.created_at === "string"
      ? rawTask.created_at
      : now;

  const updatedAt = typeof rawTask?.updatedAt === "string"
    ? rawTask.updatedAt
    : typeof rawTask?.updated_at === "string"
      ? rawTask.updated_at
      : createdAt;

  return {
    id: typeof rawTask?.id === "string" && rawTask.id ? rawTask.id : createId(),
    title,
    category,
    dueDate: typeof rawTask?.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawTask.dueDate)
      ? rawTask.dueDate
      : getTodayKey(),
    dueTime: typeof rawTask?.dueTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTask.dueTime)
      ? rawTask.dueTime
      : "",
    completedAt: typeof rawTask?.completedAt === "string" ? rawTask.completedAt : "",
    createdAt,
    updatedAt,
    notes: typeof rawTask?.notes === "string" ? rawTask.notes : "",
    priority: ["normal", "high"].includes(rawTask?.priority)
      ? rawTask.priority
      : "normal",
    seriesId: typeof rawTask?.seriesId === "string" ? rawTask.seriesId : "",
    originalDueDate: typeof rawTask?.originalDueDate === "string"
      ? rawTask.originalDueDate
      : "",
    carriedAt: typeof rawTask?.carriedAt === "string" ? rawTask.carriedAt : "",
    done: Boolean(rawTask?.done),
    position: Number.isFinite(rawTask?.position) ? rawTask.position : index
  };
}

function normalizeTasks(savedTasks, categories) {
  if (!Array.isArray(savedTasks)) return [];

  return savedTasks
    .filter(task => task && typeof task === "object")
    .map((task, index) => normalizeTask(task, categories, index))
    .sort((a, b) => a.position - b.position);
}

const savedCategories = normalizeCategories(
  loadData(
    getScopedDataKey("local", "categories"),
    loadData("categories", [...DEFAULT_CATEGORIES])
  )
);

export const DEFAULT_TASKS = [
  {
    id: createId(),
    title: "Revisar atividades do trabalho",
    category: "Trabalho",
    dueDate: getTodayKey(),
    dueTime: "",
    completedAt: "",
    createdAt: getNowIso(),
    updatedAt: getNowIso(),
    notes: "",
    priority: "normal",
    done: false,
    position: 0
  },
  {
    id: createId(),
    title: "Organizar tarefas pessoais da semana",
    category: "Pessoal",
    dueDate: getTodayKey(),
    dueTime: "",
    completedAt: "",
    createdAt: getNowIso(),
    updatedAt: getNowIso(),
    notes: "",
    priority: "normal",
    done: false,
    position: 1
  },
  {
    id: createId(),
    title: "Separar ideias para projetos futuros",
    category: "Outros",
    dueDate: getTodayKey(),
    dueTime: "",
    completedAt: "",
    createdAt: getNowIso(),
    updatedAt: getNowIso(),
    notes: "",
    priority: "normal",
    done: true,
    position: 2
  }
];

const savedTasks = normalizeTasks(
  loadData(
    getScopedDataKey("local", "tasks"),
    loadData("tasks", DEFAULT_TASKS)
  ),
  savedCategories
);

export const state = {
  currentFilter: "Todas",
  searchTerm: "",
  searchCategoryFilter: "Todas",
  completedDateFilter: "",
  agendaFilter: "all",
  selectedDueDate: getTodayKey(),

  categories: savedCategories,
  draftCategories: [...savedCategories],

  tasks: savedTasks.length ? savedTasks : normalizeTasks(DEFAULT_TASKS, savedCategories),

  preferences: {
    ...DEFAULT_PREFERENCES,
    ...loadData("preferences", DEFAULT_PREFERENCES)
  },

  session: {
    ...DEFAULT_SESSION
  }
};
