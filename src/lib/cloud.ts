import type { SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';

import { t } from '@/i18n';
import { pickData, useGame, type GameData } from '@/store/game';

import { loginMethod, type LoginMethod } from './login';
import { mergeProgress } from './merge';
import { safeStorage } from './storage';

import { cloudEnabled, supabase, supabaseDirect } from './supabase';

type Status = 'off' | 'signedOut' | 'syncing' | 'synced' | 'error';

type CloudState = {
  status: Status;
  /** The email or mobile number the server account signs in with. */
  login: string | null;
  /** Set while signed in to the server (the login). */
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
  /** The account can open the admin panel. */
  admin: boolean;
  /** An admin closed chat for this account: until then (ISO time), or for good ('forever'). */
  muted: string | null;
};

/** Server account and sync status, for the account and league screens. */
export const useCloud = create<CloudState>()(() => ({
  status: cloudEnabled ? 'signedOut' : 'off',
  login: null,
  userId: null,
  lastSyncedAt: null,
  error: null,
  admin: false,
  muted: null,
}));

type Session = { token: string; login: string };
const SESSION_KEY = 'tradingo-session';
let session: Session | null = null;

/** Why a server call failed: the functions aren't installed, the session ended, the network, or anything else. */
export class CloudError extends Error {
  constructor(
    readonly kind: 'missing' | 'session' | 'network' | 'server',
    message: string,
  ) {
    super(message);
  }
}

/** Server calls give up after this long, so a slow or filtered connection never leaves the app waiting. */
const RPC_TIMEOUT_MS = 10_000;

/** After the relay fails to connect, calls go straight to the project until that fails too. */
let viaDirect = false;

type Attempt = { result?: Awaited<ReturnType<SupabaseClient['rpc']>>; unreachable?: boolean; error?: unknown };

async function attempt(client: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const result = await client.rpc(fn, args).abortSignal(controller.signal);
    // A request that never got an answer (no connection) is safe to send another way; a timeout
    // might have reached the server, so it isn't retried (it could create a duel twice).
    const failedToConnect = !!result.error && !result.error.code && !controller.signal.aborted;
    return failedToConnect ? { unreachable: true, error: result.error } : { result };
  } catch (e) {
    return { unreachable: !controller.signal.aborted, error: e };
  } finally {
    clearTimeout(timer);
  }
}

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new CloudError('missing', 'not configured');
  const routes = supabaseDirect ? (viaDirect ? [supabaseDirect, supabase] : [supabase, supabaseDirect]) : [supabase];
  let got: Attempt = {};
  for (const client of routes) {
    got = await attempt(client, fn, args);
    if (!got.unreachable) {
      viaDirect = client === supabaseDirect;
      break;
    }
  }
  if (!got.result) {
    const e = got.error;
    throw new CloudError('network', e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e));
  }
  const { data, error } = got.result;
  if (error) {
    if (error.code === 'PGRST202' || error.code === 'PGRST205' || error.code === '42883') throw new CloudError('missing', error.message);
    if (error.message?.includes('invalid_session')) throw new CloudError('session', error.message);
    if (!error.code) throw new CloudError('network', error.message);
    throw new CloudError('server', error.message);
  }
  return data as T;
}

let ready: Promise<boolean> | null = null;

/** Whether the tradingo_* functions are installed and reachable (asked once per app run). */
export function serverReady(): Promise<boolean> {
  if (!cloudEnabled) return Promise.resolve(false);
  if (!ready) {
    ready = rpc<number>('tradingo_version')
      .then(() => true)
      .catch((e) => {
        // Try again next time if it was just the network.
        if (!(e instanceof CloudError) || e.kind !== 'missing') ready = null;
        return false;
      });
  }
  return ready;
}

let version: Promise<number> | null = null;

/** Which server migration is installed (1: accounts and sync, 2: chat), or 0 when it can't be reached. */
export function serverVersion(): Promise<number> {
  if (!cloudEnabled) return Promise.resolve(0);
  if (!version) {
    version = rpc<number>('tradingo_version')
      .then((v) => Number(v) || 0)
      .catch((e) => {
        if (!(e instanceof CloudError) || e.kind !== 'missing') version = null;
        return 0;
      });
  }
  return version;
}

