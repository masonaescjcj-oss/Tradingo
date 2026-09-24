import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { ChartCard } from '@/components/lesson/ChartQuestion';
import { Txt } from '@/components/Txt';
import type { ChartSpec } from '@/content/types';
import { atr, CHART_AHEAD, chartActual, chartPoints, chartShown, type DuelChart, type DuelResult } from '@/lib/duel';
import { playSfx } from '@/lib/sfx';
import { colors } from '@/theme';
import { fa, formatPrice } from '@/utils/format';

/** Round 2: drag a line to where the price will close a few candles later. */
export function ChartRound({ chart, onDone }: { chart: DuelChart; onDone: (r: DuelResult['chart']) => void }) {
  const shown = chartShown(chart);
  const last = shown[shown.length - 1][3];
  const unit = atr(shown);
  const [guess, setGuess] = useState(last);
  const [revealed, setRevealed] = useState(false);

  const lows = Math.min(...shown.map((c) => c[2]));
  const highs = Math.max(...shown.map((c) => c[1]));
  const lo = lows - unit * 3;
  const hi = highs + unit * 3;
  const k = 10 ** chart.decimals;
  const nudge = Math.max(1 / k, Math.round((unit / 4) * k) / k);
  const fmt = (p: number) => formatPrice(p, chart.decimals);
  const actual = chartActual(chart);
  const points = chartPoints(chart, guess);

  const move = (p: number) => setGuess(Math.round(Math.min(hi, Math.max(lo, p)) * k) / k);

  const spec: ChartSpec = revealed
    ? { candles: chart.candles, ma: 9, lines: [{ price: actual, label: 'قیمت واقعی', value: fmt(actual), color: colors.gold, ink: colors.goldInk }] }
    : { candles: shown, ma: 9 };

  const submit = () => {
    setRevealed(true);
    playSfx(points >= 60 ? 'correct' : points > 0 ? 'complete' : 'wrong');
  };

  return (
    <View style={{ gap: 14 }}>
      <Txt w={900} size={16} lh={1.7}>
        {revealed ? 'این شد ادامه‌ی نمودار:' : `قیمت ${fa(CHART_AHEAD)} کندل بعد (${fa(CHART_AHEAD)} ساعت بعد) کجا بسته می‌شه؟ خط آبی رو ببر همون‌جا.`}
      </Txt>
      <ChartCard
        chart={spec}
        symbol={`${chart.label} · H1`}
        height={250}
        dragLine={{
          price: guess,
          label: 'حدس تو',
          color: colors.sky,
          ink: colors.skyInk,
          onChange: move,
          disabled: revealed,
          extent: [lo, hi],
          decimals: chart.decimals,
          step: nudge,
        }}
      />
      {revealed ? (
        <View style={[styles.result, { borderColor: points >= 60 ? colors.bull : points > 0 ? colors.gold : colors.bear }]}>
          <Txt w={900} size={22} color={points >= 60 ? colors.bullText : points > 0 ? colors.gold : colors.bearText}>
            {`+${fa(points)} امتیاز`}
          </Txt>
          <Txt w={700} size={13} lh={1.7} color={colors.text2} center>
            {`حدست ${fmt(guess)} بود و قیمت روی ${fmt(actual)} بسته شد؛ ${fa((Math.abs(guess - actual) / unit).toFixed(1))} برابر اندازه‌ی یه کندل فاصله.`}
          </Txt>
        </View>
      ) : (
        <View style={styles.controls}>
          <Nudge dir={1} onPress={() => move(guess + nudge)} />
          <View style={styles.readout}>
            <Txt w={700} size={12} color={colors.text3}>
              حدس تو
            </Txt>
            <Txt mono w={800} size={16}>
              {fmt(guess)}
            </Txt>
          </View>
          <Nudge dir={-1} onPress={() => move(guess - nudge)} />
        </View>
      )}
      {revealed ? <Button3D label="ادامه" onPress={() => onDone({ guess, points })} /> : <Button3D label="ثبت پیش‌بینی" onPress={submit} />}
    </View>
  );
}

function Nudge({ dir, onPress }: { dir: 1 | -1; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={dir > 0 ? 'بالاتر' : 'پایین‌تر'} style={({ pressed }) => [styles.nudge, pressed && { opacity: 0.7 }]}>
      <View style={dir < 0 ? { transform: [{ rotate: '180deg' }] } : null}>
        <Icon name="arrowUp" size={20} color={colors.text} strokeWidth={2.8} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readout: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  nudge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  result: {
    alignItems: 'center',
    gap: 4,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
});
