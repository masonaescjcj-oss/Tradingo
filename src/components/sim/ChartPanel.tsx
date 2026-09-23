import { useState, type ReactNode } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { Candle } from '@/content/types';
import { formatPrice, formatSize, type SymbolSpec } from '@/lib/simulator';
import { liquidationPrice, openPnl, type Account, type PlaceError, type TradeEvent } from '@/lib/trading';
import { DEFAULT_SIM_TOOLS, useGame, type SimBook, type SimTools } from '@/store/game';
import { colors } from '@/theme';
import { usd } from '@/utils/format';

import { CHART_BG, ProChart, type ProLine } from './ProChart';
import { QuickTrade } from './QuickTrade';
import { Chip, VIOLET, VIOLET_INK } from './ui';

const MAX_LEVELS = 5;
const FLAME_INK = '#3A1C00';
const QUICK_H = 74;

type Indicator = { key: keyof Omit<SimTools, 'levels'>; label: string; color: string; mono?: boolean };

const INDICATORS: Indicator[] = [
  { key: 'ma', label: 'MA 9', color: colors.gold, mono: true },
  { key: 'ma2', label: 'MA 21', color: colors.sky, mono: true },
  { key: 'bands', label: 'بولینگر', color: VIOLET },
  { key: 'rsi', label: 'RSI', color: VIOLET, mono: true },
  { key: 'volume', label: 'حجم', color: colors.text3 },
];

/** Price lines for open positions, pending orders and the learner's own levels. */
function buildLines(
  spec: SymbolSpec,
  candles: Candle[],
  price: number,
  account: Pick<Account, 'positions' | 'orders'>,
  levels: number[],
  selected: number | null,
): ProLine[] {
  const lines: ProLine[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const [, h, l] of candles) {
    lo = Math.min(lo, l);
    hi = Math.max(hi, h);
  }
  const span = hi - lo || price * 0.01;
  const inView = (p: number) => p > lo - span * 0.6 && p < hi + span * 0.6;

  levels.forEach((p, i) => {
    lines.push({ price: p, label: i === selected ? 'سطح انتخاب‌شده' : 'سطح', color: colors.gold, ink: colors.goldInk });
  });
  for (const o of account.orders) {
    if (o.symbol !== spec.id) continue;
    lines.push({
      price: o.price,
      label: `${o.type === 'limit' ? 'لیمیت' : 'استاپ'} ${o.side === 'buy' ? 'خرید' : 'فروش'}`,
      detail: formatSize(spec, o.size),
      color: VIOLET,
      ink: VIOLET_INK,
    });
  }
  for (const p of account.positions) {
    if (p.symbol !== spec.id) continue;
    const pnl = openPnl(spec, p, price);
    if (p.tp != null) lines.push({ price: p.tp, label: 'حد سود', color: colors.bull, ink: colors.bullInk });
    lines.push({
      price: p.entry,
      label: p.side === 'buy' ? 'خرید' : 'فروش',
      detail: `${formatSize(spec, p.size)}  ${usd(pnl, true)}`,
      detailColor: pnl >= 0 ? colors.bullText : colors.bearText,
      color: colors.text2,
      ink: colors.bg,
      solid: true,
    });
    if (p.sl != null) lines.push({ price: p.sl, label: 'حد ضرر', color: colors.bear, ink: colors.bearInk });
    // Far-away liquidation levels (low leverage) would only add clutter, so they show when close.
    const liq = liquidationPrice(spec, p);
    if (inView(liq)) lines.push({ price: liq, label: 'لیکوئید', color: colors.flame, ink: FLAME_INK });
  }
  return lines;
}

/**
 * The simulator chart, MetaTrader style: a one-click sell/buy bar over a tall,
 * edge-to-edge chart (with a full-screen mode), then the indicator toggles and the
 * horizontal levels the learner places.
 */
