/* =========================================================
   CATEGORIES
   ========================================================= */

import { dom } from "../core/selectors.js";
import { DEFAULT_CATEGORIES, state } from "../core/state.js";
import { persistCategories } from "../repositories/categoriesRepository.js";
import { closeSettingsMenu } from "../ui/settings.js";
import { renderTasks, saveTasks } from "./tasks.js";
import { t } from "../core/i18n.js";

export function saveCategories() {
  persistCategories();
}

export function renderCategorySelect() {
  dom.categoryInput.innerHTML = "";
  dom.searchCategoryInput.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "Todas";
  allOption.textContent = t("all");
  dom.searchCategoryInput.appendChild(allOption);

  state.categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    dom.categoryInput.appendChild(option);

    const searchOption = document.createElement("option");
    searchOption.value = category;
    searchOption.textContent = category;
    dom.searchCategoryInput.appendChild(searchOption);
  });

  dom.searchCategoryInput.value = state.searchCategoryFilter || "Todas";
}

export function renderCategoryFilters() {
  const previousPositions = new Map();

  dom.filterGroup.querySelectorAll(".filter").forEach(button => {
    previousPositions.set(button.dataset.filter, button.getBoundingClientRect());
  });

  dom.filterGroup.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.className = `filter ${state.currentFilter === "Todas" ? "active" : ""}`;
  allButton.dataset.filter = "Todas";
  allButton.textContent = t("all");
  dom.filterGroup.appendChild(allButton);

  state.categories.forEach(category => {
    const button = document.createElement("button");
    button.className = `filter ${state.currentFilter === category ? "active" : ""}`;
    button.dataset.filter = category;
    button.textContent = category;
    dom.filterGroup.appendChild(button);
  });

  requestAnimationFrame(() => {
    dom.filterGroup.querySelectorAll(".filter").forEach(button => {
      const previous = previousPositions.get(button.dataset.filter);
      if (!previous) return;

      const current = button.getBoundingClientRect();
      const deltaX = previous.left - current.left;
      const deltaY = previous.top - current.top;

      if (!deltaX && !deltaY) return;

      button.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" }
        ],
        {
          duration: 260,
          easing: "cubic-bezier(.22, 1, .36, 1)"
        }
      );
    });
  });

  setupFilters();
}

function setupFilters() {
  const filters = document.querySelectorAll(".filter");

  filters.forEach(button => {
    button.addEventListener("click", () => {
      state.currentFilter = button.dataset.filter;
      renderCategoryFilters();
      renderTasks();
    });
  });
}

export function openCategoryPanel() {
  closeSettingsMenu();

  state.draftCategories = [...state.categories];
  renderCategoryEditor();

  dom.categoryPanel.classList.add("open");
  dom.categoryPanel.setAttribute("aria-hidden", "false");
}

export function closeCategoryPanel() {
  dom.categoryPanel.classList.remove("open");
  dom.categoryPanel.setAttribute("aria-hidden", "true");
}

export function closeCategoryPanelOnBackdrop(event) {
  if (event.target === event.currentTarget) {
    closeCategoryPanel();
  }
}

function renderCategoryEditor() {
  dom.categoryList.innerHTML = "";

  state.draftCategories.forEach((category, index) => {
    const item = document.createElement("div");
    item.className = "category-item";
    item.dataset.index = index;
    item.dataset.name = category;

    item.innerHTML = `
      <span class="category-drag" title="Arrastar categoria">☰</span>

      <input class="category-name-input" aria-label="Nome da categoria">

      <button class="category-delete-button" aria-label="Excluir categoria" ${state.draftCategories.length === 1 ? "disabled" : ""}>×</button>
    `;

    const input = item.querySelector(".category-name-input");
    input.value = category;

    item.addEventListener("pointerdown", event => {
      const isInteractive = event.target.closest("input, button, select, textarea, a");

      if (isInteractive) return;

      startCategoryDrag(event, index, item);
    });

    input.addEventListener("blur", event => {
      renameCategory(index, event.target.value);
    });

    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.target.blur();
      }
    });

    item.querySelector(".category-delete-button").addEventListener("click", () => {
      deleteCategory(index);
    });

    dom.categoryList.appendChild(item);
  });
}

export function addDraftCategory() {
  const name = dom.newCategoryInput.value.trim().replace(/\s+/g, " ");

  if (!name) {
    dom.newCategoryInput.focus();
    return;
  }

  const alreadyExists = state.categories.some(category => category.toLowerCase() === name.toLowerCase());

  if (alreadyExists) {
    dom.newCategoryInput.value = "";
    dom.newCategoryInput.focus();
    return;
  }

  state.categories.push(name);
  state.draftCategories = [...state.categories];
  dom.newCategoryInput.value = "";

  saveCategories();
  renderCategorySelect();
  renderCategoryFilters();
  renderCategoryEditor();
}

function renameCategory(index, rawName) {
  const oldName = state.categories[index];
  const newName = rawName.trim().replace(/\s+/g, " ");

  if (!newName) {
    renderCategoryEditor();
    return;
  }

  const alreadyExists = state.categories.some((category, categoryIndex) => {
    return categoryIndex !== index && category.toLowerCase() === newName.toLowerCase();
  });

  if (alreadyExists) {
    renderCategoryEditor();
    return;
  }

  state.categories[index] = newName;
  state.draftCategories = [...state.categories];

  state.tasks = state.tasks.map(task => {
    if (task.category !== oldName) return task;

    return {
      ...task,
      category: newName
    };
  });

  if (state.currentFilter === oldName) {
    state.currentFilter = newName;
  }

  saveCategories();
  saveTasks();

  renderCategorySelect();
  renderCategoryFilters();
  renderCategoryEditor();
  renderTasks();
}

