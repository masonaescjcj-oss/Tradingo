import type { Candle, Market } from '@/content/types';

export type SymbolSpec = {
  id: string;
  label: string;
  market: 'forex' | 'crypto';
  base: number;
  decimals: number;
  /** Typical move per tick. */
  vol: number;
  spread: number;
  /** Units per 1.0 of size (100,000 for a forex lot). */
  contract: number;
  sizes: number[];
  sizeUnit: string;
  /** Step used by the stop-loss / take-profit distance controls. */
  step: number;
  defaultStop: number;
};

export const SYMBOLS: SymbolSpec[] = [
  { id: 'EURUSD', label: 'EUR/USD', market: 'forex', base: 1.14, decimals: 5, vol: 0.00012, spread: 0.00008, contract: 100_000, sizes: [0.01, 0.1, 1], sizeUnit: 'لات', step: 0.0005, defaultStop: 0.002 },
  { id: 'XAUUSD', label: 'XAU/USD', market: 'forex', base: 4200, decimals: 2, vol: 1, spread: 0.5, contract: 100, sizes: [0.01, 0.1, 1], sizeUnit: 'لات', step: 1, defaultStop: 8 },
  { id: 'BTCUSDT', label: 'BTC/USDT', market: 'crypto', base: 84_000, decimals: 1, vol: 40, spread: 12, contract: 1, sizes: [0.001, 0.01, 0.1], sizeUnit: 'BTC', step: 100, defaultStop: 550 },
  { id: 'ETHUSDT', label: 'ETH/USDT', market: 'crypto', base: 2700, decimals: 2, vol: 1.8, spread: 0.7, contract: 1, sizes: [0.01, 0.1, 1], sizeUnit: 'ETH', step: 5, defaultStop: 22 },
];

export function symbolsFor(market: Market): SymbolSpec[] {
  return SYMBOLS.filter((s) => market === 'both' || s.market === market);
}

export function findSymbol(id: string): SymbolSpec | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

/** Smallest size step of a symbol (0.01 lot, 0.001 BTC, …). */
export function sizeStep(spec: SymbolSpec): number {
  return spec.sizes[0];
}

/** Size with as many decimals as the symbol's step needs, in Latin digits. */
export function formatSize(spec: SymbolSpec, size: number): string {
  const decimals = Math.max(0, Math.round(-Math.log10(sizeStep(spec))));
  return String(Number(size.toFixed(decimals)));
}

export const TICKS_PER_CANDLE = 8;
export const VISIBLE_CANDLES = 36;
/** Candles kept for the live chart, so it can be zoomed out and scrolled back. */
export const HISTORY_CANDLES = 150;
/** A simulated tick comes every second, so a simulated candle lasts this long. */
export const SIM_CANDLE_MS = TICKS_PER_CANDLE * 1000;

export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Next mid price: a random walk gently pulled back towards the symbol's base price
 * (or another anchor, e.g. the last real price after live data drops out).
 */
export function nextPrice(spec: SymbolSpec, price: number, rng: () => number = Math.random, anchor = spec.base): number {
  const pull = (anchor - price) * 0.002;
  return price + pull + gaussian(rng) * spec.vol * (anchor / spec.base);
}

export function generateHistory(spec: SymbolSpec, count: number, rng: () => number = Math.random): Candle[] {
  const candles: Candle[] = [];
  let price = spec.base;
  for (let i = 0; i < count; i++) {
    const open = price;
    let high = open;
    let low = open;
    for (let t = 0; t < TICKS_PER_CANDLE; t++) {
      price = nextPrice(spec, price, rng);
      high = Math.max(high, price);
      low = Math.min(low, price);
    }
    candles.push([open, high, low, price]);
  }
  return candles;
}

/** Applies one tick to the series, starting a new candle every TICKS_PER_CANDLE ticks. */
export function applyTick(candles: Candle[], price: number, tick: number, max = HISTORY_CANDLES): Candle[] {
  const next = candles.slice();
  if (tick % TICKS_PER_CANDLE === 0) {
    next.push([price, price, price, price]);
    if (next.length > max) next.shift();
  } else {
    const [o, h, l] = next[next.length - 1];
    next[next.length - 1] = [o, Math.max(h, price), Math.min(l, price), price];
  }
  return next;
}

/** Candle open times kept in step with applyTick: a tick that starts a candle adds `now`. */
export function tickTimes(times: number[], tick: number, now: number, max = HISTORY_CANDLES): number[] {
  if (tick % TICKS_PER_CANDLE !== 0) return times;
  const next = [...times, now];
  return next.length > max ? next.slice(-max) : next;
}

/** Open times for `count` evenly spaced candles, the last one opening at `lastOpen`. */
export function backfillTimes(count: number, lastOpen: number, intervalMs: number): number[] {
  return Array.from({ length: count }, (_, i) => lastOpen - (count - 1 - i) * intervalMs);
}

/** Seconds until the next simulated candle, given the tick the feed will apply next. */
export function simCountdown(nextTick: number): number {
  return ((TICKS_PER_CANDLE - (nextTick % TICKS_PER_CANDLE)) % TICKS_PER_CANDLE) + 1;
}

/**
 * One step up or down from `size`, between the symbol's smallest and largest size.
 * Steps grow with the size (0.01 → 0.1 → 1 lot) so big sizes don't take a hundred taps.
 */
export function nudgeSize(spec: SymbolSpec, size: number, dir: 1 | -1): number {
  const min = sizeStep(spec);
  const max = spec.sizes[spec.sizes.length - 1];
  const ref = dir > 0 ? size : size - min / 1000;
  const unit = min * 10 ** Math.max(0, Math.floor(Math.log10(ref / min) + 1e-9));
  const decimals = Math.max(0, Math.round(-Math.log10(min)));
  return Math.min(max, Math.max(min, Number((size + dir * unit).toFixed(decimals))));
}

/** A made-up but stable volume for simulated candles: wider candles trade more. */
export function simVolume(spec: SymbolSpec, candle: Candle): number {
  const [o, h, l, c] = candle;
  return Math.max(1, Math.round(((h - l) / spec.vol) * 10 + (Math.abs(c - o) / spec.vol) * 4));
}

export function quote(spec: SymbolSpec, mid: number) {
  return { bid: mid - spec.spread / 2, ask: mid + spec.spread / 2 };
}

export function formatPrice(spec: SymbolSpec, price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: spec.decimals, maximumFractionDigits: spec.decimals, useGrouping: spec.base > 1000 });
}

export function positionPnl(
  spec: SymbolSpec,
  p: { side: 'buy' | 'sell'; size: number; entry: number },
  mid: number,
): number {
  const { bid, ask } = quote(spec, mid);
  // A buy closes at the bid, a sell closes at the ask.
  const exit = p.side === 'buy' ? bid : ask;
  const dir = p.side === 'buy' ? 1 : -1;
  return (exit - p.entry) * dir * p.size * spec.contract;
}
