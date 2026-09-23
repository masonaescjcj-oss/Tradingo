import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { colors } from '@/theme';

import { Txt } from './Txt';

const LABELS = [
  { y: 16, text: 'سقف · High' },
  { y: 48, text: 'بسته شدن · Close' },
  { y: 96, text: 'بدنه · Body' },
  { y: 144, text: 'باز شدن · Open' },
  { y: 176, text: 'کف · Low' },
];

/** A bullish candle with each price labelled, for the first candlestick lesson. */
export function CandleAnatomy() {
  return (
    <View style={styles.wrap}>
      <Svg width={120} height={192}>
        <Line x1={40} x2={40} y1={16} y2={176} stroke={colors.bull} strokeWidth={3} strokeLinecap="round" />
        <Rect x={16} y={48} width={48} height={96} rx={6} fill={colors.bull} />
        {LABELS.map((l) => (
          <Line key={l.y} x1={72} x2={112} y1={l.y} y2={l.y} stroke={colors.faint} strokeWidth={2} strokeDasharray="4 4" />
        ))}
      </Svg>
      {LABELS.map((l) => (
        <View key={l.text} style={[styles.label, { top: l.y - 11 }]}>
          <Txt w={800} size={13}>
            {l.text}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 260,
    height: 192,
    alignSelf: 'center',
    direction: 'ltr',
  },
  label: {
    position: 'absolute',
    left: 120,
    height: 22,
    justifyContent: 'center',
  },
});
