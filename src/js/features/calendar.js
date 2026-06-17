import {
  addDaysToKey,
  fromDateKey,
  getWeekDates,
  toDateKey
} from "../core/calendarRules.js";
import { dom } from "../core/selectors.js";
import { state } from "../core/state.js";
import { getTodayKey } from "../core/taskRules.js";
import { getLocale, t } from "../core/i18n.js";

let visibleMonth = fromDateKey(state.selectedDueDate);
let calendarView = "months";
let homeCalendarView = "week";
let homeTransitionId = 0;
let popupTransitionId = 0;
const YEAR_PAGE_SIZE = 12;
const HOME_VIEW_ORDER = { day: 0, week: 1, month: 2 };

function capitalizeFirst(value) {
  return value ? value.charAt(0).toLocaleUpperCase(getLocale()) + value.slice(1) : "";
}

function summarizeTasksByDate() {
  const summaries = new Map();

  state.tasks.forEach(task => {
    if (!task.dueDate) return;
    const current = summaries.get(task.dueDate) || { count: 0, hasHigh: false };
    current.count += 1;
    current.hasHigh ||= task.priority === "high";
    summaries.set(task.dueDate, current);
  });

  return summaries;
}

function announceDateSelection() {
  window.dispatchEvent(new CustomEvent("boby:date-change", {
    detail: { date: state.selectedDueDate }
  }));
}

export function selectCalendarDate(date) {
  state.selectedDueDate = date || getTodayKey();
  state.agendaFilter = "all";
  visibleMonth = fromDateKey(state.selectedDueDate);
  renderWeekCalendar();
  announceDateSelection();
}

export function renderWeekCalendar() {
  const dates = getWeekDates(state.selectedDueDate);
  const summaries = summarizeTasksByDate();
  const firstDate = fromDateKey(dates[0]);
  const lastDate = fromDateKey(dates[6]);
  const sameMonth = firstDate.getMonth() === lastDate.getMonth();
  const formatter = new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric"
  });

  dom.weekRangeLabel.textContent = sameMonth
    ? capitalizeFirst(formatter.format(firstDate))
    : `${capitalizeFirst(formatter.format(firstDate))} – ${capitalizeFirst(formatter.format(lastDate))}`;
  dom.weekDays.innerHTML = "";

  dates.forEach((date, index) => {
    const parsed = fromDateKey(date);
    const summary = summaries.get(date) || { count: 0, hasHigh: false };
    const count = summary.count;
    const button = document.createElement("button");

    button.type = "button";
    button.className = "week-day";
    button.classList.toggle("active", date === state.selectedDueDate);
    button.classList.toggle("today", date === getTodayKey());
    button.innerHTML = `
      <span>${new Intl.DateTimeFormat(getLocale(), { weekday: "short" }).format(parsed).replace(".", "")}</span>
      <strong>${parsed.getDate()}</strong>
      <small>${count ? `${count} ${count === 1 ? t("task") : t("tasks")}` : t("free")}</small>
      ${createTaskDot(summary)}
    `;
    button.addEventListener("click", () => selectCalendarDate(date));
    dom.weekDays.appendChild(button);
  });

  if (homeCalendarView === "month") renderHomeMonthCalendar();
  if (homeCalendarView === "day") renderHomeDay();
}

export function showPreviousWeek() {
  if (homeCalendarView === "day") {
    selectCalendarDate(addDaysToKey(state.selectedDueDate, -1));
    return;
  }
  if (homeCalendarView === "month") {
    const selected = fromDateKey(state.selectedDueDate);
    const previousMonth = new Date(selected.getFullYear(), selected.getMonth() - 1, 1);
    selectCalendarDate(toDateKey(previousMonth));
    return;
  }

  selectCalendarDate(addDaysToKey(state.selectedDueDate, -7));
}

export function showNextWeek() {
  if (homeCalendarView === "day") {
    selectCalendarDate(addDaysToKey(state.selectedDueDate, 1));
    return;
  }
  if (homeCalendarView === "month") {
    const selected = fromDateKey(state.selectedDueDate);
    const nextMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
    selectCalendarDate(toDateKey(nextMonth));
    return;
  }

  selectCalendarDate(addDaysToKey(state.selectedDueDate, 7));
}

export function goToToday() {
  selectCalendarDate(getTodayKey());
}

function createTaskDot(summary) {
  return summary?.count
    ? `<i class="calendar-task-dot${summary.hasHigh ? " high" : ""}" aria-hidden="true"></i>`
    : "";
}

