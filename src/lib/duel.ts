/**
 * Chartoon duels: three short rounds that two players (or a player and Shamak, the bot)
 * play on exactly the same material, then compare.
 *
 * 1. Quiz: five questions from the lessons; right and fast scores more.
 * 2. Chart: a real past chart; guess where the price is five candles later.
 * 3. Trade: the next candles of another chart replay in a minute; trade them with $1,000.
 *
 * Everything here is pure: the rounds are built from a seed (plus candles fetched once by
 * whoever starts the duel), so a friend who plays later gets the same duel.
 */
import { allCourses } from '@/content';
import type { Candle } from '@/content/types';
import { fa } from '@/utils/format';
import { createRng, hashString, shuffle } from '@/utils/random';

export const DUEL_VERSION = 1;
export const QUIZ_COUNT = 5;
export const QUIZ_SECONDS = 15;
/** Candles shown in the chart round, and how many later candles decide it. */
export const CHART_SHOWN = 60;
export const CHART_AHEAD = 5;
/** Candles of context in the trade round, and how many replay while trading. */
export const TRADE_HISTORY = 40;
export const TRADE_REPLAY = 40;
export const TRADE_CANDLE_MS = 1500;
export const TRADE_BALANCE = 1000;
export const TRADE_LEVERAGE = 10;
/** Every trade gets a stop this many average candle ranges away. */
export const STOP_ATR = 2;

export type RoundKey = 'quiz' | 'chart' | 'trade';
export const ROUNDS: { key: RoundKey; title: string; hint: string }[] = [
  { key: 'quiz', title: 'سؤال سرعتی', hint: `${fa(QUIZ_COUNT)} سؤال از درس‌ها؛ درست و سریع جواب بده.` },
  { key: 'chart', title: 'ادامه‌ی نمودار', hint: `یه نمودار واقعی؛ حدس بزن قیمت ${fa(CHART_AHEAD)} کندل بعد کجاست.` },
  { key: 'trade', title: 'معامله‌ی ۶۰ ثانیه‌ای', hint: 'نمودار جلو می‌ره؛ با ۱۰۰۰ دلار خرید و فروش کن.' },
];

export type DuelQuestion =
  | { kind: 'choice'; prompt: string; options: string[]; answer: number; explanation: string }
  | { kind: 'truefalse'; prompt: string; answer: boolean; explanation: string };

export type DuelChart = { symbol: string; label: string; decimals: number; candles: Candle[] };

export type DuelRounds = {
  v: number;
  seed: number;
  quiz: DuelQuestion[];
  /** Shown candles followed by CHART_AHEAD hidden ones. */
  chart: DuelChart;
  /** TRADE_HISTORY candles of context followed by TRADE_REPLAY to trade. */
  trade: DuelChart;
  /** Candles came from real market history (not the simulator). */
  real: boolean;
};

export type DuelResult = {
  quiz: { correct: number; points: number };
  chart: { guess: number; points: number };
  trade: { pnl: number; trades: number };
};

// ---------- questions ----------

let pool: DuelQuestion[] | null = null;

/** Short multiple-choice and true/false questions from every course (they fit a phone screen). */
export function questionPool(): DuelQuestion[] {
  if (pool) return pool;
  const out: DuelQuestion[] = [];
  for (const course of allCourses()) {
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        for (const step of lesson.steps) {
          if (step.type === 'choice' && !step.facts && step.prompt.length <= 150 && step.options.length <= 4 && step.options.every((o) => o.length <= 60)) {
            out.push({ kind: 'choice', prompt: step.prompt, options: step.options, answer: step.answer, explanation: step.explanation });
          } else if (step.type === 'truefalse' && step.statement.length <= 150) {
            out.push({ kind: 'truefalse', prompt: step.statement, answer: step.answer, explanation: step.explanation });
          }
        }
      }
    }
  }
  pool = out;
  return out;
}

export function pickQuestions(seed: number, count = QUIZ_COUNT): DuelQuestion[] {
  return shuffle(questionPool(), createRng(hashString(`duel-quiz:${seed}`))).slice(0, count);
}

// ---------- chart windows ----------

export type DuelSymbol = { symbol: string; binance: string; label: string; decimals: number };

export const DUEL_SYMBOLS: DuelSymbol[] = [
  { symbol: 'BTCUSDT', binance: 'BTCUSDT', label: 'BTC/USDT', decimals: 1 },
  { symbol: 'ETHUSDT', binance: 'ETHUSDT', label: 'ETH/USDT', decimals: 2 },
  { symbol: 'XAUUSD', binance: 'PAXGUSDT', label: 'XAU/USD', decimals: 2 },
  { symbol: 'EURUSD', binance: 'EURUSDT', label: 'EUR/USD', decimals: 4 },
];

