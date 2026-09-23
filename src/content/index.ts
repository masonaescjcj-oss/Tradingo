import { ALL_COURSES } from './courses';
import type { Course, CourseCategory, CourseLevel, Lesson, Market, Unit } from './types';

export * from './types';
export { ALL_COURSES };

export const CATEGORIES: { id: CourseCategory; title: string; subtitle: string }[] = [
  { id: 'foundations', title: 'مبانی', subtitle: 'از صفر شروع کن' },
  { id: 'technical', title: 'تحلیل تکنیکال', subtitle: 'نمودار رو بخون' },
  { id: 'strategy', title: 'استراتژی‌ها', subtitle: 'از تحلیل تا معامله' },
  { id: 'risk', title: 'ریسک و روانشناسی', subtitle: 'زنده موندن توی بازار' },
  { id: 'fundamental', title: 'فاندامنتال', subtitle: 'چرا بازار حرکت می‌کنه' },
  { id: 'markets', title: 'بازارها و امنیت', subtitle: 'طلا، شاخص‌ها و دیفای' },
];

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: 'مقدماتی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
};

type LessonHit = { course: Course; unit: Unit; lesson: Lesson; index: number };

const courseById = new Map<string, Course>();
const unitById = new Map<string, { course: Course; unit: Unit }>();
const lessonById = new Map<string, LessonHit>();
for (const course of ALL_COURSES) {
  courseById.set(course.id, course);
  for (const unit of course.units) {
    unitById.set(unit.id, { course, unit });
    unit.lessons.forEach((lesson, index) => lessonById.set(lesson.id, { course, unit, lesson, index }));
  }
}

export const findCourse = (id: string): Course | undefined => courseById.get(id);
export const findUnit = (id: string): Unit | undefined => unitById.get(id)?.unit;
export const findUnitWithCourse = (id: string): { course: Course; unit: Unit } | undefined => unitById.get(id);
export const findLesson = (id: string): LessonHit | undefined => lessonById.get(id);

/** Every lesson id of a course, in path order. */
export function courseLessonIds(course: Course): string[] {
  return course.units.flatMap((u) => u.lessons.map((l) => l.id));
}

export function courseProgress(course: Course, completed: Record<string, unknown>): { done: number; total: number } {
  const ids = courseLessonIds(course);
  return { done: ids.filter((id) => completed[id]).length, total: ids.length };
}

/** Courses a new learner starts with, based on the market they picked. */
export function starterCourses(market: Market): string[] {
  const markets = market === 'forex' ? ['forex'] : market === 'crypto' ? ['crypto'] : ['forex', 'crypto'];
  return ['basics', ...markets, 'candles', 'trend', 'risk'];
}

/** A reward chest sits after the second lesson of units with three or more lessons. */
export const CHEST_AFTER = 2;

export function chestId(unit: Unit): string | null {
  return unit.lessons.length > CHEST_AFTER ? `${unit.id}-chest` : null;
}
