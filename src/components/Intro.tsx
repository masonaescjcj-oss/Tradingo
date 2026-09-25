import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/LogoMark';
import { Txt } from '@/components/Txt';
import { byLang, t } from '@/i18n';
import { colors } from '@/theme';

const native = Platform.OS !== 'web';

// Keep the phone's own splash (app.json: expo-splash-screen) up until the intro's first frame,
// which draws the same picture, so the hand-over can't be seen.
if (native) SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * The splash (app.json: expo-splash-screen) shows splash-icon.png, the whole 240-unit square of
 * the logo (assets/brand/logo-mark.svg), 180dp wide (imageWidth) and centred on the screen.
 */
const SPLASH_BOX = 180;

/** How much of the logo's square shows above the floor when Shamak peeks: wick tip to just under the smile. */
const PEEK = 0.66;

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
 * The opening: Shamak starts where the splash left him, hops down to peek over
 * the bottom edge, «چارتون» pops up in the middle with its candles, then the whole thing fades
 * into the app. It also covers loading: it leaves only once the app is `ready`.
 */
export function Intro({ fontsReady, ready, onDone }: { fontsReady: boolean; ready: boolean; onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  // Shamak peeks over the phone's navigation bar, not from under it.
  const floor = H - useSafeAreaInsets().bottom;
  // The logo's square at rest (Shamak himself is 40% of its width); the start pose, the splash's
  // centred logo, is expressed as a move and a scale from there.
  const box = Math.min(W * 0.95, 380);
  const startY = H / 2 - (floor - PEEK * box + box / 2);
  const startScale = SPLASH_BOX / box;
  const wordSize = Math.round(Math.min(W * 0.2, 84));

  const [anim] = useState(() => ({
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
          [anim.appear, anim.fall, anim.word, ...anim.candles].forEach((v) => v.setValue(1));
          return;
        }
        run = Animated.parallel([
          drive(anim.appear, 1, 220),
          Animated.sequence([
            Animated.delay(native ? 60 : 200),
            drive(anim.squash, 1, 160, Easing.out(Easing.quad)),
            Animated.parallel([
              drive(anim.squash, 0, 260, Easing.out(Easing.back(3))),
              Animated.spring(anim.fall, { toValue: 1, friction: 7, tension: 55, useNativeDriver: native }),
            ]),
            Animated.delay(120),
            drive(anim.bob, 1, 260, Easing.inOut(Easing.sin)),
            drive(anim.bob, 0, 300, Easing.inOut(Easing.sin)),
          ]),
          Animated.sequence([
            Animated.delay(native ? 320 : 460),
            Animated.parallel([
              Animated.spring(anim.word, { toValue: 1, friction: 6, tension: 80, useNativeDriver: native }),
              Animated.stagger(70, anim.candles.map((v) => drive(v, 1, 280, Easing.out(Easing.back(2))))),
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
  }, [fontsReady, anim]);

  useEffect(() => {
    if (!played || !ready || leaving.current) return;
    leaving.current = true;
    Animated.timing(anim.exit, { toValue: 1, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(() => onDone());
  }, [played, ready, onDone, anim]);

  const lift = Animated.add(
    anim.fall.interpolate({ inputRange: [0, 1], outputRange: [startY, 0] }),
    Animated.add(
      anim.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }),
      anim.exit.interpolate({ inputRange: [0, 1], outputRange: [0, box + H - floor] }),
    ),
  );
  const mascotStyle = {
    transform: [
      { translateY: lift },
      { scale: anim.fall.interpolate({ inputRange: [0, 1], outputRange: [startScale, 1] }) },
      // A little squash before the hop, and a stretch as he lets go.
      { scaleX: anim.squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
      { scaleY: anim.squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
    ],
    opacity: anim.appear,
  };
  const wordStyle = {
    opacity: anim.word.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    transform: [
      {
        scale: Animated.add(
          anim.word.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
          anim.exit.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
        ),
      },
    ],
  };

  return (
    <Animated.View
      pointerEvents={played && ready ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
      onLayout={() => {
        if (native) SplashScreen.hide();
      }}
      accessibilityLabel={t('چارتون')}
    >
      {/* Mounted only once the brand font is in: Android keeps the stand-in face a text was first
          drawn with, even after the real font arrives. */}
      {fontsReady ? (
        <Animated.View style={[styles.brand, { top: H * 0.45 - 70 }, wordStyle]}>
          <View style={[styles.candles, { flexDirection: byLang('row-reverse', 'row') }]}>
            {CANDLES.map(([color, body, rise], i) => (
              <Animated.View key={i} style={[styles.candle, { marginBottom: rise, opacity: anim.candles[i], transform: [{ scaleY: anim.candles[i] }] }]}>
                <View style={[styles.wick, { backgroundColor: color }]} />
                <View style={[styles.body, { height: body, backgroundColor: color }]} />
                <View style={[styles.wick, { backgroundColor: color }]} />
              </Animated.View>
            ))}
          </View>
          <Txt display size={wordSize} color={colors.text} style={{ lineHeight: Math.round(wordSize * 1.25) }}>
            {t('چارتون')}
          </Txt>
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.mascot, { width: box, height: box, left: (W - box) / 2, top: floor - PEEK * box }, mascotStyle]}>
        <LogoMark size={box} />
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
    // The row's direction is set where it's used: a chart rises from left to right in both layouts.
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
