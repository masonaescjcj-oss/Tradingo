import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { findCourse } from '@/content';
import { t } from '@/i18n';
import { placementOpen } from '@/lib/placement';
import { TEST_QUESTIONS } from '@/lib/session';
import { useGame } from '@/store/game';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

import { Button3D } from './Button3D';
import { Mascot } from './Mascot';
import { Txt } from './Txt';

/** Whether the path should show the placement offer instead of other nudges. */
export function usePlacementOpen(): boolean {
  return useGame((s) => placementOpen(s.placement, s.completed));
}

/**
 * For learners who said they already know some trading: prove it with the jump test and skip
 * the intro units, or start from the beginning like everyone else.
 */
export function PlacementOffer() {
  const placement = useGame((s) => s.placement);
  const level = useGame((s) => s.level);
  const dismiss = useGame((s) => s.dismissPlacement);
  const open = usePlacementOpen();
  const units = findCourse('basics')?.units ?? [];
  const index = units.findIndex((u) => u.id === placement);
  if (!open || index === -1) return null;
  const skipped = index === 0 ? t('«{text}»', { text: units[0].title }) : t('{n} واحد اول', { n: fa(index + 1), count: index + 1 });

  return (
    <View style={styles.card}>
      <Mascot mood="think" size={54} />
      <View style={{ flex: 1, gap: 8 }}>
        <Txt w={900} size={15}>
          {level === 'pro' ? t('قبلاً ترید کردی؟ نشونم بده!') : t('گفتی یه چیزایی بلدی؟ نشونم بده!')}
        </Txt>
        <Txt w={500} size={12.5} lh={1.7} color={colors.text2}>
          {t('یه آزمون {n} سؤالی. قبول بشی، {skipped} رد می‌شه و از واحد {next} شروع می‌کنی؛ نشد هم اشکالی نداره، از اول با هم پیش می‌ریم.', { n: fa(TEST_QUESTIONS), skipped, next: fa(index + 2) })}
        </Txt>
        <View style={styles.actions}>
          <Button3D label={t('شروع آزمون')} size={14} onPress={() => router.push(`/lesson/test-${placement}`)} style={{ flex: 1 }} />
          <Pressable onPress={dismiss} accessibilityRole="button" style={styles.later}>
            <Txt w={800} size={13} color={colors.text3}>
              {t('از اول شروع می‌کنم')}
            </Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  later: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
});
