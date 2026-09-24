import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { boostLeftMs } from '@/lib/shop';
import { currentStreak, heartsNow, useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa, faNum } from '@/utils/format';

import { BoltIcon, CoinIcon, FlameIcon, HeartIcon, Icon } from './Icon';
import { Txt } from './Txt';
import { useNow } from './useNow';

/** Streak, coins and hearts counters shown at the top of the main tabs; streak and coins open their screens. */
export function StatsRow({ showHearts = true }: { showHearts?: boolean }) {
  const streak = useGame((s) => currentStreak(s));
  const freezes = useGame((s) => s.freezes ?? 0);
  const coins = useGame((s) => s.coins);
  const hearts = useGame((s) => heartsNow(s).hearts);
  const boostUntil = useGame((s) => s.boostUntil ?? 0);
  const now = useNow(boostUntil > 0, 15_000, boostUntil);
  const boostMin = Math.ceil(boostLeftMs(boostUntil, now) / 60_000);

  return (
    <View style={styles.row}>
      {boostMin > 0 ? (
        <Pressable onPress={() => router.push('/shop')} accessibilityRole="button" accessibilityLabel={`امتیاز دو برابر، ${fa(boostMin)} دقیقه مونده`} style={styles.boost}>
          <BoltIcon size={14} color={colors.goldInk} />
          <Txt w={900} size={12} color={colors.goldInk}>
            ۲×
          </Txt>
          <Txt w={700} size={11} color={colors.goldInk}>
            {`${fa(boostMin)}′`}
          </Txt>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push('/streak')}
        accessibilityRole="button"
        accessibilityLabel={`${fa(streak)} روز پیاپی${freezes ? `، ${fa(freezes)} یخ شعله` : ''}`}
        hitSlop={4}
        style={styles.stat}
      >
        <View>
          <FlameIcon color={streak > 0 ? colors.flame : colors.faint} inner={streak > 0 ? '#FFD27A' : colors.muted} />
          {freezes > 0 ? (
            <View style={styles.freeze}>
              <Icon name="snow" size={9} color={colors.skyInk} strokeWidth={3} />
            </View>
          ) : null}
        </View>
        <Txt w={900} size={16} color={streak > 0 ? colors.flame : colors.muted}>
          {fa(streak)}
        </Txt>
      </Pressable>
      <Pressable onPress={() => router.push('/shop')} accessibilityRole="button" accessibilityLabel={`${faNum(coins)} سکه؛ فروشگاه`} hitSlop={4} style={styles.stat}>
        <CoinIcon />
        <Txt w={900} size={16} color={colors.gold}>
          {faNum(coins)}
        </Txt>
      </Pressable>
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
  freeze: {
    position: 'absolute',
    right: -5,
    bottom: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sky,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  boost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
  },
});
