import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

type Tab = 'reports' | 'rooms' | 'users' | 'messages' | 'ai' | 'log';

const TABS: [Tab, string][] = [
  ['reports', 'گزارش‌ها'], // i18n-ignore: translated where shown
  ['rooms', 'گروه‌ها'], // i18n-ignore: translated where shown
  ['users', 'کاربران'], // i18n-ignore: translated where shown
  ['messages', 'پیام‌ها'], // i18n-ignore: translated where shown
  ['ai', 'هوش مصنوعی'], // i18n-ignore: translated where shown
  ['log', 'سابقه'], // i18n-ignore: translated where shown
];

/** The panel's sections as a scrollable row of tabs; open reports show a count. */
export function AdminTabsHeader({ tab, reports, onChange }: { tab: Tab; reports: number; onChange: (t: Tab) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {TABS.map(([key, label]) => {
        const on = key === tab;
        return (
          <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
            <Txt w={800} size={13.5} color={on ? colors.skyText : colors.text2}>
              {t(label)}
            </Txt>
            {key === 'reports' && reports > 0 ? (
              <View style={styles.count}>
                <Txt w={900} size={11} color={colors.bearInk}>
                  {fa(reports)}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  tabOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  count: {
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.bear,
  },
});
