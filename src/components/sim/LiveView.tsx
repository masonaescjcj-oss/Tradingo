import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/Mascot';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import { LIVE_SYMBOLS, supportsLive } from '@/lib/marketData';
import { findSymbol, type SymbolSpec } from '@/lib/simulator';
import { summarize, type Account, type ClosedTrade } from '@/lib/trading';
import { START_BALANCE, useGame } from '@/store/game';
import { colors } from '@/theme';

import { AccountBar } from './AccountBar';
import { ChartPanel } from './ChartPanel';
import { HistoryList } from './HistoryList';
import { OrderTicket } from './OrderTicket';
import { PositionsList } from './PositionsList';
import { eventNotice, placeErrorText, type Notice } from './text';
import { Toggle } from './ui';
import { midsOf, type LiveStatus, type Series } from './useMarketFeed';

type Feed = { series: Record<string, Series>; live: boolean; status: LiveStatus; setLive: (on: boolean) => void };

/** The live practice account: symbols, chart, order form, open trades and recent history. */
export function LiveView({
  specs,
  feed,
  chartWidth,
  onNotice,
  onInfo,
}: {
  specs: SymbolSpec[];
  feed: Feed;
  chartWidth: number;
  onNotice: (n: Notice) => void;
  onInfo: () => void;
}) {
  const sim = useGame((s) => s.sim);
  const orders = useGame((s) => s.simOrders) ?? [];
  const [symbolId, setSymbolId] = useState(specs[0].id);
  const account: Account = { ...sim, orders };

  // Symbols of the chosen market, plus any other symbol that still has open trades or orders.
  const busyIds = new Set([...sim.positions.map((p) => p.symbol), ...orders.map((o) => o.symbol)]);
  const extra = [...busyIds].filter((id) => !specs.some((s) => s.id === id)).flatMap((id) => findSymbol(id) ?? []);
  const shown = [...specs, ...extra];
  const spec = shown.find((s) => s.id === symbolId) ?? shown[0];
  const current = feed.series[spec.id];
  const mids = midsOf(feed.series);
  const summary = summarize(account, mids);
  const lastTrade = sim.history[0];

  const toggleLive = () => {
    if (!feed.live && LIVE_SYMBOLS.some((id) => busyIds.has(id))) {
      onNotice({ text: 'اول معامله‌ها و سفارش‌های BTC و ETH رو ببند؛ قیمت واقعی با قیمت شبیه‌سازی‌شده فرق داره.', tone: 'gold' });
      return;
    }
    feed.setLive(!feed.live);
  };

  const liveHere = current.source === 'live';
  const badge = (
    <View style={[styles.badge, liveHere && styles.badgeLive]}>
      <View style={[styles.dot, { backgroundColor: liveHere ? colors.bull : colors.text3 }]} />
      <Txt w={800} size={11} color={liveHere ? colors.bullText : colors.text3}>
        {liveHere ? 'زنده' : 'شبیه‌سازی'}
      </Txt>
    </View>
  );

  const footer = supportsLive(spec.id) ? (
    <View style={{ gap: 4 }}>
      <Pressable onPress={toggleLive} accessibilityRole="switch" accessibilityState={{ checked: feed.live }} style={styles.liveRow}>
        <Toggle on={feed.live} />
        <Txt w={800} size={13.5}>
          قیمت زنده
        </Txt>
        <Txt w={700} size={11.5} color={colors.text3} style={{ flex: 1 }}>
          {feed.status === 'loading' ? 'در حال گرفتن قیمت از بایننس…' : feed.status === 'on' ? 'کندل‌های ۱ دقیقه‌ای واقعی از بایننس' : 'BTC و ETH از بایننس'}
        </Txt>
      </Pressable>
      {feed.status === 'failed' ? (
        <Txt w={700} size={11.5} lh={1.7} color={colors.gold}>
          به قیمت زنده وصل نشد (شاید اینترنت یا منطقه محدوده). شبیه‌ساز با قیمت شبیه‌سازی‌شده ادامه می‌ده.
        </Txt>
      ) : null}
    </View>
  ) : (
    <Txt w={700} size={11.5} lh={1.7} color={colors.text3}>
      فارکس و طلا فعلاً قیمت شبیه‌سازی‌شده دارن؛ قیمت زنده فقط برای BTC و ETH هست.
    </Txt>
  );

  const onClosed = (t: ClosedTrade) => onNotice(eventNotice({ kind: 'closed', trade: t }));

  return (
    <>
      <AccountBar summary={summary} startBalance={START_BALANCE} title="ارزش حساب آزمایشی" onInfo={onInfo} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {shown.map((s) => {
          const cur = feed.series[s.id];
          const on = s.id === spec.id;
          const ch = cur ? ((cur.price - cur.candles[0][0]) / cur.candles[0][0]) * 100 : 0;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSymbolId(s.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.symbol, on && styles.symbolOn]}
            >
              <Txt mono w={800} size={13}>
                {s.label}
              </Txt>
              <Txt mono w={700} size={11} color={ch >= 0 ? colors.bull : colors.bearText}>
                {`${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <ChartPanel
        spec={spec}
        candles={current.candles}
        volumes={current.volumes}
        price={current.price}
        account={account}
        width={chartWidth}
        badge={badge}
        footer={footer}
      />

      <OrderTicket
        book="live"
        spec={spec}
        mid={current.price}
        mids={mids}
        summary={summary}
        onInfo={onInfo}
        onResult={(r) => onNotice(r.error ? { text: placeErrorText(r.error), tone: 'bear' } : r.event ? eventNotice(r.event) : { text: 'ثبت شد', tone: 'sky' })}
      />

      <View style={styles.coach}>
        <Mascot mood={lastTrade?.reason === 'sl' || lastTrade?.reason === 'liquidation' ? 'sad' : lastTrade?.reason === 'tp' ? 'party' : 'think'} size={60} />
        <SpeechBubble style={{ flex: 1 }} background={colors.goldCard} border={colors.goldCardLine}>
          <Txt w={800} size={13.5} lh={1.8} color="#FFE3A3">
            {coachMessage(lastTrade, summary.marginLevel)}
          </Txt>
        </SpeechBubble>
      </View>

      <PositionsList book="live" account={account} mids={mids} onClosed={onClosed} />
      <HistoryList book="live" history={sim.history} limit={5} />
    </>
  );
}

function coachMessage(last: ClosedTrade | undefined, marginLevel: number | null): string {
  if (marginLevel != null && marginLevel < 200) return 'سطح مارجینت پایینه! یعنی ضرر معامله‌های بازت داره به مارجینشون نزدیک می‌شه. اهرم و حجمت رو چک کن.';
  if (last?.reason === 'liquidation') return 'لیکوئید شدی! اهرم بالا یعنی فاصله‌ی کم تا لیکوئید. با حد ضرر و اهرم کمتر، این اتفاق نمی‌افته.';
  if (last?.reason === 'sl') return 'ضرر کنترل‌شده بخشی از تریده. حد ضررت کارش رو کرد و جلوی ضرر بزرگ‌تر رو گرفت.';
  if (last?.reason === 'tp') return 'آفرین! حد سودت فعال شد. به برنامه‌ت پایبند موندی.';
  return 'اول نوع سفارش، اهرم، حجم و حد ضرر و سود رو تنظیم کن، بعد خرید یا فروش بزن. این پول واقعی نیست؛ با خیال راحت تمرین کن.';
}

const styles = StyleSheet.create({
  symbol: {
    height: 50,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  symbolOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
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
  coach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
