/**
 * Checks course content for structural mistakes.
 *
 *   npm run validate:content            # every course
 *   npm run validate:content -- smc gold  # only these courses
 */
import type { Course } from '../src/content/types';
import { validateCourses } from '../src/content/validate';

async function main() {
  const ids = process.argv.slice(2);
  const courses: Course[] = ids.length
    ? await Promise.all(ids.map(async (id: string) => (await import(`../src/content/courses/${id}/index`)).course as Course))
    : (await import('../src/content/courses/index')).ALL_COURSES;

  const problems = validateCourses(courses);
  const lessons = courses.flatMap((c) => c.units.flatMap((u) => u.lessons));
  const steps = lessons.flatMap((l) => l.steps);
  const byType: Record<string, number> = {};
  for (const s of steps) byType[s.type] = (byType[s.type] ?? 0) + 1;

  console.log(
    `${courses.length} courses · ${courses.reduce((n, c) => n + c.units.length, 0)} units · ${lessons.length} lessons · ${steps.length} steps`,
  );
  console.log(Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(' · '));
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log('✓ content is valid');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
