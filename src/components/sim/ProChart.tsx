import { useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';

import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { bollinger, rsi as rsiValues, sma } from '@/content/indicators';
import type { Candle } from '@/content/types';
import { chartWindow, clockLabel, nextZoom, priceTicks, spreadLabels, timeTicks, zoomFor, ZOOMS } from '@/lib/chartMath';
import { formatPrice, simVolume, type SymbolSpec } from '@/lib/simulator';
import { colors } from '@/theme';

import { VIOLET } from './ui';

/** A horizontal price line: a position, order, stop, target or the learner's own level. */
export type ProLine = {
  price: number;
  /** Short name drawn on the line near the left edge. */
  label?: string;
  /** Latin text after the label, e.g. the size and profit of a position. */
  detail?: string;
  detailColor?: string;
  color: string;
  ink: string;
  solid?: boolean;
};

export type ProTools = { ma: boolean; ma2: boolean; bands: boolean; rsi: boolean; volume: boolean };

export const CHART_BG = '#090D15';
const GRID = 'rgba(255,255,255,0.06)';
const AXIS_LINE = 'rgba(255,255,255,0.16)';
const TIME_H = 20;
const PAD_T = 34;
const PAD_B = 10;
const TAG_H = 18;
const NOW_TAG_H = 32;
/** Rough width of one JetBrains Mono character at 11px, for sizing the price axis. */
const CHAR_W = 6.9;
/** A drag has to move this far (px) before it counts as panning rather than a tap. */
const PAN_SLOP = 4;

const fixed = (v: number) => v.toFixed(1);

/**
 * A MetaTrader-style trading chart: price axis on the right, time axis below, the
 * current price with a candle countdown, price lines with axis tags, indicators,
 * zoom, drag-to-scroll through history and a crosshair that reads out a candle.
 */
export function ProChart({
  spec,
  candles,
  times,
  volumes,
  price,
  lines,
  tools,
  width,
  height,
  title,
  badge,
  countdown,
  corner,
  onTitlePress,
  interactive = true,
  initialCount,
  hidePrice = false,
}: {
  spec: SymbolSpec;
  candles: Candle[];
  /** Open time of each candle; without them the time axis stays empty. */
  times?: number[];
  volumes?: number[];
  price: number;
  lines: ProLine[];
  tools: ProTools;
  width: number;
  height: number;
  title: string;
  badge?: ReactNode;
  /** Time left in the forming candle, shown under the current price. */
  countdown?: string;
  /** A button in the top-right corner of the chart (full screen, or closing it). */
  corner?: { icon: IconName; label: string; onPress: () => void };
  /** Makes the title a button, e.g. to pick another symbol. */
  onTitlePress?: () => void;
  /** False draws a still picture: no scrolling, zoom or crosshair (e.g. an analysis in chat). */
  interactive?: boolean;
  /** Candle slots in view at first; defaults to about 7px per candle. */
  initialCount?: number;
  /** Leaves out the current-price line and tag (e.g. when an entry line already marks it). */
  hidePrice?: boolean;
}) {
  const fmt = (p: number) => formatPrice(spec, p);
  const axisW = Math.ceil(Math.max(fmt(price).length, 6) * CHAR_W + 14);
  const plotW = width - axisW;

  const [count, setCount] = useState(() => initialCount ?? zoomFor(plotW));
  const [offset, setOffset] = useState(0);
  const [crossMode, setCrossMode] = useState(false);
  const [cross, setCross] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ pageX: number; offset: number; panning: boolean } | null>(null);

  const total = candles.length;
  const hasTimes = !!times && times.length === total;
  const timeH = hasTimes ? TIME_H : 6;
  const bodyH = height - timeH;
  const rsiH = tools.rsi ? Math.round(bodyH * 0.22) : 0;
  const mainH = bodyH - rsiH;
  const volH = tools.volume ? Math.round(mainH * 0.16) : 0;
  const priceTop = PAD_T;
  const priceBottom = mainH - PAD_B - volH;

  const win = chartWindow(total, count, offset);
  const step = plotW / count;
  const cx = (i: number) => (i - win.left + 0.5) * step;
  const visible: number[] = [];
  for (let i = win.from; i <= win.to; i++) visible.push(i);

  const bandValues = tools.bands ? bollinger(candles, 20) : [];
  const band = (i: number) => bandValues[i - 19];

  // The price scale fits the candles in view, plus any line that is close to them.
  let lo = Infinity;
  let hi = -Infinity;
  for (const i of visible) {
    lo = Math.min(lo, candles[i][2]);
    hi = Math.max(hi, candles[i][1]);
    const b = band(i);
    if (b) {
      lo = Math.min(lo, b.lower);
      hi = Math.max(hi, b.upper);
    }
  }
  if (!Number.isFinite(lo)) {
    lo = price;
    hi = price;
  }
  const near = (hi - lo || price * 0.002) * 0.5;
  for (const l of lines) {
    if (l.price > lo - near && l.price < hi + near) {
      lo = Math.min(lo, l.price);
      hi = Math.max(hi, l.price);
    }
  }
  const margin = (hi - lo || price * 0.002) * 0.06;
  lo -= margin;
  hi += margin;
  const y = (v: number) => priceTop + ((hi - v) / (hi - lo)) * (priceBottom - priceTop);
  const priceAt = (yy: number) => hi - ((yy - priceTop) / (priceBottom - priceTop)) * (hi - lo);

  // Candles as four paths (up/down wicks and bodies) so a 150-candle chart stays light.
  const bodyW = Math.max(1, step * 0.66);
  let upWick = '';
  let downWick = '';
  let upBody = '';
  let downBody = '';
  for (const i of visible) {
    const [o, h, l, c] = candles[i];
    const x = cx(i);
    const top = y(Math.max(o, c));
    const bh = Math.max(1, y(Math.min(o, c)) - top);
    const wick = `M${fixed(x)} ${fixed(y(h))}V${fixed(y(l))}`;
    const body = `M${fixed(x - bodyW / 2)} ${fixed(top)}h${fixed(bodyW)}v${fixed(bh)}h${fixed(-bodyW)}Z`;
    if (c >= o) {
      upWick += wick;
      upBody += body;
    } else {
      downWick += wick;
      downBody += body;
    }
  }

  let upVol = '';
  let downVol = '';
  if (volH > 0) {
    const vol = (i: number) => (volumes && volumes.length === total ? volumes[i] : simVolume(spec, candles[i]));
    const maxVol = Math.max(1, ...visible.map(vol));
    for (const i of visible) {
      const vh = Math.max(1, (vol(i) / maxVol) * (volH - 4));
      const rect = `M${fixed(cx(i) - bodyW / 2)} ${fixed(mainH - 2 - vh)}h${fixed(bodyW)}v${fixed(vh)}h${fixed(-bodyW)}Z`;
      if (candles[i][3] >= candles[i][0]) upVol += rect;
      else downVol += rect;
    }
  }

  const series = (values: (number | null)[], toY: (v: number) => number) =>
    visible.flatMap((i) => (values[i] == null ? [] : [`${fixed(cx(i))},${fixed(toY(values[i] as number))}`])).join(' ');
  const ma1 = tools.ma ? series(sma(candles, 9), y) : '';
  const ma2 = tools.ma2 ? series(sma(candles, 21), y) : '';
  const bandLine = (key: 'upper' | 'mid' | 'lower') =>
    series(
      candles.map((_, i) => band(i)?.[key] ?? null),
      y,
    );
  const rsiTop = mainH + 16;
  const rsiBottom = bodyH - 6;
  const ry = (v: number) => rsiTop + ((100 - v) / 100) * (rsiBottom - rsiTop);
  const rsiList = tools.rsi ? rsiValues(candles, 14) : [];
  const rsiLine = tools.rsi ? series(rsiList, ry) : '';
  const rsiNow = rsiList[win.to] ?? null;

  const ticks = priceTicks(lo, hi, Math.max(3, Math.round((priceBottom - priceTop) / 44)));
  const timeLabels = hasTimes ? timeTicks(times, win.from, win.to, Math.max(2, Math.floor(plotW / 78))) : [];

  // Axis tags: every line plus the current price, pushed apart so they stay readable.
  const last = candles[total - 1];
  const nowColor = last && last[3] < last[0] ? colors.bear : colors.bull;
  const nowInk = last && last[3] < last[0] ? colors.bearInk : colors.bullInk;
  const nowH = countdown ? NOW_TAG_H : TAG_H;
  const inRange = (p: number) => p >= lo && p <= hi;
  const tagWants = [...lines.map((l) => y(l.price) - TAG_H / 2), y(price) - nowH / 2].map((t) =>
    Math.min(priceBottom - TAG_H / 2, Math.max(priceTop - TAG_H / 2, t)),
  );
  const tagTops = spreadLabels(tagWants, [...lines.map(() => TAG_H), nowH], 2, mainH - 2);
  const tagBoxes = [...lines.map((_, i) => [tagTops[i], tagTops[i] + TAG_H]), [tagTops[lines.length], tagTops[lines.length] + nowH]];

  // Crosshair readout.
  const crossIndex = cross ? Math.min(win.to, Math.max(win.from, Math.floor(cross.x / step + win.left))) : null;
  const crossCandle = crossIndex != null ? candles[crossIndex] : undefined;
  const crossY = cross ? Math.min(priceBottom, Math.max(priceTop, cross.y)) : 0;
  const secondsLabels = hasTimes && total > 1 && times[total - 1] - times[total - 2] < 60_000;
  if (cross) tagBoxes.push([crossY - TAG_H / 2, crossY + TAG_H / 2]);
  // Grid labels hidden under a tag would only peek out around its edges.
  const labelFree = (yy: number) => yy > 8 && yy < mainH - 8 && tagBoxes.every(([a, b]) => yy < a - 7 || yy > b + 7);

  const grant = (e: GestureResponderEvent) => {
    const { pageX, locationX, locationY } = e.nativeEvent;
    drag.current = { pageX, offset: Math.min(win.maxOffset, offset), panning: false };
    if (crossMode) setCross({ x: locationX, y: locationY });
    return true;
  };
  const move = (e: GestureResponderEvent) => {
    const d = drag.current;
    if (!d) return;
    const { pageX, locationX, locationY } = e.nativeEvent;
    if (crossMode) {
      setCross({ x: locationX, y: locationY });
      return;
    }
    const dx = pageX - d.pageX;
    if (!d.panning && Math.abs(dx) < PAN_SLOP) return;
    d.panning = true;
    // Dragging to the right pulls older candles into view.
    setOffset(Math.min(win.maxOffset, Math.max(0, d.offset + dx / step)));
  };
  const end = () => {
    drag.current = null;
    setOffset((o) => Math.round(o));
  };

  const zoom = (dir: 1 | -1) => setCount((c) => nextZoom(c, dir));
  const toggleCross = () => {
    setCrossMode((on) => !on);
    setCross(null);
  };

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        {ticks.map((t) => (
          <Line key={`g${t}`} x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} strokeDasharray="3 4" />
        ))}
        {timeLabels.map(({ index }) => (
          <Line key={`gt${index}`} x1={cx(index)} x2={cx(index)} y1={0} y2={bodyH} stroke={GRID} strokeWidth={1} strokeDasharray="3 4" />
        ))}

        {lines.map((l, i) =>
          inRange(l.price) ? (
            <Line
              key={`l${i}`}
              x1={0}
              x2={plotW}
              y1={y(l.price)}
              y2={y(l.price)}
              stroke={l.color}
              strokeWidth={l.solid ? 1.5 : 1.2}
              strokeDasharray={l.solid ? undefined : '6 4'}
              opacity={0.9}
            />
          ) : null,
        )}

        {upVol ? <Path d={upVol} fill={colors.bull} opacity={0.35} /> : null}
        {downVol ? <Path d={downVol} fill={colors.bear} opacity={0.35} /> : null}

        {bandValues.length > 0 ? (
          <>
            <Polyline points={bandLine('upper')} fill="none" stroke={VIOLET} strokeWidth={1.2} opacity={0.8} />
            <Polyline points={bandLine('lower')} fill="none" stroke={VIOLET} strokeWidth={1.2} opacity={0.8} />
            <Polyline points={bandLine('mid')} fill="none" stroke={VIOLET} strokeWidth={1} strokeDasharray="4 4" opacity={0.55} />
          </>
        ) : null}

        {upWick ? <Path d={upWick} stroke={colors.bull} strokeWidth={1} /> : null}
        {downWick ? <Path d={downWick} stroke={colors.bear} strokeWidth={1} /> : null}
        {upBody ? <Path d={upBody} fill={colors.bull} /> : null}
        {downBody ? <Path d={downBody} fill={colors.bear} /> : null}

        {ma1 ? <Polyline points={ma1} fill="none" stroke={colors.gold} strokeWidth={1.6} strokeLinejoin="round" /> : null}
        {ma2 ? <Polyline points={ma2} fill="none" stroke={colors.sky} strokeWidth={1.6} strokeLinejoin="round" /> : null}

        {!hidePrice && inRange(price) ? (
          <Line x1={0} x2={plotW} y1={y(price)} y2={y(price)} stroke={nowColor} strokeWidth={1} strokeDasharray="2 3" />
        ) : null}

        {tools.rsi ? (
          <>
            <Line x1={0} x2={width} y1={mainH} y2={mainH} stroke={AXIS_LINE} strokeWidth={1} />
            <Line x1={0} x2={plotW} y1={ry(70)} y2={ry(70)} stroke={colors.bear} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="4 4" />
            <Line x1={0} x2={plotW} y1={ry(30)} y2={ry(30)} stroke={colors.bull} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="4 4" />
            {rsiLine ? <Polyline points={rsiLine} fill="none" stroke={VIOLET} strokeWidth={1.6} strokeLinejoin="round" /> : null}
          </>
        ) : null}

        {cross && crossIndex != null ? (
          <>
            <Line x1={cx(crossIndex)} x2={cx(crossIndex)} y1={0} y2={bodyH} stroke={colors.text2} strokeWidth={1} strokeDasharray="3 3" />
            <Line x1={0} x2={plotW} y1={crossY} y2={crossY} stroke={colors.text2} strokeWidth={1} strokeDasharray="3 3" />
          </>
        ) : null}

        <Line x1={plotW + 0.5} x2={plotW + 0.5} y1={0} y2={height} stroke={AXIS_LINE} strokeWidth={1} />
        {hasTimes ? <Line x1={0} x2={width} y1={bodyH + 0.5} y2={bodyH + 0.5} stroke={AXIS_LINE} strokeWidth={1} /> : null}
      </Svg>

      {/* Price axis labels. */}
      {ticks.map((t) =>
        labelFree(y(t)) ? (
          <View key={`t${t}`} pointerEvents="none" style={[styles.axisLabel, { left: plotW + 6, top: y(t) - 8 }]}>
            <Txt mono w={700} size={10.5} color={colors.text3}>
              {fmt(t)}
            </Txt>
          </View>
        ) : null,
      )}
      {tools.rsi ? (
        <>
          {[70, 30].map((v) => (
            <View key={`r${v}`} pointerEvents="none" style={[styles.axisLabel, { left: plotW + 6, top: ry(v) - 8 }]}>
              <Txt mono w={700} size={10.5} color={colors.text3}>
                {String(v)}
              </Txt>
            </View>
          ))}
          <View pointerEvents="none" style={[styles.panelLabel, { top: mainH + 2 }]}>
            <Txt mono w={800} size={10.5} color={VIOLET}>
              {`RSI(14) ${rsiNow != null ? rsiNow.toFixed(1) : ''}`}
            </Txt>
          </View>
        </>
      ) : null}

      {/* Time axis labels. */}
      {timeLabels.map(({ index, seconds }) => {
        const text = clockLabel(times![index], seconds);
        const w = text.length * 6.4 + 6;
        const left = Math.min(plotW - w, Math.max(0, cx(index) - w / 2));
        return (
          <View key={`tt${index}`} pointerEvents="none" style={[styles.axisLabel, { left, top: bodyH + 3, width: w }]}>
            <Txt mono w={700} size={10} color={colors.text3} center>
              {text}
            </Txt>
          </View>
        );
      })}

      {/* Names on the lines. */}
      {lines.map((l, i) =>
        (l.label || l.detail) && inRange(l.price) ? (
          <View key={`n${i}`} pointerEvents="none" style={[styles.lineName, { top: Math.max(priceTop - 16, y(l.price) - 17) }]}>
            {l.label ? (
              <Txt w={800} size={10.5} color={l.color}>
                {l.label}
              </Txt>
            ) : null}
            {l.detail ? (
              <Txt mono w={800} size={10.5} color={l.detailColor ?? l.color}>
                {l.detail}
              </Txt>
            ) : null}
          </View>
        ) : null,
      )}

      {/* Axis tags; lines out of view get an arrow at the edge. */}
      {lines.map((l, i) => (
        <View key={`a${i}`} pointerEvents="none" style={[styles.tag, { left: plotW + 1, width: axisW - 2, top: tagTops[i], backgroundColor: l.color }]}>
          <Txt mono w={800} size={10.5} color={l.ink}>
            {inRange(l.price) ? fmt(l.price) : `${l.price > hi ? '▲' : '▼'}${fmt(l.price)}`}
          </Txt>
        </View>
      ))}
      {hidePrice ? null : (
        <View
          pointerEvents="none"
          style={[styles.tag, styles.nowTag, { left: plotW + 1, width: axisW - 2, top: tagTops[lines.length], height: nowH, backgroundColor: nowColor }]}
        >
          <Txt mono w={800} size={11} color={nowInk}>
            {fmt(price)}
          </Txt>
          {countdown ? (
            <Txt mono w={700} size={10} color={nowInk} style={{ opacity: 0.8 }}>
              {countdown}
            </Txt>
          ) : null}
        </View>
      )}

      {cross && crossCandle ? (
        <>
          <View pointerEvents="none" style={[styles.tag, styles.crossTag, { left: plotW + 1, width: axisW - 2, top: crossY - TAG_H / 2 }]}>
            <Txt mono w={800} size={10.5} color={colors.bg}>
              {fmt(priceAt(crossY))}
            </Txt>
          </View>
          {hasTimes && crossIndex != null ? (
            <View
              pointerEvents="none"
              style={[styles.tag, styles.crossTag, styles.crossTime, { top: bodyH + 1, left: Math.min(plotW - 70, Math.max(0, cx(crossIndex) - 35)) }]}
            >
              <Txt mono w={800} size={10} color={colors.bg}>
                {clockLabel(times![crossIndex], secondsLabels)}
              </Txt>
            </View>
          ) : null}
        </>
      ) : null}

      {/* The touch surface: drag to scroll, or move the crosshair when it is on. */}
      {interactive ? (
        <View
          style={[styles.touch, { width: plotW, height: bodyH }, webTouch(crossMode)]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={grant}
          onResponderMove={move}
          onResponderRelease={end}
          onResponderTerminate={end}
          onResponderTerminationRequest={() => !crossMode && !drag.current?.panning}
          accessibilityLabel="نمودار؛ برای دیدن کندل‌های قبلی به چپ و راست بکش"
        />
      ) : null}

      <View pointerEvents="box-none" style={[styles.titleRow, { maxWidth: plotW - (corner ? 48 : 8) }]}>
        {onTitlePress ? (
          <Pressable
            onPress={onTitlePress}
            accessibilityRole="button"
            accessibilityLabel={`نماد ${title}؛ برای عوض کردن نماد بزن`}
            hitSlop={6}
            style={({ pressed }) => [styles.titleButton, pressed && { opacity: 0.7 }]}
          >
            <Txt mono w={800} size={13} color={colors.text}>
              {title}
            </Txt>
            <Icon name="chevronDown" size={15} color={colors.text2} strokeWidth={2.8} />
          </Pressable>
        ) : (
          <Txt mono w={800} size={12.5} color={colors.text}>
            {title}
          </Txt>
        )}
        {badge}
      </View>
      {crossCandle ? (
        <View pointerEvents="none" style={[styles.ohlc, { maxWidth: plotW - 12 }]}>
          {(['O', 'H', 'L', 'C'] as const).map((k, j) => (
            <Txt key={k} mono w={700} size={10.5} color={colors.text2}>
              {`${k} `}
              <Txt mono w={800} size={10.5} color={crossCandle[3] >= crossCandle[0] ? colors.bullText : colors.bearText}>
                {fmt(crossCandle[j])}
              </Txt>
            </Txt>
          ))}
        </View>
      ) : null}

      {corner ? (
        <ChartButton icon={corner.icon} label={corner.label} onPress={corner.onPress} style={{ position: 'absolute', left: plotW - 40, top: 4 }} />
      ) : null}
      {interactive ? (
        <View style={[styles.controls, { top: mainH - 42 }]} pointerEvents="box-none">
          <ChartButton icon="crosshair" label="خط‌کش قیمت (کراس‌هیر)" on={crossMode} onPress={toggleCross} />
          <ChartButton icon="minus" label="کوچک‌نمایی" onPress={() => zoom(-1)} disabled={count >= ZOOMS[ZOOMS.length - 1]} />
          <ChartButton icon="plus" label="بزرگ‌نمایی" onPress={() => zoom(1)} disabled={count <= ZOOMS[0]} />
        </View>
      ) : null}
      {interactive && offset >= 1 ? (
        <ChartButton
          icon="skipEnd"
          label="برگشت به آخرین کندل"
          onPress={() => setOffset(0)}
          style={{ position: 'absolute', left: plotW - 40, top: mainH - 42 }}
        />
      ) : null}
    </View>
  );
}

