/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CHALLENGES, evaluateChallenge, findChallenge, mergeChallenges, plannedRR } from '../src/lib/challenges';
import { feedFromKlines, fetchKlines, mergeFeed, parseKlines } from '../src/lib/marketData';
import { generateMarket, newReplaySession, REPLAY_TOTAL, replayCandles, replayView, stepReplay } from '../src/lib/replay';
import { findSymbol, HISTORY_CANDLES, VISIBLE_CANDLES, type SymbolSpec } from '../src/lib/simulator';
import { equityCurve, maxDrawdown, tradeR, tradeStats } from '../src/lib/stats';
import {
  candlePath,
  emptyAccount,
  liquidationPrice,
  placeOrder,
  processPath,
  requiredMargin,
  riskSize,
  summarize,
  type Account,
  type ClosedTrade,
  type Ctx,
} from '../src/lib/trading';
import { createRng } from '../src/utils/random';

/** A round-number symbol: contract 1, spread 1, so the maths is easy to follow. */
const TEST: SymbolSpec = {
  id: 'TEST',
  label: 'TEST',
  market: 'crypto',
  base: 100,
  decimals: 2,
  vol: 1,
  spread: 1,
  contract: 1,
  sizes: [1, 10, 100],
  sizeUnit: 'u',
  step: 1,
  defaultStop: 5,
};
const specOf = (id: string) => (id === 'TEST' ? TEST : findSymbol(id));

function ctx(now = 1): Ctx {
  let n = 0;
  return { now, newId: () => `id${++n}`, specOf };
}

function open(acc: Account, req: Partial<Parameters<typeof placeOrder>[2]>, mid = 100) {
  const r = placeOrder(acc, TEST, { symbol: 'TEST', side: 'buy', type: 'market', size: 10, leverage: 10, ...req }, mid, ctx());
  assert.equal(r.error, undefined, `unexpected error ${r.error}`);
  return r.account;
}

function trade(pnl: number, extra: Partial<ClosedTrade> = {}): ClosedTrade {
  return { id: `t${Math.random()}`, symbol: 'TEST', side: 'buy', size: 1, entry: 100, openedAt: 0, exit: 100 + pnl, pnl, closedAt: 10, reason: 'manual', ...extra };
}

