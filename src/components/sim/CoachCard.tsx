import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Txt } from '@/components/Txt';
import { findUnit } from '@/content';
import { t } from '@/i18n';
import { coachInsights, type CoachTone } from '@/lib/journalCoach';
import type { ClosedTrade } from '@/lib/trading';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

const TONE: Record<CoachTone, { icon: IconName; color: string; soft: string }> = {
  warn: { icon: 'shield', color: colors.bearText, soft: colors.bearSoft },
  tip: { icon: 'bulb', color: colors.gold, soft: colors.goldSoft },
  good: { icon: 'check', color: colors.bullText, soft: colors.bullSoft },
};

/** How many findings show before "more". */
const SHOWN = 3;

/** The journal coach: what the closed trades say about the learner's habits, with the unit that fixes each. */
export function CoachCard({ history, balance }: { history: ClosedTrade[]; balance: number }) {
  const [all, setAll] = useState(false);
  const { insights, needMore } = coachInsights(history, balance);
  const shown = all ? insights : insights.slice(0, SHOWN);
  const worried = insights.some((i) => i.tone === 'warn');

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Mascot mood={history.length === 0 ? 'happy' : worried ? 'think' : 'party'} size={46} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt w={900} size={16}>
            {t('مربی ژورنال')}
          </Txt>
          <Txt w={500} size={12} lh={1.6} color={colors.text3}>
            {history.length === 0
              ? t('چند تا معامله بزن و ببند؛ شمعک ژورنالت رو می‌خونه و می‌گه کجا پول از دست می‌دی.')
              : `${t('از {n} معامله‌ی بسته‌شده', { n: fa(history.length), count: history.length })}${needMore ? t('؛ با {n} معامله‌ی دیگه تحلیل کامل‌تر می‌شه', { n: fa(needMore), count: needMore }) : ''}`}
          </Txt>
        </View>
      </View>

      {history.length > 0 && insights.length === 0 ? (
        <Txt w={700} size={13} lh={1.8} color={colors.text2}>
          {t('فعلاً الگوی نگران‌کننده‌ای ندیدم. با حد ضرر معامله کن و برای هر معامله یادداشت بنویس تا تحلیل دقیق‌تر بشه.')}
        </Txt>
      ) : null}

      {shown.map((i) => {
        const tone = TONE[i.tone];
        const unit = i.unitId ? findUnit(i.unitId) : undefined;
        return (
          <View key={i.id} style={[styles.item, { borderColor: tone.color, backgroundColor: tone.soft }]}>
            <View style={styles.itemHead}>
              <Icon name={tone.icon} size={17} color={tone.color} strokeWidth={2.6} />
              <Txt w={900} size={14} color={tone.color} style={{ flex: 1 }}>
                {i.title}
              </Txt>
            </View>
            <Txt w={500} size={13} lh={1.85} color={colors.text}>
              {i.body}
            </Txt>
            {unit ? (
              <Pressable onPress={() => router.push(`/guide/${unit.id}`)} accessibilityRole="link" accessibilityLabel={t('خوندن راهنمای {title}', { title: unit.title })} style={styles.lesson}>
                <Icon name="book" size={15} color={colors.skyText} strokeWidth={2.4} />
                <Txt w={800} size={12.5} color={colors.skyText}>
                  {t('بخون: {title}', { title: unit.title })}
                </Txt>
                <Icon name="chevronNext" size={14} color={colors.skyText} />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {insights.length > SHOWN ? (
        <Pressable onPress={() => setAll(!all)} accessibilityRole="button" style={styles.more}>
          <Txt w={800} size={13} color={colors.text2}>
            {all ? t('کمتر') : t('{n} نکته‌ی دیگه', { n: fa(insights.length - SHOWN), count: insights.length - SHOWN })}
          </Txt>
          <Icon name="chevronDown" size={14} color={colors.text2} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  item: {
    gap: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
});
