import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { Icon } from './Icon';
import { Txt } from './Txt';

/** Screen header with a back button, a small caption and a title. */
export function BackHeader({ caption, title, right }: { caption?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        accessibilityRole="button"
        accessibilityLabel="بازگشت"
        style={styles.back}
      >
        <Icon name="chevronBack" size={26} color={colors.text3} strokeWidth={2.6} />
      </Pressable>
      <View style={{ flex: 1 }}>
        {caption ? (
          <Txt w={800} size={13} color={colors.text3}>
            {caption}
          </Txt>
        ) : null}
        <Txt w={900} size={20} numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.lineSoft,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
