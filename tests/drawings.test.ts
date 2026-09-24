/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  drawingHandles,
  drawingShapes,
  expandPosition,
  extendLine,
  fitsBudget,
  hitShapes,
  indexTime,
  MAX_DRAWINGS,
  MAX_POINTS,
  placeHint,
  retracementPrice,
  searchTools,
  shiftDrawing,
  thinStroke,
  timeIndex,
  TOOL_CATEGORIES,
  TOOLS,
  findTool,
  type DrawMap,
  type Drawing,
} from '../src/lib/drawings';

const MIN = 60_000;
const T0 = Date.UTC(2026, 8, 24, 10, 0);
const times = Array.from({ length: 10 }, (_, i) => T0 + i * MIN);

/** 10px per candle, price 100 at y=0 falling 1 per px. */
const map: DrawMap = {
  f: (t) => timeIndex(times, t),
  xf: (f) => f * 10,
  y: (p) => 100 - p,
  right: 300,
  bottom: 200,
  fmt: (p) => p.toFixed(2),
};

const drawing = (tool: Drawing['tool'], points: [number, number][]): Drawing => ({
  id: 'd',
  tool,
  color: '#fff',
  points: points.map(([i, p]) => ({ t: T0 + i * MIN, p })),
});

describe('drawing tools catalogue', () => {
  it('has tools in every category and unique ids', () => {
    for (const c of TOOL_CATEGORIES) assert.ok(TOOLS.some((t) => t.category === c.id), c.id);
    assert.equal(new Set(TOOLS.map((t) => t.id)).size, TOOLS.length);
  });

  it('finds tools in Persian and English', () => {
    assert.ok(searchTools('فیبوناچی').some((t) => t.id === 'fibRetracement'));
    assert.ok(searchTools('trend').some((t) => t.id === 'trend'));
    assert.ok(searchTools('PITCH').some((t) => t.id === 'pitchfork'));
    assert.equal(searchTools('  ').length, TOOLS.length);
    assert.equal(searchTools('zzz').length, 0);
  });

  it('tells the learner which point comes next', () => {
    assert.equal(placeHint(findTool('hline')!, 0), 'جای رسم رو روی نمودار بزن');
    assert.match(placeHint(findTool('trend')!, 0), /بکش/);
    assert.equal(placeHint(findTool('xabcd')!, 2), 'نقطه‌ی B رو بزن (۳ از ۵)');
    assert.equal(placeHint(findTool('channel')!, 1), 'نقطه‌ی ۲ از ۳ رو بزن');
  });
});

describe('drawing coordinates', () => {
  it('turns times into candle indexes and back, beyond the data too', () => {
    assert.equal(timeIndex(times, times[4]), 4);
    assert.equal(timeIndex(times, times[4] + MIN / 2), 4.5);
    assert.equal(timeIndex(times, times[9] + 3 * MIN), 12);
    assert.equal(timeIndex(times, times[0] - 2 * MIN), -2);
    for (const f of [-3, 0, 2.25, 9, 14]) assert.equal(timeIndex(times, indexTime(times, f)), f);
  });

  it('stretches rays to the edge of the plot', () => {
    const [s, e] = extendLine({ x: 10, y: 100 }, { x: 20, y: 90 }, 300, 200, false);
    assert.deepEqual(s, { x: 10, y: 100 });
    assert.equal(e.y, 0);
    assert.equal(e.x, 110);
    const [s2] = extendLine({ x: 10, y: 100 }, { x: 20, y: 100 }, 300, 200, true);
    assert.equal(s2.x, 0);
  });

  it('moves a drawing by candles and price, and fills in a position tool', () => {
    const d = drawing('trend', [
      [1, 50],
      [3, 60],
    ]);
    const moved = shiftDrawing(d, times, 2, 1.5, 2);
    assert.deepEqual(
      moved.points.map((q) => [timeIndex(times, q.t), q.p]),
      [
        [3, 51.5],
        [5, 61.5],
      ],
    );
    const pos = expandPosition(drawing('shortPosition', [[8, 50]]), times, 2, 2);
    assert.deepEqual(
      pos.points.map((q) => q.p),
      [50, 46, 52],
    );
    assert.equal(timeIndex(times, pos.points[1].t), 28);
  });
});

