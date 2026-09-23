import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Button3D } from '@/components/Button3D';
import { CandleChart } from '@/components/CandleChart';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { ALL_COURSES } from '@/content';
import { UPTREND } from '@/content/charts';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

/** The first screen: brand, a friendly hello and the two ways in. */
export default function Welcome() {
  const { height } = useWindowDimensions();
  const user = useGame((s) => s.user);
  const signedOut = useGame((s) => s.signedOut);
  const returning = !!user && signedOut;
  const [confirmNew, setConfirmNew] = useState(false);
  // Small phones get a smaller stage and no feature chips, so nothing overlaps the buttons.
  const compact = height < 720;
  const scale = compact ? 0.78 : 1;

  return (
    <Screen style={styles.screen}>
      <GridBackdrop />
      <View style={styles.hero}>
        <View style={[styles.stage, { width: 320 * scale, height: 290 * scale }]}>
          <View style={[styles.chart, { left: 10 * scale, bottom: 24 * scale }]} pointerEvents="none">
            <CandleChart candles={UPTREND} width={300 * scale} height={180 * scale} background="transparent" grid={false} />
          </View>
          <FloatingMascot size={136 * scale} left={92 * scale} />
          <SpeechBubble tail="bottomEnd" background={colors.text} border="#D5DBE6" style={[styles.bubble, { width: 200 * scale }]}>
            <Txt w={800} size={compact ? 13 : 15} lh={1.7} color={colors.bg}>
              {returning ? `خوش برگشتی، ${user.name}! دلم برات تنگ شده بود.` : 'سلام! من شمعکم. بیا با هم ترید رو یاد بگیریم.'}
            </Txt>
          </SpeechBubble>
        </View>
        <Txt display size={compact ? 48 : 60} color={colors.bull} style={[styles.wordmark, { lineHeight: compact ? 60 : 72 }]}>
          تریدینگو
        </Txt>
        <Txt w={900} size={compact ? 18 : 21} center>
          ترید رو مثل یه بازی یاد بگیر
        </Txt>
        {!compact && (
          <View style={styles.features}>
            <Feature text={`${fa(ALL_COURSES.length)} دوره`} />
            <Feature text="درس‌های ۵ دقیقه‌ای" />
            <Feature text="شبیه‌ساز معامله" />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {returning ? (
          <>
            <Button3D label="ورود به حسابم" onPress={() => router.push('/login')} />
            <Button3D label="ساخت حساب جدید" variant="secondary" size={16} onPress={() => setConfirmNew(true)} />
          </>
        ) : (
          <>
            <Button3D label="شروع کن" onPress={() => router.push('/onboarding')} />
            <Button3D label="حساب دارم؛ ورود" variant="secondary" size={16} onPress={() => router.push('/login')} />
          </>
        )}
        <Txt size={12} lh={1.7} color={colors.text3} center>
          محتوای تریدینگو آموزشیه و توصیه‌ی سرمایه‌گذاری نیست.
        </Txt>
      </View>

      <Modal visible={confirmNew} transparent animationType="fade" onRequestClose={() => setConfirmNew(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Mascot mood="think" size={90} />
            <Txt w={900} size={18} center>
              حساب جدید بسازی؟
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              {`پیشرفت حساب «${user?.name ?? ''}» روی این دستگاه پاک می‌شه و از اول شروع می‌کنی.`}
            </Txt>
            <Button3D
              label="آره، از اول"
              variant="danger"
              size={16}
              onPress={() => {
                setConfirmNew(false);
                useGame.getState().resetAll();
                router.push('/onboarding');
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label="نه، برمی‌گردم" variant="secondary" size={16} onPress={() => setConfirmNew(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

/** The mascot gently bobbing up and down. */
function FloatingMascot({ size, left }: { size: number; left: number }) {
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -8, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  return (
    <Animated.View style={[styles.mascot, { left, transform: [{ translateY: bob }] }]}>
      <Mascot mood="happy" size={size} />
    </Animated.View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.dot} />
      <Txt w={800} size={13} color={colors.text2}>
        {text}
      </Txt>
    </View>
  );
}

/** Faint chart-paper grid behind the hero. */
function GridBackdrop() {
  const lines = Array.from({ length: 40 }, (_, i) => i * 32);
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines.map((p) => (
        <Line key={`h${p}`} x1={0} x2={2000} y1={p} y2={p} stroke="rgba(255,255,255,0.035)" strokeWidth={1} />
      ))}
      {lines.map((p) => (
        <Line key={`v${p}`} x1={p} x2={p} y1={0} y2={2000} stroke="rgba(255,255,255,0.035)" strokeWidth={1} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  hero: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stage: {
    direction: 'ltr',
  },
  chart: {
    position: 'absolute',
    opacity: 0.4,
  },
  mascot: {
    position: 'absolute',
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 18,
  },
  wordmark: {
    marginTop: 4,
    textShadowColor: '#0B3D24',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'rgba(23,31,49,0.8)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bull,
  },
  actions: {
    gap: 12,
    paddingTop: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    padding: 22,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
});
