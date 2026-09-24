import { useEffect, useEffectEvent, useState } from 'react';
import { create } from 'zustand';

import type { Candle } from '@/content/types';
import { BINANCE_HOSTS, feedFromKlines, fetchKlines, LIVE_POLL_MS, LIVE_SYMBOLS, mergeFeed, type Kline } from '@/lib/marketData';
import { applyTick, backfillTimes, generateHistory, HISTORY_CANDLES, nextPrice, SIM_CANDLE_MS, SYMBOLS, tickTimes } from '@/lib/simulator';

export type Series = {
  candles: Candle[];
  /** Real volumes of live candles; simulated ones are derived from the candles. */
  volumes?: number[];
  /** Open time of each candle (ms). */
  times: number[];
  price: number;
  tick: number;
  /** Price the simulated walk drifts around: the symbol's base, or the last live price. */
  anchor: number;
  source: 'sim' | 'live';
  /** Open time of the last live candle. */
  lastOpen?: number;
};

export type LiveStatus = 'off' | 'loading' | 'on' | 'failed';

export type Moves = { symbol: string; path: number[] }[];

/** One minute: the interval of the live candles. */
const LIVE_CANDLE_MS = 60_000;

function initialSeries(): Record<string, Series> {
  const out: Record<string, Series> = {};
  const now = Date.now();
  for (const spec of SYMBOLS) {
    const candles = generateHistory(spec, HISTORY_CANDLES);
    out[spec.id] = {
      candles,
      times: backfillTimes(candles.length, now, SIM_CANDLE_MS),
      price: candles[candles.length - 1][3],
      tick: 1,
      anchor: spec.base,
      source: 'sim',
    };
  }
  return out;
}

/** The simulator's latest prices, for screens outside it (posting an analysis from a chat group). */
export const useFeedSnapshot = create<{ series: Record<string, Series> | null }>()(() => ({ series: null }));

/** Starting prices when the simulator hasn't run yet: a fresh simulated history per symbol. */
export const seedSeries = initialSeries;

export const midsOf = (series: Record<string, Series>) => Object.fromEntries(Object.entries(series).map(([id, s]) => [id, s.price]));

/** Live symbols go back to the simulated walk, continuing from their last real price. */
function toSimulated(prev: Record<string, Series>): Record<string, Series> {
  const next = { ...prev };
  for (const id of LIVE_SYMBOLS) {
    const cur = prev[id];
    if (cur?.source === 'live') next[id] = { ...cur, source: 'sim', volumes: undefined, anchor: cur.price, tick: 1 };
  }
  return next;
}

/**
 * Prices for every simulator symbol: a simulated tick each second, and (when switched on)
 * real one-minute candles for BTC and ETH from Binance, polled every few seconds while
 * the screen is focused. `onMoves` gets each price change so orders and stops can be checked.
 */
export function useMarketFeed(onMoves: (moves: Moves, mids: Record<string, number>) => void, focused = true) {
  const [series, setSeries] = useState(initialSeries);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<LiveStatus>('off');

  useEffect(() => {
    useFeedSnapshot.setState({ series });
  }, [series]);

  const tick = useEffectEvent(() => {
    const next = { ...series };
    const moves: Moves = [];
    const now = Date.now();
    for (const spec of SYMBOLS) {
      const cur = series[spec.id];
      if (!cur || cur.source !== 'sim') continue;
      const price = nextPrice(spec, cur.price, Math.random, cur.anchor);
      next[spec.id] = {
        ...cur,
        candles: applyTick(cur.candles, price, cur.tick),
        times: tickTimes(cur.times, cur.tick, now),
        price,
        tick: cur.tick + 1,
      };
      moves.push({ symbol: spec.id, path: [cur.price, price] });
    }
    setSeries(next);
    onMoves(moves, midsOf(next));
  });

  useEffect(() => {
    const t = setInterval(() => tick(), 1000);
    return () => clearInterval(t);
  }, []);

  const applyLive = useEffectEvent((updates: { symbol: string; klines: Kline[] }[], initial: boolean) => {
    const next = { ...series };
    const moves: Moves = [];
    for (const { symbol, klines } of updates) {
      const cur = series[symbol];
      if (!cur) continue;
      const feed =
        initial || cur.source !== 'live' || cur.lastOpen == null
          ? feedFromKlines(klines.slice(-HISTORY_CANDLES))
          : mergeFeed({ candles: cur.candles, volumes: cur.volumes ?? [], lastOpen: cur.lastOpen }, klines, HISTORY_CANDLES);
      const price = feed.candles[feed.candles.length - 1][3];
      // Binance has a candle for every minute, so the open times follow from the last one.
      const times = backfillTimes(feed.candles.length, feed.lastOpen, LIVE_CANDLE_MS);
      next[symbol] = { ...cur, ...feed, times, price, anchor: price, source: 'live' };
      // Switching from simulated to real prices is a jump between two sources, not a market move.
      if (cur.source === 'live') moves.push({ symbol, path: [cur.price, price] });
    }
    setSeries(next);
    if (initial) setStatus('on');
    if (moves.length) onMoves(moves, midsOf(next));
  });

  const failLive = useEffectEvent(() => {
    setSeries(toSimulated);
    setLive(false);
    setStatus('failed');
  });

  // A full reload on each start (also after coming back to the tab) fills any missed candles.
  useEffect(() => {
    if (!live || !focused) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hosts = BINANCE_HOSTS;
    let failures = 0;
    const load = async (initial: boolean) => {
      try {
        const results = await Promise.all(LIVE_SYMBOLS.map((s) => fetchKlines(s, initial ? HISTORY_CANDLES : 2, { hosts })));
        if (cancelled) return;
        failures = 0;
        hosts = [results[0].host, ...BINANCE_HOSTS.filter((h) => h !== results[0].host)];
        applyLive(
          results.map((r, i) => ({ symbol: LIVE_SYMBOLS[i], klines: r.klines })),
          initial,
        );
      } catch {
        if (cancelled) return;
        failures += 1;
        // A first failure, or several in a row, means live data isn't reachable from here.
        if (initial || failures >= 3) {
          failLive();
          return;
        }
      }
      timer = setTimeout(() => load(false), LIVE_POLL_MS);
    };
    load(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [live, focused]);

  const setLiveOn = (on: boolean) => {
    if (on) {
      setStatus('loading');
      setLive(true);
    } else {
      setLive(false);
      setStatus('off');
      setSeries(toSimulated);
    }
  };

  return { series, live, status, setLive: setLiveOn };
}

/** The current time, refreshed every `ms` (for countdowns that don't follow a price tick). */
export function useClock(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Seconds until the forming live candle closes. */
export function liveCountdown(lastOpen: number, now: number): number {
  return Math.min(60, Math.max(0, (lastOpen + LIVE_CANDLE_MS - now) / 1000));
}
