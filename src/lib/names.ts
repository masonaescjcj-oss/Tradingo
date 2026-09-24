import { getLang, type Lang } from '@/i18n/lang';

/** The name a learner has until they pick one, in each language. */
const DEFAULT_NAMES: Record<Lang, string> = { fa: 'تریدر', en: 'Trader' }; // i18n-ignore: both languages' default name

export const defaultNameFor = (lang: Lang): string => DEFAULT_NAMES[lang];

/** The default name in the app's language. */
export const defaultName = (): string => DEFAULT_NAMES[getLang()];

/** Whether `name` is still a default name (in either language), not one the learner chose. */
export const isDefaultName = (name: string): boolean => Object.values(DEFAULT_NAMES).includes(name);
