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
  marubozuBull: [{ x: 20, top: 4, bodyTop: 4, bodyBottom: 44, bottom: 44, w: 14, color: G }],
  marubozuBear: [{ x: 20, top: 4, bodyTop: 4, bodyBottom: 44, bottom: 44, w: 14, color: R }],
  hammer: [{ x: 20, top: 4, bodyTop: 8, bodyBottom: 18, bottom: 44, w: 14, color: G }],
  hangingMan: [{ x: 20, top: 4, bodyTop: 8, bodyBottom: 18, bottom: 44, w: 14, color: R }],
  invertedHammer: [{ x: 20, top: 4, bodyTop: 30, bodyBottom: 40, bottom: 44, w: 14, color: G }],
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
  bullHarami: [
    { x: 12, top: 4, bodyTop: 8, bodyBottom: 40, bottom: 44, w: 12, color: R },
    { x: 28, top: 18, bodyTop: 21, bodyBottom: 29, bottom: 32, w: 10, color: G },
  ],
  bearHarami: [
    { x: 12, top: 4, bodyTop: 8, bodyBottom: 40, bottom: 44, w: 12, color: G },
    { x: 28, top: 16, bodyTop: 19, bodyBottom: 27, bottom: 30, w: 10, color: R },
  ],
  piercing: [
    { x: 12, top: 4, bodyTop: 8, bodyBottom: 30, bottom: 34, w: 12, color: R },
    { x: 28, top: 13, bodyTop: 16, bodyBottom: 40, bottom: 44, w: 12, color: G },
  ],
  darkCloud: [
    { x: 12, top: 14, bodyTop: 18, bodyBottom: 40, bottom: 44, w: 12, color: G },
    { x: 28, top: 4, bodyTop: 8, bodyBottom: 32, bottom: 35, w: 12, color: R },
  ],
  tweezerBottom: [
    { x: 12, top: 4, bodyTop: 8, bodyBottom: 30, bottom: 42, w: 12, color: R },
    { x: 28, top: 10, bodyTop: 12, bodyBottom: 30, bottom: 42, w: 12, color: G },
  ],
  tweezerTop: [
    { x: 12, top: 6, bodyTop: 18, bodyBottom: 40, bottom: 44, w: 12, color: G },
    { x: 28, top: 6, bodyTop: 18, bodyBottom: 36, bottom: 40, w: 12, color: R },
  ],
  insideBar: [
    { x: 12, top: 4, bodyTop: 10, bodyBottom: 38, bottom: 44, w: 12, color: G },
    { x: 28, top: 16, bodyTop: 20, bodyBottom: 30, bottom: 34, w: 10, color: R },
  ],
  morningStar: [
    { x: 8, top: 4, bodyTop: 6, bodyBottom: 28, bottom: 31, w: 8, color: R },
    { x: 20, top: 30, bodyTop: 34, bodyBottom: 37, bottom: 42, w: 8, color: N },
    { x: 32, top: 10, bodyTop: 12, bodyBottom: 34, bottom: 37, w: 8, color: G },
  ],
  eveningStar: [
    { x: 8, top: 17, bodyTop: 20, bodyBottom: 42, bottom: 44, w: 8, color: G },
    { x: 20, top: 5, bodyTop: 10, bodyBottom: 13, bottom: 18, w: 8, color: N },
    { x: 32, top: 12, bodyTop: 14, bodyBottom: 36, bottom: 39, w: 8, color: R },
  ],
  threeSoldiers: [
    { x: 8, top: 26, bodyTop: 28, bodyBottom: 42, bottom: 44, w: 8, color: G },
    { x: 20, top: 16, bodyTop: 18, bodyBottom: 34, bottom: 36, w: 8, color: G },
    { x: 32, top: 4, bodyTop: 6, bodyBottom: 24, bottom: 27, w: 8, color: G },
  ],
  threeCrows: [
    { x: 8, top: 4, bodyTop: 6, bodyBottom: 20, bottom: 22, w: 8, color: R },
    { x: 20, top: 12, bodyTop: 14, bodyBottom: 30, bottom: 32, w: 8, color: R },
    { x: 32, top: 21, bodyTop: 24, bodyBottom: 42, bottom: 44, w: 8, color: R },
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
