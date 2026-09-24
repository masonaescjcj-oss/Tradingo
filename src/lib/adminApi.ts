/**
 * Server calls for the admin panel (supabase/migrations/20260930000000_tradingo_admin.sql).
 * Every call checks on the server that the session belongs to an admin; the app only decides
 * whether to show the panel. Nobody becomes an admin from the app itself: the owner's email or
 * number is listed on the server, and other admins are made from the panel.
 */
import { t } from '@/i18n';
import { fa } from '@/utils/format';

import { callRpc, serverVersion, sessionToken, type RpcResult } from './cloud';
import { latinDigits } from './phone';

export type AdminMessage = {
  id: number;
  room_id: string;
  room_title: string;
  author_id: string | null;
  author_name: string;
  body: string;
  kind: 'text' | 'analysis';
  hidden: boolean;
  reports: number;
  reviewed_at: string | null;
  created_at: string;
  author_muted: boolean;
  author_banned: boolean;
};

export type AdminUser = {
  id: string;
  name: string;
  /** The account signs in with its email or its mobile number (older accounts: the number). */
  email: string | null;
  mobile: string | null;
  role: 'user' | 'admin';
  created_at: string;
  banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  muted: boolean;
  /** When the chat opens again; null with `muted` means until an admin opens it. */
  muted_until: string | null;
  messages: number;
  reported: number;
  last_seen: string | null;
};

export type AiStatus = {
  key_set: boolean;
  key_hint: string | null;
  key_updated_at: string | null;
  provider: 'anthropic' | 'openai';
  model: string | null;
  base_url: string | null;
  daily_limit: number | null;
};

export type AdminLogEntry = { id: number; admin_name: string; action: string; target_name: string | null; detail: string | null; created_at: string };

export type AdminOverview = {
  accounts: number;
  new_today: number;
  messages_today: number;
  open_reports: number;
  banned: number;
  muted: number;
  admins: number;
  ai: AiStatus;
  log: AdminLogEntry[];
};

export type UserAction = 'ban' | 'unban' | 'mute' | 'unmute' | 'purge' | 'make_admin' | 'remove_admin';
export type UserFilter = 'all' | 'banned' | 'muted' | 'admins' | 'reported';

/** Whether the server has the admin functions. */
export async function adminAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 6;
}

function call<T>(fn: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  const token = sessionToken();
  if (!token) return Promise.resolve({ ok: false, error: 'session' });
  return callRpc<T>(fn, { p_token: token, ...args });
}

export const fetchOverview = () => call<AdminOverview>('tradingo_admin_overview', {});

export type AdminRoom = {
  id: string;
  title: string;
  about: string;
  topic: string;
  official: boolean;
  member_count: number;
  created_at: string;
  last_message_at: string;
  owner_id: string | null;
  owner_name: string | null;
  messages: number;
  hidden: number;
  open_reports: number;
};

/** Whether the server has the groups tab (version 7). */
export async function roomsAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 7;
}

export async function fetchRooms(): Promise<RpcResult<AdminRoom[]>> {
  const res = await call<AdminRoom[]>('tradingo_admin_rooms', {});
  return res.ok ? { ok: true, value: Array.isArray(res.value) ? res.value : [] } : res;
}

/** Deletes a group learners made, with its messages; official groups can't be deleted. */
export const deleteRoom = (id: string) => call<{ ok: boolean }>('tradingo_admin_room_delete', { p_room: id });

export async function fetchAdminMessages(opts: { reported?: boolean; room?: string; account?: string; before?: number } = {}): Promise<RpcResult<AdminMessage[]>> {
  const res = await call<AdminMessage[]>('tradingo_admin_messages', {
    p_filter: opts.reported ? 'reported' : 'latest',
    p_room: opts.room ?? null,
    p_account: opts.account ?? null,
    p_before: opts.before ?? null,
  });
  return res.ok ? { ok: true, value: Array.isArray(res.value) ? res.value : [] } : res;
}

export const moderateMessage = (id: number, action: 'delete' | 'keep') => call<{ ok: boolean }>('tradingo_admin_message', { p_message: id, p_action: action });

export async function fetchUsers(query: string, filter: UserFilter): Promise<RpcResult<AdminUser[]>> {
  // Persian digits typed in the search box become the Latin ones logins are stored with.
  const res = await call<AdminUser[]>('tradingo_admin_users', { p_query: latinDigits(query.trim()).toLowerCase(), p_filter: filter });
  return res.ok ? { ok: true, value: Array.isArray(res.value) ? res.value : [] } : res;
}

/** `hours` only for 'mute': how long chat stays closed (null: until an admin opens it). */
export async function actOnUser(id: string, action: UserAction, opts: { hours?: number | null; reason?: string } = {}): Promise<RpcResult<AdminUser>> {
  const res = await call<{ ok: boolean; user: AdminUser }>('tradingo_admin_user', {
    p_account: id,
    p_action: action,
    p_hours: opts.hours ?? null,
    p_reason: opts.reason ?? null,
  });
  return res.ok ? { ok: true, value: res.value.user } : res;
}

export type AiReport = {
  id: number;
  question: string;
  answer: string;
  reason: 'wrong' | 'advice' | 'offensive' | 'other';
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
  author_name: string | null;
  author_username: string | null;
};

/** Whether the server keeps reported AI answers (version 10). */
export async function aiReportsAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 10;
}

