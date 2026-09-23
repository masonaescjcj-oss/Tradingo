/**
 * Order matching, margin and liquidation for the practice simulator.
 * Pure functions: no React, no storage, no clocks (callers pass `now` and ids).
 *
 * The model, kept deliberately simple so it can be explained in the app:
 * - Market orders fill at the ask (buy) or bid (sell). Limit and stop orders wait until
 *   the price reaches them, then fill at their price.
 * - Margin = trade value ÷ leverage. Each position keeps its own margin ("isolated").
 * - A position is liquidated when its loss eats MAINTENANCE (half) of its margin,
 *   i.e. after a move of MAINTENANCE ÷ leverage against it (5% at 10x).
 * - Stop-loss, take-profit and liquidation are checked along the price path; whichever
 *   level the price reaches first closes the position at that level.
 */
import { findSymbol, quote, sizeStep, type SymbolSpec } from './simulator';

export type Side = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop';
export type CloseReason = 'manual' | 'sl' | 'tp' | 'liquidation';

export type Position = {
  id: string;
  symbol: string;
  side: Side;
  size: number;
  entry: number;
  sl?: number;
  tp?: number;
  openedAt: number;
  /** Missing on positions opened before leverage existed (treated as LEGACY_LEVERAGE). */
  leverage?: number;
  /** Dollars set aside for this position. */
  margin?: number;
  /** Dollar loss if the stop-loss is hit, fixed at entry. Used for R multiples. */
  risk?: number;
  orderType?: OrderType;
};

export type PendingOrder = {
  id: string;
  symbol: string;
  side: Side;
  type: 'limit' | 'stop';
  price: number;
  size: number;
  sl?: number;
  tp?: number;
  leverage: number;
  createdAt: number;
};

export type ClosedTrade = Position & { exit: number; pnl: number; closedAt: number; reason: CloseReason; note?: string };

export type Account = { balance: number; positions: Position[]; orders: PendingOrder[]; history: ClosedTrade[] };

export type TradeEvent =
  | { kind: 'opened'; position: Position }
  | { kind: 'placed'; order: PendingOrder }
  | { kind: 'filled'; order: PendingOrder; position: Position }
  | { kind: 'closed'; trade: ClosedTrade }
  /** A pending order reached its price but there wasn't enough free margin left. */
  | { kind: 'rejected'; order: PendingOrder };

export type OrderRequest = {
  symbol: string;
  side: Side;
  type: OrderType;
  size: number;
  /** Trigger price of a limit or stop order. */
  price?: number;
  sl?: number;
  tp?: number;
  leverage: number;
};

export type PlaceError = 'size' | 'leverage' | 'price' | 'sl' | 'tp' | 'margin';

export type Ctx = {
  now: number;
  newId: () => string;
  /** Latest mid prices of other symbols, for equity and free margin. */
  mids?: Record<string, number>;
  specOf?: (id: string) => SymbolSpec | undefined;
};

export const LEVERAGES = [1, 2, 5, 10, 20, 50] as const;
export const DEFAULT_LEVERAGE = 10;
/** Positions saved before leverage existed. */
export const LEGACY_LEVERAGE = 20;
/** Share of a position's margin its loss may eat before it is liquidated. */
export const MAINTENANCE = 0.5;
export const HISTORY_LIMIT = 200;

export function emptyAccount(balance: number): Account {
  return { balance, positions: [], orders: [], history: [] };
}

const dirOf = (side: Side) => (side === 'buy' ? 1 : -1);

/** Price a new position gets: buys pay the ask, sells get the bid. */
export function fillPrice(spec: SymbolSpec, side: Side, mid: number): number {
  const { bid, ask } = quote(spec, mid);
  return side === 'buy' ? ask : bid;
}

/** Price an open position closes at: buys sell at the bid, sells buy back at the ask. */
export function exitPrice(spec: SymbolSpec, side: Side, mid: number): number {
  const { bid, ask } = quote(spec, mid);
  return side === 'buy' ? bid : ask;
}

export function notional(spec: SymbolSpec, size: number, price: number): number {
  return size * spec.contract * price;
}

export function requiredMargin(spec: SymbolSpec, size: number, price: number, leverage: number): number {
  return notional(spec, size, price) / leverage;
}

export function positionMargin(spec: SymbolSpec, p: Position): number {
  return p.margin ?? requiredMargin(spec, p.size, p.entry, p.leverage ?? LEGACY_LEVERAGE);
}

