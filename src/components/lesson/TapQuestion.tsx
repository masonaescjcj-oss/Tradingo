import { useState } from 'react';
import { View } from 'react-native';

import type { CandleMark } from '@/components/CandleChart';
import { Txt } from '@/components/Txt';
import type { TapStep } from '@/content';
import { colors } from '@/theme';

import { ChartCard } from './ChartQuestion';
import { QuestionTag, QuestionTitle } from './common';
import type { QuestionProps } from './types';

/** Tap the candle on the chart that answers the prompt. */
export function TapQuestion({ step, revealed, onAnswer }: QuestionProps<TapStep>) {
  const [selected, setSelected] = useState<number | null>(null);

  const marks: Record<number, CandleMark> = {};
  if (revealed) {
    if (selected != null && selected !== step.answer) marks[selected] = 'wrong';
    marks[step.answer] = 'correct';
  } else if (selected != null) {
    marks[selected] = 'selected';
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="روی نمودار بزن" icon="target" color={colors.sky} />
        <QuestionTitle>{step.prompt}</QuestionTitle>
      </View>
      <ChartCard
        chart={step.chart}
        symbol={step.symbol}
        trend={step.trend}
        height={220}
        marks={marks}
        onCandlePress={
          revealed
            ? undefined
            : (i) => {
                setSelected(i);
                onAnswer(i === step.answer);
              }
        }
      />
      <Txt size={13} color={colors.text3} center>
        {selected == null ? 'روی کندلی که فکر می‌کنی درسته بزن.' : 'می‌تونی انتخابت رو عوض کنی؛ بعد «بررسی» رو بزن.'}
      </Txt>
    </View>
  );
}
