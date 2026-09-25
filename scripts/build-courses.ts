/**
 * Writes the course pages of the website from the courses the app teaches, so the two never
 * drift apart: a hub listing every course (site/courses) and a page per course with what it
 * teaches, its units and every lesson title (site/courses/<id>). The Persian pages come from
 * src/content/courses; the English ones (site/en/courses) from the same courses through the
 * app's English overlays (src/content/i18n), with the app's language set to English so its
 * labels and digits follow. It also writes site/sitemap.xml, which lists every page of the site
 * with its other-language version.
 *
 *   npx tsx scripts/build-courses.ts
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { LEVEL_LABEL, isQuestion, type Course } from '../src/content';
import { ALL_COURSES } from '../src/content/courses';
import { localizeCourse } from '../src/content/i18n';
import { ACCOUNT_DELETION, LEGAL } from '../src/content/legal';
import { LEGAL_EN } from '../src/content/legal.en';
import { t } from '../src/i18n';
import { getLang, setLang, type Lang } from '../src/i18n/lang';
import { fa } from '../src/utils/format';

const ROOT = resolve(__dirname, '..');
const ORIGIN = 'https://chartoon.net/';
const APP = 'https://app.chartoon.net/';

/** When the site's pages last changed, for the sitemap. */
export const LASTMOD = '2026-09-25';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON-LD for a <script> block, with `<` escaped so no text can end the block early. */
const jsonLd = (data: unknown) => JSON.stringify(data, null, 2).replace(/</g, '\\u003c');

/** Runs `render` with the app's language set to `lang`, so t() and fa() answer in that language. */
function inLang<T>(lang: Lang, render: () => T): T {
  const before = getLang();
  setLang(lang);
  try {
    return render();
  } finally {
    setLang(before);
  }
}

/** The courses in a language: the Persian source, or the same courses with their English overlays. */
export const coursesIn = (lang: Lang): Course[] => (lang === 'en' ? ALL_COURSES.map((c) => localizeCourse(c)) : ALL_COURSES);

/** A page's address; `path` is the same in both languages ('courses/basics/'), English sits under /en/. */
export const pageUrl = (lang: Lang, path: string) => `${ORIGIN}${lang === 'en' ? 'en/' : ''}${path}`;

const lessonsOf = (c: Course) => c.units.reduce((n, u) => n + u.lessons.length, 0);
const questionsOf = (c: Course) => c.units.reduce((n, u) => n + u.lessons.reduce((m, l) => m + l.steps.filter(isQuestion).length, 0), 0);
const LEVEL_CLASS = { beginner: 'b', intermediate: 'i', advanced: 'a' } as const;

