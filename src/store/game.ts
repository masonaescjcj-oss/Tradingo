import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { findCourse, findUnitWithCourse, starterCourses, type Market } from '@/content';
import type { ChestReward } from '@/lib/chest';
import { buildBoard, DEMOTE_COUNT, LEAGUES, PROMOTE_COUNT, userRank } from '@/lib/league';
import { heartsNow, MAX_HEARTS, nextStreak, todaysXp } from '@/lib/progress';
import { nextReview, type Review } from '@/lib/review';
import { safeStorage } from '@/lib/storage';
import { evaluateChallenge, findChallenge, type ChallengeRecord } from '@/lib/challenges';
import { newReplaySession, replayFinished, replayPrice, stepReplay, type ReplaySession } from '@/lib/replay';
import { findSymbol } from '@/lib/simulator';
import {
  cancelOrder,
  closeAt,
  emptyAccount,
  flatten,
  placeOrder,
  processPath,
  type Account,
  type ClosedTrade,
  type OrderRequest,
  type PendingOrder,
  type PlaceError,
  type Position,
  type TradeEvent,
} from '@/lib/trading';
import { dayKey, weekKey } from '@/utils/date';

export { HEART_REFILL_MS, MAX_HEARTS } from '@/lib/progress';
export const HEART_REFILL_COST = 100;
export const START_BALANCE = 10_000;
export const DAILY_REWARD = 20;

export type Level = 'new' | 'some' | 'pro';

export type UserAccount = {
  name: string;
  /** 09XXXXXXXXX */
  mobile: string;
  /** Salted SHA-256, only for signing back in on this device. */
  passwordHash: string;
  createdAt: number;
  /** Also registered on the server (Supabase). */
  cloud: boolean;
};

export type LessonRecord = { best: number; perfect: boolean; skipped?: boolean };

export type { ClosedTrade, PendingOrder, Position } from '@/lib/trading';

/** Which simulator account an action applies to: the live one or the market replay's. */
export type SimBook = 'live' | 'replay';

export type SimTools = { ma: boolean; ma2: boolean; bands: boolean; rsi: boolean; volume: boolean; levels: Record<string, number[]> };

export type SimReplay = { session: ReplaySession | null; account: Account };

export const DEFAULT_SIM_TOOLS: SimTools = { ma: true, ma2: false, bands: false, rsi: false, volume: false, levels: {} };

export type GameData = Data;

type Data = {
  onboarded: boolean;
  /** Market used by the simulator and to pick starter courses. */
  market: Market;
  /** Course ids the learner added, in the order they were added. */
  enrolled: string[];
  activeCourse: string;
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
  /** Spaced repetition: when each studied lesson is next due for review, and the current gap in days. */
  reviews: Record<string, Review>;
  practiceSessions: number;
  /** Sound effects and haptics on answers, chests and lesson ends. */
  sound: boolean;
  /** Units whose mastery test was passed; they show a crown on the path. */
  mastered: string[];
  /** The learner's account on this device (mobile + password, no verification code yet). */
  user: UserAccount | null;
  /** True after "sign out": the progress stays on the device until they sign in again. */
  signedOut: boolean;
  /** Answers from onboarding, kept for personalisation and stats. */
  answers: { reason?: string; source?: string };
  sim: { balance: number; positions: Position[]; history: ClosedTrade[] };
  /** Pending limit/stop orders of the live simulator (a top-level key so older saves get a default). */
  simOrders: PendingOrder[];
  /** Market replay: the current session and its own practice account. */
  simReplay: SimReplay;
  /** Simulator challenges the learner started or finished. */
  simChallenges: Record<string, ChallengeRecord>;
  /** Simulator chart indicators and the learner's horizontal levels per symbol. */
  simTools: SimTools;
};

