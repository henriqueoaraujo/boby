/* =========================================================
   TASKS
   ========================================================= */

import { dom } from "../core/selectors.js";
import { sanitizeNotesHtml } from "../core/sanitize.js";
import { createId, getNowIso, state } from "../core/state.js";
import { matchesAgenda } from "../core/taskRules.js";
import {
  addDaysToKey,
  carryIncompleteTasks,
  generateOccurrenceDates
} from "../core/calendarRules.js";
import {
  deleteTaskFromBackend,
  persistLocalTasks,
  persistTasks,
  syncTaskToBackend
} from "../repositories/tasksRepository.js";
import { renderCategorySelect } from "./categories.js";
import { renderWeekCalendar } from "./calendar.js";
import { t } from "../core/i18n.js";

const CIRCLE_RADIUS = 42;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export function saveTasks() {
  persistTasks();
}

export function updateProgress() {
  const dayTasks = state.tasks.filter(task => task.dueDate === state.selectedDueDate);
  const total = dayTasks.length;
  const done = dayTasks.filter(task => task.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  dom.progressPercent.textContent = `${percent}%`;

  const offset = CIRCLE_CIRCUMFERENCE - (percent / 100) * CIRCLE_CIRCUMFERENCE;

  dom.progressCircle.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
  dom.progressCircle.style.strokeDashoffset = offset;
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const dateOnly = dateValue.includes("T") ? dateValue.split("T")[0] : dateValue;
  const [year, month, day] = dateOnly.split("-");

  return `${day}/${month}/${year}`;
}

function getVisibleTasks() {
  return state.tasks.filter(task => {
    const matchesCategory = state.currentFilter === "Todas" || task.category === state.currentFilter;
    const matchesSearchCategory = state.searchCategoryFilter === "Todas" || task.category === state.searchCategoryFilter;
    const matchesSearch = task.title.toLowerCase().includes(state.searchTerm.toLowerCase());
    const matchesCompleted = !state.preferences.hideCompleted || !task.done;
    const completedDateOnly = task.completedAt?.includes("T")
      ? task.completedAt.split("T")[0]
      : task.completedAt;

    const matchesCompletedDate = !state.completedDateFilter || completedDateOnly === state.completedDateFilter;
    const matchesAgendaFilter = matchesAgenda(task, state.agendaFilter);
    const matchesSelectedDate = !state.selectedDueDate || task.dueDate === state.selectedDueDate;

    return matchesCategory
      && matchesSearchCategory
      && matchesSearch
      && matchesCompleted
      && matchesCompletedDate
      && matchesAgendaFilter
      && matchesSelectedDate;
  });
}


export function renderTasks() {
  dom.taskList.innerHTML = "";

  const visibleTasks = getVisibleTasks();

  if (!visibleTasks.length) {
    dom.taskList.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("noTasks");
    dom.taskList.appendChild(empty);
    updateProgress();
    return;
  }

  visibleTasks.forEach(task => {
    const item = document.createElement("article");
    item.className = "task-item";
    item.dataset.id = task.id;

    item.innerHTML = `
      <input class="task-check" type="checkbox" aria-label="Concluir atividade">

      <div class="task-content">
        <div class="task-title-row">
          <div class="task-title"></div>
        </div>
        <div class="task-meta"></div>
      </div>

      <button class="edit-button" aria-label="Editar atividade">☷</button>
      <button class="notes-button" aria-label="Abrir anotações">✎</button>
      <button class="delete-button" aria-label="Excluir atividade">×</button>
    `;

    const checkbox = item.querySelector(".task-check");
    const title = item.querySelector(".task-title");
    const titleRow = item.querySelector(".task-title-row");
    const meta = item.querySelector(".task-meta");

    checkbox.checked = task.done;
    title.textContent = task.title;
    title.classList.toggle("done", task.done);

    if (task.priority === "high") {
      const priority = document.createElement("span");
      priority.className = "priority-badge";
      priority.textContent = t("high");
      titleRow.appendChild(priority);
    }

    appendTaskMeta(meta, "task-category", task.category);
    if (task.dueDate) appendTaskMeta(meta, "task-due", formatDate(task.dueDate));
    if (task.dueTime) appendTaskMeta(meta, "task-time", task.dueTime);
    if (task.seriesId) appendTaskMeta(meta, "task-series", "recorrente");
    if (task.originalDueDate) {
      appendTaskMeta(
        meta,
        "task-carried",
        `trazida de ${formatDate(task.originalDueDate)}`
      );
    }
    if (task.completedAt) {
      appendTaskMeta(
        meta,
        "task-completed-date",
        `concluída ${formatDate(task.completedAt)}`
      );
    }

    item.addEventListener("pointerdown", event => {
      const isInteractive = event.target.closest("input, button, select, textarea, a");
      if (isInteractive) return;

      startTaskDrag(event, item, task.id);
    });

    checkbox.addEventListener("change", event => {
      task.done = event.target.checked;
      task.completedAt = event.target.checked ? getNowIso() : "";
      task.updatedAt = getNowIso();

      persistLocalTasks();
      syncTaskToBackend(task);
      renderTasks();
    });

    item.querySelector(".notes-button").addEventListener("click", () => {
      openTaskNotes(task.id);
    });

    item.querySelector(".edit-button").addEventListener("click", () => {
      openTaskEditor(task.id);
    });

    item.querySelector(".delete-button").addEventListener("click", () => {
      requestTaskDeletion(task.id);
    });

    dom.taskList.appendChild(item);
  });

  updateProgress();
}

function appendTaskMeta(container, className, text) {
  const label = document.createElement("span");
  label.className = className;
  label.textContent = text;
  container.appendChild(label);
}

export function addTask() {
  const title = dom.taskInput.value.trim();

  if (!title) {
    dom.taskInput.focus();
    return;
  }

  const category = dom.categoryInput.value || state.categories[0] || "Outros";

  const startDate = dom.dueDateInput.value || state.selectedDueDate;
  const recurrenceEnabled = dom.recurrenceEnabledInput.checked;
  const recurrenceEndDate = dom.recurrenceEndDateInput.value;

  if (recurrenceEnabled && (!recurrenceEndDate || recurrenceEndDate < startDate)) {
    dom.recurrenceSummary.textContent = document.documentElement.lang === "en"
      ? "Choose an end date on or after the start date."
      : document.documentElement.lang === "es"
        ? "Elige una fecha final igual o posterior a la inicial."
        : "Escolha uma data final igual ou posterior à data inicial.";
    dom.recurrenceSummary.dataset.type = "error";
    dom.recurrenceEndDateInput.focus();
    return;
  }

  const weekdays = [...dom.recurrenceWeekdayInputs]
    .filter(input => input.checked)
    .map(input => Number(input.value));
  const dates = recurrenceEnabled
    ? generateOccurrenceDates({
        startDate,
        endDate: recurrenceEndDate,
        weekdays
      })
    : [startDate];

  if (!dates.length) {
    dom.taskInput.focus();
    return;
  }

  const seriesId = dates.length > 1 ? createId() : "";
  const tasks = dates.map(dueDate => createTask({
    title,
    category,
    priority: dom.priorityInput.value || "normal",
    dueDate,
    dueTime: dom.dueTimeInput.value || "",
    seriesId
  }));

  state.tasks.unshift(...tasks);

  dom.taskInput.value = "";
  dom.dueTimeInput.value = "";
  dom.priorityInput.value = "normal";
  dom.dueDateInput.value = state.selectedDueDate;
  resetRecurrenceControls();
  dom.inputCard.classList.add("collapsed");

  persistLocalTasks();
  tasks.forEach(syncTaskToBackend);
  renderWeekCalendar();
  renderTasks();
}

function createTask(input) {
  return {
    id: createId(),
    title: input.title.trim(),
    category: input.category || state.categories[0] || "Outros",
    dueDate: input.dueDate || state.selectedDueDate,
    dueTime: input.dueTime || "",
    done: false,
    completedAt: "",
    createdAt: getNowIso(),
    updatedAt: getNowIso(),
    notes: "",
    priority: input.priority || "normal",
    seriesId: input.seriesId || "",
    originalDueDate: "",
    carriedAt: "",
    position: 0
  };
}

export function createTaskFromCommand(input) {
  if (input.dueDate) state.selectedDueDate = input.dueDate;
  const task = createTask(input);
  state.tasks.unshift(task);
  persistLocalTasks();
  syncTaskToBackend(task);
  renderWeekCalendar();
  renderTasks();
  return task;
}

export function toggleTaskInput() {
  const willOpen = dom.inputCard.classList.contains("collapsed");

  if (willOpen) {
    dom.searchCard.classList.add("collapsed");
  }

  dom.inputCard.classList.toggle("collapsed");

  if (!dom.inputCard.classList.contains("collapsed")) {
    renderCategorySelect();
    dom.dueDateInput.value = state.selectedDueDate;
    dom.recurrenceEndDateInput.min = state.selectedDueDate;
    setTimeout(() => dom.taskInput.focus(), 180);
  }
}

export function updateSearchTerm(value) {
  state.searchTerm = value;
  renderTasks();
}

export function updateSearchCategory(value) {
  state.searchCategoryFilter = value;
  renderTasks();
}

export function toggleSearchInput() {
  const willOpen = dom.searchCard.classList.contains("collapsed");

  if (willOpen) {
    dom.inputCard.classList.add("collapsed");
  }

  dom.searchCard.classList.toggle("collapsed");

  if (!dom.searchCard.classList.contains("collapsed")) {
    setTimeout(() => dom.searchInput.focus(), 180);
  }
}

export function clearSearch() {
  state.searchTerm = "";
  state.searchCategoryFilter = "Todas";
  state.completedDateFilter = "";

  dom.searchInput.value = "";
  dom.searchCategoryInput.value = "Todas";
  dom.searchCompletedDateInput.value = "";
  dom.searchCard.classList.add("collapsed");

  renderTasks();
}

export function updateCompletedDateFilter(value) {
  state.completedDateFilter = value;
  renderTasks();
}

export function setAgendaFilter(value) {
  state.agendaFilter = value;
  renderTasks();
}

export function setDueDateFilter(value) {
  state.selectedDueDate = value || state.selectedDueDate;
  state.agendaFilter = "all";
  dom.dueDateInput.value = state.selectedDueDate;
  renderWeekCalendar();
  renderTasks();
}

export function toggleRecurrenceOptions() {
  const enabled = dom.recurrenceEnabledInput.checked;
  dom.recurrenceOptions.hidden = !enabled;
  const startDate = dom.dueDateInput.value || state.selectedDueDate;

  dom.recurrenceStartPreview.value = startDate;

  if (enabled) {
    dom.recurrenceEndDateInput.min = startDate;
    if (
      dom.recurrenceEndDateInput.value
      && dom.recurrenceEndDateInput.value < dom.recurrenceEndDateInput.min
    ) {
      dom.recurrenceEndDateInput.value = dom.recurrenceEndDateInput.min;
    }
    if (!dom.recurrenceEndDateInput.value) {
      dom.recurrenceEndDateInput.value = addDaysToKey(startDate, 30);
    }
    if (![...dom.recurrenceWeekdayInputs].some(input => input.checked)) {
      applyRecurrencePreset("1,2,3,4,5");
    }
  }

  updateRecurrenceSummary();
}

export function applyRecurrencePreset(rawWeekdays) {
  const weekdays = new Set(
    String(rawWeekdays || "")
      .split(",")
      .filter(Boolean)
  );

  dom.recurrenceWeekdayInputs.forEach(input => {
    input.checked = weekdays.has(input.value);
  });

  dom.recurrencePresetButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.weekdayPreset === String(rawWeekdays || "")
    );
  });
  updateRecurrenceSummary();
}

