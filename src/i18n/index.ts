/**
 * Translating the app. Persian is the source language: every user-facing string is written in
 * Persian and passed through t(), which looks it up in the English dictionary (src/i18n/en)
 * when the app is in English. Variables go in {braces}:
 *
 *   t('سلام {name}!', { name })
 *   t('{n} روز پیاپی', { n: fa(streak), count: streak })   // English: '{n}-day streak|{n}-day streak'
 *
 * An English entry may hold 'singular|plural'; `count` picks one. A missing entry falls back
 * to the Persian text, so nothing ever shows empty. Lesson content is translated separately
 * (src/content/i18n).
 */
import { EN } from './en';
import { getLang, isEn, type Lang } from './lang';

export { getLang, isEn, setLang, type Lang } from './lang';

export function t(fa: string, vars?: Record<string, string | number>): string {
  let out = fa;
  if (getLang() === 'en') {
    const en = EN[fa];
    if (en) {
      out = en;
      if (vars && 'count' in vars && out.includes('|')) {
        const [one, many] = out.split('|');
        out = Number(vars.count) === 1 ? one : many;
      }
    }
  }
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

/** The side text starts on: right in Persian, left in English (for inputs and aligned text). */
export const textStart = (): 'left' | 'right' => (isEn() ? 'left' : 'right');

/** Layout direction of the whole app. */
export const layoutDir = (): 'ltr' | 'rtl' => (isEn() ? 'ltr' : 'rtl');

/** The locale for dates and times: Persian (solar calendar) or English. */
export const dateLocale = (): string => (isEn() ? 'en-US' : 'fa-IR');

/** One of two values by language, for things that aren't strings (sizes, styles). */
export function byLang<T>(fa: T, en: T): T {
  return getLang() === 'en' ? en : fa;
}

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'fa', label: 'فارسی' },
  { id: 'en', label: 'English' },
];
