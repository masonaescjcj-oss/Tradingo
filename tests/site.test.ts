import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { ALL_COURSES } from '../src/content';
import { TOOLS } from '../src/lib/drawings';
import { fa } from '../src/utils/format';

const SITE = join(__dirname, '..', 'site');
const PAGES = { fa: join(SITE, 'index.html'), en: join(SITE, 'en', 'index.html') };
const read = (p: string) => readFileSync(p, 'utf8');

const units = ALL_COURSES.reduce((n, c) => n + c.units.length, 0);
const lessonsOf = (c: (typeof ALL_COURSES)[number]) => c.units.reduce((n, u) => n + u.lessons.length, 0);
const lessons = ALL_COURSES.reduce((n, c) => n + lessonsOf(c), 0);

describe('landing pages', () => {
  it('show the real course, lesson and tool counts', () => {
    const faPage = read(PAGES.fa);
    for (const s of [`<b>${fa(ALL_COURSES.length)}</b> دوره`, `<b>${fa(lessons)}</b> درس کوتاه`, `<b>${fa(TOOLS.length)}</b> ابزار رسم`, `${fa(units)} واحد و ${fa(lessons)} درس`]) {
      assert.ok(faPage.includes(s), `fa page is missing «${s}»`);
    }
    const enPage = read(PAGES.en);
    for (const s of [`<b>${ALL_COURSES.length}</b> courses`, `<b>${lessons}</b> short lessons`, `<b>${TOOLS.length}</b> drawing tools`, `${units} units and ${lessons} lessons`]) {
      assert.ok(enPage.includes(s), `en page is missing "${s}"`);
    }
  });

  it('list every course with its unit and lesson counts', () => {
    const faPage = read(PAGES.fa);
    const enRows = [...read(PAGES.en).matchAll(/<b>(\d+)<\/b> units<\/span><span class="stat"><b>(\d+)<\/b> lessons/g)].map((m) => [+m[1], +m[2]]);
    assert.deepEqual(enRows, ALL_COURSES.map((c) => [c.units.length, lessonsOf(c)]));
    for (const c of ALL_COURSES) {
      const row = new RegExp(`<h3>${c.title}</h3>.*?<b>([^<]+)</b> واحد</span><span class="stat"><b>([^<]+)</b> درس`).exec(faPage);
      assert.ok(row, `fa page has no row for ${c.title}`);
      assert.deepEqual([row[1], row[2]], [fa(c.units.length), fa(lessonsOf(c))], c.title);
    }
  });

  it('point at files that exist and link the two languages', () => {
    for (const [lang, page] of Object.entries(PAGES)) {
      const html = read(page);
      const refs = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((r) => !/^(https?:|mailto:)/.test(r));
      const fonts = [...html.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
      for (const ref of [...refs, ...fonts]) {
        const file = join(dirname(page), ref.endsWith('/') ? `${ref}index.html` : ref);
        assert.ok(existsSync(file), `${lang}: ${ref} does not exist`);
      }
      assert.ok(html.includes('<link rel="alternate" hreflang="fa" href="https://chartoon.net/">'));
      assert.ok(html.includes('<link rel="alternate" hreflang="en" href="https://chartoon.net/en/">'));
      for (const json of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(json[1]);
    }
  });
});