export function updateRecurrenceSummary() {
  if (!dom.recurrenceEnabledInput.checked) {
    dom.recurrenceSummary.textContent = "";
    dom.recurrenceSummary.dataset.type = "";
    return;
  }

  const startDate = dom.dueDateInput.value || state.selectedDueDate;
  const endDate = dom.recurrenceEndDateInput.value;
  const weekdays = [...dom.recurrenceWeekdayInputs]
    .filter(input => input.checked)
    .map(input => Number(input.value));

  dom.recurrenceStartPreview.value = startDate;

  if (!endDate || endDate < startDate) {
    dom.recurrenceSummary.textContent = document.documentElement.lang === "en"
      ? "Choose when this task should stop repeating."
      : document.documentElement.lang === "es"
        ? "Define hasta cuándo debe repetirse esta tarea."
        : "Defina até quando esta atividade deve se repetir.";
    dom.recurrenceSummary.dataset.type = "error";
    return;
  }

  const dates = generateOccurrenceDates({ startDate, endDate, weekdays });
  dom.recurrenceSummary.textContent = dates.length
    ? document.documentElement.lang === "en"
      ? `${dates.length} tasks will be created between ${formatDate(startDate)} and ${formatDate(endDate)}.`
      : document.documentElement.lang === "es"
        ? `Se crearán ${dates.length} tareas entre ${formatDate(startDate)} y ${formatDate(endDate)}.`
        : `${dates.length} atividades serão criadas entre ${formatDate(startDate)} e ${formatDate(endDate)}.`
    : document.documentElement.lang === "en"
      ? "No dates match the selected days."
      : document.documentElement.lang === "es" ? "Ninguna fecha coincide con los días elegidos." : "Nenhuma data corresponde aos dias escolhidos.";
  dom.recurrenceSummary.dataset.type = dates.length ? "success" : "error";
}

