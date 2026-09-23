import { create } from 'zustand';

import { pickData, useGame, type GameData } from '@/store/game';

import { mergeProgress } from './merge';
import { cloudEnabled, supabase } from './supabase';

type Status = 'off' | 'signedOut' | 'syncing' | 'synced' | 'error';

type CloudState = {
  status: Status;
  email: string | null;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
};

/** Account and sync status, for the account screen. Not persisted: the Supabase session is. */
export const useCloud = create<CloudState>()(() => ({
  status: cloudEnabled ? 'signedOut' : 'off',
  email: null,
  userId: null,
  lastSyncedAt: null,
  error: null,
}));

async function push(userId: string) {
  if (!supabase) return;
  const s = pickData(useGame.getState());
  const results = await Promise.all([
    supabase.from('progress').upsert({ user_id: userId, state: s }),
    supabase.from('profiles').upsert({ id: userId, name: s.name, xp: s.xp, streak: s.streak, league: s.league }),
    s.weeklyXp > 0
      ? supabase.from('weekly_xp').upsert({ user_id: userId, week: s.weekKey, league: s.league, name: s.name, xp: Math.min(s.weeklyXp, 50000) })
      : Promise.resolve({ error: null }),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

async function pullAndMerge(userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from('progress').select('state').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.state) {
    const merged = mergeProgress(pickData(useGame.getState()), { ...pickData(useGame.getState()), ...(data.state as Partial<GameData>) });
    useGame.setState(merged);
  }
}

/** Pulls, merges and pushes progress now. */
export async function syncNow() {
  const { userId } = useCloud.getState();
  if (!supabase || !userId) return;
  useCloud.setState({ status: 'syncing', error: null });
  try {
    await pullAndMerge(userId);
    await push(userId);
    useCloud.setState({ status: 'synced', lastSyncedAt: Date.now() });
  } catch (e) {
    useCloud.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

let started = false;

/**
 * Keeps progress in sync with Supabase while signed in: merges on sign-in and
 * pushes a few seconds after each change. Safe to call more than once.
 */
export function startCloudSync() {
  if (!supabase || started) return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    if (!user) {
      useCloud.setState({ status: 'signedOut', email: null, userId: null });
      return;
    }
    const isNewUser = useCloud.getState().userId !== user.id;
    useCloud.setState({ email: user.email ?? null, userId: user.id });
    // Supabase warns against awaiting other Supabase calls inside this callback.
    if (isNewUser || event === 'SIGNED_IN') setTimeout(syncNow, 0);
  });

  useGame.subscribe(() => {
    const { userId, status } = useCloud.getState();
    if (!userId || status === 'syncing') return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await push(userId);
        useCloud.setState({ status: 'synced', lastSyncedAt: Date.now(), error: null });
      } catch (e) {
        useCloud.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    }, 3000);
  });
}

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'ایمیل یا رمز عبور درست نیست.',
  'User already registered': 'با این ایمیل قبلاً حساب ساخته شده؛ وارد شو.',
  'Email not confirmed': 'اول ایمیلت رو تأیید کن؛ لینک تأیید برات فرستاده شده.',
};

const authError = (message: string) => AUTH_ERRORS[message] ?? message;

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'سرور وصل نیست.';
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? authError(error.message) : null;
}

/** Returns an error message, 'confirm' when the email must be confirmed first, or null when signed in. */
export async function signUp(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'سرور وصل نیست.';
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return authError(error.message);
  return data.session ? null : 'confirm';
}

export async function signOut() {
  await supabase?.auth.signOut();
}

/** Real players in the user's league this week, best first (excluding the user). */
export async function fetchLeagueBoard(week: string, league: number): Promise<{ name: string; xp: number }[]> {
  const { userId } = useCloud.getState();
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('weekly_xp')
    .select('user_id, name, xp')
    .eq('week', week)
    .eq('league', league)
    .neq('user_id', userId)
    .order('xp', { ascending: false })
    .limit(14);
  if (error || !data) return [];
  return data.map((r) => ({ name: String(r.name), xp: Number(r.xp) }));
}