describe('orders', () => {
  it('fills market orders at the ask / bid with margin = value ÷ leverage', () => {
    const acc = open(emptyAccount(10_000), { side: 'buy', size: 10, leverage: 10 });
    const p = acc.positions[0];
    assert.equal(p.entry, 100.5);
    assert.equal(p.margin, 100.5);
    const sell = open(emptyAccount(10_000), { side: 'sell' }).positions[0];
    assert.equal(sell.entry, 99.5);
  });

  it('validates pending prices, stops and margin', () => {
    const acc = emptyAccount(1000);
    const place = (req: Partial<Parameters<typeof placeOrder>[2]>) =>
      placeOrder(acc, TEST, { symbol: 'TEST', side: 'buy', type: 'limit', size: 1, leverage: 10, price: 95, ...req }, 100, ctx()).error;
    assert.equal(place({}), undefined);
    assert.equal(place({ price: 105 }), 'price'); // a buy limit must be below the market
    assert.equal(place({ type: 'stop', price: 95 }), 'price'); // a buy stop must be above it
    assert.equal(place({ side: 'sell', type: 'limit', price: 105 }), undefined);
    assert.equal(place({ sl: 96 }), 'sl');
    assert.equal(place({ tp: 90 }), 'tp');
    assert.equal(place({ size: 0 }), 'size');
    assert.equal(place({ type: 'market', size: 1000, leverage: 1 }), 'margin');
  });

  it('fills a buy limit when the ask comes down to it, then its take-profit', () => {
    let acc = placeOrder(emptyAccount(10_000), TEST, { symbol: 'TEST', side: 'buy', type: 'limit', size: 10, leverage: 10, price: 95, tp: 100 }, 100, ctx()).account;
    let r = processPath(acc, TEST, [100, 96], ctx());
    assert.equal(r.events.length, 0);
    r = processPath(r.account, TEST, [96, 94, 97], ctx());
    assert.equal(r.events[0].kind, 'filled');
    acc = r.account;
    assert.equal(acc.positions[0].entry, 95);
    assert.equal(acc.positions[0].orderType, 'limit');
    r = processPath(acc, TEST, [97, 101], ctx());
    const closed = r.events.find((e) => e.kind === 'closed');
    assert.ok(closed && closed.kind === 'closed');
    assert.equal(closed.trade.reason, 'tp');
    assert.equal(closed.trade.exit, 100);
    assert.equal(closed.trade.pnl, 50);
    assert.equal(r.account.balance, 10_050);
  });

  it('fills a sell stop on the way down and can stop out in the same move', () => {
    const acc = placeOrder(emptyAccount(10_000), TEST, { symbol: 'TEST', side: 'sell', type: 'stop', size: 1, leverage: 5, price: 98, sl: 99 }, 100, ctx()).account;
    // Falls to the stop (bid 98 = mid 98.5), then rises past the stop-loss (ask 99 = mid 98.5)...
    const r = processPath(acc, TEST, [100, 97, 101], ctx());
    assert.deepEqual(
      r.events.map((e) => e.kind),
      ['filled', 'closed'],
    );
    const t = r.events[1].kind === 'closed' ? r.events[1].trade : null;
    assert.equal(t?.reason, 'sl');
    assert.equal(t?.pnl, -1);
  });

  it('rejects a pending order that no longer has margin when it fills', () => {
    let acc = placeOrder(emptyAccount(1000), TEST, { symbol: 'TEST', side: 'buy', type: 'limit', size: 80, leverage: 10, price: 95 }, 100, ctx()).account;
    acc = open(acc, { size: 5, leverage: 1 }); // uses 502.5 of margin, far from liquidation
    const r = processPath(acc, TEST, [100, 94], ctx());
    assert.ok(r.events.some((e) => e.kind === 'rejected'));
    assert.equal(r.account.orders.length, 0);
    assert.equal(r.account.positions.length, 1);
  });

  it('closes at the level reached first along a candle', () => {
    assert.deepEqual(candlePath([10, 12, 9, 11]), [10, 9, 12, 11]);
    assert.deepEqual(candlePath([10, 12, 9, 9.5]), [10, 12, 9, 9.5]);
    const acc = open(emptyAccount(10_000), { sl: 98, tp: 103, size: 1 });
    // Up candle: dips to 97 first → stop-loss, even though it also reaches the target.
    const r = processPath(acc, TEST, candlePath([100, 105, 97, 104]), ctx());
    const t = r.events[0].kind === 'closed' ? r.events[0].trade : null;
    assert.equal(t?.reason, 'sl');
  });
});

describe('margin and liquidation', () => {
  it('summarises equity, used and free margin and margin level', () => {
    const acc = open(emptyAccount(1000), { size: 10, leverage: 10 }); // margin 100.5
    const s = summarize(acc, { TEST: 110 }, specOf);
    assert.equal(s.usedMargin, 100.5);
    assert.equal(s.openPnl, (109.5 - 100.5) * 10);
    assert.equal(s.equity, 1090);
    assert.equal(s.freeMargin, 1090 - 100.5);
    assert.ok(Math.abs((s.marginLevel ?? 0) - (1090 / 100.5) * 100) < 1e-9);
  });

  it('liquidates when the loss reaches half the margin (a 5% move at 10x)', () => {
    const acc = open(emptyAccount(10_000), { size: 10, leverage: 10 });
    const p = acc.positions[0];
    const liq = liquidationPrice(TEST, p);
    assert.ok(Math.abs(liq - 100.5 * 0.95) < 1e-9);
    const r = processPath(acc, TEST, [100, 90], ctx());
    const t = r.events[0].kind === 'closed' ? r.events[0].trade : null;
    assert.equal(t?.reason, 'liquidation');
    assert.ok(Math.abs((t?.pnl ?? 0) + 0.5 * (p.margin ?? 0)) < 1e-9);
  });

  it('a stop-loss beyond the liquidation price never gets the chance', () => {
    const acc = open(emptyAccount(10_000), { size: 10, leverage: 50, sl: 95 }); // liq ≈ 1% below
    const r = processPath(acc, TEST, [100, 94], ctx());
    const t = r.events[0].kind === 'closed' ? r.events[0].trade : null;
    assert.equal(t?.reason, 'liquidation');
  });

  it('sizes by risk: risk amount ÷ stop distance, rounded down to the step', () => {
    const eurusd = findSymbol('EURUSD')!;
    // 1% of $10,000 = $100 over a 20-pip stop ($200 per lot) → 0.5 lot.
    assert.equal(riskSize(eurusd, 10_000, 1, 0.002), 0.5);
    const btc = findSymbol('BTCUSDT')!;
    // $200 over a $400 stop → 0.5 BTC.
    assert.equal(riskSize(btc, 10_000, 2, 400), 0.5);
    assert.equal(riskSize(btc, 100, 0.5, 4000), 0);
    assert.ok(Math.abs(requiredMargin(eurusd, 1, 1.1, 20) - 5500) < 1e-9);
  });
});