function resetRecurrenceControls() {
  dom.recurrenceEnabledInput.checked = false;
  dom.recurrenceOptions.hidden = true;
  dom.recurrenceEndDateInput.value = "";
  dom.recurrenceStartPreview.value = "";
  dom.recurrenceSummary.textContent = "";
  dom.recurrenceSummary.dataset.type = "";
  dom.recurrenceWeekdayInputs.forEach(input => {
    input.checked = false;
  });
  dom.recurrencePresetButtons.forEach(button => {
    button.classList.remove("active");
  });
}

export function carryIncompleteToDate(targetDate = state.selectedDueDate) {
  const result = carryIncompleteTasks(state.tasks, targetDate);
  if (!result.changed) return false;

  state.tasks = result.tasks;
  persistLocalTasks();
  state.tasks.forEach(task => {
    if (task.carriedAt === targetDate) syncTaskToBackend(task);
  });
  renderWeekCalendar();
  renderTasks();
  return true;
}





/* =========================================================
   CONFIRMAÇÃO DE EXCLUSÃO
   ========================================================= */

export function requestTaskDeletion(taskId) {
  if (!state.preferences.confirmDelete) {
    deleteTask(taskId);
    return;
  }

  pendingDeleteTaskId = taskId;

  dom.confirmDeletePanel.classList.add("open");
  dom.confirmDeletePanel.setAttribute("aria-hidden", "false");
}