export function pnlAt(spec: SymbolSpec, p: Pick<Position, 'side' | 'size' | 'entry'>, exit: number): number {
  return (exit - p.entry) * dirOf(p.side) * p.size * spec.contract;
}

export function openPnl(spec: SymbolSpec, p: Pick<Position, 'side' | 'size' | 'entry'>, mid: number): number {
  return pnlAt(spec, p, exitPrice(spec, p.side, mid));
}

/** Dollar loss between entry and stop-loss. */
export function stopRisk(spec: SymbolSpec, size: number, entry: number, sl: number): number {
  return Math.abs(entry - sl) * size * spec.contract;
}

/** Share of the entry price the market has to move against a position to liquidate it. */
export function liquidationMove(leverage: number): number {
  return MAINTENANCE / leverage;
}

/** Closing price (bid for buys, ask for sells) at which the position is liquidated. */
export function liquidationPrice(spec: SymbolSpec, p: Position): number {
  const lossAllowed = MAINTENANCE * positionMargin(spec, p);
  return p.entry - (dirOf(p.side) * lossAllowed) / (p.size * spec.contract);
}

export type Summary = {
  balance: number;
  openPnl: number;
  /** Balance plus the profit or loss of open positions. */
  equity: number;
  usedMargin: number;
  freeMargin: number;
  /** Equity ÷ used margin, in percent; null without open positions. */
  marginLevel: number | null;
};

export function summarize(
  account: Pick<Account, 'balance' | 'positions'>,
  mids: Record<string, number>,
  specOf: (id: string) => SymbolSpec | undefined = findSymbol,
): Summary {
  let pnl = 0;
  let used = 0;
  for (const p of account.positions) {
    const spec = specOf(p.symbol);
    if (!spec) continue;
    used += positionMargin(spec, p);
    const mid = mids[p.symbol];
    if (mid != null) pnl += openPnl(spec, p, mid);
  }
  const equity = account.balance + pnl;
  return {
    balance: account.balance,
    openPnl: pnl,
    equity,
    usedMargin: used,
    freeMargin: equity - used,
    marginLevel: used > 0 ? (equity / used) * 100 : null,
  };
}

/**
 * Position size for a given risk: size = risk amount ÷ (stop distance × contract),
 * rounded down to the symbol's size step. 0 when even the smallest size risks too much.
 */
export function riskSize(spec: SymbolSpec, equity: number, riskPct: number, stopDistance: number): number {
  if (!(stopDistance > 0) || !(equity > 0) || !(riskPct > 0)) return 0;
  const raw = (equity * riskPct) / 100 / (stopDistance * spec.contract);
  const step = sizeStep(spec);
  const decimals = Math.max(0, Math.round(-Math.log10(step)));
  // A hair of tolerance so $99.9996 of risk still buys the size $100 would.
  return Number((Math.floor(raw / step + 1e-3) * step).toFixed(decimals));
}

// ---------------------------------------------------------------------------
// Triggers: every level is turned into a mid-price threshold crossed downwards or upwards.

type Trigger = { kind: 'sl' | 'tp' | 'liquidation' | 'fill'; price: number; mid: number; dir: 'up' | 'down' };

function exitTrigger(spec: SymbolSpec, side: Side, kind: Trigger['kind'], price: number, adverse: boolean): Trigger {
  // Buys close at the bid (mid − half spread), sells at the ask (mid + half spread).
  const mid = side === 'buy' ? price + spec.spread / 2 : price - spec.spread / 2;
  const down = side === 'buy' ? adverse : !adverse;
  return { kind, price, mid, dir: down ? 'down' : 'up' };
}

function positionTriggers(spec: SymbolSpec, p: Position): Trigger[] {
  const out: Trigger[] = [];
  if (p.sl != null) out.push(exitTrigger(spec, p.side, 'sl', p.sl, true));
  out.push(exitTrigger(spec, p.side, 'liquidation', liquidationPrice(spec, p), true));
  if (p.tp != null) out.push(exitTrigger(spec, p.side, 'tp', p.tp, false));
  return out;
}

function fillTrigger(spec: SymbolSpec, o: PendingOrder): Trigger {
  // Buys fill at the ask, sells at the bid. A buy limit waits below, a buy stop above.
  const mid = o.side === 'buy' ? o.price - spec.spread / 2 : o.price + spec.spread / 2;
  const down = (o.side === 'buy') === (o.type === 'limit');
  return { kind: 'fill', price: o.price, mid, dir: down ? 'down' : 'up' };
}

