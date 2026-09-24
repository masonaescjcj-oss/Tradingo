import { formatMobile, latinDigits, normalizeMobile } from './phone';

/** How the learner signs in: with an email (the default) or an Iranian mobile number. */
export type LoginMethod = 'email' | 'mobile';

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/**
 * An email as accounts keep it: trimmed, lower case, Persian digits as Latin ones, without the
 * invisible marks a Persian keyboard can add. Returns null when it isn't an email address.
 */
export function normalizeEmail(input: string): string | null {
  const email = latinDigits(input)
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .trim()
    .toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** The login typed for a method, as the server expects it, or null when it isn't valid. */
export function normalizeLogin(method: LoginMethod, input: string): string | null {
  return method === 'email' ? normalizeEmail(input) : normalizeMobile(input);
}

/** Which kind a stored login is. */
export function loginMethod(login: string): LoginMethod {
  return login.includes('@') ? 'email' : 'mobile';
}

/** An account saved before email sign-in, when its mobile number was its login. */
export function withLogin<T extends { login?: string; mobile?: string }>(user: T): Omit<T, 'mobile' | 'login'> & { login: string } {
  const { mobile, login, ...rest } = user;
  return { ...rest, login: login ?? mobile ?? '' };
}

/** A stored login for display: the email as it is, a number in groups (0912 345 6789). */
export function loginText(login: string): string {
  return loginMethod(login) === 'email' ? login : formatMobile(login);
}
