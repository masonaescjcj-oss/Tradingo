import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { ShareSheet } from '@/components/ShareSheet';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { tradingCard, type ShareCard } from '@/lib/shareCard';
import { tradeStats, type TradeStats } from '@/lib/stats';
import { useGame, type SimBook } from '@/store/game';
import { colors } from '@/theme';
import { fa, faNum, usd } from '@/utils/format';

import { CoachCard } from './CoachCard';
import { EquityCurve } from './EquityCurve';
import { faDec, faPct, ltr, rText } from './text';
import { Card, pnlColor, Segment } from './ui';

type Tile = { label: string; value: string; mono?: boolean; color?: string; hint: string };

function tiles(s: TradeStats): Tile[] {
  const pf = s.profitFactor;
  return [
    { label: t('تعداد معامله'), value: faNum(s.count), hint: t('{wins} سود، {losses} ضرر', { wins: fa(s.wins), losses: fa(s.losses) }) },
    { label: t('درصد برد'), value: s.winRate == null ? '—' : faPct(s.winRate, 0), hint: t('چند درصد معامله‌ها با سود بسته شدن') },
    { label: t('میانگین سود'), value: s.avgWin == null ? '—' : usd(s.avgWin), mono: true, color: colors.bullText, hint: t('متوسط معامله‌های سودده') },
    { label: t('میانگین ضرر'), value: s.avgLoss == null ? '—' : usd(-s.avgLoss), mono: true, color: colors.bearText, hint: t('متوسط معامله‌های ضررده') },
    {
      label: t('فاکتور سود'),
      value: pf == null ? '—' : pf === Infinity ? '∞' : faDec(pf, 2),
      color: pf != null && pf >= 1 ? colors.bullText : pf != null ? colors.bearText : undefined,
      hint: t('جمع سودها ÷ جمع ضررها؛ بالای ۱ یعنی سودده'),
    },
    {
      label: t('میانگین R'),
      value: s.avgR == null ? '—' : rText(s.avgR, 2),
      color: s.avgR != null && s.avgR >= 0 ? colors.bullText : s.avgR != null ? colors.bearText : undefined,
      hint: s.rCount ? t('سود هر معامله به واحد ریسک، از {n} معامله با حد ضرر', { n: fa(s.rCount), count: s.rCount }) : t('فقط معامله‌های با حد ضرر حساب می‌شن'),
    },
    {
      label: t('بیشترین افت'),
      value: faPct(s.maxDrawdown, s.maxDrawdown < 0.01 ? 2 : 1),
      color: s.maxDrawdown > 0.1 ? colors.bearText : undefined,
      hint: t('از سقف تا کف: {amount}', { amount: ltr(usd(s.maxDrawdownUsd)) }),
    },
    { label: t('سود خالص'), value: usd(s.net, true), mono: true, color: pnlColor(s.net), hint: t('جمع نتیجه‌ی معامله‌های بسته‌شده') },
  ];
}

/** Performance numbers for the live or replay account. */
export function StatsView({ width }: { width: number }) {
  const [book, setBook] = useState<SimBook>('live');
  const sim = useGame((s) => s.sim);
  const replay = useGame((s) => s.simReplay);
  const name = useGame((s) => s.name);
  const [card, setCard] = useState<ShareCard | null>(null);
  const account = book === 'live' ? sim : (replay?.account ?? { balance: 0, history: [] });
  const stats = tradeStats(account.history, account.balance);

  return (
    <View style={{ gap: 12 }}>
      <Segment
        label={t('کدوم حساب')}
        value={book}
        onChange={setBook}
        options={[
          { value: 'live', label: t('شبیه‌ساز زنده') },
          { value: 'replay', label: t('بازپخش بازار') },
        ]}
      />

      <View style={styles.grid}>
        {tiles(stats).map((tile) => (
          <View key={tile.label} style={styles.tile}>
            <Txt w={700} size={11.5} color={colors.text2}>
              {tile.label}
            </Txt>
            <Txt mono={tile.mono} w={900} size={18} color={tile.color ?? colors.text}>
              {tile.value}
            </Txt>
            <Txt w={500} size={10.5} lh={1.5} color={colors.text3}>
              {tile.hint}
            </Txt>
          </View>
        ))}
      </View>

      <Card>
        <Txt w={900} size={15}>
          {t('نمودار سرمایه')}
        </Txt>
        <EquityCurve curve={stats.curve} width={width - 32} />
      </Card>

      <CoachCard history={account.history} balance={account.balance} />

      {stats.count > 0 ? (
        <Button3D
          variant="secondary"
          height={46}
          radius={14}
          edge={3}
          onPress={() => setCard(tradingCard({ name, count: stats.count, winRate: stats.winRate, net: stats.net, profitFactor: stats.profitFactor }))}
          accessibilityLabel={t('اشتراک آمار معامله‌ها')}
        >
          <View style={styles.shareRow}>
            <Icon name="share" size={17} color={colors.text} strokeWidth={2.6} />
            <Txt w={900} size={15}>
              {t('اشتراک آمار معامله‌هام')}
            </Txt>
          </View>
        </Button3D>
      ) : null}
      <ShareSheet card={card} onClose={() => setCard(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 12,
    gap: 2,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
