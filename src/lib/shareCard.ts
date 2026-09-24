/**
 * Shareable achievement cards (a streak, a finished unit or course, a simulator
 * challenge, trading stats, overall progress), drawn as one SVG picture. The app shows
 * the SVG as a preview; on the web it is turned into a PNG to share or save.
 */
import { colors } from '@/theme';
import { FA_WEEKDAYS_SHORT } from '@/utils/date';
import { fa, faNum, usd } from '@/utils/format';
import { createRng, hashString } from '@/utils/random';

import { mascotMarkup, type MascotMood } from './mascotArt';

export const CARD_W = 1080;
export const CARD_H = 1350;
export const APP_URL = 'tradingo.vercel.app';
/** Fonts the card uses; the web export embeds them so the PNG looks like the preview. */
export const CARD_FONTS = ['Lalezar_400Regular', 'Vazirmatn_900Black', 'Vazirmatn_700Bold'] as const;

export type CardKind = 'streak' | 'unit' | 'course' | 'challenge' | 'trading' | 'profile';
export type CardStat = { label: string; value: string; ltr?: boolean; color?: string };
export type WeekDot = { label: string; state: 'on' | 'off' | 'frozen'; today?: boolean };

export type ShareCard = {
  kind: CardKind;
  accent: string;
  /** Text colour on the accent. */
  ink: string;
  kicker: string;
  /** The big number (or word); empty with `trophy` to draw a trophy instead. */
  hero: string;
  heroLtr?: boolean;
  trophy?: boolean;
  heroLabel: string;
  title: string;
  stats: CardStat[];
  week?: WeekDot[];
  mood: MascotMood;
  name: string;
  /** A small line above the footer, e.g. that the simulator uses play money. */
  note?: string;
  /** Message sent with the picture (or alone where pictures can't be shared). */
  text: string;
};

const PLAY_MONEY = 'حساب تمرینی با پول مجازی؛ توصیه‌ی مالی نیست';

// ---------- cards ----------

export function streakCard(p: { name: string; streak: number; best: number; week: WeekDot[] }): ShareCard {
  const record = p.streak > 1 && p.streak >= p.best;
  return {
    kind: 'streak',
    accent: colors.flame,
    ink: '#3A1C00',
    kicker: record ? 'رکورد جدید!' : 'روزهای پیاپی',
    hero: fa(p.streak),
    heroLabel: 'روز پشت سر هم',
    title: 'هر روز یه قدم نزدیک‌تر به تریدر شدن',
    stats: [],
    week: p.week,
    mood: 'party',
    name: p.name,
    text: `${fa(p.streak)} روزه که هر روز با تریدینگو ترید یاد می‌گیرم 🔥\n${APP_URL}`,
  };
}

export function unitCard(p: { name: string; unitTitle: string; courseTitle: string; color: string; lessons: number; done: number; total: number }): ShareCard {
  const pct = Math.round((p.done / Math.max(1, p.total)) * 100);
  return {
    kind: 'unit',
    accent: p.color,
    ink: colors.bg,
    kicker: 'یه واحد دیگه تموم شد',
    hero: `${fa(pct)}٪`,
    heroLabel: `از دوره‌ی ${p.courseTitle}`,
    title: `واحد «${p.unitTitle}» رو تموم کردم!`,
    stats: [
      { label: 'درس این واحد', value: fa(p.lessons) },
      { label: 'درس‌های دوره', value: `${fa(p.done)} از ${fa(p.total)}` },
    ],
    mood: 'happy',
    name: p.name,
    text: `واحد «${p.unitTitle}» از دوره‌ی ${p.courseTitle} رو توی تریدینگو تموم کردم 💪\n${APP_URL}`,
  };
}

export function courseCard(p: { name: string; courseTitle: string; color: string; lessons: number; units: number }): ShareCard {
  return {
    kind: 'course',
    accent: p.color,
    ink: colors.bg,
    kicker: 'دوره کامل شد!',
    hero: '۱۰۰٪',
    heroLabel: `دوره‌ی ${p.courseTitle}`,
    title: `کل دوره‌ی ${p.courseTitle} رو تموم کردم!`,
    stats: [
      { label: 'درس', value: fa(p.lessons) },
      { label: 'واحد', value: fa(p.units) },
    ],
    mood: 'party',
    name: p.name,
    text: `دوره‌ی ${p.courseTitle} رو توی تریدینگو کامل تموم کردم 🎓\n${APP_URL}`,
  };
}

export function challengeCard(p: { name: string; title: string; coins: number; xp: number }): ShareCard {
  return {
    kind: 'challenge',
    accent: colors.gold,
    ink: colors.goldInk,
    kicker: 'چالش شبیه‌ساز',
    hero: '',
    trophy: true,
    heroLabel: 'چالش رو بردم!',
    title: `«${p.title}»`,
    stats: [
      { label: 'سکه', value: `+${fa(p.coins)}` },
      { label: 'امتیاز', value: `+${fa(p.xp)}` },
    ],
    mood: 'party',
    name: p.name,
    note: PLAY_MONEY,
    text: `چالش «${p.title}» رو توی شبیه‌ساز تریدینگو بردم 🏆\n${APP_URL}`,
  };
}

