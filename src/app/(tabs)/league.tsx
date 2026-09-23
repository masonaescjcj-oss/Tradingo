import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Hexagon } from '@/components/Hexagon';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BOARD_SIZE, DEMOTE_COUNT, LEAGUES, PROMOTE_COUNT, buildBoard, weekEndsIn, weekProgress } from '@/lib/league';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa, faNum } from '@/utils/format';

const MEDALS = [
  { bg: '#FFC53D', ink: '#3B2A00' },
  { bg: '#C9D3E3', ink: '#1E2533' },
  { bg: '#D98C5F', ink: '#3A1A08' },
];

export default function LeagueScreen() {
  const league = useGame((s) => s.league);
  const weekKey = useGame((s) => s.weekKey);
  const weeklyXp = useGame((s) => s.weeklyXp);
  const name = useGame((s) => s.name);
  const lastChange = useGame((s) => s.lastLeagueChange);
  const [now, setNow] = useState(() => new Date());

  // Refresh the board (and start a new week if needed) whenever the tab is opened.
  useFocusEffect(
    useCallback(() => {
      useGame.getState().rolloverWeek();
      setNow(new Date());
    }, []),
  );

  const rows = buildBoard(weekKey, league, name, weeklyXp, weekProgress(now));
  const ends = weekEndsIn(now);
  const top = league === LEAGUES.length - 1;
  const bottom = league === 0;
  const current = LEAGUES[league];

  return (
    <Screen>
      <View style={styles.header}>
        <Txt display size={32} style={{ lineHeight: 44 }}>
          لیگ
        </Txt>
        <View style={styles.timer}>
          <Icon name="clock" size={16} color={colors.gold} strokeWidth={2.6} />
          <Txt w={800} size={13} color={colors.gold}>
            {ends.days > 0 ? `${fa(ends.days)} روز و ${fa(ends.hours)} ساعت مونده` : `${fa(ends.hours)} ساعت مونده`}
          </Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tiers} accessibilityLabel="سطح‌های لیگ">
          {LEAGUES.map((l, i) => {
            const isCurrent = i === league;
            const reached = i <= league;
            return (
              <View key={l.name} style={styles.tier}>
                <Hexagon size={isCurrent ? 60 : 42} color={reached ? l.color : colors.raised}>
                  {reached ? (
                    <Txt display size={isCurrent ? 28 : 20} color={l.ink}>
                      {fa(i + 1)}
                    </Txt>
                  ) : (
                    <Icon name="lock" size={18} color={colors.muted} strokeWidth={2.6} />
                  )}
                </Hexagon>
                <Txt w={isCurrent ? 900 : 800} size={isCurrent ? 12 : 11} color={isCurrent ? l.color : reached ? colors.text2 : colors.muted}>
                  {l.name}
                </Txt>
              </View>
            );
          })}
        </View>

        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt display size={30} style={{ lineHeight: 42 }}>
            {`لیگ ${current.name}`}
          </Txt>
          <Txt size={14} color={colors.text2} center>
            {top
              ? `لیگ آخری! ${fa(BOARD_SIZE - DEMOTE_COUNT)} نفر اول اینجا می‌مونن.`
              : `${fa(PROMOTE_COUNT)} نفر اول به لیگ ${LEAGUES[league + 1].name} صعود می‌کنن`}
          </Txt>
          {lastChange && lastChange.change !== 0 && (
            <Txt w={800} size={13} color={lastChange.change > 0 ? colors.bullText : colors.bearText} center>
              {lastChange.change > 0 ? `هفته‌ی قبل با رتبه‌ی ${fa(lastChange.rank)} صعود کردی!` : `هفته‌ی قبل با رتبه‌ی ${fa(lastChange.rank)} سقوط کردی.`}
            </Txt>
          )}
        </View>

        <View style={{ gap: 4 }} accessibilityRole="list">
          {rows.map((row, i) => {
            const rank = i + 1;
            const promoteLine = !top && rank === PROMOTE_COUNT;
            const demoteLine = !bottom && rank === BOARD_SIZE - DEMOTE_COUNT;
            return (
              <View key={row.name + i}>
                <View style={[styles.row, row.isUser && styles.userRow]}>
                  {rank <= 3 ? (
                    <View style={[styles.medal, { backgroundColor: MEDALS[rank - 1].bg }]}>
                      <Txt w={900} size={14} color={MEDALS[rank - 1].ink}>
                        {fa(rank)}
                      </Txt>
                    </View>
                  ) : (
                    <Txt w={900} size={15} color={row.isUser ? colors.bull : colors.text2} center style={{ width: 28 }}>
                      {fa(rank)}
                    </Txt>
                  )}
                  <View style={[styles.avatar, { backgroundColor: row.avatar.bg }]}>
                    <Txt w={900} size={16} color={row.avatar.fg}>
                      {row.name.charAt(0)}
                    </Txt>
                  </View>
                  <Txt w={row.isUser ? 900 : 800} size={15} color={row.isUser ? colors.bullText : colors.text} style={{ flex: 1 }} numberOfLines={1}>
                    {row.isUser ? `${row.name} (تو)` : row.name}
                  </Txt>
                  <Txt w={800} size={14} color={row.isUser ? colors.bullText : colors.text2}>
                    {`${faNum(row.xp)} XP`}
                  </Txt>
                </View>
                {promoteLine && <ZoneLine label="منطقه‌ی صعود" color={colors.bull} line={colors.bullSheetLine} up />}
                {demoteLine && <ZoneLine label="منطقه‌ی سقوط" color={colors.bearText} line={colors.bearSheetLine} />}
              </View>
            );
          })}
        </View>
        <Txt size={12} color={colors.text3} center>
          بقیه‌ی شرکت‌کننده‌های لیگ، تریدرهای شبیه‌سازی‌شده‌ان.
        </Txt>
      </ScrollView>
    </Screen>
  );
}

function ZoneLine({ label, color, line, up }: { label: string; color: string; line: string; up?: boolean }) {
  return (
    <View style={styles.zone} accessibilityLabel={label}>
      <View style={[styles.zoneLine, { backgroundColor: line }]} />
      <View style={{ transform: [{ rotate: up ? '0deg' : '180deg' }] }}>
        <Icon name="arrowUp" size={14} color={color} strokeWidth={3} />
      </View>
      <Txt w={900} size={12} color={color}>
        {label}
      </Txt>
      <View style={[styles.zoneLine, { backgroundColor: line }]} />
    </View>
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
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,197,61,0.12)',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  tiers: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 4,
  },
  tier: {
    alignItems: 'center',
    gap: 6,
  },
  row: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userRow: {
    borderColor: colors.bull,
    backgroundColor: colors.bullSoft,
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zone: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneLine: {
    flex: 1,
    height: 2,
  },
});
