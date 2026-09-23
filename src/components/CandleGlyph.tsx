import Svg, { Line, Rect } from 'react-native-svg';

import { colors } from '@/theme';
import type { GlyphKind } from '@/content/types';

type Stick = { x: number; top: number; bodyTop: number; bodyBottom: number; bottom: number; w: number; color: string };

const G = colors.bull;
const R = colors.bear;
const N = colors.text2;

// Each glyph is drawn on a 40×48 box.
const GLYPHS: Record<GlyphKind, Stick[]> = {
  bullish: [{ x: 20, top: 4, bodyTop: 12, bodyBottom: 38, bottom: 44, w: 14, color: G }],
  bearish: [{ x: 20, top: 4, bodyTop: 10, bodyBottom: 36, bottom: 44, w: 14, color: R }],
  hammer: [{ x: 20, top: 4, bodyTop: 8, bodyBottom: 18, bottom: 44, w: 14, color: G }],
  shootingStar: [{ x: 20, top: 4, bodyTop: 30, bodyBottom: 40, bottom: 44, w: 14, color: R }],
  doji: [{ x: 20, top: 4, bodyTop: 23, bodyBottom: 26, bottom: 44, w: 16, color: N }],
  bullEngulf: [
    { x: 12, top: 12, bodyTop: 17, bodyBottom: 33, bottom: 38, w: 10, color: R },
    { x: 27, top: 4, bodyTop: 8, bodyBottom: 40, bottom: 44, w: 14, color: G },
  ],
  bearEngulf: [
    { x: 12, top: 12, bodyTop: 17, bodyBottom: 33, bottom: 38, w: 10, color: G },
    { x: 27, top: 4, bodyTop: 8, bodyBottom: 40, bottom: 44, w: 14, color: R },
  ],
};

export function CandleGlyph({ kind, size = 48 }: { kind: GlyphKind; size?: number }) {
  return (
    <Svg width={(size * 40) / 48} height={size} viewBox="0 0 40 48">
      {GLYPHS[kind].map((s, i) => (
        <GlyphStick key={i} {...s} />
      ))}
    </Svg>
  );
}

function GlyphStick({ x, top, bodyTop, bodyBottom, bottom, w, color }: Stick) {
  return (
    <>
      <Line x1={x} x2={x} y1={top} y2={bottom} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x={x - w / 2} y={bodyTop} width={w} height={bodyBottom - bodyTop} rx={2} fill={color} />
    </>
  );
}
