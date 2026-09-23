/** Performance numbers for the trade journal. Pure: history in, numbers out. */
import { findSymbol } from './simulator';
import type { ClosedTrade } from './trading';

export type TradeStats = {
  count: number;
  wins: number;
  losses: number;
  /** 0–1, null without trades. */
  winRate: number | null;
  /** Average profit of winning trades (positive), null without wins. */
  avgWin: number | null;
  /** Average loss of losing trades (positive number), null without losses. */
  avgLoss: number | null;
  /** Gross profit ÷ gross loss; Infinity with wins but no losses, null without either. */
  profitFactor: number | null;
  /** Average R multiple (pnl ÷ initial risk) of trades that had a stop-loss. */
  avgR: number | null;
  /** How many trades avgR is based on. */
  rCount: number;
  withStops: number;
  liquidations: number;
  net: number;
  /** Balance before the first trade and after each one, oldest first. */
  curve: number[];
  /** Largest fall from a peak of the closed-trade balance, as a share of that peak. */
  maxDrawdown: number;
  maxDrawdownUsd: number;
};

/** Initial dollar risk of a trade: stored at entry, or rebuilt from its stop-loss. */
export function tradeRisk(t: ClosedTrade): number | null {
  if (t.risk != null && t.risk > 0) return t.risk;
  if (t.sl == null) return null;
  const spec = findSymbol(t.symbol);
  if (!spec) return null;
  const risk = Math.abs(t.entry - t.sl) * t.size * spec.contract;
  return risk > 0 ? risk : null;
}

/** Profit or loss in units of the initial risk: +2R means twice what was risked was won. */
export function tradeR(t: ClosedTrade): number | null {
  const risk = tradeRisk(t);
  return risk == null ? null : t.pnl / risk;
}

/**
 * Balance path of the closed trades, oldest first. History is stored newest first and may
 * be trimmed, so the curve is rebuilt backwards from the balance it ends at.
 */
export function equityCurve(historyNewestFirst: ClosedTrade[], endBalance: number): number[] {
  const chrono = historyNewestFirst.slice().reverse();
  const start = endBalance - chrono.reduce((s, t) => s + t.pnl, 0);
  const out = [start];
  for (const t of chrono) out.push(out[out.length - 1] + t.pnl);
  return out;
}

export function maxDrawdown(curve: number[]): { pct: number; usd: number } {
  let peak = -Infinity;
  let pct = 0;
  let usd = 0;
  for (const v of curve) {
    peak = Math.max(peak, v);
    if (peak > 0) pct = Math.max(pct, (peak - v) / peak);
    usd = Math.max(usd, peak - v);
  }
  return { pct, usd };
}

export function tradeStats(historyNewestFirst: ClosedTrade[], endBalance: number): TradeStats {
  const wins = historyNewestFirst.filter((t) => t.pnl > 0);
  const losses = historyNewestFirst.filter((t) => t.pnl < 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = -losses.reduce((s, t) => s + t.pnl, 0);
  const rs = historyNewestFirst.map(tradeR).filter((r): r is number => r != null);
  const curve = equityCurve(historyNewestFirst, endBalance);
  const dd = maxDrawdown(curve);
  const count = historyNewestFirst.length;
  return {
    count,
    wins: wins.length,
    losses: losses.length,
    winRate: count ? wins.length / count : null,
    avgWin: wins.length ? grossWin / wins.length : null,
    avgLoss: losses.length ? grossLoss / losses.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null,
    avgR: rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : null,
    rCount: rs.length,
    withStops: historyNewestFirst.filter((t) => t.sl != null).length,
    liquidations: historyNewestFirst.filter((t) => t.reason === 'liquidation').length,
    net: grossWin - grossLoss,
    curve,
    maxDrawdown: dd.pct,
    maxDrawdownUsd: dd.usd,
  };
}
