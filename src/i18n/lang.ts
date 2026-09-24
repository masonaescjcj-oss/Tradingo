/** The app's language: Persian (the default, right to left) or English (left to right). */
export type Lang = 'fa' | 'en';

let current: Lang = 'fa';

export const getLang = (): Lang => current;
export const isEn = (): boolean => current === 'en';

/** Set by the root layout from the saved setting, before anything renders with it. */
export function setLang(lang: Lang) {
  current = lang;
}
