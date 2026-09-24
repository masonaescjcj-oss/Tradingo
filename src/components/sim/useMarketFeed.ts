import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { create } from 'zustand';

import type { Candle } from '@/content/types';
import { BINANCE_HOSTS, binanceSymbol, feedFromKlines, fetchKlines, LIVE_POLL_MS, LIVE_SYMBOLS, mergeFeed, SLOW_POLL_EVERY, type Kline } from '@/lib/marketData';
import { applyTick, backfillTimes, generateHistory, HISTORY_CANDLES, nextPrice, SIM_CANDLE_MS, SYMBOLS, tickTimes } from '@/lib/simulator';
import { useGame } from '@/store/game';

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
 * The live pairs to poll on every round: the one on the chart and any with an open trade or
 * order (so stops and limits fill on time). The rest are refreshed every SLOW_POLL_EVERY rounds.
 */
export function fastSymbols(onScreen: string | null, busy: string[]): string[] {
  const hot = new Set([...(onScreen ? [onScreen] : []), ...busy]);
  return LIVE_SYMBOLS.filter((s) => hot.has(s));
}

/**
 * Prices for every simulator symbol: a simulated tick each second, and (when switched on)
 * real one-minute candles from Binance (crypto, EUR/USD and gold) while the screen is focused:
 * every few seconds for the pair on screen and pairs with open trades, every ~20 seconds for
 * the rest. `onMoves` gets each price change so orders and stops can be checked; `watch`
 * tells the feed which pair is on screen.
 */
export function useMarketFeed(onMoves: (moves: Moves, mids: Record<string, number>) => void, focused = true) {
  const [series, setSeries] = useState(initialSeries);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<LiveStatus>('off');
  const onScreen = useRef<string | null>(null);

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
      // A symbol whose first load failed stays simulated; a two-candle poll can't replace its history.
      if (!initial && cur.source !== 'live') continue;
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
    let round = 0;
    const load = async (initial: boolean) => {
      round += 1;
      const { sim, simOrders } = useGame.getState();
      const busy = [...sim.positions.map((p) => p.symbol), ...(simOrders ?? []).map((o) => o.symbol)];
      const pick = initial || round % SLOW_POLL_EVERY === 0 ? LIVE_SYMBOLS : fastSymbols(onScreen.current, busy);
      if (!pick.length) {
        timer = setTimeout(() => load(false), LIVE_POLL_MS);
        return;
      }
      // Each pair on its own, so one that's missing doesn't stop the others.
      const results = await Promise.allSettled(pick.map((s) => fetchKlines(binanceSymbol(s), initial ? HISTORY_CANDLES : 2, { hosts })));
      if (cancelled) return;
      const ok = results.flatMap((r, i) => (r.status === 'fulfilled' ? [{ symbol: pick[i], ...r.value }] : []));
      if (ok.length) {
        failures = 0;
        hosts = [ok[0].host, ...BINANCE_HOSTS.filter((h) => h !== ok[0].host)];
        applyLive(ok, initial);
      } else {
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

  const watch = useCallback((id: string) => {
    onScreen.current = id;
  }, []);

  return { series, live, status, setLive: setLiveOn, watch };
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
