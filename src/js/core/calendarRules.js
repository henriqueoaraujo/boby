export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(value) {
  return new Date(`${value}T12:00:00`);
}

export function addDaysToKey(value, days) {
  const date = fromDateKey(value);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function getWeekDates(selectedDate) {
  const date = fromDateKey(selectedDate);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setDate(day.getDate() + index);
    return toDateKey(day);
  });
}

export function generateOccurrenceDates({
  startDate,
  endDate,
  weekdays
}) {
  if (!startDate) return [];

  const finalDate = endDate && endDate >= startDate ? endDate : startDate;
  const selectedWeekdays = new Set(
    Array.isArray(weekdays) ? weekdays.map(Number) : []
  );
  const dates = [];

  for (
    let current = startDate;
    current <= finalDate;
    current = addDaysToKey(current, 1)
  ) {
    const weekday = fromDateKey(current).getDay();
    if (!selectedWeekdays.size || selectedWeekdays.has(weekday)) {
      dates.push(current);
    }
  }

  return dates;
}

export function carryIncompleteTasks(tasks, targetDate) {
  let changed = false;

  const nextTasks = tasks.map(task => {
    if (task.done || !task.dueDate || task.dueDate >= targetDate) return task;

    changed = true;
    return {
      ...task,
      originalDueDate: task.originalDueDate || task.dueDate,
      dueDate: targetDate,
      carriedAt: targetDate,
      updatedAt: new Date().toISOString()
    };
  });

  return { changed, tasks: nextTasks };
}
