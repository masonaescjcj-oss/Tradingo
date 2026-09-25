/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { advanceStreak, currentStreak, daysBetween, streakRepair } from '../src/lib/progress';
import { addToLog, mergeQuestLogs, questChestDay, questChestId, questDone, questsDone, questsFor, xpQuestTarget } from '../src/lib/quests';
import { cardLayers, challengeCard, cardSvg, streakCard, tradeCard, tradingCard, wrapText } from '../src/lib/shareCard';
import { findSymbol, formatPrice } from '../src/lib/simulator';
import { positionMargin, type ClosedTrade } from '../src/lib/trading';
import { boostedXp, BOOST_MS, extendBoost } from '../src/lib/shop';

describe('daily quests', () => {
  it('gives three quests a day, the same ones all day, starting with XP', () => {
    const a = questsFor('2026-09-24', 30);
    assert.equal(a.length, 3);
    assert.deepEqual(questsFor('2026-09-24', 30), a);
    assert.equal(a[0].metric, 'xp');
    assert.equal(a[0].target, xpQuestTarget(30));
    assert.notEqual(a[1].metric, 'xp');
    assert.notEqual(a[1].metric, a[2].metric);
    // Over a month every kind of quest shows up.
    const metrics = new Set(Array.from({ length: 30 }, (_, i) => questsFor(`2026-10-${String(i + 1).padStart(2, '0')}`, 30).map((q) => q.metric)).flat());
    for (const m of ['lessons', 'combo', 'stopTrades']) assert.ok(metrics.has(m as never), m);
  });

  it('scales the XP quest with the daily goal', () => {
    assert.equal(xpQuestTarget(10), 30);
    assert.equal(xpQuestTarget(30), 50);
    assert.equal(xpQuestTarget(50), 80);
  });

  it('counts activity for today only, keeping the best answer streak', () => {
    let log = addToLog(null, '2026-09-24', { lessons: 1, combo: 6 });
    log = addToLog(log, '2026-09-24', { lessons: 1, combo: 4, xp: 20 });
    assert.deepEqual(log.counts, { lessons: 2, combo: 6, xp: 20 });
    const quest = { id: 'q', metric: 'lessons' as const, target: 2, title: '', kind: 'learn' as const };
    assert.ok(questDone(quest, log, '2026-09-24'));
    assert.ok(!questDone(quest, log, '2026-09-25'));
    const tomorrow = addToLog(log, '2026-09-25', { lessons: 1 });
    assert.deepEqual(tomorrow, { day: '2026-09-25', counts: { lessons: 1 }, chest: false });
  });

  it('finishes all three when every goal is met', () => {
    const day = '2026-09-24';
    const quests = questsFor(day, 30);
    const patch = Object.fromEntries(quests.map((q) => [q.metric, q.target]));
    assert.equal(questsDone(quests, addToLog(null, day, patch), day), 3);
    assert.equal(questsDone(quests, null, day), 0);
  });

  it('names quest chests by day and merges logs from two devices', () => {
    assert.equal(questChestDay(questChestId('2026-09-24')), '2026-09-24');
    assert.equal(questChestDay('basics-1-chest'), null);
    const a = { day: '2026-09-24', counts: { lessons: 2, xp: 10 }, chest: false };
    const b = { day: '2026-09-24', counts: { lessons: 1, xp: 40 }, chest: true };
    assert.deepEqual(mergeQuestLogs(a, b), { day: '2026-09-24', counts: { lessons: 2, xp: 40 }, chest: true });
    assert.equal(mergeQuestLogs(a, { ...b, day: '2026-09-23' }), a);
  });
});

