import { addDays, dayKey } from '@/utils/date';

export const MAX_HEARTS = 5;
export const HEART_REFILL_MS = 30 * 60 * 1000;

/** The calendar day before a YYYY-MM-DD key. */
function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(addDays(new Date(y, m - 1, d), -1));
}

/** Hearts come back one at a time while below the maximum. */
export function heartsNow(s: { hearts: number; heartsUpdatedAt: number }, now = Date.now()) {
  if (s.hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, nextInMs: 0, updatedAt: now };
  const gained = Math.floor((now - s.heartsUpdatedAt) / HEART_REFILL_MS);
  const hearts = Math.min(MAX_HEARTS, s.hearts + gained);
  const updatedAt = s.heartsUpdatedAt + gained * HEART_REFILL_MS;
  return { hearts, nextInMs: hearts >= MAX_HEARTS ? 0 : HEART_REFILL_MS - (now - updatedAt), updatedAt };
}

/** The streak only counts if the user was active today or yesterday. */
export function currentStreak(s: { streak: number; lastActiveDay: string | null }, today = dayKey()): number {
  if (!s.lastActiveDay) return 0;
  return s.lastActiveDay === today || s.lastActiveDay === dayBefore(today) ? s.streak : 0;
}

/** Streak after being active on `today`: continues from yesterday, stays the same later today, otherwise restarts at 1. */
export function nextStreak(s: { streak: number; lastActiveDay: string | null }, today = dayKey()): number {
  if (s.lastActiveDay === today) return s.streak;
  return s.lastActiveDay === dayBefore(today) ? s.streak + 1 : 1;
}

export function todaysXp(s: { dailyXp: number; dailyDay: string }, today = dayKey()): number {
  return s.dailyDay === today ? s.dailyXp : 0;
}
