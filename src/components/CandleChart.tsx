import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Svg, { Line, Path, Polyline, Rect } from 'react-native-svg';

import { bollinger, rsi as rsiValues, sma } from '@/content/indicators';
import type { Candle, ChartSpec, Tone } from '@/content/types';
import { t } from '@/i18n';
import { colors } from '@/theme';
import { formatPrice, priceDecimals } from '@/utils/format';

import { Txt } from './Txt';

export type CandleMark = 'selected' | 'correct' | 'wrong';

/** A horizontal line the user drags up and down to pick a price ("draw a line" questions). */
export type DragLine = {
  price: number;
  label: string;
  color: string;
  ink: string;
  /** Called with the new price when a drag (or a tap that moves the line) ends. */
  onChange: (price: number) => void;
  disabled?: boolean;
  /**
   * Prices the scale must include, e.g. the line's start and every accepted answer.
   * The scale never follows the line itself, so it stays still while dragging.
   */
  extent?: [number, number];
  /** Decimals the line snaps to and shows; defaults to the usual ones for its price. */
  decimals?: number;
  /** Price change of one accessibility increment/decrement. */
  step?: number;
};

type Props = ChartSpec & {
  width: number;
  height: number;
  /** Space reserved on the right for level labels. */
  gutter?: number;
  labelSide?: 'left' | 'right';
  background?: string;
  grid?: boolean;
  /** Makes every candle tappable (used by "tap the candle" questions). */
  onCandlePress?: (index: number) => void;
  marks?: Record<number, CandleMark>;
  dragLine?: DragLine;
};

const PAD_T = 14;
const PAD_B = 14;
const PAD_L = 8;
const PILL_H = 20;
const VIOLET = '#A78BFA';
/** Touches this close (px) to the drag line pick it up where it is; farther ones move it to the finger first. */
const GRAB = 26;
const DRAG_PILL_H = 26;

const TONE: Record<Tone, { color: string; ink: string }> = {
  bull: { color: colors.bull, ink: colors.bullInk },
  bear: { color: colors.bear, ink: colors.bearInk },
  gold: { color: colors.gold, ink: colors.goldInk },
  sky: { color: colors.sky, ink: colors.skyInk },
  neutral: { color: colors.text3, ink: colors.bg },
};

const MARK_COLOR: Record<CandleMark, string> = { selected: colors.sky, correct: colors.bull, wrong: colors.bear };

/** Chart height that leaves room for the volume bars and RSI panel when a spec has them. */
export function chartHeight(chart: Pick<ChartSpec, 'rsi' | 'volume'>, base: number): number {
  return base + (chart.rsi ? 70 : 0) + (chart.volume ? 28 : 0);
}

const points = (xs: (readonly [number, number] | null)[]) =>
  xs
    .filter((p): p is readonly [number, number] => p != null)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

/**
 * Candlestick chart with optional levels, zones, trendlines, notes, moving averages,
 * Bollinger bands, volume bars, an RSI panel and a "next candle" slot.
 */
