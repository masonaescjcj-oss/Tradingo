import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

import { bollinger, rsi as rsiValues, sma } from '@/content/indicators';
import type { Candle, ChartSpec, Tone } from '@/content/types';
import { colors } from '@/theme';

import { Txt } from './Txt';

export type CandleMark = 'selected' | 'correct' | 'wrong';

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
};

const PAD_T = 14;
const PAD_B = 14;
const PAD_L = 8;
const PILL_H = 20;
const VIOLET = '#A78BFA';

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
            ؟
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
            accessibilityLabel={`کندل ${i + 1}`}
            style={[styles.tapZone, { left: PAD_L + i * step, width: step, height: mainH }]}
          />
        ))}
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
});
