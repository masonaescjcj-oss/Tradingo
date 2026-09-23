/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  chartWindow,
  CHART_SHIFT,
  clockLabel,
  countdownLabel,
  nextZoom,
  niceStep,
  priceTicks,
  quoteParts,
  spreadLabels,
  timeTicks,
  ZOOMS,
  zoomFor,
} from '../src/lib/chartMath';
import {
  applyTick,
  backfillTimes,
  findSymbol,
  HISTORY_CANDLES,
  nudgeSize,
  simCountdown,
  TICKS_PER_CANDLE,
  tickTimes,
} from '../src/lib/simulator';
import type { Candle } from '../src/content/types';

describe('price axis', () => {
  it('picks round steps', () => {
    assert.equal(niceStep(10, 5), 2);
    assert.equal(niceStep(0.0042, 6), 0.001);
    assert.equal(niceStep(123, 5), 25);
    assert.equal(niceStep(0, 5), 1);
  });

  it('lists round prices inside the range without float noise', () => {
    assert.deepEqual(priceTicks(1.0843, 1.0871, 6), [1.0845, 1.085, 1.0855, 1.086, 1.0865, 1.087]);
    assert.deepEqual(priceTicks(2341.2, 2358.9, 4), [2345, 2350, 2355]);
    for (const t of priceTicks(0.1, 0.7, 6)) assert.equal(String(t).length <= 4, true);
  });
});

describe('zoom and pan window', () => {
  it('shows the latest candles with empty slots after them', () => {
    const w = chartWindow(150, 45, 0);
    assert.equal(w.right, 150 + CHART_SHIFT);
    assert.equal(w.left, 150 + CHART_SHIFT - 45);
    assert.equal(w.to, 149);
    assert.equal(w.from, Math.floor(w.left));
  });

  it('pans back and stops at the oldest candle', () => {
    const w = chartWindow(150, 45, 30);
    assert.equal(w.to, 150 + CHART_SHIFT - 30 - 1);
    const far = chartWindow(150, 45, 1e6);
    assert.equal(far.left, 0);
    assert.equal(far.from, 0);
    assert.equal(chartWindow(150, 45, -5).right, 150 + CHART_SHIFT);
  });

  it('handles fewer candles than slots', () => {
    const w = chartWindow(20, 45, 10);
    assert.equal(w.maxOffset, 0);
    assert.equal(w.from, 0);
    assert.equal(w.to, 19);
  });

  it('steps through the zoom levels and clamps at the ends', () => {
    assert.equal(nextZoom(45, 1), 30);
    assert.equal(nextZoom(45, -1), 60);
    assert.equal(nextZoom(ZOOMS[0], 1), ZOOMS[0]);
    assert.equal(nextZoom(ZOOMS[ZOOMS.length - 1], -1), ZOOMS[ZOOMS.length - 1]);
    assert.equal(zoomFor(320), 45);
  });
});

describe('time axis', () => {
  const minute = 60_000;
  const t0 = Date.UTC(2026, 8, 23, 10, 0, 0);

  it('labels the first candle of each round period', () => {
    const times = backfillTimes(60, t0 + 59 * minute, minute);
    const ticks = timeTicks(times, 0, 59, 6);
    assert.ok(ticks.length >= 4 && ticks.length <= 7);
    for (const { index, seconds } of ticks) {
      assert.equal(seconds, false);
      assert.equal(new Date(times[index]).getUTCMinutes() % 10, 0);
    }
  });

  it('uses seconds for fast simulated candles', () => {
    const times = backfillTimes(20, t0, 8000);
    const ticks = timeTicks(times, 0, 19, 12);
    assert.ok(ticks.length > 0);
    assert.ok(ticks.every((t) => t.seconds));
  });

  it('formats clocks and countdowns', () => {
    const d = new Date(2026, 8, 23, 9, 5, 7).getTime();
    assert.equal(clockLabel(d), '09:05');
    assert.equal(clockLabel(d, true), '09:05:07');
    assert.equal(countdownLabel(7), '00:07');
    assert.equal(countdownLabel(59.2), '01:00');
    assert.equal(countdownLabel(-3), '00:00');
  });
});

describe('candle times and countdown of the simulated feed', () => {
  it('adds a time exactly when applyTick starts a candle', () => {
    let candles: Candle[] = [[1, 1, 1, 1]];
    let times = [0];
    for (let tick = 1; tick <= TICKS_PER_CANDLE * 3; tick++) {
      candles = applyTick(candles, 1, tick);
      times = tickTimes(times, tick, tick * 1000);
      assert.equal(times.length, candles.length);
    }
    assert.equal(candles.length, 4);
  });

  it('keeps at most HISTORY_CANDLES', () => {
    const full = backfillTimes(HISTORY_CANDLES, 0, 1);
    assert.equal(tickTimes(full, TICKS_PER_CANDLE, 5).length, HISTORY_CANDLES);
  });

  it('counts down to the next candle', () => {
    assert.equal(simCountdown(1), TICKS_PER_CANDLE);
    assert.equal(simCountdown(TICKS_PER_CANDLE - 1), 2);
    assert.equal(simCountdown(TICKS_PER_CANDLE), 1);
    assert.equal(simCountdown(TICKS_PER_CANDLE + 1), TICKS_PER_CANDLE);
  });
});

describe('quick trade size', () => {
  const eur = findSymbol('EURUSD')!;
  const btc = findSymbol('BTCUSDT')!;

  it('steps by the smallest size, then by bigger steps', () => {
    assert.equal(nudgeSize(eur, 0.01, 1), 0.02);
    assert.equal(nudgeSize(eur, 0.09, 1), 0.1);
    assert.equal(nudgeSize(eur, 0.1, 1), 0.2);
    assert.equal(nudgeSize(eur, 0.1, -1), 0.09);
    assert.equal(nudgeSize(eur, 0.3, -1), 0.2);
    assert.equal(nudgeSize(btc, 0.009, 1), 0.01);
  });

  it('stays between the smallest and largest size', () => {
    assert.equal(nudgeSize(eur, 0.01, -1), 0.01);
    assert.equal(nudgeSize(eur, 1, 1), 1);
    assert.equal(nudgeSize(btc, 0.1, 1), 0.1);
  });
});

describe('quote digits and labels', () => {
  it('splits quotes the MetaTrader way', () => {
    assert.deepEqual(quoteParts('1.08512', 5), { head: '1.08', big: '51', tail: '2' });
    assert.deepEqual(quoteParts('2,350.12', 2), { head: '2,350.', big: '12', tail: '' });
    assert.deepEqual(quoteParts('60,123.4', 1), { head: '60,12', big: '3.4', tail: '' });
  });

  it('pushes overlapping labels apart and keeps them in bounds', () => {
    const tops = spreadLabels([100, 101, 300], 20, 0, 400);
    assert.equal(tops[0], 100);
    assert.equal(tops[1], 122);
    assert.equal(tops[2], 300);
    const bottom = spreadLabels([395, 390], 20, 0, 400);
    assert.ok(Math.max(...bottom) <= 380);
    assert.ok(Math.abs(bottom[0] - bottom[1]) >= 22);
    const mixed = spreadLabels([50, 52], [30, 18], 0, 400);
    assert.equal(mixed[0], 50);
    assert.equal(mixed[1], 82);
  });
});
