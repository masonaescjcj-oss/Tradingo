/**
 * Checks the English lesson overlays against the Persian content (missing or extra keys,
 * Persian left over, blanks and highlights, line labels) and prints what's wrong. The English
 * lessons also go through the same structural checks as the Persian (label and note lengths…).
 *
 *   npx tsx scripts/i18n-check.ts            every unit must be translated
 *   npx tsx scripts/i18n-check.ts --partial  only the units that have an English file
 *   npx tsx scripts/i18n-check.ts --unit basics-1   one unit (reads its JSON file directly)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ALL_COURSES } from '../src/content/courses';
import { localizeCourse, translationIssues, type Overlay } from '../src/content/i18n';
import { validateCourses } from '../src/content/validate';

const args = process.argv.slice(2);
const dir = resolve(__dirname, '../src/content/i18n/en');
const unitArg = args.includes('--unit') ? args[args.indexOf('--unit') + 1] : null;

// Read the JSON files directly, so a check works before the index is regenerated.
const units: Record<string, Overlay> = {};
for (const course of ALL_COURSES) {
  for (const unit of course.units) {
    const file = join(dir, 'units', `${unit.id}.json`);
    if (existsSync(file)) units[unit.id] = JSON.parse(readFileSync(file, 'utf8'));
  }
}
const coursesFile = join(dir, 'courses.json');
const courses: Record<string, Overlay> = existsSync(coursesFile) ? JSON.parse(readFileSync(coursesFile, 'utf8')) : {};

const scope = unitArg ? ALL_COURSES.map((c) => ({ ...c, units: c.units.filter((u) => u.id === unitArg) })).filter((c) => c.units.length) : ALL_COURSES;
const issues = translationIssues(scope, { only: args.includes('--partial') || unitArg ? 'translated' : undefined }, { courses, units }).filter(
  (i) => !unitArg || i.where === `unit ${unitArg}`,
);
// The English lessons must pass the same structural checks as the Persian ones.
for (const problem of validateCourses(scope.map((c) => localizeCourse(c, courses, units)))) {
  const unit = /unit ([\w-]+)/.exec(problem)?.[1];
  if (!unitArg || unit === unitArg) issues.push({ where: `unit ${unit ?? '?'}`, key: '', problem });
}
for (const i of issues.slice(0, 200)) console.log(`${i.where}  ${i.key}  ${i.problem}`);
const total = ALL_COURSES.reduce((n, c) => n + c.units.length, 0);
console.log(`${issues.length} issue(s); ${Object.keys(units).length}/${total} units and ${Object.keys(courses).length}/${ALL_COURSES.length} course cards have English`);
process.exit(issues.length ? 1 : 0);
