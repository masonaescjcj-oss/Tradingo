import { StyleSheet, View } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

import { colors } from '@/theme';
import type { Candle, ChartSpec } from '@/content/types';

import { Txt } from './Txt';

type Props = ChartSpec & {
  width: number;
  height: number;
  /** Space reserved on the right for level labels. */
  gutter?: number;
  labelSide?: 'left' | 'right';
  background?: string;
  grid?: boolean;
};

const PAD_T = 14;
const PAD_B = 14;
const PAD_L = 8;

/** Candlestick chart with optional horizontal levels, a highlighted candle, a moving average and a "next candle" slot. */
export function CandleChart({
  candles,
  lines = [],
  highlight,
  ghost,
  ma,
  width,
  height,
  gutter = 8,
  labelSide = 'right',
  background = colors.surfaceDeep,
  grid = true,
}: Props) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const [, h, l] of candles) {
    lo = Math.min(lo, l);
    hi = Math.max(hi, h);
  }
  for (const level of lines) {
    lo = Math.min(lo, level.price);
    hi = Math.max(hi, level.price);
  }
  const span = hi - lo || 1;
  const y = (v: number) => PAD_T + ((hi - v) / span) * (height - PAD_T - PAD_B);
  const slots = candles.length + (ghost ? 1 : 0);
  const step = (width - PAD_L - gutter) / slots;
  const bodyW = Math.max(3, step * 0.6);
  const cx = (i: number) => PAD_L + i * step + step / 2;

  const maPoints =
    ma && ma > 1
      ? candles
          .map((_, i) => {
            if (i < ma - 1) return null;
            let sum = 0;
            for (let k = i - ma + 1; k <= i; k++) sum += candles[k][3];
            return `${cx(i).toFixed(1)},${y(sum / ma).toFixed(1)}`;
          })
          .filter(Boolean)
          .join(' ')
      : null;

  const last: Candle = candles[candles.length - 1];
  const hl = highlight != null && highlight >= 0 ? candles[highlight] : undefined;
  const hlW = Math.max(step * 1.5, 28);
  const ghostW = Math.max(bodyW + 8, 26);
  const gridLines = grid ? Array.from({ length: Math.floor(height / 34) }, (_, i) => (i + 1) * 34) : [];

  // Level labels are pushed apart so close prices (entry vs. current) stay readable.
  const PILL_H = 20;
  const pillTops: number[] = [];
  lines
    .map((level, i) => ({ i, top: y(level.price) - PILL_H / 2 }))
    .sort((a, b) => a.top - b.top)
    .forEach((p, k, arr) => {
      const prev = k > 0 ? pillTops[arr[k - 1].i] : -Infinity;
      pillTops[p.i] = Math.min(height - PILL_H - 2, Math.max(2, p.top, prev + PILL_H + 2));
    });

  return (
    <View style={[styles.wrap, { width, height, backgroundColor: background }]}>
      <Svg width={width} height={height}>
        {gridLines.map((gy) => (
          <Line key={gy} x1={0} x2={width} y1={gy} y2={gy} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
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
        {maPoints ? (
          <Polyline
            points={maPoints}
            fill="none"
            stroke={colors.gold}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.85}
          />
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
      </Svg>
      {ghost && (
        <View
          pointerEvents="none"
          style={[styles.ghostMark, { left: cx(candles.length) - ghostW / 2, top: y(last[3]) - 28, width: ghostW }]}
        >
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
    height: 20,
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
});
