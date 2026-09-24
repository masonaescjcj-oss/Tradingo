import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { t } from '@/i18n';
import { countdownLabel } from '@/lib/chartMath';
import { followLive, forexWeekend, LIVE_SYMBOLS, supportsLive, type Timeframe } from '@/lib/marketData';
import { findSymbol, formatPrice, simCountdown, symbolGroup, type SymbolSpec } from '@/lib/simulator';
import { summarize, type Account, type PlaceError, type TradeEvent } from '@/lib/trading';
import { useGame } from '@/store/game';
import { colors } from '@/theme';

import { ChartPanel, type SymbolOption, type TimeframeControl } from './ChartPanel';
import { OrderTicket } from './OrderTicket';
import { eventNotice, placeErrorText, type Notice } from './text';
import { Toggle } from './ui';
import { liveCountdown, midsOf, useClock, type LiveStatus, type Series } from './useMarketFeed';
import { useTimeframe } from './useTimeframe';

type Feed = { series: Record<string, Series>; live: boolean; status: LiveStatus; setLive: (on: boolean) => void; watch: (id: string) => void };

/** The chart page of the live practice account: one-click trade bar, chart (with the symbol picker) and the order form. */
export function LiveView({
  specs,
  feed,
  chartWidth,
  viewport,
  onNotice,
  onInfo,
}: {
  specs: SymbolSpec[];
  feed: Feed;
  chartWidth: number;
  viewport: number;
  onNotice: (n: Notice) => void;
  onInfo: () => void;
}) {
  const sim = useGame((s) => s.sim);
  const orders = useGame((s) => s.simOrders) ?? [];
  const [symbolId, setSymbolId] = useState(specs[0].id);
  const timeframe: Timeframe = useGame((s) => s.simTools?.timeframe) ?? 'M1';
  const setTools = useGame((s) => s.setSimTools);
  const now = useClock();
  const account: Account = { ...sim, orders };

  // Symbols of the chosen market, plus any other symbol that still has open trades or orders.
  const busyIds = new Set([...sim.positions.map((p) => p.symbol), ...orders.map((o) => o.symbol)]);
  const extra = [...busyIds].filter((id) => !specs.some((s) => s.id === id)).flatMap((id) => findSymbol(id) ?? []);
  const shown = [...specs, ...extra];
  const spec = shown.find((s) => s.id === symbolId) ?? shown[0];
  const current = feed.series[spec.id];
  const watchSymbol = feed.watch;
  useEffect(() => watchSymbol(spec.id), [watchSymbol, spec.id]);
  const mids = midsOf(feed.series);
  const summary = summarize(account, mids);

  const toggleLive = () => {
    if (!feed.live && LIVE_SYMBOLS.some((id) => busyIds.has(id))) {
      onNotice({ text: t('اول معامله‌ها و سفارش‌های بازت رو ببند؛ قیمت واقعی با قیمت شبیه‌سازی‌شده فرق داره.'), tone: 'gold' });
      return;
    }
    feed.setLive(!feed.live);
  };

  const liveHere = current.source === 'live';
  // Above M1 the chart shows Binance's candles of that timeframe; trading keeps using the live price.
  const tf = useTimeframe(spec.id, timeframe, liveHere);
  const badge = (
    <View style={[styles.badge, liveHere && styles.badgeLive]}>
      <View style={[styles.dot, { backgroundColor: liveHere ? colors.bull : colors.text3 }]} />
      <Txt w={800} size={11} color={liveHere ? colors.bullText : colors.text3}>
        {liveHere ? t('زنده') : t('شبیه‌سازی')}
      </Txt>
    </View>
  );

  const footer = supportsLive(spec.id) ? (
    <View style={{ gap: 4 }}>
      <Pressable onPress={toggleLive} accessibilityRole="switch" accessibilityState={{ checked: feed.live }} style={styles.liveRow}>
        <Toggle on={feed.live} />
        <Txt w={800} size={13.5}>
          {t('قیمت زنده')}
        </Txt>
        <Txt w={700} size={11.5} color={colors.text3} style={{ flex: 1 }}>
          {feed.status === 'loading' ? t('در حال گرفتن قیمت از بایننس…') : feed.status === 'on' ? t('کندل‌های ۱ دقیقه‌ای واقعی از بایننس') : t('کریپتو، یورو/دلار و طلا از بایننس')}
        </Txt>
      </Pressable>
      {liveHere && spec.market === 'forex' ? (
        <Txt w={700} size={11.5} lh={1.7} color={colors.text3}>
          {`${spec.id === 'XAUUSD' ? t('قیمت طلا از توکن PAXG بایننس میاد (هر توکن یه انس طلا).') : t('قیمت یورو/دلار از جفت EUR/USDT بایننس میاد.')} ${t('با قیمت بروکرها کمی فرق داره.')}${forexWeekend(new Date(now)) ? ` ${t('بازار واقعی فارکس آخر هفته تعطیله، ولی این جفت ۲۴ ساعته معامله می‌شه.')}` : ''}`}
        </Txt>
      ) : null}
      {feed.status === 'failed' ? (
        <Txt w={700} size={11.5} lh={1.7} color={colors.gold}>
          {t('به قیمت زنده وصل نشد (شاید اینترنت یا منطقه محدوده). شبیه‌ساز با قیمت شبیه‌سازی‌شده ادامه می‌ده.')}
        </Txt>
      ) : null}
    </View>
  ) : (
    <Txt w={700} size={11.5} lh={1.7} color={colors.text3}>
      {t('این نماد فعلاً فقط قیمت شبیه‌سازی‌شده داره.')}
    </Txt>
  );

  const onResult = (r: { error?: PlaceError; event?: TradeEvent }) =>
    onNotice(r.error ? { text: placeErrorText(r.error), tone: 'bear' } : r.event ? eventNotice(r.event) : { text: t('ثبت شد'), tone: 'sky' });
  const higher = tf.status === 'ready' ? { ...followLive(tf.feed, current.price, now, tf.ms), ms: tf.ms } : null;
  const countdown = countdownLabel(
    higher ? (higher.lastOpen + higher.ms - now) / 1000 : liveHere && current.lastOpen != null ? liveCountdown(current.lastOpen, now) : simCountdown(current.tick),
  );
  const timeframes: TimeframeControl = {
    value: timeframe,
    onChange: (next) => setTools({ timeframe: next }),
    enabled: liveHere,
    note:
      tf.status === 'loading'
        ? t('در حال گرفتن کندل‌های {tf} از بایننس…', { tf: timeframe })
        : tf.status === 'failed'
          ? t('کندل‌های {tf} بار نشد؛ فعلاً M1 نشون داده می‌شه.', { tf: timeframe })
          : undefined,
  };
  const symbols: SymbolOption[] = shown.map((s) => {
    const cur = feed.series[s.id];
    return {
      id: s.id,
      label: s.label,
      price: cur ? formatPrice(s, cur.price) : '',
      change: cur ? ((cur.price - cur.candles[0][0]) / cur.candles[0][0]) * 100 : 0,
      group: symbolGroup(s),
    };
  });

  return (
    <ChartPanel
      spec={spec}
      candles={higher?.candles ?? current.candles}
      volumes={higher?.volumes ?? current.volumes}
      times={higher?.times ?? current.times}
      price={current.price}
      account={account}
      width={chartWidth}
      badge={badge}
      footer={footer}
      timeframe={higher ? timeframe : liveHere ? 'M1' : '8s'}
      timeframes={supportsLive(spec.id) ? timeframes : undefined}
      countdown={countdown}
      trade={{ book: 'live', mids, onResult }}
      viewport={viewport}
      symbols={symbols}
      onSymbol={setSymbolId}
      shareable
      below={<OrderTicket book="live" spec={spec} mid={current.price} mids={mids} summary={summary} onInfo={onInfo} onResult={onResult} />}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 7,
    backgroundColor: colors.raised,
  },
  badgeLive: {
    backgroundColor: colors.bullSoft,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
  },
});
