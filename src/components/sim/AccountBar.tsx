import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { Summary } from '@/lib/trading';
import { colors } from '@/theme';
import { faNum, usd } from '@/utils/format';

import { Figure, pnlColor } from './ui';

/** Equity, total result and the margin numbers of one simulator account. */
export function AccountBar({
  summary,
  startBalance,
  title,
  onInfo,
}: {
  summary: Summary;
  startBalance: number;
  title: string;
  onInfo: () => void;
}) {
  const total = summary.equity - startBalance;
  const level = summary.marginLevel;
  const levelColor = level == null ? colors.text : level < 150 ? colors.bearText : level < 300 ? colors.gold : colors.bull;
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={{ gap: 2 }}>
          <Txt w={700} size={12} color={colors.text2}>
            {title}
          </Txt>
          <Txt mono w={800} size={24}>
            {usd(summary.equity)}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Txt w={700} size={12} color={colors.text2}>
            سود و زیان کل
          </Txt>
          <View style={[styles.pnlChip, { backgroundColor: total >= 0 ? colors.bullSoft : colors.bearSoft }]}>
            <Txt mono w={800} size={15} color={pnlColor(total)}>
              {usd(total, true)}
            </Txt>
          </View>
        </View>
      </View>
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Figure label="موجودی" value={usd(summary.balance)} />
          <Figure label="مارجین درگیر" value={usd(summary.usedMargin)} />
        </View>
        <View style={styles.gridRow}>
          <Figure label="مارجین آزاد" value={usd(summary.freeMargin)} color={summary.freeMargin < 0 ? colors.bearText : colors.text} />
          <View style={{ flex: 1, gap: 1 }}>
            <Pressable onPress={onInfo} accessibilityRole="button" accessibilityLabel="اهرم و مارجین یعنی چی؟" style={styles.levelHead} hitSlop={8}>
              <Txt w={700} size={11} color={colors.text2}>
                سطح مارجین
              </Txt>
              <Icon name="info" size={13} color={colors.skyText} strokeWidth={2.4} />
            </Pressable>
            <Txt w={800} size={12.5} color={levelColor}>
              {level == null ? 'بدون معامله‌ی باز' : `${faNum(level)}٪`}
            </Txt>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pnlChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  grid: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.lineSoft,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