/** The signed-in server session's token, for features that call the server themselves (chat). */
export function sessionToken(): string | null {
  return session?.token ?? null;
}

/** For features that find the server session has ended: signs out of the server like sync does. */
export function sessionEnded(): Promise<void> {
  return handleFailure(new CloudError('session', 'invalid_session'));
}

export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Runs a server call for a feature screen: an `{ error }` answer or a failure becomes an
 * error kind the screen can show ('session', 'network', 'server' or the function's own).
 */
export async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  try {
    const value = await rpc<T & { error?: string }>(fn, args);
    if (value && typeof value === 'object' && 'error' in value && value.error) return { ok: false, error: String(value.error) };
    return { ok: true, value };
  } catch (e) {
    if (e instanceof CloudError && e.kind === 'session') {
      await sessionEnded();
      return { ok: false, error: 'session' };
    }
    return { ok: false, error: e instanceof CloudError && e.kind === 'network' ? 'network' : 'server' };
  }
}

async function setSession(next: Session | null) {
  session = next;
  useCloud.setState(
    next
      ? { login: next.login, userId: next.login, error: null }
      : { status: cloudEnabled ? 'signedOut' : 'off', login: null, userId: null, admin: false, muted: null },
  );
  if (next) await safeStorage.setItem(SESSION_KEY, JSON.stringify(next));
  else await safeStorage.removeItem(SESSION_KEY);
}

/** What goes to the server: everything except this device's own account and sign-in state. */
function syncable(state: GameData): Partial<GameData> {
  const { user: _user, signedOut: _signedOut, ...rest } = state;
  return rest;
}

async function push() {
  if (!session) return;
  const s = pickData(useGame.getState());
  await rpc('tradingo_save', {
    p_token: session.token,
    p_state: syncable(s),
    p_week: s.weekKey,
    p_weekly_xp: Math.min(s.weeklyXp, 50000),
    p_league: s.league,
  });
}

async function pullAndMerge() {
  if (!session) return;
  const data = await rpc<{ state: Partial<GameData> | null } | null>('tradingo_load', { p_token: session.token });
  if (data?.state) {
    const local = pickData(useGame.getState());
    const merged = mergeProgress(local, { ...local, ...syncable({ ...local, ...data.state } as GameData) });
    useGame.setState({ ...merged, user: local.user, signedOut: local.signedOut });
  }
}

function describe(e: unknown): string {
  if (e instanceof CloudError && e.kind === 'network') return t('ارتباط با سرور برقرار نشد؛ پیشرفتت روی دستگاه امنه و بعداً همگام می‌شه.');
  return t('همگام‌سازی با سرور انجام نشد.');
}

async function handleFailure(e: unknown) {
  if (e instanceof CloudError && e.kind === 'session') {
    await setSession(null);
    useCloud.setState({ error: t('نشستت روی سرور تموم شده؛ برای همگام‌سازی دوباره وارد شو.') });
    return;
  }
  useCloud.setState({ status: 'error', error: describe(e) });
}

/** Pulls, merges and pushes progress now. */
export async function syncNow() {
  if (!session) return;
  useCloud.setState({ status: 'syncing', error: null });
  try {
    await pullAndMerge();
    await push();
    useCloud.setState({ status: 'synced', lastSyncedAt: Date.now() });
    void refreshStatus();
  } catch (e) {
    await handleFailure(e);
  }
}

/** Keeps the account's @ID and picture on this device (as the server has them). */
export function rememberProfile(username: string | null | undefined, avatar: number | null | undefined) {
  const s = useGame.getState();
  const next: Partial<GameData> = {};
  if (typeof avatar === 'number' && avatar !== s.avatar) next.avatar = avatar;
  if (username && s.user && s.user.username !== username) next.user = { ...s.user, username };
  if (Object.keys(next).length) useGame.setState(next);
}

type AccountStatus = { admin?: boolean; muted?: boolean; muted_until?: string | null; username?: string; avatar?: number };

/**
 * Whether the account is an admin and whether its chat is closed (servers with the admin panel,
 * version 6), and its @ID and picture (version 9). A picture chosen on this device before the
 * account existed goes up to the server once.
 */
