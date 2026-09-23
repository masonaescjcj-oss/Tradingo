import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ALL_UNITS, type Market } from '@/content';
import { buildBoard, DEMOTE_COUNT, LEAGUES, PROMOTE_COUNT, userRank } from '@/lib/league';
import { addDays, dayKey, weekKey } from '@/utils/date';

export const MAX_HEARTS = 5;
export const HEART_REFILL_MS = 30 * 60 * 1000;
export const HEART_REFILL_COST = 100;
export const START_BALANCE = 10_000;
export const DAILY_REWARD = 20;

export type Level = 'new' | 'some' | 'pro';

export type LessonRecord = { best: number; perfect: boolean; skipped?: boolean };

export type Position = {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number;
  entry: number;
  sl?: number;
  tp?: number;
  openedAt: number;
};

export type ClosedTrade = Position & { exit: number; pnl: number; closedAt: number; reason: 'manual' | 'sl' | 'tp' };

type Data = {
  onboarded: boolean;
  market: Market;
  level: Level;
  name: string;
  xp: number;
  coins: number;
  hearts: number;
  heartsUpdatedAt: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: string | null;
  activeDays: string[];
  dailyGoal: number;
  dailyXp: number;
  dailyDay: string;
  dailyClaimedDay: string | null;
  weekKey: string;
  weeklyXp: number;
  league: number;
  lastLeagueChange: { week: string; rank: number; change: -1 | 0 | 1 } | null;
  completed: Record<string, LessonRecord>;
  chests: string[];
  /** "lessonId:stepIndex" of questions answered wrong, for the review practice. */
  mistakes: string[];
  practiceSessions: number;
  sim: { balance: number; positions: Position[]; history: ClosedTrade[] };
};

type Actions = {
  finishOnboarding: (market: Market, level: Level) => void;
  setMarket: (market: Market) => void;
  setName: (name: string) => void;
  setDailyGoal: (goal: number) => void;
  syncHearts: () => void;
  loseHeart: () => void;
  refillHearts: () => boolean;
  addXp: (amount: number) => void;
  completeLesson: (lessonId: string, accuracy: number, xp: number, coins: number) => void;
  completePractice: (xp: number) => void;
  claimChest: (id: string, coins: number) => void;
  claimDaily: () => void;
  recordMistake: (key: string) => void;
  clearMistake: (key: string) => void;
  rolloverWeek: () => void;
  openPosition: (p: Omit<Position, 'id' | 'openedAt'>) => void;
  closePosition: (id: string, exit: number, pnl: number, reason: ClosedTrade['reason']) => void;
  resetSim: () => void;
  resetAll: () => void;
};

export type GameState = Data & Actions;

function initialData(): Data {
  const now = new Date();
  return {
    onboarded: false,
    market: 'both',
    level: 'new',
    name: 'تریدر',
    xp: 0,
    coins: 50,
    hearts: MAX_HEARTS,
    heartsUpdatedAt: Date.now(),
    streak: 0,
    bestStreak: 0,
    lastActiveDay: null,
    activeDays: [],
    dailyGoal: 30,
    dailyXp: 0,
    dailyDay: dayKey(now),
    dailyClaimedDay: null,
    weekKey: weekKey(now),
    weeklyXp: 0,
    league: 0,
    lastLeagueChange: null,
    completed: {},
    chests: [],
    mistakes: [],
    practiceSessions: 0,
    sim: { balance: START_BALANCE, positions: [], history: [] },
  };
}

/** Hearts come back one at a time while below the maximum. */
export function heartsNow(s: Pick<Data, 'hearts' | 'heartsUpdatedAt'>, now = Date.now()) {
  if (s.hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, nextInMs: 0, updatedAt: now };
  const gained = Math.floor((now - s.heartsUpdatedAt) / HEART_REFILL_MS);
  const hearts = Math.min(MAX_HEARTS, s.hearts + gained);
  const updatedAt = s.heartsUpdatedAt + gained * HEART_REFILL_MS;
  return { hearts, nextInMs: hearts >= MAX_HEARTS ? 0 : HEART_REFILL_MS - (now - updatedAt), updatedAt };
}

/** The streak only counts if the user was active today or yesterday. */
export function currentStreak(s: Pick<Data, 'streak' | 'lastActiveDay'>, today = dayKey()): number {
  if (!s.lastActiveDay) return 0;
  const yesterday = dayKey(addDays(new Date(), -1));
  return s.lastActiveDay === today || s.lastActiveDay === yesterday ? s.streak : 0;
}