/** Per language: the page chrome and copy. Course text itself always comes from the app. */
const UI = {
  fa: {
    dir: 'rtl',
    locale: 'fa_IR',
    altLocale: 'en_US',
    brand: 'چارتون',
    brandLabel: 'چارتون، صفحه‌ی اصلی',
    skip: 'رفتن به محتوا',
    app: 'ورود به اپ',
    start: 'شروع رایگان',
    home: 'صفحه‌ی اصلی',
    courses: 'دوره‌ها',
    crumbs: 'مسیر صفحه',
    links: 'پیوندها',
    copyright: '© ۱۴۰۵ چارتون',
    other: { lang: 'en', short: 'EN', label: 'English' },
    legal: LEGAL,
    ogImage: 'og-fa.png',
    ogAlt: 'شمعک، شخصیت چارتون، کنار نمودار شمعی صعودی',
    sep: '؛ ',
    words: { unit: ['واحد', 'واحد'], lesson: ['درس', 'درس'], question: ['سؤال', 'سؤال'] },
    disclaimer:
      'چارتون فقط آموزشیه: سیگنال یا توصیه‌ی سرمایه‌گذاری نمی‌ده و کارگزار نیست. معامله‌ی فارکس، ارز دیجیتال، طلا و قراردادهای اهرمی ریسک بالایی داره و ممکنه کل سرمایه‌ت رو از دست بدی.',
    pitch:
      'روزی پنج دقیقه با شمعک: درس‌های کوتاه با نمودار واقعی، تمرین با ۱۰٬۰۰۰ دلار پول مجازی و قیمت زنده، و دوئل با دوستات. بدون نصب، روی مرورگر گوشی یا کامپیوتر؛ اپ اندروید هم به‌زودی میاد.',
    hub: {
      title: 'دوره‌های آموزش ترید رایگان: فارکس، طلا، کریپتو و تحلیل تکنیکال | چارتون',
      ogTitle: 'دوره‌های آموزش ترید | چارتون',
      description: (courses: number, lessons: number) =>
        `همه‌ی دوره‌های آموزش ترید چارتون: ${fa(courses)} دوره‌ی رایگان و ${fa(lessons)} درس کوتاه فارکس، طلا، کریپتو، تحلیل تکنیکال، اندیکاتورها، مدیریت ریسک و تحلیل پیشرفته، با سرفصل کامل هر دوره.`,
      eyebrow: 'از صفر تا تحلیل پیشرفته',
      h1: 'دوره‌های آموزش ترید',
      lede: (courses: number, units: number, lessons: number) =>
        `${fa(courses)} دوره، ${fa(units)} واحد و ${fa(lessons)} درس کوتاه: از «بازار مالی چیه؟» تا پرایس اکشن، اسمارت مانی و الگوهای هارمونیک. هر دوره رو باز کن تا ببینی توش چی یاد می‌گیری.`,
      cta: 'اولین درست رو همین امروز بزن',
    },
    course: {
      title: (c: Course) => `آموزش ${c.title}: ${c.subtitle} | چارتون`,
      ogTitle: (c: Course) => `آموزش ${c.title} | چارتون`,
      description: (c: Course) => `${c.description} ${fa(c.units.length)} واحد و ${fa(lessonsOf(c))} درس کوتاه با نمودار واقعی، رایگان توی چارتون.`,
      eyebrow: 'دوره‌ی رایگان آموزش ترید',
      outlineLink: 'سرفصل‌ها رو ببین',
      outline: 'سرفصل‌ها و درس‌ها',
      unit: 'واحد',
      others: 'دوره‌های دیگه',
      cta: (c: Course) => `${c.title} رو همین امروز شروع کن`,
    },
  },
  en: {
    dir: 'ltr',
    locale: 'en_US',
    altLocale: 'fa_IR',
    brand: 'Chartoon',
    brandLabel: 'Chartoon home',
    skip: 'Skip to content',
    app: 'Open the app',
    start: 'Start free',
    home: 'Home',
    courses: 'Courses',
    crumbs: 'Breadcrumb',
    links: 'Links',
    copyright: '© 2026 Chartoon',
    other: { lang: 'fa', short: 'فا', label: 'فارسی' },
    legal: LEGAL_EN,
    ogImage: 'og-en.png',
    ogAlt: 'Shamak, the Chartoon mascot, next to a rising candlestick chart',
    sep: '; ',
    words: { unit: ['unit', 'units'], lesson: ['lesson', 'lessons'], question: ['question', 'questions'] },
    disclaimer:
      'Chartoon is for education only: it doesn’t give signals or investment advice, and it isn’t a broker. Trading forex, crypto, gold and leveraged products is high risk and you could lose all of your capital.',
    pitch:
      'Five minutes a day with Shamak: short lessons on real charts, practice with $10,000 of virtual money at live prices, and duels with your friends. Nothing to install: it runs in your phone or computer browser, and the Android app is coming soon.',
    hub: {
      title: 'Free trading courses: forex, gold, crypto and technical analysis | Chartoon',
      ogTitle: 'Trading courses | Chartoon',
      description: (courses: number, lessons: number) =>
        `Every Chartoon trading course: ${courses} free courses and ${lessons} short lessons on forex, gold, crypto, technical analysis, indicators, risk management and advanced analysis, with the full outline of each.`,
      eyebrow: 'From zero to advanced analysis',
      h1: 'Trading courses',
      lede: (courses: number, units: number, lessons: number) =>
        `${courses} courses, ${units} units and ${lessons} short lessons: from “what’s a financial market?” to price action, smart money and harmonic patterns. Open a course to see what you’ll learn.`,
      cta: 'Take your first lesson today',
    },
    course: {
      title: (c: Course) => `${c.title} course: ${c.subtitle} | Chartoon`,
      ogTitle: (c: Course) => `${c.title} course | Chartoon`,
      description: (c: Course) => `${c.description} ${c.units.length} units and ${lessonsOf(c)} short lessons on real charts, free in Chartoon.`,
      eyebrow: 'Free trading course',
      outlineLink: 'See the outline',
      outline: 'Units and lessons',
      unit: 'Unit',
      others: 'More courses',
      cta: (c: Course) => `Start ${c.title} today`,
    },
  },
};

/** "12 lessons" in the page's language, the number in bold unless `plain` (call inside inLang). */
function count(lang: Lang, n: number, word: keyof (typeof UI)['fa']['words'], plain = false): string {
  const [one, many] = UI[lang].words[word];
  return `${plain ? fa(n) : `<b>${fa(n)}</b>`} ${n === 1 ? one : many}`;
}