export async function fetchAiReports(): Promise<RpcResult<AiReport[]>> {
  const res = await call<AiReport[]>('tradingo_admin_ai_reports', {});
  return res.ok ? { ok: true, value: Array.isArray(res.value) ? res.value : [] } : res;
}

export const markAiReportDone = (id: number) => call<{ ok: boolean }>('tradingo_admin_ai_report_done', { p_report: id });

export const AI_REPORT_REASON: Record<AiReport['reason'], string> = {
  wrong: 'اشتباه یا گمراه‌کننده', // i18n-ignore: translated where shown
  advice: 'توصیه‌ی خرید و فروش', // i18n-ignore: translated where shown
  offensive: 'نامناسب یا توهین‌آمیز', // i18n-ignore: translated where shown
  other: 'دلیل دیگه', // i18n-ignore: translated where shown
};

export type AiSettingsInput = { key: string; clearKey: boolean; provider: 'anthropic' | 'openai'; model: string; baseUrl: string; dailyLimit: number | null };

export const saveAiSettings = (s: AiSettingsInput) =>
  call<AiStatus>('tradingo_admin_set_ai', {
    p_key: s.key.trim(),
    p_clear_key: s.clearKey,
    p_provider: s.provider,
    p_model: s.model.trim(),
    p_base_url: s.baseUrl.trim(),
    p_daily_limit: s.dailyLimit,
  });

const ERRORS: Record<string, string> = {
  forbidden: 'این بخش فقط برای مدیرهاست.', // i18n-ignore: translated where shown
  self: 'این کار رو روی حساب خودت نمی‌تونی انجام بدی.', // i18n-ignore: translated where shown
  admin_target: 'اول باید دسترسی مدیریِ این حساب رو برداری.', // i18n-ignore: translated where shown
  not_found: 'پیدا نشد؛ شاید قبلاً حذف شده.', // i18n-ignore: translated where shown
  invalid_key: 'کلید درست به نظر نمی‌رسه (بین ۱۰ تا ۴۰۰ کاراکتر، بدون فاصله).', // i18n-ignore: translated where shown
  invalid_model: 'اسم مدل درست نیست.', // i18n-ignore: translated where shown
  invalid_base_url: 'آدرس API باید با https:// شروع بشه.', // i18n-ignore: translated where shown
  openai_needs_model_and_url: 'برای سرویس سازگار با OpenAI، اسم مدل و آدرس API لازمه.', // i18n-ignore: translated where shown
  invalid_limit: 'سقف روزانه باید بین ۱ تا ۱۰۰۰ باشه.', // i18n-ignore: translated where shown
  invalid_provider: 'سرویس انتخاب‌شده درست نیست.', // i18n-ignore: translated where shown
  official_room: 'گروه‌های رسمی حذف نمی‌شن؛ پیام‌هاشون رو مدیریت کن.', // i18n-ignore: translated where shown
  session: 'نشستت روی سرور تموم شده؛ دوباره وارد حسابت شو.', // i18n-ignore: translated where shown
  network: 'به سرور وصل نشد؛ اینترنتت رو چک کن و دوباره امتحان کن.', // i18n-ignore: translated where shown
};

export function adminErrorText(kind: string): string {
  return ERRORS[kind] ? t(ERRORS[kind]) : t('انجام نشد؛ دوباره امتحان کن.');
}

/** What each logged action says after the admin's name; {name} is the account acted on. */
const LOG_LINES: Record<string, string> = {
  ban: '{name} رو مسدود کرد', // i18n-ignore: translated where shown
  unban: 'مسدودی {name} رو برداشت', // i18n-ignore: translated where shown
  mute: 'چت {name} رو بست', // i18n-ignore: translated where shown
  unmute: 'چت {name} رو باز کرد', // i18n-ignore: translated where shown
  purge: 'پیام‌های {name} رو پاک کرد', // i18n-ignore: translated where shown
  make_admin: '{name} رو مدیر کرد', // i18n-ignore: translated where shown
  remove_admin: 'دسترسی مدیری {name} رو برداشت', // i18n-ignore: translated where shown
  delete_message: 'یه پیام از {name} رو حذف کرد', // i18n-ignore: translated where shown
  keep_message: 'گزارش پیام {name} رو رد کرد', // i18n-ignore: translated where shown
  ai_settings: 'تنظیمات هوش مصنوعی رو عوض کرد', // i18n-ignore: translated where shown
  owner_admin: 'با حساب مالک وارد شد و مدیر شد', // i18n-ignore: translated where shown
  delete_room: 'یه گروه از {name} رو حذف کرد', // i18n-ignore: translated where shown
  ai_report_done: 'گزارش {name} درباره‌ی جواب هوش مصنوعی رو بررسی کرد', // i18n-ignore: translated where shown
};

/** A log line, shown after the admin's name ("<admin> banned <account>"). */
export function logText(action: string, target: string | null): string {
  const line = LOG_LINES[action];
  return line ? t(line, { name: target ?? t('یه حساب حذف‌شده') }) : action;
}

/** The note under a log line, with a mute's length in words ("24h" → "24 hours"). */
export function logDetail(action: string, detail: string | null): string {
  if (!detail) return '';
  if (action !== 'mute') return detail;
  return detail.replace(/^forever/, t('همیشه')).replace(/^(\d+)h/, (_, h: string) => t('{n} ساعت', { n: fa(Number(h)), count: Number(h) }));
}
