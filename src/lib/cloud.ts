import { create } from 'zustand';

import { pickData, useGame, type GameData } from '@/store/game';

import { mergeProgress } from './merge';
import { cloudEnabled, supabase } from './supabase';

type Status = 'off' | 'signedOut' | 'syncing' | 'synced' | 'error';

type CloudState = {
  status: Status;
  /** Mobile number of the signed-in cloud account. */
  mobile: string | null;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
};

/** Account and sync status, for the account screen. Not persisted: the Supabase session is. */
export const useCloud = create<CloudState>()(() => ({
  status: cloudEnabled ? 'signedOut' : 'off',
  mobile: null,
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
      useCloud.setState({ status: 'signedOut', mobile: null, userId: null });
      return;
    }
    const isNewUser = useCloud.getState().userId !== user.id;
    useCloud.setState({ mobile: mobileOf(user.email), userId: user.id });
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
  'Invalid login credentials': 'شماره موبایل یا رمز عبور درست نیست.',
  'User already registered': 'با این شماره قبلاً حساب ساخته شده؛ وارد شو.',
  'Email not confirmed': 'حساب هنوز فعال نشده. توی تنظیمات Supabase گزینه‌ی تأیید ایمیل (Confirm email) رو خاموش کن.',
};

const authError = (message: string) => AUTH_ERRORS[message] ?? 'ارتباط با سرور برقرار نشد؛ دوباره امتحان کن.';

/**
 * Accounts use the mobile number and a password, with no SMS code for now. Supabase gets
 * a stand-in email built from the number, so no SMS provider is needed; turn off
 * "Confirm email" in the Supabase project.
 */
const aliasEmail = (mobile: string) => `${mobile}@mobile.tradingo.app`;
const mobileOf = (email?: string | null) => (email?.endsWith('@mobile.tradingo.app') ? email.split('@')[0] : null);

/** Returns an error message, or null when the cloud account is signed in. */
export async function cloudSignIn(mobile: string, password: string): Promise<{ error: string | null; name?: string }> {
  if (!supabase) return { error: 'سرور وصل نیست.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email: aliasEmail(mobile), password });
  if (error || !data.user) return { error: authError(error?.message ?? '') };
  useCloud.setState({ mobile, userId: data.user.id });
  await syncNow();
  return { error: null, name: typeof data.user.user_metadata?.name === 'string' ? data.user.user_metadata.name : undefined };
}

/** Returns an error message, or null when the cloud account was created and signed in. */
export async function cloudSignUp(mobile: string, password: string, name: string): Promise<string | null> {
  if (!supabase) return 'سرور وصل نیست.';
  const { data, error } = await supabase.auth.signUp({ email: aliasEmail(mobile), password, options: { data: { name, mobile } } });
  if (error) return authError(error.message);
  if (!data.session || !data.user) return AUTH_ERRORS['Email not confirmed'];
  useCloud.setState({ mobile, userId: data.user.id });
  await syncNow();
  return null;
}

export async function cloudSignOut() {
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
