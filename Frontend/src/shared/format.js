// "No Details" for null, blank, or placeholder strings like "unknown"
export function orNA(value) {
  if (value === null || value === undefined) return "No Details";
  const s = String(value).trim();
  if (s === "" || s.toLowerCase() === "no data" || s.toLowerCase() === "unknown" || s.toLowerCase() === "none") return "No Details";
  return s;
}

// local time like "3:05 PM"
export function formatTime(value) {
  if (!value) return "No Details";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No Details";
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// full local date + time
export function formatDateTime(value) {
  if (!value) return "No Details";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "No Details";
  return d.toLocaleString();
}
