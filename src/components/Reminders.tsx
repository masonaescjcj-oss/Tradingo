import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { REMINDER_HOURS } from '@/lib/reminderPlan';
import { enableReminders, openNotificationSettings, remindersSupported } from '@/lib/reminders';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

import { Button3D } from './Button3D';
import { Icon } from './Icon';
import { Mascot } from './Mascot';
import { Txt } from './Txt';

const hourLabel = (h: number) => fa(`${h}:00`);

/** Profile setting: the daily reminder on or off, and its hour. Phones only. */
export function ReminderRow() {
  const reminders = useGame((s) => s.reminders);
  const setReminders = useGame((s) => s.setReminders);
  const [denied, setDenied] = useState(false);
  if (!remindersSupported) return null;

  const toggle = async () => {
    if (reminders.enabled) {
      setReminders({ enabled: false });
      return;
    }
    setDenied((await enableReminders()) === 'denied');
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: reminders.enabled }}
        accessibilityLabel={t('یادآوری تمرین روزانه')}
        style={styles.head}
      >
        <Icon name="bell" size={22} color={reminders.enabled ? colors.bull : colors.text3} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt w={800} size={14}>
            {t('یادآوری تمرین روزانه')}
          </Txt>
          <Txt w={500} size={12} lh={1.6} color={denied ? colors.bearText : colors.text3}>
            {denied
              ? t('اجازه‌ی اعلان داده نشده؛ از تنظیمات گوشی روشنش کن')
              : reminders.enabled
                ? t('هر روز ساعت {time}، اگه هنوز تمرین نکرده باشی', { time: hourLabel(reminders.hour) })
                : t('خاموشه')}
          </Txt>
        </View>
        <View style={[styles.toggle, reminders.enabled && styles.toggleOn]}>
          <View style={[styles.knob, reminders.enabled && styles.knobOn]} />
        </View>
      </Pressable>
      {denied ? (
        <Pressable onPress={openNotificationSettings} accessibilityRole="button" style={styles.settings}>
          <Txt w={800} size={13} color={colors.skyText}>
            {t('باز کردن تنظیمات')}
          </Txt>
        </Pressable>
      ) : null}
      {reminders.enabled ? (
        <View style={styles.hours} accessibilityRole="radiogroup">
          {REMINDER_HOURS.map((h) => {
            const on = reminders.hour === h;
            return (
              <Pressable
                key={h}
                onPress={() => setReminders({ hour: h })}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t('ساعت {time}', { time: hourLabel(h) })}
                style={[styles.hour, on && styles.hourOn]}
              >
                <Txt w={900} size={14} color={on ? colors.skyText : colors.text}>
                  {hourLabel(h)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** A one-time offer on the path after the first lesson, like Duolingo's "can we remind you?". */
export function ReminderOffer() {
  const reminders = useGame((s) => s.reminders);
  const setReminders = useGame((s) => s.setReminders);
  const lessons = useGame((s) => Object.values(s.completed).filter((r) => !r.skipped).length);
  if (!remindersSupported || reminders.enabled || reminders.offered || lessons < 1) return null;

  return (
    <View style={styles.offer}>
      <Mascot mood="happy" size={54} />
      <View style={{ flex: 1, gap: 8 }}>
        <Txt w={900} size={15}>
          {t('بذار هر روز یادت بندازم!')}
        </Txt>
        <Txt w={500} size={12.5} lh={1.7} color={colors.text2}>
          {t('شبا اگه هنوز تمرین نکرده باشی، یه پیام کوچیک می‌فرستم که روزهای پیاپیت قطع نشه.')}
        </Txt>
        <View style={styles.offerActions}>
          <Button3D
            label={t('آره، یادم بنداز')}
            size={14}
            onPress={async () => {
              await enableReminders();
              setReminders({ offered: true });
            }}
            style={{ flex: 1 }}
          />
          <Pressable onPress={() => setReminders({ offered: true })} accessibilityRole="button" style={styles.later}>
            <Txt w={800} size={13} color={colors.text3}>
              {t('الان نه')}
            </Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settings: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  hours: {
    flexDirection: 'row',
    gap: 8,
  },
  hour: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  hourOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  toggle: {
    width: 50,
    height: 30,
    padding: 3,
    borderRadius: 15,
    backgroundColor: colors.raised,
    flexDirection: 'row',
  },
  toggleOn: {
    backgroundColor: colors.bull,
    justifyContent: 'flex-end',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text3,
  },
  knobOn: {
    backgroundColor: colors.bullInk,
  },
  offer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.bullSheetLine,
    backgroundColor: colors.bullSheet,
  },
  offerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  later: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
});
