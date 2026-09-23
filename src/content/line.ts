import { priceDecimals } from '@/utils/format';

import { bollinger } from './indicators';
import type { ChartSpec, LineStep } from './types';

/** Lowest and highest price a chart draws on its own: candles, levels, zones, trendlines and bands. */
export function chartPriceRange(chart: ChartSpec): [number, number] {
  const prices = [
    ...chart.candles.flatMap(([, h, l]) => [h, l]),
    ...(chart.lines ?? []).map((l) => l.price),
    ...(chart.zones ?? []).flatMap((z) => [z.from, z.to]),
    ...(chart.segments ?? []).flatMap((s) => [s.from[1], s.to[1]]),
    ...(chart.bands ? bollinger(chart.candles, chart.bands).flatMap((b) => [b.upper, b.lower]) : []),
  ].filter(Number.isFinite);
  return [Math.min(...prices), Math.max(...prices)];
}

/** Decimals a line question snaps to and shows, from the chart's last close (1.0825, 150.25, 2386.4, 61250). */
export function lineDecimals(step: Pick<LineStep, 'chart' | 'start'>): number {
  const last = step.chart.candles[step.chart.candles.length - 1];
  return priceDecimals(last ? last[3] : step.start);
}

export const roundPrice = (price: number, decimals: number) => Number(price.toFixed(decimals));

/** Decimals for showing the answer band: a whole-number band on a big price drops the ".0" (2,830 rather than 2,830.0). */
export function bandDecimals(step: Pick<LineStep, 'chart' | 'start' | 'answer'>): number {
  const d = lineDecimals(step);
  return d <= 1 && step.answer.every(Number.isInteger) ? 0 : d;
}

/**
 * Price range a line question shows: the chart plus the line's start and the answer band.
 * The chart is padded by the same amount above and below, so empty space never hints at the answer.
 */
export function lineExtent(step: Pick<LineStep, 'chart' | 'start' | 'answer'>): [number, number] {
  const [lo, hi] = chartPriceRange(step.chart);
  const span = hi - lo || Math.abs(hi) * 0.01 || 1;
  const reach = Math.max(0, lo - Math.min(step.start, step.answer[0]), Math.max(step.start, step.answer[1]) - hi);
  const pad = reach + span * 0.08;
  return [lo - pad, hi + pad];
}

/** Whether a line at `price` is inside the accepted band (inclusive). */
export function isLineCorrect(step: Pick<LineStep, 'chart' | 'start' | 'answer'>, price: number): boolean {
  const eps = 10 ** -(lineDecimals(step) + 2);
  return price >= step.answer[0] - eps && price <= step.answer[1] + eps;
}

/** How far one ▲/▼ press moves the line: a round step of 1–2% of the visible range, never below one tick. */
export function lineNudge(step: Pick<LineStep, 'chart' | 'start' | 'answer'>): number {
  const [lo, hi] = lineExtent(step);
  const raw = (hi - lo) / 50;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const nice = [5, 2, 1].map((m) => m * pow).find((v) => v <= raw) ?? pow;
  return Math.max(roundPrice(nice, 10), 10 ** -lineDecimals(step));
}
