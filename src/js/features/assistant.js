import { dom } from "../core/selectors.js";
import { state } from "../core/state.js";
import { parseAssistantCommand } from "../core/taskRules.js";
import { createTaskFromCommand, setAgendaFilter } from "./tasks.js";

export function runAssistantCommand() {
  const command = parseAssistantCommand(dom.assistantCommandInput.value);
  dom.assistantCommandStatus.textContent = command.message;

  if (command.type === "filter") {
    setAgendaFilter(command.agenda);
  }

  if (command.type === "create") {
    createTaskFromCommand({
      ...command.task,
      category: state.categories[0] || "Outros"
    });
    dom.assistantCommandInput.value = "";
  }

  return command;
}