export type WindowPlan = DuelSymbol & { interval: '1h' | '15m'; endTime: number; limit: number };

/** EUR/USD barely moves on 15-minute candles (Binance quotes it in whole pips), so it only gets the chart round. */
const QUIET_SYMBOLS = ['EURUSD'];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Which past windows a duel uses: two different symbols at a random moment of the last
 * two years (hourly candles for the chart, 15-minute ones for the trade).
 */
export function duelPlan(seed: number, now: number): { chart: WindowPlan; trade: WindowPlan } {
  const rng = createRng(hashString(`duel-plan:${seed}`));
  const order = shuffle(DUEL_SYMBOLS, rng);
  const trade = order.find((s) => s !== order[0] && !QUIET_SYMBOLS.includes(s.symbol)) ?? order[1];
  const at = (step: number) => Math.floor((now - (3 + rng() * 700) * DAY) / step) * step;
  return {
    chart: { ...order[0], interval: '1h', endTime: at(HOUR), limit: CHART_SHOWN + CHART_AHEAD },
    trade: { ...trade, interval: '15m', endTime: at(HOUR / 4), limit: TRADE_HISTORY + TRADE_REPLAY },
  };
}

const roundTo = (v: number, decimals: number) => {
  const k = 10 ** decimals;
  return Math.round(v * k) / k;
};

export function roundCandles(candles: Candle[], decimals: number): Candle[] {
  return candles.map((c) => c.map((v) => roundTo(v, decimals)) as unknown as Candle);
}

/** A random walk standing in for market history when Binance can't be reached. */
export function fallbackCandles(seed: string, count: number, base: number, vol: number, decimals: number): Candle[] {
  const rng = createRng(hashString(seed));
  const out: Candle[] = [];
  let price = base;
  let drift = 0;
  for (let i = 0; i < count; i++) {
    if (i % 12 === 0) drift = (rng() - 0.5) * vol * 0.6;
    const open = price;
    let high = open;
    let low = open;
    for (let t = 0; t < 6; t++) {
      price = Math.max(base * 0.2, price + drift + (rng() - 0.5) * vol);
      high = Math.max(high, price);
      low = Math.min(low, price);
    }
    out.push([open, high, low, price]);
  }
  return roundCandles(out, decimals);
}