export function tradingCard(p: { name: string; count: number; winRate: number | null; net: number; profitFactor: number | null }): ShareCard {
  const pf = p.profitFactor == null ? '—' : p.profitFactor === Infinity ? '∞' : p.profitFactor.toFixed(2);
  return {
    kind: 'trading',
    accent: colors.bull,
    ink: colors.bullInk,
    kicker: 'آمار معامله‌هام',
    hero: p.winRate == null ? '—' : `${fa(Math.round(p.winRate * 100))}٪`,
    heroLabel: 'درصد برد',
    title: 'توی شبیه‌ساز معامله‌ی تریدینگو',
    stats: [
      { label: 'معامله', value: faNum(p.count) },
      { label: 'سود خالص', value: usd(p.net, true), ltr: true, color: p.net >= 0 ? colors.bullText : colors.bearText },
      { label: 'فاکتور سود', value: pf, ltr: true },
    ],
    mood: p.net >= 0 ? 'party' : 'think',
    name: p.name,
    note: PLAY_MONEY,
    text: `آمار معامله‌هام توی شبیه‌ساز تریدینگو: ${faNum(p.count)} معامله${p.winRate == null ? '' : `، ${fa(Math.round(p.winRate * 100))}٪ برد`} 📈\n${APP_URL}`,
  };
}

export function profileCard(p: { name: string; xp: number; streak: number; league: string; lessons: number }): ShareCard {
  return {
    kind: 'profile',
    accent: colors.sky,
    ink: colors.skyInk,
    kicker: 'پیشرفت من',
    hero: faNum(p.xp),
    heroLabel: 'امتیاز',
    title: `توی لیگ ${p.league} تریدینگو`,
    stats: [
      { label: 'روز پیاپی', value: fa(p.streak) },
      { label: 'درس', value: fa(p.lessons) },
      { label: 'لیگ', value: p.league },
    ],
    mood: 'happy',
    name: p.name,
    text: `${faNum(p.xp)} امتیاز و ${fa(p.lessons)} درس توی تریدینگو 🚀\n${APP_URL}`,
  };
}

/** This week's days, Saturday first, for the streak card. */
export function weekDots(start: Date, activeDays: string[], frozenDays: string[], todayIndex: number, keyOf: (d: Date) => string): WeekDot[] {
  return FA_WEEKDAYS_SHORT.map((label, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = keyOf(d);
    const state = activeDays.includes(key) ? 'on' : frozenDays.includes(key) ? 'frozen' : 'off';
    return { label, state, today: i === todayIndex };
  });
}

// ---------- drawing ----------

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Rough width of a line of text, to size pills and wrap titles. */
const textWidth = (t: string, size: number) => t.length * size * 0.52;

function text(
  t: string,
  x: number,
  y: number,
  size: number,
  family: string,
  fill: string,
  opts: { ltr?: boolean; anchor?: 'start' | 'middle' | 'end'; opacity?: number } = {},
): string {
  const dir = opts.ltr ? 'ltr' : 'rtl';
  const op = opts.opacity != null ? ` opacity="${opts.opacity}"` : '';
  return `<text x="${x}" y="${y}" font-family="${family}, Tahoma, sans-serif" font-size="${size}" fill="${fill}" text-anchor="${opts.anchor ?? 'middle'}" direction="${dir}" unicode-bidi="embed"${op}>${esc(t)}</text>`;
}

/** Words into at most `lines` lines of about `max` characters. */
export function wrapText(t: string, max: number, lines = 2): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of t.split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > max) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  kept[lines - 1] = `${kept[lines - 1]}…`;
  return kept;
}

/** Faint rising candles behind the mascot. */
function backgroundCandles(seed: string): string {
  const rng = createRng(hashString(`card:${seed}`));
  const n = 16;
  const bars: [number, number, number, number][] = [];
  let price = 0;
  for (let i = 0; i < n; i++) {
    const o = price;
    const c = o + (rng() - 0.32) * 34;
    bars.push([o, Math.max(o, c) + rng() * 16, Math.min(o, c) - rng() * 16, c]);
    price = c;
  }
  const lo = Math.min(...bars.map((b) => b[2]));
  const hi = Math.max(...bars.map((b) => b[1]));
  const y = (v: number) => 760 - ((v - lo) / (hi - lo || 1)) * 460;
  const step = 960 / n;
  return bars
    .map(([o, h, l, c], i) => {
      const x = 60 + step * (i + 0.5);
      const fill = c >= o ? colors.bull : colors.bear;
      const top = y(Math.max(o, c));
      const bh = Math.max(6, y(Math.min(o, c)) - top);
      return `<line x1="${x}" x2="${x}" y1="${y(h)}" y2="${y(l)}" stroke="${fill}" stroke-width="5"/><rect x="${x - 16}" y="${top}" width="32" height="${bh}" rx="5" fill="${fill}"/>`;
    })
    .join('');
}

