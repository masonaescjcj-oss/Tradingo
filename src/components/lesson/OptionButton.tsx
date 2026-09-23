import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';

import { OPTION_STYLE, type OptionState } from './common';

type Props = {
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  role?: 'radio' | 'button';
};

/** Bordered 3D answer tile shared by every question type. */
export function OptionButton({ state, onPress, disabled, children, style, accessibilityLabel, role = 'radio' }: Props) {
  const s = OPTION_STYLE[state];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={role === 'radio' ? { checked: state === 'selected' || state === 'correct' || state === 'wrong' } : undefined}
      style={({ pressed }) => [
        styles.base,
        { borderColor: s.border, backgroundColor: s.bg, opacity: s.opacity ?? 1 },
        pressed && !disabled && { transform: [{ translateY: 2 }], borderBottomWidth: 3 },
        style,
      ]}
    >
      {children}
      {(state === 'correct' || state === 'wrong') && (
        <View style={[styles.mark, { backgroundColor: s.border }]}>
          <Icon name={state === 'correct' ? 'check' : 'close'} size={12} color="#0E1320" strokeWidth={4} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  mark: {
    position: 'absolute',
    top: 8,
    end: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
