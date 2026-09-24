/**
 * The AI coach: what it knows about the learner (sent with each question) and the
 * conversation helpers. Pure, so it can be tested.
 */
import { courseLessonIds, findCourse, findLesson } from '@/content';
import type { GameData } from '@/store/game';

import { LEAGUES } from './league';
import { currentStreak, heartsNow, todaysXp } from './progress';
import { findSymbol, formatPrice } from './simulator';
import { tradeR, tradeStats } from './stats';
import { liquidationPrice, openPnl, summarize } from './trading';

export type CoachTurn = { id: string; role: 'user' | 'assistant'; text: string; at: number };

/** Longest context the coach accepts; the newest trades are kept when it's long. */
export const MAX_CONTEXT = 14000;
/** Earlier turns sent with each question. */
export const HISTORY_TURNS = 12;

const money = (v: number) => Math.round(v * 100) / 100;
const pct = (v: number | null) => (v == null ? null : Math.round(v * 1000) / 10);

function price(symbol: string, p: number | undefined): string | undefined {
  if (p == null) return undefined;
  const spec = findSymbol(symbol);
  return spec ? formatPrice(spec, p) : String(p);
}

function label(symbol: string): string {
  return findSymbol(symbol)?.label ?? symbol;
}

/** Where the learner is in a course: done/total and the next lesson with its unit. */
function courseState(courseId: string, completed: GameData['completed']) {
  const course = findCourse(courseId);
  if (!course) return null;
  const ids = courseLessonIds(course);
  const next = ids.find((id) => !completed[id]);
  const hit = next ? findLesson(next) : undefined;
  return {
    title: course.title,
    lessonsDone: ids.filter((id) => completed[id]).length,
    lessonsTotal: ids.length,
    units: course.units.length,
    nextLesson: hit ? { unit: hit.unit.title, unitNumber: course.units.indexOf(hit.unit) + 1, lesson: hit.lesson.title } : 'course finished',
  };
}

/**
 * Everything the coach may use, as compact JSON: profile, course progress, recent
 * mistakes, and the simulator account with positions, orders, trades and stats.
 */
