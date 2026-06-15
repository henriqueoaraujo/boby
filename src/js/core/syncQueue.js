import { getScopedDataKey, loadData, saveData } from "./storage.js";

function getQueueKey(userId) {
  return getScopedDataKey(`user:${userId}`, "sync-queue");
}

export function readSyncQueue(userId) {
  if (!userId) return [];
  const queue = loadData(getQueueKey(userId), []);
  return Array.isArray(queue) ? queue : [];
}

export function enqueueSyncOperation(userId, operation) {
  if (!userId) return;

  const queue = readSyncQueue(userId);
  const withoutOlderEquivalent = queue.filter(item => {
    if (item.resource !== operation.resource) return true;
    if (item.resource === "categories") return false;
    return item.entityId !== operation.entityId;
  });

  withoutOlderEquivalent.push({
    ...operation,
    queuedAt: new Date().toISOString()
  });

  saveData(getQueueKey(userId), withoutOlderEquivalent);
  announceSyncStatus("offline", withoutOlderEquivalent.length);
}

export function removeSyncOperation(userId, predicate) {
  const nextQueue = readSyncQueue(userId).filter(item => !predicate(item));
  saveData(getQueueKey(userId), nextQueue);
  return nextQueue;
}

export function announceSyncStatus(status, pending = 0, message = "") {
  window.dispatchEvent(new CustomEvent("boby:sync-status", {
    detail: { status, pending, message }
  }));
}

export function announceQueueStatus(userId, fallbackStatus = "saved") {
  const pending = readSyncQueue(userId).length;
  announceSyncStatus(pending ? "error" : fallbackStatus, pending);
}