export async function refreshStatus(): Promise<void> {
  if (!session || (await serverVersion()) < 6) return;
  const res = await callRpc<AccountStatus>('tradingo_account_status', { p_token: session.token });
  if (!res.ok) return;
  useCloud.setState({ admin: res.value.admin === true, muted: res.value.muted ? (res.value.muted_until ?? 'forever') : null });
  const { username, avatar } = res.value;
  if (!username) return;
  const local = useGame.getState().avatar;
  if (avatar === 0 && local > 0) {
    const up = await callRpc<{ username: string; avatar: number }>('tradingo_set_profile', { p_token: session.token, p_username: username, p_avatar: local });
    if (up.ok) return rememberProfile(up.value.username, up.value.avatar);
  }
  rememberProfile(username, avatar);
}

let started = false;

/** Restores the saved session and pushes progress a few seconds after each change. Safe to call more than once. */
export function startCloudSync() {
  if (!cloudEnabled || started) return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  safeStorage.getItem(SESSION_KEY).then((raw) => {
    if (!raw || session) return;
    try {
      // Sessions saved before email sign-in kept the mobile number as `mobile`.
      const saved = JSON.parse(raw) as Partial<Session> & { mobile?: string };
      const login = saved.login ?? saved.mobile;
      if (saved.token && login) setSession({ token: saved.token, login }).then(syncNow);
    } catch {
      // A broken saved session is simply ignored.
    }
  });

  useGame.subscribe(() => {
    if (!session || useCloud.getState().status === 'syncing') return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await push();
        useCloud.setState({ status: 'synced', lastSyncedAt: Date.now(), error: null });
      } catch (e) {
        await handleFailure(e);
      }
    }, 3000);
  });
}

const AUTH_ERRORS: Record<string, string> = {
  mobile_taken: 'با این شماره قبلاً حساب ساخته شده؛ وارد شو.', // i18n-ignore: translated where shown
  email_taken: 'با این ایمیل قبلاً حساب ساخته شده؛ وارد شو.', // i18n-ignore: translated where shown
  locked: 'چند بار رمز اشتباه زده شده؛ ۱۵ دقیقه‌ی دیگه دوباره امتحان کن.', // i18n-ignore: translated where shown
  weak_password: 'رمز باید بین ۶ تا ۷۲ کاراکتر باشه.', // i18n-ignore: translated where shown
  invalid_mobile: 'شماره موبایل درست نیست.', // i18n-ignore: translated where shown
  invalid_name: 'اسم باید بین ۱ تا ۲۰ حرف باشه.', // i18n-ignore: translated where shown
  rate_limited: 'الان ثبت‌نام‌ها زیاده؛ یه دقیقه‌ی دیگه امتحان کن.', // i18n-ignore: translated where shown
  banned: 'این حساب به خاطر نقض قوانین چارتون مسدود شده.', // i18n-ignore: translated where shown
};

/** A server error as the learner reads it; wrong-login errors name the email or the number. */
export function authErrorText(code: string, method: LoginMethod, fallback = t('انجام نشد؛ دوباره امتحان کن.')): string {
  const email = method === 'email';
  if (code === 'invalid_credentials') return email ? t('ایمیل یا رمز عبور درست نیست.') : t('شماره موبایل یا رمز عبور درست نیست.');
  if (code === 'invalid_login') return email ? t('ایمیل درست نیست.') : t('شماره موبایل درست نیست.');
  return AUTH_ERRORS[code] ? t(AUTH_ERRORS[code]) : fallback;
}

/** `code` is the server's error, for callers that act on it (an account that already exists). */
type AuthResult = { error: string | null; code?: string; offline?: boolean; name?: string };

/** Servers from version 8 sign in with an email or a number; older ones only with a number. */
async function emailSignIn(): Promise<boolean | null> {
  const v = await serverVersion();
  return v === 0 ? null : v >= 8;
}

const emailNotReady = () => t('ورود با ایمیل هنوز روی سرور فعال نشده؛ فعلاً با شماره موبایل ادامه بده.');

