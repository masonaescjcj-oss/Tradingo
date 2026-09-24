import { COUNTRIES, DEFAULT_COUNTRY, findCountry } from './countries';
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

/**
 * A mobile number typed with a country picked: Iranian numbers as 09XXXXXXXXX (how accounts
 * have always kept them), others in the international form +<code><number>. Accepts Persian
 * digits, spaces and dashes, a leading 0, or the number already written with its code
 * (+44…, 0044…). Returns null when it can't be a mobile number.
 */
export function normalizePhone(iso: string, input: string): string | null {
  const country = findCountry(iso);
  if (country.iso === 'IR') return normalizeMobile(input);
  const typed = latinDigits(input).replace(/[\s\-().]/g, '');
  let digits: string;
  if (typed.startsWith('+')) digits = typed.slice(1);
  else if (typed.startsWith('00')) digits = typed.slice(2);
  else digits = country.dial + typed.replace(/^0/, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  // An Iranian number written with another country picked still finds its account.
  if (digits.startsWith('98')) return normalizeMobile(`+${digits}`);
  return `+${digits}`;
}

/** The login typed for a method (with the picked country for numbers), as the server expects it, or null. */
export function normalizeLogin(method: LoginMethod, input: string, iso: string = DEFAULT_COUNTRY): string | null {
  return method === 'email' ? normalizeEmail(input) : normalizePhone(iso, input);
}

/** The country a stored number belongs to (the longest matching code), Iran for 09 numbers. */
export function loginCountry(login: string): string {
  if (!login.startsWith('+')) return DEFAULT_COUNTRY;
  const digits = login.slice(1);
  const match = COUNTRIES.filter((c) => digits.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length)[0];
  return match?.iso ?? DEFAULT_COUNTRY;
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
  if (loginMethod(login) === 'email') return login;
  return login.startsWith('+') ? login : formatMobile(login);
}
