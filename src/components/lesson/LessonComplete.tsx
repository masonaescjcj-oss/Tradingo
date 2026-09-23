import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { BoltIcon, FlameIcon, Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import { currentStreak, useGame } from '@/store/game';
import { colors } from '@/theme';
import { FA_WEEKDAYS_SHORT, addDays, dayKey, faWeekdayIndex, weekStart } from '@/utils/date';
import { fa, faDuration } from '@/utils/format';

type Props = {
  title: string;
  subtitle: string;
  xp: number;
  accuracy: number;
  seconds: number;
  coins: number;
  onContinue: () => void;
};

export function LessonComplete({ title, subtitle, xp, accuracy, seconds, coins, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const streak = useGame((s) => currentStreak(s));
  const activeDays = useGame((s) => s.activeDays);
  const start = weekStart();
  const todayIndex = faWeekdayIndex(new Date());

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 16) + 24, paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
      <View style={styles.top}>
        <Mascot mood={accuracy >= 0.6 ? 'party' : 'happy'} size={170} />
        <Txt display size={44} color={colors.gold} style={styles.title}>
          {title}
        </Txt>
        <Txt w={700} size={15} color={colors.text2} center>
          {subtitle}
        </Txt>
      </View>

      <View style={styles.stats}>
        <Stat label="امتیاز" color={colors.gold} ink={colors.goldInk} icon={<BoltIcon size={20} />} value={`+${fa(xp)}`} />
        <Stat
          label="دقت"
          color={colors.bull}
          ink={colors.bullInk}
          icon={<Icon name="target" size={20} color={colors.bull} strokeWidth={2.6} />}
          value={`${fa(Math.round(accuracy * 100))}٪`}
        />
        <Stat
          label="زمان"
          color={colors.sky}
          ink={colors.skyInk}
          icon={<Icon name="clock" size={20} color={colors.sky} strokeWidth={2.6} />}
          value={faDuration(seconds)}
        />
      </View>

      <View style={styles.streak}>
        <View style={styles.streakHead}>
          <FlameIcon size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt w={900} size={17} color={colors.flame}>
              {`${fa(streak)} روز پشت سر هم!`}
            </Txt>
            <Txt size={13} color="#D8C3A0">
              {coins > 0 ? `+${fa(coins)} سکه گرفتی. فردا هم بیا تا شعله‌ت خاموش نشه.` : 'فردا هم بیا تا شعله‌ت خاموش نشه.'}
            </Txt>
          </View>
        </View>
        <View style={styles.week}>
          {FA_WEEKDAYS_SHORT.map((d, i) => {
            const key = dayKey(addDays(start, i));
            const active = activeDays.includes(key);
            const isToday = i === todayIndex;
            return (
              <View key={d} style={styles.day}>
                <Txt w={800} size={11} color={isToday ? colors.gold : active ? '#D8C3A0' : '#8C7B5C'}>
                  {d}
                </Txt>
                <View style={[styles.dayDot, active ? styles.dayOn : styles.dayOff, isToday && active && styles.dayToday]}>
                  {active && <Icon name="check" size={14} color="#3A1C00" strokeWidth={3.6} />}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <Button3D label="ادامه" onPress={onContinue} />
    </View>
  );
}

function Stat({ label, color, ink, icon, value }: { label: string; color: string; ink: string; icon: ReactNode; value: string }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <View style={[styles.statHead, { backgroundColor: color }]}>
        <Txt w={900} size={12} color={ink}>
          {label}
        </Txt>
      </View>
      <View style={styles.statBody}>
        {icon}
        <Txt w={900} size={20} color={color}>
          {value}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
    backgroundColor: colors.bg,
  },
  top: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    marginTop: 4,
    lineHeight: 56,
    textShadowColor: '#6B4B00',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  statHead: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBody: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
  },
  streak: {
    padding: 14,
    gap: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  streakHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: 4,
  },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: {
    backgroundColor: colors.flame,
  },
  dayOff: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.goldCardLine,
  },
  dayToday: {
    borderWidth: 3,
    borderColor: '#FFD27A',
  },
});
