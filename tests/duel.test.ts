/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Candle } from '../src/content/types';
import {
  atr,
  botResult,
  buildRounds,
  CHART_AHEAD,
  CHART_SHOWN,
  chartActual,
  chartPoints,
  compareDuel,
  duelPlan,
  fallbackCandles,
  parseResult,
  parseRounds,
  pickQuestions,
  positionPnl,
  questionPool,
  QUIZ_COUNT,
  quizPoints,
  TRADE_HISTORY,
  TRADE_REPLAY,
  tradeClose,
  tradeEquity,
  tradeOpen,
  tradeResult,
  tradeStart,
  tradeStep,
  type DuelChart,
  type DuelResult,
} from '../src/lib/duel';

const flat = (n: number, price = 100): Candle[] => Array.from({ length: n }, () => [price, price + 1, price - 1, price] as Candle);

const makeRounds = (seed: number) =>
  buildRounds(
    seed,
    { symbol: 'BTCUSDT', label: 'BTC/USDT', decimals: 1, candles: fallbackCandles(`c${seed}`, CHART_SHOWN + CHART_AHEAD, 60000, 150, 1) },
    { symbol: 'XAUUSD', label: 'XAU/USD', decimals: 2, candles: fallbackCandles(`t${seed}`, TRADE_HISTORY + TRADE_REPLAY, 4200, 5, 2) },
    false,
  );

describe('duel setup', () => {
  it('draws five questions from the lessons, the same for both players', () => {
    assert.ok(questionPool().length > 200);
    const a = pickQuestions(42);
    assert.equal(a.length, QUIZ_COUNT);
    assert.deepEqual(pickQuestions(42), a);
    assert.notDeepEqual(pickQuestions(43), a);
    assert.equal(new Set(a.map((q) => q.prompt)).size, QUIZ_COUNT);
  });

  it('picks two different past windows from the seed', () => {
    const now = Date.UTC(2026, 8, 24, 12, 0);
    const p = duelPlan(7, now);
    assert.deepEqual(duelPlan(7, now), p);
    assert.notEqual(p.chart.symbol, p.trade.symbol);
    assert.equal(p.chart.limit, CHART_SHOWN + CHART_AHEAD);
    assert.equal(p.trade.limit, TRADE_HISTORY + TRADE_REPLAY);
    assert.equal(p.chart.endTime % 3_600_000, 0);
    assert.ok(p.chart.endTime < now - 2 * 86_400_000 && p.chart.endTime > now - 710 * 86_400_000);
  });

  it('makes the same stand-in candles for the same seed', () => {
    const a = fallbackCandles('x', 80, 4200, 5, 2);
    assert.equal(a.length, 80);
    assert.deepEqual(fallbackCandles('x', 80, 4200, 5, 2), a);
    for (const [o, h, l, c] of a) assert.ok(h >= Math.max(o, c) && l <= Math.min(o, c));
  });
});

describe('duel scoring', () => {
  it('rewards right and fast answers', () => {
    assert.equal(quizPoints(true, 15), 160);
    assert.equal(quizPoints(true, 0), 100);
    assert.equal(quizPoints(false, 10), 0);
  });

  it('scores a chart guess by how close it is, in typical candle sizes', () => {
    const candles = [...flat(CHART_SHOWN), ...flat(CHART_AHEAD - 1), [100, 104, 100, 103] as Candle];
    const chart: DuelChart = { symbol: 'X', label: 'X', decimals: 2, candles };
    assert.equal(atr(flat(20)), 2);
    assert.equal(chartActual(chart), 103);
    assert.equal(chartPoints(chart, 103), 100);
    assert.equal(chartPoints(chart, 100), 50);
    assert.equal(chartPoints(chart, 90), 0);
  });

  it('trades with ten times leverage, stops and closes at the end', () => {
    const rising: Candle[] = [...flat(TRADE_HISTORY), ...Array.from({ length: TRADE_REPLAY }, (_, i) => [100 + i, 101 + i, 99.5 + i, 101 + i] as Candle)];
    const chart: DuelChart = { symbol: 'X', label: 'X', decimals: 2, candles: rising };
    let s = tradeOpen(chart, tradeStart(), 1);
    assert.equal(s.pos?.entry, 100);
    assert.equal(s.pos?.stop, 96);
    s = tradeStep(chart, s);
    assert.equal(Math.round(tradeEquity(chart, s)), 1000 + 100);
    assert.equal(positionPnl({ side: -1, entry: 100, stop: 103 }, 101), -100);
    s = tradeClose(chart, s);
    assert.equal(s.pos, null);
    assert.equal(Math.round(s.cash), 1100);

    // A short in a rising market hits its stop.
    let short = tradeOpen(chart, tradeStart(), -1);
    for (let i = 0; i < 5; i++) short = tradeStep(chart, short);
    assert.equal(short.pos, null);
    assert.equal(short.stops, 1);
    assert.equal(Math.round(short.cash), 1000 - 400);

    const end = tradeResult(chart, tradeOpen(chart, tradeStart(), 1));
    assert.deepEqual(end, { pnl: 0, trades: 1 });
  });
});

describe('Shamak the bot', () => {
  it('plays the same way for the same duel, and better on hard', () => {
    const r = makeRounds(3);
    assert.deepEqual(botResult(r, 'normal'), botResult(r, 'normal'));
    let easy = 0;
    let hard = 0;
    for (let seed = 0; seed < 40; seed++) {
      const rounds = makeRounds(seed);
      easy += botResult(rounds, 'easy').quiz.points + botResult(rounds, 'easy').chart.points;
      hard += botResult(rounds, 'hard').quiz.points + botResult(rounds, 'hard').chart.points;
    }
    assert.ok(hard > easy * 1.3);
    const res = botResult(r, 'hard');
    assert.ok(parseResult(res));
  });
});

describe('comparing duels', () => {
  const result = (quiz: number, chart: number, pnl: number): DuelResult => ({ quiz: { correct: 3, points: quiz }, chart: { guess: 1, points: chart }, trade: { pnl, trades: 2 } });

  it('counts rounds won and breaks level duels on the trade round', () => {
    const c = compareDuel(result(400, 60, 50), result(300, 80, -20));
    assert.deepEqual(c.rounds, { quiz: 'win', chart: 'loss', trade: 'win' });
    assert.equal(c.outcome, 'win');
    assert.equal(compareDuel(result(400, 60, 10), result(300, 60, 50)).outcome, 'loss');
    assert.equal(compareDuel(result(300, 60, 10), result(300, 60, 10)).outcome, 'tie');
  });
});

describe('duel data from the server', () => {
  it('accepts a real duel and refuses broken ones', () => {
    const rounds = makeRounds(11);
    const back = parseRounds(JSON.parse(JSON.stringify(rounds)));
    assert.deepEqual(back, rounds);
    assert.equal(parseRounds({ ...rounds, v: 99 }), null);
    assert.equal(parseRounds({ ...rounds, chart: { ...rounds.chart, candles: rounds.chart.candles.slice(1) } }), null);
    assert.equal(parseRounds({ ...rounds, quiz: [{ kind: 'choice', prompt: 'x', options: ['a'], answer: 3 }] }), null);
    assert.equal(parseResult({ quiz: { correct: 9, points: 0 }, chart: { guess: 1, points: 0 }, trade: { pnl: 0, trades: 0 } }), null);
  });
});
