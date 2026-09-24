import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'target'
  | 'candles'
  | 'trophy'
  | 'user'
  | 'close'
  | 'check'
  | 'lock'
  | 'gift'
  | 'book'
  | 'chevronBack'
  | 'chevronDown'
  | 'arrowUpRight'
  | 'arrowDownRight'
  | 'arrowUp'
  | 'shield'
  | 'refresh'
  | 'sliders'
  | 'layers'
  | 'info'
  | 'clock'
  | 'bell'
  | 'bulb'
  | 'pencil'
  | 'swap'
  | 'plus'
  | 'minus'
  | 'list'
  | 'grid'
  | 'search'
  | 'play'
  | 'crown'
  | 'volume'
  | 'mute'
  | 'phone'
  | 'mail'
  | 'logout'
  | 'expand'
  | 'crosshair'
  | 'skipEnd'
  | 'chat'
  | 'send'
  | 'users'
  | 'flag'
  | 'trash'
  | 'pin'
  | 'snow'
  | 'bag'
  | 'share'
  | 'swords';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

/** Stroke icons drawn on a 24×24 grid. */
export function Icon({ name, size = 24, color = colors.text, strokeWidth = 2.2 }: Props) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderIcon(name, common, color)}
    </Svg>
  );
}

function renderIcon(name: IconName, p: Record<string, unknown>, color: string) {
  switch (name) {
    case 'home':
      return <Path {...p} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />;
    case 'target':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Circle {...p} cx={12} cy={12} r={5} />
          <Circle cx={12} cy={12} r={1.4} fill={color} />
        </>
      );
    case 'candles':
      return (
        <>
          <Path {...p} d="M8 3v4M8 17v4M16 5v3M16 16v3" />
          <Rect {...p} x={5.5} y={7} width={5} height={10} rx={1.2} />
          <Rect {...p} x={13.5} y={8} width={5} height={8} rx={1.2} />
        </>
      );
    case 'trophy':
      return (
        <>
          <Path {...p} d="M7 4h10v5a5 5 0 0 1-10 0z" />
          <Path {...p} d="M17 5h3v1.5A3.5 3.5 0 0 1 16.6 10M7 5H4v1.5A3.5 3.5 0 0 0 7.4 10" />
          <Path {...p} d="M12 14v3M8 21h8M9 17h6v4H9z" />
        </>
      );
    case 'user':
      return (
        <>
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4 21a8 8 0 0 1 16 0" />
        </>
      );
    case 'close':
      return <Path {...p} d="M18 6 6 18M6 6l12 12" />;
    case 'check':
      return <Path {...p} d="M20 6 9 17l-5-5" />;
    case 'lock':
      return (
        <>
          <Rect {...p} x={5} y={11} width={14} height={10} rx={2.5} />
          <Path {...p} d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      );
    case 'gift':
      return (
        <>
          <Rect {...p} x={3} y={9} width={18} height={12} rx={2} />
          <Path {...p} d="M3 13h18M12 9v12" />
          <Path {...p} d="M12 9c-1.5-3-5-4-5.5-2S9 9 12 9zm0 0c1.5-3 5-4 5.5-2S15 9 12 9z" />
        </>
      );
    case 'book':
      return (
        <>
          <Path {...p} d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5z" />
          <Path {...p} d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
        </>
      );
    case 'chevronBack':
      // Points right: "back" in a right-to-left layout.
      return <Path {...p} d="M9 6l6 6-6 6" />;
    case 'chevronDown':
      return <Path {...p} d="M6 9l6 6 6-6" />;
    case 'arrowUpRight':
      return <Path {...p} d="M7 17 17 7M8 7h9v9" />;
    case 'arrowDownRight':
      return <Path {...p} d="M7 7l10 10M17 8v9H8" />;
    case 'arrowUp':
      return <Path {...p} d="M12 19V5M5 12l7-7 7 7" />;
    case 'shield':
      return <Path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
    case 'refresh':
      return <Path {...p} d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />;
    case 'sliders':
      return (
        <>
          <Path {...p} d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
          <Circle {...p} cx={15} cy={6} r={2} />
          <Circle {...p} cx={9} cy={12} r={2} />
          <Circle {...p} cx={17} cy={18} r={2} />
        </>
      );
    case 'layers':
      return <Path {...p} d="M12 3 2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5" />;
    case 'info':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 11v6M12 7.5v.5" />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 7v5l3 2" />
        </>
      );
    case 'bell':
      return (
        <>
          <Path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path {...p} d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
      );
    case 'bulb':
      return <Path {...p} d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />;
    case 'pencil':
      return <Path {...p} d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />;
    case 'swap':
      return <Path {...p} d="M7 20V8M3 12l4-4 4 4M17 4v12M13 12l4 4 4-4" />;
    case 'plus':
      return <Path {...p} d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path {...p} d="M5 12h14" />;
    case 'list':
      return <Path {...p} d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />;
    case 'grid':
      return (
        <>
          <Rect {...p} x={3} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={14} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={3} y={14} width={7} height={7} rx={1.5} />
          <Rect {...p} x={14} y={14} width={7} height={7} rx={1.5} />
        </>
      );
    case 'search':
      return (
        <>
          <Circle {...p} cx={11} cy={11} r={7} />
          <Path {...p} d="M20 20l-3.5-3.5" />
        </>
      );
    case 'play':
      return <Path {...p} d="M7 4.5v15l12-7.5z" />;
    case 'crown':
      return <Path {...p} d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />;
    case 'volume':
      return <Path {...p} d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />;
    case 'phone':
      return (
        <>
          <Rect {...p} x={6.5} y={2.5} width={11} height={19} rx={2.5} />
          <Path {...p} d="M10.5 18.5h3" />
        </>
      );
    case 'mail':
      return (
        <>
          <Rect {...p} x={3} y={5} width={18} height={14} rx={2.5} />
          <Path {...p} d="M3.5 6.5 12 13l8.5-6.5" />
        </>
      );
    case 'logout':
      return <Path {...p} d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />;
    case 'mute':
      return <Path {...p} d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" />;
    case 'expand':
      return <Path {...p} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />;
    case 'crosshair':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={6} />
          <Path {...p} d="M12 2v5M12 17v5M2 12h5M17 12h5" />
        </>
      );
    case 'skipEnd':
      return <Path {...p} d="M6 6l6 6-6 6M13 6l6 6-6 6" />;
    case 'chat':
      return <Path {...p} d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 9h8M8 12.5h5" />;
    case 'send':
      return <Path {...p} d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />;
    case 'users':
      return (
        <>
          <Circle {...p} cx={9} cy={8} r={3.5} />
          <Path {...p} d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
        </>
      );
    case 'flag':
      return <Path {...p} d="M5 21V4M5 4h11l-2 4 2 4H5" />;
    case 'pin':
      return <Path {...p} d="M9 3h6M10 3v6l-3 4h10l-3-4V3M12 13v8" />;
    case 'trash':
      return <Path {...p} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />;
    case 'snow':
      return <Path {...p} d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3 10.5l3.8-.7-1.3-3.6M21 13.5l-3.8.7 1.3 3.6M3 13.5l3.8.7-1.3 3.6M21 10.5l-3.8-.7 1.3-3.6" />;
    case 'bag':
      return (
        <>
          <Path {...p} d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" />
          <Path {...p} d="M9 11V6a3 3 0 0 1 6 0v5" />
        </>
      );
    case 'swords':
      return (
        <>
          <Path {...p} d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
          <Path {...p} d="M9.5 6.5 14 2h3v3l-4.5 4.5M5 14l4 4M7 17l-3 3M3 19l2 2" />
        </>
      );
    case 'share':
      return (
        <>
          <Path {...p} d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
          <Path {...p} d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </>
      );
  }
}

