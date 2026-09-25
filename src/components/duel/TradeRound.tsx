import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { ProChart, type ProLine } from '@/components/sim/ProChart';
import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import {
  positionPnl,
  STOP_ATR,
  TRADE_BALANCE,
  TRADE_CANDLE_MS,
  TRADE_LEVERAGE,
  tradeClose,
  tradeEquity,
  tradeFinished,
  tradeOpen,
  tradeResult,
  tradeStart,
  tradeStep,
  type DuelChart,
  type DuelResult,
} from '@/lib/duel';
import { playSfx } from '@/lib/sfx';
import { findSymbol, type SymbolSpec } from '@/lib/simulator';
import { colors } from '@/theme';
import { fa, usd } from '@/utils/format';

const TOOLS = { ma: true, ma2: false, bands: false, rsi: false, volume: false };

function specOf(chart: DuelChart): SymbolSpec {
  const known = findSymbol(chart.symbol);
  if (known) return { ...known, decimals: chart.decimals };
  const last = chart.candles[chart.candles.length - 1][3];
  return { id: chart.symbol, label: chart.label, market: 'crypto', base: last, decimals: chart.decimals, vol: 1, spread: 0, contract: 1, sizes: [1], sizeUnit: '', step: 1, defaultStop: 1 };
}

/** Round 3: the chart replays one candle every 1.5 seconds; buy, sell or close with $1,000 at 10× leverage. */
export function TradeRound({ trade, width, onDone }: { trade: DuelChart; width: number; onDone: (r: DuelResult['trade']) => void }) {
  // Half the screen for the chart, so the candles are easy to read while they run.
  const chartHeight = Math.round(Math.min(500, Math.max(320, useWindowDimensions().height * 0.5)));
  const [running, setRunning] = useState(false);
  const [s, setS] = useState(tradeStart);
  const over = tradeFinished(trade, s);

  useEffect(() => {
    if (!running || over) return;
    const timer = setInterval(() => setS((prev) => tradeStep(trade, prev)), TRADE_CANDLE_MS);
    return () => clearInterval(timer);
  }, [running, over, trade]);

  const spec = specOf(trade);
  const candles = trade.candles.slice(0, s.shown + 1);
  const price = candles[candles.length - 1][3];
  const equity = tradeEquity(trade, s);
  // The whole round so far (closed trades plus the open one), and the open trade alone.
  const pnl = equity - TRADE_BALANCE;
  const openPnl = s.pos ? positionPnl(s.pos, price) : 0;
  const secondsLeft = Math.ceil(((trade.candles.length - 1 - s.shown) * TRADE_CANDLE_MS) / 1000);
  const secondsAll = Math.round(((trade.candles.length - 1 - s.shown) * TRADE_CANDLE_MS) / 1000);
  const lines: ProLine[] = s.pos
    ? [
        { price: s.pos.entry, label: s.pos.side === 1 ? t('خرید') : t('فروش'), detail: usd(openPnl, true), detailColor: openPnl >= 0 ? colors.bullText : colors.bearText, color: colors.text2, ink: colors.bg, solid: true },
        { price: s.pos.stop, label: t('حد ضرر'), color: colors.bear, ink: colors.bearInk },
      ]
    : [];
  const result = over ? tradeResult(trade, s) : null;

  const open = (side: 1 | -1) => {
    setS((prev) => tradeOpen(trade, prev, side));
    playSfx('correct');
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.bar}>
        <Stat label={t('سرمایه')} value={usd(equity)} />
        <Stat label={t('سود و زیان کل')} value={usd(pnl, true)} color={pnl > 0 ? colors.bullText : pnl < 0 ? colors.bearText : colors.text} />
        <Stat
          label={t('زمان')}
          mono={false}
          value={running && !over ? t('{n} ثانیه', { n: fa(secondsLeft), count: secondsLeft }) : over ? t('تموم') : t('{n} ثانیه', { n: fa(secondsAll), count: secondsAll })}
        />
      </View>

      <View style={styles.chart}>
        <ProChart spec={spec} candles={candles} price={price} lines={lines} tools={TOOLS} width={width} height={chartHeight} title={`${trade.label} · M15`} interactive={false} initialCount={52} />
      </View>

      {!running ? (
        <View style={{ gap: 10 }}>
          <Txt w={700} size={13.5} lh={1.8} color={colors.text2}>
            {t('{balance} دلار داری با اهرم {leverage}. وقتی «شروع» رو بزنی، {n} کندل بعدی یکی‌یکی میان. هر معامله خودش یه حد ضرر ({atr} برابر اندازه‌ی یه کندل) داره. بیشترین سود برنده‌ست.', {
              balance: fa(TRADE_BALANCE),
              leverage: fa(TRADE_LEVERAGE),
              n: fa(trade.candles.length - s.shown - 1),
              atr: fa(STOP_ATR),
            })}
          </Txt>
          <Button3D label={t('شروع')} onPress={() => setRunning(true)} />
        </View>
      ) : result ? (
        <View style={{ gap: 10 }}>
          <View style={[styles.result, { borderColor: result.pnl > 0 ? colors.bull : result.pnl < 0 ? colors.bear : colors.line }]}>
            <Txt mono w={900} size={24} color={result.pnl > 0 ? colors.bullText : result.pnl < 0 ? colors.bearText : colors.text}>
              {usd(result.pnl, true)}
            </Txt>
            <Txt w={700} size={13} color={colors.text2}>
              {result.trades
                ? `${t('{n} معامله', { n: fa(result.trades), count: result.trades })}${s.stops ? t('، {n} بار حد ضرر خورد', { n: fa(s.stops), count: s.stops }) : ''}`
                : t('معامله‌ای نکردی')}
            </Txt>
          </View>
          <Button3D label={t('دیدن نتیجه')} onPress={() => onDone(result)} />
        </View>
      ) : s.pos ? (
        <Button3D variant="secondary" label={t('بستن معامله ({pnl})', { pnl: usd(openPnl, true) })} onPress={() => setS((prev) => tradeClose(trade, prev))} />
      ) : (
        <View style={{ gap: 8 }}>
          <View style={styles.actions}>
            <Button3D variant="danger" label={t('فروش')} onPress={() => open(-1)} style={{ flex: 1 }} />
            <Button3D label={t('خرید')} onPress={() => open(1)} style={{ flex: 1 }} />
          </View>
          {s.stops ? (
            <Txt w={800} size={13} color={colors.bearText} center>
              {s.stops > 1
                ? t('حد ضرر خورد و معامله بسته شد ({n} بار). می‌تونی دوباره وارد بشی.', { n: fa(s.stops) })
                : t('حد ضرر خورد و معامله بسته شد. می‌تونی دوباره وارد بشی.')}
            </Txt>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, color = colors.text, mono = true }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <View style={styles.stat}>
      <Txt w={700} size={11.5} color={colors.text3}>
        {label}
      </Txt>
      <Txt mono={mono} w={800} size={14} color={color}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chart: {
    marginHorizontal: -16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  result: {
    alignItems: 'center',
    gap: 4,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
});
