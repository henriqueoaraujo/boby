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
  getMissingTaskColumn,
  mergeTaskSnapshots
} = await import("../src/js/repositories/tasksRepository.js");

test.beforeEach(() => memory.clear());

test("preserva tarefa local mais recente ao mesclar com dados remotos antigos", () => {
  const remoteTask = {
    id: "task-1",
    title: "Versao antiga",
    category: "Trabalho",
    dueDate: "2026-06-17",
    dueTime: "",
    completedAt: "",
    createdAt: "2026-06-17T10:00:00.000Z",
    updatedAt: "2026-06-17T10:00:00.000Z",
    notes: "",
    reminderAt: "",
    location: "",
    priority: "normal",
    seriesId: "",
    originalDueDate: "",
    carriedAt: "",
    done: false,
    position: 0
  };
  const localTask = {
    ...remoteTask,
    title: "Versao local nova",
    updatedAt: "2026-06-17T11:00:00.000Z"
  };

  const result = mergeTaskSnapshots([remoteTask], [localTask], []);

  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Versao local nova");
});

test("aplica exclusao pendente antes de renderizar tarefas carregadas", () => {
  const task = {
    id: "task-1",
    title: "Remover",
    category: "Trabalho",
    dueDate: "2026-06-17",
    dueTime: "",
    completedAt: "",
    createdAt: "2026-06-17T10:00:00.000Z",
    updatedAt: "2026-06-17T10:00:00.000Z",
    notes: "",
    reminderAt: "",
    location: "",
    priority: "normal",
    seriesId: "",
    originalDueDate: "",
    carriedAt: "",
    done: false,
    position: 0
  };

  const result = mergeTaskSnapshots([task], [task], [{
    resource: "task",
    action: "delete",
    entityId: "task-1"
  }]);

  assert.deepEqual(result, []);
});

test("identifica coluna opcional ausente no schema cache do Supabase", () => {
  assert.equal(getMissingTaskColumn({
    code: "PGRST204",
    message: "Could not find the 'location' column of 'tasks' in the schema cache"
  }), "location");
});