function trophy(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="${color}"/><path d="M17 5h3v1.5A3.5 3.5 0 0 1 16.6 10M7 5H4v1.5A3.5 3.5 0 0 0 7.4 10"/><path d="M12 14v3M8 21h8M9 17h6v4H9z"/></g>`;
}

function weekRow(week: WeekDot[]): string {
  const gap = 118;
  return week
    .map((d, i) => {
      // Saturday sits on the right, as in a Persian calendar.
      const x = 540 + (3 - i) * gap;
      const fill = d.state === 'on' ? colors.flame : d.state === 'frozen' ? colors.sky : colors.raised;
      const ring = d.today ? `<circle cx="${x}" cy="1178" r="50" fill="none" stroke="${colors.gold}" stroke-width="6"/>` : '';
      const mark =
        d.state === 'on'
          ? `<path d="M${x - 17} 1178 l11 12 l24 -26" stroke="#3A1C00" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          : d.state === 'frozen'
            ? `<path d="M${x} 1156v44M${x - 19} 1167l38 22M${x - 19} 1189l38 -22" stroke="${colors.skyInk}" stroke-width="6" stroke-linecap="round"/>`
            : '';
      return `${text(d.label, x, 1110, 30, 'Vazirmatn_700Bold', d.today ? colors.gold : colors.text3)}${ring}<circle cx="${x}" cy="1178" r="40" fill="${fill}"${d.state === 'off' ? ` stroke="${colors.line}" stroke-width="4"` : ''}/>${mark}`;
    })
    .join('');
}

function statRow(stats: CardStat[]): string {
  const n = stats.length;
  if (!n) return '';
  const gap = 28;
  const w = (900 - gap * (n - 1)) / n;
  const top = 1098;
  return stats
    .map((st, i) => {
      // The first stat is on the right.
      const x = 90 + (n - 1 - i) * (w + gap);
      const cx = x + w / 2;
      const size = st.value.length > 9 ? 36 : 46;
      return `<rect x="${x}" y="${top}" width="${w}" height="140" rx="28" fill="${colors.surface}" stroke="${colors.line}" stroke-width="3"/>${text(st.value, cx, top + 70, size, 'Vazirmatn_900Black', st.color ?? colors.text, { ltr: st.ltr })}${text(st.label, cx, top + 114, 28, 'Vazirmatn_700Bold', colors.text3)}`;
    })
    .join('');
}

/** The card as an SVG document; `fontCss` embeds fonts for turning it into a picture. */
export function cardSvg(card: ShareCard, fontCss = ''): string {
  const kickerW = textWidth(card.kicker, 34) + 72;
  // The streak card's week row sits right under the title, so it gets a single line.
  const title = wrapText(card.title, 40, card.week ? 1 : 2);
  const style = fontCss ? `<style>${fontCss}</style>` : '';
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">`,
    `<defs>${style}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#162036"/><stop offset="1" stop-color="#0A0F1A"/></linearGradient>`,
    `<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${card.accent}" stop-opacity="0.42"/><stop offset="1" stop-color="${card.accent}" stop-opacity="0"/></radialGradient></defs>`,
    `<rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>`,
    `<g opacity="0.1">${backgroundCandles(card.kind + card.title)}</g>`,
    `<circle cx="540" cy="470" r="360" fill="url(#glow)"/>`,
    `<rect x="24" y="24" width="${CARD_W - 48}" height="${CARD_H - 48}" rx="56" fill="none" stroke="${card.accent}" stroke-opacity="0.35" stroke-width="4"/>`,
    // Brand, with a small candle on each side.
    text('تریدینگو', 540, 128, 64, 'Lalezar_400Regular', colors.text),
    `<line x1="372" x2="372" y1="72" y2="140" stroke="${colors.bull}" stroke-width="5"/><rect x="360" y="86" width="24" height="40" rx="5" fill="${colors.bull}"/>`,
    `<line x1="708" x2="708" y1="78" y2="136" stroke="${colors.bear}" stroke-width="5"/><rect x="696" y="92" width="24" height="30" rx="5" fill="${colors.bear}"/>`,
    `<rect x="${540 - kickerW / 2}" y="170" width="${kickerW}" height="66" rx="33" fill="${card.accent}"/>`,
    text(card.kicker, 540, 216, 34, 'Vazirmatn_900Black', card.ink),
    `<g transform="translate(365 262) scale(2.5)">${mascotMarkup(card.mood)}</g>`,
    card.trophy ? trophy(540, 800, 170, card.accent) : text(card.hero, 540, 880, card.hero.length > 6 ? 150 : 210, 'Lalezar_400Regular', card.accent, { ltr: card.heroLtr }),
    text(card.heroLabel, 540, 952, 48, 'Vazirmatn_900Black', colors.text),
    ...title.map((line, i) => text(line, 540, 1018 + i * 54, 38, 'Vazirmatn_700Bold', colors.text2)),
    card.week ? weekRow(card.week) : statRow(card.stats),
    card.note ? text(card.note, 540, 1276, 26, 'Vazirmatn_700Bold', colors.text3) : '',
    text(`${card.name} · ${APP_URL}`, 540, 1314, 28, 'Vazirmatn_700Bold', colors.muted),
    '</svg>',
  ];
  return parts.join('');
}