describe('drawing shapes', () => {
  it('draws a trend line between its points and can be tapped', () => {
    const shapes = drawingShapes(
      drawing('trend', [
        [2, 60],
        [6, 40],
      ]),
      map,
    );
    assert.deepEqual(shapes, [{ kind: 'line', x1: 20, y1: 40, x2: 60, y2: 60 }]);
    assert.ok(hitShapes(shapes, 40, 52));
    assert.ok(!hitShapes(shapes, 40, 80));
  });

  it('draws fib retracement levels from 1 at the first point to 0 at the second', () => {
    assert.equal(retracementPrice(100, 50, 0.5), 75);
    const fib = drawing('fibRetracement', [
      [1, 80],
      [5, 40],
    ]);
    const labels = (m: DrawMap) =>
      drawingShapes(fib, m)
        .filter((s) => s.kind === 'label')
        .map((s) => (s as { text: string }).text);
    assert.deepEqual(labels({ ...map, y: (p) => (100 - p) * 5 }), ['0 (40.00)', '0.236 (49.44)', '0.382 (55.28)', '0.5 (60.00)', '0.618 (64.72)', '0.786 (71.44)', '1 (80.00)']);
    // Squeezed into 40px, names that would overlap are left out, but 0 and 1 stay.
    assert.deepEqual(labels(map), ['0 (40.00)', '0.382 (55.28)', '1 (80.00)']);
  });

  it('lets lines be picked out from under shaded zones', () => {
    const rect = drawingShapes(
      drawing('rectangle', [
        [1, 90],
        [9, 10],
      ]),
      map,
    );
    assert.ok(hitShapes(rect, 50, 50));
    assert.ok(!hitShapes(rect, 50, 50, 10, false));
    assert.ok(hitShapes(rect, 12, 50, 10, false));
  });

  it('puts horizontal lines across the plot with a price tag', () => {
    const shapes = drawingShapes(drawing('hline', [[3, 70]]), map);
    assert.deepEqual(shapes[0], { kind: 'line', x1: 0, y1: 30, x2: 300, y2: 30 });
    assert.deepEqual(shapes[1], { kind: 'tag', y: 30, text: '70.00' });
  });

  it('draws the reward-to-risk of a position tool', () => {
    const d = expandPosition(drawing('longPosition', [[2, 50]]), times, 5, 2);
    const shapes = drawingShapes(d, map);
    const texts = shapes.filter((s) => s.kind === 'label').map((s) => (s as { text: string }).text);
    assert.ok(texts[0].includes('R:R 2'));
    assert.ok(texts[0].startsWith('60.00'));
    assert.ok(texts[1].startsWith('45.00'));
    const handles = drawingHandles(d, map);
    assert.equal(handles[2].x, handles[1].x);
  });

  it('labels harmonic pattern points and swing ratios', () => {
    const d = drawing('abcd', [
      [0, 50],
      [2, 70],
      [4, 60],
      [6, 80],
    ]);
    const texts = drawingShapes(d, map)
      .filter((s) => s.kind === 'label')
      .map((s) => (s as { text: string }).text);
    assert.deepEqual(texts, ['0.5', '2', 'A', 'B', 'C', 'D']);
  });
});

describe('drawing storage', () => {
  it('thins long freehand strokes, keeping both ends', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({ t: i, p: i }));
    const thin = thinStroke(pts, 100);
    assert.equal(thin.length, 100);
    assert.equal(thin[0].t, 0);
    assert.equal(thin[99].t, 999);
  });

  it('keeps drawings within the per-symbol and overall limits, but always allows removing', () => {
    const one = drawing('trend', [
      [0, 1],
      [1, 2],
    ]);
    const full = Array.from({ length: MAX_DRAWINGS }, () => one);
    assert.ok(!fitsBudget({ BTC: full }, 'BTC', [...full, one]));
    assert.ok(fitsBudget({ BTC: full }, 'BTC', full.slice(1)));
    const stroke: Drawing = { ...one, tool: 'brush', points: Array.from({ length: MAX_POINTS - 1 }, (_, i) => ({ t: i, p: i })) };
    assert.ok(!fitsBudget({ ETH: [stroke] }, 'BTC', [one]));
    assert.ok(fitsBudget({ ETH: [stroke], BTC: [one] }, 'BTC', []));
    assert.ok(fitsBudget({}, 'BTC', [one]));
  });
});
