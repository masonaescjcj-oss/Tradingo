import { findCourse } from '@/content';

type Level = 'new' | 'some' | 'pro';

/**
 * Where a learner who says they already know some trading can jump to. Nobody skips on their
 * word alone: they start at the beginning and are offered the jump test of this unit of the
 * basics course; passing it (like any jump test) marks everything up to it as done.
 * «یه چیزایی بلدم» tests the first unit, «قبلاً ترید کردم» the second.
 */
export function placementUnit(level: Level): string | null {
  const index = level === 'some' ? 0 : level === 'pro' ? 1 : -1;
  return findCourse('basics')?.units[index]?.id ?? null;
}

/** Whether the offer is still open: it's set and that unit isn't done yet. */
export function placementOpen(placement: string | null | undefined, completed: Record<string, unknown>): boolean {
  if (!placement) return false;
  const unit = findCourse('basics')?.units.find((u) => u.id === placement);
  return !!unit && !unit.lessons.every((l) => completed[l.id]);
}