/** Where things are from a page: its language's home, the site root (for assets) and the other language's page. */
function paths(lang: Lang, path: string) {
  const home = '../'.repeat(path.split('/').filter(Boolean).length);
  const root = lang === 'en' ? `${home}../` : home;
  return { home, root, other: lang === 'fa' ? `${root}en/${path}` : `${root}${path}` };
}

function badge(c: Course): string {
  if (c.badge.kind === 'text') return escape(c.badge.text);
  return `<svg><use href="#${c.badge.glyph === 'hammer' ? 'g-hammer' : 'g-bull'}"/></svg>`;
}

const colors = (c: { color: string; edge: string; ink: string }) => `--c:${c.color}; --edge:${c.edge}; --ink:${c.ink}`;
const level = (c: Course) => `<span class="lvl ${LEVEL_CLASS[c.level]}">${escape(t(LEVEL_LABEL[c.level]))}</span>`;

const org = (lang: Lang) => ({ '@type': 'Organization', '@id': `${ORIGIN}#org`, name: UI[lang].brand, url: ORIGIN });

function breadcrumbs(lang: Lang, trail: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: pageUrl(lang, path) })),
  };
}

type Frame = {
  lang: Lang;
  /** The page's path below its language's home, e.g. 'courses/basics/'. */
  path: string;
  title: string;
  ogTitle: string;
  description: string;
  graph: object[];
  /** Breadcrumb trail as [name, path]; the last one is this page. */
  trail: [string, string][];
  body: string;
  /** Heading of the closing call to action. */
  cta: string;
};

function page(f: Frame): string {
  const ui = UI[f.lang];
  const { home, root, other } = paths(f.lang, f.path);
  const url = pageUrl(f.lang, f.path);
  const og = `${ORIGIN}assets/${ui.ogImage}`;
  const crumbs = f.trail
    .map(([name, path], i) => (i < f.trail.length - 1 ? `<li><a href="${home}${path}">${escape(name)}</a></li>` : `<li aria-current="page">${escape(name)}</li>`))
    .join('');
  return `<!doctype html>
<html lang="${f.lang}" dir="${ui.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escape(f.title)}</title>
<meta name="description" content="${escape(f.description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="fa" href="${pageUrl('fa', f.path)}">
<link rel="alternate" hreflang="en" href="${pageUrl('en', f.path)}">
<link rel="alternate" hreflang="x-default" href="${pageUrl('fa', f.path)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0E1320">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${ui.brand}">
<meta property="og:locale" content="${ui.locale}">
<meta property="og:locale:alternate" content="${ui.altLocale}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${escape(f.ogTitle)}">
<meta property="og:description" content="${escape(f.description)}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(ui.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(f.ogTitle)}">
<meta name="twitter:description" content="${escape(f.description)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="${root}favicon.ico" sizes="48x48">
<link rel="icon" href="${root}assets/favicon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">
<link rel="preload" href="${root}assets/fonts/lalezar.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}assets/fonts/vazirmatn-400.woff2" as="font" type="font/woff2" crossorigin>
<!-- Generated by scripts/build-courses.ts from the app's courses (src/content); edit them there. -->
<style>
${css(root)}
</style>
<script type="application/ld+json">
${jsonLd({ '@context': 'https://schema.org', '@graph': f.graph })}
</script>
</head>
<body>
${SYMBOLS}
<a class="skip" href="#main">${ui.skip}</a>

<header class="top">
  <div class="wrap">
    <a class="brand" href="${home}" aria-label="${ui.brandLabel}"><svg aria-hidden="true"><use href="#sh-happy"/></svg>${ui.brand}</a>
    <a class="lang" href="${other}" hreflang="${ui.other.lang}" lang="${ui.other.lang}">${ui.other.short}</a>
    <a class="btn small" href="${APP}">${ui.app}</a>
  </div>
</header>

<main id="main" class="wrap">
  <nav class="crumbs" aria-label="${ui.crumbs}"><ol>${crumbs}</ol></nav>
${f.body}
  <section class="block final" aria-labelledby="cta">
    <div>
      <h2 id="cta">${escape(f.cta)}</h2>
      <p>${escape(ui.pitch)}</p>
      <a class="btn" href="${APP}">${ui.start}</a>
    </div>
    <svg viewBox="0 0 140 172" aria-hidden="true"><use href="#sh-party"/></svg>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <p>${escape(ui.disclaimer)}</p>
    <nav aria-label="${ui.links}">
      <a href="${home}">${ui.home}</a>
      <a href="${home}courses/">${ui.courses}</a>
      <a href="${home}privacy/">${escape(ui.legal.privacy.title)}</a>
      <a href="${home}terms/">${escape(ui.legal.terms.title)}</a>
      <a href="${other}" hreflang="${ui.other.lang}" lang="${ui.other.lang}">${ui.other.label}</a>
      <span>${ui.copyright}</span>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

/** The list of every course, site/courses (Persian) or site/en/courses (English). */
export function hubPage(lang: Lang): string {
  return inLang(lang, () => {
    const ui = UI[lang];
    const courses = coursesIn(lang);
    const units = courses.reduce((n, c) => n + c.units.length, 0);
    const lessons = courses.reduce((n, c) => n + lessonsOf(c), 0);
    const path = 'courses/';
    const { home } = paths(lang, path);
    const cards = courses
      .map(
        (c) => `    <li class="card" style="${colors(c)}">
      <span class="tick" aria-hidden="true">${badge(c)}</span>
      <div>
        <h2><a href="${home}courses/${c.id}/">${escape(c.title)}</a></h2>
        <p class="tag">${escape(c.subtitle)}</p>
      </div>
      <p class="about">${escape(c.description)}</p>
      <div class="meta">${level(c)}<span class="stat">${count(lang, c.units.length, 'unit')}</span><span class="stat">${count(lang, lessonsOf(c), 'lesson')}</span></div>
    </li>`,
      )
      .join('\n');
    const trail: [string, string][] = [
      [ui.brand, ''],
      [ui.courses, path],
    ];
    return page({
      lang,
      path,
      title: ui.hub.title,
      ogTitle: ui.hub.ogTitle,
      description: ui.hub.description(courses.length, lessons),
      trail,
      cta: ui.hub.cta,
      graph: [
        {
          '@type': 'ItemList',
          '@id': `${pageUrl(lang, path)}#courses`,
          name: ui.hub.h1,
          numberOfItems: courses.length,
          itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: pageUrl(lang, `courses/${c.id}/`) })),
        },
        breadcrumbs(lang, trail),
      ],
      body: `  <div class="intro">
    <p class="eyebrow">${escape(ui.hub.eyebrow)}</p>
    <h1>${escape(ui.hub.h1)}</h1>
    <p class="lede">${escape(ui.hub.lede(courses.length, units, lessons))}</p>
  </div>
  <ul class="cards">
${cards}
  </ul>`,
    });
  });
}

