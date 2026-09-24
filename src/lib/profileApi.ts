/**
 * @IDs, profile pictures and public profiles (supabase/migrations/20261003000000_tradingo_profiles.sql).
 * Every account has a unique @ID, so two people with the same name can be told apart in the
 * chat, and anyone can open a learner's profile: picture, name, @ID and learning.
 */
import { t } from '@/i18n';

import { callRpc, rememberProfile, serverVersion, sessionToken, type RpcResult } from './cloud';
import { latinDigits } from './phone';
import { currentStreak } from './progress';

export const USERNAME_RULE = /^[a-z][a-z0-9_]{2,19}$/;

/** An @ID as typed: without the @, in lower case, with Latin digits. */
export function normalizeUsername(input: string): string {
  return latinDigits(input).trim().replace(/^@+/, '').toLowerCase();
}

/** Why an @ID can't be used, in the app's language, or null when it can. */
export function usernameProblem(username: string): string | null {
  if (!username) return t('یه آیدی بنویس.');
  if (/[^\x00-\x7F]/.test(username)) return t('آیدی فقط با حروف انگلیسی، عدد و _ ساخته می‌شه.');
  if (username.length < 3) return t('آیدی حداقل ۳ حرف باشه.');
  if (username.length > 20) return t('آیدی حداکثر ۲۰ حرف باشه.');
  if (!/^[a-z]/.test(username)) return t('آیدی باید با یه حرف انگلیسی شروع بشه.');
  if (!USERNAME_RULE.test(username)) return t('آیدی فقط با حروف انگلیسی، عدد و _ ساخته می‌شه.');
  return null;
}

const ERRORS: Record<string, string> = {
  invalid_username: 'آیدی باید ۳ تا ۲۰ حرف انگلیسی، عدد یا _ باشه و با حرف شروع بشه.', // i18n-ignore: translated where shown
  username_taken: 'این آیدی مال یکی دیگه‌ست؛ یه آیدی دیگه امتحان کن.', // i18n-ignore: translated where shown
  username_reserved: 'این آیدی برای چارتون نگه داشته شده؛ یه آیدی دیگه انتخاب کن.', // i18n-ignore: translated where shown
  invalid_avatar: 'این عکس پیدا نشد.', // i18n-ignore: translated where shown
  not_found: 'این پروفایل پیدا نشد.', // i18n-ignore: translated where shown
  self: 'خودت رو نمی‌تونی بلاک کنی.', // i18n-ignore: translated where shown
  too_many: 'بیشتر از ۵۰۰ نفر رو نمی‌شه بلاک کرد.', // i18n-ignore: translated where shown
  session: 'نشستت روی سرور تموم شده؛ دوباره وارد حسابت شو.', // i18n-ignore: translated where shown
  network: 'به سرور وصل نشد؛ اینترنتت رو چک کن و دوباره امتحان کن.', // i18n-ignore: translated where shown
};

export function profileErrorText(kind: string): string {
  return ERRORS[kind] ? t(ERRORS[kind]) : t('انجام نشد؛ دوباره امتحان کن.');
}

/** Whether the server has @IDs and profiles (version 9). */
export async function profilesAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 9;
}

/** Saves the @ID and picture on the server and on this device. */
export async function saveProfile(username: string, avatar: number): Promise<RpcResult<{ username: string; avatar: number }>> {
  const token = sessionToken();
  if (!token) return { ok: false, error: 'session' };
  const res = await callRpc<{ username: string; avatar: number }>('tradingo_set_profile', { p_token: token, p_username: normalizeUsername(username), p_avatar: avatar });
  if (res.ok) rememberProfile(res.value.username, res.value.avatar);
  return res;
}

export type PublicProfile = {
  name: string;
  username: string;
  avatar: number;
  createdAt: string;
  mine: boolean;
  xp: number;
  streak: number;
  bestStreak: number;
  league: number;
  enrolled: string[];
  mastered: string[];
  completed: string[];
  duelWins: number;
  messages: number;
  /** The viewer has blocked this person. */
  blocked: boolean;
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** A profile as the server sends it, with anything missing or malformed as zero or empty. */
export function parseProfile(raw: Record<string, unknown>, today?: string): PublicProfile {
  const lastActive = typeof raw.last_active === 'string' ? raw.last_active : null;
  return {
    name: String(raw.name ?? ''),
    username: String(raw.username ?? ''),
    avatar: num(raw.avatar),
    createdAt: String(raw.created_at ?? ''),
    mine: raw.mine === true,
    xp: num(raw.xp),
    // The saved streak only counts if they were active today or yesterday.
    streak: currentStreak({ streak: num(raw.streak), lastActiveDay: lastActive }, today),
    bestStreak: num(raw.best_streak),
    league: Math.min(4, Math.max(0, Math.round(num(raw.league)))),
    enrolled: strings(raw.enrolled),
    mastered: strings(raw.mastered),
    completed: strings(raw.completed),
    duelWins: num(raw.duel_wins),
    messages: num(raw.messages),
    blocked: raw.blocked === true,
  };
}

export async function fetchProfile(username: string): Promise<RpcResult<PublicProfile>> {
  const res = await callRpc<Record<string, unknown>>('tradingo_profile', { p_token: sessionToken(), p_username: normalizeUsername(username) });
  return res.ok ? { ok: true, value: parseProfile(res.value) } : res;
}

/** Whether the server has blocking (version 10). */
export async function blocksAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 10;
}

/** Blocks (or unblocks) someone by @ID: their messages stop showing in your groups. */
export function blockUser(username: string, block: boolean): Promise<RpcResult<{ ok: boolean; blocked: boolean }>> {
  const token = sessionToken();
  if (!token) return Promise.resolve({ ok: false, error: 'session' });
  return callRpc('tradingo_block_user', { p_token: token, p_username: normalizeUsername(username), p_block: block });
}

export type BlockedUser = { username: string; name: string; avatar: number; blockedAt: string };

export async function fetchBlocked(): Promise<RpcResult<BlockedUser[]>> {
  const token = sessionToken();
  if (!token) return { ok: false, error: 'session' };
  const res = await callRpc<Record<string, unknown>[]>('tradingo_blocked_users', { p_token: token });
  if (!res.ok) return res;
  const rows = Array.isArray(res.value) ? res.value : [];
  return {
    ok: true,
    value: rows.map((r) => ({ username: String(r.username ?? ''), name: String(r.name ?? ''), avatar: num(r.avatar), blockedAt: String(r.blocked_at ?? '') })),
  };
}
