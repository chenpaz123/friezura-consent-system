/**
 * Israeli-standard (DD/MM/YYYY) date helpers. Internally, dates are still
 * kept as ISO "YYYY-MM-DD" strings (sortable, easy to construct/compare) —
 * these helpers only govern how dates are *typed and displayed*.
 */

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY" */
export function isoToDisplay(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, yyyy, mm, dd] = match;
  return `${dd}/${mm}/${yyyy}`;
}

/** "DD/MM/YYYY" -> "YYYY-MM-DD", or null if not a valid calendar date. */
export function displayToIso(display: string): string | null {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Formats a JS Date as "DD/MM/YYYY" regardless of browser/OS locale. */
export function formatIsraeliDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Formats a JS Date as "HH:MM" (24h, Israeli standard). */
export function formatIsraeliTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
