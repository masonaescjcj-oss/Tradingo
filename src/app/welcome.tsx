import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Button3D } from '@/components/Button3D';
import { CandleChart } from '@/components/CandleChart';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { UPTREND } from '@/content/charts';
import { colors } from '@/theme';

export default function Welcome() {
  return (
    <Screen style={styles.screen}>
      <GridBackdrop />
      <View style={styles.hero}>
        <View style={styles.stage}>
          <View style={styles.chart} pointerEvents="none">
            <CandleChart candles={UPTREND} width={300} height={190} background="transparent" grid={false} />
          </View>
          <View style={styles.mascot}>
            <Mascot mood="happy" size={140} />
          </View>
          <SpeechBubble tail="bottomEnd" background={colors.text} border="#D5DBE6" style={styles.bubble}>
            <Txt w={800} size={15} lh={1.7} color={colors.bg}>
              سلام! من شمعکم. بیا با هم نمودار خوندن رو یاد بگیریم.
            </Txt>
          </SpeechBubble>
        </View>
        <Txt display size={60} color={colors.bull} style={styles.wordmark}>
          تریدینگو
        </Txt>
        <Txt w={900} size={21} center>
          ترید رو مثل یه بازی یاد بگیر
        </Txt>
        <Txt size={15} lh={1.9} color={colors.text2} center style={{ maxWidth: 310 }}>
          درس‌های ۵ دقیقه‌ای فارکس و کریپتو، با نمودارهای واقعی و شبیه‌ساز معامله با پول مجازی
        </Txt>
      </View>
      <View style={styles.actions}>
        <Button3D label="شروع کن" onPress={() => router.push('/setup')} />
        <Txt size={12} lh={1.7} color={colors.text3} center>
          محتوای تریدینگو آموزشیه و توصیه‌ی سرمایه‌گذاری نیست.
        </Txt>
      </View>
    </Screen>
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
    paddingBottom: 28,
    overflow: 'hidden',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stage: {
    width: 320,
    height: 300,
    direction: 'ltr',
  },
  chart: {
    position: 'absolute',
    left: 10,
    bottom: 24,
    opacity: 0.4,
  },
  mascot: {
    position: 'absolute',
    left: 90,
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    top: 6,
    right: 0,
    width: 196,
    borderRadius: 18,
  },
  wordmark: {
    marginTop: 6,
    lineHeight: 72,
    textShadowColor: '#0B3D24',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
  actions: {
    gap: 14,
  },
});
