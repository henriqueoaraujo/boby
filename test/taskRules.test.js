import test from "node:test";
import assert from "node:assert/strict";

import {
  getTaskAgendaGroup,
  matchesAgenda,
  parseAssistantCommand
} from "../src/js/core/taskRules.js";

const now = new Date("2026-06-14T12:00:00");

test("classifica tarefas por agenda", () => {
  assert.equal(getTaskAgendaGroup({ dueDate: "2026-06-14", done: false }, now), "today");
  assert.equal(getTaskAgendaGroup({ dueDate: "2026-06-13", done: false }, now), "overdue");
  assert.equal(getTaskAgendaGroup({ dueDate: "2026-06-15", done: false }, now), "upcoming");
  assert.equal(getTaskAgendaGroup({ dueDate: "", done: false }, now), "undated");
  assert.equal(matchesAgenda({ dueDate: "2026-06-13", done: true }, "overdue", now), false);
});

test("interpreta criação para amanhã com horário", () => {
  const command = parseAssistantCommand(
    "Criar tarefa revisar contrato amanhã às 15h",
    now
  );

  assert.equal(command.type, "create");
  assert.equal(command.task.title, "revisar contrato");
  assert.equal(command.task.dueDate, "2026-06-15");
  assert.equal(command.task.dueTime, "15:00");
});

test("interpreta comandos de filtro", () => {
  assert.deepEqual(
    parseAssistantCommand("mostre as atrasadas", now),
    {
      type: "filter",
      agenda: "overdue",
      message: "Mostrando tarefas atrasadas."
    }
  );
});

test("interpreta data brasileira e horário com minutos", () => {
  const command = parseAssistantCommand(
    "Adicionar tarefa consulta 20/06/2026 às 09:30",
    now
  );

  assert.equal(command.task.title, "consulta");
  assert.equal(command.task.dueDate, "2026-06-20");
  assert.equal(command.task.dueTime, "09:30");
});