export function closeDeleteConfirmation() {
  pendingDeleteTaskId = null;

  dom.confirmDeletePanel.classList.remove("open");
  dom.confirmDeletePanel.setAttribute("aria-hidden", "true");
}

export function closeDeleteConfirmationOnBackdrop(event) {
  if (event.target === event.currentTarget) {
    closeDeleteConfirmation();
  }
}

export function confirmPendingTaskDeletion() {
  if (!pendingDeleteTaskId) return;

  const taskId = pendingDeleteTaskId;

  closeDeleteConfirmation();
  deleteTask(taskId);
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter(savedTask => savedTask.id !== taskId);

  persistLocalTasks();
  deleteTaskFromBackend(taskId);
  renderWeekCalendar();
  renderTasks();
}

/* =========================================================
   NOTAS DA TAREFA
   ---------------------------------------------------------
   A nota fica salva dentro do objeto da tarefa.
   Ao excluir a tarefa, a nota vai embora junto.
   ========================================================= */

let activeNotesTaskId = null;
let activeNotesRange = null;
let pendingDeleteTaskId = null;
let activeEditTaskId = null;
const notesSyncTimers = new Map();

function getActiveNotesTask() {
  return state.tasks.find(task => task.id === activeNotesTaskId);
}

export function openTaskNotes(taskId) {
  const task = state.tasks.find(savedTask => savedTask.id === taskId);

  if (!task) return;

  activeNotesTaskId = taskId;
  dom.taskNotesTitle.textContent = task.title;
  task.notes = sanitizeNotesHtml(task.notes || "");
  dom.taskNotesEditor.innerHTML = task.notes;
  activeNotesRange = null;

  dom.taskNotesPanel.classList.add("open");
  dom.taskNotesPanel.setAttribute("aria-hidden", "false");

  setTimeout(() => dom.taskNotesEditor.focus(), 180);
}