/** Mid price where a move from `from` to `to` reaches the trigger, or null. */
function crossing(from: number, to: number, t: Trigger): number | null {
  if (t.dir === 'down') {
    if (from <= t.mid) return from;
    return to <= t.mid ? t.mid : null;
  }
  if (from >= t.mid) return from;
  return to >= t.mid ? t.mid : null;
}

/** The trigger the price reaches first on its way from `from` to `to`. */
function firstHit(from: number, to: number, triggers: Trigger[], entryMid: number) {
  let best: { t: Trigger; mid: number } | null = null;
  let bestKey: [number, number] = [Infinity, Infinity];
  for (const t of triggers) {
    const mid = crossing(from, to, t);
    if (mid == null) continue;
    // Ties (a jump past several levels at once) go to the level nearest the entry.
    const key: [number, number] = [Math.abs(mid - from), Math.abs(t.mid - entryMid)];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
      best = { t, mid };
      bestKey = key;
    }
  }
  return best;
}

function closeTrade(spec: SymbolSpec, p: Position, exit: number, reason: CloseReason, now: number): ClosedTrade {
  return { ...p, exit, pnl: pnlAt(spec, p, exit), closedAt: now, reason };
}

function withClosed(account: Account, trade: ClosedTrade): Account {
  return {
    ...account,
    balance: account.balance + trade.pnl,
    positions: account.positions.filter((p) => p.id !== trade.id),
    history: [trade, ...account.history].slice(0, HISTORY_LIMIT),
  };
}

/** Checks one position against the move and closes it if a level was reached. */
function checkPosition(spec: SymbolSpec, p: Position, from: number, to: number, now: number): ClosedTrade | null {
  const hit = firstHit(from, to, positionTriggers(spec, p), p.entry);
  if (!hit) return null;
  // Reached smoothly: close exactly at the level. Jumped past it: close at the jumped-to price.
  const exit = hit.mid === hit.t.mid ? hit.t.price : exitPrice(spec, p.side, hit.mid);
  const reason: CloseReason = hit.t.kind === 'fill' ? 'manual' : hit.t.kind;
  return closeTrade(spec, p, exit, reason, now);
}

function processSegment(account: Account, spec: SymbolSpec, from: number, to: number, ctx: Ctx, events: TradeEvent[]): Account {
  let acc = account;
  for (const p of account.positions) {
    if (p.symbol !== spec.id) continue;
    const trade = checkPosition(spec, p, from, to, ctx.now);
    if (trade) {
      acc = withClosed(acc, trade);
      events.push({ kind: 'closed', trade });
    }
  }
  for (const o of account.orders) {
    if (o.symbol !== spec.id) continue;
    const t = fillTrigger(spec, o);
    const hitMid = crossing(from, to, t);
    if (hitMid == null) continue;
    acc = { ...acc, orders: acc.orders.filter((x) => x.id !== o.id) };
    const entry = hitMid === t.mid ? o.price : fillPrice(spec, o.side, hitMid);
    const margin = requiredMargin(spec, o.size, entry, o.leverage);
    const free = summarize(acc, { ...ctx.mids, [spec.id]: hitMid }, ctx.specOf).freeMargin;
    if (margin > free + 1e-9) {
      events.push({ kind: 'rejected', order: o });
      continue;
    }
    const position: Position = {
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      size: o.size,
      entry,
      sl: o.sl,
      tp: o.tp,
      openedAt: ctx.now,
      leverage: o.leverage,
      margin,
      risk: o.sl != null ? stopRisk(spec, o.size, entry, o.sl) : undefined,
      orderType: o.type,
    };
    events.push({ kind: 'filled', order: o, position });
    // The rest of this move can already hit the new position's stop or target.
    const trade = checkPosition(spec, position, hitMid, to, ctx.now);
    if (trade) {
      acc = { ...acc, balance: acc.balance + trade.pnl, history: [trade, ...acc.history].slice(0, HISTORY_LIMIT) };
      events.push({ kind: 'closed', trade });
    } else {
      acc = { ...acc, positions: [...acc.positions, position] };
    }
  }
  return acc;
}

