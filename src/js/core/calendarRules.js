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
  weekdays,
  monthlyDay
}) {
  if (!startDate) return [];

  const finalDate = endDate && endDate >= startDate ? endDate : startDate;
  const dates = new Set();
  const selectedMonthlyDay = Number(monthlyDay);
  const hasMonthlyRule = Number.isInteger(selectedMonthlyDay) && selectedMonthlyDay >= 1 && selectedMonthlyDay <= 31;

  if (hasMonthlyRule) {
    const start = fromDateKey(startDate);
    const end = fromDateKey(finalDate);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12);

    while (cursor <= end) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(selectedMonthlyDay, lastDay);
      const candidate = toDateKey(new Date(year, month, day, 12));

      if (candidate >= startDate && candidate <= finalDate) dates.add(candidate);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const selectedWeekdays = new Set(
    Array.isArray(weekdays) ? weekdays.map(Number) : []
  );
  const shouldUseWeeklyRule = selectedWeekdays.size > 0 || !hasMonthlyRule;

  if (shouldUseWeeklyRule) {
    for (
      let current = startDate;
      current <= finalDate;
      current = addDaysToKey(current, 1)
    ) {
      const weekday = fromDateKey(current).getDay();
      if (!selectedWeekdays.size || selectedWeekdays.has(weekday)) {
        dates.add(current);
      }
    }
  }

  return [...dates].sort();
}

function carryReminderToDate(task, targetDate) {
  if (!task.reminderAt || typeof task.reminderAt !== "string") return task.reminderAt || "";

  const [, time = ""] = task.reminderAt.split("T");
  return time ? `${targetDate}T${time.slice(0, 5)}` : "";
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
      reminderAt: carryReminderToDate(task, targetDate),
      carriedAt: targetDate,
      updatedAt: new Date().toISOString()
    };
  });

  return { changed, tasks: nextTasks };
}
