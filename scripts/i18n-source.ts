/**
 * Writes the Persian strings of every course, to translate: <out>/courses.json (course cards,
 * by course id) and <out>/units/<unitId>.json (one file per unit), each mapping a path to
 * its Persian text. The English files in src/content/i18n/en use the same paths.
 *
 *   npx tsx scripts/i18n-source.ts /tmp/chartoon-i18n
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_COURSES } from '../src/content/courses';
import { courseCardStrings, unitStrings } from '../src/content/i18n';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx scripts/i18n-source.ts <out dir>');
mkdirSync(join(out, 'units'), { recursive: true });

const cards: Record<string, Record<string, string>> = {};
const index: string[] = [];
for (const course of ALL_COURSES) {
  cards[course.id] = courseCardStrings(course);
  for (const unit of course.units) {
    const strings = unitStrings(unit);
    writeFileSync(join(out, 'units', `${unit.id}.json`), `${JSON.stringify(strings, null, 2)}\n`);
    index.push(`${course.id}\t${unit.id}\t${Object.keys(strings).length} strings\t${unit.title}`);
  }
}
writeFileSync(join(out, 'courses.json'), `${JSON.stringify(cards, null, 2)}\n`);
writeFileSync(join(out, 'index.tsv'), `${index.join('\n')}\n`);
console.log(`wrote ${index.length} units and ${ALL_COURSES.length} course cards to ${out}`);