export function closeTaskNotes() {
  saveActiveTaskNotes();

  dom.taskNotesPanel.classList.remove("open");
  dom.taskNotesPanel.setAttribute("aria-hidden", "true");
  activeNotesTaskId = null;
}

export function saveActiveTaskNotes() {
  const task = getActiveNotesTask();

  if (!task) return;

  task.notes = sanitizeNotesHtml(dom.taskNotesEditor.innerHTML);
  task.updatedAt = getNowIso();
  persistLocalTasks();
  scheduleNotesSync(task.id);
}

function scheduleNotesSync(taskId) {
  const ownerId = state.session.user?.id || null;
  clearTimeout(notesSyncTimers.get(taskId));

  const timer = setTimeout(() => {
    notesSyncTimers.delete(taskId);

    if ((state.session.user?.id || null) !== ownerId) return;

    const task = state.tasks.find(savedTask => savedTask.id === taskId);
    if (task) syncTaskToBackend(task);
  }, 600);

  notesSyncTimers.set(taskId, timer);
}

export function openTaskEditor(taskId) {
  const task = state.tasks.find(savedTask => savedTask.id === taskId);
  if (!task) return;

  activeEditTaskId = taskId;
  dom.editTaskCategory.innerHTML = "";

  state.categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    dom.editTaskCategory.appendChild(option);
  });

  dom.editTaskTitle.value = task.title;
  dom.editTaskCategory.value = task.category;
  dom.editTaskDate.value = task.dueDate;
  dom.editTaskTime.value = task.dueTime;
  dom.editTaskPriority.value = task.priority || "normal";
  dom.taskSeriesNote.hidden = !task.seriesId;
  dom.taskEditPanel.classList.add("open");
  dom.taskEditPanel.setAttribute("aria-hidden", "false");
  setTimeout(() => dom.editTaskTitle.focus(), 100);
}

export function closeTaskEditor() {
  activeEditTaskId = null;
  dom.taskEditPanel.classList.remove("open");
  dom.taskEditPanel.setAttribute("aria-hidden", "true");
}

export function closeTaskEditorOnBackdrop(event) {
  if (event.target === event.currentTarget) closeTaskEditor();
}

export function saveTaskEdits() {
  const task = state.tasks.find(savedTask => savedTask.id === activeEditTaskId);
  const title = dom.editTaskTitle.value.trim();

  if (!task || !title) return false;

  task.title = title;
  task.category = dom.editTaskCategory.value;
  task.dueDate = dom.editTaskDate.value;
  task.dueTime = dom.editTaskTime.value;
  task.priority = dom.editTaskPriority.value;
  task.updatedAt = getNowIso();
  state.selectedDueDate = task.dueDate;

  persistLocalTasks();
  syncTaskToBackend(task);
  closeTaskEditor();
  renderWeekCalendar();
  renderTasks();
  return true;
}

export function closeTaskNotesOnBackdrop(event) {
  if (event.target !== event.currentTarget) return;

  const selection = window.getSelection();
  const hasActiveSelection = selection && !selection.isCollapsed;

  if (hasActiveSelection) return;

  closeTaskNotes();
}

export function formatTaskNote(command, value = null) {
  restoreNotesSelection();
  dom.taskNotesEditor.focus();

  if (command === "checklist") {
    insertChecklistItem();
    saveActiveTaskNotes();
    return;
  }

  if (command === "fontSizePx") {
    applyInlineStyleToSelection("fontSize", value);
    saveActiveTaskNotes();
    return;
  }

  document.execCommand(command, false, value);
  saveNotesSelection();
  saveActiveTaskNotes();
}


