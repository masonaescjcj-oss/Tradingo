import type { Lesson, Market, Unit } from './types';
import { basics } from './units/basics';
import { candles } from './units/candles';
import { crypto } from './units/crypto';
import { forex } from './units/forex';
import { psychology } from './units/psychology';
import { risk } from './units/risk';
import { trend } from './units/trend';

export * from './types';

export const ALL_UNITS: Unit[] = [basics, forex, crypto, candles, trend, risk, psychology];

export function unitsFor(market: Market): Unit[] {
  return ALL_UNITS.filter((u) => u.track === 'common' || market === 'both' || u.track === market);
}

export function findLesson(id: string): { unit: Unit; lesson: Lesson; index: number } | undefined {
  for (const unit of ALL_UNITS) {
    const index = unit.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index };
  }
  return undefined;
}

export function findUnit(id: string): Unit | undefined {
  return ALL_UNITS.find((u) => u.id === id);
}

/** Every lesson id for a market, in path order. */
export function lessonOrder(market: Market): string[] {
  return unitsFor(market).flatMap((u) => u.lessons.map((l) => l.id));
}

/** A reward chest sits after the second lesson of units with three or more lessons. */
export const CHEST_AFTER = 2;
export const CHEST_COINS = 30;

export function chestId(unit: Unit): string | null {
  return unit.lessons.length > CHEST_AFTER ? `${unit.id}-chest` : null;
}
