import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Button3D } from '@/components/Button3D';
import { CoinIcon, FlameIcon, Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ShareSheet } from '@/components/ShareSheet';
import { Txt } from '@/components/Txt';
import { MAX_FREEZES, streakRepair } from '@/lib/progress';
import { streakCard, weekDots, type ShareCard } from '@/lib/shareCard';
import { PRICES } from '@/lib/shop';
import { playSfx } from '@/lib/sfx';
import { currentStreak, useGame } from '@/store/game';
import { colors } from '@/theme';
import { addDays, dayKey, FA_WEEKDAYS_SHORT, faWeekdayIndex, weekStart } from '@/utils/date';
import { fa } from '@/utils/format';

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
const WEEKS = 5;

/** Day of the month in the Persian calendar where the platform supports it. */
function persianDay(d: Date): string {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' }).format(d);
  } catch {
    return '';
  }
}

/** The streak: the last five weeks, freezes, repair, the next milestone and sharing. */
export default function StreakScreen() {
  const game = useGame();
  const buy = useGame((s) => s.buy);
  const [card, setCard] = useState<ShareCard | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const streak = currentStreak(game);
  const freezes = game.freezes ?? 0;
  const repair = streakRepair(game);
  const today = dayKey();
  const next = MILESTONES.find((m) => m > streak) ?? streak + 100;
  const prev = [...MILESTONES].reverse().find((m) => m <= streak) ?? 0;

  const firstDay = addDays(weekStart(), -7 * (WEEKS - 1));
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(firstDay, w * 7 + i);
      const key = dayKey(d);
      return { key, day: persianDay(d), on: game.activeDays.includes(key), frozen: (game.frozenDays ?? []).includes(key), today: key === today, future: key > today };
    }),
  );

  const doRepair = () => {
    const result = buy('repair');
    playSfx(result === 'ok' ? 'chest' : 'wrong');
    setMessage(result === 'ok' ? 'شعله‌ت دوباره روشن شد!' : result === 'coins' ? 'سکه‌ت برای ترمیم کافی نیست.' : 'الان چیزی برای ترمیم نیست.');
  };

  const share = () =>
    setCard(
      streakCard({
        name: game.name,
        streak,
        best: game.bestStreak,
        week: weekDots(weekStart(), game.activeDays, game.frozenDays ?? [], faWeekdayIndex(new Date()), dayKey),
      }),
    );

  return (
    <Screen>
      <BackHeader title="روزهای پیاپی" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <FlameIcon size={84} color={streak > 0 ? colors.flame : colors.faint} inner={streak > 0 ? '#FFD27A' : colors.muted} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt display size={56} color={streak > 0 ? colors.flame : colors.muted} style={{ lineHeight: 70 }}>
              {fa(streak)}
            </Txt>
            <Txt w={900} size={17}>
              {streak > 0 ? 'روز پشت سر هم' : 'شعله‌ت خاموشه'}
            </Txt>
            <Txt w={700} size={13} color={colors.text3}>
              {`بهترین رکوردت: ${fa(game.bestStreak)} روز`}
            </Txt>
          </View>
        </View>

        {message ? (
          <Txt w={800} size={13.5} color={colors.bullText} center>
            {message}
          </Txt>
        ) : null}

        {repair ? (
          <View style={styles.repair}>
            <Txt w={900} size={15} color={colors.flame}>
              شعله‌ت هنوز نجات پیدا می‌کنه!
            </Txt>
            <Txt w={500} size={13} lh={1.7} color={colors.text2}>
              {`چند روز جا موندی، ولی هنوز دیر نشده. با ترمیم، شعله‌ت به ${fa(repair.streak)} روز برمی‌گرده و از همین‌جا ادامه می‌دی.`}
            </Txt>
            <Button3D variant="gold" height={44} radius={12} edge={4} onPress={doRepair} accessibilityLabel={`ترمیم شعله با ${fa(PRICES.repair)} سکه`}>
              <View style={styles.price}>
                <Txt w={900} size={15} color={colors.goldInk}>
                  ترمیم شعله
                </Txt>
                <CoinIcon size={16} />
                <Txt w={900} size={15} color={colors.goldInk}>
                  {fa(PRICES.repair)}
                </Txt>
              </View>
            </Button3D>
          </View>
        ) : null}

        <View style={styles.calendar} accessibilityLabel="تقویم پنج هفته‌ی اخیر">
          <View style={styles.week}>
            {FA_WEEKDAYS_SHORT.map((d) => (
              <Txt key={d} w={800} size={12} color={colors.text3} center style={styles.cell}>
                {d}
              </Txt>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((d) => (
                <View key={d.key} style={styles.cell} accessible accessibilityLabel={`${d.day || d.key}${d.on ? '، فعال' : d.frozen ? '، یخ شعله' : ''}`}>
                  <View style={[styles.dot, d.on && styles.dotOn, d.frozen && !d.on && styles.dotFrozen, d.today && styles.dotToday, d.future && { opacity: 0.35 }]}>
                    {d.frozen && !d.on ? (
                      <Icon name="snow" size={16} color={colors.skyInk} strokeWidth={2.6} />
                    ) : (
                      <Txt w={800} size={12.5} color={d.on ? '#3A1C00' : colors.text3}>
                        {d.day}
                      </Txt>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
          <View style={styles.legend}>
            <Legend color={colors.flame} label="روز فعال" />
            <Legend color={colors.sky} label="یخ شعله" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.freezeIcon}>
            <Icon name="snow" size={26} color={colors.sky} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt w={900} size={15}>
              {`یخ شعله: ${fa(freezes)} از ${fa(MAX_FREEZES)}`}
            </Txt>
            <Txt w={500} size={12.5} lh={1.6} color={colors.text2}>
              روزی که نیای، یکی خودکار استفاده می‌شه تا شعله‌ت خاموش نشه.
            </Txt>
          </View>
          <Button3D variant="secondary" label="فروشگاه" height={40} radius={12} edge={3} size={14} onPress={() => router.push('/shop')} />
        </View>

        <View style={styles.row}>
          <Icon name="trophy" size={28} color={colors.gold} />
          <View style={{ flex: 1, gap: 6 }}>
            <Txt w={900} size={15}>
              {`${fa(next - streak)} روز تا رکورد ${fa(next)} روزه`}
            </Txt>
            <ProgressBar value={(streak - prev) / Math.max(1, next - prev)} height={10} color={colors.flame} label="پیشرفت تا رکورد بعدی" />
          </View>
        </View>

        {streak > 0 ? <Button3D label="اشتراک رکوردم" onPress={share} /> : null}
      </ScrollView>
      <ShareSheet card={card} onClose={() => setCard(null)} />
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Txt w={700} size={12} color={colors.text3}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  repair: {
    gap: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.flame,
    backgroundColor: '#2A1A0C',
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calendar: {
    gap: 6,
    padding: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  dotOn: {
    backgroundColor: colors.flame,
  },
  dotFrozen: {
    backgroundColor: colors.sky,
  },
  dotToday: {
    borderWidth: 2.5,
    borderColor: colors.gold,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  freezeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.sky,
    backgroundColor: colors.surfaceDeep,
  },
});