describe('stats', () => {
  const history = [trade(-50, { sl: 95, risk: 50 }), trade(200, { sl: 98, risk: 100 }), trade(-100), trade(100)]; // newest first

  it('rebuilds the closed-trade equity curve from the final balance', () => {
    assert.deepEqual(equityCurve(history, 10_150), [10_000, 10_100, 10_000, 10_200, 10_150]);
  });

  it('computes win rate, averages, profit factor, R and drawdown', () => {
    const s = tradeStats(history, 10_150);
    assert.equal(s.count, 4);
    assert.equal(s.winRate, 0.5);
    assert.equal(s.avgWin, 150);
    assert.equal(s.avgLoss, 75);
    assert.equal(s.profitFactor, 2);
    assert.equal(s.avgR, (2 + -1) / 2);
    assert.equal(s.rCount, 2);
    assert.equal(s.net, 150);
    assert.ok(Math.abs(s.maxDrawdown - 100 / 10_100) < 1e-12);
    assert.equal(s.maxDrawdownUsd, 100);
  });

  it('handles empty and loss-free histories', () => {
    assert.equal(tradeStats([], 10_000).winRate, null);
    assert.equal(tradeStats([trade(10)], 10_010).profitFactor, Infinity);
    assert.deepEqual(maxDrawdown([100, 120, 90, 130]), { pct: 0.25, usd: 30 });
  });

  it('rebuilds R from the stop-loss for older trades', () => {
    assert.equal(tradeR(trade(-10, { symbol: 'BTCUSDT', sl: 90 })), -1);
    assert.equal(tradeR(trade(10)), null);
  });
});

describe('challenges', () => {
  const rec = { startedAt: 5, startBalance: 10_000 };
  const byId = (id: string) => findChallenge(id)!;

  it('has at least 4 challenges with rewards', () => {
    assert.ok(CHALLENGES.length >= 4);
    for (const c of CHALLENGES) assert.ok(c.xp > 0 && c.coins > 0);
  });

  it('counts only trades closed after the start', () => {
    const old = trade(10, { sl: 90, closedAt: 1 });
    const s = evaluateChallenge(byId('stops5'), rec, [trade(5, { sl: 90 }), old]);
    assert.equal(s.label, '۱ از ۵');
    assert.equal(evaluateChallenge(byId('stops5'), undefined, []).done, false);
  });

  it('three winners in a row; a loss resets the run', () => {
    const c = byId('streak3');
    assert.equal(evaluateChallenge(c, rec, [trade(1), trade(1), trade(-1), trade(1)]).done, false);
    assert.equal(evaluateChallenge(c, rec, [trade(1), trade(1), trade(1), trade(-1)]).done, true);
  });

  it('needs a 1:2 plan that hit its target', () => {
    const c = byId('rr2');
    assert.equal(plannedRR({ entry: 100, sl: 95, tp: 110 }), 2);
    assert.equal(evaluateChallenge(c, rec, [trade(10, { sl: 95, tp: 110, reason: 'tp' })]).done, true);
    assert.equal(evaluateChallenge(c, rec, [trade(5, { sl: 95, tp: 105, reason: 'tp' })]).done, false);
  });

  it('10% without a 5% drawdown, in the order trades happened', () => {
    const c = byId('profit10');
    assert.equal(evaluateChallenge(c, rec, [trade(600), trade(500)]).done, true);
    const failed = evaluateChallenge(c, rec, [trade(2000), trade(-600)]); // −6% first
    assert.equal(failed.failed, true);
    assert.equal(failed.done, false);
  });

  it('fails the no-liquidation run on a liquidation', () => {
    const s = evaluateChallenge(byId('noLiq10'), rec, [trade(-5, { reason: 'liquidation' }), trade(1)]);
    assert.equal(s.failed, true);
  });

  it('keeps finished challenges from both devices when merging', () => {
    const m = mergeChallenges(
      { a: { startedAt: 1, startBalance: 1 }, b: { startedAt: 2, startBalance: 1, completedAt: 9 } },
      { a: { startedAt: 3, startBalance: 1, completedAt: 7 }, c: { startedAt: 4, startBalance: 1 } },
    );
    assert.equal(m.a.completedAt, 7);
    assert.equal(m.b.completedAt, 9);
    assert.ok(m.c);
  });
});

