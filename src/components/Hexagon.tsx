import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

/** A flat-sided hexagon badge with centred content. */
export function Hexagon({ size, color, children }: { size: number; color: string; children?: ReactNode }) {
  const h = Math.round(size * 1.1);
  const points = `${size / 2},0 ${size * 0.96},${h * 0.25} ${size * 0.96},${h * 0.75} ${size / 2},${h} ${size * 0.04},${h * 0.75} ${size * 0.04},${h * 0.25}`;
  return (
    <View style={{ width: size, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={h} style={{ position: 'absolute' }}>
        <Polygon points={points} fill={color} />
      </Svg>
      {children}
    </View>
  );
}
