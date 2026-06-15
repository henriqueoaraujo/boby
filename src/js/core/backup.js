import { normalizeCategories, normalizeTask, state } from "./state.js";
import { exportAppData, getScopedDataKey, loadData, saveData } from "./storage.js";

const SNAPSHOT_LIMIT = 5;
const SNAPSHOT_RESOURCE = "backups";

function getScope() {
  return state.session.user?.id ? `user:${state.session.user.id}` : "local";
}

function getSnapshotKey() {
  return getScopedDataKey(getScope(), SNAPSHOT_RESOURCE);
}

export function createBackupPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: [...state.categories],
    tasks: state.tasks.map(task => ({ ...task })),
    preferences: { ...state.preferences }
  };
}

export function exportCurrentBackup() {
  exportAppData(createBackupPayload(), "boby-backup");
}

export function createAutomaticSnapshot() {
  const snapshots = loadData(getSnapshotKey(), []);
  const nextSnapshots = [
    createBackupPayload(),
    ...(Array.isArray(snapshots) ? snapshots : [])
  ].slice(0, SNAPSHOT_LIMIT);

  saveData(getSnapshotKey(), nextSnapshots);
  return nextSnapshots[0];
}

export function getLatestSnapshot() {
  const snapshots = loadData(getSnapshotKey(), []);
  return Array.isArray(snapshots) ? snapshots[0] || null : null;
}

export function normalizeBackupPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Arquivo de backup inválido.");
  }

  const categories = normalizeCategories(payload.categories);
  if (!Array.isArray(payload.tasks)) {
    throw new Error("O backup não contém uma lista de tarefas válida.");
  }

  return {
    categories,
    tasks: payload.tasks
      .filter(task => task && typeof task === "object")
      .map((task, index) => normalizeTask(task, categories, index)),
    preferences: payload.preferences && typeof payload.preferences === "object"
      ? payload.preferences
      : {}
  };
}

export async function readBackupFile(file) {
  if (!file || file.size > 5 * 1024 * 1024) {
    throw new Error("Escolha um arquivo JSON de até 5 MB.");
  }

  return normalizeBackupPayload(JSON.parse(await file.text()));
}

export function applyBackupPayload(payload) {
  const normalized = normalizeBackupPayload(payload);
  state.categories = normalized.categories;
  state.draftCategories = [...normalized.categories];
  state.tasks = normalized.tasks;
  state.preferences = { ...state.preferences, ...normalized.preferences };
  return normalized;
}
