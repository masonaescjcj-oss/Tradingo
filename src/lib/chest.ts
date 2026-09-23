/**
 * Reward chests on the learning path, Duolingo style: a chest starts at a tier, three
 * taps each have a chance to upgrade it, and the final tier decides the reward.
 * The same chest always plays out the same way, so leaving and coming back can't
 * re-roll it.
 */
import { createRng, hashString } from '@/utils/random';

export type ChestTier = 'common' | 'rare' | 'epic' | 'legendary';

export const CHEST_TIERS: ChestTier[] = ['common', 'rare', 'epic', 'legendary'];

export const UPGRADE_TAPS = 3;

/** Chance that one tap lifts the chest from this tier to the next. */
export const UPGRADE_CHANCE: Record<ChestTier, number> = { common: 0.4, rare: 0.25, epic: 0.12, legendary: 0 };

/** Chance a chest starts as rare instead of common. */
export const RARE_START = 0.25;

export type ChestReward = { coins: number; xp: number; hearts: boolean };

export const CHEST_REWARDS: Record<ChestTier, ChestReward> = {
  common: { coins: 20, xp: 0, hearts: false },
  rare: { coins: 40, xp: 10, hearts: false },
  epic: { coins: 80, xp: 20, hearts: true },
  legendary: { coins: 150, xp: 40, hearts: true },
};

export type ChestPlan = {
  start: ChestTier;
  /** Tier after each tap. */
  steps: ChestTier[];
  final: ChestTier;
};

export function nextTier(tier: ChestTier): ChestTier {
  return CHEST_TIERS[Math.min(CHEST_TIERS.length - 1, CHEST_TIERS.indexOf(tier) + 1)];
}

export function chestPlan(id: string): ChestPlan {
  const rng = createRng(hashString(`chest:${id}`));
  const start: ChestTier = rng() < RARE_START ? 'rare' : 'common';
  const steps: ChestTier[] = [];
  let tier: ChestTier = start;
  for (let i = 0; i < UPGRADE_TAPS; i++) {
    if (rng() < UPGRADE_CHANCE[tier]) tier = nextTier(tier);
    steps.push(tier);
  }
  return { start, steps, final: tier };
}