const webTouch = (crossMode: boolean) =>
  Platform.OS === 'web'
    ? ({ touchAction: crossMode ? 'none' : 'pan-y', cursor: crossMode ? 'crosshair' : 'grab', userSelect: 'none' } as unknown as ViewStyle)
    : null;

function ChartButton({
  icon,
  label,
  onPress,
  on,
  disabled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  on?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, disabled }}
      hitSlop={4}
      style={({ pressed }) => [styles.button, on && styles.buttonOn, style, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      <Icon name={icon} size={17} color={on ? colors.skyInk : colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    direction: 'ltr',
    backgroundColor: CHART_BG,
    overflow: 'hidden',
  },
  axisLabel: {
    position: 'absolute',
  },
  panelLabel: {
    position: 'absolute',
    left: 8,
  },
  lineName: {
    position: 'absolute',
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(9,13,21,0.75)',
  },
  tag: {
    position: 'absolute',
    height: TAG_H,
    paddingLeft: 5,
    borderRadius: 3,
    justifyContent: 'center',
  },
  nowTag: {
    gap: 0,
  },
  crossTag: {
    backgroundColor: colors.text,
  },
  crossTime: {
    width: 70,
    paddingLeft: 0,
    alignItems: 'center',
  },
  touch: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  titleRow: {
    position: 'absolute',
    left: 8,
    top: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 8,
    marginLeft: -4,
    marginTop: -3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'rgba(23,31,49,0.9)',
  },
  ohlc: {
    position: 'absolute',
    left: 8,
    top: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(9,13,21,0.8)',
  },
  controls: {
    position: 'absolute',
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'rgba(23,31,49,0.88)',
  },
  buttonOn: {
    backgroundColor: colors.sky,
    borderColor: colors.sky,
  },
});