function renderHomeDay() {
  const date = fromDateKey(state.selectedDueDate);
  const dayTasks = state.tasks
    .filter(task => task.dueDate === state.selectedDueDate)
    .sort((a, b) => (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99"));
  const unscheduled = dayTasks.filter(task => !task.dueTime);
  const scheduled = dayTasks.filter(task => task.dueTime);

  dom.weekRangeLabel.textContent = new Intl.DateTimeFormat(getLocale(), {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);
  dom.homeDayView.innerHTML = "";

  const noTimeSection = document.createElement("section");
  noTimeSection.className = "day-unscheduled";
  const noTimeTitle = document.createElement("strong");
  noTimeTitle.textContent = t("noTimeTasks");
  noTimeSection.appendChild(noTimeTitle);
  const noTimeList = document.createElement("div");
  noTimeList.className = "day-unscheduled-list";
  if (unscheduled.length) {
    unscheduled.forEach(task => noTimeList.appendChild(createDayTask(task)));
  } else {
    const empty = document.createElement("span");
    empty.className = "day-empty-label";
    empty.textContent = t("noTime");
    noTimeList.appendChild(empty);
  }
  noTimeSection.appendChild(noTimeList);
  dom.homeDayView.appendChild(noTimeSection);

  const timeline = document.createElement("div");
  timeline.className = "day-timeline";
  for (let hour = 0; hour < 24; hour++) {
    const row = document.createElement("div");
    row.className = "day-hour-row";
    const label = document.createElement("time");
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    const events = document.createElement("div");
    events.className = "day-hour-events";
    scheduled
      .filter(task => Number(task.dueTime.slice(0, 2)) === hour)
      .forEach(task => events.appendChild(createDayTask(task, true)));
    row.append(label, events);
    timeline.appendChild(row);
  }
  dom.homeDayView.appendChild(timeline);

  if (!dayTasks.length) {
    const empty = document.createElement("p");
    empty.className = "day-empty-state";
    empty.textContent = t("emptyDay");
    dom.homeDayView.prepend(empty);
  }

  const initialHour = state.selectedDueDate === getTodayKey()
    ? Math.max(new Date().getHours() - 1, 0)
    : 7;
  requestAnimationFrame(() => {
    dom.homeDayView.scrollTop = initialHour * 58;
  });
}

function createDayTask(task, showTime = false) {
  const item = document.createElement("article");
  item.className = "day-task";
  item.classList.toggle("high", task.priority === "high");
  item.classList.toggle("done", task.done);

  const title = document.createElement("strong");
  title.textContent = task.title;
  item.appendChild(title);

  const details = document.createElement("span");
  details.textContent = [
    showTime ? task.dueTime : "",
    task.category,
    task.location ? `Local: ${task.location}` : "",
    task.reminderAt ? `Aviso: ${task.reminderAt.split("T")[1]?.slice(0, 5) || ""}` : "",
    task.priority === "high" ? t("high") : "",
    task.completedAt
      ? t("completedAt", {
          value: new Intl.DateTimeFormat(getLocale(), {
            hour: "2-digit",
            minute: "2-digit"
          }).format(new Date(task.completedAt))
        })
      : ""
  ].filter(Boolean).join(" · ");
  item.appendChild(details);
  return item;
}

function renderHomeMonthCalendar() {
  const selected = fromDateKey(state.selectedDueDate);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const mondayFirstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const summaries = summarizeTasksByDate();

  dom.weekRangeLabel.textContent = capitalizeFirst(new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric"
  }).format(selected));
  dom.homeMonthGrid.innerHTML = "";

  for (let index = 0; index < mondayFirstOffset; index++) {
    const spacer = document.createElement("span");
    spacer.className = "home-month-spacer";
    dom.homeMonthGrid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(new Date(year, month, day));
    const summary = summaries.get(key) || { count: 0, hasHigh: false };
    const count = summary.count;
    const button = document.createElement("button");

    button.type = "button";
    button.className = "home-month-day";
    button.classList.toggle("selected", key === state.selectedDueDate);
    button.classList.toggle("today", key === getTodayKey());
    button.innerHTML = `<span>${day}</span>${createTaskDot(summary)}`;
    button.setAttribute(
      "aria-label",
      `${day}, ${count} tarefa${count === 1 ? "" : "s"}`
    );
    button.addEventListener("click", () => selectCalendarDate(key));
    dom.homeMonthGrid.appendChild(button);
  }
}

function getHomeViewElement(view) {
  if (view === "day") return dom.homeDayView;
  if (view === "month") return dom.homeMonthView;
  return dom.weekDays;
}

function syncHomeViewState() {
  const isMonth = homeCalendarView === "month";
  const isDay = homeCalendarView === "day";

  dom.weekDays.hidden = isMonth || isDay;
  dom.homeDayView.hidden = !isDay;
  dom.homeMonthView.hidden = !isMonth;
  dom.dayAgendaViewButton.classList.toggle("active", isDay);
  dom.weekAgendaViewButton.classList.toggle("active", !isMonth && !isDay);
  dom.monthAgendaViewButton.classList.toggle("active", isMonth);
  dom.dayAgendaViewButton.setAttribute("aria-pressed", String(isDay));
  dom.weekAgendaViewButton.setAttribute("aria-pressed", String(!isMonth && !isDay));
  dom.monthAgendaViewButton.setAttribute("aria-pressed", String(isMonth));
  dom.dayAgendaViewButton.closest(".home-calendar-tabs")
    ?.style.setProperty("--calendar-tab-index", String(HOME_VIEW_ORDER[homeCalendarView]));
}

export async function setHomeCalendarView(view) {
  const nextView = ["day", "month"].includes(view) ? view : "week";
  const previousView = homeCalendarView;

  if (nextView === previousView) {
    renderWeekCalendar();
    syncHomeViewState();
    return;
  }

  const transitionId = ++homeTransitionId;
  const previousElement = getHomeViewElement(previousView);
  const nextElement = getHomeViewElement(nextView);
  const direction = HOME_VIEW_ORDER[nextView] > HOME_VIEW_ORDER[previousView] ? 1 : -1;
  const canAnimate = nextElement?.animate
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  [dom.homeDayView, dom.weekDays, dom.homeMonthView].forEach(element => {
    element.getAnimations?.().forEach(animation => animation.cancel());
    element.hidden = element !== previousElement && element !== nextElement;
  });

  homeCalendarView = nextView;
  renderWeekCalendar();
  nextElement.hidden = false;
  syncHomeViewState();
  previousElement.hidden = false;

  if (!canAnimate) {
    syncHomeViewState();
    return;
  }

  await Promise.all([
    previousElement.animate([
      { opacity: 1, transform: "translateX(0) scale(1)" },
      { opacity: 0, transform: `translateX(${direction * -28}px) scale(.985)` }
    ], {
      duration: 250,
      easing: "cubic-bezier(.4, 0, 1, 1)",
      fill: "forwards"
    }).finished.catch(() => {}),
    nextElement.animate([
      { opacity: 0, transform: `translateX(${direction * 28}px) scale(.985)` },
      { opacity: 1, transform: "translateX(0) scale(1)" }
    ], {
      duration: 360,
      easing: "cubic-bezier(.22, 1, .36, 1)",
      fill: "forwards"
    }).finished.catch(() => {})
  ]);

  if (transitionId !== homeTransitionId) return;
  [previousElement, nextElement].forEach(element => {
    element.getAnimations().forEach(animation => animation.cancel());
  });
  syncHomeViewState();
}

function renderDaysCalendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const mondayFirstOffset = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const summaries = summarizeTasksByDate();

  dom.calendarMonthLabel.textContent = capitalizeFirst(new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric"
  }).format(visibleMonth));
  dom.calendarGrid.innerHTML = "";

  for (let index = 0; index < mondayFirstOffset; index++) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-spacer";
    dom.calendarGrid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(new Date(year, month, day));
    const summary = summaries.get(key) || { count: 0, hasHigh: false };
    const count = summary.count;
    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day";
    button.classList.toggle("selected", state.selectedDueDate === key);
    button.classList.toggle("today", getTodayKey() === key);
    button.innerHTML = `<span>${day}</span>${createTaskDot(summary)}`;
    button.setAttribute("aria-label", `${day}, ${count} tarefas`);
    button.addEventListener("click", () => {
      selectCalendarDate(key);
      closeCalendar();
    });
    dom.calendarGrid.appendChild(button);
  }
}