function insertChecklistItem() {
  restoreNotesSelection();

  const selection = window.getSelection();
  const wrapper = createChecklistItem();

  if (!selection || selection.rangeCount === 0) {
    dom.taskNotesEditor.appendChild(wrapper);
    focusChecklistText(wrapper.querySelector("span"));
    return;
  }

  const range = selection.getRangeAt(0);

  if (!dom.taskNotesEditor.contains(range.commonAncestorContainer)) {
    dom.taskNotesEditor.appendChild(wrapper);
    focusChecklistText(wrapper.querySelector("span"));
    return;
  }

  range.deleteContents();
  range.insertNode(wrapper);
  focusChecklistText(wrapper.querySelector("span"));
}




function exitChecklistToNormalLine(checklistItem) {
  const lineBreak = document.createElement("br");
  const spacer = document.createTextNode("\u200b");

  checklistItem.after(lineBreak);
  lineBreak.after(spacer);

  const range = document.createRange();
  const selection = window.getSelection();

  range.setStart(spacer, 1);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);

  activeNotesRange = range.cloneRange();
}

function createChecklistItem() {
  const wrapper = document.createElement("label");
  const checkbox = document.createElement("input");
  const text = document.createElement("span");

  wrapper.className = "note-checklist-item";
  checkbox.type = "checkbox";
  text.contentEditable = "true";
  text.dataset.placeholder = "Digite aqui...";

  wrapper.appendChild(checkbox);
  wrapper.appendChild(text);

  return wrapper;
}

function focusChecklistText(textElement) {
  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(textElement);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);

  textElement.focus();
  saveNotesSelection();
}

export function saveNotesSelection() {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  if (!dom.taskNotesEditor.contains(range.commonAncestorContainer)) return;

  activeNotesRange = range.cloneRange();
}

function restoreNotesSelection() {
  if (!activeNotesRange) return;

  const selection = window.getSelection();

  selection.removeAllRanges();
  selection.addRange(activeNotesRange);
}

export function handleNotesEditorKeydown(event) {
  if (event.key !== "Enter") return;

  event.preventDefault();

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    document.execCommand("insertLineBreak");
    saveActiveTaskNotes();
    return;
  }

  const anchorNode = selection.anchorNode;
  const anchorElement = anchorNode?.nodeType === Node.TEXT_NODE
    ? anchorNode.parentElement
    : anchorNode;

  const checklistItem = anchorElement?.closest?.(".note-checklist-item");

  if (checklistItem) {
    exitChecklistToNormalLine(checklistItem);
    saveActiveTaskNotes();
    return;
  }

  restoreNotesSelection();
  document.execCommand("insertLineBreak");
  saveNotesSelection();
  saveActiveTaskNotes();
}

function applyInlineStyleToSelection(styleName, value) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  if (!dom.taskNotesEditor.contains(range.commonAncestorContainer)) return;

  if (range.collapsed) {
    const span = document.createElement("span");
    span.style[styleName] = value;
    span.appendChild(document.createTextNode("\u200b"));
    range.insertNode(span);

    range.setStart(span.firstChild, 1);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
    saveNotesSelection();
    return;
  }

  const span = document.createElement("span");
  span.style[styleName] = value;

  try {
    range.surroundContents(span);
  } catch {
    const content = range.extractContents();
    span.appendChild(content);
    range.insertNode(span);
  }

  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  newRange.collapse(false);
  selection.addRange(newRange);
  saveNotesSelection();
}

/* =========================================================
   DRAG DAS TAREFAS
   ---------------------------------------------------------
   Reordena sem re-renderizar a lista durante o movimento,
   evitando tremedeira.
   ========================================================= */

function createTaskGhost(sourceItem) {
  const ghost = sourceItem.cloneNode(true);
  const rect = sourceItem.getBoundingClientRect();

  ghost.classList.add("task-drag-ghost");
  ghost.style.setProperty("--ghost-width", `${rect.width}px`);
  ghost.style.width = `${rect.width}px`;

  ghost.querySelectorAll("input, button").forEach(element => {
    element.setAttribute("tabindex", "-1");
    element.setAttribute("disabled", "true");
  });

  document.body.appendChild(ghost);
  return ghost;
}