/** One course's page: what it teaches, every unit with its lessons, and the way into the app. */
export function coursePage(id: string, lang: Lang): string {
  return inLang(lang, () => {
    const ui = UI[lang];
    const courses = coursesIn(lang);
    const c = courses.find((x) => x.id === id);
    if (!c) throw new Error(`no course ${id}`);
    const path = `courses/${c.id}/`;
    const url = pageUrl(lang, path);
    const { home } = paths(lang, path);
    const learn = c.units.map((u) => `      <li><a href="#u-${u.id}">${escape(u.title)}</a></li>`).join('\n');
    const units = c.units
      .map(
        (u, i) => `      <li class="unit" id="u-${u.id}" style="${colors(u)}">
        <h3><span class="num"><span class="vh">${ui.course.unit} </span>${fa(i + 1)}<span class="vh">:</span></span> ${escape(u.title)}</h3>
        <ol class="lessons">
${u.lessons.map((l) => `          <li>${escape(l.title)}</li>`).join('\n')}
        </ol>
      </li>`,
      )
      .join('\n');
    const others = courses
      .filter((x) => x.id !== c.id)
      .map(
        (x) =>
          `      <li style="${colors(x)}"><span class="tick" aria-hidden="true">${badge(x)}</span><div><a href="${home}courses/${x.id}/">${escape(x.title)}</a><span class="info">${escape(t(LEVEL_LABEL[x.level]))} · ${count(lang, lessonsOf(x), 'lesson', true)}</span></div></li>`,
      )
      .join('\n');
    const trail: [string, string][] = [
      [ui.brand, ''],
      [ui.courses, 'courses/'],
      [c.title, path],
    ];
    const course = {
      '@type': 'Course',
      '@id': `${url}#course`,
      name: c.title,
      description: c.description,
      url,
      image: `${ORIGIN}assets/${ui.ogImage}`,
      inLanguage: lang,
      isAccessibleForFree: true,
      educationalLevel: t(LEVEL_LABEL[c.level]),
      provider: org(lang),
      offers: { '@type': 'Offer', category: 'Free', price: '0', priceCurrency: 'USD' },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online' },
      syllabusSections: c.units.map((u) => ({ '@type': 'Syllabus', name: u.title, description: u.lessons.map((l) => l.title).join(ui.sep) })),
    };
    return page({
      lang,
      path,
      title: ui.course.title(c),
      ogTitle: ui.course.ogTitle(c),
      description: ui.course.description(c),
      trail,
      cta: ui.course.cta(c),
      graph: [course, breadcrumbs(lang, trail)],
      body: `  <div class="hero" style="${colors(c)}">
    <span class="tick" aria-hidden="true">${badge(c)}</span>
    <div>
      <p class="eyebrow">${escape(ui.course.eyebrow)}</p>
      <h1>${escape(c.title)}</h1>
      <p class="sub">${escape(c.subtitle)}</p>
    </div>
  </div>
  <ul class="stats">
    <li>${level(c)}</li>
    <li class="stat">${count(lang, c.units.length, 'unit')}</li>
    <li class="stat">${count(lang, lessonsOf(c), 'lesson')}</li>
    <li class="stat">${count(lang, questionsOf(c), 'question')}</li>
  </ul>
  <p class="desc">${escape(c.description)}</p>
  <div class="ctas">
    <a class="btn" href="${APP}">${ui.start}</a>
    <a class="btn alt" href="#outline">${ui.course.outlineLink}</a>
  </div>

  <section class="block" aria-labelledby="learn">
    <h2 id="learn">${escape(t('توی این دوره چی یاد می‌گیری؟'))}</h2>
    <ul class="learn">
${learn}
    </ul>
  </section>

  <section class="block" aria-labelledby="outline">
    <h2 id="outline">${escape(ui.course.outline)}</h2>
    <ol class="units">
${units}
    </ol>
  </section>

  <section class="block" aria-labelledby="more">
    <h2 id="more">${escape(ui.course.others)}</h2>
    <ul class="others">
${others}
    </ul>
  </section>
`,
    });
  });
}

