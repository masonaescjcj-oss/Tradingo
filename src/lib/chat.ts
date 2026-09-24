/**
 * Community chat: rooms like Telegram groups, messages and shared analyses. Pure helpers
 * and types; the server calls live in chatApi.ts.
 */
import type { Candle } from '@/content/types';
import { fa } from '@/utils/format';

export type ChatTopic = 'general' | 'beginners' | 'crypto' | 'forex' | 'technical' | 'psychology';

export const CHAT_TOPICS: { id: ChatTopic; label: string }[] = [
  { id: 'general', label: 'آزاد' },
  { id: 'beginners', label: 'تازه‌کارها' },
  { id: 'crypto', label: 'کریپتو' },
  { id: 'forex', label: 'فارکس و طلا' },
  { id: 'technical', label: 'تحلیل تکنیکال' },
  { id: 'psychology', label: 'روانشناسی' },
];

export type ChatRoom = {
  id: string;
  title: string;
  about: string;
  topic: ChatTopic;
  official: boolean;
  owned: boolean;
  member_count: number;
  last_message_at: string;
  joined: boolean;
  unread: number;
  last_author: string | null;
  last_kind: 'text' | 'analysis' | null;
  last_body: string | null;
};

/** A chart shared with an analysis: recent candles of a symbol and the author's levels. */
export type ChatChart = {
  symbol: string;
  label: string;
  decimals: number;
  candles: Candle[];
  side?: 'buy' | 'sell';
  entry?: number;
  sl?: number;
  tp?: number;
  levels?: number[];
};

export type ChatMessage = {
  id: number;
  author_name: string;
  body: string;
  kind: 'text' | 'analysis';
  chart: ChatChart | null;
  created_at: string;
  mine: boolean;
  /** The author's account; only admins get it, to act on it from the chat. */
  author_id?: string;
};

export const MAX_MESSAGE = 1000;
export const CHART_CANDLES = 60;

/**
 * The same rule the server applies: no links, handles or phone numbers, so groups
 * don't fill up with scams and paid "signal" channels.
 */
export function hasBlockedContent(text: string): boolean {
  return /(https?:\/\/|www\.|[a-z0-9-]+\.(com|ir|io|net|org|me|xyz|app|link)\b|t\.me|@[a-z0-9_]{4,}|(\+98|0098|\b0)?9\d{9}\b|[۰-۹]{10,})/i.test(text);
}

/** Why a message can't be sent yet, checked before asking the server. */
export function messageProblem(body: string, hasChart = false): 'empty' | 'long' | 'links' | null {
  const text = body.trim();
  if (!text && !hasChart) return 'empty';
  if (text.length > MAX_MESSAGE) return 'long';
  if (hasBlockedContent(text)) return 'links';
  return null;
}

const ERRORS: Record<string, string> = {
  links: 'لینک، آیدی و شماره تماس توی گفتگوها مجاز نیست.',
  muted: 'فعلاً امکان فرستادن پیام توی گفتگوها برات بسته شده.',
  rate: 'یه کم آروم‌تر! چند ثانیه صبر کن و دوباره بفرست.',
  long: `پیام حداکثر ${fa(MAX_MESSAGE)} حرف می‌تونه باشه.`,
  not_member: 'اول عضو گروه شو.',
  invalid: 'این پیام قابل ارسال نیست.',
  too_many_groups: 'بیشتر از این نمی‌تونی گروه بسازی؛ فعلاً با همین‌ها ادامه بده.',
  too_many_rooms: 'توی گروه‌های زیادی عضوی؛ از چندتاش بیرون بیا.',
  no_room: 'این گروه دیگه وجود نداره.',
  session: 'نشستت روی سرور تموم شده؛ دوباره وارد حسابت شو.',
  network: 'به سرور وصل نشد؛ اینترنتت رو چک کن و دوباره امتحان کن.',
};

export function chatErrorText(kind: string): string {
  return ERRORS[kind] ?? 'یه مشکلی پیش اومد؛ دوباره امتحان کن.';
}

