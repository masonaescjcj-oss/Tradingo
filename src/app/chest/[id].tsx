import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button3D } from '@/components/Button3D';
import { Chest, CHEST_LOOK } from '@/components/Chest';
import { Confetti } from '@/components/Confetti';
import { CoinIcon, HeartIcon, Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { CHEST_AFTER, findUnitWithCourse } from '@/content';
import { CHEST_REWARDS, chestPlan, UPGRADE_TAPS } from '@/lib/chest';
import { playSfx } from '@/lib/sfx';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

/** Opening a path chest: three taps that may upgrade it, then the reward. */
export default function ChestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const completed = useGame((s) => s.completed);
  const claimed = useGame((s) => s.chests.includes(id));
  const claimChest = useGame((s) => s.claimChest);

  const plan = chestPlan(id);
  const unit = findUnitWithCourse(id.replace(/-chest$/, ''))?.unit;
  const earned = !!unit && unit.lessons.slice(0, CHEST_AFTER).every((l) => completed[l.id]);

  const [taps, setTaps] = useState(0);
  const [opened, setOpened] = useState(false);
  const [bob] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));

  // A chest opened before (or reached by a link) shows as already open.
  const done = opened || claimed;
  const tier = done ? plan.final : taps === 0 ? plan.start : plan.steps[taps - 1];
  const look = CHEST_LOOK[tier];
  const reward = CHEST_REWARDS[plan.final];
  const upgradedAt = plan.steps.map((t, i) => t !== (i === 0 ? plan.start : plan.steps[i - 1]));
  const justUpgraded = taps > 0 && upgradedAt[taps - 1];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -10, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const tap = () => {
    if (done || taps >= UPGRADE_TAPS || !earned) return;
    const upgraded = upgradedAt[taps];
    setTaps(taps + 1);
    shake.setValue(0);
    Animated.timing(shake, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: false }).start();
    if (upgraded) {
      playSfx('correct');
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: false }).start();
    }
  };

  const open = () => {
    if (done || !earned) return;
    claimChest(id, reward);
    playSfx('chest');
    setOpened(true);
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 100, useNativeDriver: false }).start();
  };

  const rotate = shake.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: ['0deg', '-9deg', '8deg', '-6deg', '4deg', '0deg'] });
  const message = !earned
    ? 'این صندوق بعد از تموم کردن درس‌های قبلیِ واحد باز می‌شه.'
    : done
      ? opened
        ? 'نوش جونت!'
        : 'این صندوق رو قبلاً باز کردی.'
      : taps < UPGRADE_TAPS
        ? justUpgraded
          ? `ارتقا گرفت! حالا ${look.label}ه. باز هم بزن!`
          : 'روی صندوق بزن؛ شاید ارتقا بگیره!'
        : 'آماده‌ست! بازش کن.';

  return (
    <View style={[styles.screen, { backgroundColor: look.bg, paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="بستن" hitSlop={10} style={styles.close}>
          <Icon name="close" size={24} color="rgba(255,255,255,0.85)" strokeWidth={2.8} />
        </Pressable>
      </View>

      <View style={styles.middle}>
        <Txt display size={40} color="#FFFFFF" style={styles.tier}>
          {look.label}
        </Txt>

        <Pressable onPress={tap} disabled={done || taps >= UPGRADE_TAPS || !earned} accessibilityRole="button" accessibilityLabel="زدن روی صندوق">
          <Animated.View style={{ transform: [{ translateY: done ? 0 : bob }, { rotate }, { scale: pop }] }}>
            <Sparkles />
            <Chest tier={tier} size={230} open={done} locked={!earned} />
          </Animated.View>
        </Pressable>

        {!done && earned ? (
          <View style={styles.dots} accessibilityLabel={`${fa(UPGRADE_TAPS - taps)} ضربه‌ی دیگه`}>
            {Array.from({ length: UPGRADE_TAPS }, (_, i) => {
              const used = i < taps;
              const next = i === taps;
              return (
                <View key={i} style={[styles.dot, next && styles.dotNext, used && (upgradedAt[i] ? styles.dotUp : styles.dotUsed)]}>
                  {used && upgradedAt[i] ? (
                    <Icon name="arrowUp" size={22} color={colors.goldInk} strokeWidth={3.2} />
                  ) : used ? (
                    <Icon name="check" size={20} color="rgba(255,255,255,0.7)" strokeWidth={3} />
                  ) : (
                    <Icon name="arrowUp" size={22} color={next ? look.body : 'rgba(255,255,255,0.55)'} strokeWidth={3.2} />
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        <Txt w={900} size={19} lh={1.6} color="#FFFFFF" center style={styles.message}>
          {message}
        </Txt>

        {done ? (
          <View style={styles.rewards}>
            <RewardRow icon={<CoinIcon size={26} />} text={`+${fa(reward.coins)} سکه`} />
            {reward.xp > 0 ? <RewardRow icon={<Icon name="bulb" size={24} color={colors.gold} strokeWidth={2.6} />} text={`+${fa(reward.xp)} امتیاز`} /> : null}
            {reward.hearts ? <RewardRow icon={<HeartIcon size={26} />} text="قلب‌هات پر شد" /> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        {!earned || done ? (
          <Button3D label="ادامه" variant="secondary" onPress={() => router.back()} />
        ) : taps < UPGRADE_TAPS ? (
          <Button3D label={`بزن (${fa(UPGRADE_TAPS - taps)})`} variant="secondary" onPress={tap} />
        ) : (
          <Button3D label="باز کن" variant="gold" onPress={open} />
        )}
      </View>

      {opened ? <Confetti /> : null}
    </View>
  );
}

function RewardRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.reward}>
      {icon}
      <Txt w={900} size={18} color="#FFFFFF">
        {text}
      </Txt>
    </View>
  );
}

/** A few twinkles around the chest. */
function Sparkles() {
  const spots = [
    { left: 10, top: 10, s: 16 },
    { left: 206, top: 60, s: 20 },
    { left: -14, top: 120, s: 12 },
    { left: 190, top: 170, s: 14 },
  ];
  return (
    <>
      {spots.map((p, i) => (
        <View key={i} pointerEvents="none" style={[styles.spark, { left: p.left, top: p.top, width: p.s, height: p.s }]} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  top: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  tier: {
    lineHeight: 52,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  dots: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 6,
  },
  dot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  dotNext: {
    backgroundColor: '#FFFFFF',
    transform: [{ translateY: -6 }],
  },
  dotUsed: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  dotUp: {
    backgroundColor: colors.gold,
  },
  message: {
    maxWidth: 320,
  },
  rewards: {
    gap: 10,
    alignItems: 'center',
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  bottom: {
    paddingTop: 12,
  },
  spark: {
    position: 'absolute',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
    transform: [{ rotate: '45deg' }],
  },
});
