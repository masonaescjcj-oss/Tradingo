/**
 * English lesson content. Persian is the source: an English overlay maps the path of each
 * Persian string in a unit ('lessons/basics-1-1/steps/3/options/1/label') to its English text.
 * Items with an id (units, lessons) are addressed by id, the rest by position, so adding or
 * moving a lesson doesn't shift the others. Course cards (title, subtitle, description) have
 * their own overlay per course. Anything missing stays Persian.
 */
import type { Course, Unit } from '../types';

import { EN_COURSES, EN_UNITS } from './en';

export type Overlay = Record<string, string>;

const PERSIAN = /[؀-ۿ]/;

/** Path segment of an array item: its id when it has one (units, lessons), else its index. */
function segment(item: unknown, index: number): string {
  const id = item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined;
  return typeof id === 'string' ? id : String(index);
}

const join = (path: string, key: string) => (path ? `${path}/${key}` : key);

/** Every Persian string in a value, by path. */
export function persianStrings(value: unknown, path = '', out: Overlay = {}): Overlay {
  if (typeof value === 'string') {
    if (PERSIAN.test(value)) out[path] = value;
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => persianStrings(item, join(path, segment(item, i)), out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) persianStrings(v, join(path, k), out);
  }
  return out;
}

/** A copy of a value with the overlay's text for each Persian string it has a path for. */
export function applyOverlay<T>(value: T, overlay: Overlay, path = ''): T {
  if (typeof value === 'string') return (PERSIAN.test(value) && overlay[path] ? overlay[path] : value) as T;
  if (Array.isArray(value)) return value.map((item, i) => applyOverlay(item, overlay, join(path, segment(item, i)))) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = applyOverlay(v, overlay, join(path, k));
    return out as T;
  }
  return value;
}

/** The Persian strings of a course card (everything but its units). */
export function courseCardStrings(course: Course): Overlay {
  const { units: _units, ...card } = course;
  return persianStrings(card);
}

export function unitStrings(unit: Unit): Overlay {
  return persianStrings(unit);
}

/** A course in English, as far as it's translated. */
export function localizeCourse(course: Course, courses = EN_COURSES, units = EN_UNITS): Course {
  const { units: parts, ...card } = course;
  return { ...applyOverlay(card, courses[course.id] ?? {}), units: parts.map((u) => applyOverlay(u, units[u.id] ?? {})) };
}

export type TranslationIssue = { where: string; key: string; problem: string };

/**
 * What's wrong with the English overlays: missing or extra keys, Persian left in the English,
 * a different number of blanks (___) or highlights (**), or a line label too long for its tag.
 * `only` limits the check to the units that have an overlay (while translation is under way).
 */
export function translationIssues(courses: Course[], opts: { only?: 'translated' } = {}, en = { courses: EN_COURSES, units: EN_UNITS }): TranslationIssue[] {
  const issues: TranslationIssue[] = [];
  const check = (where: string, source: Overlay, english: Overlay | undefined, labels: Set<string>) => {
    if (!english) {
      if (opts.only !== 'translated') issues.push({ where, key: '*', problem: 'not translated' });
      return;
    }
    for (const key of Object.keys(source)) {
      const fa = source[key];
      const text = english[key];
      if (text == null || !text.trim()) {
        issues.push({ where, key, problem: 'missing' });
        continue;
      }
      if (/[؀-ۿ۰-۹]/.test(text)) issues.push({ where, key, problem: 'Persian left in the English' });
      const blanks = (s: string) => s.split('___').length - 1;
      if (blanks(fa) !== blanks(text)) issues.push({ where, key, problem: `blanks: ${blanks(fa)} in Persian, ${blanks(text)} in English` });
      const marks = (s: string) => s.split('**').length - 1;
      if (marks(fa) !== marks(text)) issues.push({ where, key, problem: `** highlights: ${marks(fa)} in Persian, ${marks(text)} in English` });
      if (labels.has(key) && text.length > 14) issues.push({ where, key, problem: `line label longer than 14 characters: "${text}"` });
    }
    for (const key of Object.keys(english)) if (!(key in source)) issues.push({ where, key, problem: 'not in the Persian any more' });
  };
  for (const course of courses) {
    check(`course ${course.id}`, courseCardStrings(course), en.courses[course.id], new Set());
    for (const unit of course.units) {
      // Labels on draggable lines sit in a small price tag.
      const labels = new Set<string>();
      for (const lesson of unit.lessons) lesson.steps.forEach((s, i) => s.type === 'line' && labels.add(`lessons/${lesson.id}/steps/${i}/label`));
      check(`unit ${unit.id}`, unitStrings(unit), en.units[unit.id], labels);
    }
  }
  return issues;
}