describe('streak freezes and repair', () => {
  it('counts days across months', () => {
    assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
    assert.equal(daysBetween('2026-09-20', '2026-09-24'), 4);
  });

  it('keeps the streak alive over missed days covered by freezes, and spends them', () => {
    const s = { streak: 8, lastActiveDay: '2026-09-21', freezes: 2 };
    assert.equal(currentStreak(s, '2026-09-23'), 8);
    assert.equal(currentStreak({ ...s, freezes: 0 }, '2026-09-23'), 0);
    assert.deepEqual(advanceStreak(s, '2026-09-24'), { streak: 9, freezesUsed: 2, frozen: ['2026-09-22', '2026-09-23'], lost: 0 });
    assert.deepEqual(advanceStreak({ ...s, freezes: 1 }, '2026-09-24'), { streak: 1, freezesUsed: 0, frozen: [], lost: 8 });
    assert.equal(advanceStreak(s, '2026-09-22').streak, 9);
    assert.equal(advanceStreak(s, '2026-09-21').streak, 8);
  });

  it('repairs a streak that broke, before or after coming back', () => {
    // Not back yet: two days missed, the streak shows 0.
    const idle = { streak: 12, lastActiveDay: '2026-09-21', freezes: 0 };
    assert.deepEqual(streakRepair(idle, '2026-09-24'), { streak: 12, lastActiveDay: '2026-09-23', frozen: ['2026-09-22', '2026-09-23'] });
    // Came back today and the streak restarted at 1.
    const back = { streak: 1, lastActiveDay: '2026-09-24', freezes: 0, lostStreak: { value: 12, since: '2026-09-21', day: '2026-09-24' } };
    assert.deepEqual(streakRepair(back, '2026-09-24'), { streak: 13, lastActiveDay: '2026-09-24', frozen: ['2026-09-22', '2026-09-23'] });
    assert.equal(streakRepair(back, '2026-09-26'), null);
    // Too short, too long ago, or nothing broken.
    assert.equal(streakRepair({ ...idle, streak: 2 }, '2026-09-24'), null);
    assert.equal(streakRepair(idle, '2026-09-30'), null);
    assert.equal(streakRepair({ streak: 5, lastActiveDay: '2026-09-23' }, '2026-09-24'), null);
  });
});

describe('shop', () => {
  it('doubles XP while a boost runs, and stacks boosts', () => {
    const now = 1_000_000;
    assert.equal(boostedXp(15, now + 1000, now), 30);
    assert.equal(boostedXp(15, now - 1, now), 15);
    assert.equal(extendBoost(0, now), now + BOOST_MS);
    assert.equal(extendBoost(now + 60_000, now), now + 60_000 + BOOST_MS);
  });
});

