import { useEffect, useState } from 'react';

import { binanceSymbol, fetchKlines, feedFromKlines, mergeFeed, timeframeSpec, type Feed, type Timeframe } from '@/lib/marketData';
import { HISTORY_CANDLES } from '@/lib/simulator';

/** How often the forming higher-timeframe candle is refreshed from Binance (ticks come from the M1 feed). */
const TF_POLL_MS = 10_000;

export type TimeframeState = { status: 'base' } | { status: 'loading' } | { status: 'failed' } | { status: 'ready'; feed: Feed; ms: number };

/**
 * Candles of a higher timeframe (M5 up to D1) for one live symbol, straight from Binance.
 * M1, or no live prices, means the chart keeps the regular feed ('base').
 */
export function useTimeframe(symbol: string, timeframe: Timeframe, live: boolean): TimeframeState {
  const key = `${symbol}:${timeframe}`;
  const wanted = live && timeframe !== 'M1';
  const [loaded, setLoaded] = useState<{ key: string; feed: Feed } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { interval } = timeframeSpec(timeframe);
    const pair = binanceSymbol(symbol);
    let feed: Feed | null = null;
    const poll = async () => {
      try {
        const { klines } = await fetchKlines(pair, feed ? 2 : HISTORY_CANDLES, { interval });
        if (cancelled) return;
        feed = feed ? mergeFeed(feed, klines, HISTORY_CANDLES) : feedFromKlines(klines);
        setLoaded({ key, feed });
      } catch {
        if (cancelled) return;
        // A failed first load falls back to M1; a failed refresh just waits for the next one.
        if (!feed) {
          setFailed(key);
          return;
        }
      }
      timer = setTimeout(poll, TF_POLL_MS);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [wanted, key, symbol, timeframe]);

  if (!wanted) return { status: 'base' };
  if (loaded?.key === key) return { status: 'ready', feed: loaded.feed, ms: timeframeSpec(timeframe).ms };
  return failed === key ? { status: 'failed' } : { status: 'loading' };
}
