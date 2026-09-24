import { getLang, type Lang } from '@/i18n/lang';

import { ALL_COURSES, COURSE_ALIASES } from './courses';
import { localizeCourse } from './i18n';
import type { Course, CourseCategory, CourseLevel, Lesson, Market, Unit } from './types';

export * from './types';
/** The Persian source of every course (validators and tests); screens use allCourses(). */
export { ALL_COURSES };

export const CATEGORIES: { id: CourseCategory; title: string; subtitle: string }[] = [
  { id: 'foundations', title: 'مبانی و بازارها', subtitle: 'از صفر شروع کن' },
  { id: 'technical', title: 'تحلیل', subtitle: 'نمودار رو بخون' },
  { id: 'risk', title: 'ریسک و روانشناسی', subtitle: 'زنده موندن توی بازار' },
  { id: 'strategy', title: 'استراتژی‌ها', subtitle: 'از تحلیل تا معامله' },
];

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: 'مقدماتی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
};

type LessonHit = { course: Course; unit: Unit; lesson: Lesson; index: number };

type Catalog = {
  courses: Course[];
  courseById: Map<string, Course>;
  unitById: Map<string, { course: Course; unit: Unit }>;
  lessonById: Map<string, LessonHit>;
};

/** Courses in one language with their lookups, built once per language when first needed. */
const catalogs: Partial<Record<Lang, Catalog>> = {};
function catalog(): Catalog {
  const lang = getLang();
  const cached = catalogs[lang];
  if (cached) return cached;
  const courses = lang === 'en' ? ALL_COURSES.map((c) => localizeCourse(c)) : ALL_COURSES;
  const built: Catalog = { courses, courseById: new Map(), unitById: new Map(), lessonById: new Map() };
  for (const course of courses) {
    built.courseById.set(course.id, course);
    for (const unit of course.units) {
      built.unitById.set(unit.id, { course, unit });
      unit.lessons.forEach((lesson, index) => built.lessonById.set(lesson.id, { course, unit, lesson, index }));
    }
  }
  catalogs[lang] = built;
  return built;
}

/** Every course, in the app's language. */
export const allCourses = (): Course[] => catalog().courses;

/** The current id of a course, also for ids from before the topics were merged. */
export const canonicalCourseId = (id: string): string => COURSE_ALIASES[id] ?? id;

/** Course ids mapped to current ones, without duplicates or unknown ids, in order. */
export function canonicalCourseIds(ids: string[]): string[] {
  return [...new Set(ids.map(canonicalCourseId))].filter((id) => catalog().courseById.has(id));
}

export const findCourse = (id: string): Course | undefined => catalog().courseById.get(canonicalCourseId(id));
export const findUnit = (id: string): Unit | undefined => catalog().unitById.get(id)?.unit;
export const findUnitWithCourse = (id: string): { course: Course; unit: Unit } | undefined => catalog().unitById.get(id);
export const findLesson = (id: string): LessonHit | undefined => catalog().lessonById.get(id);

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
  return ['basics', ...markets, 'technical', 'risk'];
}

/** A reward chest sits after the second lesson of units with three or more lessons. */
export const CHEST_AFTER = 2;

export function chestId(unit: Unit): string | null {
  return unit.lessons.length > CHEST_AFTER ? `${unit.id}-chest` : null;
}
