import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { findUnit } from '../src/content';
import { COACH_MIN_TRADES, coachInsights, faSpan } from '../src/lib/journalCoach';
import type { ClosedTrade } from '../src/lib/trading';

const MIN = 60_000;
let seq = 0;

/** A closed BTC trade; `at` is when it opened (minutes), `mins` how long it stayed open. */
function trade(p: Partial<ClosedTrade> & { pnl: number; at: number; mins?: number }): ClosedTrade {
  const openedAt = p.at * MIN;
  return {
    id: `t${seq++}`,
    symbol: 'BTCUSDT',
    side: 'buy',
    size: 0.01,
    entry: 84_000,
    exit: 84_000,
    leverage: 5,
    sl: 83_000,
    risk: 100,
    reason: 'manual',
    note: 'setup',
    closedAt: openedAt + (p.mins ?? 10) * MIN,
    ...p,
    openedAt,
  };
}

/** History is stored newest first. */
const newestFirst = (trades: ClosedTrade[]) => trades.slice().sort((a, b) => b.closedAt - a.closedAt);
const ids = (trades: ClosedTrade[], balance = 10_000) => coachInsights(newestFirst(trades), balance).insights.map((i) => i.id);

describe('journal coach', () => {
  it('waits for trades and says how many more make a full read', () => {
    assert.deepEqual(coachInsights([], 10_000), { insights: [], needMore: COACH_MIN_TRADES });
    assert.equal(coachInsights([trade({ pnl: 10, at: 0 })], 10_000).needMore, COACH_MIN_TRADES - 1);
  });

  it('names liquidations from the first one', () => {
    assert.ok(ids([trade({ pnl: -500, at: 0, reason: 'liquidation' })]).includes('liquidation'));
  });

  it('flags missing stop-losses and praises always using them', () => {
    const noStops = [0, 20, 40].map((at) => trade({ pnl: 10, at, sl: undefined, risk: undefined }));
    assert.ok(ids(noStops).includes('no-stops'));
    const stops = [0, 20, 40, 60, 80].map((at) => trade({ pnl: at % 40 ? -50 : 60, at }));
    assert.ok(ids(stops).includes('all-stops'));
    assert.ok(!ids(stops).includes('no-stops'));
  });

  it('flags risking more than 3% of the balance on a trade', () => {
    const big = [0, 20, 40].map((at) => trade({ pnl: 50, at, risk: 600 }));
    assert.ok(ids(big).includes('big-risk'));
    const small = [0, 20, 40].map((at) => trade({ pnl: 50, at, risk: 150 }));
    assert.ok(!ids(small).includes('big-risk'));
  });

  it('flags very high leverage', () => {
    assert.ok(ids([trade({ pnl: 20, at: 0, leverage: 50 })]).includes('leverage'));
    assert.ok(!ids([trade({ pnl: 20, at: 0, leverage: 5 })]).includes('leverage'));
  });

  it('flags losses bigger than wins when the win rate doesn’t make up for it', () => {
    const bad = [trade({ pnl: 40, at: 0 }), trade({ pnl: 40, at: 20 }), trade({ pnl: -120, at: 40 }), trade({ pnl: -120, at: 60 }), trade({ pnl: -120, at: 80 })];
    assert.ok(ids(bad).includes('payoff'));
    const good = [trade({ pnl: 200, at: 0 }), trade({ pnl: 200, at: 20 }), trade({ pnl: -60, at: 40 }), trade({ pnl: -60, at: 60 }), trade({ pnl: -60, at: 80 })];
    assert.ok(ids(good).includes('good-payoff'));
    assert.ok(!ids(good).includes('payoff'));
  });

  it('spots revenge trades opened right after a loss', () => {
    // Each loss closes at at+10 and the next trade opens a minute later.
    const trades = [trade({ pnl: -50, at: 0 }), trade({ pnl: -50, at: 11 }), trade({ pnl: -50, at: 22 }), trade({ pnl: 30, at: 33 })];
    assert.ok(ids(trades).includes('revenge'));
    const calm = [trade({ pnl: -50, at: 0 }), trade({ pnl: -50, at: 60 }), trade({ pnl: -50, at: 120 }), trade({ pnl: 30, at: 180 })];
    assert.ok(!ids(calm).includes('revenge'));
  });

  it('spots holding losers much longer than winners', () => {
    const trades = [
      ...[0, 100, 200].map((at) => trade({ pnl: 40, at, mins: 2 })),
      ...[300, 400, 500].map((at) => trade({ pnl: -40, at, mins: 30 })),
    ];
    assert.ok(ids(trades).includes('hold-losers'));
  });

  it('spots overtrading: ten trades in an hour', () => {
    const trades = Array.from({ length: 10 }, (_, i) => trade({ pnl: i % 2 ? 10 : -10, at: i * 5, mins: 2 }));
    assert.ok(ids(trades).includes('overtrading'));
  });

  it('compares buys with sells and the best symbol with the worst', () => {
    const trades = [
      ...[0, 20, 40, 60].map((at) => trade({ pnl: 50, at, side: 'buy' })),
      ...[80, 100, 120, 140].map((at) => trade({ pnl: -50, at, side: 'sell', symbol: 'ETHUSDT' })),
    ];
    const found = ids(trades);
    assert.ok(found.includes('side'));
    assert.ok(found.includes('symbols'));
  });

  it('asks for notes when few trades have one', () => {
    const trades = [0, 20, 40, 60, 80].map((at) => trade({ pnl: 10, at, note: undefined }));
    assert.ok(ids(trades).includes('notes'));
  });

  it('puts warnings before tips before praise, and links only to units that exist', () => {
    const trades = [trade({ pnl: -500, at: 0, reason: 'liquidation', leverage: 50, sl: undefined, risk: undefined }), ...[20, 40, 60, 80].map((at) => trade({ pnl: 10, at, note: undefined }))];
    const { insights } = coachInsights(newestFirst(trades), 10_000);
    const order = { warn: 0, tip: 1, good: 2 };
    for (let i = 1; i < insights.length; i++) assert.ok(order[insights[i - 1].tone] <= order[insights[i].tone]);
    for (const i of insights) if (i.unitId) assert.ok(findUnit(i.unitId), i.unitId);
    const source = readFileSync(join(__dirname, '../src/lib/journalCoach.ts'), 'utf8');
    for (const [, unitId] of source.matchAll(/unitId: '([^']+)'/g)) assert.ok(findUnit(unitId), unitId);
  });

  it('writes spans in words', () => {
    assert.equal(faSpan(45_000), '۴۵ ثانیه');
    assert.equal(faSpan(3 * MIN), '۳ دقیقه');
    assert.equal(faSpan(2 * 60 * MIN), '۲ ساعت');
  });
});
