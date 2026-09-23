import { StyleSheet, View } from 'react-native';

import { currentStreak, heartsNow, useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa, faNum } from '@/utils/format';

import { CoinIcon, FlameIcon, HeartIcon } from './Icon';
import { Txt } from './Txt';

/** Streak, coins and hearts counters shown at the top of the main tabs. */
export function StatsRow({ showHearts = true }: { showHearts?: boolean }) {
  const streak = useGame((s) => currentStreak(s));
  const coins = useGame((s) => s.coins);
  const hearts = useGame((s) => heartsNow(s).hearts);
  return (
    <View style={styles.row}>
      <View style={styles.stat} accessible accessibilityLabel={`${fa(streak)} روز پیاپی`}>
        <FlameIcon color={streak > 0 ? colors.flame : colors.faint} inner={streak > 0 ? '#FFD27A' : colors.muted} />
        <Txt w={900} size={16} color={streak > 0 ? colors.flame : colors.muted}>
          {fa(streak)}
        </Txt>
      </View>
      <View style={styles.stat} accessible accessibilityLabel={`${faNum(coins)} سکه`}>
        <CoinIcon />
        <Txt w={900} size={16} color={colors.gold}>
          {faNum(coins)}
        </Txt>
      </View>
      {showHearts && (
        <View style={styles.stat} accessible accessibilityLabel={`${fa(hearts)} قلب`}>
          <HeartIcon />
          <Txt w={900} size={16} color={colors.bear}>
            {fa(hearts)}
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
  },
});
