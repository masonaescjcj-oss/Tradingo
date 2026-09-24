/** Moments worth sharing after a lesson: a finished course or unit, or a streak milestone. */
import { findLesson } from '@/content';

import { courseCard, streakCard, unitCard, type ShareCard, type WeekDot } from './shareCard';

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

type Snapshot = { completed: Record<string, unknown>; streak: number; bestStreak: number };

/** The card to offer after a session, if it reached something worth sharing. */
export function sessionMilestone(p: {
  name: string;
  /** Set for a regular lesson; tests that skip ahead don't count as finishing units. */
  lessonId?: string;
  before: Snapshot;
  after: Snapshot;
  week: WeekDot[];
}): ShareCard | null {
  const hit = p.lessonId ? findLesson(p.lessonId) : undefined;
  if (hit) {
    const all = hit.course.units.flatMap((u) => u.lessons.map((l) => l.id));
    const done = (ids: string[], c: Record<string, unknown>) => ids.every((id) => c[id]);
    if (done(all, p.after.completed) && !done(all, p.before.completed)) {
      return courseCard({ name: p.name, courseTitle: hit.course.title, color: hit.course.color, lessons: all.length, units: hit.course.units.length });
    }
    const unitIds = hit.unit.lessons.map((l) => l.id);
    if (done(unitIds, p.after.completed) && !done(unitIds, p.before.completed)) {
      return unitCard({
        name: p.name,
        unitTitle: hit.unit.title,
        courseTitle: hit.course.title,
        color: hit.course.color,
        lessons: unitIds.length,
        done: all.filter((id) => p.after.completed[id]).length,
        total: all.length,
      });
    }
  }
  // Only on milestone days: a record run would otherwise offer a card every day.
  if (p.after.streak > p.before.streak && STREAK_MILESTONES.includes(p.after.streak)) {
    return streakCard({ name: p.name, streak: p.after.streak, best: Math.max(p.before.bestStreak, p.after.streak), week: p.week });
  }
  return null;
}
