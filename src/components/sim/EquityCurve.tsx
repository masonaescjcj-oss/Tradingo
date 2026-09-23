import { useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import { Txt } from '@/components/Txt';
import { colors } from '@/theme';
import { fa, usd } from '@/utils/format';

const PAD_T = 14;
const PAD_B = 14;
const PAD_X = 10;

/**
 * Closed-trade balance over time: one line, a faint wash under it and a hairline at the
 * starting balance. Touch and drag to read the balance after any trade.
 */
export function EquityCurve({ curve, width, height = 150 }: { curve: number[]; width: number; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  if (curve.length < 2) {
    return (
      <View style={[styles.empty, { width, height: 90 }]}>
        <Txt w={700} size={12.5} color={colors.text3} center>
          بعد از اولین معامله‌ی بسته‌شده، نمودار سرمایه‌ت این‌جا کشیده می‌شه.
        </Txt>
      </View>
    );
  }
  const lo = Math.min(...curve);
  const hi = Math.max(...curve);
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.01);
  const x = (i: number) => PAD_X + (i / (curve.length - 1)) * (width - PAD_X * 2);
  const y = (v: number) => PAD_T + ((hi - v) / span) * (height - PAD_T - PAD_B);
  const pts = curve.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const bottom = height - PAD_B;
  const area = `M${x(0).toFixed(1)},${bottom} L${pts.replace(/ /g, ' L')} L${x(curve.length - 1).toFixed(1)},${bottom} Z`;
  const last = curve.length - 1;
  const idx = active != null && active <= last ? active : last;

  const pick = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    const i = Math.round(((lx - PAD_X) / (width - PAD_X * 2)) * last);
    setActive(Math.max(0, Math.min(last, i)));
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.readout}>
        <Txt w={700} size={12} color={colors.text2}>
          {idx === 0 ? 'شروع' : `بعد از معامله‌ی ${fa(idx)}`}
        </Txt>
        <Txt mono w={800} size={13}>
          {usd(curve[idx])}
        </Txt>
      </View>
      <View
        style={[styles.plot, { width, height }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderTerminationRequest={() => true}
        accessibilityRole="image"
        accessibilityLabel={`نمودار سرمایه از ${usd(curve[0])} تا ${usd(curve[last])} در ${fa(last)} معامله`}
      >
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={y(curve[0])} y2={y(curve[0])} stroke={colors.line} strokeWidth={1} />
          <Path d={area} fill={colors.sky} fillOpacity={0.1} />
          <Polyline points={pts} fill="none" stroke={colors.sky} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active != null ? <Line x1={x(idx)} x2={x(idx)} y1={PAD_T - 6} y2={bottom} stroke={colors.text3} strokeWidth={1} /> : null}
          <Circle cx={x(idx)} cy={y(curve[idx])} r={6} fill={colors.surfaceDeep} />
          <Circle cx={x(idx)} cy={y(curve[idx])} r={4} fill={colors.sky} />
        </Svg>
        <View pointerEvents="none" style={[styles.axis, { top: 2 }]}>
          <Txt mono w={700} size={10} color={colors.text3}>
            {usd(hi)}
          </Txt>
        </View>
        <View pointerEvents="none" style={[styles.axis, { bottom: 0 }]}>
          <Txt mono w={700} size={10} color={colors.text3}>
            {usd(lo)}
          </Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    direction: 'ltr',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surfaceDeep,
  },
  axis: {
    position: 'absolute',
    left: 8,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceDeep,
  },
});
