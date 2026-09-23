/**
 * Pure helpers for the simulator's full-size chart: price and time axis ticks,
 * the zoom/pan window, candle countdowns and MetaTrader-style price digits.
 */

/** Visible candle counts the zoom buttons step through. */
export const ZOOMS = [20, 30, 45, 60, 90, 120, 150] as const;

/** Empty candle slots kept to the right of the latest candle (MetaTrader's "chart shift"). */
export const CHART_SHIFT = 4;

/** A round step giving roughly `count` ticks across `span`: 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || !(count > 0)) return 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

/** Round prices between `lo` and `hi` for grid lines and axis labels. */
export function priceTicks(lo: number, hi: number, count: number): number[] {
  const step = niceStep(hi - lo, count);
  const out: number[] = [];
  // Rounding each tick to the step's precision avoids 1.0850000000000002.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toFixed(decimals)));
  return out;
}

export type ChartWindow = {
  /** Slot position of the left and right edges; candle i sits in slot i. */
  left: number;
  right: number;
  /** First and last candle index that is at least partly visible. */
  from: number;
  to: number;
  /** Largest pan offset: the oldest candle at the left edge. */
  maxOffset: number;
};

/**
 * The part of a series in view. `offset` counts slots panned back from the latest
 * candle (fractions allowed while dragging); 0 shows the latest candle with
 * `shift` empty slots after it.
 */
export function chartWindow(total: number, count: number, offset: number, shift = CHART_SHIFT): ChartWindow {
  const maxOffset = Math.max(0, total + shift - count);
  const o = Math.min(maxOffset, Math.max(0, offset));
  const right = total + shift - o;
  const left = right - count;
  return {
    left,
    right,
    from: Math.max(0, Math.floor(left)),
    to: Math.min(total - 1, Math.ceil(right) - 1),
    maxOffset,
  };
}

/** Next zoom level in (`dir` 1: fewer, bigger candles) or out (−1). */
export function nextZoom(count: number, dir: 1 | -1): number {
  const i = ZOOMS.findIndex((z) => z >= count);
  const at = i === -1 ? ZOOMS.length - 1 : i;
  const next = Math.min(ZOOMS.length - 1, Math.max(0, at - dir));
  return ZOOMS[next];
}

/** The zoom level whose candles are closest to `px` pixels apart. */
export function zoomFor(plotWidth: number, px = 7): number {
  const want = plotWidth / px;
  return ZOOMS.reduce((best, z) => (Math.abs(z - want) < Math.abs(best - want) ? z : best), ZOOMS[0]);
}

const TIME_STEPS = [10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400].map((s) => s * 1000);

/**
 * Candles that get a time label: the first candle of each round period (a minute,
 * five minutes, …) chosen so about `maxLabels` fit. Labels stay put while the chart
 * scrolls because they follow the clock, not the candle index.
 */
export function timeTicks(times: number[], from: number, to: number, maxLabels: number): { index: number; seconds: boolean }[] {
  if (to <= from || !times.length) return [];
  const span = times[to] - times[from];
  const step = TIME_STEPS.find((s) => span / s <= maxLabels) ?? TIME_STEPS[TIME_STEPS.length - 1];
  const out: { index: number; seconds: boolean }[] = [];
  for (let i = Math.max(from, 1); i <= to; i++) {
    if (Math.floor(times[i] / step) > Math.floor(times[i - 1] / step)) out.push({ index: i, seconds: step < 60_000 });
  }
  return out;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local clock time in Latin digits: 14:05 or 14:05:30. */
export function clockLabel(ms: number, seconds = false): string {
  const d = new Date(ms);
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return seconds ? `${hm}:${pad2(d.getSeconds())}` : hm;
}

/** Seconds as a mm:ss countdown. */
export function countdownLabel(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/**
 * MetaTrader's quote digits: the last two digits (the pips) big, and with five-digit
 * quotes the final fractional pip small after them. 1.08512 → 1.08 · 51 · 2.
 */
export function quoteParts(text: string, decimals: number): { head: string; big: string; tail: string } {
  let end = text.length;
  let tail = '';
  if (decimals >= 3) {
    tail = text.slice(-1);
    end -= 1;
  }
  let start = end;
  let digits = 0;
  while (start > 0 && digits < 2) {
    start -= 1;
    if (/[0-9]/.test(text[start])) digits += 1;
  }
  return { head: text.slice(0, start), big: text.slice(start, end), tail };
}

/**
 * Tops for labels of height `h` (one for all, or one each) wanted at `tops`, pushed
 * apart so none overlap and kept inside [min, max]. Returns them in the input order.
 */
export function spreadLabels(tops: number[], h: number | number[], min: number, max: number, gap = 2): number[] {
  const height = (i: number) => (typeof h === 'number' ? h : h[i]);
  const order = tops.map((top, i) => ({ top, i })).sort((a, b) => a.top - b.top);
  const out: number[] = [];
  let next = min;
  for (const { top, i } of order) {
    out[i] = Math.max(next, top);
    next = out[i] + height(i) + gap;
  }
  // Anything pushed past the bottom slides back up, keeping the spacing.
  let limit = max;
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k].i;
    out[i] = Math.min(out[i], limit - height(i));
    limit = out[i] - gap;
  }
  return out;
}
