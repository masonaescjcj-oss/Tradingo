import { addDays, dayKey } from '@/utils/date';

export type Review = { due: string; interval: number };

/** Next review after a study session: the gap doubles after a good session and resets after a weak one. */
export function nextReview(prev: Review | undefined, good: boolean, today = new Date()): Review {
  const interval = good ? Math.min(60, prev ? prev.interval * 2 : 2) : 1;
  return { due: dayKey(addDays(today, interval)), interval };
}

/** Lesson ids whose review is due today or earlier. */
export function dueLessons(reviews: Record<string, Review>, today = dayKey()): string[] {
  return Object.entries(reviews)
    .filter(([, r]) => r.due <= today)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
}
