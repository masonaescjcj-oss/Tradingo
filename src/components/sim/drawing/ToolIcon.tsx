import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import type { ToolId } from '@/lib/drawings';
import { colors } from '@/theme';

/** A small picture of each drawing tool for the tools sheet, on a 24×24 grid. */
export function ToolIcon({ tool, size = 26, color = colors.text }: { tool: ToolId; size?: number; color?: string }) {
  const s = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const dot = (cx: number, cy: number) => <Circle cx={cx} cy={cy} r={2} fill={colors.bg} stroke={color} strokeWidth={1.5} />;
  let body;
  switch (tool) {
    case 'trend':
      body = (
        <>
          <Line {...s} x1={5} y1={19} x2={19} y2={5} />
          {dot(5, 19)}
          {dot(19, 5)}
        </>
      );
      break;
    case 'ray':
      body = (
        <>
          <Line {...s} x1={5} y1={19} x2={22} y2={2} />
          {dot(5, 19)}
          {dot(12, 12)}
        </>
      );
      break;
    case 'info':
      body = (
        <>
          <Line {...s} x1={4} y1={20} x2={14} y2={10} />
          {dot(4, 20)}
          {dot(14, 10)}
          <Rect {...s} x={13} y={3} width={9} height={5} rx={1} />
        </>
      );
      break;
    case 'extended':
      body = (
        <>
          <Line {...s} x1={1} y1={23} x2={23} y2={1} />
          {dot(8, 16)}
          {dot(16, 8)}
        </>
      );
      break;
    case 'angle':
      body = (
        <>
          <Line {...s} x1={4} y1={19} x2={19} y2={6} />
          <Line {...s} x1={4} y1={19} x2={21} y2={19} strokeDasharray="2 2" />
          <Path {...s} d="M11 19a7 7 0 0 0-1.8-4.6" />
          {dot(4, 19)}
        </>
      );
      break;
    case 'hline':
      body = (
        <>
          <Line {...s} x1={2} y1={12} x2={22} y2={12} />
          {dot(12, 12)}
        </>
      );
      break;
    case 'hray':
      body = (
        <>
          <Line {...s} x1={6} y1={12} x2={22} y2={12} />
          {dot(6, 12)}
        </>
      );
      break;
    case 'vline':
      body = (
        <>
          <Line {...s} x1={12} y1={2} x2={12} y2={22} />
          {dot(12, 12)}
        </>
      );
      break;
    case 'cross':
      body = (
        <>
          <Line {...s} x1={2} y1={12} x2={22} y2={12} />
          <Line {...s} x1={12} y1={2} x2={12} y2={22} />
          {dot(12, 12)}
        </>
      );
      break;
    case 'channel':
      body = (
        <>
          <Polygon points="3,14 17,4 21,10 7,20" fill={color} fillOpacity={0.15} />
          <Line {...s} x1={3} y1={14} x2={17} y2={4} />
          <Line {...s} x1={7} y1={20} x2={21} y2={10} />
          {dot(3, 14)}
          {dot(17, 4)}
          {dot(21, 10)}
        </>
      );
      break;
    case 'pitchfork':
      body = (
        <>
          <Line {...s} x1={3} y1={13} x2={21} y2={11} />
          <Line {...s} x1={10} y1={5} x2={22} y2={4} />
          <Line {...s} x1={10} y1={20} x2={22} y2={19} />
          <Line {...s} x1={10} y1={5} x2={10} y2={20} strokeDasharray="2 2" />
          {dot(3, 13)}
          {dot(10, 5)}
          {dot(10, 20)}
        </>
      );
      break;
    case 'fibRetracement':
      body = (
        <>
          {[4, 8.5, 12, 15.5, 20].map((y, i) => (
            <Line key={y} {...s} x1={3} y1={y} x2={21} y2={y} opacity={i % 2 ? 0.6 : 1} />
          ))}
          <Line {...s} x1={5} y1={20} x2={19} y2={4} strokeDasharray="2 2" />
        </>
      );
      break;
    case 'fibExtension':
      body = (
        <>
          <Polyline {...s} points="3,20 8,10 12,15" strokeDasharray="2 2" />
          {[4, 8, 12].map((y) => (
            <Line key={y} {...s} x1={12} y1={y} x2={22} y2={y} />
          ))}
          {dot(3, 20)}
          {dot(8, 10)}
          {dot(12, 15)}
        </>
      );
      break;
    case 'fibTimeZone':
      body = (
        <>
          {[3, 5, 8, 13, 21].map((x) => (
            <Line key={x} {...s} x1={x} y1={3} x2={x} y2={21} />
          ))}
        </>
      );
      break;
    case 'gannFan':
      body = (
        <>
          {[
            [8, 2],
            [14, 4],
            [21, 8],
            [22, 14],
            [21, 19],
          ].map(([x, y]) => (
            <Line key={`${x}${y}`} {...s} x1={3} y1={21} x2={x} y2={y} />
          ))}
          {dot(3, 21)}
        </>
      );
      break;
    case 'xabcd':
      body = (
        <>
          <Polygon points="2,18 7,5 11,13" fill={color} fillOpacity={0.15} />
          <Polygon points="11,13 16,7 21,19" fill={color} fillOpacity={0.15} />
          <Polyline {...s} points="2,18 7,5 11,13 16,7 21,19" />
        </>
      );
      break;
    case 'abcd':
      body = (
        <>
          <Polyline {...s} points="3,19 9,6 14,13 21,3" />
          {dot(3, 19)}
          {dot(9, 6)}
          {dot(14, 13)}
          {dot(21, 3)}
        </>
      );
      break;
    case 'headShoulders':
      body = <Polyline {...s} points="1,18 5,10 8,15 12,4 16,15 19,10 23,18" />;
      break;
    case 'trianglePattern':
      body = (
        <>
          <Line {...s} x1={3} y1={4} x2={21} y2={11} strokeDasharray="2 2" />
          <Line {...s} x1={3} y1={20} x2={21} y2={13} strokeDasharray="2 2" />
          <Polyline {...s} points="3,4 7,18 12,7 16,15 20,12" />
        </>
      );
      break;
    case 'elliottImpulse':
      body = <Polyline {...s} points="2,21 6,12 9,16 15,4 18,9 22,3" />;
      break;
    case 'elliottCorrection':
      body = <Polyline {...s} points="3,4 10,15 14,9 21,20" />;
      break;
    case 'longPosition':
    case 'shortPosition': {
      const long = tool === 'longPosition';
      body = (
        <>
          <Rect x={4} y={3} width={16} height={9} fill={long ? colors.bull : colors.bear} opacity={0.75} rx={1.5} />
          <Rect x={4} y={12} width={16} height={9} fill={long ? colors.bear : colors.bull} opacity={0.75} rx={1.5} />
          <Line x1={4} y1={12} x2={20} y2={12} stroke={colors.text} strokeWidth={1.6} />
        </>
      );
      break;
    }
    case 'priceRange':
      body = (
        <>
          <Line {...s} x1={5} y1={3} x2={19} y2={3} />
          <Line {...s} x1={5} y1={21} x2={19} y2={21} />
          <Line {...s} x1={12} y1={5} x2={12} y2={19} />
          <Polyline {...s} points="9,8 12,5 15,8" />
          <Polyline {...s} points="9,16 12,19 15,16" />
        </>
      );
      break;
    case 'dateRange':
      body = (
        <>
          <Line {...s} x1={3} y1={5} x2={3} y2={19} />
          <Line {...s} x1={21} y1={5} x2={21} y2={19} />
          <Line {...s} x1={5} y1={12} x2={19} y2={12} />
          <Polyline {...s} points="8,9 5,12 8,15" />
          <Polyline {...s} points="16,9 19,12 16,15" />
        </>
      );
      break;
    case 'datePriceRange':
      body = (
        <>
          <Rect {...s} x={3} y={3} width={18} height={18} rx={1.5} fill={color} fillOpacity={0.12} />
          <Line {...s} x1={12} y1={6} x2={12} y2={18} />
          <Line {...s} x1={6} y1={12} x2={18} y2={12} />
        </>
      );
      break;
    case 'brush':
      body = <Path {...s} d="M3 17c3-6 5 2 8-3s4-9 7-7-2 8 3 9" />;
      break;
    case 'highlighter':
      body = <Path d="M3 16c4-5 7 1 11-4s5-5 7-4" stroke={colors.gold} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.7} />;
      break;
    case 'arrow':
      body = (
        <>
          <Line {...s} x1={4} y1={20} x2={19} y2={5} />
          <Polyline {...s} points="11,5 19,5 19,13" />
        </>
      );
      break;
    case 'arrowUp':
      body = <Path d="M12 3l7 8h-4v9H9v-9H5z" fill={colors.bull} />;
      break;
    case 'arrowDown':
      body = <Path d="M12 21l7-8h-4V4H9v9H5z" fill={colors.bear} />;
      break;
    case 'rectangle':
      body = <Rect {...s} x={3} y={6} width={18} height={12} rx={1.5} fill={color} fillOpacity={0.15} />;
      break;
    case 'circle':
      body = <Circle {...s} cx={12} cy={12} r={8.5} fill={color} fillOpacity={0.15} />;
      break;
    case 'ellipse':
      body = <Ellipse {...s} cx={12} cy={12} rx={10} ry={6} fill={color} fillOpacity={0.15} />;
      break;
    case 'triangle':
      body = <Polygon {...s} points="12,4 21,20 3,20" fill={color} fillOpacity={0.15} />;
      break;
    case 'path':
      body = (
        <>
          <Polyline {...s} points="3,18 9,8 14,15 20,6" />
          <Polyline {...s} points="16,6 20,6 20,10" />
        </>
      );
      break;
    case 'polyline':
      body = (
        <>
          <Polyline {...s} points="3,18 9,8 14,15 20,6" />
          {dot(3, 18)}
          {dot(9, 8)}
          {dot(14, 15)}
          {dot(20, 6)}
        </>
      );
      break;
    case 'text':
      body = (
        <>
          <Line {...s} strokeWidth={2.2} x1={5} y1={5} x2={19} y2={5} />
          <Line {...s} strokeWidth={2.2} x1={12} y1={5} x2={12} y2={20} />
        </>
      );
      break;
    case 'note':
      body = (
        <>
          <Path d="M12 22c-2-5-7-7.5-7-12.5a7 7 0 1 1 14 0c0 5-5 7.5-7 12.5z" fill={colors.sky} />
          <Circle cx={12} cy={9.5} r={2.6} fill={colors.bg} />
        </>
      );
      break;
    case 'callout':
      body = (
        <>
          <Rect {...s} x={3} y={3} width={18} height={12} rx={3} />
          <Polyline {...s} points="8,15 6,21 13,15" />
        </>
      );
      break;
    case 'priceLabel':
      body = (
        <>
          <Path {...s} d="M3 12l5-6h13v12H8z" />
          <Line {...s} x1={11} y1={12} x2={17} y2={12} />
        </>
      );
      break;
    case 'flag':
      body = (
        <>
          <Line {...s} x1={6} y1={3} x2={6} y2={21} />
          <Path d="M6 4h13l-3.5 4.5L19 13H6z" fill={colors.bear} />
        </>
      );
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
