import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/BackHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { legalDocs, legalUpdated, type LegalId } from '@/content/legal';
import { t } from '@/i18n';
import { colors } from '@/theme';

/** The privacy policy or the terms of use. */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const docs = legalDocs();
  const page = docs[doc as LegalId] ?? docs.terms;
  const other = docs[page.id === 'privacy' ? 'terms' : 'privacy'];

  return (
    <Screen>
      <BackHeader caption={t('چارتون')} title={page.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Txt w={700} size={12} color={colors.text3}>
          {t('آخرین به‌روزرسانی: {date}', { date: legalUpdated() })}
        </Txt>
        <Txt size={15} lh={1.95} color={colors.text}>
          {page.intro}
        </Txt>
        {page.sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Txt w={900} size={16}>
              {s.title}
            </Txt>
            {s.body.map((p) => (
              <Txt key={p} size={14} lh={1.95} color={colors.text2}>
                {p}
              </Txt>
            ))}
          </View>
        ))}
        <Pressable onPress={() => router.replace(`/legal/${other.id}`)} accessibilityRole="link" style={styles.other}>
          <Icon name="book" size={18} color={colors.skyText} />
          <Txt w={800} size={14} color={colors.skyText} style={{ flex: 1 }}>
            {other.title}
          </Txt>
          <Icon name="chevronBack" size={16} color={colors.skyText} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  section: {
    gap: 6,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  other: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
  },
});
