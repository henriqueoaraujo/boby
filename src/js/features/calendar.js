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
let calendarView = "days";
let homeCalendarView = "week";
const YEAR_PAGE_SIZE = 12;

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
    ? formatter.format(firstDate)
    : `${formatter.format(firstDate)} – ${formatter.format(lastDate)}`;
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

  dom.weekRangeLabel.textContent = new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric"
  }).format(selected);
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

export function setHomeCalendarView(view) {
  homeCalendarView = ["day", "month"].includes(view) ? view : "week";
  const isMonth = homeCalendarView === "month";
  const isDay = homeCalendarView === "day";

  dom.weekDays.hidden = isMonth || isDay;
  dom.homeDayView.hidden = !isDay;
  dom.homeMonthView.hidden = !isMonth;
  dom.dayAgendaViewButton.classList.toggle("active", isDay);
  dom.weekAgendaViewButton.classList.toggle("active", !isMonth && !isDay);
  dom.monthAgendaViewButton.classList.toggle("active", isMonth);
  renderWeekCalendar();
}

function renderDaysCalendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const mondayFirstOffset = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const summaries = summarizeTasksByDate();

  dom.calendarMonthLabel.textContent = new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric"
  }).format(visibleMonth);
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
      visibleMonth = new Date(year, month, 1);
      setCalendarView("days");
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

  dom.calendarMonthLabel.textContent = `${firstYear} – ${lastYear}`;
  dom.yearGrid.innerHTML = "";

  for (let year = firstYear; year <= lastYear; year++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "year-option";
    button.classList.toggle("selected", year === activeYear);
    button.textContent = String(year);
    button.addEventListener("click", () => {
      visibleMonth = new Date(year, visibleMonth.getMonth(), 1);
      setCalendarView("months");
    });
    dom.yearGrid.appendChild(button);
  }
}

export function renderCalendar() {
  const isDays = calendarView === "days";
  const isYears = calendarView === "years";
  dom.calendarGrid.hidden = !isDays;
  dom.calendarWeekdays.hidden = !isDays;
  dom.yearGrid.hidden = isDays;
  dom.calendarMonthViewButton.classList.toggle("active", !isYears);
  dom.calendarYearViewButton.classList.toggle("active", isYears);
  dom.calendarPeriodButton.setAttribute(
    "aria-label",
    isDays ? "Selecionar mês e ano" : isYears ? "Voltar aos meses" : "Selecionar ano"
  );

  if (isDays) renderDaysCalendar();
  else if (isYears) renderYearPicker();
  else renderMonthPicker();
}

export function setCalendarView(view) {
  calendarView = ["days", "months", "years"].includes(view) ? view : "days";
  renderCalendar();
}

export function toggleCalendarPeriodPicker() {
  if (calendarView === "days") setCalendarView("months");
  else if (calendarView === "months") setCalendarView("years");
  else setCalendarView("months");
}

export function openCalendar() {
  visibleMonth = fromDateKey(state.selectedDueDate);
  calendarView = "days";
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
  if (calendarView === "days") {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  } else if (calendarView === "months") {
    visibleMonth = new Date(visibleMonth.getFullYear() - 1, visibleMonth.getMonth(), 1);
  } else {
    visibleMonth = new Date(visibleMonth.getFullYear() - YEAR_PAGE_SIZE, visibleMonth.getMonth(), 1);
  }
  renderCalendar();
}

export function showNextCalendarPeriod() {
  if (calendarView === "days") {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  } else if (calendarView === "months") {
    visibleMonth = new Date(visibleMonth.getFullYear() + 1, visibleMonth.getMonth(), 1);
  } else {
    visibleMonth = new Date(visibleMonth.getFullYear() + YEAR_PAGE_SIZE, visibleMonth.getMonth(), 1);
  }
  renderCalendar();
}