function renderMonthPicker() {
  const year = visibleMonth.getFullYear();
  const summaries = summarizeTasksByDate();

  dom.calendarMonthLabel.textContent = String(year);
  dom.yearGrid.innerHTML = "";

  for (let month = 0; month < 12; month++) {
    const button = document.createElement("button");
    const monthCount = [...summaries.entries()].reduce((total, [date, summary]) => {
      const parsed = fromDateKey(date);
      return parsed.getFullYear() === year && parsed.getMonth() === month
        ? total + summary.count
        : total;
    }, 0);

    button.type = "button";
    button.className = "year-month";
    button.innerHTML = `
      <strong>${new Intl.DateTimeFormat(getLocale(), { month: "long" }).format(new Date(year, month, 1))}</strong>
      <span>${monthCount} ${monthCount === 1 ? t("task") : t("tasks")}</span>
    `;
    button.addEventListener("click", () => {
      const selected = fromDateKey(state.selectedDueDate);
      const selectedDay = selected.getFullYear() === year && selected.getMonth() === month
        ? selected.getDate()
        : 1;
      const lastDay = new Date(year, month + 1, 0).getDate();
      selectCalendarDate(toDateKey(new Date(year, month, Math.min(selectedDay, lastDay))));
      closeCalendar();
    });
    dom.yearGrid.appendChild(button);
  }
}

