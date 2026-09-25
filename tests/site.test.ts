import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { ALL_COURSES } from '../src/content';
import { localizeCourse } from '../src/content/i18n';
import { TOOLS } from '../src/lib/drawings';
import { fa } from '../src/utils/format';

const SITE = join(__dirname, '..', 'site');
const PAGES = { fa: join(SITE, 'index.html'), en: join(SITE, 'en', 'index.html') };
const read = (p: string) => readFileSync(p, 'utf8');

const units = ALL_COURSES.reduce((n, c) => n + c.units.length, 0);
const lessonsOf = (c: (typeof ALL_COURSES)[number]) => c.units.reduce((n, u) => n + u.lessons.length, 0);
const lessons = ALL_COURSES.reduce((n, c) => n + lessonsOf(c), 0);

/** Every HTML file of the site, by its path under site/. */
function htmlFiles(dir = '', out: string[] = []): string[] {
  for (const entry of readdirSync(join(SITE, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory() && !['.vercel', 'assets'].includes(entry.name)) htmlFiles(path, out);
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}
const HTML = htmlFiles();
/** The pages search engines see: everything but the 404 page. */
const INDEXED = HTML.filter((f) => f.endsWith('index.html'));
const urlOf = (file: string) => `https://chartoon.net/${file.replace(/index\.html$/, '')}`;
const fileOf = (url: string) => `${url.replace('https://chartoon.net/', '')}index.html`;
const langOf = (file: string) => (file.startsWith('en/') ? 'en' : 'fa');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const graph = (html: string): Record<string, any>[] => jsonLd(html).flatMap((d) => d['@graph'] ?? [d]);
const alternates = (html: string) => Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]));

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
      const row = new RegExp(`<h3><a href="courses/${c.id}/">${c.title}</a></h3>.*?<b>([^<]+)</b> واحد</span><span class="stat"><b>([^<]+)</b> درس`).exec(faPage);
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

describe('legal pages', () => {
  it('on the site match the text the app shows', async () => {
    const { legalPage } = await import('../scripts/build-legal');
    const { LEGAL } = await import('../src/content/legal');
    for (const doc of Object.values(LEGAL)) {
      assert.ok(doc.sections.length >= 5, doc.id);
      const file = join(SITE, doc.id, 'index.html');
      assert.equal(read(file), legalPage(doc), `${doc.id}: run npx tsx scripts/build-legal.ts`);
      for (const ref of [...read(file).matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((r) => !/^https?:/.test(r))) {
        const target = join(SITE, doc.id, ref.endsWith('/') ? `${ref}index.html` : ref);
        assert.ok(existsSync(target), `${doc.id}: ${ref}`);
      }
    }
  });

  it('include the account deletion guide Google Play links to', async () => {
    const { deletionPage } = await import('../scripts/build-legal');
    const file = join(SITE, 'delete-account', 'index.html');
    assert.equal(read(file), deletionPage(), 'run npx tsx scripts/build-legal.ts');
    assert.ok(read(file).includes('app.chartoon.net') && read(file).includes('lang="en"'));
    for (const doc of ['privacy', 'terms']) assert.ok(read(join(SITE, doc, 'index.html')).includes('href="../delete-account/"'), doc);
    assert.ok(read(join(SITE, 'sitemap.xml')).includes('https://chartoon.net/delete-account/'));
  });

  it('are on the site in English too, linked to their Persian pages', async () => {
    const { deletionPage, legalPage } = await import('../scripts/build-legal');
    const { ACCOUNT_DELETION_EN, LEGAL_EN } = await import('../src/content/legal.en');
    const pages: [string, string][] = [...Object.values(LEGAL_EN).map((doc): [string, string] => [doc.id, legalPage(doc, 'en')]), [ACCOUNT_DELETION_EN.id, deletionPage('en')]];
    for (const [id, html] of pages) {
      const file = join(SITE, 'en', id, 'index.html');
      assert.equal(read(file), html, `en/${id}: run npx tsx scripts/build-legal.ts`);
      assert.ok(html.includes('<html lang="en" dir="ltr">') && !/[\u0600-\u06ff]/.test(html.replace('>فارسی<', '')), `en/${id} has Persian`);
      assert.ok(html.includes(`href="../../${id}/"`), `en/${id} links its Persian page`);
      assert.ok(read(join(SITE, id, 'index.html')).includes(`href="../en/${id}/"`), `${id} links its English page`);
      for (const ref of [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g), ...html.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]).filter((r) => !/^https?:/.test(r))) {
        assert.ok(existsSync(join(SITE, 'en', id, ref.endsWith('/') ? `${ref}index.html` : ref)), `en/${id}: ${ref}`);
      }
      assert.ok(read(join(SITE, 'sitemap.xml')).includes(`https://chartoon.net/en/${id}/`), `sitemap: en/${id}`);
    }
  });

  it('are linked from both landing pages and listed in the sitemap', () => {
    assert.ok(read(PAGES.fa).includes('href="privacy/"') && read(PAGES.fa).includes('href="terms/"'));
    assert.ok(read(PAGES.en).includes('href="privacy/"') && read(PAGES.en).includes('href="terms/"') && read(PAGES.en).includes('href="delete-account/"'));
    const sitemap = read(join(SITE, 'sitemap.xml'));
    assert.ok(sitemap.includes('https://chartoon.net/privacy/') && sitemap.includes('https://chartoon.net/terms/'));
  });
});