function deleteCategory(index) {
  if (state.categories.length === 1) return;

  const removedCategory = state.categories[index];
  state.categories.splice(index, 1);
  state.draftCategories = [...state.categories];

  const fallbackCategory = state.categories[0];

  state.tasks = state.tasks.map(task => {
    if (task.category !== removedCategory) return task;

    return {
      ...task,
      category: fallbackCategory
    };
  });

  if (state.currentFilter === removedCategory) {
    state.currentFilter = "Todas";
  }

  saveCategories();
  saveTasks();

  renderCategorySelect();
  renderCategoryFilters();
  renderCategoryEditor();
  renderTasks();
}

function createDragGhost(sourceItem) {
  const ghost = sourceItem.cloneNode(true);
  const rect = sourceItem.getBoundingClientRect();

  ghost.classList.add("category-drag-ghost");
  ghost.style.setProperty("--ghost-width", `${rect.width}px`);
  ghost.style.width = `${rect.width}px`;

  ghost.querySelectorAll("input, button").forEach(element => {
    element.setAttribute("tabindex", "-1");
    element.setAttribute("disabled", "true");
  });

  document.body.appendChild(ghost);
  return ghost;
}

function getStableCategoryDropName(clientY, currentName) {
  const items = [...dom.categoryList.querySelectorAll(".category-item")];
  const currentIndex = state.draftCategories.indexOf(currentName);

  for (const item of items) {
    const itemName = item.dataset.name;

    if (itemName === currentName) continue;

    const itemIndex = state.draftCategories.indexOf(itemName);
    const rect = item.getBoundingClientRect();
    const upperZone = rect.top + rect.height * 0.35;
    const lowerZone = rect.top + rect.height * 0.65;

    if (currentIndex > itemIndex && clientY < upperZone) {
      return itemName;
    }

    if (currentIndex < itemIndex && clientY > lowerZone) {
      return itemName;
    }
  }

  return currentName;
}

function reorderCategoryDuringDrag(fromName, toName) {
  if (fromName === toName) return fromName;

  const fromIndex = state.draftCategories.indexOf(fromName);
  const toIndex = state.draftCategories.indexOf(toName);

  if (fromIndex === -1 || toIndex === -1) return fromName;

  const [movedCategory] = state.draftCategories.splice(fromIndex, 1);
  state.draftCategories.splice(toIndex, 0, movedCategory);
  state.categories = [...state.draftCategories];

  const items = [...dom.categoryList.querySelectorAll(".category-item")];
  const movedItem = items.find(item => item.dataset.name === fromName);
  const targetItem = items.find(item => item.dataset.name === toName);

  if (!movedItem || !targetItem) return fromName;

  const firstPositions = new Map();

  items.forEach(item => {
    firstPositions.set(item, item.getBoundingClientRect());
  });

  if (toIndex > fromIndex) {
    dom.categoryList.insertBefore(movedItem, targetItem.nextSibling);
  } else {
    dom.categoryList.insertBefore(movedItem, targetItem);
  }

  const updatedItems = [...dom.categoryList.querySelectorAll(".category-item")];

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

  return fromName;
}

function markCategorySource(categoryName) {
  document.querySelectorAll(".category-item").forEach(item => {
    item.classList.remove("dragging-source");
  });

  const source = [...document.querySelectorAll(".category-item")]
    .find(item => item.dataset.name === categoryName);

  if (source) {
    source.classList.add("dragging-source");
  }
}

function startCategoryDrag(event, startIndex, sourceItem) {
  event.preventDefault();

  const categoryName = state.draftCategories[startIndex];

  if (!categoryName) return;

  const sourceRect = sourceItem.getBoundingClientRect();
  const offsetX = event.clientX - sourceRect.left;
  const offsetY = event.clientY - sourceRect.top;

  let currentName = categoryName;
  let animationFrame = null;
  let lastClientX = event.clientX;
  let lastClientY = event.clientY;

  const ghost = createDragGhost(sourceItem);

  function moveGhost(clientX, clientY) {
    ghost.style.transform = `translate3d(${clientX - offsetX}px, ${clientY - offsetY}px, 0) rotate(-.45deg)`;
  }

  function handlePointerMove(moveEvent) {
    lastClientX = moveEvent.clientX;
    lastClientY = moveEvent.clientY;

    if (animationFrame) return;

    animationFrame = requestAnimationFrame(() => {
      moveGhost(lastClientX, lastClientY);

      const nextName = getStableCategoryDropName(lastClientY, currentName);

      if (nextName !== currentName) {
        currentName = reorderCategoryDuringDrag(currentName, nextName);
        markCategorySource(currentName);
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

    document.querySelectorAll(".category-item").forEach(item => {
      item.classList.remove("dragging-source", "drag-over");
    });

    saveCategories();
    renderCategorySelect();
    renderCategoryFilters();
    renderCategoryEditor();

    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", finishDrag);
    document.removeEventListener("pointercancel", finishDrag);
  }

  moveGhost(event.clientX, event.clientY);
  markCategorySource(currentName);

  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", finishDrag);
  document.addEventListener("pointercancel", finishDrag);
}

export function resetCategoriesToDefault() {
  const oldCategories = [...state.categories];

  state.categories = [...DEFAULT_CATEGORIES];
  state.draftCategories = [...state.categories];

  state.tasks = state.tasks.map(task => {
    if (state.categories.includes(task.category)) return task;

    return {
      ...task,
      category: state.categories[0]
    };
  });

  if (!state.categories.includes(state.currentFilter)) {
    state.currentFilter = "Todas";
  }

  saveCategories();
  saveTasks();

  renderCategorySelect();
  renderCategoryFilters();
  renderCategoryEditor();
  renderTasks();
}
