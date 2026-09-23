import { colors } from '@/theme';

import type { Candle, ChartLevel, GlyphKind, Tone } from './types';

/** Flips a series upside down around `mid`, turning an uptrend into a downtrend. */
export function mirror(candles: Candle[], mid: number): Candle[] {
  const f = (v: number) => Number((2 * mid - v).toFixed(5));
  return candles.map(([o, h, l, c]) => [f(o), f(l), f(h), f(c)]);
}

const WICKS = [0.35, 0.2, 0.5, 0.25, 0.4, 0.15, 0.3];

function decimals(v: number): number {
  const s = String(v);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

/**
 * Builds a candle series from closing prices. A number becomes a candle that opens at the
 * previous close, with small wicks; a full [open, high, low, close] tuple is used as is.
 *
 *   series([1.08, 1.082, 1.081, [1.081, 1.0815, 1.078, 1.0812], 1.084], { start: 1.079 })
 */
export function series(points: (number | Candle)[], opts: { start?: number; wick?: number } = {}): Candle[] {
  const nums = points.map((p) => (typeof p === 'number' ? p : p[3]));
  const digits = Math.min(5, Math.max(...nums.map(decimals), ...points.flatMap((p) => (typeof p === 'number' ? [] : p.map(decimals)))) + 1);
  const moves = nums.slice(1).map((v, i) => Math.abs(v - nums[i]));
  const avg = moves.length ? moves.reduce((a, b) => a + b, 0) / moves.length : Math.abs(nums[0]) * 0.001;
  const round = (v: number) => Number(v.toFixed(digits));
  let prev = opts.start ?? nums[0] - avg * 0.6;
  return points.map((p, i) => {
    if (typeof p !== 'number') {
      prev = p[3];
      return p;
    }
    const o = prev;
    const c = p;
    const w = (opts.wick ?? 1) * avg;
    const up = WICKS[i % WICKS.length] * w;
    const down = WICKS[(i + 3) % WICKS.length] * w;
    prev = c;
    return [round(o), round(Math.max(o, c) + up), round(Math.min(o, c) - down), round(c)];
  });
}

/** Returns a copy of `base` with some candles replaced, e.g. to drop a pattern at the end. */
export function withCandles(base: Candle[], overrides: Record<number, Candle>): Candle[] {
  return base.map((c, i) => overrides[i] ?? c);
}

const TONE: Record<Tone, { color: string; ink: string }> = {
  bull: { color: colors.bull, ink: colors.bullInk },
  bear: { color: colors.bear, ink: colors.bearInk },
  gold: { color: colors.gold, ink: colors.goldInk },
  sky: { color: colors.sky, ink: colors.skyInk },
  neutral: { color: colors.text3, ink: colors.bg },
};

export const toneColor = (tone: Tone = 'gold') => TONE[tone];

export const level = {
  resistance: (price: number, value?: string): ChartLevel => ({
    price,
    label: 'مقاومت',
    value,
    color: colors.gold,
    ink: colors.goldInk,
  }),
  support: (price: number, value?: string): ChartLevel => ({
    price,
    label: 'حمایت',
    value,
    color: colors.sky,
    ink: colors.skyInk,
  }),
  unknown: (price: number): ChartLevel => ({ price, label: '؟', color: colors.gold, ink: colors.goldInk }),
  /** Any labelled horizontal line: entry, stop, target, a Fibonacci level… */
  line: (price: number, label: string, tone: Tone = 'gold', value?: string): ChartLevel => ({
    price,
    label,
    value,
    ...TONE[tone],
  }),
  entry: (price: number, value?: string): ChartLevel => ({ price, label: 'ورود', value, ...TONE.sky }),
  stop: (price: number, value?: string): ChartLevel => ({ price, label: 'حد ضرر', value, ...TONE.bear }),
  target: (price: number, value?: string): ChartLevel => ({ price, label: 'حد سود', value, ...TONE.bull }),
};

export const HAMMER_AFTER_DOWNTREND: Candle[] = [
  [1.096, 1.0968, 1.094, 1.0945],
  [1.0945, 1.095, 1.0922, 1.0928],
  [1.0928, 1.0938, 1.0915, 1.0933],
  [1.0933, 1.0935, 1.0905, 1.0909],
  [1.0909, 1.0914, 1.089, 1.0894],
  [1.0894, 1.0904, 1.0882, 1.0899],
  [1.0899, 1.0901, 1.0872, 1.0876],
  [1.0876, 1.088, 1.0858, 1.0861],
  [1.0861, 1.0866, 1.0846, 1.085],
  [1.085, 1.0854, 1.0832, 1.0836],
  [1.0836, 1.0842, 1.08, 1.084],
];

export const SHOOTING_STAR_AFTER_UPTREND: Candle[] = [
  [1.08, 1.0815, 1.0795, 1.0812],
  [1.0812, 1.083, 1.0808, 1.0826],
  [1.0826, 1.0829, 1.0814, 1.0818],
  [1.0818, 1.0842, 1.0816, 1.0838],
  [1.0838, 1.0856, 1.0834, 1.0851],
  [1.0851, 1.0855, 1.084, 1.0845],
  [1.0845, 1.0868, 1.0843, 1.0864],
  [1.0864, 1.088, 1.086, 1.0876],
  [1.0876, 1.0879, 1.0866, 1.087],
  [1.087, 1.089, 1.0868, 1.0886],
  [1.0887, 1.092, 1.0882, 1.0884],
];

export const BEAR_ENGULF_AFTER_UPTREND: Candle[] = [
  [1.08, 1.0814, 1.0796, 1.0811],
  [1.0811, 1.0826, 1.0806, 1.0822],
  [1.0822, 1.0825, 1.0812, 1.0815],
  [1.0815, 1.0836, 1.0813, 1.0832],
  [1.0832, 1.085, 1.0828, 1.0846],
  [1.0846, 1.0849, 1.0836, 1.084],
  [1.084, 1.0862, 1.0838, 1.0858],
  [1.0858, 1.0872, 1.0854, 1.0868],
  [1.0868, 1.0878, 1.0866, 1.0874],
  [1.0876, 1.088, 1.0848, 1.0852],
];

export const BULL_ENGULF_AFTER_DOWNTREND: Candle[] = [
  [1.09, 1.0904, 1.0884, 1.0888],
  [1.0888, 1.0892, 1.0872, 1.0876],
  [1.0876, 1.0885, 1.0873, 1.0882],
  [1.0882, 1.0884, 1.0862, 1.0866],
  [1.0866, 1.087, 1.085, 1.0854],
  [1.0854, 1.0862, 1.0851, 1.0859],
  [1.0859, 1.0861, 1.084, 1.0844],
  [1.0844, 1.0848, 1.083, 1.0834],
  [1.0834, 1.0836, 1.0826, 1.0829],
  [1.0827, 1.0856, 1.0824, 1.0852],
];

export const UPTREND: Candle[] = [
  [1.08, 1.0818, 1.0797, 1.0815],
  [1.0815, 1.0832, 1.0812, 1.0828],
  [1.0828, 1.083, 1.0812, 1.0816],
  [1.0816, 1.082, 1.0808, 1.0812],
  [1.0812, 1.0838, 1.081, 1.0835],
  [1.0835, 1.0852, 1.0832, 1.0848],
  [1.0848, 1.085, 1.083, 1.0834],
  [1.0834, 1.0856, 1.0831, 1.0853],
  [1.0853, 1.087, 1.085, 1.0866],
  [1.0866, 1.0868, 1.085, 1.0855],
  [1.0855, 1.0878, 1.0852, 1.0874],
  [1.0874, 1.0892, 1.0871, 1.0888],
];

export const DOWNTREND: Candle[] = mirror(UPTREND, 1.0845);

export const RANGE: Candle[] = [
  [1.082, 1.0838, 1.0816, 1.0834],
  [1.0834, 1.0849, 1.083, 1.0842],
  [1.0842, 1.0846, 1.0822, 1.0826],
  [1.0826, 1.0829, 1.0802, 1.0808],
  [1.0808, 1.0826, 1.0804, 1.0822],
  [1.0822, 1.0848, 1.0819, 1.0845],
  [1.0845, 1.0849, 1.0828, 1.0831],
  [1.0831, 1.0834, 1.0803, 1.0807],
  [1.0807, 1.083, 1.0801, 1.0826],
  [1.0826, 1.0847, 1.0822, 1.084],
];

export const SUPPORT_BOUNCES: Candle[] = [
  [1.087, 1.0874, 1.0852, 1.0856],
  [1.0856, 1.086, 1.0836, 1.084],
  [1.084, 1.0844, 1.0818, 1.0822],
  [1.0822, 1.0826, 1.0801, 1.0812],
  [1.0812, 1.0838, 1.081, 1.0834],
  [1.0834, 1.0852, 1.083, 1.0846],
  [1.0846, 1.0849, 1.0826, 1.083],
  [1.083, 1.0833, 1.0812, 1.0815],
  [1.0815, 1.0818, 1.08, 1.0809],
  [1.0809, 1.0834, 1.0806, 1.083],
  [1.083, 1.0848, 1.0827, 1.0844],
];

export const RESISTANCE_REJECTION: Candle[] = [
  [1.085, 1.0862, 1.0845, 1.086],
  [1.086, 1.0878, 1.0856, 1.0874],
  [1.0874, 1.0895, 1.087, 1.089],
  [1.089, 1.0921, 1.0886, 1.0912],
  [1.0912, 1.0916, 1.0892, 1.0896],
  [1.0896, 1.09, 1.0878, 1.0882],
  [1.0882, 1.0897, 1.0879, 1.0894],
  [1.0894, 1.091, 1.089, 1.0906],
  [1.0906, 1.0918, 1.0902, 1.0913],
  [1.0913, 1.0938, 1.0906, 1.0909],
];

export const BREAKOUT: Candle[] = [
  [1.081, 1.0832, 1.0805, 1.0828],
  [1.0828, 1.0848, 1.0824, 1.0842],
  [1.0842, 1.0846, 1.0818, 1.0822],
  [1.0822, 1.0826, 1.0802, 1.0808],
  [1.0808, 1.083, 1.0804, 1.0826],
  [1.0826, 1.0849, 1.0822, 1.0844],
  [1.0844, 1.0847, 1.0826, 1.083],
  [1.083, 1.0842, 1.0826, 1.0838],
  [1.0838, 1.088, 1.0836, 1.0876],
];

export const LAST_BEARISH: Candle[] = [
  [1.082, 1.0832, 1.0816, 1.0829],
  [1.0829, 1.084, 1.0825, 1.0836],
  [1.0836, 1.0838, 1.0824, 1.0828],
  [1.0828, 1.0846, 1.0826, 1.0843],
  [1.0843, 1.085, 1.0838, 1.0846],
  [1.0846, 1.0848, 1.0818, 1.0822],
];

/** Answer options for "which pattern is this?" chart questions, one per glyph. */
export const PATTERN_OPTIONS: Record<GlyphKind, { label: string; latin: string; glyph: GlyphKind }> = {
  bullish: { label: 'کندل صعودی', latin: 'Bullish', glyph: 'bullish' },
  bearish: { label: 'کندل نزولی', latin: 'Bearish', glyph: 'bearish' },
  marubozuBull: { label: 'ماروبوزوی صعودی', latin: 'Bullish Marubozu', glyph: 'marubozuBull' },
  marubozuBear: { label: 'ماروبوزوی نزولی', latin: 'Bearish Marubozu', glyph: 'marubozuBear' },
  hammer: { label: 'چکش', latin: 'Hammer', glyph: 'hammer' },
  hangingMan: { label: 'مرد آویزان', latin: 'Hanging Man', glyph: 'hangingMan' },
  invertedHammer: { label: 'چکش معکوس', latin: 'Inverted Hammer', glyph: 'invertedHammer' },
  shootingStar: { label: 'ستاره‌ی دنباله‌دار', latin: 'Shooting Star', glyph: 'shootingStar' },
  doji: { label: 'دوجی', latin: 'Doji', glyph: 'doji' },
  bullEngulf: { label: 'پوشای صعودی', latin: 'Bullish Engulfing', glyph: 'bullEngulf' },
  bearEngulf: { label: 'پوشای نزولی', latin: 'Bearish Engulfing', glyph: 'bearEngulf' },
  bullHarami: { label: 'هارامی صعودی', latin: 'Bullish Harami', glyph: 'bullHarami' },
  bearHarami: { label: 'هارامی نزولی', latin: 'Bearish Harami', glyph: 'bearHarami' },
  piercing: { label: 'الگوی نفوذی', latin: 'Piercing Line', glyph: 'piercing' },
  darkCloud: { label: 'ابر سیاه', latin: 'Dark Cloud Cover', glyph: 'darkCloud' },
  tweezerBottom: { label: 'کف انبری', latin: 'Tweezer Bottom', glyph: 'tweezerBottom' },
  tweezerTop: { label: 'سقف انبری', latin: 'Tweezer Top', glyph: 'tweezerTop' },
  insideBar: { label: 'اینساید بار', latin: 'Inside Bar', glyph: 'insideBar' },
  morningStar: { label: 'ستاره‌ی صبحگاهی', latin: 'Morning Star', glyph: 'morningStar' },
  eveningStar: { label: 'ستاره‌ی عصرگاهی', latin: 'Evening Star', glyph: 'eveningStar' },
  threeSoldiers: { label: 'سه سرباز سفید', latin: 'Three White Soldiers', glyph: 'threeSoldiers' },
  threeCrows: { label: 'سه کلاغ سیاه', latin: 'Three Black Crows', glyph: 'threeCrows' },
};
