/**
 * Server calls for the admin panel (supabase/migrations/20260930000000_tradingo_admin.sql).
 * Every call checks on the server that the session belongs to an admin; the app only decides
 * whether to show the panel.
 */
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
  mobile: string;
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

/** Whether the server has the groups tab and setup codes (version 7). */
export async function roomsAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 7;
}

export async function fetchRooms(): Promise<RpcResult<AdminRoom[]>> {
  const res = await call<AdminRoom[]>('tradingo_admin_rooms', {});
  return res.ok ? { ok: true, value: Array.isArray(res.value) ? res.value : [] } : res;
}

/** Deletes a group learners made, with its messages; official groups can't be deleted. */
export const deleteRoom = (id: string) => call<{ ok: boolean }>('tradingo_admin_room_delete', { p_room: id });

/** A setup code as typed: any case, with or without dashes and spaces → XXXX-XXXX-XXXX-XXXX. */
export function normalizeSetupCode(code: string): string {
  const raw = latinDigits(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.length === 16 ? (raw.match(/.{4}/g) ?? []).join('-') : code.trim().toUpperCase();
}

/** Makes the signed-in account an admin with the one-time setup code from the server. */
export const claimAdmin = (code: string) => call<{ ok: boolean }>('tradingo_admin_claim', { p_code: normalizeSetupCode(code) });

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
  // Persian digits typed in the search box become the Latin ones mobile numbers are stored with.
  const res = await call<AdminUser[]>('tradingo_admin_users', { p_query: latinDigits(query.trim()), p_filter: filter });
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
  forbidden: 'این بخش فقط برای مدیرهاست.',
  self: 'این کار رو روی حساب خودت نمی‌تونی انجام بدی.',
  admin_target: 'اول باید دسترسی مدیریِ این حساب رو برداری.',
  not_found: 'پیدا نشد؛ شاید قبلاً حذف شده.',
  invalid_key: 'کلید درست به نظر نمی‌رسه (بین ۱۰ تا ۴۰۰ کاراکتر، بدون فاصله).',
  invalid_model: 'اسم مدل درست نیست.',
  invalid_base_url: 'آدرس API باید با https:// شروع بشه.',
  openai_needs_model_and_url: 'برای سرویس سازگار با OpenAI، اسم مدل و آدرس API لازمه.',
  invalid_limit: 'سقف روزانه باید بین ۱ تا ۱۰۰۰ باشه.',
  invalid_provider: 'سرویس انتخاب‌شده درست نیست.',
  invalid_code: 'این کد درست نیست، قبلاً استفاده شده یا منقضی شده.',
  official_room: 'گروه‌های رسمی حذف نمی‌شن؛ پیام‌هاشون رو مدیریت کن.',
  session: 'نشستت روی سرور تموم شده؛ دوباره وارد حسابت شو.',
  network: 'به سرور وصل نشد؛ اینترنتت رو چک کن و دوباره امتحان کن.',
};

export function adminErrorText(kind: string): string {
  return ERRORS[kind] ?? 'انجام نشد؛ دوباره امتحان کن.';
}

/** A log line in Persian: «مدیر» + this. */
export function logText(action: string, target: string | null): string {
  const t = target ?? 'یه حساب حذف‌شده';
  const lines: Record<string, string> = {
    ban: `${t} رو مسدود کرد`,
    unban: `مسدودی ${t} رو برداشت`,
    mute: `چت ${t} رو بست`,
    unmute: `چت ${t} رو باز کرد`,
    purge: `پیام‌های ${t} رو پاک کرد`,
    make_admin: `${t} رو مدیر کرد`,
    remove_admin: `دسترسی مدیری ${t} رو برداشت`,
    delete_message: `یه پیام از ${t} رو حذف کرد`,
    keep_message: `گزارش پیام ${t} رو رد کرد`,
    ai_settings: 'تنظیمات هوش مصنوعی رو عوض کرد',
    claim_admin: 'با کد راه‌اندازی مدیر شد',
    delete_room: `یه گروه از ${t} رو حذف کرد`,
  };
  return lines[action] ?? action;
}

/** The note under a log line, with a mute's length in Persian ("24h" → «۲۴ ساعت»). */
export function logDetail(action: string, detail: string | null): string {
  if (!detail) return '';
  if (action !== 'mute') return detail;
  return detail.replace(/^forever/, 'همیشه').replace(/^(\d+)h/, (_, h: string) => `${fa(Number(h))} ساعت`);
}