describe('course pages', () => {
  it('are exactly what the generator makes from the app’s courses', async () => {
    const { courseFiles } = await import('../scripts/build-courses');
    const files = courseFiles();
    assert.equal(Object.keys(files).length, 2 * (ALL_COURSES.length + 1));
    for (const [file, html] of Object.entries(files)) assert.equal(read(join(SITE, file)), html, `${file}: run npx tsx scripts/build-courses.ts`);
    const onDisk = HTML.filter((f) => /^(en\/)?courses\//.test(f));
    assert.deepEqual(onDisk.sort(), Object.keys(files).sort(), 'a course page on the site that the generator no longer makes');
  });

  it('show every unit and lesson of each course, in Persian and in English', () => {
    for (const [lang, base] of [['fa', ''], ['en', 'en/']] as const) {
      const hub = read(join(SITE, base, 'courses', 'index.html'));
      for (const source of ALL_COURSES) {
        const c = lang === 'en' ? localizeCourse(source) : source;
        const html = read(join(SITE, base, 'courses', c.id, 'index.html'));
        assert.ok(html.includes(`<h1>${esc(c.title)}</h1>`), `${lang}/${c.id}: title`);
        assert.ok(html.includes(esc(c.description)), `${lang}/${c.id}: description`);
        assert.ok(html.includes('href="https://app.chartoon.net/"'), `${lang}/${c.id}: no way into the app`);
        assert.ok(html.lastIndexOf('https://app.chartoon.net/') > html.indexOf('id="more"'), `${lang}/${c.id}: the page should end with the call to action`);
        for (const u of c.units) {
          assert.ok(html.includes(`href="#u-${u.id}">${esc(u.title)}</a>`), `${lang}/${c.id}: ${u.id} missing from what you'll learn`);
          const unit = new RegExp(`<li class="unit" id="u-${u.id}"[\\s\\S]*?</ol>`).exec(html);
          assert.ok(unit, `${lang}/${c.id}: no unit ${u.id}`);
          assert.deepEqual([...unit[0].matchAll(/<li>([^<]*)<\/li>/g)].map((m) => unesc(m[1])), u.lessons.map((l) => l.title), `${lang}/${c.id}: lessons of ${u.id}`);
        }
        assert.ok(hub.includes(`<a href="../courses/${c.id}/">${esc(c.title)}</a>`), `${lang} hub: ${c.id}`);
      }
    }
  });

  it('have course, breadcrumb and list structured data', () => {
    for (const lang of ['fa', 'en'] as const) {
      const base = lang === 'en' ? 'en/' : '';
      for (const c of ALL_COURSES) {
        const nodes = graph(read(join(SITE, base, 'courses', c.id, 'index.html')));
        const course = nodes.find((n) => n['@type'] === 'Course')!;
        assert.ok(course, `${lang}/${c.id}: no Course`);
        assert.equal(course.provider['@id'], 'https://chartoon.net/#org');
        assert.equal(course.inLanguage, lang);
        assert.equal(course.isAccessibleForFree, true);
        assert.ok(course.name && course.description && course.educationalLevel);
        assert.deepEqual([course.offers['@type'], course.offers.price, course.offers.category], ['Offer', '0', 'Free']);
        assert.equal(course.syllabusSections.length, c.units.length);
        const crumbs = nodes.find((n) => n['@type'] === 'BreadcrumbList')!;
        assert.deepEqual(
          crumbs.itemListElement.map((i: { item: string }) => i.item),
          [`https://chartoon.net/${base}`, `https://chartoon.net/${base}courses/`, `https://chartoon.net/${base}courses/${c.id}/`],
        );
      }
      const list = graph(read(join(SITE, base, 'courses', 'index.html'))).find((n) => n['@type'] === 'ItemList')!;
      assert.deepEqual(
        list.itemListElement.map((i: { position: number; url: string }) => [i.position, i.url]),
        ALL_COURSES.map((c, i) => [i + 1, `https://chartoon.net/${base}courses/${c.id}/`]),
      );
    }
  });

  it('are linked from both landing pages and from every legal page', () => {
    for (const page of Object.values(PAGES)) {
      const html = read(page);
      assert.ok(html.includes('href="courses/"'), `${page}: no link to all courses`);
      for (const c of ALL_COURSES) assert.ok(html.includes(`<h3><a href="courses/${c.id}/">`), `${page}: ${c.id} card has no link`);
    }
    for (const file of HTML.filter((f) => /(privacy|terms|delete-account)\/index\.html$/.test(f))) assert.ok(read(join(SITE, file)).includes('href="../courses/"'), file);
  });
});

describe('every page', () => {
  it('links only to files and anchors that exist', () => {
    for (const file of HTML) {
      const html = read(join(SITE, file));
      const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      const refs = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g), ...html.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
      for (const ref of refs) {
        if (/^(https?:|mailto:|data:)/.test(ref)) continue;
        const [path, hash] = ref.split('#');
        if (!path) {
          assert.ok(ids.has(hash), `${file}: nothing has id "${hash}"`);
          continue;
        }
        const target = path.startsWith('/') ? join(SITE, path) : join(SITE, dirname(file), path);
        assert.ok(target.startsWith(SITE), `${file}: ${ref} leaves the site`);
        assert.ok(existsSync(path.endsWith('/') ? join(target, 'index.html') : target), `${file}: ${ref} does not exist`);
      }
    }
  });

  it('has structured data that parses', () => {
    for (const file of INDEXED) assert.doesNotThrow(() => jsonLd(read(join(SITE, file))), file);
    for (const file of INDEXED.filter((f) => !/(privacy|terms|delete-account)\//.test(f))) assert.ok(jsonLd(read(join(SITE, file))).length > 0, `${file}: no JSON-LD`);
  });

  it('has the right language and direction, and one h1 with headings in order', () => {
    for (const file of HTML) {
      const html = read(join(SITE, file));
      assert.ok(html.includes(langOf(file) === 'en' ? '<html lang="en" dir="ltr">' : '<html lang="fa" dir="rtl">'), `${file}: lang/dir`);
      const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      assert.equal(levels.filter((l) => l === 1).length, 1, `${file}: needs exactly one h1`);
      assert.equal(levels[0], 1, `${file}: the first heading should be the h1`);
      levels.forEach((l, i) => assert.ok(i === 0 || l <= levels[i - 1] + 1, `${file}: h${levels[i - 1]} is followed by h${l}`));
    }
  });

  it('points hreflang pairs at each other and names itself canonical', () => {
    for (const file of INDEXED) {
      const html = read(join(SITE, file));
      const lang = langOf(file);
      const other = lang === 'fa' ? 'en' : 'fa';
      assert.equal(/<link rel="canonical" href="([^"]+)">/.exec(html)?.[1], urlOf(file), `${file}: canonical`);
      const alt = alternates(html);
      assert.equal(alt[lang], urlOf(file), `${file}: hreflang ${lang} should be the page itself`);
      assert.equal(alt['x-default'], alt.fa, `${file}: x-default`);
      assert.ok(existsSync(join(SITE, fileOf(alt[other]))), `${file}: its ${other} page ${alt[other]} does not exist`);
      assert.deepEqual(alternates(read(join(SITE, fileOf(alt[other])))), alt, `${file}: its ${other} page does not point back`);
    }
  });

  it('is in the sitemap with its other language', async () => {
    const { LASTMOD, sitemap } = await import('../scripts/build-courses');
    const xml = read(join(SITE, 'sitemap.xml'));
    assert.equal(xml, sitemap(), 'run npx tsx scripts/build-courses.ts');
    const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    const locs = entries.map((e) => /<loc>([^<]+)<\/loc>/.exec(e)![1]);
    assert.deepEqual([...locs].sort(), INDEXED.map(urlOf).sort());
    for (const entry of entries) {
      const loc = /<loc>([^<]+)<\/loc>/.exec(entry)![1];
      assert.ok(entry.includes(`<lastmod>${LASTMOD}</lastmod>`), loc);
      const alt = Object.fromEntries([...entry.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map((m) => [m[1], m[2]]));
      assert.deepEqual(alt, alternates(read(join(SITE, fileOf(loc)))), `sitemap alternates of ${loc}`);
    }
    assert.ok(read(join(SITE, 'robots.txt')).includes('Sitemap: https://chartoon.net/sitemap.xml'));
  });

  it('in English has no Persian but the link to the Persian page', () => {
    for (const file of HTML.filter((f) => langOf(f) === 'en')) {
      const html = read(join(SITE, file)).replace(/<a [^>]*hreflang="fa"[^>]*>[^<]*<\/a>/g, '');
      const hit = /[؀-ۿﭐ-﷿ﹰ-﻿]/.exec(html);
      assert.ok(!hit, `${file} has Persian: «${hit && html.slice(Math.max(0, hit.index - 40), hit.index + 20)}»`);
    }
  });

  it('sizes its images, lazy-loads them and preloads the heading and body fonts', () => {
    for (const file of HTML) {
      const html = read(join(SITE, file));
      for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
        for (const attr of ['width="', 'height="', 'alt="']) assert.ok(img.includes(attr), `${file}: ${img} has no ${attr}`);
        assert.ok(img.includes('loading="lazy"') || img.includes('fetchpriority="high"'), `${file}: ${img} should load lazily`);
      }
      if (file.endsWith('index.html')) {
        for (const font of ['lalezar', 'vazirmatn-400']) assert.match(html, new RegExp(`<link rel="preload" href="[./]*assets/fonts/${font}\\.woff2" as="font" type="font/woff2" crossorigin>`), `${file}: preload ${font}`);
      }
    }
  });

  it('never compares Chartoon to another app', () => {
    const comparison = /duolingo|دولینگو|(?:TradingView|MetaTrader)-style|like (?:TradingView|MetaTrader)|(?:به سبک|مثل) (?:تریدینگ‌ویو|متاتریدر)/i;
    for (const file of HTML) assert.ok(!comparison.test(read(join(SITE, file))), file);
  });
});

describe('landing page facts', () => {
  it('answer the same questions in the FAQ markup as on the page', () => {
    for (const page of Object.values(PAGES)) {
      const html = read(page);
      const shown = [...html.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)].map((m) => [unesc(m[1]), unesc(m[2])]);
      const faq = graph(html).find((n) => n['@type'] === 'FAQPage')!;
      assert.deepEqual(faq.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => [q.name, q.acceptedAnswer.text]), shown, page);
    }
  });

  it('say the app is in English, sign-in is optional and Android is coming soon', () => {
    const en = read(PAGES.en);
    assert.ok(!/Persian, for now|in Persian today|lessons are in Persian|written in Persian/.test(en), 'en page still says the app is Persian-only');
    assert.ok(en.includes('English and Persian') && en.includes('guest') && en.includes('100 countries') && en.includes('Android app is coming soon'));
    const faPage = read(PAGES.fa);
    assert.ok(faPage.includes('فارسی و انگلیسی') && faPage.includes('مهمون') && faPage.includes('۱۰۰ کشور') && faPage.includes('اپ اندروید هم به‌زودی'));
    for (const html of [en, faPage]) {
      assert.ok(!/iOS/.test(html), 'no promise of an iOS app');
      assert.ok(!/play\.google\.com|myket\.ir|cafebazaar\.ir/.test(html), 'the Android app is not public yet: no store links');
    }
  });

  it('show English screenshots on the English page', () => {
    const imgs = read(PAGES.en).match(/<img\b[^>]*>/g) ?? [];
    assert.equal(imgs.length, 6);
    for (const img of imgs) {
      const src = /src="([^"]+)"/.exec(img)![1];
      assert.match(src, /^\.\.\/assets\/shots\/en\/\w+\.webp$/, src);
      assert.ok(!/Persian/.test(img), `${src}: alt text still describes the Persian screen`);
    }
  });
});