describe('replay', () => {
  const btc = findSymbol('BTCUSDT')!;

  it('is deterministic for a symbol and seed', () => {
    assert.deepEqual(replayCandles(btc, 42).slice(0, 5), generateMarket(btc, REPLAY_TOTAL, createRng(42)).slice(0, 5));
    assert.deepEqual(newReplaySession('BTCUSDT', 7, 10_000), newReplaySession('BTCUSDT', 7, 10_000));
    for (const [o, h, l, c] of replayCandles(btc, 42)) assert.ok(h >= Math.max(o, c) && l <= Math.min(o, c));
  });

  it('starts at a point with history behind and room ahead', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = newReplaySession('ETHUSDT', seed, 10_000);
      assert.ok(s.start >= VISIBLE_CANDLES && s.start <= REPLAY_TOTAL - 120);
      const shown = replayView(findSymbol('ETHUSDT')!, s).candles.length;
      assert.ok(shown >= VISIBLE_CANDLES && shown <= HISTORY_CANDLES && shown === Math.min(s.start, HISTORY_CANDLES));
    }
  });

  it('steps candle by candle and trades against each candle', () => {
    const session = newReplaySession('BTCUSDT', 3, 10_000);
    const candles = replayCandles(btc, 3);
    const price = candles[session.cursor - 1][3];
    let acc = placeOrder(emptyAccount(10_000), btc, { symbol: 'BTCUSDT', side: 'buy', type: 'market', size: 0.01, leverage: 5, sl: price - 300, tp: price + 300 }, price, ctx()).account;
    let s = session;
    let closed = false;
    for (let i = 0; i < 200 && !closed && s.cursor < REPLAY_TOTAL; i++) {
      const r = stepReplay(acc, s, 1, ctx());
      acc = r.account;
      s = r.session;
      closed = r.events.some((e) => e.kind === 'closed');
    }
    assert.equal(s.cursor > session.cursor, true);
    assert.equal(closed, true);
    assert.equal(acc.history.length, 1);
    assert.ok(['sl', 'tp'].includes(acc.history[0].reason));
  });
});

describe('live market data', () => {
  const raw = [
    [1000, '100.0', '110.0', '95.0', '105.0', '12.5', 1059, '0', 1, '0', '0', '0'],
    [2000, '105.0', '106.0', '101.0', '102.0', '3', 2059, '0', 1, '0', '0', '0'],
  ];

  it('parses klines and rejects error bodies', () => {
    const k = parseKlines(raw);
    assert.deepEqual(k[0], { openTime: 1000, candle: [100, 110, 95, 105], volume: 12.5 });
    assert.throws(() => parseKlines({ code: 0, msg: 'restricted' }));
  });

  it('updates the forming candle and appends new ones', () => {
    const feed = feedFromKlines(parseKlines(raw));
    const next = mergeFeed(
      feed,
      parseKlines([
        [2000, '105.0', '107.0', '101.0', '106.5', '4', 0, '0', 1, '0', '0', '0'],
        [3000, '106.5', '106.5', '106.5', '106.5', '0.1', 0, '0', 1, '0', '0', '0'],
      ]),
      2,
    );
    assert.deepEqual(next.candles, [
      [105, 107, 101, 106.5],
      [106.5, 106.5, 106.5, 106.5],
    ]);
    assert.equal(next.lastOpen, 3000);
    assert.deepEqual(next.volumes, [4, 0.1]);
  });

  it('falls through to the next host and reports failures', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      if (url.startsWith('https://a')) return { ok: false, status: 451, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => raw };
    };
    const r = await fetchKlines('BTCUSDT', 2, { fetchImpl, hosts: ['https://a', 'https://b'] });
    assert.equal(r.host, 'https://b');
    assert.equal(r.klines.length, 2);
    assert.equal(calls.length, 2);
    await assert.rejects(fetchKlines('BTCUSDT', 2, { fetchImpl, hosts: ['https://a'] }));
  });
});

