import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CandleChart, chartHeight, type CandleMark } from '@/components/CandleChart';
import { CandleGlyph } from '@/components/CandleGlyph';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { ChartSpec, ChartStep } from '@/content';
import { colors } from '@/theme';
import { useColumnWidth } from '@/utils/layout';
import { shuffle } from '@/utils/random';

import { OPTION_STYLE, QuestionTag, QuestionTitle, optionState } from './common';
import { OptionButton } from './OptionButton';
import type { QuestionProps } from './types';

/** The chart panel shared by chart and prediction questions. */
export function ChartCard({
  chart,
  symbol,
  trend,
  height = 186,
  onCandlePress,
  marks,
}: {
  chart: ChartSpec;
  symbol: string;
  trend?: 'up' | 'down';
  height?: number;
  onCandlePress?: (index: number) => void;
  marks?: Record<number, CandleMark>;
}) {
  const width = useColumnWidth() - 32 - 28;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Txt mono w={800} size={13} color={colors.text2}>
          {symbol}
        </Txt>
        {trend && (
          <View style={[styles.trend, { backgroundColor: trend === 'up' ? colors.bullSoft : colors.bearSoft }]}>
            <Icon name={trend === 'up' ? 'arrowUpRight' : 'arrowDownRight'} size={14} color={trend === 'up' ? colors.bullText : colors.bearText} strokeWidth={3} />
            <Txt w={800} size={12} color={trend === 'up' ? colors.bullText : colors.bearText}>
              {trend === 'up' ? 'روند صعودی' : 'روند نزولی'}
            </Txt>
          </View>
        )}
      </View>
      <CandleChart
        {...chart}
        width={width}
        height={chartHeight(chart, height)}
        labelSide={chart.ghost ? 'left' : 'right'}
        onCandlePress={onCandlePress}
        marks={marks}
      />
    </View>
  );
}

export function ChartQuestion({ step, revealed, onAnswer }: QuestionProps<ChartStep>) {
  const order = useMemo(() => shuffle(step.options.map((_, i) => i)), [step]);
  const [selected, setSelected] = useState<number | null>(null);
  const withGlyphs = step.options.some((o) => o.glyph);

  const pick = (i: number) => {
    setSelected(i);
    onAnswer(i === step.answer);
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="نمودارخوانی" />
        <QuestionTitle>{step.prompt}</QuestionTitle>
      </View>
      <ChartCard chart={step.chart} symbol={step.symbol} trend={step.trend} />
      <View style={withGlyphs ? styles.grid : styles.list} accessibilityRole="radiogroup">
        {order.map((optionIndex) => {
          const option = step.options[optionIndex];
          const state = optionState(selected === optionIndex, optionIndex === step.answer, revealed);
          const s = OPTION_STYLE[state];
          return (
            <OptionButton
              key={optionIndex}
              state={state}
              disabled={revealed}
              onPress={() => pick(optionIndex)}
              accessibilityLabel={option.label}
              style={withGlyphs ? styles.glyphOption : styles.textOption}
            >
              {option.glyph && <CandleGlyph kind={option.glyph} size={44} />}
              <Txt w={900} size={16} color={s.text} center>
                {option.label}
              </Txt>
              {option.latin && (
                <Txt mono w={700} size={11} color={colors.text3}>
                  {option.latin}
                </Txt>
              )}
            </OptionButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    gap: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  list: {
    gap: 12,
  },
  glyphOption: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: 110,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  textOption: {
    minHeight: 58,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
