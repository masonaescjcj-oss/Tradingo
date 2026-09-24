import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import type { ChoiceStep } from '@/content';
import { t } from '@/i18n';
import { colors } from '@/theme';
import { fa } from '@/utils/format';
import { shuffle } from '@/utils/random';

import { OPTION_STYLE, QuestionTag, QuestionTitle, TONE_COLOR, optionState } from './common';
import { OptionButton } from './OptionButton';
import type { QuestionProps } from './types';

const FACT_STYLE = {
  bull: { border: colors.bullSheetLine, bg: '#10251B', label: '#A9E5C3' },
  bear: { border: '#5A2230', bg: '#22121A', label: '#F3B6C0' },
  gold: { border: colors.goldCardLine, bg: colors.goldCard, label: '#E8D29B' },
  sky: { border: '#1F4A73', bg: '#10223A', label: colors.skyText },
  neutral: { border: colors.line, bg: colors.surface, label: colors.text2 },
};

export function ChoiceQuestion({ step, topic, revealed, onAnswer }: QuestionProps<ChoiceStep>) {
  const order = useMemo(() => shuffle(step.options.map((_, i) => i)), [step]);
  const [selected, setSelected] = useState<number | null>(null);

  const pick = (i: number) => {
    setSelected(i);
    onAnswer(i === step.answer);
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label={step.facts ? t('محاسبه · {topic}', { topic }) : topic} icon={step.facts ? 'target' : undefined} color={step.facts ? colors.sky : colors.gold} />
        <QuestionTitle>{step.prompt}</QuestionTitle>
      </View>
      {step.facts && (
        <View style={styles.facts}>
          {step.facts.map((f) => {
            const fs = FACT_STYLE[f.tone];
            return (
              <View key={f.label} style={[styles.fact, { borderColor: fs.border, backgroundColor: fs.bg }]}>
                <Txt w={800} size={12} color={fs.label}>
                  {f.label}
                </Txt>
                <Txt w={900} size={19} color={TONE_COLOR[f.tone]}>
                  {f.value}
                </Txt>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {order.map((optionIndex, n) => {
          const state = optionState(selected === optionIndex, optionIndex === step.answer, revealed);
          const s = OPTION_STYLE[state];
          return (
            <OptionButton key={optionIndex} state={state} disabled={revealed} onPress={() => pick(optionIndex)} style={styles.option}>
              <View style={[styles.num, { borderColor: state === 'idle' || state === 'dim' ? colors.line : s.border }]}>
                <Txt w={900} size={14} color={state === 'idle' || state === 'dim' ? colors.text3 : s.text}>
                  {fa(n + 1)}
                </Txt>
              </View>
              <Txt w={800} size={16} lh={1.6} color={s.text} style={{ flex: 1 }}>
                {step.options[optionIndex]}
              </Txt>
            </OptionButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  facts: {
    flexDirection: 'row',
    gap: 10,
  },
  fact: {
    flex: 1,
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  option: {
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 14,
    paddingEnd: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  num: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