type Actions = {
  finishOnboarding: (market: Market, level: Level) => void;
  setMarket: (market: Market) => void;
  /** Adds a course (if needed) and makes it the one shown on the path. */
  openCourse: (courseId: string) => void;
  leaveCourse: (courseId: string) => void;
  setName: (name: string) => void;
  setDailyGoal: (goal: number) => void;
  setSound: (on: boolean) => void;
  masterUnit: (unitId: string, xp: number) => void;
  setAnswers: (answers: { reason?: string; source?: string }) => void;
  createAccount: (user: UserAccount) => void;
  signOutAccount: () => void;
  signInAccount: () => void;
  syncHearts: () => void;
  loseHeart: () => void;
  refillHearts: () => boolean;
  addXp: (amount: number) => void;
  completeLesson: (lessonId: string, accuracy: number, xp: number, coins: number) => void;
  /** `reviewed` maps each practised lesson to whether its questions were all answered right first time. */
  completePractice: (xp: number, reviewed?: Record<string, boolean>) => void;
  /** Passing a unit's test-out marks it and every earlier unit of its course as done. */
  passUnitTest: (unitId: string, xp: number) => void;
  /** Opens a path chest once: its coins, XP and (for the best tiers) a full set of hearts. */
  claimChest: (id: string, reward: ChestReward) => void;
  claimDaily: () => void;
  recordMistake: (key: string) => void;
  clearMistake: (key: string) => void;
  rolloverWeek: () => void;
  /** Moves live prices (mid-price paths per symbol) and returns the fills and closes they caused. */
  simProcess: (moves: { symbol: string; path: number[] }[], mids: Record<string, number>) => TradeEvent[];
  simPlace: (book: SimBook, req: OrderRequest, mid: number, mids: Record<string, number>) => { error?: PlaceError; event?: TradeEvent };
  simClose: (book: SimBook, id: string, mid: number) => ClosedTrade | undefined;
  simCancel: (book: SimBook, id: string) => void;
  simNote: (book: SimBook, tradeId: string, note: string) => void;
  setSimTools: (patch: Partial<SimTools>) => void;
  resetSim: () => void;
  /** Starts a replay session; open replay trades of the previous one are closed first. */
  replayStart: (symbol: string, seed: number) => void;
  /** Reveals the next candles of the replay and returns what they triggered. */
  replayStep: (count: number) => TradeEvent[];
  replayEnd: () => void;
  resetReplay: () => void;
  startChallenge: (id: string) => void;
  /** Grants a finished challenge's coins and XP once. */
  claimChallenge: (id: string) => boolean;
  resetAll: () => void;
};

export type GameState = Data & Actions;

function initialData(): Data {
  const now = new Date();
  return {
    onboarded: false,
    market: 'both',
    enrolled: ['basics'],
    activeCourse: 'basics',
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
    reviews: {},
    practiceSessions: 0,
    sound: true,
    mastered: [],
    user: null,
    signedOut: false,
    answers: {},
    sim: { balance: START_BALANCE, positions: [], history: [] },
    simOrders: [],
    simReplay: { session: null, account: emptyAccount(START_BALANCE) },
    simChallenges: {},
    simTools: DEFAULT_SIM_TOOLS,
  };
}

const simId = () => `${Date.now().toString(36)}-${Math.round(Math.random() * 1e8).toString(36)}`;

// Saved state is merged shallowly, so new sim keys are read defensively.
function liveAccount(s: Data): Account {
  return { balance: s.sim.balance, positions: s.sim.positions, history: s.sim.history, orders: s.simOrders ?? [] };
}

function liveData(a: Account): Pick<Data, 'sim' | 'simOrders'> {
  return { sim: { balance: a.balance, positions: a.positions, history: a.history }, simOrders: a.orders };
}

function replayOf(s: Data): SimReplay {
  return s.simReplay ?? { session: null, account: emptyAccount(START_BALANCE) };
}

function bookAccount(s: Data, book: SimBook): Account {
  return book === 'live' ? liveAccount(s) : replayOf(s).account;
}

function withBook(s: Data, book: SimBook, account: Account): Partial<Data> {
  return book === 'live' ? liveData(account) : { simReplay: { ...replayOf(s), account } };
}

/** Closes the replay's open trades at its current price before its chart goes away. */
function closeReplay(rep: SimReplay): Account {
  if (!rep.session) return rep.account;
  const price = replayPrice(rep.session);
  const flat = price != null ? flatten(rep.account, { [rep.session.symbol]: price }, Date.now()) : rep.account;
  return { ...flat, positions: [], orders: [] };
}

const DATA_KEYS = Object.keys(initialData()) as (keyof Data)[];

