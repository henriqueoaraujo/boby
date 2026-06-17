import test from "node:test";
import assert from "node:assert/strict";

import {
  carryIncompleteTasks,
  generateOccurrenceDates,
  getWeekDates
} from "../src/js/core/calendarRules.js";

test("gera semana começando na segunda", () => {
  assert.deepEqual(getWeekDates("2026-06-14"), [
    "2026-06-08",
    "2026-06-09",
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
    "2026-06-13",
    "2026-06-14"
  ]);
});

test("gera ocorrências de segunda a sexta no intervalo", () => {
  assert.deepEqual(generateOccurrenceDates({
    startDate: "2026-06-15",
    endDate: "2026-06-21",
    weekdays: [1, 2, 3, 4, 5]
  }), [
    "2026-06-15",
    "2026-06-16",
    "2026-06-17",
    "2026-06-18",
    "2026-06-19"
  ]);
});

test("gera uma tarefa única quando não há recorrência", () => {
  assert.deepEqual(generateOccurrenceDates({
    startDate: "2026-06-18",
    endDate: "",
    weekdays: []
  }), ["2026-06-18"]);
});

test("combina recorrência semanal e mensal sem duplicar datas", () => {
  assert.deepEqual(generateOccurrenceDates({
    startDate: "2026-06-01",
    endDate: "2026-06-12",
    weekdays: [1],
    monthlyDay: 8
  }), [
    "2026-06-01",
    "2026-06-08"
  ]);
});

test("gera somente recorrência mensal quando nenhum dia da semana foi marcado", () => {
  assert.deepEqual(generateOccurrenceDates({
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    weekdays: [],
    monthlyDay: 31
  }), [
    "2026-06-30",
    "2026-07-31",
    "2026-08-31"
  ]);
});

test("carrega somente pendências vencidas para a data alvo", () => {
  const result = carryIncompleteTasks([
    { id: "1", dueDate: "2026-06-13", done: false },
    { id: "2", dueDate: "2026-06-13", done: true },
    { id: "3", dueDate: "2026-06-15", done: false }
  ], "2026-06-14");

  assert.equal(result.changed, true);
  assert.equal(result.tasks[0].dueDate, "2026-06-14");
  assert.equal(result.tasks[0].originalDueDate, "2026-06-13");
  assert.equal(result.tasks[1].dueDate, "2026-06-13");
  assert.equal(result.tasks[2].dueDate, "2026-06-15");
});
