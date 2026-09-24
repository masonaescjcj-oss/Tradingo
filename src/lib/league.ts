import { t } from '@/i18n';
import { weekStart } from '@/utils/date';
import { createRng, hashString, shuffle } from '@/utils/random';

export const LEAGUES = [
  { name: 'میگو', color: '#FF8A7A', ink: '#3A0E08' }, // i18n-ignore: translated where shown (leagueName)
  { name: 'خرچنگ', color: '#FF9433', ink: '#3A1C00' }, // i18n-ignore: translated where shown (leagueName)
  { name: 'دلفین', color: '#5AB0FF', ink: '#07233F' }, // i18n-ignore: translated where shown (leagueName)
  { name: 'کوسه', color: '#A78BFA', ink: '#1E1240' }, // i18n-ignore: translated where shown (leagueName)
  { name: 'نهنگ', color: '#FFC53D', ink: '#3B2A00' }, // i18n-ignore: translated where shown (leagueName)
] as const;

/** A league's name in the app's language (Shrimp, Crab, Dolphin, Shark, Whale). */
export function leagueName(league: number): string {
  const l = LEAGUES[league];
  return l ? t(l.name) : '';
}

export const BOARD_SIZE = 15;
export const PROMOTE_COUNT = 5;
export const DEMOTE_COUNT = 3;

const BOT_NAMES = [
  'سارا م.', // i18n-ignore: translated when the board is built
  'NimaFX',
  'مهسا', // i18n-ignore: translated when the board is built
  'کیان', // i18n-ignore: translated when the board is built
  'رضا ت.', // i18n-ignore: translated when the board is built
  'BTC_Hodl',
  'نگار', // i18n-ignore: translated when the board is built
  'امیر', // i18n-ignore: translated when the board is built
  'Pips_Queen',
  'شیوا', // i18n-ignore: translated when the board is built
  'بردیا', // i18n-ignore: translated when the board is built
  'Mehdi.trd',
  'الناز', // i18n-ignore: translated when the board is built
  'پویا', // i18n-ignore: translated when the board is built
  'Candle_Kid',
  'فرزانه', // i18n-ignore: translated when the board is built
  'آرمان', // i18n-ignore: translated when the board is built
  'Zahra_FX',
];

const AVATAR_COLORS = [
  { bg: '#3B2F6B', fg: '#C4B5FD' },
  { bg: '#1B3A5C', fg: '#8CC8FF' },
  { bg: '#12382A', fg: '#5BE39A' },
  { bg: '#3A2E10', fg: '#FFC53D' },
  { bg: '#2A1520', fg: '#FF7A8A' },
  { bg: '#0E3431', fg: '#4FD1C5' },
];

export type BoardRow = {
  name: string;
  xp: number;
  isUser: boolean;
  /** A real player from the cloud league rather than a simulated one. */
  isReal?: boolean;
  avatar: { bg: string; fg: string };
};

const WEEK_MS = 7 * 86_400_000;

export function weekProgress(now: Date): number {
  return Math.min(1, Math.max(0, (now.getTime() - weekStart(now).getTime()) / WEEK_MS));
}

export function weekEndsIn(now: Date): { days: number; hours: number } {
  const remaining = weekStart(now).getTime() + WEEK_MS - now.getTime();
  const hours = Math.max(0, Math.floor(remaining / 3_600_000));
  return { days: Math.floor(hours / 24), hours: hours % 24 };
}

/**
 * Builds the weekly board around the user. Real players from the cloud league come first;
 * simulated traders fill the remaining seats, gaining XP as the week goes by so the board feels alive.
 */
export function buildBoard(
  weekKey: string,
  league: number,
  userName: string,
  userXp: number,
  progress: number,
  realPlayers: { name: string; xp: number }[] = [],
): BoardRow[] {
  const rng = createRng(hashString(`${weekKey}:${league}`));
  const real = realPlayers.slice(0, BOARD_SIZE - 1);
  const names = shuffle(BOT_NAMES, rng).slice(0, BOARD_SIZE - 1 - real.length);
  const scale = 1 + league * 0.35;
  const rows: BoardRow[] = names.map((name) => {
    const target = (60 + rng() * 1100) * scale;
    const pace = 0.7 + rng() * 0.8;
    const xp = Math.round(target * Math.pow(progress, pace));
    return { name: t(name), xp, isUser: false, avatar: AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length] };
  });
  for (const p of real) {
    rows.push({ name: p.name, xp: p.xp, isUser: false, isReal: true, avatar: AVATAR_COLORS[hashString(p.name) % AVATAR_COLORS.length] });
  }
  rows.push({ name: userName, xp: userXp, isUser: true, avatar: { bg: '#1B3A5C', fg: '#8CC8FF' } });
  // Ties go to the user so a fresh week doesn't start them at the bottom.
  return rows.sort((a, b) => b.xp - a.xp || Number(b.isUser) - Number(a.isUser));
}

export function userRank(rows: BoardRow[]): number {
  return rows.findIndex((r) => r.isUser) + 1;
}
