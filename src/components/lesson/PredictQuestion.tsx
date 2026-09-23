import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { PredictStep } from '@/content';
import { colors } from '@/theme';

import { ChartCard } from './ChartQuestion';
import { QuestionTag, QuestionTitle, optionState } from './common';
import { OptionButton } from './OptionButton';
import type { QuestionProps } from './types';

const SIDES = [
  { id: 'buy' as const, label: 'خرید', latin: 'Long', icon: 'arrowUpRight' as const, face: colors.bull, ink: colors.bullInk },
  { id: 'sell' as const, label: 'فروش', latin: 'Short', icon: 'arrowDownRight' as const, face: colors.bear, ink: colors.bearInk },
];

export function PredictQuestion({ step, revealed, onAnswer }: QuestionProps<PredictStep>) {
  const [selected, setSelected] = useState<'buy' | 'sell' | null>(null);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="پیش‌بینی قیمت" icon="target" color={colors.sky} />
        <QuestionTitle>{step.prompt}</QuestionTitle>
      </View>
      <ChartCard chart={step.chart} symbol={step.symbol} trend={step.trend} height={176} />
      <View style={styles.row} accessibilityRole="radiogroup">
        {SIDES.map((side) => {
          const state = optionState(selected === side.id, side.id === step.answer, revealed);
          return (
            <OptionButton
              key={side.id}
              state={state}
              disabled={revealed}
              onPress={() => {
                setSelected(side.id);
                onAnswer(side.id === step.answer);
              }}
              accessibilityLabel={`${side.label} (${side.latin})`}
              style={styles.option}
            >
              <View style={[styles.icon, { backgroundColor: side.face }]}>
                <Icon name={side.icon} size={22} color={side.ink} strokeWidth={3} />
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Txt w={900} size={20}>
                  {side.label}
                </Txt>
                <Txt mono w={700} size={11} color={colors.text2}>
                  {side.latin}
                </Txt>
              </View>
            </OptionButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
