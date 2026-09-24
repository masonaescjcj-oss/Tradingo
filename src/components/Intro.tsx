import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import { colors } from '@/theme';

const native = Platform.OS !== 'web';

// Keep the phone's own splash (app.json: expo-splash-screen) up until the intro's first frame,
// which draws the same picture, so the hand-over can't be seen.
if (native) SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Width of Shamak on the phone's splash: splash-icon.png is shown 180dp wide (imageWidth in
 * app.json) and the mascot's 140-unit box fills 700 of its 1024 pixels, centred.
 */
const SPLASH_MASCOT = (180 * 700) / 1024;

/** The rising candles above the wordmark, left to right: [colour, body height, how high it sits]. */
const CANDLES: [string, number, number][] = [
  [colors.bull, 16, 0],
  [colors.bear, 10, 8],
  [colors.bull, 20, 6],
  [colors.bear, 12, 18],
  [colors.bull, 26, 14],
];

/** How long the intro plays before it can leave, if the app is ready by then. */
const PLAY_MS = 1700;

/**
 * The opening, like Duolingo's: Shamak starts where the splash left him, hops down to peek over
 * the bottom edge, «چارتون» pops up in the middle with its candles, then the whole thing fades
 * into the app. It also covers loading: it leaves only once the app is `ready`.
 */
export function Intro({ fontsReady, ready, onDone }: { fontsReady: boolean; ready: boolean; onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const size = Math.min(W * 0.42, 200);
  const tall = (size * 170) / 140;
  // Resting place: 70% of Shamak shows above the bottom edge. The start pose, the splash's
  // centred mascot, is expressed as a move and a scale from there.
  const startY = H / 2 - (H - 0.7 * tall + tall / 2);
  const startScale = SPLASH_MASCOT / size;
  const wordSize = Math.round(Math.min(W * 0.2, 84));

  const [t] = useState(() => ({
    fall: new Animated.Value(0),
    squash: new Animated.Value(0),
    bob: new Animated.Value(0),
    word: new Animated.Value(0),
    candles: CANDLES.map(() => new Animated.Value(0)),
    exit: new Animated.Value(0),
    appear: new Animated.Value(native ? 1 : 0),
  }));
  const [played, setPlayed] = useState(false);
  const leaving = useRef(false);

  // Plays once the brand font is in, so the wordmark never shows in a stand-in face.
  useEffect(() => {
    if (!fontsReady) return;
    let cancelled = false;
    let run: Animated.CompositeAnimation | null = null;
    const done = setTimeout(() => setPlayed(true), PLAY_MS);
    const drive = (v: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: native });
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          // No hops or pops: everything simply shows, then fades out as usual.
          [t.appear, t.fall, t.word, ...t.candles].forEach((v) => v.setValue(1));
          return;
        }
        run = Animated.parallel([
          drive(t.appear, 1, 220),
          Animated.sequence([
            Animated.delay(native ? 60 : 200),
            drive(t.squash, 1, 160, Easing.out(Easing.quad)),
            Animated.parallel([
              drive(t.squash, 0, 260, Easing.out(Easing.back(3))),
              Animated.spring(t.fall, { toValue: 1, friction: 7, tension: 55, useNativeDriver: native }),
            ]),
            Animated.delay(120),
            drive(t.bob, 1, 260, Easing.inOut(Easing.sin)),
            drive(t.bob, 0, 300, Easing.inOut(Easing.sin)),
          ]),
          Animated.sequence([
            Animated.delay(native ? 320 : 460),
            Animated.parallel([
              Animated.spring(t.word, { toValue: 1, friction: 6, tension: 80, useNativeDriver: native }),
              Animated.stagger(70, t.candles.map((v) => drive(v, 1, 280, Easing.out(Easing.back(2))))),
            ]),
          ]),
        ]);
        run.start();
      });
    return () => {
      cancelled = true;
      clearTimeout(done);
      run?.stop();
    };
  }, [fontsReady, t]);

  useEffect(() => {
    if (!played || !ready || leaving.current) return;
    leaving.current = true;
    Animated.timing(t.exit, { toValue: 1, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(() => onDone());
  }, [played, ready, onDone, t]);

  const lift = Animated.add(
    t.fall.interpolate({ inputRange: [0, 1], outputRange: [startY, 0] }),
    Animated.add(
      t.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }),
      t.exit.interpolate({ inputRange: [0, 1], outputRange: [0, tall] }),
    ),
  );
  const mascotStyle = {
    transform: [
      { translateY: lift },
      { scale: t.fall.interpolate({ inputRange: [0, 1], outputRange: [startScale, 1] }) },
      // A little squash before the hop, and a stretch as he lets go.
      { scaleX: t.squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
      { scaleY: t.squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
    ],
    opacity: t.appear,
  };
  const wordStyle = {
    opacity: t.word.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    transform: [
      {
        scale: Animated.add(
          t.word.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
          t.exit.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
        ),
      },
    ],
  };

  return (
    <Animated.View
      pointerEvents={played && ready ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: t.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
      onLayout={() => {
        if (native) SplashScreen.hide();
      }}
      accessibilityLabel="چارتون"
    >
      <Animated.View style={[styles.brand, { top: H * 0.45 - 70 }, wordStyle]}>
        <View style={styles.candles}>
          {CANDLES.map(([color, body, rise], i) => (
            <Animated.View key={i} style={[styles.candle, { marginBottom: rise, opacity: t.candles[i], transform: [{ scaleY: t.candles[i] }] }]}>
              <View style={[styles.wick, { backgroundColor: color }]} />
              <View style={[styles.body, { height: body, backgroundColor: color }]} />
              <View style={[styles.wick, { backgroundColor: color }]} />
            </Animated.View>
          ))}
        </View>
        <Txt display size={wordSize} color={colors.text} style={{ lineHeight: Math.round(wordSize * 1.25) }}>
          چارتون
        </Txt>
      </Animated.View>
      <Animated.View style={[styles.mascot, { width: size, height: tall, left: (W - size) / 2, top: H - 0.7 * tall }, mascotStyle]}>
        <Mascot size={size} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.bg,
    overflow: 'hidden',
    zIndex: 10,
  },
  brand: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  candles: {
    alignItems: 'flex-end',
    gap: 7,
    height: 58,
    marginBottom: 4,
    // The app lays rows out right to left; a chart still rises from left to right.
    flexDirection: 'row-reverse',
  },
  candle: {
    alignItems: 'center',
    transformOrigin: 'bottom',
  },
  wick: {
    width: 3,
    height: 6,
    borderRadius: 2,
  },
  body: {
    width: 12,
    borderRadius: 3,
  },
  mascot: {
    position: 'absolute',
  },
});