/** Every course page by its path in site/: the hub and one page per course, in both languages. */
export function courseFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const lang of ['fa', 'en'] as const) {
    const base = lang === 'en' ? 'en/' : '';
    files[`${base}courses/index.html`] = hubPage(lang);
    for (const c of ALL_COURSES) files[`${base}courses/${c.id}/index.html`] = coursePage(c.id, lang);
  }
  return files;
}

/** Every page of the site by its path below its language's home; each is there in both languages. */
export function sitePaths(): string[] {
  return ['', 'courses/', ...ALL_COURSES.map((c) => `courses/${c.id}/`), ...Object.values(LEGAL).map((d) => `${d.id}/`), `${ACCOUNT_DELETION.id}/`];
}

export function sitemap(): string {
  const urls = sitePaths().flatMap((path) =>
    (['fa', 'en'] as const).map(
      (lang) => `  <url>
    <loc>${pageUrl(lang, path)}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <xhtml:link rel="alternate" hreflang="fa" href="${pageUrl('fa', path)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl('en', path)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('fa', path)}"/>
  </url>`,
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

export function writeCoursePages(siteDir = join(ROOT, 'site')) {
  // A course that's no longer in the app loses its page too.
  const ids = new Set(ALL_COURSES.map((c) => c.id));
  for (const base of ['courses', join('en', 'courses')]) {
    const dir = join(siteDir, base);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !ids.has(entry.name)) rmSync(join(dir, entry.name), { recursive: true });
    }
  }
  const files = { ...courseFiles(), 'sitemap.xml': sitemap() };
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(siteDir, file)), { recursive: true });
    writeFileSync(join(siteDir, file), text);
  }
  return Object.keys(files).map((f) => `site/${f}`);
}