/** Just the saved data of the store, without its actions. */
export function pickData(s: Data): Data {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as Data;
}

export { currentStreak, heartsNow, todaysXp } from '@/lib/progress';

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      finishOnboarding: (market, level) => {
        const completed: Record<string, LessonRecord> = {};
        const enrolled = starterCourses(market);
        // Experienced users skip the first units of the introductory courses.
        const skip: Record<string, number> = level === 'pro' ? { basics: 2, forex: 1, crypto: 1 } : level === 'some' ? { basics: 1 } : {};
        for (const [courseId, units] of Object.entries(skip)) {
          for (const unit of findCourse(courseId)?.units.slice(0, units) ?? []) {
            for (const lesson of unit.lessons) completed[lesson.id] = { best: 0, perfect: false, skipped: true };
          }
        }
        const activeCourse = level === 'pro' ? enrolled[1] : 'basics';
        set({ onboarded: true, market, level, completed, enrolled, activeCourse });
      },

      setMarket: (market) => set({ market }),

      openCourse: (courseId) => {
        if (!findCourse(courseId)) return;
        set((s) => ({
          activeCourse: courseId,
          enrolled: s.enrolled.includes(courseId) ? s.enrolled : [...s.enrolled, courseId],
        }));
      },

      leaveCourse: (courseId) =>
        set((s) => {
          const enrolled = s.enrolled.filter((id) => id !== courseId);
          if (enrolled.length === 0) return s;
          return { enrolled, activeCourse: s.activeCourse === courseId ? enrolled[0] : s.activeCourse };
        }),

      setName: (name) => {
        const clean = name.trim() || 'تریدر';
        set((s) => ({ name: clean, user: s.user ? { ...s.user, name: clean } : null }));
      },
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setSound: (sound) => set({ sound }),

      setAnswers: (answers) => set((s) => ({ answers: { ...s.answers, ...answers } })),
      createAccount: (user) => set({ user, name: user.name, signedOut: false }),
      signOutAccount: () => set({ signedOut: true }),
      signInAccount: () => set({ signedOut: false }),

      masterUnit: (unitId, xp) => {
        if (!get().mastered.includes(unitId)) set((s) => ({ mastered: [...s.mastered, unitId], coins: s.coins + 20 }));
        get().addXp(xp);
      },

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
        const streak = nextStreak(s, today);
        const lastActiveDay = today;
        const activeDays = s.lastActiveDay === today ? s.activeDays : [...s.activeDays.filter((d) => d !== today), today].slice(-30);
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
        set((s) => ({
          completed: { ...s.completed, [lessonId]: record },
          coins: s.coins + coins,
          reviews: { ...s.reviews, [lessonId]: nextReview(s.reviews[lessonId], accuracy >= 0.8) },
        }));
        get().addXp(xp);
      },

      completePractice: (xp, reviewed = {}) => {
        const h = heartsNow(get());
        // Practice earns a heart back, like a small reward for reviewing.
        set((s) => ({
          reviews: {
            ...s.reviews,
            ...Object.fromEntries(Object.entries(reviewed).map(([id, good]) => [id, nextReview(s.reviews[id], good)])),
          },
          practiceSessions: s.practiceSessions + 1,
          hearts: Math.min(MAX_HEARTS, h.hearts + 1),
          heartsUpdatedAt: h.updatedAt,
        }));
        get().addXp(xp);
      },

      passUnitTest: (unitId, xp) => {
        const hit = findUnitWithCourse(unitId);
        if (!hit) return;
        const upTo = hit.course.units.findIndex((u) => u.id === unitId);
        const completed = { ...get().completed };
        for (const unit of hit.course.units.slice(0, upTo + 1)) {
          for (const lesson of unit.lessons) {
            if (!completed[lesson.id]) completed[lesson.id] = { best: 0, perfect: false, skipped: true };
          }
        }
        set({ completed });
        get().addXp(xp);
      },

      claimChest: (id, reward) => {
        if (get().chests.includes(id)) return;
        const hearts = reward.hearts ? { hearts: MAX_HEARTS, heartsUpdatedAt: Date.now() } : null;
        set((s) => ({ chests: [...s.chests, id], coins: s.coins + reward.coins, ...hearts }));
        if (reward.xp > 0) get().addXp(reward.xp);
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

      simProcess: (moves, mids) => {
        let account = liveAccount(get());
        if (account.positions.length === 0 && account.orders.length === 0) return [];
        const events: TradeEvent[] = [];
        const now = Date.now();
        for (const m of moves) {
          const spec = findSymbol(m.symbol);
          if (!spec) continue;
          const r = processPath(account, spec, m.path, { now, newId: simId, mids });
          account = r.account;
          events.push(...r.events);
        }
        // Only write (and persist) when something actually happened.
        if (events.length) set(liveData(account));
        return events;
      },

      simPlace: (book, req, mid, mids) => {
        const spec = findSymbol(req.symbol);
        if (!spec) return { error: 'price' };
        const s = get();
        const r = placeOrder(bookAccount(s, book), spec, req, mid, { now: Date.now(), newId: simId, mids });
        if (r.error) return { error: r.error };
        set(withBook(s, book, r.account));
        return { event: r.event };
      },

      simClose: (book, id, mid) => {
        const s = get();
        const account = bookAccount(s, book);
        const spec = findSymbol(account.positions.find((p) => p.id === id)?.symbol ?? '');
        if (!spec) return undefined;
        const r = closeAt(account, spec, id, mid, Date.now());
        if (r.trade) set(withBook(s, book, r.account));
        return r.trade;
      },

      simCancel: (book, id) => {
        const s = get();
        set(withBook(s, book, cancelOrder(bookAccount(s, book), id)));
      },

      simNote: (book, tradeId, note) => {
        const s = get();
        const account = bookAccount(s, book);
        const text = note.trim().slice(0, 200);
        const history = account.history.map((t) => (t.id === tradeId ? { ...t, note: text || undefined } : t));
        set(withBook(s, book, { ...account, history }));
      },

      setSimTools: (patch) => set((s) => ({ simTools: { ...DEFAULT_SIM_TOOLS, ...s.simTools, ...patch } })),

      resetSim: () =>
        set((s) => ({
          sim: { balance: START_BALANCE, positions: [], history: [] },
          simOrders: [],
          // Finished challenges stay finished; attempts in progress start over.
          simChallenges: Object.fromEntries(Object.entries(s.simChallenges ?? {}).filter(([, r]) => r.completedAt != null)),
        })),

      replayStart: (symbol, seed) => {
        const account = closeReplay(replayOf(get()));
        set({ simReplay: { account, session: newReplaySession(symbol, seed, account.balance) } });
      },

      replayStep: (count) => {
        const rep = replayOf(get());
        if (!rep.session || replayFinished(rep.session)) return [];
        const r = stepReplay(rep.account, rep.session, count, { now: Date.now(), newId: simId });
        set({ simReplay: { account: r.account, session: r.session } });
        return r.events;
      },

      replayEnd: () => set((s) => ({ simReplay: { account: closeReplay(replayOf(s)), session: null } })),

      resetReplay: () => set({ simReplay: { session: null, account: emptyAccount(START_BALANCE) } }),

      startChallenge: (id) => {
        const s = get();
        if (!findChallenge(id) || s.simChallenges?.[id]?.completedAt != null) return;
        set({ simChallenges: { ...(s.simChallenges ?? {}), [id]: { startedAt: Date.now(), startBalance: s.sim.balance } } });
      },

      claimChallenge: (id) => {
        const s = get();
        const challenge = findChallenge(id);
        const record = s.simChallenges?.[id];
        if (!challenge || !record || record.completedAt != null) return false;
        if (!evaluateChallenge(challenge, record, s.sim.history).done) return false;
        set({ simChallenges: { ...s.simChallenges, [id]: { ...record, completedAt: Date.now() } }, coins: s.coins + challenge.coins });
        get().addXp(challenge.xp);
        return true;
      },

      resetAll: () => set(initialData()),
    }),
    {
      name: 'tradingo-game',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      migrate: (persisted, version) => {
        const state = persisted as Partial<Data>;
        // v1 had a single path per market; turn it into the matching starter courses.
        if (version < 2) {
          const enrolled = starterCourses(state.market ?? 'both');
          return { ...state, enrolled, activeCourse: 'basics' } as GameState;
        }
        return state as GameState;
      },
    },
  ),
);