export function CandleChart({
  candles,
  lines = [],
  highlight,
  ghost,
  ma,
  ma2,
  bands,
  zones = [],
  segments = [],
  notes = [],
  volume,
  rsi,
  width,
  height,
  gutter = 8,
  labelSide = 'right',
  background = colors.surfaceDeep,
  grid = true,
  onCandlePress,
  marks,
  dragLine,
}: Props) {
  const rsiH = rsi ? Math.round(height * 0.28) : 0;
  const mainH = height - rsiH;
  const volH = volume ? Math.round(mainH * 0.2) : 0;
  const bandValues = bands ? bollinger(candles, bands) : [];

  let lo = Infinity;
  let hi = -Infinity;
  const include = (v: number) => {
    if (!Number.isFinite(v)) return;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  };
  for (const [, h, l] of candles) {
    include(h);
    include(l);
  }
  lines.forEach((l) => include(l.price));
  zones.forEach((z) => {
    include(z.from);
    include(z.to);
  });
  segments.forEach((s) => {
    include(s.from[1]);
    include(s.to[1]);
  });
  bandValues.forEach((b) => {
    include(b.upper);
    include(b.lower);
  });
  dragLine?.extent?.forEach(include);

  const span = hi - lo || 1;
  const priceBottom = mainH - PAD_B - volH;
  const y = (v: number) => PAD_T + ((hi - v) / span) * (priceBottom - PAD_T);
  const slots = candles.length + (ghost ? 1 : 0);
  const step = (width - PAD_L - gutter) / slots;
  const bodyW = Math.max(3, step * 0.6);
  const cx = (i: number) => PAD_L + i * step + step / 2;

  const maLine = (period?: number) =>
    period && period > 1 ? points(sma(candles, period).map((v, i) => (v == null ? null : ([cx(i), y(v)] as const)))) : null;
  const maPoints = maLine(ma);
  const ma2Points = maLine(ma2);
  const bandOffset = bands ? bands - 1 : 0;
  const bandLine = (key: 'upper' | 'lower' | 'mid') => points(bandValues.map((b, k) => [cx(k + bandOffset), y(b[key])] as const));

  const last: Candle = candles[candles.length - 1];
  const hl = highlight != null && highlight >= 0 ? candles[highlight] : undefined;
  const hlW = Math.max(step * 1.5, 28);
  const markW = Math.max(step * 0.95, 14);
  const ghostW = Math.max(bodyW + 8, 26);
  const gridLines = grid ? Array.from({ length: Math.floor(mainH / 34) }, (_, i) => (i + 1) * 34) : [];

  // Level labels are pushed apart so close prices (entry vs. current) stay readable.
  const pillTops: number[] = [];
  lines
    .map((level, i) => ({ i, top: y(level.price) - PILL_H / 2 }))
    .sort((a, b) => a.top - b.top)
    .forEach((p, k, arr) => {
      const prev = k > 0 ? pillTops[arr[k - 1].i] : -Infinity;
      pillTops[p.i] = Math.min(mainH - PILL_H - 2, Math.max(2, p.top, prev + PILL_H + 2));
    });

  const maxVol = volume ? Math.max(...volume, 1) : 1;
  const rsiTop = mainH + 8;
  const rsiBottom = height - 8;
  const ry = (v: number) => rsiTop + ((100 - v) / 100) * (rsiBottom - rsiTop);
  const rsiPoints = rsi ? points(rsiValues(candles, rsi).map((v, i) => (v == null ? null : ([cx(i), ry(v)] as const)))) : null;

  return (
    <View style={[styles.wrap, { width, height, backgroundColor: background }]}>
      <Svg width={width} height={height}>
        {gridLines.map((gy) => (
          <Line key={gy} x1={0} x2={width} y1={gy} y2={gy} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        {zones.map((z, i) => {
          const tone = TONE[z.tone ?? 'gold'];
          const x0 = z.start != null ? cx(z.start) - step / 2 : 0;
          const x1 = z.end != null ? cx(z.end) + step / 2 : width;
          const top = y(Math.max(z.from, z.to));
          return (
            <Rect
              key={`z${i}`}
              x={x0}
              y={top}
              width={Math.max(4, x1 - x0)}
              height={Math.max(3, y(Math.min(z.from, z.to)) - top)}
              fill={tone.color}
              fillOpacity={0.14}
              stroke={tone.color}
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          );
        })}
        {lines.map((level, i) => (
          <Line
            key={`l${i}`}
            x1={0}
            x2={width}
            y1={y(level.price)}
            y2={y(level.price)}
            stroke={level.color ?? colors.gold}
            strokeWidth={2}
            strokeDasharray="6 5"
            opacity={0.9}
          />
        ))}
        {bandValues.length > 0 && (
          <>
            <Polyline points={bandLine('upper')} fill="none" stroke={VIOLET} strokeWidth={1.5} opacity={0.8} />
            <Polyline points={bandLine('lower')} fill="none" stroke={VIOLET} strokeWidth={1.5} opacity={0.8} />
            <Polyline points={bandLine('mid')} fill="none" stroke={VIOLET} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
          </>
        )}
        {hl && highlight != null && (
          <Rect
            x={cx(highlight) - hlW / 2}
            y={y(hl[1]) - 8}
            width={hlW}
            height={y(hl[2]) - y(hl[1]) + 16}
            rx={12}
            fill="rgba(255,197,61,0.08)"
            stroke={colors.gold}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
        {marks &&
          Object.entries(marks).map(([key, mark]) => {
            const i = Number(key);
            const c = candles[i];
            if (!c) return null;
            return (
              <Rect
                key={`m${i}`}
                x={cx(i) - markW / 2}
                y={y(c[1]) - 6}
                width={markW}
                height={y(c[2]) - y(c[1]) + 12}
                rx={8}
                fill={MARK_COLOR[mark]}
                fillOpacity={0.16}
                stroke={MARK_COLOR[mark]}
                strokeWidth={2}
              />
            );
          })}
        {volume?.map((v, i) => {
          const c = candles[i];
          if (!c) return null;
          const h = Math.max(1, (v / maxVol) * (volH - 6));
          return (
            <Rect
              key={`v${i}`}
              x={cx(i) - bodyW / 2}
              y={mainH - 2 - h}
              width={bodyW}
              height={h}
              fill={c[3] >= c[0] ? colors.bull : colors.bear}
              opacity={0.4}
            />
          );
        })}
        {candles.map(([o, h, l, c], i) => {
          const color = c >= o ? colors.bull : colors.bear;
          const top = y(Math.max(o, c));
          const bottom = y(Math.min(o, c));
          return (
            <GroupCandle
              key={i}
              x={cx(i)}
              wickTop={y(h)}
              wickBottom={y(l)}
              bodyTop={top}
              bodyHeight={Math.max(2, bottom - top)}
              bodyWidth={bodyW}
              color={color}
            />
          );
        })}
        {segments.map((s, i) => {
          const tone = TONE[s.tone ?? 'gold'];
          const x1 = cx(s.from[0]);
          const y1 = y(s.from[1]);
          let x2 = cx(s.to[0]);
          let y2 = y(s.to[1]);
          if (s.extend && x2 !== x1) {
            const slope = (y2 - y1) / (x2 - x1);
            y2 = y2 + slope * (width - x2);
            x2 = width;
          }
          return (
            <Line
              key={`s${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={tone.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '6 5' : undefined}
            />
          );
        })}
        {maPoints ? (
          <Polyline points={maPoints} fill="none" stroke={colors.gold} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
        ) : null}
        {ma2Points ? (
          <Polyline points={ma2Points} fill="none" stroke={colors.sky} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
        ) : null}
        {ghost && (
          <Rect
            x={cx(candles.length) - ghostW / 2}
            y={y(last[3]) - 28}
            width={ghostW}
            height={56}
            rx={8}
            fill="rgba(255,197,61,0.08)"
            stroke={colors.gold}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
        {rsi ? (
          <>
            <Line x1={0} x2={width} y1={mainH} y2={mainH} stroke={colors.line} strokeWidth={1.5} />
            <Rect x={0} y={ry(70)} width={width} height={ry(30) - ry(70)} fill={VIOLET} fillOpacity={0.06} />
            <Line x1={0} x2={width} y1={ry(70)} y2={ry(70)} stroke={colors.bear} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 4" />
            <Line x1={0} x2={width} y1={ry(30)} y2={ry(30)} stroke={colors.bull} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 4" />
            {rsiPoints ? <Polyline points={rsiPoints} fill="none" stroke={VIOLET} strokeWidth={2} strokeLinejoin="round" /> : null}
          </>
        ) : null}
      </Svg>

      {/* Under the labels (which ignore touches), over the candles. */}
      {dragLine && (
        <DragLayer
          line={dragLine}
          lo={lo}
          hi={hi}
          top={PAD_T}
          bottom={priceBottom}
          width={width}
          height={mainH}
          pillSide={labelSide === 'left' ? 'right' : 'left'}
        />
      )}
      {zones.map((z, i) =>
        z.label ? (
          <View
            key={`zl${i}`}
            pointerEvents="none"
            style={[styles.zoneLabel, { left: (z.start != null ? cx(z.start) - step / 2 : 0) + 4, top: y(Math.max(z.from, z.to)) + 2 }]}
          >
            <Txt w={800} size={10} color={TONE[z.tone ?? 'gold'].color}>
              {z.label}
            </Txt>
          </View>
        ) : null,
      )}
      {notes.map((n, i) => {
        const c = candles[n.index];
        if (!c) return null;
        const tone = TONE[n.tone ?? 'neutral'];
        const top = n.at === 'low' ? Math.min(mainH - 18, y(c[2]) + 4) : Math.max(0, y(c[1]) - 20);
        return (
          <View key={`n${i}`} pointerEvents="none" style={[styles.note, { left: cx(n.index) - 30, top }]}>
            <View style={[styles.notePill, { backgroundColor: n.tone ? tone.color : colors.raised }]}>
              <Txt w={900} size={10} color={n.tone ? tone.ink : colors.text}>
                {n.text}
              </Txt>
            </View>
          </View>
        );
      })}
      {ghost && (
        <View pointerEvents="none" style={[styles.ghostMark, { left: cx(candles.length) - ghostW / 2, top: y(last[3]) - 28, width: ghostW }]}>
          <Txt w={900} size={20} color={colors.gold}>
            {t('؟')}
          </Txt>
        </View>
      )}
      {lines.map((level, i) =>
        level.label || level.value ? (
          <View
            key={`p${i}`}
            pointerEvents="none"
            style={[
              styles.pill,
              { top: pillTops[i], backgroundColor: level.color ?? colors.gold },
              labelSide === 'left' ? { left: 6 } : { right: 6 },
            ]}
          >
            {level.label ? (
              <Txt w={800} size={11} color={level.ink ?? colors.goldInk}>
                {level.label}
              </Txt>
            ) : null}
            {level.value ? (
              <Txt mono w={700} size={11} color={level.ink ?? colors.goldInk}>
                {level.value}
              </Txt>
            ) : null}
          </View>
        ) : null,
      )}
      {rsi ? (
        <View pointerEvents="none" style={[styles.rsiLabel, { top: mainH + 4 }]}>
          <Txt mono w={800} size={10} color={VIOLET}>
            {`RSI ${rsi}`}
          </Txt>
        </View>
      ) : null}
      {onCandlePress &&
        candles.map((_, i) => (
          <Pressable
            key={`t${i}`}
            onPress={() => onCandlePress(i)}
            accessibilityRole="button"
            accessibilityLabel={t('کندل {n}', { n: i + 1 })}
            style={[styles.tapZone, { left: PAD_L + i * step, width: step, height: mainH }]}
          />
        ))}
    </View>
  );
}

// Web needs these so a touch drag moves the line instead of scrolling the page.
const WEB_DRAG = Platform.OS === 'web' ? ({ cursor: 'ns-resize', touchAction: 'none', userSelect: 'none' } as unknown as ViewStyle) : null;

/**
 * The draggable line and its price tag, over the whole price area so the touch target is big.
 * Dragging moves the line by the finger's vertical travel (converted with the chart's own scale);
 * touching away from the line first moves it to the finger. The live position is local state,
 * so only this layer re-renders while dragging; the parent hears about it on release.
 */
function DragLayer({
  line,
  lo,
  hi,
  top,
  bottom,
  width,
  height,
  pillSide,
}: {
  line: DragLine;
  lo: number;
  hi: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  pillSide: 'left' | 'right';
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const grab = useRef<{ pageY: number; price: number; last: number } | null>(null);

  const decimals = line.decimals ?? priceDecimals(line.price);
  const span = hi - lo || 1;
  const perPx = span / Math.max(1, bottom - top);
  const snap = (v: number) => Number(Math.min(hi, Math.max(lo, v)).toFixed(decimals));
  const toY = (v: number) => top + ((hi - Math.min(hi, Math.max(lo, v))) / span) * (bottom - top);
  const toPrice = (yy: number) => hi - (yy - top) * perPx;

  const shown = drag ?? line.price;
  const ly = toY(shown);
  const pillTop = Math.min(height - DRAG_PILL_H - 2, Math.max(2, ly - DRAG_PILL_H / 2));
  const text = formatPrice(shown, decimals);

  const finish = () => {
    const g = grab.current;
    grab.current = null;
    setDrag(null);
    if (g && g.last !== line.price) line.onChange(g.last);
  };

  const nudge = (dir: 1 | -1) => {
    if (!line.step || line.disabled) return;
    const next = snap(line.price + dir * line.step);
    if (next !== line.price) line.onChange(next);
  };

  return (
    <View
      style={[styles.dragSurface, { width, height }, !line.disabled && WEB_DRAG]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={line.label}
      aria-valuetext={text}
      aria-valuenow={shown}
      aria-valuemin={lo}
      aria-valuemax={hi}
      aria-disabled={!!line.disabled}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      onStartShouldSetResponder={() => !line.disabled}
      onMoveShouldSetResponder={() => !line.disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e: GestureResponderEvent) => {
        const { pageY, locationY } = e.nativeEvent;
        const price = Math.abs(locationY - ly) <= GRAB ? line.price : snap(toPrice(locationY));
        grab.current = { pageY, price, last: price };
        setDrag(price);
        // Returning true keeps a parent scroll view from taking over the gesture on native.
        return true;
      }}
      onResponderMove={(e: GestureResponderEvent) => {
        const g = grab.current;
        if (!g) return;
        g.last = snap(g.price - (e.nativeEvent.pageY - g.pageY) * perPx);
        setDrag(g.last);
      }}
      onResponderRelease={finish}
      onResponderTerminate={finish}
    >
      <View pointerEvents="none" style={[styles.dragGlow, { top: ly - 9, backgroundColor: line.color, opacity: drag != null ? 0.3 : 0.16 }]} />
      <View pointerEvents="none" style={[styles.dragLine, { top: ly - 1.5, backgroundColor: line.color }]} />
      <View
        pointerEvents="none"
        style={[styles.dragPill, { top: pillTop, backgroundColor: line.color }, pillSide === 'left' ? { left: 6 } : { right: 6 }]}
      >
        {!line.disabled && (
          <Svg width={10} height={14} viewBox="0 0 10 14">
            <Path d="M1.5 5 L5 1.5 L8.5 5 M1.5 9 L5 12.5 L8.5 9" stroke={line.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
        <Txt w={800} size={12} color={line.ink}>
          {line.label}
        </Txt>
        <Txt mono w={800} size={12} color={line.ink}>
          {text}
        </Txt>
      </View>
    </View>
  );
}

function GroupCandle({
  x,
  wickTop,
  wickBottom,
  bodyTop,
  bodyHeight,
  bodyWidth,
  color,
}: {
  x: number;
  wickTop: number;
  wickBottom: number;
  bodyTop: number;
  bodyHeight: number;
  bodyWidth: number;
  color: string;
}) {
  return (
    <>
      <Line x1={x} x2={x} y1={wickTop} y2={wickBottom} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} rx={2} fill={color} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    direction: 'ltr',
  },
  pill: {
    position: 'absolute',
    height: PILL_H,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ghostMark: {
    position: 'absolute',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneLabel: {
    position: 'absolute',
  },
  note: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
  },
  notePill: {
    paddingHorizontal: 5,
    borderRadius: 6,
    minHeight: 16,
    justifyContent: 'center',
  },
  rsiLabel: {
    position: 'absolute',
    left: 6,
  },
  tapZone: {
    position: 'absolute',
    top: 0,
  },
  dragSurface: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  dragGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 18,
  },
  dragLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  dragPill: {
    position: 'absolute',
    height: DRAG_PILL_H,
    paddingHorizontal: 9,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
