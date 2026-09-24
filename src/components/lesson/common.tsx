import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, SparkIcon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { Tone } from '@/content';
import { colors } from '@/theme';

export const TONE_COLOR: Record<Tone, string> = {
  bull: colors.bullText,
  bear: colors.bearText,
  gold: colors.gold,
  sky: colors.skyText,
  neutral: colors.text,
};

export const DOT_COLOR: Record<Tone, string> = {
  bull: colors.bull,
  bear: colors.bear,
  gold: colors.gold,
  sky: colors.sky,
  neutral: colors.text2,
};

/** Small coloured label above a question, e.g. "Chart reading". */
export function QuestionTag({ label, icon, color = colors.gold }: { label: string; icon?: IconName; color?: string }) {
  return (
    <View style={styles.tag}>
      {icon ? <Icon name={icon} size={16} color={color} strokeWidth={2.6} /> : <SparkIcon size={16} color={color} />}
      <Txt w={800} size={13} color={color}>
        {label}
      </Txt>
    </View>
  );
}

export function QuestionTitle({ children }: { children: ReactNode }) {
  return (
    <Txt w={900} size={21} lh={1.65}>
      {children}
    </Txt>
  );
}

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

export const OPTION_STYLE: Record<OptionState, { border: string; bg: string; text: string; opacity?: number }> = {
  idle: { border: colors.line, bg: colors.surface, text: colors.text },
  selected: { border: colors.sky, bg: colors.skySoft, text: colors.skyText },
  correct: { border: colors.bull, bg: colors.bullSoft, text: colors.bullText },
  wrong: { border: colors.bear, bg: colors.bearSoft, text: colors.bearText },
  dim: { border: colors.line, bg: colors.surface, text: colors.text, opacity: 0.45 },
};

/**
 * Visual state of an option. Before checking only the selection shows;
 * after checking the right answer turns green and a wrong pick turns red.
 */
export function optionState(selected: boolean, isAnswer: boolean, revealed: boolean): OptionState {
  if (!revealed) return selected ? 'selected' : 'idle';
  if (isAnswer) return 'correct';
  return selected ? 'wrong' : 'dim';
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