function getYearPageStart(year) {
  return Math.floor(year / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE;
}

function renderYearPicker() {
  const activeYear = visibleMonth.getFullYear();
  const firstYear = getYearPageStart(activeYear);
  const lastYear = firstYear + YEAR_PAGE_SIZE - 1;
  const summaries = summarizeTasksByDate();

  dom.calendarMonthLabel.textContent = `${firstYear} – ${lastYear}`;
  dom.yearGrid.innerHTML = "";

  for (let year = firstYear; year <= lastYear; year++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "year-option";
    button.classList.toggle("selected", year === activeYear);
    const yearCount = [...summaries.entries()].reduce((total, [date, summary]) => {
      return fromDateKey(date).getFullYear() === year ? total + summary.count : total;
    }, 0);
    button.innerHTML = `
      <strong>${year}</strong>
      <span>${yearCount} ${yearCount === 1 ? t("task") : t("tasks")}</span>
    `;
    button.addEventListener("click", () => {
      visibleMonth = new Date(year, visibleMonth.getMonth(), 1);
      setCalendarView("months");
    });
    dom.yearGrid.appendChild(button);
  }
}

export function renderCalendar() {
  const isYears = calendarView === "years";
  dom.calendarGrid.hidden = true;
  dom.calendarWeekdays.hidden = true;
  dom.yearGrid.hidden = false;
  dom.calendarMonthViewButton.classList.toggle("active", !isYears);
  dom.calendarYearViewButton.classList.toggle("active", isYears);
  dom.calendarMonthViewButton.setAttribute("aria-pressed", String(!isYears));
  dom.calendarYearViewButton.setAttribute("aria-pressed", String(isYears));
  dom.calendarMonthViewButton.closest(".calendar-view-tabs")
    ?.style.setProperty("--calendar-popup-tab-index", isYears ? "1" : "0");
  dom.calendarPeriodButton.setAttribute(
    "aria-label",
    isYears ? "Voltar aos meses" : "Selecionar ano"
  );

  if (isYears) renderYearPicker();
  else renderMonthPicker();
}

export async function setCalendarView(view) {
  const nextView = view === "years" ? "years" : "months";
  if (nextView === calendarView) {
    renderCalendar();
    return;
  }

  const transitionId = ++popupTransitionId;
  const direction = nextView === "years" ? 1 : -1;
  const canAnimate = dom.yearGrid.animate
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  dom.yearGrid.getAnimations().forEach(animation => animation.cancel());

  if (canAnimate) {
    await dom.yearGrid.animate([
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: `translateX(${direction * -20}px)` }
    ], {
      duration: 150,
      easing: "ease-in",
      fill: "forwards"
    }).finished.catch(() => {});
  }

  if (transitionId !== popupTransitionId) return;
  calendarView = nextView;
  renderCalendar();

  if (canAnimate) {
    await dom.yearGrid.animate([
      { opacity: 0, transform: `translateX(${direction * 20}px)` },
      { opacity: 1, transform: "translateX(0)" }
    ], {
      duration: 280,
      easing: "cubic-bezier(.22, 1, .36, 1)",
      fill: "forwards"
    }).finished.catch(() => {});
    if (transitionId === popupTransitionId) {
      dom.yearGrid.getAnimations().forEach(animation => animation.cancel());
    }
  }
}

export function toggleCalendarPeriodPicker() {
  if (calendarView === "months") setCalendarView("years");
  else setCalendarView("months");
}

export function openCalendar() {
  visibleMonth = fromDateKey(state.selectedDueDate);
  calendarView = "months";
  renderCalendar();
  dom.calendarPanel.classList.add("open");
  dom.calendarPanel.setAttribute("aria-hidden", "false");
}

export function closeCalendar() {
  dom.calendarPanel.classList.remove("open");
  dom.calendarPanel.setAttribute("aria-hidden", "true");
}

export function closeCalendarOnBackdrop(event) {
  if (event.target === event.currentTarget) closeCalendar();
}

export function showPreviousCalendarPeriod() {
  if (calendarView === "months") {
    visibleMonth = new Date(visibleMonth.getFullYear() - 1, visibleMonth.getMonth(), 1);
  } else {
    visibleMonth = new Date(visibleMonth.getFullYear() - YEAR_PAGE_SIZE, visibleMonth.getMonth(), 1);
  }
  renderCalendar();
}

export function showNextCalendarPeriod() {
  if (calendarView === "months") {
    visibleMonth = new Date(visibleMonth.getFullYear() + 1, visibleMonth.getMonth(), 1);
  } else {
    visibleMonth = new Date(visibleMonth.getFullYear() + YEAR_PAGE_SIZE, visibleMonth.getMonth(), 1);
  }
  renderCalendar();
}
