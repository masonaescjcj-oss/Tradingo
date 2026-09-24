import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { byLang } from '@/i18n';
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
          tail === 'start' && [styles.tailStart, byLang<ViewStyle>(styles.tailStartRtl, styles.tailStartLtr)],
          tail === 'end' && [styles.tailEnd, byLang<ViewStyle>(styles.tailEndRtl, styles.tailEndLtr)],
          tail === 'bottomEnd' && [styles.tailBottomEnd, byLang<ViewStyle>(styles.tailBottomEndRtl, styles.tailBottomEndLtr)],
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
  // "start" is the right edge in Persian (right to left) and the left edge in English. A square
  // rotated 45° points right with its top/right edges, left with its bottom/left edges and down
  // with its bottom/right edges, so which edges get the outline depends on the direction.
  tailStart: {
    top: '50%',
    marginTop: -7,
    start: -9,
    borderStartWidth: 2,
  },
  tailStartRtl: {
    borderTopWidth: 2,
  },
  tailStartLtr: {
    borderBottomWidth: 2,
  },
  tailEnd: {
    top: '50%',
    marginTop: -7,
    end: -9,
    borderEndWidth: 2,
  },
  tailEndRtl: {
    borderBottomWidth: 2,
  },
  tailEndLtr: {
    borderTopWidth: 2,
  },
  tailBottomEnd: {
    bottom: -9,
    end: 30,
    borderBottomWidth: 2,
  },
  tailBottomEndRtl: {
    borderStartWidth: 2,
  },
  tailBottomEndLtr: {
    borderEndWidth: 2,
  },
});
