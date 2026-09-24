import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

/**
 * Full-height dark screen that clears the status bar, and the phone's navigation bar at the bottom
 * (on phones without one the bottom inset is 0, so nothing moves). Tab screens pass `bottom={false}`:
 * the tab bar already sits above the navigation bar.
 */
export function Screen({ children, style, bottom = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; bottom?: boolean }) {
  const insets = useSafeAreaInsets();
  // A screen's own bottom padding stays, on top of the navigation bar's height.
  const flat = StyleSheet.flatten(style) ?? {};
  const own = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding;
  const paddingBottom = (bottom ? insets.bottom : 0) + (typeof own === 'number' ? own : 0);
  return <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }, style, { paddingBottom }]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
