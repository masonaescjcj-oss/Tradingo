import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { LearnCard } from '@/components/lesson/LearnCard';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { findUnit, type LearnStep } from '@/content';
import { t } from '@/i18n';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

/** The unit's guidebook: every concept card of the unit to read at your own pace. */
export default function GuideScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const unit = findUnit(String(unitId));

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          accessibilityRole="button"
          accessibilityLabel={t('بازگشت')}
          style={styles.back}
        >
          <Icon name="chevronBack" size={26} color={colors.text3} strokeWidth={2.6} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt w={800} size={13} color={colors.text3}>
            {t('راهنمای واحد')}
          </Txt>
          <Txt w={900} size={20}>
            {unit?.title ?? t('پیدا نشد')}
          </Txt>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {unit?.lessons.map((lesson, i) => {
          const cards = lesson.steps.filter((s): s is LearnStep => s.type === 'learn');
          return (
            <View key={lesson.id} style={{ gap: 18 }}>
              <View style={styles.lessonHead}>
                <View style={[styles.lessonNum, { backgroundColor: unit.color }]}>
                  <Txt w={900} size={12} color={unit.ink}>
                    {t('درس {n}', { n: fa(i + 1) })}
                  </Txt>
                </View>
                <Txt w={900} size={18}>
                  {lesson.title}
                </Txt>
              </View>
              {cards.map((card) => (
                <LearnCard key={card.title} step={card} topic={unit.title} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
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
  content: {
    padding: 16,
    gap: 28,
    paddingBottom: 48,
  },
  lessonHead: {
    gap: 6,
    alignItems: 'flex-start',
  },
  lessonNum: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
