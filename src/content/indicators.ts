import type { Candle } from './types';

/** Simple moving average of closes; `null` until there are enough candles. */
export function sma(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += candles[k][3];
    return sum / period;
  });
}

/** Bollinger bands: middle SMA ± 2 standard deviations. */
export function bollinger(candles: Candle[], period: number, mult = 2): { mid: number; upper: number; lower: number }[] {
  const mids = sma(candles, period);
  return mids.flatMap((mid, i) => {
    if (mid == null) return [];
    let v = 0;
    for (let k = i - period + 1; k <= i; k++) v += (candles[k][3] - mid) ** 2;
    const sd = Math.sqrt(v / period);
    return [{ mid, upper: mid + mult * sd, lower: mid - mult * sd }];
  });
}

/** Wilder's RSI of closes (0–100); `null` for the first `period` candles. */
export function rsi(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = candles.map(() => null);
  if (candles.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i][3] - candles[i - 1][3];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  const value = () => (loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
  out[period] = value();
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i][3] - candles[i - 1][3];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = value();
  }
  return out;
}
