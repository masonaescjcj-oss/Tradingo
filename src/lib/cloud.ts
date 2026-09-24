import { create } from 'zustand';

import { pickData, useGame, type GameData } from '@/store/game';

import { mergeProgress } from './merge';
import { safeStorage } from './storage';
import { cloudEnabled, supabase } from './supabase';

type Status = 'off' | 'signedOut' | 'syncing' | 'synced' | 'error';

type CloudState = {
  status: Status;
  /** Mobile number of the signed-in cloud account. */
  mobile: string | null;
  /** Set while signed in to the server (the mobile number). */
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
};

/** Server account and sync status, for the account and league screens. */
export const useCloud = create<CloudState>()(() => ({
  status: cloudEnabled ? 'signedOut' : 'off',
  mobile: null,
  userId: null,
  lastSyncedAt: null,
  error: null,
}));

type Session = { token: string; mobile: string };
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

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new CloudError('missing', 'not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  let result;
  try {
    result = await supabase.rpc(fn, args).abortSignal(controller.signal);
  } catch (e) {
    throw new CloudError('network', e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }
  const { data, error } = result;
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
    next ? { mobile: next.mobile, userId: next.mobile, error: null } : { status: cloudEnabled ? 'signedOut' : 'off', mobile: null, userId: null },
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
  if (e instanceof CloudError && e.kind === 'network') return 'ارتباط با سرور برقرار نشد؛ پیشرفتت روی دستگاه امنه و بعداً همگام می‌شه.';
  return 'همگام‌سازی با سرور انجام نشد.';
}

async function handleFailure(e: unknown) {
  if (e instanceof CloudError && e.kind === 'session') {
    await setSession(null);
    useCloud.setState({ error: 'نشستت روی سرور تموم شده؛ برای همگام‌سازی دوباره وارد شو.' });
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
  } catch (e) {
    await handleFailure(e);
  }
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
      const saved = JSON.parse(raw) as Session;
      if (saved.token && saved.mobile) setSession(saved).then(syncNow);
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
  mobile_taken: 'با این شماره قبلاً حساب ساخته شده؛ وارد شو.',
  invalid_credentials: 'شماره موبایل یا رمز عبور درست نیست.',
  locked: 'چند بار رمز اشتباه زده شده؛ ۱۵ دقیقه‌ی دیگه دوباره امتحان کن.',
  weak_password: 'رمز باید بین ۶ تا ۷۲ کاراکتر باشه.',
  invalid_mobile: 'شماره موبایل درست نیست.',
  invalid_name: 'اسم باید بین ۱ تا ۲۰ حرف باشه.',
  rate_limited: 'الان ثبت‌نام‌ها زیاده؛ یه دقیقه‌ی دیگه امتحان کن.',
};

type AuthResult = { error: string | null; offline?: boolean; name?: string };

async function authenticate(fn: 'tradingo_sign_up' | 'tradingo_sign_in', args: Record<string, unknown>, mobile: string): Promise<AuthResult> {
  // Without the server functions (not installed yet, or unreachable) the account stays on this device.
  if (!(await serverReady())) return { error: null, offline: true };
  try {
    const res = await rpc<{ token?: string; name?: string; error?: string }>(fn, args);
    if (res.error || !res.token) return { error: AUTH_ERRORS[res.error ?? ''] ?? 'ثبت‌نام انجام نشد؛ دوباره امتحان کن.' };
    await setSession({ token: res.token, mobile });
    await syncNow();
    return { error: null, name: res.name };
  } catch (e) {
    if (e instanceof CloudError && (e.kind === 'network' || e.kind === 'missing')) return { error: null, offline: true };
    return { error: 'ارتباط با سرور برقرار نشد؛ دوباره امتحان کن.' };
  }
}

/** Creates the server account. `offline` means the server isn't available and the caller keeps a device-only account. */
export function cloudSignUp(mobile: string, password: string, name: string): Promise<AuthResult> {
  return authenticate('tradingo_sign_up', { p_mobile: mobile, p_password: password, p_name: name }, mobile);
}

/** Signs in on the server and merges the saved progress. */
export function cloudSignIn(mobile: string, password: string): Promise<AuthResult> {
  return authenticate('tradingo_sign_in', { p_mobile: mobile, p_password: password }, mobile);
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
export async function cloudDeleteAccount(mobile: string, password: string): Promise<string | null> {
  try {
    let token = session?.token ?? null;
    if (!token) {
      const res = await rpc<{ token?: string; error?: string }>('tradingo_sign_in', { p_mobile: mobile, p_password: password });
      if (!res.token) return AUTH_ERRORS[res.error ?? ''] ?? 'ورود انجام نشد؛ دوباره امتحان کن.';
      token = res.token;
    }
    const res = await rpc<{ ok?: boolean; error?: string }>('tradingo_delete_account', { p_token: token, p_password: password });
    if (res.error === 'invalid_credentials') return 'رمز عبور درست نیست.';
    if (res.error) return AUTH_ERRORS[res.error] ?? 'حذف حساب انجام نشد؛ دوباره امتحان کن.';
    await setSession(null);
    return null;
  } catch {
    return 'ارتباط با سرور برقرار نشد؛ دوباره امتحان کن.';
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
