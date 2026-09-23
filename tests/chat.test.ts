/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildChart, hasBlockedContent, mergeMessages, messageProblem, parseChart, parseMessage, roomTime, type ChatMessage } from '../src/lib/chat';

const msg = (id: number, body = 'x'): ChatMessage => ({ id, author_name: 'a', body, kind: 'text', chart: null, created_at: '2026-09-23T10:00:00Z', mine: false });

describe('chat rules', () => {
  it('blocks links, handles and phone numbers like the server does', () => {
    for (const bad of ['کانال ما t.me/xyz', 'https://x.org', 'www.site.ir', 'سایت bestsignal.com', 'آیدی @signalking', 'تماس 09121234567', 'تماس +989121234567', 'شماره ۰۹۱۲۱۲۳۴۵۶۷', 'telegram.me/abc'])
      assert.ok(hasBlockedContent(bad), bad);
    for (const ok of ['طلا روی 2350.5 حمایت داره', 'هدف 2400 و حد ضرر 2330', 'RSI بالای 70 هست', 'BTC/USDT روی 60,123.4', 'ریسک 1% کافیه', 'تون کوین مال تلگرامه'])
      assert.ok(!hasBlockedContent(ok), ok);
  });

  it('checks messages before sending', () => {
    assert.equal(messageProblem('   '), 'empty');
    assert.equal(messageProblem('', true), null);
    assert.equal(messageProblem('x'.repeat(1001)), 'long');
    assert.equal(messageProblem('join t.me/abc'), 'links');
    assert.equal(messageProblem('سلام'), null);
  });
});

describe('chat messages', () => {
  it('merges new messages without duplicates, oldest first', () => {
    const merged = mergeMessages([msg(3), msg(1)], [msg(2), msg(3, 'edited'), msg(4)]);
    assert.deepEqual(merged.map((m) => m.id), [1, 2, 3, 4]);
    assert.equal(merged[2].body, 'edited');
  });

  it('keeps only well-formed numbers from a shared chart', () => {
    const candles = Array.from({ length: 10 }, (_, i) => [100 + i, 101 + i, 99 + i, 100.5 + i]);
    const chart = parseChart({ symbol: 'XAUUSD', label: 'XAU/USD', decimals: 2, candles: [...candles, ['x', 1, 2, 3], [1, 2]], side: 'buy', entry: 105, sl: 'no', levels: [100, Infinity, 'a', 101] });
    assert.ok(chart);
    assert.equal(chart.candles.length, 10);
    assert.equal(chart.side, 'buy');
    assert.equal(chart.entry, 105);
    assert.equal(chart.sl, undefined);
    assert.deepEqual(chart.levels, [100, 101]);
    // A candle with its high below its low is put right rather than trusted.
    assert.deepEqual(parseChart({ candles: Array.from({ length: 5 }, () => [10, 5, 20, 12]) })!.candles[0], [10, 20, 5, 12]);
  });

  it('refuses charts that are missing or too small', () => {
    assert.equal(parseChart(null), null);
    assert.equal(parseChart('chart'), null);
    assert.equal(parseChart({ candles: [[1, 2, 0, 1]] }), null);
    assert.equal(parseMessage({ id: 5, author_name: 'رضا', body: 'hi', kind: 'analysis', chart: { candles: 'x' }, mine: true }).chart, null);
  });

  it('builds a compact, rounded chart for an analysis', () => {
    const candles = Array.from({ length: 150 }, (_, i) => [1.0850123 + i / 1e5, 1.0851234, 1.0849, 1.0850999] as [number, number, number, number]);
    const chart = buildChart({ id: 'EURUSD', label: 'EUR/USD', decimals: 5 }, candles, { side: 'sell', entry: 1.0851234567, levels: [1.09, 1.08, 1.07, 1.06, 1.05, 1.04] });
    assert.equal(chart.candles.length, 60);
    assert.equal(chart.candles[0][1], 1.08512);
    assert.equal(chart.entry, 1.08512);
    assert.equal(chart.levels!.length, 5);
    assert.ok(JSON.stringify(chart).length < 12000);
    assert.equal(parseChart(chart)!.candles.length, 60);
  });

  it('shows today as a time and yesterday as a word', () => {
    const now = new Date(2026, 8, 23, 18, 0);
    assert.equal(roomTime(new Date(2026, 8, 23, 9, 5).toISOString(), now), '۰۹:۰۵');
    assert.equal(roomTime(new Date(2026, 8, 22, 23, 0).toISOString(), now), 'دیروز');
    assert.equal(roomTime('nope', now), '');
  });
});
