import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'یادگیری', icon: 'home' },
  practice: { label: 'تمرین', icon: 'target' },
  simulator: { label: 'شبیه‌ساز', icon: 'candles' },
  chat: { label: 'گفتگو', icon: 'chat' },
  league: { label: 'لیگ', icon: 'trophy' },
  profile: { label: 'پروفایل', icon: 'user' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        const color = focused ? colors.bull : colors.text3;

        if (route.name === 'simulator') {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              style={styles.centerTab}
            >
              <View style={[styles.centerFace, { borderColor: focused ? colors.gold : colors.bullEdge }]}>
                <Icon name="candles" size={22} color={colors.bullInk} strokeWidth={2.4} />
              </View>
              <Txt w={800} size={11} color={color}>
                {tab.label}
              </Txt>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            style={[styles.tab, focused && styles.tabActive]}
          >
            <Icon name={tab.icon} size={24} color={color} />
            <Txt w={800} size={11} color={color}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 2,
    paddingHorizontal: 6,
    paddingTop: 6,
    backgroundColor: colors.bg,
    borderTopWidth: 2,
    borderTopColor: '#222C43',
  },
  tab: {
    flex: 1,
    maxWidth: 72,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.bullSoft,
    borderColor: 'rgba(43,212,125,0.55)',
  },
  // The simulator keeps its green coin, sized to sit inside the bar next to five other tabs.
  centerTab: {
    flex: 1,
    maxWidth: 72,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  centerFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bull,
    // A solid "edge" like the 3D buttons.
    shadowColor: colors.bullEdge,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
});
