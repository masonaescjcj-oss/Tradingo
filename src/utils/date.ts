/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Start of the league week. Weeks start on Saturday, like the Iranian calendar week. */
export function weekStart(date: Date = new Date()): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sinceSaturday = (start.getDay() + 1) % 7; // Sat=0 … Fri=6
  start.setDate(start.getDate() - sinceSaturday);
  return start;
}

export function weekKey(date: Date = new Date()): string {
  return dayKey(weekStart(date));
}

/** Saturday-first index of a weekday: شنبه = 0 … جمعه = 6. */
export function faWeekdayIndex(date: Date): number {
  return (date.getDay() + 1) % 7;
}

export const FA_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
