import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import type { TrueFalseStep } from '@/content';
import { colors } from '@/theme';

import { OPTION_STYLE, QuestionTag, QuestionTitle, optionState } from './common';
import { OptionButton } from './OptionButton';
import type { QuestionProps } from './types';

const CHOICES = [
  { value: true, label: 'درسته', icon: 'check' as const, tint: colors.bull, soft: colors.bullSoft },
  { value: false, label: 'غلطه', icon: 'close' as const, tint: '#FF7A8A', soft: colors.bearSoft },
];

export function TrueFalseQuestion({ step, revealed, onAnswer }: QuestionProps<TrueFalseStep>) {
  const [selected, setSelected] = useState<boolean | null>(null);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label="درست یا غلط؟" icon="check" color={colors.sky} />
        <QuestionTitle>این جمله درسته یا غلط؟</QuestionTitle>
      </View>
      <View style={styles.statement}>
        {step.topic && (
          <View style={styles.topic}>
            <Txt w={900} size={12} color={colors.gold}>
              {step.topic}
            </Txt>
          </View>
        )}
        <Txt w={900} size={21} lh={1.8} center>
          {`«${step.statement}»`}
        </Txt>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Mascot mood="think" size={88} />
      </View>
      <View style={styles.row} accessibilityRole="radiogroup">
        {CHOICES.map((c) => {
          const state = optionState(selected === c.value, c.value === step.answer, revealed);
          return (
            <OptionButton
              key={c.label}
              state={state}
              disabled={revealed}
              onPress={() => {
                setSelected(c.value);
                onAnswer(c.value === step.answer);
              }}
              accessibilityLabel={c.label}
              style={styles.option}
            >
              <View style={[styles.icon, { backgroundColor: c.soft }]}>
                <Icon name={c.icon} size={24} color={c.tint} strokeWidth={3.4} />
              </View>
              <Txt w={900} size={19} color={OPTION_STYLE[state].text}>
                {c.label}
              </Txt>
            </OptionButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statement: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  topic: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
