import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Props = { value: number; height?: number; color?: string; track?: string; label?: string };

/** Rounded bar that fills from the start edge (the right, in RTL), sliding to each new value. */
export function ProgressBar({ value, height = 16, color = colors.bull, track = colors.raised, label }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const [fill] = useState(() => new Animated.Value(pct));
  useEffect(() => {
    // Width can't run on the native driver; the bar is small enough for the JS one.
    const run = Animated.timing(fill, { toValue: pct, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [fill, pct]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}
    >
      <Animated.View
        style={{ width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), height, borderRadius: height / 2, backgroundColor: color }}
      >
        {height >= 14 && pct > 0 && <View style={[styles.shine, { top: height * 0.2 }]} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    overflow: 'hidden',
    flexGrow: 1,
  },
  shine: {
    position: 'absolute',
    start: 8,
    end: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
