import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { BoltIcon, Icon, type IconName } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { StatsRow } from '@/components/StatsRow';
import { Txt } from '@/components/Txt';
import { findCourse } from '@/content';
import { dueLessons } from '@/lib/review';
import { practiceSteps, SPEED_SECONDS, type PracticeMode } from '@/lib/session';
import { DAILY_REWARD, todaysXp, useGame } from '@/store/game';
import { colors } from '@/theme';
import { dayKey } from '@/utils/date';
import { fa } from '@/utils/format';

const MODES: { mode: PracticeMode; title: string; sub: (count: number, due: number) => string; icon: IconName | 'bolt'; tint: string; bg: string }[] = [
  { mode: 'mistakes', title: 'مرور اشتباه‌ها', sub: (n) => (n ? `${fa(n)} سؤالی که قبلاً غلط زدی` : 'فعلاً اشتباهی نداری'), icon: 'refresh', tint: '#FF7A8A', bg: 'rgba(255,90,110,0.14)' },
  { mode: 'speed', title: 'تمرین سرعتی', sub: () => `${fa(SPEED_SECONDS)} ثانیه؛ هر چی بیشتر، بهتر`, icon: 'bolt', tint: colors.gold, bg: colors.goldSoft },
  { mode: 'charts', title: 'شکار الگو', sub: () => 'سؤال‌های نموداری درس‌هایی که خوندی', icon: 'target', tint: colors.bull, bg: 'rgba(43,212,125,0.14)' },
  { mode: 'mixed', title: 'مرور هوشمند', sub: (_, due) => (due ? `${fa(due)} درس امروز وقت مرورشه` : 'چند سؤال از همه‌ی درس‌هایی که خوندی'), icon: 'layers', tint: colors.sky, bg: 'rgba(90,176,255,0.14)' },
];

export default function PracticeScreen() {
  const activeCourse = useGame((s) => s.activeCourse);
  const enrolled = useGame((s) => s.enrolled);
  const completed = useGame((s) => s.completed);
  const mistakes = useGame((s) => s.mistakes);
  const reviews = useGame((s) => s.reviews);
  const dailyGoal = useGame((s) => s.dailyGoal);
  const xpToday = useGame((s) => todaysXp(s));
  const claimedToday = useGame((s) => s.dailyClaimedDay === dayKey());
  const claimDaily = useGame((s) => s.claimDaily);

  const state = { activeCourse, completed, mistakes, reviews };
  const due = dueLessons(reviews).length;
  const goalMet = xpToday >= dailyGoal;

  // The weakest unit the user has started in their courses, to suggest a focused review.
  const weakest = enrolled
    .flatMap((id) => findCourse(id)?.units ?? [])
    .map((unit) => {
      const done = unit.lessons.filter((l) => completed[l.id] && !completed[l.id].skipped).length;
      return { unit, ratio: done / unit.lessons.length, started: done > 0 };
    })
    .filter((u) => u.ratio < 1)
    .sort((a, b) => Number(b.started) - Number(a.started) || a.ratio - b.ratio)[0];

  return (
    <Screen>
      <View style={styles.header}>
        <Txt display size={32} style={{ lineHeight: 44 }}>
          تمرین
        </Txt>
        <StatsRow showHearts={false} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.daily}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.dailyTag}>
              <Txt w={900} size={12} color={colors.gold}>
                هدف روزانه
              </Txt>
            </View>
            <Txt w={900} size={17} lh={1.6}>
              {`امروز ${fa(dailyGoal)} امتیاز بگیر`}
            </Txt>
            <View style={styles.dailyBar}>
              <ProgressBar value={xpToday / dailyGoal} height={12} color={colors.gold} track="#3A2E10" label="پیشرفت هدف روزانه" />
              <Txt w={800} size={13} color={colors.gold}>
                {`${fa(Math.min(xpToday, dailyGoal))} از ${fa(dailyGoal)}`}
              </Txt>
            </View>
          </View>
          <View style={styles.reward}>
            {goalMet && !claimedToday ? (
              <Button3D variant="gold" height={44} radius={12} edge={4} size={14} label={`+${fa(DAILY_REWARD)} سکه`} onPress={claimDaily} />
            ) : (
              <>
                <View style={[styles.chest, claimedToday && { opacity: 0.5 }]}>
                  <Icon name="gift" size={30} color={colors.gold} />
                </View>
                <Txt w={900} size={12} color={colors.gold}>
                  {claimedToday ? 'گرفتی!' : `+${fa(DAILY_REWARD)} سکه`}
                </Txt>
              </>
            )}
          </View>
        </View>

        <Txt w={900} size={16} color={colors.text2}>
          حالت‌های تمرین
        </Txt>
        <View style={styles.grid}>
          {MODES.map((m) => {
            const count = practiceSteps(m.mode, state).length;
            const available = count > 0;
            return (
              <Pressable
                key={m.mode}
                disabled={!available}
                onPress={() => router.push(`/lesson/practice-${m.mode}`)}
                accessibilityRole="button"
                accessibilityLabel={m.title}
                accessibilityState={{ disabled: !available }}
                style={({ pressed }) => [styles.mode, !available && { opacity: 0.5 }, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 2 }]}
              >
                <View style={[styles.modeIcon, { backgroundColor: m.bg }]}>
                  {m.icon === 'bolt' ? <BoltIcon size={24} /> : <Icon name={m.icon} size={24} color={m.tint} strokeWidth={2.4} />}
                </View>
                <Txt w={900} size={16}>
                  {m.title}
                </Txt>
                <Txt size={12.5} lh={1.6} color={colors.text2}>
                  {m.mode === 'mistakes' ? m.sub(mistakes.length, due) : m.sub(count, due)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt size={13} color={colors.text3} center>
          هر تمرین تموم‌شده یه قلب بهت برمی‌گردونه.
        </Txt>

        {weakest && (
          <View style={styles.weak}>
            <View style={[styles.modeIcon, { backgroundColor: colors.goldSoft }]}>
              <Icon name="shield" size={24} color={colors.gold} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt w={900} size={15}>
                {`تمرکز بعدی: ${weakest.unit.title}`}
              </Txt>
              <ProgressBar value={weakest.ratio} height={10} color={colors.gold} label={`تسلط بر ${weakest.unit.title}`} />
              <Txt size={12} color={colors.text2}>
                {`${fa(Math.round(weakest.ratio * 100))}٪ تسلط`}
              </Txt>
            </View>
            <Button3D
              label="راهنما"
              height={44}
              radius={12}
              edge={4}
              size={15}
              onPress={() => router.push(`/guide/${weakest.unit.id}`)}
              accessibilityLabel={`راهنمای ${weakest.unit.title}`}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    padding: 16,
    paddingTop: 8,
    gap: 16,
  },
  daily: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  dailyTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
  },
  dailyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reward: {
    width: 96,
    alignItems: 'center',
    gap: 6,
  },
  chest: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: '#3A2E10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mode: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: 136,
    padding: 14,
    gap: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
