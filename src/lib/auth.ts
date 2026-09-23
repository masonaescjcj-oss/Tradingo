import { useGame } from '@/store/game';

import { cloudSignIn, cloudSignOut, cloudSignUp } from './cloud';
import { passwordHash } from './hash';
import { cloudEnabled } from './supabase';

export const MIN_PASSWORD = 6;

/**
 * Creates the learner's account: on the server when Supabase is connected, and always on
 * this device. Returns an error message, or null on success. No verification code yet.
 */
export async function register(name: string, mobile: string, password: string): Promise<string | null> {
  if (cloudEnabled) {
    const error = await cloudSignUp(mobile, password, name);
    if (error) return error;
  }
  useGame.getState().createAccount({
    name: name.trim() || 'تریدر',
    mobile,
    passwordHash: passwordHash(mobile, password),
    createdAt: Date.now(),
    cloud: cloudEnabled,
  });
  return null;
}

/** Signs in with mobile and password. Returns an error message, or null on success. */
export async function login(mobile: string, password: string): Promise<string | null> {
  const game = useGame.getState();
  if (cloudEnabled) {
    const { error, name } = await cloudSignIn(mobile, password);
    if (error) return error;
    const user = useGame.getState().user;
    if (!user || user.mobile !== mobile) {
      game.createAccount({
        name: name ?? useGame.getState().name,
        mobile,
        passwordHash: passwordHash(mobile, password),
        createdAt: Date.now(),
        cloud: true,
      });
    }
    useGame.getState().signInAccount();
    return null;
  }
  const user = game.user;
  if (!user || user.mobile !== mobile) {
    return 'این شماره روی این دستگاه ثبت نشده. تا وقتی سرور وصل نشده، ورود فقط روی دستگاهی کار می‌کنه که باهاش ثبت‌نام کردی.';
  }
  if (user.passwordHash !== passwordHash(mobile, password)) return 'رمز عبور درست نیست.';
  game.signInAccount();
  return null;
}

/** Signs out; progress stays on this device and comes back after signing in again. */
export async function logout() {
  if (cloudEnabled) await cloudSignOut();
  useGame.getState().signOutAccount();
}