/** The mascot and the course glyphs, the same drawings as the landing pages. */
const SYMBOLS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="sh-happy" viewBox="0 0 140 172"><ellipse cx="70" cy="163" rx="36" ry="6" fill="#000" opacity="0.3"/><path d="M70 6 V34" stroke="#0B3D24" stroke-width="7" stroke-linecap="round"/><path d="M70 128 V156" stroke="#0B3D24" stroke-width="7" stroke-linecap="round"/><rect x="30" y="30" width="80" height="100" rx="24" fill="#2BD47D" stroke="#0B3D24" stroke-width="4"/><rect x="40" y="42" width="11" height="40" rx="5.5" fill="#fff" opacity="0.35"/><path d="M32 92 Q16 96 14 112 M108 88 Q126 80 126 60" stroke="#0B3D24" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="55" cy="72" r="12" fill="#fff" stroke="#0B3D24" stroke-width="3"/><circle cx="85" cy="72" r="12" fill="#fff" stroke="#0B3D24" stroke-width="3"/><circle cx="57" cy="73" r="6" fill="#0E1320"/><circle cx="87" cy="73" r="6" fill="#0E1320"/><circle cx="59" cy="71" r="2" fill="#fff"/><circle cx="89" cy="71" r="2" fill="#fff"/><ellipse cx="44" cy="93" rx="7" ry="4" fill="#FF7A93" opacity="0.55"/><ellipse cx="96" cy="93" rx="7" ry="4" fill="#FF7A93" opacity="0.55"/><path d="M58 96 Q70 108 82 96" stroke="#0B3D24" stroke-width="4" stroke-linecap="round" fill="none"/></symbol>
  <symbol id="sh-party" viewBox="0 0 140 172"><ellipse cx="70" cy="163" rx="36" ry="6" fill="#000" opacity="0.3"/><g fill="#FFC53D"><path d="M18 26 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path d="M122 18 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4z"/><path d="M130 100 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/><path d="M9 104 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/></g><path d="M70 6 V34" stroke="#4A3300" stroke-width="7" stroke-linecap="round"/><path d="M70 128 V156" stroke="#4A3300" stroke-width="7" stroke-linecap="round"/><rect x="30" y="30" width="80" height="100" rx="24" fill="#FFC53D" stroke="#4A3300" stroke-width="4"/><rect x="40" y="42" width="11" height="40" rx="5.5" fill="#fff" opacity="0.35"/><path d="M32 84 Q12 72 16 46 M108 84 Q128 72 124 46" stroke="#4A3300" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="55" cy="72" r="12" fill="#fff" stroke="#4A3300" stroke-width="3"/><circle cx="85" cy="72" r="12" fill="#fff" stroke="#4A3300" stroke-width="3"/><circle cx="56" cy="72" r="6" fill="#0E1320"/><circle cx="86" cy="72" r="6" fill="#0E1320"/><circle cx="58" cy="70" r="2" fill="#fff"/><circle cx="88" cy="70" r="2" fill="#fff"/><ellipse cx="44" cy="93" rx="7" ry="4" fill="#FF7A93" opacity="0.6"/><ellipse cx="96" cy="93" rx="7" ry="4" fill="#FF7A93" opacity="0.6"/><path d="M56 94 Q70 118 84 94 Z" fill="#4A3300"/></symbol>
  <symbol id="g-bull" viewBox="0 0 22 30"><path d="M11 1v28" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="4" y="7" width="14" height="15" rx="3" fill="currentColor"/></symbol>
  <symbol id="g-hammer" viewBox="0 0 22 30"><path d="M11 3v25" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="4" y="4" width="14" height="9" rx="3" fill="currentColor"/></symbol>
</svg>`;

/** The site's look (fonts and colour tokens from the landing pages), with `root` leading to the site root. */
function css(root: string): string {
  return `@font-face { font-family: "Vazirmatn"; src: url("${root}assets/fonts/vazirmatn-400.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Vazirmatn"; src: url("${root}assets/fonts/vazirmatn-700.woff2") format("woff2"); font-weight: 700; font-display: swap; }
@font-face { font-family: "Vazirmatn"; src: url("${root}assets/fonts/vazirmatn-900.woff2") format("woff2"); font-weight: 900; font-display: swap; }
@font-face { font-family: "Lalezar"; src: url("${root}assets/fonts/lalezar.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "JetBrains Mono"; src: url("${root}assets/fonts/jetbrains-mono-700.woff2") format("woff2"); font-weight: 700; font-display: swap; }
:root {
  color-scheme: dark;
  --bg: #0E1320;
  --surface: #171F31;
  --raised: #1F2940;
  --raised-edge: #151C2E;
  --line: #2A3550;
  --line-soft: #1C2438;
  --text: #F1F4F9;
  --text2: #AEB8CC;
  --text3: #8792AB;
  --bull: #2BD47D;
  --bull-edge: #179457;
  --bull-ink: #04301A;
  --bull-text: #5BE39A;
  --gold: #FFC53D;
  --gold-card: #1F1A10;
  --gold-line: #5A4418;
  --sky: #5AB0FF;
  --violet: #A78BFA;
  --display: "Lalezar", "Vazirmatn", Tahoma, sans-serif;
  --body: "Vazirmatn", Tahoma, "Segoe UI", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --gutter: clamp(16px, 4vw, 32px);
}
* { box-sizing: border-box; }
html { background: var(--bg); scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 400 1.0625rem/1.95 var(--body); overflow-x: hidden; overflow-x: clip; }
svg { max-width: 100%; }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--sky); outline-offset: 3px; border-radius: 10px; }
.wrap { width: 100%; max-width: 960px; margin-inline: auto; padding-inline: var(--gutter); }
.vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.skip { position: absolute; inset-inline-start: 12px; top: -60px; z-index: 50; padding: 8px 14px; border-radius: 10px; background: var(--text); color: var(--bg); font-weight: 900; text-decoration: none; }
.skip:focus { top: 12px; }

/* Header */
.top { border-bottom: 1px solid var(--line-soft); }
.top .wrap { display: flex; align-items: center; gap: 14px; min-height: 68px; }
.brand { display: inline-flex; align-items: center; gap: 10px; margin-inline-end: auto; text-decoration: none; font: 400 1.85rem/1 var(--display); color: var(--text); padding-top: 4px; }
.brand svg { width: 28px; height: 34px; flex: none; margin-top: -6px; }
.lang { text-decoration: none; font: 700 0.82rem/1 var(--mono); color: var(--text2); border: 1.5px solid var(--line); border-radius: 10px; padding: 8px 10px; }
.lang:hover { color: var(--text); border-color: var(--text3); }

/* 3D buttons, like the app's */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; padding: 0 28px; border-radius: 16px; border: 0; font: 900 1.12rem/1 var(--body); text-decoration: none; background: var(--bull); color: var(--bull-ink); box-shadow: 0 5px 0 var(--bull-edge); transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.15s ease; }
.btn:hover { filter: brightness(1.07); }
.btn:active { transform: translateY(5px); box-shadow: 0 0 0 var(--bull-edge); }
.btn.alt { background: var(--raised); color: var(--text); box-shadow: 0 5px 0 var(--raised-edge), inset 0 0 0 2px var(--line); }
.btn.alt:active { box-shadow: 0 0 0 var(--raised-edge), inset 0 0 0 2px var(--line); }
.btn.small { min-height: 42px; padding: 0 18px; border-radius: 12px; font-size: 0.98rem; box-shadow: 0 4px 0 var(--bull-edge); }
.btn.small:active { transform: translateY(4px); box-shadow: 0 0 0 var(--bull-edge); }

