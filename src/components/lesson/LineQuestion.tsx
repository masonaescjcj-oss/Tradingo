import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { ChartSpec, LineStep } from '@/content';
import { toneColor } from '@/content/charts';
import { bandDecimals, isLineCorrect, lineDecimals, lineExtent, lineNudge, roundPrice } from '@/content/line';
import { colors } from '@/theme';
import { formatPrice } from '@/utils/format';

import { ChartCard } from './ChartQuestion';
import { QuestionTag, QuestionTitle } from './common';
import type { QuestionProps } from './types';

/** Drag a horizontal line on the chart to the right price (a stop, an entry, a level…). */
export function LineQuestion({ step, revealed, onAnswer }: QuestionProps<LineStep>) {
  const [price, setPrice] = useState(step.start);
  const [moved, setMoved] = useState(false);

  const decimals = lineDecimals(step);
  const [lo, hi] = lineExtent(step);
  const nudge = lineNudge(step);
  const tone = toneColor(step.tone ?? 'sky');
  const inBand = isLineCorrect(step, price);
  const fmt = (p: number) => formatPrice(p, decimals);
  const band = step.answer.map((p) => formatPrice(p, bandDecimals(step)));

  const move = (next: number) => {
    const p = roundPrice(Math.min(hi, Math.max(lo, next)), decimals);
    setPrice(p);
    setMoved(true);
    onAnswer(isLineCorrect(step, p));
  };

  // After checking, the accepted band shows as a green zone behind the line (unlabelled, so it never hides the line's tag).
  const chart: ChartSpec = revealed ? { ...step.chart, zones: [...(step.chart.zones ?? []), { from: step.answer[0], to: step.answer[1], tone: 'bull' }] } : step.chart;

  const hint = revealed
    ? inBand
      ? `خطت روی ${fmt(price)} و داخل محدوده‌ی درسته.`
      : `خطت روی ${fmt(price)} بود؛ محدوده‌ی درست (ناحیه‌ی سبز) ${band[0]} تا ${band[1]} هست.`
    : moved
      ? 'هنوز می‌تونی جابه‌جاش کنی؛ هر وقت مطمئن شدی «بررسی» رو بزن.'
      : 'خط رو بگیر و بالا یا پایین بکش، یا روی نمودار بزن. با دکمه‌ها هم دقیق جابه‌جا می‌شه.';

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="خط رو بکش" icon="sliders" color={colors.sky} />
        <QuestionTitle>{step.prompt}</QuestionTitle>
      </View>
      <ChartCard
        chart={chart}
        symbol={step.symbol}
        trend={step.trend}
        height={250}
        dragLine={{
          price,
          label: step.label,
          color: tone.color,
          ink: tone.ink,
          onChange: move,
          disabled: revealed,
          extent: [lo, hi],
          decimals,
          step: nudge,
        }}
      />
      <View style={styles.controls}>
        <NudgeButton dir={1} disabled={revealed} onPress={() => move(price + nudge)} />
        <View style={[styles.readout, revealed && { borderColor: inBand ? colors.bull : colors.bear }]}>
          <Txt w={700} size={12} color={colors.text3}>
            {step.label}
          </Txt>
          <Txt mono w={800} size={16} color={revealed ? (inBand ? colors.bullText : colors.bearText) : colors.text}>
            {fmt(price)}
          </Txt>
        </View>
        <NudgeButton dir={-1} disabled={revealed} onPress={() => move(price - nudge)} />
      </View>
      <Txt size={13} lh={1.7} color={colors.text3} center>
        {hint}
      </Txt>
    </View>
  );
}

function NudgeButton({ dir, disabled, onPress }: { dir: 1 | -1; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={dir === 1 ? 'خط بالاتر' : 'خط پایین‌تر'}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [styles.nudge, disabled && { opacity: 0.4 }, pressed && !disabled && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}
    >
      <View style={dir === 1 ? { transform: [{ rotate: '180deg' }] } : undefined}>
        <Icon name="chevronDown" size={22} color={colors.text} strokeWidth={3} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  nudge: {
    width: 56,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    minWidth: 128,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.lineSoft,
    backgroundColor: colors.surfaceDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
