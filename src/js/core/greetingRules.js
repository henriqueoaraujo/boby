export function getDayPeriod(hour = new Date().getHours()) {
  const normalizedHour = Number(hour);

  if (!Number.isFinite(normalizedHour) || normalizedHour < 0 || normalizedHour > 23) {
    return "day";
  }
  if (normalizedHour < 12) return "morning";
  if (normalizedHour >= 18) return "night";
  return "afternoon";
}
