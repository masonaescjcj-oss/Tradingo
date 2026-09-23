/**
 * Market replay: a deterministic generated history the learner steps through candle by candle.
 * The same symbol and seed always give the same candles, so a session survives restarts.
 */
import type { Candle } from '@/content/types';
import { createRng } from '@/utils/random';

import { findSymbol, gaussian, HISTORY_CANDLES, simVolume, TICKS_PER_CANDLE, VISIBLE_CANDLES, type SymbolSpec } from './simulator';
import { candlePath, processPath, type Account, type Ctx, type TradeEvent } from './trading';

export const REPLAY_TOTAL = 400;
/** Candles left to play after the random starting point, at least. */
export const REPLAY_MIN_AHEAD = 120;
export const REPLAY_SPEEDS = [1, 2, 4] as const;

export type ReplaySession = {
  symbol: string;
  seed: number;
  /** Index of the first hidden candle when the session began. */
  start: number;
  /** Candles before this index are visible; the price is the close of candle cursor − 1. */
  cursor: number;
  /** Replay account balance when the session began. */
  startBalance: number;
};

/**
 * Price history with changing moods: trends of different strength and quiet ranges
 * of random length, so replay practice isn't one endless sideways walk.
 */
export function generateMarket(spec: SymbolSpec, count: number, rng: () => number): Candle[] {
  const candles: Candle[] = [];
  let price = spec.base * (0.94 + rng() * 0.12);
  let drift = 0;
  let volMult = 1;
  let left = 0;
  for (let i = 0; i < count; i++) {
    if (left <= 0) {
      left = 18 + Math.floor(rng() * 42);
      const mood = rng();
      drift = mood < 0.35 ? 0 : (rng() - 0.5) * 0.7;
      volMult = 0.7 + rng() * 0.9;
    }
    left -= 1;
    const open = price;
    let high = open;
    let low = open;
    for (let t = 0; t < TICKS_PER_CANDLE; t++) {
      // A light pull back to the base keeps prices believable over hundreds of candles.
      const pull = (spec.base - price) * 0.0006;
      price = price + pull + (drift + gaussian(rng) * volMult) * spec.vol;
      high = Math.max(high, price);
      low = Math.min(low, price);
    }
    candles.push([open, high, low, price]);
  }
  return candles;
}

let cache: { key: string; candles: Candle[] } | null = null;

export function replayCandles(spec: SymbolSpec, seed: number): Candle[] {
  const key = `${spec.id}:${seed}`;
  if (cache?.key !== key) cache = { key, candles: generateMarket(spec, REPLAY_TOTAL, createRng(seed)) };
  return cache.candles;
}

export function newReplaySession(symbol: string, seed: number, startBalance: number): ReplaySession {
  const rng = createRng(seed ^ 0x9e3779b9);
  const room = REPLAY_TOTAL - VISIBLE_CANDLES - REPLAY_MIN_AHEAD;
  const start = VISIBLE_CANDLES + Math.floor(rng() * room);
  return { symbol, seed, start, cursor: start, startBalance };
}

/** The revealed candles the chart can show (up to HISTORY_CANDLES) and their volumes. */
export function replayView(spec: SymbolSpec, session: ReplaySession): { candles: Candle[]; volumes: number[]; price: number } {
  const all = replayCandles(spec, session.seed);
  const candles = all.slice(Math.max(0, session.cursor - HISTORY_CANDLES), session.cursor);
  return { candles, volumes: candles.map((c) => simVolume(spec, c)), price: candles[candles.length - 1][3] };
}

export function replayPrice(session: ReplaySession): number | null {
  const spec = findSymbol(session.symbol);
  if (!spec) return null;
  return replayCandles(spec, session.seed)[session.cursor - 1]?.[3] ?? null;
}

export function replayFinished(session: ReplaySession): boolean {
  return session.cursor >= REPLAY_TOTAL;
}

/**
 * Reveals the next `count` candles one by one, filling orders and closing positions
 * along each candle's likely path.
 */
export function stepReplay(
  account: Account,
  session: ReplaySession,
  count: number,
  ctx: Omit<Ctx, 'mids'>,
): { account: Account; session: ReplaySession; events: TradeEvent[] } {
  const spec = findSymbol(session.symbol);
  if (!spec) return { account, session, events: [] };
  const all = replayCandles(spec, session.seed);
  let acc = account;
  let cursor = session.cursor;
  const events: TradeEvent[] = [];
  for (let k = 0; k < count && cursor < all.length; k++) {
    const candle = all[cursor];
    const r = processPath(acc, spec, candlePath(candle), { ...ctx, mids: { [spec.id]: candle[3] } });
    acc = r.account;
    events.push(...r.events);
    cursor += 1;
  }
  return { account: acc, session: { ...session, cursor }, events };
}
