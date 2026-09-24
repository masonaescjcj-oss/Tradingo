import { useGame } from '@/store/game';

import { cloudDeleteAccount, cloudSignIn, cloudSignOut, cloudSignUp } from './cloud';
import { clearCoach } from './coachApi';
import { passwordHash } from './hash';
import { cloudEnabled } from './supabase';

export const MIN_PASSWORD = 6;

/**
 * Creates the learner's account: on the server when Supabase is connected, and always on
 * this device. Returns an error message, or null on success. No verification code yet.
 */
export async function register(name: string, mobile: string, password: string): Promise<string | null> {
  let cloud = false;
  if (cloudEnabled) {
    const result = await cloudSignUp(mobile, password, name);
    if (result.error) return result.error;
    cloud = !result.offline;
  }
  useGame.getState().createAccount({
    name: name.trim() || 'تریدر',
    mobile,
    passwordHash: passwordHash(mobile, password),
    createdAt: Date.now(),
    cloud,
  });
  return null;
}

/** Signs in with mobile and password. Returns an error message, or null on success. */
export async function login(mobile: string, password: string): Promise<string | null> {
  if (cloudEnabled) {
    const result = await cloudSignIn(mobile, password);
    if (result.error) return result.error;
    if (!result.offline) {
      const user = useGame.getState().user;
      if (!user || user.mobile !== mobile) {
        useGame.getState().createAccount({
          name: result.name ?? useGame.getState().name,
          mobile,
          passwordHash: passwordHash(mobile, password),
          createdAt: Date.now(),
          cloud: true,
        });
      }
      useGame.getState().signInAccount();
      return null;
    }
  }
  // Device-only account (no server, or the server is unreachable).
  const user = useGame.getState().user;
  if (!user || user.mobile !== mobile) {
    return 'این شماره روی این دستگاه ثبت نشده. اگه با گوشی یا مرورگر دیگه‌ای ثبت‌نام کردی، وقتی به سرور وصل باشی از همون شماره وارد شو.';
  }
  if (user.passwordHash !== passwordHash(mobile, password)) return 'رمز عبور درست نیست.';
  useGame.getState().signInAccount();
  return null;
}

/**
 * Deletes the account for good: on the server (after checking the password) and then all
 * progress on this device. Returns an error message, or null when it's done.
 */
export async function deleteAccount(password: string): Promise<string | null> {
  const user = useGame.getState().user;
  if (!user) return 'حسابی روی این دستگاه نیست.';
  if (user.passwordHash !== passwordHash(user.mobile, password)) return 'رمز عبور درست نیست.';
  if (user.cloud) {
    if (!cloudEnabled) return 'برای حذف حساب باید به سرور وصل باشی.';
    const error = await cloudDeleteAccount(user.mobile, password);
    if (error) return error;
  }
  useGame.getState().resetAll();
  clearCoach();
  return null;
}

/** Signs out; progress stays on this device and comes back after signing in again. */
export async function logout() {
  if (cloudEnabled) await cloudSignOut();
  useGame.getState().signOutAccount();
}

/**
 * Moves a device-only account (made while the server wasn't set up) to the server.
 * If the number is already registered there, signs in instead. Returns an error message or null.
 */
export async function uploadAccount(password: string): Promise<string | null> {
  const user = useGame.getState().user;
  if (!user) return 'حسابی روی این دستگاه نیست.';
  if (user.passwordHash !== passwordHash(user.mobile, password)) return 'رمز عبور درست نیست.';
  let result = await cloudSignUp(user.mobile, password, user.name);
  if (result.error === 'با این شماره قبلاً حساب ساخته شده؛ وارد شو.') result = await cloudSignIn(user.mobile, password);
  if (result.error) return result.error;
  if (result.offline) return 'سرور هنوز در دسترس نیست؛ بعداً دوباره امتحان کن.';
  useGame.getState().createAccount({ ...user, cloud: true });
  return null;
}
