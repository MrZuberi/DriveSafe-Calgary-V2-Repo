// true if within 7 days, missing or unparseable dates pass
export function isWithinLastWeek(value) {
  if (!value) return true;
  const d = new Date(value);
  if (isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
}

// true if it falls on today's local calendar date
export function isToday(value) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
