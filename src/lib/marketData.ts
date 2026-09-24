/**
 * Live candles from Binance's public market data (no API key).
 * data-api.binance.vision serves market data only and allows browser requests (CORS);
 * api.binance.com is tried second. Any failure is reported to the caller, which falls
 * back to the simulated prices.
 *
 * Binance has no forex, so EUR/USD follows its EUR/USDT pair and gold follows PAX Gold
 * (one token is one troy ounce of gold). Both trade around the clock and sit within a
 * fraction of a percent of the real quotes.
 */
import type { Candle } from '@/content/types';

/** The Binance pair behind each simulator symbol that has live prices. */
export const LIVE_SOURCES: Record<string, string> = {
  BTCUSDT: 'BTCUSDT',
  ETHUSDT: 'ETHUSDT',
  EURUSD: 'EURUSDT',
  XAUUSD: 'PAXGUSDT',
};

export const LIVE_SYMBOLS = Object.keys(LIVE_SOURCES);
export const BINANCE_HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com'];
export const LIVE_INTERVAL = '1m';
export const LIVE_POLL_MS = 2500;

export type Kline = { openTime: number; candle: Candle; volume: number };

/** Candles and volumes of a live chart, plus the open time of its last candle. */
export type Feed = { candles: Candle[]; volumes: number[]; lastOpen: number };

export function supportsLive(symbol: string): boolean {
  return symbol in LIVE_SOURCES;
}

export function binanceSymbol(symbol: string): string {
  return LIVE_SOURCES[symbol] ?? symbol;
}

/**
 * Whether the real forex market is shut for the weekend (roughly Friday 21:00 to
 * Sunday 21:00 UTC). The Binance pairs keep trading, so the app only mentions it.
 */
export function forexWeekend(now: Date = new Date()): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  return (day === 5 && hour >= 21) || day === 6 || (day === 0 && hour < 21);
}

/** Parses Binance's kline arrays ([openTime, "open", "high", "low", "close", "volume", …]). Throws on anything else. */
export function parseKlines(raw: unknown): Kline[] {
  if (!Array.isArray(raw)) throw new Error('klines: not an array');
  return raw.map((row) => {
    if (!Array.isArray(row) || row.length < 6) throw new Error('klines: bad row');
    const [openTime, o, h, l, c, v] = row;
    const nums = [o, h, l, c, v].map(Number);
    if (typeof openTime !== 'number' || nums.some((n) => !Number.isFinite(n))) throw new Error('klines: bad values');
    return { openTime, candle: [nums[0], nums[1], nums[2], nums[3]] as Candle, volume: nums[4] };
  });
}

export function feedFromKlines(klines: Kline[]): Feed {
  if (klines.length === 0) throw new Error('klines: empty');
  return {
    candles: klines.map((k) => k.candle),
    volumes: klines.map((k) => k.volume),
    lastOpen: klines[klines.length - 1].openTime,
  };
}

/** Updates the forming candle and appends new ones, keeping at most `max` candles. */
export function mergeFeed(feed: Feed, incoming: Kline[], max: number): Feed {
  let candles = feed.candles.slice();
  let volumes = feed.volumes.slice();
  let lastOpen = feed.lastOpen;
  for (const k of incoming) {
    if (k.openTime === lastOpen) {
      candles[candles.length - 1] = k.candle;
      volumes[volumes.length - 1] = k.volume;
    } else if (k.openTime > lastOpen) {
      candles.push(k.candle);
      volumes.push(k.volume);
      lastOpen = k.openTime;
    }
  }
  if (candles.length > max) {
    candles = candles.slice(-max);
    volumes = volumes.slice(-max);
  }
  return { candles, volumes, lastOpen };
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export function klinesUrl(host: string, symbol: string, limit: number, interval = LIVE_INTERVAL): string {
  return `${host}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
}

/**
 * Fetches recent klines, trying each host in turn, and says which host answered
 * (callers try it first next time). Rejects if none answers with valid data.
 */
export async function fetchKlines(
  symbol: string,
  limit: number,
  { fetchImpl = fetch as unknown as FetchLike, timeoutMs = 6000, hosts = BINANCE_HOSTS }: { fetchImpl?: FetchLike; timeoutMs?: number; hosts?: string[] } = {},
): Promise<{ klines: Kline[]; host: string }> {
  let lastError: unknown = new Error('klines: no host');
  for (const host of hosts) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), timeoutMs);
    try {
      const res = await fetchImpl(klinesUrl(host, symbol, limit), controller ? { signal: controller.signal } : undefined);
      if (!res.ok) throw new Error(`klines: HTTP ${res.status}`);
      const klines = parseKlines(await res.json());
      if (klines.length === 0) throw new Error('klines: empty');
      return { klines, host };
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
