import * as Notifications from 'expo-notifications';
import { AppState, Linking, Platform } from 'react-native';

import { useGame } from '@/store/game';

import { planReminders } from './reminderPlan';

/**
 * The daily practice reminder: local notifications scheduled on the phone for the week ahead
 * (nothing goes through a server). They're planned again whenever the learner practises, changes
 * the setting or leaves the app, so today's reminder disappears once today's lesson is done.
 * The web has no reminders; see reminders.web.ts.
 */
export const remindersSupported = true;

const CHANNEL = 'reminders';

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'یادآوری تمرین',
    description: 'یادآوری روزانه برای این‌که روزهای پیاپیت قطع نشه',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#2BD47D',
  });
}

/** Turns reminders on, asking for permission first (Android 13+ shows its own prompt). */
export async function enableReminders(): Promise<'on' | 'denied'> {
  try {
    // Android only shows the permission prompt once a channel exists.
    await ensureChannel();
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted' && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return 'denied';
  } catch {
    return 'denied';
  }
  useGame.getState().setReminders({ enabled: true, offered: true });
  await syncReminders();
  return 'on';
}

/** For when notifications were refused: the phone's settings page for Chartoon. */
export function openNotificationSettings() {
  Linking.openSettings().catch(() => {});
}

let queue: Promise<void> = Promise.resolve();

/** Re-plans the week's reminders from the current progress and settings. */
export function syncReminders(): Promise<void> {
  queue = queue.then(plan, plan);
  return queue;
}

async function plan() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const s = useGame.getState();
    if (!s.reminders.enabled) return;
    if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
    await ensureChannel();
    for (const r of planReminders(s, s.reminders.hour)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, color: '#2BD47D' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL },
      });
    }
  } catch {
    // Reminders are a nicety; the app works the same without them.
  }
}

/** Keeps the reminders in step with progress while the app runs. Call once the store is loaded. */
export function startReminders(): () => void {
  void syncReminders();
  const unsubscribe = useGame.subscribe((s, prev) => {
    if (s.lastActiveDay !== prev.lastActiveDay || s.streak !== prev.streak || s.reminders !== prev.reminders) void syncReminders();
  });
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'background') void syncReminders();
  });
  return () => {
    unsubscribe();
    sub.remove();
  };
}