describe('share cards', () => {
  it('draws a card with its numbers, name and link, escaping text', () => {
    const svg = cardSvg(streakCard({ name: 'مینا <3', streak: 12, best: 12, week: [] }));
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('۱۲'));
    assert.ok(svg.includes('رکورد جدید!'));
    assert.ok(svg.includes('مینا &lt;3'));
    assert.ok(svg.includes('chartoon.net'));
    assert.ok(!svg.includes('<3'));
  });

  it('says the simulator uses play money on trading cards', () => {
    const card = tradingCard({ name: 'x', count: 20, winRate: 0.55, net: 120.5, profitFactor: 1.4 });
    assert.equal(card.hero, '۵۵٪');
    assert.ok(card.note?.includes('پول مجازی'));
    assert.ok(cardSvg(card).includes('+$120.50'));
    assert.ok(challengeCard({ name: 'x', title: 'سه برد', coins: 50, xp: 20 }).note);
  });

  it('makes a card for one trade: return on margin, side, entry, exit and P&L', () => {
    const spec = findSymbol('EURUSD')!;
    const trade: ClosedTrade = { id: 't1', symbol: 'EURUSD', side: 'buy', size: 0.01, entry: 1.14, exit: 1.142, pnl: 2, leverage: 10, openedAt: 0, closedAt: 1, reason: 'manual' };
    const card = tradeCard({ name: 'سارا', trade });
    const roi = (2 / positionMargin(spec, trade)) * 100;
    assert.equal(card.kind, 'trade');
    assert.equal(card.hero, `+${roi.toFixed(1).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]).replace('.', '٫')}٪`);
    assert.deepEqual(card.stats.map((s) => s.value), [formatPrice(spec, 1.14), formatPrice(spec, 1.142), '+$2.00']);
    assert.ok(card.heroLabel.includes('خرید') && card.heroLabel.includes(spec.label));
    assert.ok(card.note?.includes('پول مجازی'));
    const loss = tradeCard({ name: 'x', trade: { ...trade, side: 'sell', pnl: -2 } });
    assert.ok(loss.hero.startsWith('-') && loss.mood === 'think');
  });

  it('splits a card into word-free graphics and the words to draw on top, for phones', () => {
    const card = tradingCard({ name: 'مینا', count: 3, winRate: 1, net: 0.03, profitFactor: null });
    const { svg, texts } = cardLayers(card);
    assert.ok(cardSvg(card).includes('<text'));
    assert.ok(svg.startsWith('<svg') && !svg.includes('<text'));
    const words = texts.map((x) => x.text);
    assert.ok(words.includes(card.kicker) && words.includes(card.hero) && words.includes(card.heroLabel));
    assert.ok(words.includes('مینا · chartoon.net'));
    assert.ok(texts.every((x) => x.size > 0 && x.x > 0 && x.y > 0));
    // Numbers stay left to right; Persian words don't.
    assert.equal(texts.find((x) => x.text === '+$0.03')?.ltr, true);
    assert.equal(texts.find((x) => x.text === card.kicker)?.ltr, false);
  });

  it('wraps long titles into two lines at most', () => {
    assert.deepEqual(wrapText('یک دو سه', 40), ['یک دو سه']);
    const lines = wrapText('کلمه '.repeat(30), 20);
    assert.equal(lines.length, 2);
    assert.ok(lines[1].endsWith('…'));
  });
});

describe('share moments after a session', () => {
  it('offers the unit card when the last lesson of a unit is done, and the course card for the last of the course', async () => {
    const { findCourse } = await import('../src/content');
    const { sessionMilestone } = await import('../src/lib/milestones');
    const course = findCourse('basics')!;
    const unit = course.units[0];
    const before: Record<string, unknown> = Object.fromEntries(unit.lessons.slice(0, -1).map((l) => [l.id, { best: 1, perfect: true }]));
    const last = unit.lessons[unit.lessons.length - 1].id;
    const after = { ...before, [last]: { best: 1, perfect: true } };
    const streak = { streak: 2, bestStreak: 2 };
    const unitMoment = sessionMilestone({ name: 'x', lessonId: last, before: { completed: before, ...streak }, after: { completed: after, ...streak }, week: [] });
    assert.equal(unitMoment?.kind, 'unit');
    assert.ok(unitMoment?.title.includes(unit.title));

    const all = course.units.flatMap((u) => u.lessons.map((l) => l.id));
    const lastOfCourse = all[all.length - 1];
    const almost = Object.fromEntries(all.slice(0, -1).map((id) => [id, { best: 1 }]));
    const courseMoment = sessionMilestone({
      name: 'x',
      lessonId: lastOfCourse,
      before: { completed: almost, ...streak },
      after: { completed: { ...almost, [lastOfCourse]: { best: 1 } }, ...streak },
      week: [],
    });
    assert.equal(courseMoment?.kind, 'course');
  });

  it('offers the streak card on milestone days only', async () => {
    const { sessionMilestone } = await import('../src/lib/milestones');
    const at = (from: number, to: number, best: number) =>
      sessionMilestone({ name: 'x', before: { completed: {}, streak: from, bestStreak: best }, after: { completed: {}, streak: to, bestStreak: Math.max(best, to) }, week: [] })?.kind ?? null;
    assert.equal(at(6, 7, 6), 'streak');
    assert.equal(at(8, 9, 12), null);
    assert.equal(at(12, 13, 12), null);
    assert.equal(at(13, 14, 13), 'streak');
    assert.equal(at(15, 16, 15), null);
    assert.equal(at(7, 7, 7), null);
  });
});
