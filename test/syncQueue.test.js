import test from "node:test";
import assert from "node:assert/strict";

const memory = new Map();

globalThis.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(key, value);
  }
};

globalThis.window = {
  dispatchEvent() {}
};

globalThis.CustomEvent = class {
  constructor(type, options) {
    this.type = type;
    this.detail = options.detail;
  }
};

const {
  enqueueSyncOperation,
  readSyncQueue,
  removeSyncOperation
} = await import("../src/js/core/syncQueue.js");

test.beforeEach(() => memory.clear());

test("mantém apenas a edição mais recente da mesma tarefa", () => {
  enqueueSyncOperation("user-1", {
    resource: "task",
    action: "upsert",
    entityId: "task-1",
    payload: { title: "Primeira" }
  });
  enqueueSyncOperation("user-1", {
    resource: "task",
    action: "upsert",
    entityId: "task-1",
    payload: { title: "Última" }
  });

  const queue = readSyncQueue("user-1");
  assert.equal(queue.length, 1);
  assert.equal(queue[0].payload.title, "Última");
});

test("substitui snapshots antigos de categorias", () => {
  enqueueSyncOperation("user-1", {
    resource: "categories",
    action: "replace",
    payload: ["Trabalho"]
  });
  enqueueSyncOperation("user-1", {
    resource: "categories",
    action: "replace",
    payload: ["Trabalho", "Casa"]
  });

  assert.deepEqual(readSyncQueue("user-1")[0].payload, ["Trabalho", "Casa"]);
});

test("remove operações sincronizadas", () => {
  enqueueSyncOperation("user-1", {
    resource: "task",
    action: "delete",
    entityId: "task-1"
  });

  const pending = removeSyncOperation("user-1", item => item.entityId === "task-1");
  assert.deepEqual(pending, []);
});
