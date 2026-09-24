import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countdownLabel, dateLabel, timeTicks } from '../src/lib/chartMath';
import { followLive, klinesUrl, TIMEFRAMES, timeframeSpec, type Feed } from '../src/lib/marketData';

const H1 = 60 * 60_000;

describe('chart timeframes', () => {
  it('map MetaTrader names to Binance intervals, longest last', () => {
    assert.deepEqual(TIMEFRAMES.map((t) => t.id), ['M1', 'M5', 'M15', 'H1', 'H4', 'D1']);
    assert.equal(timeframeSpec('H4').interval, '4h');
    assert.equal(timeframeSpec('nope').id, 'M1');
    for (let i = 1; i < TIMEFRAMES.length; i++) assert.ok(TIMEFRAMES[i].ms > TIMEFRAMES[i - 1].ms);
    assert.ok(klinesUrl('https://h', 'BTCUSDT', 150, timeframeSpec('D1').interval).includes('interval=1d&limit=150'));
  });

  it('let the forming candle follow the live price', () => {
    const feed: Feed = { candles: [[10, 12, 9, 11], [11, 13, 10, 12]], volumes: [5, 6], lastOpen: 2 * H1 };
    const up = followLive(feed, 14, 2 * H1 + 1000, H1);
    assert.deepEqual(up.candles[1], [11, 14, 10, 14]);
    assert.deepEqual(up.times, [H1, 2 * H1]);
    const down = followLive(feed, 8, 2 * H1 + 1000, H1);
    assert.deepEqual(down.candles[1], [11, 13, 8, 8]);
    assert.deepEqual(feed.candles[1], [11, 13, 10, 12], 'the stored feed is left alone');
  });

  it('start a new candle when the period is over, before the next poll', () => {
    const feed: Feed = { candles: [[10, 12, 9, 11]], volumes: [5], lastOpen: H1 };
    const next = followLive(feed, 11.5, 2 * H1 + 5000, H1);
    assert.equal(next.candles.length, 2);
    assert.deepEqual(next.candles[1], [11.5, 11.5, 11.5, 11.5]);
    assert.equal(next.lastOpen, 2 * H1);
    assert.deepEqual(next.times, [H1, 2 * H1]);
  });

  it('count down hours for long candles and label days by date', () => {
    assert.equal(countdownLabel(59), '00:59');
    assert.equal(countdownLabel(3600 * 3 + 65), '3:01:05');
    const noon = new Date(2026, 8, 24, 12).getTime();
    assert.equal(dateLabel(noon), '09/24');
    const days = Array.from({ length: 40 }, (_, i) => noon + i * 86_400_000);
    const ticks = timeTicks(days, 0, days.length - 1, 5);
    assert.ok(ticks.length > 0 && ticks.every((t) => t.date));
    const minutes = Array.from({ length: 60 }, (_, i) => noon + i * 60_000);
    assert.ok(timeTicks(minutes, 0, 59, 5).every((t) => !t.date));
  });
});