main { padding-bottom: clamp(56px, 8vw, 96px); }
.crumbs ol { display: flex; flex-wrap: wrap; gap: 2px 10px; margin: 22px 0 0; padding: 0; list-style: none; color: var(--text3); font-size: 0.92rem; font-weight: 700; }
.crumbs li + li::before { content: "/"; margin-inline-end: 10px; color: var(--line); }
.crumbs a { color: var(--text2); text-decoration: none; }
.crumbs a:hover { color: var(--text); }
h1 { margin: 2px 0 4px; font: 400 clamp(2.2rem, 6.4vw, 3.6rem)/1.25 var(--display); text-wrap: balance; overflow-wrap: anywhere; }
h2 { margin: 0 0 18px; font: 400 clamp(1.9rem, 4.4vw, 2.6rem)/1.35 var(--display); text-wrap: balance; }
.eyebrow { margin: 0; font-weight: 900; font-size: 0.95rem; }
.tick { display: grid; place-items: center; flex: none; width: 58px; height: 46px; border-radius: 13px; background: var(--c); color: var(--ink); box-shadow: 0 4px 0 var(--edge); font: 700 0.95rem/1 var(--mono); direction: ltr; }
.tick svg { width: 22px; height: 30px; }
.stat { display: flex; align-items: baseline; gap: 6px; color: var(--text3); font-size: 0.9rem; font-weight: 700; }
.stat b { font: 400 1.55rem/1 var(--display); color: var(--text); }
.lvl { justify-self: start; padding: 3px 12px; border-radius: 999px; border: 1.5px solid currentColor; font-size: 0.85rem; font-weight: 900; }
.lvl.b { color: var(--bull-text); }
.lvl.i { color: var(--gold); }
.lvl.a { color: var(--violet); }

/* Course hub */
.intro { margin-top: clamp(20px, 4vw, 40px); }
.intro .eyebrow { display: inline-block; padding: 3px 14px; border-radius: 999px; color: var(--bull-text); background: rgba(43, 212, 125, 0.1); border: 1px solid rgba(43, 212, 125, 0.28); font-weight: 700; }
.intro h1 { margin-top: 14px; }
.lede { margin: 0; max-width: 40em; color: var(--text2); font-size: clamp(1.05rem, 1.5vw, 1.18rem); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 16px; margin: 32px 0 0; padding: 0; list-style: none; }
.card { position: relative; display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 12px 16px; align-content: start; padding: 20px; border-radius: 24px; border: 1.5px solid var(--line); background: var(--surface); }
.card:hover { border-color: var(--text3); }
.card h2 { margin: 0; font: 900 1.25rem/1.5 var(--body); }
.card h2 a { text-decoration: none; }
.card h2 a::after { content: ""; position: absolute; inset: 0; border-radius: 24px; }
.card h2 a:focus-visible, .others a:focus-visible { outline: 0; }
.card h2 a:focus-visible::after, .others a:focus-visible::after { outline: 3px solid var(--sky); outline-offset: 2px; }
.tag { margin: 2px 0 0; color: var(--text2); font-size: 0.95rem; font-weight: 700; line-height: 1.7; }
.about { grid-column: 1 / -1; margin: 0; color: var(--text2); font-size: 0.95rem; line-height: 1.85; }
.meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 18px; }

