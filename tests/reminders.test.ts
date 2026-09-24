import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planReminders, REMINDER_DAYS } from '../src/lib/reminderPlan';

// Wednesday 24 Sep 2026, 10:00 local time.
const now = new Date(2026, 8, 24, 10, 0);
const at = (r: { date: Date }) => `${r.date.getDate()} ${r.date.getHours()}:${String(r.date.getMinutes()).padStart(2, '0')}`;

describe('streak reminders', () => {
  it('come once a day at the chosen hour for a week', () => {
    const plan = planReminders({ streak: 0, lastActiveDay: null }, 20, now);
    assert.equal(plan.length, REMINDER_DAYS);
    assert.deepEqual(plan.map(at), ['24 20:00', '25 20:00', '26 20:00', '27 20:00', '28 20:00', '29 20:00', '30 20:00']);
  });

  it('skip today once the learner has practised, or when the hour has passed', () => {
    const practised = planReminders({ streak: 3, lastActiveDay: '2026-09-24' }, 20, now);
    assert.equal(practised[0].date.getDate(), 25);
    const late = planReminders({ streak: 0, lastActiveDay: null }, 9, now);
    assert.equal(late[0].date.getDate(), 25);
    assert.equal(late.length, REMINDER_DAYS - 1);
  });

  it('name the streak that is about to go out', () => {
    // Active yesterday: today's reminder saves a 5-day streak.
    const today = planReminders({ streak: 5, lastActiveDay: '2026-09-23' }, 20, now);
    assert.match(today[0].title, /۵ روزه/);
    assert.doesNotMatch(today[1].title, /روزه‌ت/);
    // Practised today: tomorrow's reminder carries the streak instead.
    const tomorrow = planReminders({ streak: 6, lastActiveDay: '2026-09-24' }, 20, now);
    assert.match(tomorrow[0].title, /۶ روزه/);
    // A streak that already broke isn't mentioned, unless freezes still cover the gap.
    assert.doesNotMatch(planReminders({ streak: 9, lastActiveDay: '2026-09-20' }, 20, now)[0].title, /روزه‌ت/);
    assert.match(planReminders({ streak: 9, lastActiveDay: '2026-09-20', freezes: 3 }, 20, now)[0].title, /۹ روزه/);
  });

  it('vary the other messages from day to day', () => {
    const titles = planReminders({ streak: 0, lastActiveDay: null }, 20, now).map((r) => r.title);
    assert.ok(new Set(titles).size >= 5, titles.join(' | '));
  });
});
