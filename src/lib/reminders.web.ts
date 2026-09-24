/** Browsers get no practice reminders (they'd need push notifications); see reminders.ts for phones. */
export const remindersSupported = false;

export async function enableReminders(): Promise<'on' | 'denied'> {
  return 'denied';
}

export function openNotificationSettings() {}

export async function syncReminders(): Promise<void> {}

export function startReminders(): () => void {
  return () => {};
}
