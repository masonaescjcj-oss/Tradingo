/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { series, withCandles } from '../src/content/charts';
import { ALL_COURSES, canonicalCourseIds, findCourse, findLesson, starterCourses } from '../src/content';
import { COURSE_ALIASES } from '../src/content/courses';
import { rsi, sma } from '../src/content/indicators';
import { validateCourses } from '../src/content/validate';
import { mergeProgress } from '../src/lib/merge';
import { currentStreak, HEART_REFILL_MS, heartsNow, MAX_HEARTS, nextStreak, todaysXp } from '../src/lib/progress';
import { buildBoard, userRank } from '../src/lib/league';
import { dueLessons, nextReview } from '../src/lib/review';
import { buildSession, correctAnswerText, filledSentence, MASTER_LIVES, MASTER_QUESTIONS, TEST_LIVES, TEST_QUESTIONS } from '../src/lib/session';
import type { GameData } from '../src/store/game';

describe('content', () => {
  it('passes the validator', () => {
    assert.deepEqual(validateCourses(ALL_COURSES), []);
  });

  it('has one long course per topic, each with at least 6 units', () => {
    assert.ok(ALL_COURSES.length >= 6 && ALL_COURSES.length <= 10);
    for (const c of ALL_COURSES) assert.ok(c.units.length >= 6, `${c.id} has ${c.units.length} units`);
    // All of crypto lives in one course.
    const crypto = findCourse('crypto')!;
    for (const unit of ['crypto', 'defi-u1', 'leverage-u1', 'onchain-u1']) assert.ok(crypto.units.some((u) => u.id === unit), unit);
  });

  it('maps course ids from before the merge to the long courses', () => {
    for (const [old, now] of Object.entries(COURSE_ALIASES)) {
      assert.equal(findCourse(old)?.id, now, old);
      assert.ok(!ALL_COURSES.some((c) => c.id === old), `${old} is still a course of its own`);
    }
    assert.deepEqual(canonicalCourseIds(['candles', 'trend', 'basics', 'orders', 'gone']), ['technical', 'basics']);
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

  it('builds a harder mastery test', () => {
    const s = buildSession('master-candles', state);
    assert.equal(s?.kind, 'test');
    if (s?.kind !== 'test') return;
    assert.equal(s.mode, 'master');
    assert.equal(s.lives, MASTER_LIVES);
    assert.ok(s.steps.length > TEST_QUESTIONS && s.steps.length <= MASTER_QUESTIONS);
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
  sound: true,
  reminders: { enabled: false, hour: 20, offered: false },
  placement: null,
  mastered: [],
  user: null,
  signedOut: false,
  answers: {},
  sim: { balance: 10000, positions: [], history: [] },
  simOrders: [],
  simReplay: { session: null, account: { balance: 10000, positions: [], orders: [], history: [] } },
  simChallenges: {},
  simTools: { ma: true, ma2: false, bands: false, rsi: false, volume: false, levels: {}, drawings: {} },
  quests: null,
  freezes: 0,
  frozenDays: [],
  boostUntil: 0,
  lostStreak: null,
  duels: { played: 0, wins: 0, losses: 0, ties: 0, rewardDay: null, rewarded: 0, codes: [] },
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
    // A course id from before the merge (smc) comes back as the long course that holds it.
    assert.deepEqual(m.enrolled, ['basics', 'advanced']);
    assert.deepEqual([...m.chests].sort(), ['x', 'y']);
  });

  it('takes the newer week', () => {
    const base = STATE;
    const m = mergeProgress({ ...base, weekKey: '2026-09-19', weeklyXp: 10, league: 1 }, { ...base, weekKey: '2026-09-12', weeklyXp: 500, league: 3 });
    assert.equal(m.weeklyXp, 10);
    assert.equal(m.league, 1);
  });
});

describe('hearts and streaks', () => {
  it('refills one heart every interval up to the maximum', () => {
    const now = 10 * HEART_REFILL_MS;
    assert.equal(heartsNow({ hearts: 2, heartsUpdatedAt: now - 2 * HEART_REFILL_MS - 1000 }, now).hearts, 4);
    assert.equal(heartsNow({ hearts: 4, heartsUpdatedAt: 0 }, now).hearts, MAX_HEARTS);
    const partial = heartsNow({ hearts: 1, heartsUpdatedAt: now - HEART_REFILL_MS / 2 }, now);
    assert.equal(partial.hearts, 1);
    assert.equal(partial.nextInMs, HEART_REFILL_MS / 2);
  });

  it('keeps, extends or restarts the streak by calendar day', () => {
    assert.equal(nextStreak({ streak: 4, lastActiveDay: '2026-09-22' }, '2026-09-23'), 5);
    assert.equal(nextStreak({ streak: 4, lastActiveDay: '2026-09-23' }, '2026-09-23'), 4);
    assert.equal(nextStreak({ streak: 4, lastActiveDay: '2026-09-20' }, '2026-09-23'), 1);
    assert.equal(nextStreak({ streak: 9, lastActiveDay: '2026-02-28' }, '2026-03-01'), 10);
    assert.equal(nextStreak({ streak: 0, lastActiveDay: null }, '2026-09-23'), 1);
  });

  it('shows a streak only if it is still alive', () => {
    assert.equal(currentStreak({ streak: 6, lastActiveDay: '2026-09-22' }, '2026-09-23'), 6);
    assert.equal(currentStreak({ streak: 6, lastActiveDay: '2026-09-21' }, '2026-09-23'), 0);
    assert.equal(currentStreak({ streak: 6, lastActiveDay: null }, '2026-09-23'), 0);
  });

  it('counts only today\'s XP toward the daily goal', () => {
    assert.equal(todaysXp({ dailyXp: 25, dailyDay: '2026-09-23' }, '2026-09-23'), 25);
    assert.equal(todaysXp({ dailyXp: 25, dailyDay: '2026-09-22' }, '2026-09-23'), 0);
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
