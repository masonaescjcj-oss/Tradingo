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

/** Streak freezes a learner can hold at once. */
export const MAX_FREEZES = 2;
/** A lost streak can be repaired if it was at least this long… */
export const REPAIR_MIN = 3;
/** …and no more than this many days were missed. */
export const REPAIR_DAYS = 3;

type StreakState = { streak: number; lastActiveDay: string | null; freezes?: number };

/** Whole calendar days from one YYYY-MM-DD key to another. */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** The `count` days right after a day key. */
export function daysAfter(key: string, count: number): string[] {
  const [y, m, d] = key.split('-').map(Number);
  return Array.from({ length: Math.max(0, count) }, (_, i) => dayKey(new Date(y, m - 1, d + i + 1)));
}

/**
 * The streak only counts if the user was active today or yesterday, or if the days
 * missed since then are covered by streak freezes (used up when they're next active).
 */
export function currentStreak(s: StreakState, today = dayKey()): number {
  if (!s.lastActiveDay) return 0;
  const gap = daysBetween(s.lastActiveDay, today);
  if (gap <= 1) return s.streak;
  return gap - 1 <= (s.freezes ?? 0) ? s.streak : 0;
}

export type StreakStep = {
  streak: number;
  /** Freezes spent on the missed days, which are listed in `frozen`. */
  freezesUsed: number;
  frozen: string[];
  /** The streak that was lost because too many days were missed (0 if none). */
  lost: number;
};

/**
 * Streak after being active on `today`: continues from yesterday (or over days covered
 * by freezes), stays the same later today, otherwise restarts at 1.
 */
export function advanceStreak(s: StreakState, today = dayKey()): StreakStep {
  const none = { freezesUsed: 0, frozen: [], lost: 0 };
  if (!s.lastActiveDay) return { streak: 1, ...none };
  const gap = daysBetween(s.lastActiveDay, today);
  if (gap <= 0) return { streak: s.streak, ...none };
  if (gap === 1) return { streak: s.streak + 1, ...none };
  const missed = gap - 1;
  if (missed <= (s.freezes ?? 0)) return { streak: s.streak + 1, freezesUsed: missed, frozen: daysAfter(s.lastActiveDay, missed), lost: 0 };
  return { streak: 1, ...none, lost: s.streak };
}

export function nextStreak(s: StreakState, today = dayKey()): number {
  return advanceStreak(s, today).streak;
}

/** A streak that broke: its length, the last active day before the break, and the day play resumed. */
export type LostStreak = { value: number; since: string; day: string };

export type StreakRepair = { streak: number; lastActiveDay: string; frozen: string[] };

/**
 * What repairing the streak would give, if it can be repaired: a streak of at least
 * REPAIR_MIN days broken by at most REPAIR_DAYS missed days, either not played since
 * (the streak shows 0) or resumed today or yesterday (the streak restarted at 1).
 */
export function streakRepair(s: StreakState & { lostStreak?: LostStreak | null }, today = dayKey()): StreakRepair | null {
  const lost = s.lostStreak;
  if (lost && s.lastActiveDay && lost.value >= REPAIR_MIN && daysBetween(lost.day, today) <= 1 && currentStreak(s, today) > 0) {
    const missed = daysBetween(lost.since, lost.day) - 1;
    if (missed >= 1 && missed <= REPAIR_DAYS) return { streak: lost.value + s.streak, lastActiveDay: s.lastActiveDay, frozen: daysAfter(lost.since, missed) };
  }
  if (s.lastActiveDay && s.streak >= REPAIR_MIN && currentStreak(s, today) === 0) {
    const missed = daysBetween(s.lastActiveDay, today) - 1;
    if (missed >= 1 && missed <= REPAIR_DAYS) return { streak: s.streak, lastActiveDay: dayBefore(today), frozen: daysAfter(s.lastActiveDay, missed) };
  }
  return null;
}

export function todaysXp(s: { dailyXp: number; dailyDay: string }, today = dayKey()): number {
  return s.dailyDay === today ? s.dailyXp : 0;
}
