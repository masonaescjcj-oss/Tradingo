import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findCourse } from '../src/content';
import { placementOpen, placementUnit } from '../src/lib/placement';
import { buildSession } from '../src/lib/session';

const units = findCourse('basics')!.units;
const done = (n: number) => Object.fromEntries(units.slice(0, n).flatMap((u) => u.lessons.map((l) => [l.id, { best: 1, perfect: true }])));

describe('placement test after onboarding', () => {
  it('offers a jump test instead of skipping on the learner\'s word', () => {
    assert.equal(placementUnit('new'), null);
    assert.equal(placementUnit('some'), units[0].id);
    assert.equal(placementUnit('pro'), units[1].id);
  });

  it('builds a real jump test for the offered unit', () => {
    const session = buildSession(`test-${placementUnit('pro')}`, { completed: {}, mistakes: [], reviews: {} } as never);
    assert.equal(session?.kind, 'test');
    assert.ok(session && session.steps.length > 0);
  });

  it('stays open until that unit is done', () => {
    assert.equal(placementOpen(units[1].id, {}), true);
    assert.equal(placementOpen(units[1].id, done(1)), true);
    assert.equal(placementOpen(units[1].id, done(2)), false);
    assert.equal(placementOpen(null, {}), false);
    assert.equal(placementOpen('no-such-unit', {}), false);
  });
});