export function ChartPanel({
  spec,
  candles,
  volumes,
  times,
  price,
  account,
  width,
  badge,
  footer,
  timeframe,
  countdown,
  trade,
  below,
}: {
  spec: SymbolSpec;
  candles: Candle[];
  volumes?: number[];
  times?: number[];
  price: number;
  account: Pick<Account, 'positions' | 'orders'>;
  /** Full width of the app column; the chart runs edge to edge. */
  width: number;
  /** Shown next to the symbol, e.g. the live data status. */
  badge?: ReactNode;
  footer?: ReactNode;
  /** Candle length for the chart title, e.g. M1. */
  timeframe?: string;
  countdown?: string;
  /** Turns on the one-click trade bar. */
  trade?: { book: SimBook; mids: Record<string, number>; onResult: (r: { error?: PlaceError; event?: TradeEvent }) => void };
  /** Shown right under the chart, before the chart tools (e.g. replay controls). */
  below?: ReactNode;
}) {
  const tools = useGame((s) => s.simTools) ?? DEFAULT_SIM_TOOLS;
  const setTools = useGame((s) => s.setSimTools);
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<{ symbol: string; index: number } | null>(null);
  const [full, setFull] = useState(false);
  const [sizes, setSizes] = useState<Record<string, number>>({});

  const levels = tools.levels?.[spec.id] ?? [];
  const sel = selected?.symbol === spec.id && selected.index < levels.length ? selected.index : null;
  const round = (v: number) => Number(v.toFixed(spec.decimals));
  const setLevels = (next: number[]) => setTools({ levels: { ...(tools.levels ?? {}), [spec.id]: next } });

  const addLevel = () => {
    if (levels.length >= MAX_LEVELS) return;
    setLevels([...levels, round(price)]);
    setSelected({ symbol: spec.id, index: levels.length });
  };
  const nudge = (dir: 1 | -1) => {
    if (sel == null) return;
    setLevels(levels.map((v, i) => (i === sel ? round(v + dir * spec.step) : v)));
  };
  const remove = () => {
    if (sel == null) return;
    setLevels(levels.filter((_, i) => i !== sel));
    setSelected(null);
  };

  const lines = buildLines(spec, candles, price, account, levels, sel);
  const title = timeframe ? `${spec.label} · ${timeframe}` : spec.label;
  // Tall enough to feel like a trading app, while the tab bar and the trade bar still fit.
  const chartHeight = Math.round(Math.min(640, Math.max(260, screen.height - 350)));
  const fullHeight = Math.max(240, screen.height - insets.top - insets.bottom - (trade ? QUICK_H : 0));

  const quick = trade ? (
    <QuickTrade
      book={trade.book}
      spec={spec}
      mid={price}
      mids={trade.mids}
      size={sizes[spec.id] ?? spec.sizes[0]}
      onSize={(v) => setSizes((prev) => ({ ...prev, [spec.id]: v }))}
      onResult={trade.onResult}
    />
  ) : null;

  const chart = (w: number, h: number, fullscreen: boolean) => (
    <ProChart
      spec={spec}
      candles={candles}
      times={times}
      volumes={volumes}
      price={price}
      lines={lines}
      tools={tools}
      width={w}
      height={h}
      title={title}
      badge={badge}
      countdown={countdown}
      corner={
        fullscreen
          ? { icon: 'close', label: 'بستن تمام‌صفحه', onPress: () => setFull(false) }
          : { icon: 'expand', label: 'نمایش تمام‌صفحه', onPress: () => setFull(true) }
      }
    />
  );

  return (
    <>
      <View style={styles.edge}>
        {quick ? <View style={styles.quick}>{quick}</View> : null}
        {chart(width, chartHeight, false)}
      </View>

      {below}

      <View style={styles.card}>
        <View style={styles.tools}>
          {INDICATORS.map((ind) => (
            <Chip
              key={ind.key}
              label={ind.label}
              mono={ind.mono}
              on={tools[ind.key]}
              color={ind.color}
              onPress={() => setTools({ [ind.key]: !tools[ind.key] })}
              accessibilityLabel={`نمایش ${ind.label}`}
            >
              <View style={[styles.dot, { backgroundColor: ind.color, opacity: tools[ind.key] ? 1 : 0.35 }]} />
            </Chip>
          ))}
          <Chip onPress={addLevel} label="سطح" accessibilityLabel="افزودن سطح افقی روی قیمت فعلی">
            <Icon name="plus" size={14} color={levels.length >= MAX_LEVELS ? colors.faint : colors.gold} strokeWidth={3} />
          </Chip>
          {levels.map((p, i) => (
            <Chip
              key={`${i}-${p}`}
              label={formatPrice(spec, p)}
              mono
              on={i === sel}
              color={colors.gold}
              onPress={() => setSelected(i === sel ? null : { symbol: spec.id, index: i })}
              accessibilityLabel={`انتخاب سطح ${formatPrice(spec, p)}`}
            />
          ))}
          {sel != null ? (
            <View style={styles.levelActions}>
              <Chip onPress={() => nudge(1)} accessibilityLabel="بالا بردن سطح">
                <Icon name="arrowUp" size={15} color={colors.text} strokeWidth={2.8} />
              </Chip>
              <Chip onPress={() => nudge(-1)} accessibilityLabel="پایین آوردن سطح">
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <Icon name="arrowUp" size={15} color={colors.text} strokeWidth={2.8} />
                </View>
              </Chip>
              <Chip onPress={remove} accessibilityLabel="حذف سطح">
                <Icon name="close" size={15} color={colors.bearText} strokeWidth={2.8} />
              </Chip>
            </View>
          ) : null}
        </View>
        <Txt w={700} size={11.5} lh={1.7} color={colors.text3}>
          {levels.length === 0
            ? 'با «+ سطح» یه خط افقی روی قیمت فعلی بذار و با فلش‌ها ببرش روی حمایت یا مقاومت. نمودار رو به چپ و راست بکش تا کندل‌های قبلی رو ببینی.'
            : 'نمودار رو به چپ و راست بکش تا کندل‌های قبلی رو ببینی؛ با دکمه‌ی خط‌کش، قیمت و زمان هر کندل رو بخون.'}
        </Txt>
        {trade ? (
          <Txt w={700} size={11.5} lh={1.7} color={colors.text3}>
            دکمه‌های خرید و فروش بالای نمودار، فوری و بدون حد ضرر و سود معامله باز می‌کنن. برای حد ضرر، سود و سفارش لیمیت از فرم سفارش پایین‌تر استفاده کن.
          </Txt>
        ) : null}
        {footer}
      </View>

      <Modal
        visible={full}
        animationType="fade"
        onRequestClose={() => setFull(false)}
        supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      >
        <View style={[styles.full, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {quick ? <View style={styles.quick}>{quick}</View> : null}
          {full ? chart(screen.width, fullHeight, true) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  edge: {
    // Cancels the simulator's side padding so the chart runs edge to edge.
    marginHorizontal: -16,
    backgroundColor: CHART_BG,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.lineSoft,
  },
  quick: {
    padding: 8,
    backgroundColor: CHART_BG,
  },
  card: {
    padding: 12,
    gap: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelActions: {
    flexDirection: 'row',
    gap: 6,
  },
  full: {
    flex: 1,
    backgroundColor: CHART_BG,
  },
});