export function coachContext(g: GameData, mids: Record<string, number> | null, now = Date.now()): string {
  const account = { balance: g.sim.balance, positions: g.sim.positions };
  const summary = mids ? summarize(account, mids) : null;
  const stats = tradeStats(g.sim.history, g.sim.balance);
  const mistakeLessons = [...new Set(g.mistakes.map((k) => k.split(':')[0]))]
    .map((id) => findLesson(id))
    .filter((h) => h != null)
    .slice(0, 6)
    .map((h) => `${h.course.title} › ${h.unit.title} › ${h.lesson.title}`);

  const data = {
    today: new Date(now).toISOString().slice(0, 10),
    learner: {
      name: g.name,
      level: g.level,
      market: g.market,
      streakDays: currentStreak(g),
      totalXp: g.xp,
      todayXp: todaysXp(g),
      dailyGoalXp: g.dailyGoal,
      weeklyXp: g.weeklyXp,
      league: LEAGUES[g.league]?.name,
      hearts: heartsNow(g, now).hearts,
      coins: g.coins,
    },
    learning: {
      activeCourse: g.activeCourse ? courseState(g.activeCourse, g.completed) : null,
      myCourses: g.enrolled.map((id) => courseState(id, g.completed)).filter((c) => c != null),
      lessonsCompleted: Object.keys(g.completed).length,
      unitsMastered: g.mastered.length,
      lessonsWithRecentMistakes: mistakeLessons,
    },
    simulator: {
      note: 'virtual money practice account',
      balance: money(g.sim.balance),
      equity: summary ? money(summary.equity) : undefined,
      freeMargin: summary ? money(summary.freeMargin) : undefined,
      marginLevelPercent: summary?.marginLevel != null ? Math.round(summary.marginLevel) : undefined,
      currentPrices: mids ? Object.fromEntries(Object.entries(mids).map(([s, p]) => [label(s), price(s, p)])) : undefined,
      openPositions: g.sim.positions.map((p) => {
        const spec = findSymbol(p.symbol);
        return {
          symbol: label(p.symbol),
          side: p.side,
          size: p.size,
          leverage: p.leverage,
          entry: price(p.symbol, p.entry),
          stopLoss: price(p.symbol, p.sl) ?? 'none',
          takeProfit: price(p.symbol, p.tp) ?? 'none',
          liquidation: spec ? price(p.symbol, liquidationPrice(spec, p)) : undefined,
          openPnl: spec && mids?.[p.symbol] != null ? money(openPnl(spec, p, mids[p.symbol])) : undefined,
          openedMinutesAgo: Math.round((now - p.openedAt) / 60000),
        };
      }),
      pendingOrders: (g.simOrders ?? []).map((o) => ({
        symbol: label(o.symbol),
        side: o.side,
        type: o.type,
        price: price(o.symbol, o.price),
        size: o.size,
        stopLoss: price(o.symbol, o.sl) ?? 'none',
        takeProfit: price(o.symbol, o.tp) ?? 'none',
        leverage: o.leverage,
      })),
      stats: {
        closedTrades: stats.count,
        winRatePercent: pct(stats.winRate),
        averageR: stats.avgR == null ? null : Math.round(stats.avgR * 100) / 100,
        profitFactor: stats.profitFactor == null ? null : Number.isFinite(stats.profitFactor) ? Math.round(stats.profitFactor * 100) / 100 : 'no losses yet',
        maxDrawdownPercent: pct(stats.maxDrawdown),
        netPnl: money(stats.net),
        tradesWithoutStop: stats.count - stats.withStops,
        liquidations: stats.liquidations,
      },
      recentClosedTrades: g.sim.history.slice(0, 15).map((t) => {
        const r = tradeR(t);
        return {
          symbol: label(t.symbol),
          side: t.side,
          size: t.size,
          leverage: t.leverage,
          entry: price(t.symbol, t.entry),
          exit: price(t.symbol, t.exit),
          stopLoss: price(t.symbol, t.sl) ?? 'none',
          takeProfit: price(t.symbol, t.tp) ?? 'none',
          pnl: money(t.pnl),
          r: r == null ? null : Math.round(r * 100) / 100,
          closedBy: t.reason,
          journalNote: t.note,
          heldMinutes: Math.round((t.closedAt - t.openedAt) / 60000),
        };
      }),
    },
    marketReplay: g.simReplay?.session
      ? { symbol: label(g.simReplay.session.symbol), balance: money(g.simReplay.account.balance), openPositions: g.simReplay.account.positions.length }
      : undefined,
  };

  let text = JSON.stringify(data);
  // Very long journals: drop the oldest trades until it fits.
  while (text.length > MAX_CONTEXT && data.simulator.recentClosedTrades.length > 0) {
    data.simulator.recentClosedTrades.pop();
    text = JSON.stringify(data);
  }
  return text.slice(0, MAX_CONTEXT);
}

/** The turns sent with a new question: the latest earlier ones, oldest first. */
export function historyFor(turns: CoachTurn[], question: string): { role: 'user' | 'assistant'; content: string }[] {
  return [...turns.slice(-HISTORY_TURNS).map((t) => ({ role: t.role, content: t.text })), { role: 'user' as const, content: question }];
}

/** Coach replies are plain text; stray markdown emphasis is removed. */
export function cleanReply(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();
}

export const COACH_SUGGESTIONS = [
  'معامله‌هام رو بررسی کن؛ کجا اشتباه می‌کنم؟',
  'الان کجای دوره‌ام و قدم بعدی چیه؟',
  'ریسک پوزیشن‌های بازم چقدره؟',
  'از اشتباه‌های اخیرم تو درس‌ها چی بفهمم؟',
];

const ERRORS: Record<string, string> = {
  limit: 'امروز سهم پیام‌هات با دستیار تموم شد؛ فردا دوباره بپرس.',
  session: 'نشستت روی سرور تموم شده؛ دوباره وارد حسابت شو.',
  not_configured: 'دستیار هوش مصنوعی هنوز روی سرور راه‌اندازی نشده؛ به‌زودی فعال می‌شه.',
  network: 'به سرور وصل نشد؛ اینترنتت رو چک کن و دوباره بپرس.',
  ai: 'دستیار الان جواب نداد؛ چند لحظه‌ی دیگه دوباره بپرس.',
};

export function coachErrorText(kind: string): string {
  return ERRORS[kind] ?? 'یه مشکلی پیش اومد؛ دوباره امتحان کن.';
}
