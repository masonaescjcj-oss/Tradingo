import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { Chest } from '@/components/Chest';
import { Confetti } from '@/components/Confetti';
import { BoltIcon, FlameIcon, Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { QuestList } from '@/components/QuestsCard';
import { ShareSheet } from '@/components/ShareSheet';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { questChestId, questProgress, questsDone, questsFor, type QuestLog } from '@/lib/quests';
import type { ShareCard } from '@/lib/shareCard';
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
  /** Confetti for a finished lesson or a passed test; off for a failed test. */
  celebrate?: boolean;
  /** This session pushed today's XP over the daily goal. */
  goalReached?: boolean;
  /** XP was doubled by a boost from the shop. */
  boosted?: boolean;
  /** Today's quest log before the session, to show what moved. */
  questsBefore?: QuestLog | null;
  /** Something worth sharing that the session reached. */
  share?: ShareCard | null;
  /** A long streak that just broke but can still be repaired. */
  repairable?: number | null;
  onContinue: () => void;
};

export function LessonComplete(props: Props) {
  const [step, setStep] = useState<'summary' | 'quests'>('summary');
  const log = useGame((s) => s.quests);
  const dailyGoal = useGame((s) => s.dailyGoal);
  const day = dayKey();
  const quests = questsFor(day, dailyGoal);
  const before = props.questsBefore;
  const moved = before !== undefined && quests.some((q) => questProgress(q, log, day) > questProgress(q, before, day));

  if (step === 'quests') return <QuestStep day={day} log={log} before={before ?? null} onContinue={props.onContinue} />;
  return <Summary {...props} onContinue={() => (moved ? setStep('quests') : props.onContinue())} />;
}

/** After the summary: how the session moved today's quests, and the quest chest when all are done. */
function QuestStep({ day, log, before, onContinue }: { day: string; log: QuestLog | null; before: QuestLog | null; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const dailyGoal = useGame((s) => s.dailyGoal);
  const quests = questsFor(day, dailyGoal);
  const done = questsDone(quests, log, day);
  const allDone = done === quests.length;
  const chestReady = allDone && !(log?.day === day && log.chest);
  const justFinished = allDone && questsDone(quests, before, day) < quests.length;

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 16) + 24, paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 18 }}>
        <View style={styles.top}>
          <Mascot mood={allDone ? 'party' : 'happy'} size={130} />
          <Txt display size={36} color={colors.gold} style={styles.title}>
            {allDone ? t('همه‌ی مأموریت‌ها انجام شد!') : t('مأموریت‌های امروز')}
          </Txt>
          <Txt w={700} size={14.5} color={colors.text2} center>
            {allDone ? t('صندوق جایزه‌ی امروز مال توئه.') : t('{done} از {total} انجام شد. ادامه بده!', { done: fa(done), total: fa(quests.length) })}
          </Txt>
        </View>
        <View style={styles.questCard}>
          <QuestList quests={quests} log={log} day={day} before={before} />
        </View>
        {chestReady ? (
          <View style={styles.chestRow}>
            <Chest tier="rare" size={70} />
            <Txt w={800} size={14} lh={1.6} color={colors.text} style={{ flex: 1 }}>
              {t('صندوق مأموریت‌ها آماده‌ی باز شدنه!')}
            </Txt>
          </View>
        ) : null}
      </ScrollView>
      <View style={{ gap: 10 }}>
        {chestReady ? <Button3D variant="gold" label={t('باز کردن صندوق')} onPress={() => router.replace(`/chest/${questChestId(day)}`)} /> : null}
        <Button3D label={t('ادامه')} variant={chestReady ? 'secondary' : 'primary'} onPress={onContinue} />
      </View>
      {justFinished ? <Confetti /> : null}
    </View>
  );
}

