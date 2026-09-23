import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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
/** Layout around the chart: the scroll area's top padding, the chart block's borders, the gap between blocks. */
const CONTENT_TOP = 4;
const EDGE_BORDERS = 2;
const GAP = 12;
/** Room at the bottom for the tab bar's raised middle button. */
const TAB_CLEARANCE = 26;

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
  fitBelow,
  viewport,
  symbols,
  onSymbol,
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
  /** Shown right under the chart, before the chart tools (the order form, or replay controls). */
  below?: ReactNode;
  /** Keeps `below` on the first screen too, by making the chart shorter. */
  fitBelow?: boolean;
  /** Height of the scrolling area; the trade bar and chart (and `below` with `fitBelow`) fill it. */
  viewport?: number;
  /** Symbols the chart title can switch to. */
  symbols?: SymbolOption[];
  onSymbol?: (id: string) => void;
}) {
  const tools = useGame((s) => s.simTools) ?? DEFAULT_SIM_TOOLS;
  const setTools = useGame((s) => s.setSimTools);
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<{ symbol: string; index: number } | null>(null);
  const [full, setFull] = useState(false);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [belowHeight, setBelowHeight] = useState(0);
  const [menu, setMenu] = useState(false);

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
  // The trade bar, the chart and whatever sits under it fill the first screen; the rest scrolls.
  const fill = viewport
    ? viewport - CONTENT_TOP - EDGE_BORDERS - (trade ? QUICK_H : 0) - (below && fitBelow ? GAP + belowHeight : 0) - TAB_CLEARANCE
    : screen.height - 350;
  const chartHeight = Math.round(Math.min(720, Math.max(260, fill)));
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

  const pick = symbols && onSymbol && symbols.length > 1;
  const chart = (w: number, h: number, fullscreen: boolean) => (
    <View>
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
        onTitlePress={pick ? () => setMenu((m) => !m) : undefined}
      />
      {pick && menu ? (
        <SymbolMenu
          symbols={symbols}
          current={spec.id}
          width={Math.min(320, w - 16)}
          onClose={() => setMenu(false)}
          onPick={(id) => {
            setMenu(false);
            onSymbol(id);
          }}
        />
      ) : null}
    </View>
  );

  return (
    <>
      <View style={styles.edge}>
        {quick ? <View style={styles.quick}>{quick}</View> : null}
        {chart(width, chartHeight, false)}
      </View>

      {below ? <View onLayout={(e) => setBelowHeight(e.nativeEvent.layout.height)}>{below}</View> : null}

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
        {levels.length === 0 ? (
          <Txt w={700} size={11.5} lh={1.7} color={colors.text3}>
            با «+ سطح» یه خط افقی روی حمایت یا مقاومت بذار. نمودار رو به چپ و راست بکش تا کندل‌های قبلی رو ببینی.
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

export type SymbolOption = { id: string; label: string; price: string; change: number };

/** MetaTrader-style symbol list that drops down from the chart title. */
function SymbolMenu({
  symbols,
  current,
  width,
  onPick,
  onClose,
}: {
  symbols: SymbolOption[];
  current: string;
  width: number;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.menuBackdrop]} onPress={onClose} accessibilityLabel="بستن فهرست نمادها" />
      <View style={[styles.menu, { width }]} accessibilityRole="radiogroup" accessibilityLabel="انتخاب نماد">
        {symbols.map((s) => {
          const on = s.id === current;
          return (
            <Pressable
              key={s.id}
              onPress={() => onPick(s.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={s.label}
              style={({ pressed }) => [styles.menuRow, on && styles.menuRowOn, pressed && { opacity: 0.7 }]}
            >
              <Txt mono w={800} size={14} style={{ flex: 1 }}>
                {s.label}
              </Txt>
              <Txt mono w={700} size={13} color={colors.text2}>
                {s.price}
              </Txt>
              <Txt mono w={800} size={12} color={s.change >= 0 ? colors.bull : colors.bearText} style={styles.menuChange}>
                {`${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%`}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuBackdrop: {
    backgroundColor: 'rgba(5,8,15,0.45)',
  },
  menu: {
    position: 'absolute',
    top: 38,
    left: 8,
    direction: 'ltr',
    padding: 6,
    gap: 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  menuRowOn: {
    backgroundColor: colors.skySoft,
  },
  menuChange: {
    minWidth: 58,
    textAlign: 'right',
  },
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
