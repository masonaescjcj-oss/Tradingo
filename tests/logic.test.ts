/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { series, withCandles } from '../src/content/charts';
import { ALL_COURSES, findLesson, starterCourses } from '../src/content';
import { rsi, sma } from '../src/content/indicators';
import { validateCourses } from '../src/content/validate';
import { mergeProgress } from '../src/lib/merge';
import { buildBoard, userRank } from '../src/lib/league';
import { dueLessons, nextReview } from '../src/lib/review';
import { buildSession, correctAnswerText, filledSentence, TEST_LIVES, TEST_QUESTIONS } from '../src/lib/session';
import type { GameData } from '../src/store/game';

describe('content', () => {
  it('passes the validator', () => {
    assert.deepEqual(validateCourses(ALL_COURSES), []);
  });

  it('has 30+ courses with at least 3 units each (psychology u1 aside)', () => {
    assert.ok(ALL_COURSES.length >= 30);
    for (const c of ALL_COURSES) assert.ok(c.units.length >= 3, `${c.id} has ${c.units.length} units`);
  });

  it('keeps the original lesson ids so saved progress survives', () => {
    for (const id of ['basics-1', 'fx-1', 'cr-1', 'cd-1', 'tr-1', 'rk-1', 'ps-1']) assert.ok(findLesson(id), id);
  });

  it('gives every starter course a real course', () => {
    for (const m of ['forex', 'crypto', 'both'] as const) {
      for (const id of starterCourses(m)) assert.ok(ALL_COURSES.some((c) => c.id === id), id);
    }
  });
});

describe('chart helpers', () => {
  it('series builds valid candles that open at the previous close', () => {
    const c = series([1.08, 1.082, [1.082, 1.083, 1.079, 1.0815], 1.084], { start: 1.079 });
    assert.equal(c.length, 4);
    assert.equal(c[0][0], 1.079);
    assert.equal(c[1][0], 1.08);
    assert.deepEqual(c[2], [1.082, 1.083, 1.079, 1.0815]);
    assert.equal(c[3][0], 1.0815);
    for (const [o, h, l, cl] of c) assert.ok(h >= Math.max(o, cl) && l <= Math.min(o, cl));
  });

  it('withCandles replaces only the given indexes', () => {
    const base = series([1, 2, 3]);
    const out = withCandles(base, { 1: [2, 2.5, 1.5, 2.2] });
    assert.deepEqual(out[1], [2, 2.5, 1.5, 2.2]);
    assert.deepEqual(out[0], base[0]);
  });

  it('computes SMA and RSI', () => {
    const up = series([1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(sma(up, 3)[2], 2);
    assert.equal(rsi(up, 3)[3], 100);
    const down = series([8, 7, 6, 5, 4, 3]);
    assert.equal(rsi(down, 3)[4], 0);
  });
});

describe('sessions', () => {
  const state = { activeCourse: 'basics', completed: {}, mistakes: [] };

  it('builds a lesson session with every step', () => {
    const s = buildSession('basics-1', state);
    assert.equal(s?.kind, 'lesson');
    assert.equal(s?.steps.length, findLesson('basics-1')!.lesson.steps.length);
  });

  it('builds a unit test-out from that unit only', () => {
    const s = buildSession('test-smc-u2', state);
    assert.equal(s?.kind, 'test');
    if (s?.kind !== 'test') return;
    assert.equal(s.lives, TEST_LIVES);
    assert.ok(s.steps.length > 0 && s.steps.length <= TEST_QUESTIONS);
    for (const st of s.steps) assert.ok(st.ref.startsWith('smc-u2-'));
    assert.ok(s.steps.every((st) => st.step.type !== 'learn' && st.step.type !== 'match'));
  });

  it('returns null for unknown ids', () => {
    assert.equal(buildSession('nope', state), null);
    assert.equal(buildSession('test-nope', state), null);
  });

  it('describes correct answers', () => {
    assert.equal(filledSentence('a ___ b ___', ['x', 'y']), 'a x b y');
    assert.equal(correctAnswerText({ type: 'order', prompt: '', items: ['a', 'b'], explanation: '' }), '۱. a\n۲. b');
  });
});

const STATE: GameData = {
  onboarded: true,
  market: 'both',
  enrolled: ['basics'],
  activeCourse: 'basics',
  level: 'new',
  name: 'تریدر',
  xp: 0,
  coins: 50,
  hearts: 5,
  heartsUpdatedAt: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  activeDays: [],
  dailyGoal: 30,
  dailyXp: 0,
  dailyDay: '2026-09-22',
  dailyClaimedDay: null,
  weekKey: '2026-09-19',
  weeklyXp: 0,
  league: 0,
  lastLeagueChange: null,
  completed: {},
  chests: [],
  mistakes: [],
  reviews: {},
  practiceSessions: 0,
  sim: { balance: 10000, positions: [], history: [] },
};

describe('cloud merge', () => {
  it('keeps the best of both sides', () => {
    const base = STATE;
    const local = { ...base, xp: 10, weeklyXp: 40, completed: { a: { best: 1, perfect: true } }, enrolled: ['basics'], chests: ['x'], lastActiveDay: '2026-09-22', streak: 2 };
    const remote = { ...base, name: 'علی', xp: 90, weeklyXp: 70, completed: { a: { best: 0.5, perfect: false }, b: { best: 0.8, perfect: false } }, enrolled: ['basics', 'smc'], chests: ['y'], lastActiveDay: '2026-09-23', streak: 5 };
    const m = mergeProgress(local, remote);
    assert.equal(m.name, 'علی');
    assert.equal(m.xp, 90);
    assert.equal(m.weeklyXp, 70);
    assert.equal(m.streak, 5);
    assert.deepEqual(m.completed.a, { best: 1, perfect: true });
    assert.ok(m.completed.b);
    assert.deepEqual(m.enrolled, ['basics', 'smc']);
    assert.deepEqual([...m.chests].sort(), ['x', 'y']);
  });

  it('takes the newer week', () => {
    const base = STATE;
    const m = mergeProgress({ ...base, weekKey: '2026-09-19', weeklyXp: 10, league: 1 }, { ...base, weekKey: '2026-09-12', weeklyXp: 500, league: 3 });
    assert.equal(m.weeklyXp, 10);
    assert.equal(m.league, 1);
  });
});

describe('spaced repetition', () => {
  it('doubles the gap after good sessions and resets after weak ones', () => {
    const day = new Date(2026, 8, 23);
    const first = nextReview(undefined, true, day);
    assert.deepEqual(first, { due: '2026-09-25', interval: 2 });
    assert.equal(nextReview(first, true, day).interval, 4);
    assert.deepEqual(nextReview(first, false, day), { due: '2026-09-24', interval: 1 });
  });

  it('lists due lessons oldest first', () => {
    const due = dueLessons({ a: { due: '2026-09-20', interval: 2 }, b: { due: '2026-09-30', interval: 8 }, c: { due: '2026-09-18', interval: 1 } }, '2026-09-23');
    assert.deepEqual(due, ['c', 'a']);
  });
});

describe('league', () => {
  it('fills the board with real players first', () => {
    const rows = buildBoard('2026-09-19', 0, 'من', 50, 0.5, [{ name: 'واقعی', xp: 999 }]);
    assert.equal(rows.length, 15);
    assert.equal(rows[0].name, 'واقعی');
    assert.ok(rows[0].isReal);
    assert.ok(userRank(rows) >= 2);
  });
});