/* Filled glyphs for the game currencies. */

export function FlameIcon({ size = 22, color = colors.flame, inner = '#FFD27A' }: { size?: number; color?: string; inner?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2c.6 3.2 2.6 4.9 4.3 6.8C18 10.7 19 12.6 19 15a7 7 0 0 1-14 0c0-2.2 1-4 2.4-5.4.2 1.7 1 3 2.6 3.4-.6-3.6.6-7.3 2-11z"
        fill={color}
      />
      <Path
        d="M12 21.2a3 3 0 0 1-3-3c0-1.6 1.2-2.6 2.1-3.6.3 1 .9 1.6 1.9 1.8.4-.8.5-1.7.4-2.6 1 1 1.6 2.3 1.6 3.9a3 3 0 0 1-3 3.5z"
        fill={inner}
      />
    </Svg>
  );
}

export function CoinIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill={colors.gold} />
      <Circle cx={12} cy={12} r={7} fill="none" stroke={colors.goldEdge} strokeWidth={2} />
      <Path d="M12 7.5v9" stroke="#8A5E00" strokeWidth={2} strokeLinecap="round" />
      <Rect x={10} y={9.5} width={4} height={5} rx={1} fill="#8A5E00" />
    </Svg>
  );
}

export function HeartIcon({ size = 22, color = colors.bear }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.1c2.1-.2 3.9.9 5.4 2.9 1.5-2 3.3-3.1 5.4-2.9 3.7.4 5.7 4.3 4.2 7.7C19.5 16.4 12 21 12 21z"
        fill={color}
      />
      <Path d="M6.5 7.5c-1.3.3-2 1.4-1.9 2.6" stroke="#FFC2CB" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function BoltIcon({ size = 20, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill={color} />
    </Svg>
  );
}

export function StarIcon({ size = 28, color = '#6B4B00' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill={color} />
    </Svg>
  );
}

export function SparkIcon({ size = 16, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill={color} />
    </Svg>
  );
}
