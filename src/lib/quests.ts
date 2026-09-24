/**
 * Daily quests, Duolingo style: three small goals a day (one about XP, one about
 * learning, and often one in the simulator). Finishing all three opens the day's quest
 * chest. The same day always gives the same quests.
 */
import { fa } from '@/utils/format';
import { createRng, hashString } from '@/utils/random';

export type QuestMetric = 'xp' | 'lessons' | 'perfect' | 'combo' | 'practice' | 'seconds' | 'trades' | 'stopTrades';

export type Quest = { id: string; metric: QuestMetric; target: number; title: string; kind: 'xp' | 'learn' | 'trade' };

/** What the learner did today, counted per metric; `chest` once the quest chest is opened. */
export type QuestLog = { day: string; counts: Partial<Record<QuestMetric, number>>; chest: boolean };

/** Metrics that keep the day's best (a streak of right answers) instead of adding up. */
const BEST_OF_DAY: QuestMetric[] = ['combo'];

type Template = { metric: QuestMetric; targets: number[]; title: (n: number) => string };

const LEARN: Template[] = [
  { metric: 'lessons', targets: [2, 3], title: (n) => `${fa(n)} درس تموم کن` },
  { metric: 'perfect', targets: [1, 2], title: (n) => (n === 1 ? 'یه درس رو بدون غلط تموم کن' : `${fa(n)} درس رو بدون غلط تموم کن`) },
  { metric: 'combo', targets: [5, 8, 10], title: (n) => `${fa(n)} جواب درست پشت سر هم بده` },
  { metric: 'practice', targets: [1, 2], title: (n) => (n === 1 ? 'یه تمرین انجام بده' : `${fa(n)} تمرین انجام بده`) },
  { metric: 'seconds', targets: [300, 600], title: (n) => `${fa(n / 60)} دقیقه درس بخون یا تمرین کن` },
];

const TRADE: Template[] = [
  { metric: 'stopTrades', targets: [1, 2], title: (n) => (n === 1 ? 'یه معامله با حد ضرر توی شبیه‌ساز باز کن' : `${fa(n)} معامله با حد ضرر توی شبیه‌ساز باز کن`) },
  { metric: 'trades', targets: [2, 3], title: (n) => `${fa(n)} معامله توی شبیه‌ساز باز کن` },
];

/** A bit more than the daily goal, rounded to tens. */
export function xpQuestTarget(dailyGoal: number): number {
  return Math.max(30, Math.ceil((dailyGoal * 1.5) / 10) * 10);
}

export function questsFor(day: string, dailyGoal: number): Quest[] {
  const rng = createRng(hashString(`quests:${day}`));
  const pick = <T>(list: T[]) => list[Math.floor(rng() * list.length)];
  const make = (t: Template, id: string, kind: Quest['kind']): Quest => {
    const target = pick(t.targets);
    return { id, metric: t.metric, target, title: t.title(target), kind };
  };
  const xp = xpQuestTarget(dailyGoal);
  const learn = pick(LEARN);
  const second = make(learn, 'learn', 'learn');
  const third = rng() < 0.6 ? make(pick(TRADE), 'trade', 'trade') : make(pick(LEARN.filter((t) => t !== learn)), 'learn2', 'learn');
  return [{ id: 'xp', metric: 'xp', target: xp, title: `${fa(xp)} امتیاز بگیر`, kind: 'xp' }, second, third];
}

/** Today's log, or a fresh one when the saved log is from another day. */
export function logFor(log: QuestLog | null | undefined, day: string): QuestLog {
  return log && log.day === day ? log : { day, counts: {}, chest: false };
}

export function addToLog(log: QuestLog | null | undefined, day: string, patch: Partial<Record<QuestMetric, number>>): QuestLog {
  const base = logFor(log, day);
  const counts = { ...base.counts };
  for (const [key, value] of Object.entries(patch) as [QuestMetric, number][]) {
    if (!value || value < 0) continue;
    counts[key] = BEST_OF_DAY.includes(key) ? Math.max(counts[key] ?? 0, value) : (counts[key] ?? 0) + value;
  }
  return { ...base, counts };
}

export function questProgress(q: Quest, log: QuestLog | null | undefined, day: string): number {
  return Math.min(q.target, logFor(log, day).counts[q.metric] ?? 0);
}

export function questDone(q: Quest, log: QuestLog | null | undefined, day: string): boolean {
  return questProgress(q, log, day) >= q.target;
}

export function questsDone(quests: Quest[], log: QuestLog | null | undefined, day: string): number {
  return quests.filter((q) => questDone(q, log, day)).length;
}

const CHEST_PREFIX = 'quests-';

export function questChestId(day: string): string {
  return `${CHEST_PREFIX}${day}`;
}

/** The day of a quest chest id, or null for other chests. */
export function questChestDay(id: string): string | null {
  return id.startsWith(CHEST_PREFIX) ? id.slice(CHEST_PREFIX.length) : null;
}

/** Cloud merge: the newer day wins; the same day keeps the higher counts. */
export function mergeQuestLogs(a: QuestLog | null | undefined, b: QuestLog | null | undefined): QuestLog | null {
  if (!a || !b) return a ?? b ?? null;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  const counts: Partial<Record<QuestMetric, number>> = { ...b.counts };
  for (const [key, value] of Object.entries(a.counts) as [QuestMetric, number][]) counts[key] = Math.max(counts[key] ?? 0, value);
  return { day: a.day, counts, chest: a.chest || b.chest };
}
