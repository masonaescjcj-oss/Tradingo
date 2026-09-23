/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ALL_COURSES } from '../src/content';
import { isLineCorrect, lineDecimals, lineExtent, lineNudge } from '../src/content/line';
import type { Course, LineStep, Step } from '../src/content/types';
import { validateCourses } from '../src/content/validate';
import { correctAnswerText, practiceSteps } from '../src/lib/session';
import { formatPrice, priceDecimals } from '../src/utils/format';

/** EUR/USD pullback with its last low at 1.0822; the stop belongs a few pips under it. */
const good: LineStep = {
  type: 'line',
  prompt: 'حد ضرر رو کمی زیر آخرین کف بذار.',
  chart: {
    candles: [
      [1.0795, 1.0809, 1.0791, 1.0806],
      [1.0806, 1.0818, 1.0802, 1.0815],
      [1.0815, 1.0831, 1.0812, 1.0828],
      [1.0828, 1.0844, 1.0825, 1.0841],
      [1.0841, 1.0846, 1.0831, 1.0834],
      [1.0834, 1.0837, 1.0826, 1.0829],
      [1.0829, 1.0833, 1.0822, 1.0831],
      [1.0831, 1.0842, 1.0829, 1.0839],
      [1.0839, 1.0852, 1.0836, 1.085],
    ],
  },
  symbol: 'EUR/USD · 1H',
  label: 'حد ضرر',
  tone: 'bear',
  start: 1.086,
  answer: [1.081, 1.082],
  explanation: 'آخرین کف روی ۱٫۰۸۲۲ هست.',
};

/** Validator problems for a single line step, wrapped in a minimal valid course. */
function problems(step: LineStep): string[] {
  const learn: Step = { type: 'learn', title: 't', body: 'b' };
  const q: Step = { type: 'truefalse', statement: 's', answer: true, explanation: 'e' };
  const course: Course = {
    id: 'c',
    title: 'c',
    subtitle: 'c',
    description: 'c',
    category: 'risk',
    level: 'beginner',
    color: '#000000',
    edge: '#000000',
    ink: '#000000',
    badge: { kind: 'text', text: 'c' },
    units: [
      {
        id: 'u',
        title: 'u',
        color: '#000000',
        edge: '#000000',
        ink: '#000000',
        lessons: [
          { id: 'l1', title: 'l1', steps: [learn, step, q, q, q] },
          { id: 'l2', title: 'l2', steps: [learn, q, q, q, q] },
        ],
      },
    ],
  };
  return validateCourses([course]);
}

describe('line steps: validator', () => {
  it('accepts a well-formed line step', () => {
    assert.deepEqual(problems(good), []);
  });

  it('rejects a band whose low is not below its high', () => {
    assert.match(problems({ ...good, answer: [1.082, 1.081] }).join('\n'), /low < high/);
  });

  it('rejects a line that already starts inside the band', () => {
    assert.match(problems({ ...good, start: 1.0815 }).join('\n'), /start outside/);
  });

  it('rejects a band far away from the chart', () => {
    assert.match(problems({ ...good, answer: [1.095, 1.096] }).join('\n'), /outside the chart's price range/);
  });

  it('rejects bands that are too narrow to hit or so wide they give the answer away', () => {
    assert.match(problems({ ...good, answer: [1.0815, 1.0816] }).join('\n'), /at least/);
    assert.match(problems({ ...good, answer: [1.079, 1.0835] }).join('\n'), /keep it under/);
  });

  it('rejects long labels, missing symbols and prices finer than the symbol shows', () => {
    assert.match(problems({ ...good, label: 'یه برچسب خیلی طولانی' }).join('\n'), /12 chars/);
    assert.match(problems({ ...good, symbol: '' }).join('\n'), /missing symbol/);
    assert.match(problems({ ...good, answer: [1.08105, 1.082] }).join('\n'), /at most 4 decimals/);
  });

  it('rejects a broken chart', () => {
    assert.match(problems({ ...good, chart: { candles: [[1.08, 1.07, 1.09, 1.08]] } }).join('\n'), /candles/);
  });
});

describe('line steps: helpers', () => {
  it('formats prices with the usual decimals for their size', () => {
    assert.equal(priceDecimals(1.0825), 4);
    assert.equal(priceDecimals(150.25), 2);
    assert.equal(priceDecimals(2386.4), 1);
    assert.equal(priceDecimals(61250), 0);
    assert.equal(formatPrice(1.081, 4), '1.0810');
    assert.equal(formatPrice(61250), '61,250');
    assert.equal(formatPrice(2386.44), '2,386.4');
  });

  it('shows the start and the whole band, padded evenly around the chart', () => {
    const [lo, hi] = lineExtent(good);
    assert.ok(lo < good.answer[0] && hi > good.start);
    // Candles span 1.0791–1.0852; the padding is the same above and below.
    assert.ok(Math.abs(1.0791 - lo - (hi - 1.0852)) < 1e-9);
  });

  it('accepts prices inside the band, edges included', () => {
    assert.equal(lineDecimals(good), 4);
    assert.ok(isLineCorrect(good, 1.081));
    assert.ok(isLineCorrect(good, 1.0815));
    assert.ok(isLineCorrect(good, 1.082));
    assert.ok(!isLineCorrect(good, 1.0821));
    assert.ok(!isLineCorrect(good, 1.0809));
  });

  it('nudges by a round step small enough to land inside the band', () => {
    const step = lineNudge(good);
    assert.ok(step >= 0.0001 && step <= (good.answer[1] - good.answer[0]) / 2);
    assert.equal(Number((step * 1e4).toFixed(6)) % 1, 0);
  });

  it('describes the correct answer as a price range', () => {
    assert.equal(correctAnswerText(good), 'بین 1.0810 تا 1.0820');
    assert.equal(correctAnswerText({ ...good, chart: { candles: [[61000, 61500, 60900, 61400], [61400, 61600, 61200, 61300], [61300, 61400, 61000, 61100]] }, answer: [61100, 61300] }), 'بین 61,100 تا 61,300');
    // One-decimal quotes (gold, ETH) drop the ".0" when the band is in whole dollars, but keep real decimals.
    const eth = { ...good, chart: { candles: [[3000, 3050, 2990, 3040], [3040, 3060, 3010, 3020], [3020, 3030, 2980, 3000]] as [number, number, number, number][] } };
    assert.equal(correctAnswerText({ ...eth, answer: [2830, 2870] }), 'بین 2,830 تا 2,870');
    assert.equal(correctAnswerText({ ...eth, answer: [2952.8, 3000] }), 'بین 2,952.8 تا 3,000.0');
  });
});

describe('line steps: content', () => {
  const lines = ALL_COURSES.flatMap((c) => c.units.flatMap((u) => u.lessons.flatMap((l) => l.steps.filter((s): s is LineStep => s.type === 'line'))));

  it('has line steps, each starting outside its answer band', () => {
    assert.ok(lines.length > 0);
    for (const s of lines) assert.ok(!isLineCorrect(s, s.start), s.prompt);
  });

  it('includes line steps in the chart practice', () => {
    const steps = practiceSteps('charts', { activeCourse: 'risk', completed: { 'rk-1': { best: 1, perfect: true } }, mistakes: [] });
    assert.ok(steps.some((s) => s.step.type === 'line'));
  });
});
