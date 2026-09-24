import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { questChestId, questProgress, questsDone, questsFor, type Quest, type QuestLog, type QuestMetric } from '@/lib/quests';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { dayKey, msToMidnight } from '@/utils/date';
import { fa } from '@/utils/format';

import { Button3D } from './Button3D';
import { Chest } from './Chest';
import { BoltIcon, Icon, StarIcon, type IconName } from './Icon';
import { ProgressBar } from './ProgressBar';
import { Txt } from './Txt';

const METRIC_ICON: Record<QuestMetric, IconName | 'bolt' | 'star'> = {
  xp: 'bolt',
  lessons: 'book',
  perfect: 'star',
  combo: 'target',
  practice: 'refresh',
  seconds: 'clock',
  trades: 'candles',
  stopTrades: 'shield',
  duels: 'swords',
};

function QuestIcon({ metric, done }: { metric: QuestMetric; done: boolean }) {
  const icon = METRIC_ICON[metric];
  const color = done ? colors.goldInk : colors.gold;
  return (
    <View style={[styles.icon, done && styles.iconDone]}>
      {icon === 'bolt' ? <BoltIcon size={20} color={color} /> : icon === 'star' ? <StarIcon size={20} color={color} /> : <Icon name={icon} size={20} color={color} strokeWidth={2.6} />}
    </View>
  );
}

const amount = (q: Quest, n: number) => (q.metric === 'seconds' ? fa(Math.floor(n / 60)) : fa(n));

/** The day's quests with their progress; `before` marks quests that moved in the last session. */
export function QuestList({ quests, log, day, before }: { quests: Quest[]; log: QuestLog | null; day: string; before?: QuestLog | null }) {
  return (
    <View style={{ gap: 12 }}>
      {quests.map((q) => {
        const n = questProgress(q, log, day);
        const done = n >= q.target;
        const was = before !== undefined ? questProgress(q, before, day) : n;
        const justDone = done && was < q.target;
        const moved = n > was;
        return (
          <View key={q.id} style={styles.row} accessible accessibilityLabel={`${q.title}: ${amount(q, n)} از ${amount(q, q.target)}${done ? '، انجام شد' : ''}`}>
            <QuestIcon metric={q.metric} done={done} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.titleRow}>
                <Txt w={800} size={14} lh={1.5} style={{ flex: 1 }} color={done ? colors.text2 : colors.text}>
                  {q.title}
                </Txt>
                {justDone ? (
                  <View style={styles.newTag}>
                    <Txt w={900} size={11} color={colors.goldInk}>
                      انجام شد!
                    </Txt>
                  </View>
                ) : moved ? (
                  <Txt w={900} size={12} color={colors.bullText}>
                    {`+${amount(q, n - was)}`}
                  </Txt>
                ) : null}
              </View>
              <View style={styles.barRow}>
                <ProgressBar value={n / q.target} height={10} color={colors.gold} track="#3A2E10" label={q.title} />
                <Txt w={800} size={12} color={done ? colors.gold : colors.text3} style={styles.count}>
                  {`${amount(q, n)}/${amount(q, q.target)}`}
                </Txt>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function hoursLeftText(): string {
  const mins = Math.max(1, Math.round(msToMidnight() / 60_000));
  return mins >= 60 ? `${fa(Math.floor(mins / 60))} ساعت مونده` : `${fa(mins)} دقیقه مونده`;
}

/** Today's three quests and their chest, for the Practice tab. */
export function QuestsCard({ footer }: { footer?: ReactNode }) {
  const log = useGame((s) => s.quests);
  const dailyGoal = useGame((s) => s.dailyGoal);
  const day = dayKey();
  const quests = questsFor(day, dailyGoal);
  const done = questsDone(quests, log, day);
  const claimed = log?.day === day && log.chest;
  const ready = done === quests.length && !claimed;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.tag}>
          <Txt w={900} size={12} color={colors.gold}>
            مأموریت‌های امروز
          </Txt>
        </View>
        <View style={{ flex: 1 }} />
        <Icon name="clock" size={14} color={colors.text3} strokeWidth={2.4} />
        <Txt w={700} size={12} color={colors.text3}>
          {hoursLeftText()}
        </Txt>
      </View>
      <QuestList quests={quests} log={log} day={day} />
      <View style={styles.chestRow}>
        <Chest tier={claimed ? 'rare' : 'common'} size={54} open={claimed} locked={!ready && !claimed} />
        <Txt w={800} size={13} lh={1.6} color={colors.text2} style={{ flex: 1 }}>
          {claimed ? 'صندوق امروز رو گرفتی. فردا سه مأموریت تازه داری!' : ready ? 'هر سه مأموریت انجام شد! صندوقت آماده‌ست.' : `${fa(done)} از ${fa(quests.length)} مأموریت؛ با هر سه‌تاش یه صندوق جایزه می‌گیری.`}
        </Txt>
        {ready ? <Button3D variant="gold" label="باز کن" height={42} radius={12} edge={4} size={15} onPress={() => router.push(`/chest/${questChestId(day)}`)} /> : null}
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: '#2A2210',
  },
  iconDone: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.gold,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    minWidth: 38,
    textAlign: 'left',
  },
  chestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderColor: colors.goldCardLine,
  },
});