async function authenticate(fn: string, args: Record<string, unknown>, login: string, fallback: string): Promise<AuthResult> {
  // Without the server functions (not installed yet, or unreachable) the account stays on this device.
  if (!(await serverReady())) return { error: null, offline: true };
  try {
    const res = await rpc<{ token?: string; name?: string; error?: string }>(fn, args);
    if (res.error || !res.token) return { error: authErrorText(res.error ?? '', loginMethod(login), fallback), code: res.error };
    await setSession({ token: res.token, login });
    await syncNow();
    return { error: null, name: res.name };
  } catch (e) {
    if (e instanceof CloudError && (e.kind === 'network' || e.kind === 'missing')) return { error: null, offline: true };
    return { error: t('ارتباط با سرور برقرار نشد؛ دوباره امتحان کن.') };
  }
}

/** Creates the server account. `offline` means the server isn't available and the caller keeps a device-only account. */
export async function cloudSignUp(login: string, password: string, name: string): Promise<AuthResult> {
  const modern = await emailSignIn();
  if (modern === false && loginMethod(login) === 'email') return { error: emailNotReady() };
  return modern === false
    ? authenticate('tradingo_sign_up', { p_mobile: login, p_password: password, p_name: name }, login, t('ثبت‌نام انجام نشد؛ دوباره امتحان کن.'))
    : authenticate('tradingo_register', { p_login: login, p_password: password, p_name: name }, login, t('ثبت‌نام انجام نشد؛ دوباره امتحان کن.'));
}

/** Signs in on the server and merges the saved progress. */
export async function cloudSignIn(login: string, password: string): Promise<AuthResult> {
  const modern = await emailSignIn();
  if (modern === false && loginMethod(login) === 'email') return { error: emailNotReady() };
  return modern === false
    ? authenticate('tradingo_sign_in', { p_mobile: login, p_password: password }, login, t('ورود انجام نشد؛ دوباره امتحان کن.'))
    : authenticate('tradingo_login', { p_login: login, p_password: password }, login, t('ورود انجام نشد؛ دوباره امتحان کن.'));
}

export async function cloudSignOut() {
  const token = session?.token;
  await setSession(null);
  if (token) await rpc('tradingo_sign_out', { p_token: token }).catch(() => {});
}

/**
 * Deletes the server account after checking the password; signs in first if this device's
 * session has ended. Returns an error message, or null once the account is gone.
 */
export async function cloudDeleteAccount(login: string, password: string): Promise<string | null> {
  try {
    let token = session?.token ?? null;
    if (!token) {
      const modern = (await emailSignIn()) !== false;
      const res = await rpc<{ token?: string; error?: string }>(
        modern ? 'tradingo_login' : 'tradingo_sign_in',
        modern ? { p_login: login, p_password: password } : { p_mobile: login, p_password: password },
      );
      if (!res.token) return authErrorText(res.error ?? '', loginMethod(login), t('ورود انجام نشد؛ دوباره امتحان کن.'));
      token = res.token;
    }
    const res = await rpc<{ ok?: boolean; error?: string }>('tradingo_delete_account', { p_token: token, p_password: password });
    if (res.error === 'invalid_credentials') return t('رمز عبور درست نیست.');
    if (res.error) return authErrorText(res.error, loginMethod(login), t('حذف حساب انجام نشد؛ دوباره امتحان کن.'));
    await setSession(null);
    return null;
  } catch {
    return t('ارتباط با سرور برقرار نشد؛ دوباره امتحان کن.');
  }
}

export async function cloudSetName(name: string) {
  if (!session) return;
  await rpc('tradingo_set_name', { p_token: session.token, p_name: name }).catch(handleFailure);
}

/** Real players in the user's league this week, best first (excluding the user). */
export async function fetchLeagueBoard(week: string, league: number): Promise<{ name: string; xp: number }[]> {
  if (!session) return [];
  try {
    const rows = await rpc<{ player_name: string; weekly_xp: number }[]>('tradingo_league', { p_token: session.token, p_week: week, p_league: league });
    return (rows ?? []).map((r) => ({ name: String(r.player_name), xp: Number(r.weekly_xp) }));
  } catch {
    return [];
  }
}
