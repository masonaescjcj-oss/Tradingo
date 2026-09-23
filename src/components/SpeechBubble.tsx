import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  children: ReactNode;
  /** Side the tail points to, towards the mascot. */
  tail?: 'start' | 'end' | 'bottomEnd';
  background?: string;
  border?: string;
  style?: StyleProp<ViewStyle>;
};

export function SpeechBubble({ children, tail = 'start', background = colors.surface, border = colors.line, style }: Props) {
  return (
    <View style={[styles.bubble, { backgroundColor: background, borderColor: border }, style]}>
      {children}
      <View
        style={[
          styles.tail,
          { backgroundColor: background, borderColor: border },
          tail === 'start' && styles.tailStart,
          tail === 'end' && styles.tailEnd,
          tail === 'bottomEnd' && styles.tailBottomEnd,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tail: {
    position: 'absolute',
    width: 14,
    height: 14,
    transform: [{ rotate: '45deg' }],
  },
  // The layout is always right-to-left, so "start" is the physical right edge.
  // A square rotated 45° points right with its top/right edges and left with its bottom/left edges.
  tailStart: {
    top: '50%',
    marginTop: -7,
    start: -9,
    borderTopWidth: 2,
    borderStartWidth: 2,
  },
  tailEnd: {
    top: '50%',
    marginTop: -7,
    end: -9,
    borderBottomWidth: 2,
    borderEndWidth: 2,
  },
  tailBottomEnd: {
    bottom: -9,
    end: 30,
    borderBottomWidth: 2,
    borderStartWidth: 2,
  },
});