/** Puts a duel together from its seed and the two windows of candles. */
export function buildRounds(seed: number, chart: DuelChart, trade: DuelChart, real: boolean): DuelRounds {
  return { v: DUEL_VERSION, seed, quiz: pickQuestions(seed), chart, trade, real };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

// ---------- scoring ----------

/** Average true range of the last `n` candles: a typical candle's size. */
export function atr(candles: Candle[], n = 14): number {
  const from = Math.max(1, candles.length - n);
  let sum = 0;
  let count = 0;
  for (let i = from; i < candles.length; i++) {
    const [, h, l] = candles[i];
    const prev = candles[i - 1][3];
    sum += Math.max(h - l, Math.abs(h - prev), Math.abs(l - prev));
    count += 1;
  }
  if (count === 0 && candles.length) return candles[0][1] - candles[0][2] || candles[0][3] * 0.001;
  return sum / Math.max(1, count) || candles[candles.length - 1][3] * 0.001;
}

export function quizPoints(correct: boolean, secondsLeft: number): number {
  return correct ? 100 + Math.round(Math.max(0, Math.min(QUIZ_SECONDS, secondsLeft)) * 4) : 0;
}

export const QUIZ_MAX = QUIZ_COUNT * (100 + QUIZ_SECONDS * 4);

export function chartShown(chart: DuelChart): Candle[] {
  return chart.candles.slice(0, chart.candles.length - CHART_AHEAD);
}

export function chartActual(chart: DuelChart): number {
  return chart.candles[chart.candles.length - 1][3];
}

/** 100 for a perfect guess, falling to 0 three average candle ranges away. */
export function chartPoints(chart: DuelChart, guess: number): number {
  const unit = atr(chartShown(chart));
  const err = Math.abs(guess - chartActual(chart));
  return Math.round(100 * Math.max(0, 1 - err / (3 * unit)));
}

// ---------- the trade round ----------

export type TradePosition = { side: 1 | -1; entry: number; stop: number };
export type TradeState = { cash: number; pos: TradePosition | null; trades: number; shown: number; stops: number };

/** The last visible candle is `shown`; it starts at the end of the context. */
export function tradeStart(): TradeState {
  return { cash: TRADE_BALANCE, pos: null, trades: 0, shown: TRADE_HISTORY - 1, stops: 0 };
}

const NOTIONAL = TRADE_BALANCE * TRADE_LEVERAGE;

export function positionPnl(pos: TradePosition, price: number): number {
  return (NOTIONAL * (price - pos.entry) * pos.side) / pos.entry;
}

export function tradePrice(trade: DuelChart, s: TradeState): number {
  return trade.candles[s.shown][3];
}

export function tradeFinished(trade: DuelChart, s: TradeState): boolean {
  return s.shown >= trade.candles.length - 1;
}

export function tradeOpen(trade: DuelChart, s: TradeState, side: 1 | -1): TradeState {
  if (s.pos || tradeFinished(trade, s)) return s;
  const entry = tradePrice(trade, s);
  const unit = atr(trade.candles.slice(0, s.shown + 1));
  return { ...s, pos: { side, entry, stop: roundTo(entry - side * STOP_ATR * unit, trade.decimals + 2) }, trades: s.trades + 1 };
}

export function tradeClose(trade: DuelChart, s: TradeState, price = tradePrice(trade, s)): TradeState {
  if (!s.pos) return s;
  return { ...s, cash: s.cash + positionPnl(s.pos, price), pos: null };
}

/** Reveals the next candle; a stop inside it closes the trade at the stop. */
export function tradeStep(trade: DuelChart, s: TradeState): TradeState {
  if (tradeFinished(trade, s)) return s;
  const next = { ...s, shown: s.shown + 1 };
  if (!next.pos) return next;
  const [, high, low] = trade.candles[next.shown];
  const hit = next.pos.side === 1 ? low <= next.pos.stop : high >= next.pos.stop;
  return hit ? { ...tradeClose(trade, next, next.pos.stop), stops: next.stops + 1 } : next;
}

export function tradeEquity(trade: DuelChart, s: TradeState): number {
  return s.cash + (s.pos ? positionPnl(s.pos, tradePrice(trade, s)) : 0);
}

/** Closes what's open at the last price and gives the round's result. */
export function tradeResult(trade: DuelChart, s: TradeState): DuelResult['trade'] {
  const end = tradeClose(trade, s);
  return { pnl: Math.round((end.cash - TRADE_BALANCE) * 100) / 100, trades: s.trades };
}

// ---------- Shamak, the bot ----------

export type BotLevel = 'easy' | 'normal' | 'hard';

export const BOT_LEVELS: { level: BotLevel; label: string; hint: string }[] = [
  { level: 'easy', label: 'آسون', hint: 'شمعک تازه‌کاره' },
  { level: 'normal', label: 'معمولی', hint: 'یه حریف جدی' },
  { level: 'hard', label: 'سخت', hint: 'شمعک حرفه‌ای' },
];

const BOT_ACCURACY: Record<BotLevel, number> = { easy: 0.5, normal: 0.72, hard: 0.88 };
/** How far off (in average candle ranges) the bot's chart guess usually is. */
const BOT_SPREAD: Record<BotLevel, number> = { easy: 2.4, normal: 1.5, hard: 0.8 };

function gaussian(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const sma = (candles: Candle[], end: number, n: number) => {
  let sum = 0;
  for (let i = end - n + 1; i <= end; i++) sum += candles[i][3];
  return sum / n;
};

/**
 * The bot's trade round: it follows a fast/slow moving-average crossover with the same
 * stops as the player (the easy bot trades at random, the normal one stops after two trades).
 */
export function botTrade(trade: DuelChart, level: BotLevel, rng: () => number): DuelResult['trade'] {
  let s = tradeStart();
  const c = trade.candles;
  while (!tradeFinished(trade, s)) {
    if (level === 'easy') {
      if (!s.pos && rng() < 0.12) s = tradeOpen(trade, s, rng() < 0.5 ? 1 : -1);
      else if (s.pos && rng() < 0.1) s = tradeClose(trade, s);
    } else if (s.shown >= 13 && (level === 'hard' || s.trades < 2)) {
      const fast = sma(c, s.shown, 5) - sma(c, s.shown, 13);
      const before = sma(c, s.shown - 1, 5) - sma(c, s.shown - 1, 13);
      const cross = fast > 0 && before <= 0 ? 1 : fast < 0 && before >= 0 ? -1 : 0;
      if (cross && s.pos?.side !== cross) {
        s = tradeOpen(trade, tradeClose(trade, s), cross as 1 | -1);
      }
    }
    s = tradeStep(trade, s);
  }
  return tradeResult(trade, s);
}

export function botResult(rounds: DuelRounds, level: BotLevel): DuelResult {
  const rng = createRng(hashString(`duel-bot:${rounds.seed}:${level}`));
  let correct = 0;
  let points = 0;
  for (let i = 0; i < rounds.quiz.length; i++) {
    const ok = rng() < BOT_ACCURACY[level];
    const used = 2 + rng() * 10;
    if (ok) correct += 1;
    points += quizPoints(ok, QUIZ_SECONDS - used);
  }
  const unit = atr(chartShown(rounds.chart));
  const guess = roundTo(chartActual(rounds.chart) + gaussian(rng) * BOT_SPREAD[level] * unit, rounds.chart.decimals);
  return {
    quiz: { correct, points },
    chart: { guess, points: chartPoints(rounds.chart, guess) },
    trade: botTrade(rounds.trade, level, rng),
  };
}

// ---------- comparing ----------

export function roundScore(r: DuelResult, key: RoundKey): number {
  return key === 'quiz' ? r.quiz.points : key === 'chart' ? r.chart.points : r.trade.pnl;
}

export type DuelOutcome = 'win' | 'loss' | 'tie';

/** Who won each round and the duel; level rounds go to the trade round, then the quiz. */
export function compareDuel(me: DuelResult, them: DuelResult): { rounds: Record<RoundKey, DuelOutcome>; mine: number; theirs: number; outcome: DuelOutcome } {
  const rounds = {} as Record<RoundKey, DuelOutcome>;
  let mine = 0;
  let theirs = 0;
  for (const { key } of ROUNDS) {
    const a = roundScore(me, key);
    const b = roundScore(them, key);
    rounds[key] = a > b ? 'win' : a < b ? 'loss' : 'tie';
    if (a > b) mine += 1;
    else if (a < b) theirs += 1;
  }
  let outcome: DuelOutcome = mine > theirs ? 'win' : mine < theirs ? 'loss' : 'tie';
  if (outcome === 'tie') {
    const tiebreak = Math.sign(me.trade.pnl - them.trade.pnl) || Math.sign(me.quiz.points - them.quiz.points);
    outcome = tiebreak > 0 ? 'win' : tiebreak < 0 ? 'loss' : 'tie';
  }
  return { rounds, mine, theirs, outcome };
}

// ---------- checking data from the server ----------

const num = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export function parseResult(raw: unknown): DuelResult | null {
  const r = raw as DuelResult | null;
  if (!r || typeof r !== 'object') return null;
  if (!num(r.quiz?.correct, 0, QUIZ_COUNT) || !num(r.quiz?.points, 0, QUIZ_MAX)) return null;
  if (!num(r.chart?.points, 0, 100) || !num(r.chart?.guess, -1e12, 1e12)) return null;
  if (!num(r.trade?.pnl, -1e6, 1e6) || !num(r.trade?.trades, 0, TRADE_REPLAY)) return null;
  return { quiz: { correct: r.quiz.correct, points: r.quiz.points }, chart: { guess: r.chart.guess, points: r.chart.points }, trade: { pnl: r.trade.pnl, trades: r.trade.trades } };
}

const isCandle = (c: unknown) => Array.isArray(c) && c.length === 4 && c.every((v) => typeof v === 'number' && Number.isFinite(v));

function parseChart(raw: unknown, count: number): DuelChart | null {
  const c = raw as DuelChart | null;
  if (!c || typeof c.symbol !== 'string' || typeof c.label !== 'string' || !num(c.decimals, 0, 8)) return null;
  if (!Array.isArray(c.candles) || c.candles.length !== count || !c.candles.every(isCandle)) return null;
  return { symbol: c.symbol, label: c.label, decimals: c.decimals, candles: c.candles };
}

export function parseRounds(raw: unknown): DuelRounds | null {
  const r = raw as DuelRounds | null;
  if (!r || typeof r !== 'object' || r.v !== DUEL_VERSION || !num(r.seed, 0, 2 ** 32)) return null;
  const chart = parseChart(r.chart, CHART_SHOWN + CHART_AHEAD);
  const trade = parseChart(r.trade, TRADE_HISTORY + TRADE_REPLAY);
  if (!chart || !trade || !Array.isArray(r.quiz) || r.quiz.length === 0 || r.quiz.length > QUIZ_COUNT) return null;
  const quiz = r.quiz.filter(
    (q) =>
      q &&
      typeof q.prompt === 'string' &&
      ((q.kind === 'truefalse' && typeof q.answer === 'boolean') ||
        (q.kind === 'choice' && Array.isArray(q.options) && q.options.every((o) => typeof o === 'string') && num(q.answer, 0, q.options.length - 1))),
  );
  if (quiz.length !== r.quiz.length) return null;
  return { v: r.v, seed: r.seed, quiz, chart, trade, real: !!r.real };
}
