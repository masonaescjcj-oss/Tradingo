import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { colors } from '@/theme';

const COLORS = [colors.bull, colors.gold, colors.sky, colors.bear, '#A78BFA', colors.flame];
const PIECES = 36;

// Deterministic "randomness" so every render lays pieces out the same way.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** A one-shot burst of falling confetti over the whole screen. */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const [progress] = useState(() => Array.from({ length: PIECES }, () => new Animated.Value(0)));

  useEffect(() => {
    const anims = progress.map((v, i) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 1800 + rand(i, 1) * 1400,
        delay: rand(i, 2) * 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    Animated.parallel(anims).start();
  }, [progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {progress.map((v, i) => {
        const x = rand(i, 3) * width;
        const drift = (rand(i, 4) - 0.5) * 120;
        const size = 6 + rand(i, 5) * 6;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: -20,
              width: size,
              height: size * (rand(i, 6) > 0.5 ? 1.8 : 1),
              borderRadius: rand(i, 7) > 0.7 ? size : 2,
              backgroundColor: COLORS[i % COLORS.length],
              opacity: v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height * (0.6 + rand(i, 8) * 0.4)] }) },
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(rand(i, 9) - 0.5) * 1080}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