describe('live sources', () => {
  it('follows EUR/USD and gold with Binance pairs', async () => {
    const { binanceSymbol, supportsLive } = await import('../src/lib/marketData');
    assert.equal(binanceSymbol('EURUSD'), 'EURUSDT');
    assert.equal(binanceSymbol('XAUUSD'), 'PAXGUSDT');
    assert.equal(binanceSymbol('BTCUSDT'), 'BTCUSDT');
    assert.ok(supportsLive('XAUUSD'));
    assert.ok(!supportsLive('GBPUSD'));
  });

  it('has live prices for every symbol, Tether Gold among them, with sizes and decimals that fit the price', async () => {
    const { LIVE_SOURCES } = await import('../src/lib/marketData');
    const { SYMBOLS } = await import('../src/lib/simulator');
    assert.equal(LIVE_SOURCES.XAUTUSDT, 'XAUTUSDT');
    assert.ok(SYMBOLS.length >= 15);
    for (const s of SYMBOLS) {
      assert.ok(LIVE_SOURCES[s.id], `${s.id} has a Binance pair`);
      assert.deepEqual([...s.sizes].sort((a, b) => a - b), s.sizes, `${s.id} sizes go up`);
      // A price step is visible at the symbol's decimals, and the default stop is a few steps away.
      assert.ok(s.vol >= 10 ** -s.decimals, `${s.id} moves at its decimals`);
      assert.ok(s.defaultStop > s.spread && s.step > 0, `${s.id} stop beyond the spread`);
      // The middle size is a sensible practice trade on a 10,000 account.
      const notional = s.sizes[1] * s.contract * s.base;
      assert.ok(notional >= 20 && notional <= 120_000, `${s.id} middle size is ${notional}`);
    }
  });

  it('lists every symbol with the learner\'s market first, and polls the pairs that matter often', async () => {
    const { symbolsFor, SYMBOLS } = await import('../src/lib/simulator');
    const crypto = symbolsFor('crypto');
    assert.equal(crypto.length, SYMBOLS.length);
    assert.equal(crypto[0].market, 'crypto');
    assert.equal(crypto[crypto.length - 1].market, 'forex');
    assert.ok(crypto.some((s) => s.id === 'XAUUSD'));
    assert.equal(symbolsFor('forex')[0].id, 'EURUSD');
    const { fastSymbols } = await import('../src/components/sim/useMarketFeed');
    assert.deepEqual(fastSymbols('SOLUSDT', ['BTCUSDT', 'SOLUSDT']), ['BTCUSDT', 'SOLUSDT']);
    assert.deepEqual(fastSymbols(null, []), []);
  });

  it('knows when the real forex market is shut for the weekend', async () => {
    const { forexWeekend } = await import('../src/lib/marketData');
    assert.ok(!forexWeekend(new Date(Date.UTC(2026, 8, 25, 20, 0)))); // Friday 20:00
    assert.ok(forexWeekend(new Date(Date.UTC(2026, 8, 25, 22, 0)))); // Friday 22:00
    assert.ok(forexWeekend(new Date(Date.UTC(2026, 8, 26, 12, 0)))); // Saturday
    assert.ok(forexWeekend(new Date(Date.UTC(2026, 8, 27, 20, 0)))); // Sunday 20:00
    assert.ok(!forexWeekend(new Date(Date.UTC(2026, 8, 27, 22, 0)))); // Sunday 22:00
  });
});
