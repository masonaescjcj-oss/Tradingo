import { addDays, dayKey } from '@/utils/date';
import { fa } from '@/utils/format';

import { currentStreak } from './progress';

/** Hours the learner can pick for the daily reminder. */
export const REMINDER_HOURS = [9, 13, 17, 20, 22] as const;
export const DEFAULT_REMINDER_HOUR = 20;
/** Reminders stop after a week without practice; opening the app plans the next week again. */
export const REMINDER_DAYS = 7;

export type ReminderState = { streak: number; lastActiveDay: string | null; freezes?: number };
export type PlannedReminder = { date: Date; title: string; body: string };

// For days when there's no streak to save; picked by date so they vary from day to day.
const NUDGES: [string, string][] = [
  ['شمعک منتظرته 🕯️', 'یه درس ۵ دقیقه‌ای، یه قدم جلوتر توی ترید.'],
  ['بازار منتظر کسی نمی‌مونه 📈', 'امروز یه الگوی تازه یاد بگیر؛ فقط چند دقیقه طول می‌کشه.'],
  ['دوئل امروزت رو زدی؟ ⚔️', 'با شمعک یه دوئل سه‌راندی بزن و سکه جمع کن.'],
  ['مأموریت‌های امروزت آماده‌ست 🎯', 'سه تا مأموریت و یه صندوق جایزه منتظرته.'],
  ['شمعک دلش برات تنگ شده 🥺', 'چند روزه ندیدیمت. یه درس کوتاه چطوره؟'],
  ['هر روز یه قدم کوچیک 🚀', 'تریدرهای خوب هر روز یه چیز تازه یاد می‌گیرن.'],
];

/**
 * The reminders for the next week at `hour`: none today once the learner has practised, and the
 * first one names the streak that's about to go out, if there is one.
 */
export function planReminders(s: ReminderState, hour: number, now: Date = new Date()): PlannedReminder[] {
  const today = dayKey(now);
  const practisedToday = s.lastActiveDay === today;
  const out: PlannedReminder[] = [];
  for (let i = 0; i < REMINDER_DAYS; i++) {
    const day = addDays(now, i);
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
    if (date.getTime() <= now.getTime() + 60_000) continue;
    if (i === 0 && practisedToday) continue;
    // The streak still alive on that day if the learner hasn't practised yet by then.
    const alive = i === 0 ? currentStreak(s, today) : i === 1 && practisedToday ? s.streak : 0;
    if (alive > 0) {
      out.push({ date, title: `🔥 شعله‌ی ${fa(alive)} روزه‌ت داره خاموش می‌شه!`, body: 'یه درس ۵ دقیقه‌ای بزن که روشن بمونه.' });
    } else {
      const [title, body] = NUDGES[Math.floor(date.getTime() / 86_400_000) % NUDGES.length];
      out.push({ date, title, body });
    }
  }
  return out;
}
