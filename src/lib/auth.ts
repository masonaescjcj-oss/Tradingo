import { useGame } from '@/store/game';

import { cloudDeleteAccount, cloudSignIn, cloudSignOut, cloudSignUp } from './cloud';
import { clearCoach } from './coachApi';
import { passwordHash } from './hash';
import { loginMethod } from './login';
import { cloudEnabled } from './supabase';

export const MIN_PASSWORD = 6;

/**
 * Creates the learner's account with an email or a mobile number (as normalizeLogin gives it):
 * on the server when Supabase is connected, and always on this device. Returns an error
 * message, or null on success. No verification code yet.
 */
export async function register(name: string, login: string, password: string): Promise<string | null> {
  let cloud = false;
  if (cloudEnabled) {
    const result = await cloudSignUp(login, password, name);
    if (result.error) return result.error;
    cloud = !result.offline;
  }
  useGame.getState().createAccount({
    name: name.trim() || 'تریدر',
    login,
    passwordHash: passwordHash(login, password),
    createdAt: Date.now(),
    cloud,
  });
  return null;
}

/** Signs in with an email or a mobile number and the password. Returns an error message, or null on success. */
export async function login(loginId: string, password: string): Promise<string | null> {
  if (cloudEnabled) {
    const result = await cloudSignIn(loginId, password);
    if (result.error) return result.error;
    if (!result.offline) {
      const user = useGame.getState().user;
      if (!user || user.login !== loginId) {
        useGame.getState().createAccount({
          name: result.name ?? useGame.getState().name,
          login: loginId,
          passwordHash: passwordHash(loginId, password),
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
  if (!user || user.login !== loginId) {
    const what = loginMethod(loginId) === 'email' ? 'ایمیل' : 'شماره';
    return `این ${what} روی این دستگاه ثبت نشده. اگه با گوشی یا مرورگر دیگه‌ای ثبت‌نام کردی، وقتی به سرور وصل باشی با همون ${what} وارد شو.`;
  }
  if (user.passwordHash !== passwordHash(loginId, password)) return 'رمز عبور درست نیست.';
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
  if (user.passwordHash !== passwordHash(user.login, password)) return 'رمز عبور درست نیست.';
  if (user.cloud) {
    if (!cloudEnabled) return 'برای حذف حساب باید به سرور وصل باشی.';
    const error = await cloudDeleteAccount(user.login, password);
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
 * If the email or number is already registered there, signs in instead. Returns an error message or null.
 */
export async function uploadAccount(password: string): Promise<string | null> {
  const user = useGame.getState().user;
  if (!user) return 'حسابی روی این دستگاه نیست.';
  if (user.passwordHash !== passwordHash(user.login, password)) return 'رمز عبور درست نیست.';
  let result = await cloudSignUp(user.login, password, user.name);
  if (result.code === 'mobile_taken' || result.code === 'email_taken') result = await cloudSignIn(user.login, password);
  if (result.error) return result.error;
  if (result.offline) return 'سرور هنوز در دسترس نیست؛ بعداً دوباره امتحان کن.';
  useGame.getState().createAccount({ ...user, cloud: true });
  return null;
}
