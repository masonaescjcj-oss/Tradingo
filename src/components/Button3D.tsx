import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

import { Txt } from './Txt';

export type ButtonVariant = 'primary' | 'danger' | 'secondary' | 'gold' | 'disabled';

const VARIANTS: Record<ButtonVariant, { face: string; edge: string; ink: string; border?: string }> = {
  primary: { face: colors.bull, edge: colors.bullEdge, ink: colors.bullInk },
  danger: { face: colors.bear, edge: colors.bearEdge, ink: colors.bearInk },
  gold: { face: colors.gold, edge: colors.goldEdge, ink: colors.goldInk },
  secondary: { face: colors.surface, edge: colors.line, ink: colors.text, border: colors.line },
  disabled: { face: colors.raised, edge: colors.raisedEdge, ink: '#6D7894' },
};

type Props = {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  height?: number;
  radius?: number;
  edge?: number;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  size?: number;
};

/**
 * Chunky game button: a coloured face sitting on a darker edge.
 * Pressing pushes the face down onto the edge.
 */
export function Button3D({
  label,
  children,
  onPress,
  variant = 'primary',
  disabled,
  height = 56,
  radius = 16,
  edge = 5,
  style,
  faceStyle,
  accessibilityLabel,
  size = 18,
}: Props) {
  const v = VARIANTS[disabled ? 'disabled' : variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={style}
    >
      {({ pressed }) => {
        const down = pressed && !disabled ? edge - 1 : 0;
        return (
          <View style={{ paddingTop: down, height: height + edge }}>
            <View style={{ borderRadius: radius, backgroundColor: v.edge, paddingBottom: edge - down }}>
              <View
                style={[
                  styles.face,
                  {
                    height,
                    borderRadius: radius,
                    backgroundColor: v.face,
                    borderWidth: v.border ? 2 : 0,
                    borderColor: v.border,
                  },
                  faceStyle,
                ]}
              >
                {children ?? (
                  <Txt w={900} size={size} color={v.ink}>
                    {label}
                  </Txt>
                )}
              </View>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
