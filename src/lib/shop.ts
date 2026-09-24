/** The coin shop: streak freezes, streak repair, a double-XP boost and a heart refill. */

export type ShopItemId = 'freeze' | 'repair' | 'boost' | 'hearts';

export const PRICES: Record<ShopItemId, number> = {
  freeze: 150,
  repair: 250,
  boost: 80,
  hearts: 100,
};

/** How long a double-XP boost lasts; buying another adds to the time left. */
export const BOOST_MS = 15 * 60_000;

export function boostLeftMs(boostUntil: number | undefined, now = Date.now()): number {
  return Math.max(0, (boostUntil ?? 0) - now);
}

export function boostActive(boostUntil: number | undefined, now = Date.now()): boolean {
  return boostLeftMs(boostUntil, now) > 0;
}

/** XP from a lesson or practice, doubled while a boost runs. */
export function boostedXp(xp: number, boostUntil: number | undefined, now = Date.now()): number {
  return boostActive(boostUntil, now) ? xp * 2 : xp;
}

/** The new end time after buying a boost now. */
export function extendBoost(boostUntil: number | undefined, now = Date.now()): number {
  return Math.max(now, boostUntil ?? 0) + BOOST_MS;
}

export type BuyResult = 'ok' | 'coins' | 'full' | 'unavailable';