/* Course page */
.hero { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px 22px; align-items: center; margin-top: 18px; padding: clamp(20px, 4vw, 34px); border-radius: 28px; background: var(--c); color: var(--ink); box-shadow: 0 6px 0 var(--edge); }
.hero .tick { width: clamp(64px, 12vw, 92px); height: clamp(64px, 12vw, 92px); border-radius: 22px; background: rgba(255, 255, 255, 0.28); box-shadow: 0 5px 0 rgba(0, 0, 0, 0.18); color: var(--ink); font-size: clamp(1.05rem, 2.6vw, 1.5rem); }
.hero .tick svg { width: 40%; height: 52%; }
.hero .eyebrow { opacity: 0.8; }
.sub { margin: 0; font-weight: 700; font-size: clamp(1rem, 2vw, 1.12rem); line-height: 1.7; opacity: 0.88; }
.stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 26px 0 0; padding: 0; list-style: none; }
.stats li { display: flex; align-items: center; padding: 8px 16px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); }
.stats .stat { align-items: baseline; }
.desc { margin: 22px 0 0; max-width: 44em; color: var(--text2); font-size: clamp(1.05rem, 1.6vw, 1.15rem); }
.ctas { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 28px; }
.block { margin-top: clamp(52px, 8vw, 80px); }
.learn { display: flex; flex-wrap: wrap; gap: 10px; margin: 0; padding: 0; list-style: none; }
.learn a { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--surface); text-decoration: none; font-weight: 700; line-height: 1.6; }
.learn a:hover { border-color: var(--text3); }
.learn a::before { content: ""; flex: none; width: 12px; height: 22px; border-radius: 3px; background: linear-gradient(var(--bull), var(--bull)) 50% 0 / 2px 100% no-repeat, linear-gradient(var(--bull), var(--bull)) 50% 50% / 10px 14px no-repeat; }
.units { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); gap: 14px; margin: 0; padding: 0; list-style: none; }
.unit { padding: 18px clamp(16px, 3vw, 24px); border-radius: 20px; border: 1.5px solid var(--line); background: var(--surface); scroll-margin-top: 16px; }
.unit h3 { display: flex; align-items: center; gap: 12px; margin: 0 0 10px; font: 900 1.15rem/1.5 var(--body); }
.num { flex: none; display: grid; place-items: center; min-width: 34px; height: 34px; padding: 3px 8px 0; border-radius: 11px; background: var(--c); color: var(--ink); box-shadow: 0 3px 0 var(--edge); font: 400 1.2rem/1 var(--display); }
.lessons { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.lessons li { display: flex; align-items: flex-start; gap: 12px; padding-inline-start: 6px; line-height: 1.7; }
.lessons li::before { content: ""; flex: none; width: 16px; height: 16px; margin-top: 0.3em; border-radius: 50%; border: 2px solid var(--line); }
.others { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.others li { position: relative; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 18px; border: 1.5px solid var(--line); background: var(--surface); }
.others li:hover { border-color: var(--text3); }
.others a { font-weight: 900; text-decoration: none; line-height: 1.5; }
.others a::after { content: ""; position: absolute; inset: 0; border-radius: 18px; }
.info { display: block; color: var(--text3); font-size: 0.88rem; font-weight: 700; line-height: 1.6; }

/* Closing call to action */
.final { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: center; padding: clamp(24px, 5vw, 52px); border-radius: 32px; border: 2px solid var(--gold-line); background: radial-gradient(120% 150% at 10% 0%, rgba(255, 197, 61, 0.2), transparent 55%), var(--gold-card); }
.final h2 { margin-bottom: 10px; color: var(--gold); }
.final p { margin: 0 0 24px; max-width: 36em; color: var(--text2); }
.final svg { width: clamp(110px, 16vw, 170px); height: auto; }

/* Footer */
.foot { border-top: 1px solid var(--line-soft); padding-block: 28px calc(28px + env(safe-area-inset-bottom, 0px)); color: var(--text3); font-size: 0.92rem; line-height: 1.9; }
.foot p { margin: 0 0 14px; max-width: 52em; }
.foot nav { display: flex; flex-wrap: wrap; gap: 8px 24px; }
.foot a { color: var(--text2); font-weight: 900; text-decoration: none; }
.foot a:hover { color: var(--text); }

@media (max-width: 640px) {
  .final { grid-template-columns: 1fr; }
  .final svg { order: -1; width: 110px; }
}
@media (max-width: 420px) {
  .brand { font-size: 1.6rem; }
  .top .btn.small { padding: 0 14px; }
  .ctas .btn { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; }
}`;
}

if (require.main === module) {
  console.log(`wrote ${writeCoursePages().join(', ')}`);
}
