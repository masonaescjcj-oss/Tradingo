/** Gets a new duel's candles: real history from Binance, or a stand-in when it can't be reached. */
import { Platform } from 'react-native';

import { buildRounds, CHART_AHEAD, CHART_SHOWN, duelPlan, fallbackCandles, roundCandles, TRADE_HISTORY, TRADE_REPLAY, type DuelChart, type DuelRounds, type WindowPlan } from './duel';
import { BINANCE_HOSTS, fetchKlines } from './marketData';
import { findSymbol } from './simulator';

async function realWindow(p: WindowPlan): Promise<DuelChart> {
  // api.binance.com doesn't allow browser requests, so on the web only the market-data host is worth trying.
  const hosts = Platform.OS === 'web' ? BINANCE_HOSTS.slice(0, 1) : BINANCE_HOSTS;
  const { klines } = await fetchKlines(p.binance, p.limit, { interval: p.interval, endTime: p.endTime, timeoutMs: 7000, hosts });
  if (klines.length !== p.limit) throw new Error('duel: short history');
  return { symbol: p.symbol, label: p.label, decimals: p.decimals, candles: roundCandles(klines.map((k) => k.candle), p.decimals) };
}

function standIn(seed: number, p: WindowPlan): DuelChart {
  const base = findSymbol(p.symbol)?.base ?? 100;
  const vol = base * (p.interval === '1h' ? 0.0025 : 0.0012);
  return { symbol: p.symbol, label: p.label, decimals: p.decimals, candles: fallbackCandles(`duel-walk:${seed}:${p.interval}`, p.limit, base, vol, p.decimals) };
}

export async function loadRounds(seed: number, now = Date.now()): Promise<DuelRounds> {
  const plan = duelPlan(seed, now);
  try {
    const [chart, trade] = await Promise.all([realWindow(plan.chart), realWindow(plan.trade)]);
    return buildRounds(seed, chart, trade, true);
  } catch {
    const chart = standIn(seed, plan.chart);
    const trade = standIn(seed, plan.trade);
    if (chart.candles.length !== CHART_SHOWN + CHART_AHEAD || trade.candles.length !== TRADE_HISTORY + TRADE_REPLAY) throw new Error('duel: bad stand-in');
    return buildRounds(seed, chart, trade, false);
  }
}
