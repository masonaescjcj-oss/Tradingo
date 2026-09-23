import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CandleChart, chartHeight } from '@/components/CandleChart';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import type { Candle, ChartLevel } from '@/content/types';
import { formatPrice, simVolume, type SymbolSpec } from '@/lib/simulator';
import { liquidationPrice, type Account } from '@/lib/trading';
import { DEFAULT_SIM_TOOLS, useGame, type SimTools } from '@/store/game';
import { colors } from '@/theme';

import { Chip, VIOLET, VIOLET_INK } from './ui';

const MAX_LEVELS = 5;
const FLAME_INK = '#3A1C00';

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
): ChartLevel[] {
  const lines: ChartLevel[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const [, h, l] of candles) {
    lo = Math.min(lo, l);
    hi = Math.max(hi, h);
  }
  const span = hi - lo || price * 0.01;
  const inView = (p: number) => p > lo - span * 0.6 && p < hi + span * 0.6;
  const fmt = (p: number) => formatPrice(spec, p);

  levels.forEach((p, i) => {
    lines.push({ price: p, label: i === selected ? 'سطح' : undefined, value: fmt(p), color: colors.gold, ink: colors.goldInk });
  });
  for (const o of account.orders) {
    if (o.symbol !== spec.id) continue;
    lines.push({ price: o.price, label: o.type === 'limit' ? 'لیمیت' : 'استاپ', value: fmt(o.price), color: VIOLET, ink: VIOLET_INK });
  }
  for (const p of account.positions) {
    if (p.symbol !== spec.id) continue;
    if (p.tp != null) lines.push({ price: p.tp, label: 'سود', value: fmt(p.tp), color: colors.bull, ink: colors.bullInk });
    lines.push({ price: p.entry, label: 'ورود', value: fmt(p.entry), color: colors.text2, ink: colors.bg });
    if (p.sl != null) lines.push({ price: p.sl, label: 'ضرر', value: fmt(p.sl), color: colors.bear, ink: colors.bearInk });
    // Far-away liquidation levels (low leverage) would squash the candles, so they only show when close.
    const liq = liquidationPrice(spec, p);
    if (inView(liq)) lines.push({ price: liq, label: 'لیکوئید', value: fmt(liq), color: colors.flame, ink: FLAME_INK });
  }
  lines.push({ price, value: fmt(price), color: colors.sky, ink: colors.skyInk });
  return lines;
}

/** The simulator chart with indicator toggles and horizontal levels the learner places. */
export function ChartPanel({
  spec,
  candles,
  volumes,
  price,
  account,
  width,
  badge,
  footer,
}: {
  spec: SymbolSpec;
  candles: Candle[];
  volumes?: number[];
  price: number;
  account: Pick<Account, 'positions' | 'orders'>;
  width: number;
  /** Shown next to the price, e.g. the live data status. */
  badge?: ReactNode;
  footer?: ReactNode;
}) {
  const tools = useGame((s) => s.simTools) ?? DEFAULT_SIM_TOOLS;
  const setTools = useGame((s) => s.setSimTools);
  const [selected, setSelected] = useState<{ symbol: string; index: number } | null>(null);

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

  const volume = tools.volume ? (volumes && volumes.length === candles.length ? volumes : candles.map((c) => simVolume(spec, c))) : undefined;
  const rsi = tools.rsi ? 14 : undefined;
  const lines = buildLines(spec, candles, price, account, levels, sel);
  const change = ((price - candles[0][0]) / candles[0][0]) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headSide}>
          <Txt mono w={800} size={15}>
            {spec.label}
          </Txt>
          {badge}
        </View>
        <Txt mono w={800} size={15} color={change >= 0 ? colors.bull : colors.bearText}>
          {formatPrice(spec, price)}
        </Txt>
      </View>

      <CandleChart
        candles={candles}
        lines={lines}
        ma={tools.ma ? 9 : undefined}
        ma2={tools.ma2 ? 21 : undefined}
        bands={tools.bands ? 20 : undefined}
        rsi={rsi}
        volume={volume}
        width={width}
        height={chartHeight({ rsi, volume }, 210)}
        gutter={104}
      />

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
        <Txt w={700} size={11.5} color={colors.text3}>
          با «+ سطح» یه خط افقی روی قیمت فعلی بذار و با فلش‌ها ببرش روی حمایت یا مقاومت.
        </Txt>
      ) : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    gap: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
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
});