/**
 * Moves the price of one symbol along `path` (mid prices) and applies every fill,
 * stop-loss, take-profit and liquidation it causes, in the order they happen.
 */
export function processPath(account: Account, spec: SymbolSpec, path: number[], ctx: Ctx): { account: Account; events: TradeEvent[] } {
  const events: TradeEvent[] = [];
  let acc = account;
  const touches = acc.positions.some((p) => p.symbol === spec.id) || acc.orders.some((o) => o.symbol === spec.id);
  if (!touches || path.length === 0) return { account, events };
  const pts = path.length === 1 ? [path[0], path[0]] : path;
  for (let i = 1; i < pts.length; i++) acc = processSegment(acc, spec, pts[i - 1], pts[i], ctx, events);
  return { account: events.length ? acc : account, events };
}

/** The order a candle's price most likely took: up candles dip first, down candles spike first. */
export function candlePath([o, h, l, c]: readonly [number, number, number, number]): number[] {
  return c >= o ? [o, l, h, c] : [o, h, l, c];
}

/** Opens a market position or queues a limit/stop order, after checking prices, stops and margin. */
export function placeOrder(
  account: Account,
  spec: SymbolSpec,
  req: OrderRequest,
  mid: number,
  ctx: Ctx,
): { account: Account; error?: PlaceError; event?: TradeEvent } {
  if (!(req.size > 0) || !Number.isFinite(req.size)) return { account, error: 'size' };
  if (!(req.leverage > 0)) return { account, error: 'leverage' };
  const { bid, ask } = quote(spec, mid);
  let entry = fillPrice(spec, req.side, mid);
  if (req.type !== 'market') {
    const price = req.price;
    if (price == null || !(price > 0)) return { account, error: 'price' };
    const ok =
      req.side === 'buy' ? (req.type === 'limit' ? price < ask : price > ask) : req.type === 'limit' ? price > bid : price < bid;
    if (!ok) return { account, error: 'price' };
    entry = price;
  }
  const dir = dirOf(req.side);
  if (req.sl != null && !((entry - req.sl) * dir > 0)) return { account, error: 'sl' };
  if (req.tp != null && !((req.tp - entry) * dir > 0)) return { account, error: 'tp' };
  const margin = requiredMargin(spec, req.size, entry, req.leverage);
  const free = summarize(account, { ...ctx.mids, [spec.id]: mid }, ctx.specOf).freeMargin;
  if (margin > free + 1e-9) return { account, error: 'margin' };

  if (req.type === 'market') {
    const position: Position = {
      id: ctx.newId(),
      symbol: spec.id,
      side: req.side,
      size: req.size,
      entry,
      sl: req.sl,
      tp: req.tp,
      openedAt: ctx.now,
      leverage: req.leverage,
      margin,
      risk: req.sl != null ? stopRisk(spec, req.size, entry, req.sl) : undefined,
      orderType: 'market',
    };
    return { account: { ...account, positions: [...account.positions, position] }, event: { kind: 'opened', position } };
  }
  const order: PendingOrder = {
    id: ctx.newId(),
    symbol: spec.id,
    side: req.side,
    type: req.type,
    price: entry,
    size: req.size,
    sl: req.sl,
    tp: req.tp,
    leverage: req.leverage,
    createdAt: ctx.now,
  };
  return { account: { ...account, orders: [...account.orders, order] }, event: { kind: 'placed', order } };
}

export function closeAt(account: Account, spec: SymbolSpec, id: string, mid: number, now: number): { account: Account; trade?: ClosedTrade } {
  const p = account.positions.find((x) => x.id === id);
  if (!p) return { account };
  const trade = closeTrade(spec, p, exitPrice(spec, p.side, mid), 'manual', now);
  return { account: withClosed(account, trade), trade };
}

export function cancelOrder(account: Account, id: string): Account {
  return { ...account, orders: account.orders.filter((o) => o.id !== id) };
}

/** Closes every position at the given prices and cancels every pending order. */
export function flatten(
  account: Account,
  mids: Record<string, number>,
  now: number,
  specOf: (id: string) => SymbolSpec | undefined = findSymbol,
): Account {
  let acc: Account = { ...account, orders: [] };
  for (const p of account.positions) {
    const spec = specOf(p.symbol);
    const mid = mids[p.symbol];
    if (!spec || mid == null) continue;
    acc = closeAt(acc, spec, p.id, mid, now).account;
  }
  return acc;
}