function getStableTaskDropId(clientY, currentId) {
  const items = [...dom.taskList.querySelectorAll(".task-item")];

  for (const item of items) {
    const itemId = item.dataset.id;
    if (itemId === currentId) continue;

    const rect = item.getBoundingClientRect();
    const upperZone = rect.top + rect.height * 0.35;
    const lowerZone = rect.top + rect.height * 0.65;

    const currentIndex = state.tasks.findIndex(task => task.id === currentId);
    const itemIndex = state.tasks.findIndex(task => task.id === itemId);

    if (currentIndex > itemIndex && clientY < upperZone) {
      return itemId;
    }

    if (currentIndex < itemIndex && clientY > lowerZone) {
      return itemId;
    }
  }

  return currentId;
}

function reorderTaskDuringDrag(fromId, toId) {
  if (fromId === toId) return fromId;

  const fromIndex = state.tasks.findIndex(task => task.id === fromId);
  const toIndex = state.tasks.findIndex(task => task.id === toId);

  if (fromIndex === -1 || toIndex === -1) return fromId;

  const [movedTask] = state.tasks.splice(fromIndex, 1);
  state.tasks.splice(toIndex, 0, movedTask);

  const items = [...dom.taskList.querySelectorAll(".task-item")];
  const movedItem = items.find(item => item.dataset.id === fromId);
  const targetItem = items.find(item => item.dataset.id === toId);

  if (!movedItem || !targetItem) return fromId;

  const firstPositions = new Map();

  items.forEach(item => {
    firstPositions.set(item, item.getBoundingClientRect());
  });

  if (toIndex > fromIndex) {
    dom.taskList.insertBefore(movedItem, targetItem.nextSibling);
  } else {
    dom.taskList.insertBefore(movedItem, targetItem);
  }

  const updatedItems = [...dom.taskList.querySelectorAll(".task-item")];

  updatedItems.forEach(item => {
    const first = firstPositions.get(item);
    if (!first) return;

    const last = item.getBoundingClientRect();
    const deltaY = first.top - last.top;

    if (!deltaY) return;

    item.animate(
      [
        { transform: `translateY(${deltaY}px)` },
        { transform: "translateY(0)" }
      ],
      {
        duration: 180,
        easing: "cubic-bezier(.22, 1, .36, 1)"
      }
    );
  });

  return fromId;
}

function markTaskSource(taskId) {
  document.querySelectorAll(".task-item").forEach(item => {
    item.classList.remove("dragging-source");
  });

  const currentSource = document.querySelector(`.task-item[data-id="${taskId}"]`);

  if (currentSource) {
    currentSource.classList.add("dragging-source");
  }
}

function startTaskDrag(event, sourceItem, taskId) {
  event.preventDefault();

  const sourceRect = sourceItem.getBoundingClientRect();
  const offsetX = event.clientX - sourceRect.left;
  const offsetY = event.clientY - sourceRect.top;

  let currentId = taskId;
  let animationFrame = null;
  let lastClientX = event.clientX;
  let lastClientY = event.clientY;

  const ghost = createTaskGhost(sourceItem);

  function moveGhost(clientX, clientY) {
    ghost.style.transform = `translate3d(${clientX - offsetX}px, ${clientY - offsetY}px, 0) rotate(-.45deg)`;
  }

  function handlePointerMove(moveEvent) {
    lastClientX = moveEvent.clientX;
    lastClientY = moveEvent.clientY;

    if (animationFrame) return;

    animationFrame = requestAnimationFrame(() => {
      moveGhost(lastClientX, lastClientY);

      const nextId = getStableTaskDropId(lastClientY, currentId);

      if (nextId !== currentId) {
        currentId = reorderTaskDuringDrag(currentId, nextId);
        markTaskSource(currentId);
      }

      animationFrame = null;
    });
  }

  function finishDrag() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    ghost.remove();

    document.querySelectorAll(".task-item").forEach(item => {
      item.classList.remove("dragging-source");
    });

    saveTasks();

    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", finishDrag);
    document.removeEventListener("pointercancel", finishDrag);
  }

  moveGhost(event.clientX, event.clientY);
  markTaskSource(taskId);

  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", finishDrag);
  document.addEventListener("pointercancel", finishDrag);
}