export function todaysXp(s: Pick<Data, 'dailyXp' | 'dailyDay'>): number {
  return s.dailyDay === dayKey() ? s.dailyXp : 0;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      finishOnboarding: (market, level) => {
        const completed: Record<string, LessonRecord> = {};
        // Experienced users skip the introductory units.
        const skipUnits = level === 'pro' ? ['basics', 'forex', 'crypto'] : level === 'some' ? ['basics'] : [];
        for (const unit of ALL_UNITS) {
          if (!skipUnits.includes(unit.id)) continue;
          for (const lesson of unit.lessons) completed[lesson.id] = { best: 0, perfect: false, skipped: true };
        }
        set({ onboarded: true, market, level, completed });
      },

      setMarket: (market) => set({ market }),
      setName: (name) => set({ name: name.trim() || 'تریدر' }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),

      syncHearts: () => {
        const h = heartsNow(get());
        set({ hearts: h.hearts, heartsUpdatedAt: h.updatedAt });
      },

      loseHeart: () => {
        const h = heartsNow(get());
        const wasFull = h.hearts >= MAX_HEARTS;
        set({ hearts: Math.max(0, h.hearts - 1), heartsUpdatedAt: wasFull ? Date.now() : h.updatedAt });
      },

      refillHearts: () => {
        const { coins } = get();
        if (coins < HEART_REFILL_COST) return false;
        set({ coins: coins - HEART_REFILL_COST, hearts: MAX_HEARTS, heartsUpdatedAt: Date.now() });
        return true;
      },

      addXp: (amount) => {
        get().rolloverWeek();
        const s = get();
        const today = dayKey();
        const yesterday = dayKey(addDays(new Date(), -1));
        let { streak, lastActiveDay, activeDays } = s;
        if (lastActiveDay !== today) {
          streak = lastActiveDay === yesterday ? streak + 1 : 1;
          lastActiveDay = today;
          activeDays = [...activeDays.filter((d) => d !== today), today].slice(-30);
        }
        set({
          xp: s.xp + amount,
          dailyXp: (s.dailyDay === today ? s.dailyXp : 0) + amount,
          dailyDay: today,
          weeklyXp: s.weeklyXp + amount,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          lastActiveDay,
          activeDays,
        });
      },

      completeLesson: (lessonId, accuracy, xp, coins) => {
        const prev = get().completed[lessonId];
        const record: LessonRecord = {
          best: Math.max(prev?.skipped ? 0 : (prev?.best ?? 0), accuracy),
          perfect: !!prev?.perfect || accuracy >= 1,
        };
        set((s) => ({ completed: { ...s.completed, [lessonId]: record }, coins: s.coins + coins }));
        get().addXp(xp);
      },

      completePractice: (xp) => {
        const h = heartsNow(get());
        // Practice earns a heart back, like a small reward for reviewing.
        set((s) => ({
          practiceSessions: s.practiceSessions + 1,
          hearts: Math.min(MAX_HEARTS, h.hearts + 1),
          heartsUpdatedAt: h.updatedAt,
        }));
        get().addXp(xp);
      },

      claimChest: (id, coins) => {
        if (get().chests.includes(id)) return;
        set((s) => ({ chests: [...s.chests, id], coins: s.coins + coins }));
      },

      claimDaily: () => {
        const s = get();
        const today = dayKey();
        if (s.dailyClaimedDay === today || todaysXp(s) < s.dailyGoal) return;
        set({ dailyClaimedDay: today, coins: s.coins + DAILY_REWARD });
      },

      recordMistake: (key) =>
        set((s) => ({ mistakes: [key, ...s.mistakes.filter((k) => k !== key)].slice(0, 40) })),
      clearMistake: (key) => set((s) => ({ mistakes: s.mistakes.filter((k) => k !== key) })),

      rolloverWeek: () => {
        const s = get();
        const current = weekKey();
        if (s.weekKey === current) return;
        let league = s.league;
        let lastLeagueChange = s.lastLeagueChange;
        // Only a week the user actually played can move them between leagues.
        if (s.weeklyXp > 0) {
          const rows = buildBoard(s.weekKey, s.league, s.name, s.weeklyXp, 1);
          const rank = userRank(rows);
          let change: -1 | 0 | 1 = 0;
          if (rank <= PROMOTE_COUNT && league < LEAGUES.length - 1) change = 1;
          else if (rank > rows.length - DEMOTE_COUNT && league > 0) change = -1;
          league += change;
          lastLeagueChange = { week: s.weekKey, rank, change };
        }
        set({ weekKey: current, weeklyXp: 0, league, lastLeagueChange });
      },

      openPosition: (p) => {
        const position: Position = { ...p, id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, openedAt: Date.now() };
        set((s) => ({ sim: { ...s.sim, positions: [...s.sim.positions, position] } }));
      },

      closePosition: (id, exit, pnl, reason) =>
        set((s) => {
          const pos = s.sim.positions.find((p) => p.id === id);
          if (!pos) return s;
          return {
            sim: {
              balance: s.sim.balance + pnl,
              positions: s.sim.positions.filter((p) => p.id !== id),
              history: [{ ...pos, exit, pnl, reason, closedAt: Date.now() }, ...s.sim.history].slice(0, 50),
            },
          };
        }),

      resetSim: () => set({ sim: { balance: START_BALANCE, positions: [], history: [] } }),

      resetAll: () => set(initialData()),
    }),
    {
      name: 'tradingo-game',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