function Summary({
  title,
  subtitle,
  xp,
  accuracy,
  seconds,
  coins,
  celebrate = true,
  goalReached = false,
  boosted = false,
  share = null,
  repairable = null,
  onContinue,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const streak = useGame((s) => currentStreak(s));
  const activeDays = useGame((s) => s.activeDays);
  const frozenDays = useGame((s) => s.frozenDays);
  const [card, setCard] = useState<ShareCard | null>(null);
  const start = weekStart();
  const todayIndex = faWeekdayIndex(new Date());

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 16) + 24, paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }}>
        <View style={styles.top}>
          <Mascot mood={accuracy >= 0.6 ? 'party' : 'happy'} size={height < 720 ? 110 : 170} />
          <Txt display size={44} color={colors.gold} style={styles.title}>
            {title}
          </Txt>
          <Txt w={700} size={15} color={colors.text2} center>
            {subtitle}
          </Txt>
          {goalReached && (
            <View style={styles.goal}>
              <Icon name="target" size={18} color={colors.goldInk} strokeWidth={2.8} />
              <Txt w={900} size={14} color={colors.goldInk}>
                {t('هدف امروزت کامل شد!')}
              </Txt>
            </View>
          )}
        </View>

        <View style={styles.stats}>
          <Stat label={boosted ? t('امتیاز ×۲') : t('امتیاز')} color={colors.gold} ink={colors.goldInk} icon={<BoltIcon size={20} />} value={`+${fa(xp)}`} />
          <Stat
            label={t('دقت')}
            color={colors.bull}
            ink={colors.bullInk}
            icon={<Icon name="target" size={20} color={colors.bull} strokeWidth={2.6} />}
            value={t('{n}٪', { n: fa(Math.round(accuracy * 100)) })}
          />
          <Stat
            label={t('زمان')}
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
                {t('{n} روز پشت سر هم!', { n: fa(streak), count: streak })}
              </Txt>
              <Txt size={13} color="#D8C3A0">
                {coins > 0 ? t('+{n} سکه گرفتی. فردا هم بیا تا شعله‌ت خاموش نشه.', { n: fa(coins), count: coins }) : t('فردا هم بیا تا شعله‌ت خاموش نشه.')}
              </Txt>
            </View>
          </View>
          {repairable ? (
            <Pressable onPress={() => router.push('/streak')} accessibilityRole="button" style={styles.repair}>
              <Txt w={800} size={13} lh={1.6} color={colors.text} style={{ flex: 1 }}>
                {t('شعله‌ت خاموش شده بود، ولی می‌تونی ترمیمش کنی تا به {n} روز برگرده.', { n: fa(repairable), count: repairable })}
              </Txt>
              <Txt w={900} size={13} color={colors.flame}>
                {t('ترمیم')}
              </Txt>
            </Pressable>
          ) : null}
          <View style={styles.week}>
            {FA_WEEKDAYS_SHORT.map((d, i) => {
              const key = dayKey(addDays(start, i));
              const active = activeDays.includes(key);
              const frozen = !active && (frozenDays ?? []).includes(key);
              const isToday = i === todayIndex;
              return (
                <View key={d} style={styles.day}>
                  <Txt w={800} size={11} color={isToday ? colors.gold : active ? '#D8C3A0' : '#8C7B5C'}>
                    {t(d)}
                  </Txt>
                  <View style={[styles.dayDot, active ? styles.dayOn : frozen ? styles.dayFrozen : styles.dayOff, isToday && active && styles.dayToday]}>
                    {active && <Icon name="check" size={14} color="#3A1C00" strokeWidth={3.6} />}
                    {frozen && <Icon name="snow" size={14} color={colors.skyInk} strokeWidth={2.8} />}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={{ gap: 10 }}>
        {share ? (
          <Button3D variant="secondary" onPress={() => setCard(share)} accessibilityLabel={t('اشتراک‌گذاری: {what}', { what: share.kicker })}>
            <View style={styles.shareRow}>
              <Icon name="share" size={18} color={colors.text} strokeWidth={2.6} />
              <Txt w={900} size={16}>
                {t('اشتراک‌گذاری: {what}', { what: share.kicker })}
              </Txt>
            </View>
          </Button3D>
        ) : null}
        <Button3D label={t('ادامه')} onPress={onContinue} />
      </View>
      {celebrate && <Confetti />}
      <ShareSheet card={card} onClose={() => setCard(null)} />
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
  goal: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.gold,
  },
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
  dayFrozen: {
    backgroundColor: colors.sky,
  },
  repair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.flame,
    backgroundColor: '#2A1A0C',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  chestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.goldCard,
  },
});
