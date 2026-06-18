/* =========================================================
   TASKS REPOSITORY
   ---------------------------------------------------------
   Estratégia híbrida:
   - Sem login: localStorage.
   - Com login: Supabase + cópia local.
   ========================================================= */

import { getScopedDataKey, loadData, saveData } from "../core/storage.js";
import {
  announceQueueStatus,
  announceSyncStatus,
  enqueueSyncOperation,
  readSyncQueue,
  removeSyncOperation
} from "../core/syncQueue.js";
import { DEFAULT_TASKS, normalizeTask, state } from "../core/state.js";
import { getSupabaseClient } from "./supabaseClient.js";

const OPTIONAL_TASK_COLUMNS = new Set([
  "reminder_at",
  "location",
  "series_id",
  "original_due_date",
  "carried_at"
]);
const missingTaskColumns = new Set();
const warnedMissingTaskColumns = new Set();

function getTasksStorageKey(userId = state.session.user?.id) {
  const scope = userId ? `user:${userId}` : "local";
  return getScopedDataKey(scope, "tasks");
}

function normalizePositions() {
  state.tasks = state.tasks.map((task, index) => ({
    ...task,
    position: index
  }));
}

function normalizeStoredTasks(savedTasks) {
  if (!Array.isArray(savedTasks)) return [];

  return savedTasks.map((task, index) => {
    return normalizeTask(task, state.categories, index);
  });
}

function getTaskTimestamp(task) {
  const timestamp = Date.parse(task.updatedAt || task.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function mergeTaskSnapshots(remoteTasks, cachedTasks, pendingOperations = []) {
  const merged = new Map();

  remoteTasks.forEach(task => {
    merged.set(task.id, task);
  });

  cachedTasks.forEach(task => {
    const savedTask = merged.get(task.id);
    if (!savedTask || getTaskTimestamp(task) >= getTaskTimestamp(savedTask)) {
      merged.set(task.id, task);
    }
  });

  pendingOperations
    .filter(item => item.resource === "task")
    .forEach(operation => {
      if (operation.action === "delete") {
        merged.delete(operation.entityId);
        return;
      }

      if (operation.payload) {
        merged.set(operation.entityId, normalizeTask(operation.payload, state.categories));
      }
    });

  return [...merged.values()].sort((a, b) => {
    return a.position - b.position || getTaskTimestamp(a) - getTaskTimestamp(b);
  });
}

function mapSupabaseTask(row, index) {
  return normalizeTask({
    id: row.id,
    title: row.title,
    category: row.category,
    dueDate: row.due_date || "",
    dueTime: row.due_time ? row.due_time.slice(0, 5) : "",
    completedAt: row.completed_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes || "",
    reminderAt: row.reminder_at || "",
    location: row.location || "",
    priority: row.priority || "normal",
    seriesId: row.series_id || "",
    originalDueDate: row.original_due_date || "",
    carriedAt: row.carried_at || "",
    done: row.done,
    position: row.position ?? index
  }, state.categories, index);
}

export function getMissingTaskColumn(error) {
  if (error?.code !== "PGRST204") return "";

  const match = String(error.message || "")
    .match(/Could not find the '([^']+)' column of 'tasks'/i);
  const column = match?.[1] || "";

  return OPTIONAL_TASK_COLUMNS.has(column) ? column : "";
}

export function toSupabaseTask(task) {
  const payload = {
    id: task.id,
    user_id: state.session.user?.id,
    title: task.title,
    category: task.category,
    due_date: task.dueDate || null,
    due_time: task.dueTime || null,
    completed_at: task.completedAt || null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    notes: task.notes || "",
    reminder_at: task.reminderAt || null,
    location: task.location || "",
    priority: task.priority || "normal",
    series_id: task.seriesId || null,
    original_due_date: task.originalDueDate || null,
    carried_at: task.carriedAt || null,
    done: task.done,
    position: task.position
  };

  missingTaskColumns.forEach(column => {
    delete payload[column];
  });

  return payload;
}

function getSyncErrorMessage(error) {
  const missingColumn = getMissingTaskColumn(error);
  if (missingColumn) {
    return `A coluna ${missingColumn} ainda não existe na tabela tasks. Execute supabase/migrations/v57.sql.`;
  }
  if (error?.code === "PGRST205") {
    return "A tabela tasks não existe no Supabase. Execute supabase/schema.sql.";
  }
  if (error?.code === "42501") {
    return "As políticas de acesso da tabela tasks precisam ser atualizadas.";
  }
  return error?.message || "Não foi possível sincronizar as tarefas.";
}

export function persistLocalTasks() {
  normalizePositions();
  saveData(getTasksStorageKey(), state.tasks);
}

export async function loadTasks() {
  if (!state.session.isAuthenticated) {
    const savedTasks = loadData(
      getTasksStorageKey(null),
      loadData("tasks", DEFAULT_TASKS)
    );
    state.tasks = normalizeStoredTasks(savedTasks);
    return state.tasks;
  }

  const supabase = await getSupabaseClient();

  if (!supabase) {
    const cachedTasks = loadData(getTasksStorageKey(), []);
    state.tasks = normalizeStoredTasks(cachedTasks);
    return state.tasks;
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", state.session.user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Erro ao carregar tarefas do Supabase.", error);
    announceSyncStatus(
      "error",
      readSyncQueue(state.session.user.id).length,
      getSyncErrorMessage(error)
    );
    const cachedTasks = loadData(getTasksStorageKey(), []);
    state.tasks = normalizeStoredTasks(cachedTasks);
    return state.tasks;
  }

  const remoteTasks = data.map(mapSupabaseTask);
  const cachedTasks = normalizeStoredTasks(loadData(getTasksStorageKey(), []));
  const pendingOperations = readSyncQueue(state.session.user.id);

  state.tasks = mergeTaskSnapshots(remoteTasks, cachedTasks, pendingOperations);
  persistLocalTasks();

  if (!remoteTasks.length && cachedTasks.length) {
    await Promise.all(cachedTasks.map(task => syncTaskToBackend(task)));
  }

  if (data.some(row => !row.due_date)) {
    await Promise.all(state.tasks.map(task => syncTaskToBackend(task)));
  }

  return state.tasks;
}