/** Adds newly fetched messages to a list: no duplicates, oldest first. */
export function mergeMessages(list: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optNum = (v: unknown) => (isNum(v) ? v : undefined);

/**
 * A shared chart as received from the server. Charts come from other people, so only
 * well-formed numbers are kept and anything else means "no chart".
 */
export function parseChart(raw: unknown): ChatChart | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.candles)) return null;
  const candles = r.candles
    .filter((c): c is number[] => Array.isArray(c) && c.length === 4 && c.every(isNum))
    .map(([o, h, l, c]) => [o, Math.max(o, h, l, c), Math.min(o, h, l, c), c] as Candle)
    .slice(-80);
  if (candles.length < 5) return null;
  const decimals = isNum(r.decimals) ? Math.min(8, Math.max(0, Math.round(r.decimals))) : 2;
  return {
    symbol: typeof r.symbol === 'string' ? r.symbol.slice(0, 16) : '',
    label: typeof r.label === 'string' ? r.label.slice(0, 16) : '',
    decimals,
    candles,
    side: r.side === 'buy' || r.side === 'sell' ? r.side : undefined,
    entry: optNum(r.entry),
    sl: optNum(r.sl),
    tp: optNum(r.tp),
    levels: Array.isArray(r.levels) ? r.levels.filter(isNum).slice(0, 5) : undefined,
  };
}

/** Normalises a message row from the server. */
export function parseMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    id: Number(raw.id),
    author_name: String(raw.author_name ?? ''),
    body: String(raw.body ?? ''),
    kind: raw.kind === 'analysis' ? 'analysis' : 'text',
    chart: parseChart(raw.chart),
    created_at: String(raw.created_at ?? ''),
    mine: raw.mine === true,
    ...(typeof raw.author_id === 'string' ? { author_id: raw.author_id } : {}),
  };
}

/** The chart part of an analysis: the latest candles, rounded, and the author's levels. */
export function buildChart(
  spec: { id: string; label: string; decimals: number },
  candles: Candle[],
  opts: { side?: 'buy' | 'sell'; entry?: number; sl?: number; tp?: number; levels?: number[] } = {},
): ChatChart {
  const round = (v: number) => Number(v.toFixed(spec.decimals));
  const out: ChatChart = {
    symbol: spec.id,
    label: spec.label,
    decimals: spec.decimals,
    candles: candles.slice(-CHART_CANDLES).map((c) => c.map(round) as unknown as Candle),
  };
  if (opts.side) out.side = opts.side;
  if (opts.entry != null) out.entry = round(opts.entry);
  if (opts.sl != null) out.sl = round(opts.sl);
  if (opts.tp != null) out.tp = round(opts.tp);
  if (opts.levels?.length) out.levels = opts.levels.slice(0, 5).map(round);
  return out;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Message time in Persian digits, e.g. ۱۴:۰۵. */
export function messageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return fa(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
}

/** When, for lists: just the time today, otherwise the day and the time. */
export function whenText(iso: string, now = new Date()): string {
  const day = roomTime(iso, now);
  const time = messageTime(iso);
  return day === time ? time : `${day} ${time}`;
}

/** How long something closed stays closed: «تا ۵ ساعت دیگه», «تا ۳ روز دیگه»; '' once it's over. */
export function untilText(iso: string, now = Date.now()): string {
  const left = new Date(iso).getTime() - now;
  if (!Number.isFinite(left) || left <= 0) return '';
  const hours = Math.ceil(left / 3_600_000);
  if (hours <= 1) return 'تا کمتر از یه ساعت دیگه';
  if (hours < 48) return `تا ${fa(hours)} ساعت دیگه`;
  return `تا ${fa(Math.ceil(hours / 24))} روز دیگه`;
}

/** What someone whose chat an admin closed sees instead of the message box. */
export function mutedNotice(muted: string, now = Date.now()): string {
  const until = muted === 'forever' ? '' : untilText(muted, now);
  return `امکان فرستادن پیام ${until ? `${until} ` : ''}برات بسته شده. هنوز می‌تونی پیام‌ها رو بخونی.`;
}

/** A short "when" for the room list: the time today, «دیروز», or the date. */
export function roomTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  if (day(d) === day(now)) return messageTime(iso);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (day(d) === day(y)) return 'دیروز';
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(d);
}
