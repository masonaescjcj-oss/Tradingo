/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CHEST_REWARDS, CHEST_TIERS, chestPlan, nextTier, UPGRADE_TAPS } from '../src/lib/chest';

describe('reward chests', () => {
  it('play out the same way every time for a chest', () => {
    assert.deepEqual(chestPlan('u1-chest'), chestPlan('u1-chest'));
  });

  it('start common or rare and only move up, one tier per tap', () => {
    for (let i = 0; i < 500; i++) {
      const plan = chestPlan(`unit-${i}-chest`);
      assert.ok(plan.start === 'common' || plan.start === 'rare');
      assert.equal(plan.steps.length, UPGRADE_TAPS);
      let prev = CHEST_TIERS.indexOf(plan.start);
      for (const t of plan.steps) {
        const at = CHEST_TIERS.indexOf(t);
        assert.ok(at === prev || at === prev + 1);
        prev = at;
      }
      assert.equal(plan.final, plan.steps[plan.steps.length - 1]);
    }
  });

  it('mixes tiers across chests, with legendary the rarest', () => {
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < 2000; i++) counts[chestPlan(`c${i}`).final] += 1;
    assert.ok(counts.common > 0 && counts.rare > 0 && counts.epic > 0);
    assert.ok(counts.legendary < counts.epic && counts.epic < counts.rare);
  });

  it('give better rewards for better tiers', () => {
    for (let i = 1; i < CHEST_TIERS.length; i++) assert.ok(CHEST_REWARDS[CHEST_TIERS[i]].coins > CHEST_REWARDS[CHEST_TIERS[i - 1]].coins);
    assert.equal(nextTier('legendary'), 'legendary');
  });
});