async function upsertTaskWithSchemaFallback(supabase, task) {
  const result = await supabase
    .from("tasks")
    .upsert(toSupabaseTask(task), { onConflict: "id" });

  const missingColumn = getMissingTaskColumn(result.error);
  if (!missingColumn) return result;

  missingTaskColumns.add(missingColumn);

  if (!warnedMissingTaskColumns.has(missingColumn)) {
    warnedMissingTaskColumns.add(missingColumn);
    console.warn(
      `Supabase sem a coluna tasks.${missingColumn}. Salvando campos compatíveis até aplicar supabase/migrations/v57.sql.`
    );
  }

  return supabase
    .from("tasks")
    .upsert(toSupabaseTask(task), { onConflict: "id" });
}

export async function syncTaskToBackend(task) {
  if (!state.session.isAuthenticated) return { ok: true, mode: "local" };
  const userId = state.session.user.id;

  if (!navigator.onLine) {
    enqueueSyncOperation(userId, {
      resource: "task",
      action: "upsert",
      entityId: task.id,
      payload: task
    });
    return { ok: false, queued: true };
  }

  const supabase = await getSupabaseClient();

  if (!supabase) return { ok: false, mode: "local" };

  announceSyncStatus("syncing");
  const { error } = await upsertTaskWithSchemaFallback(supabase, task);

  if (error) {
    console.warn("Erro ao sincronizar tarefa no Supabase.", error);
    enqueueSyncOperation(userId, {
      resource: "task",
      action: "upsert",
      entityId: task.id,
      payload: task
    });
    announceSyncStatus("error", readSyncQueue(userId).length, getSyncErrorMessage(error));
    return { ok: false, error, queued: true };
  }

  const pending = removeSyncOperation(userId, item => {
    return item.resource === "task" && item.entityId === task.id;
  });
  announceQueueStatus(userId);
  return { ok: true, mode: "supabase" };
}

export async function deleteTaskFromBackend(taskId) {
  if (!state.session.isAuthenticated) return { ok: true, mode: "local" };
  const userId = state.session.user.id;

  if (!navigator.onLine) {
    enqueueSyncOperation(userId, {
      resource: "task",
      action: "delete",
      entityId: taskId
    });
    return { ok: false, queued: true };
  }

  const supabase = await getSupabaseClient();

  if (!supabase) return { ok: true, mode: "local" };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", state.session.user.id);

  if (error) {
    console.warn("Erro ao excluir tarefa no Supabase.", error);
    enqueueSyncOperation(userId, {
      resource: "task",
      action: "delete",
      entityId: taskId
    });
    announceSyncStatus("error", readSyncQueue(userId).length, getSyncErrorMessage(error));
    return { ok: false, error, queued: true };
  }

  const pending = removeSyncOperation(userId, item => {
    return item.resource === "task" && item.entityId === taskId;
  });
  announceQueueStatus(userId);
  return { ok: true, mode: "supabase" };
}

export async function flushTaskSyncQueue() {
  const userId = state.session.user?.id;
  if (!userId || !navigator.onLine) return;

  const operations = readSyncQueue(userId).filter(item => item.resource === "task");
  if (!operations.length) return;

  announceSyncStatus("syncing", operations.length);

  for (const operation of operations) {
    if (operation.action === "delete") {
      await deleteTaskFromBackend(operation.entityId);
    } else {
      await syncTaskToBackend(operation.payload);
    }
  }

  announceQueueStatus(userId);
}

export async function persistTasks() {
  persistLocalTasks();

  if (!state.session.isAuthenticated) return;

  await Promise.all(state.tasks.map(task => syncTaskToBackend(task)));
}
