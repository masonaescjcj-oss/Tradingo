/**
 * The journal coach: reads the simulator's closed trades and points out the habits that cost
 * money (no stop-loss, oversized risk, revenge trades, cutting winners early…) and the ones
 * worth keeping, each with the unit that teaches the fix. Pure: history in, advice out.
 */
import { t } from '@/i18n';
import { fa, usd } from '@/utils/format';

import { findSymbol } from './simulator';
import { equityCurve, maxDrawdown, tradeRisk } from './stats';
import type { ClosedTrade } from './trading';

export type CoachTone = 'warn' | 'tip' | 'good';

export type CoachInsight = {
  id: string;
  tone: CoachTone;
  title: string;
  body: string;
  /** The unit whose guide explains the fix. */
  unitId?: string;
  /** Higher comes first within a tone. */
  weight: number;
};

/** Below this many trades the numbers are noise, so only the clear-cut mistakes are named. */
export const COACH_MIN_TRADES = 5;
/** A trade opened this soon after a loss counts as a revenge trade. */
export const REVENGE_MS = 2 * 60_000;
/** Share of the balance above which a single trade's risk is too big. */
export const MAX_RISK_SHARE = 0.03;

const pct = (x: number) => t('{n}٪', { n: fa(Math.round(x * 100)) });
/** Dollars kept left-to-right inside the sentences. */
const money = (x: number, signed = false) => `\u2066${usd(x, signed)}\u2069`;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** "45 seconds", "3 minutes", "2 hours" or "1 day", in the app's language. */
export function faSpan(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  const vars = (n: number) => ({ n: fa(n), count: n });
  if (s < 60) return t('{n} ثانیه', vars(s));
  if (s < 3600) return t('{n} دقیقه', vars(Math.round(s / 60)));
  if (s < 86_400) return t('{n} ساعت', vars(Math.round(s / 3600)));
  return t('{n} روز', vars(Math.round(s / 86_400)));
}

/** Most trades opened within any `windowMs` stretch. */
function busiestWindow(opens: number[], windowMs: number): number {
  const t = opens.slice().sort((a, b) => a - b);
  let best = 0;
  for (let i = 0, j = 0; i < t.length; i++) {
    while (t[i] - t[j] > windowMs) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
}

export function coachInsights(historyNewestFirst: ClosedTrade[], endBalance: number): { insights: CoachInsight[]; needMore: number } {
  const count = historyNewestFirst.length;
  const out: CoachInsight[] = [];
  if (!count) return { insights: [], needMore: COACH_MIN_TRADES };
  const chrono = historyNewestFirst.slice().reverse();
  const curve = equityCurve(historyNewestFirst, endBalance);
  const enough = count >= COACH_MIN_TRADES;
  const wins = chrono.filter((t) => t.pnl > 0);
  const losses = chrono.filter((t) => t.pnl < 0);

  // Liquidations: the costliest mistake, named from the first one.
  const liquidated = chrono.filter((t) => t.reason === 'liquidation').length;
  if (liquidated) {
    out.push({
      id: 'liquidation',
      tone: 'warn',
      weight: 100,
      title: t('لیکوئید شدی'),
      body: t('{n} معامله‌ت با لیکوئید بسته شد و کل وجه تضمینش از دست رفت. اهرم رو پایین بیار و حد ضرری بذار که قبل از قیمت لیکوئید فعال بشه.', {
        n: fa(liquidated),
        count: liquidated,
      }),
      unitId: 'leverage-u2',
    });
  }

  // Stop-losses.
  const noStop = chrono.filter((t) => t.sl == null).length;
  if (count >= 3 && noStop / count >= 0.3) {
    out.push({
      id: 'no-stops',
      tone: 'warn',
      weight: 90,
      title: t('معامله بدون حد ضرر'),
      body: t('{pct} معامله‌هات ({n} از {total}) حد ضرر نداشتن. بدون حد ضرر، یه حرکت بد می‌تونه سود چند معامله‌ی خوب رو پاک کنه. قبل از ورود، جای خروجت رو مشخص کن.', {
        pct: pct(noStop / count),
        n: fa(noStop),
        total: fa(count),
      }),
      unitId: 'orders-u1',
    });
  } else if (enough && noStop === 0) {
    out.push({ id: 'all-stops', tone: 'good', weight: 20, title: t('همیشه حد ضرر داری'), body: t('همه‌ی معامله‌هات حد ضرر داشتن. این مهم‌ترین عادت یه تریدره؛ نگهش دار.') });
  }

  // Risk per trade, against the balance before each trade.
  const risks = chrono.flatMap((t, i) => {
    const r = tradeRisk(t);
    return r != null && curve[i] > 0 ? [r / curve[i]] : [];
  });
  const oversized = risks.filter((r) => r > MAX_RISK_SHARE);
  if (risks.length >= 3 && oversized.length / risks.length >= 0.3) {
    out.push({
      id: 'big-risk',
      tone: 'warn',
      weight: 85,
      title: t('ریسک هر معامله زیاده'),
      body: t('توی {n} معامله بیشتر از {limit} حسابت رو ریسک کردی (بیشترینش {max}). حرفه‌ای‌ها معمولاً ۱ تا ۲ درصد ریسک می‌کنن تا چند ضرر پشت سر هم حساب رو از پا درنیاره.', {
        n: fa(oversized.length),
        count: oversized.length,
        limit: pct(MAX_RISK_SHARE),
        max: pct(Math.max(...oversized)),
      }),
      unitId: 'risk',
    });
  }

  // Leverage (trades from before leverage existed don't say, so they're left out).
  const levs = chrono.flatMap((t) => (t.leverage != null ? [t.leverage] : []));
  if (levs.length) {
    const top = Math.max(...levs);
    const mean = avg(levs);
    if (top >= 50 || (levs.length >= 3 && mean >= 20)) {
      out.push({
        id: 'leverage',
        tone: 'warn',
        weight: 80,
        title: t('اهرم خیلی بالا'),
        body:
          top >= 50
            ? t('میانگین اهرمت {mean}x بوده و تا {top}x هم رفتی. با اهرم بالا، یه حرکت کوچیک خلاف جهت کافیه تا بخش بزرگی از حساب بره یا لیکوئید بشی.', {
                mean: fa(Math.round(mean)),
                top: fa(top),
              })
            : t('میانگین اهرمت {mean}x بوده. با اهرم بالا، یه حرکت کوچیک خلاف جهت کافیه تا بخش بزرگی از حساب بره یا لیکوئید بشی.', { mean: fa(Math.round(mean)) }),
        unitId: 'leverage-u3',
      });
    }
  }

  // Drawdown.
  const dd = maxDrawdown(curve).pct;
  if (dd > 0.15) {
    out.push({
      id: 'drawdown',
      tone: 'warn',
      weight: 65,
      title: t('افت سرمایه‌ی سنگین'),
      body: t('حسابت از سقفش {dd} افت کرده. برای برگشتن به سقف حالا {need} سود لازمه؛ ضرر رو باید کوچیک نگه داشت.', { dd: pct(dd), need: pct(dd / (1 - dd)) }),
      unitId: 'risk-u2',
    });
  }

  if (enough && wins.length >= 2 && losses.length >= 2) {
    const avgWin = avg(wins.map((t) => t.pnl));
    const avgLoss = -avg(losses.map((t) => t.pnl));
    const winRate = wins.length / count;
    // Win rate needed to break even with this payoff.
    const breakEven = avgLoss / (avgWin + avgLoss);
    if (avgLoss > avgWin * 1.2 && winRate < breakEven + 0.05) {
      out.push({
        id: 'payoff',
        tone: 'warn',
        weight: 75,
        title: t('ضررهات از سودهات بزرگ‌ترن'),
        body: t('میانگین ضررت {loss} و میانگین سودت {win}ه. با این نسبت باید دست‌کم {breakEven} معامله‌هات سودده باشن تا سر به سر بشی؛ الان {winRate}ه. حد سود رو حداقل دو برابر فاصله‌ی حد ضرر بذار.', {
          loss: money(avgLoss),
          win: money(avgWin),
          breakEven: pct(breakEven),
          winRate: pct(winRate),
        }),
        unitId: 'risk-u2',
      });
    } else if (avgWin >= avgLoss * 1.5) {
      out.push({
        id: 'good-payoff',
        tone: 'good',
        weight: 15,
        title: t('سودهات بزرگ‌تر از ضررهاتن'),
        body: t('میانگین سودت {win} و میانگین ضررت {loss}ه. با این نسبت، حتی با درصد برد متوسط هم سودده می‌مونی.', { win: money(avgWin), loss: money(avgLoss) }),
      });
    }
  }

  // Revenge trades: a new trade right after a losing one closed.
  const opens = chrono.map((t) => t.openedAt);
  const revenge = losses.filter((l) => opens.some((o) => o > l.closedAt && o - l.closedAt <= REVENGE_MS)).length;
  if (revenge >= 2 && revenge / losses.length >= 0.3) {
    out.push({
      id: 'revenge',
      tone: 'warn',
      weight: 70,
      title: t('معامله‌ی انتقامی'),
      body: t('{n} بار کمتر از دو دقیقه بعد از یه ضرر، دوباره وارد معامله شدی. ورود سریع بعد از ضرر معمولاً از روی عصبانیته، نه تحلیل. بعد از هر ضرر یه مکث کوتاه بکن و دوباره ستاپ رو چک کن.', {
        n: fa(revenge),
        count: revenge,
      }),
      unitId: 'psychology',
    });
  }

  // Holding losers, cutting winners.
  if (wins.length >= 3 && losses.length >= 3) {
    const winSpan = avg(wins.map((t) => t.closedAt - t.openedAt));
    const lossSpan = avg(losses.map((t) => t.closedAt - t.openedAt));
    if (lossSpan > winSpan * 1.5 && lossSpan >= 60_000) {
      out.push({
        id: 'hold-losers',
        tone: 'tip',
        weight: 60,
        title: t('ضرر رو نگه می‌داری، سود رو زود می‌بندی'),
        body: t('معامله‌های ضررده‌ت به‌طور متوسط {loss} باز موندن ولی سودده‌ها فقط {win}. این همون سوگیری معروفه: امید به برگشت ضرر و ترس از پس دادن سود. بذار حد ضرر و حد سود تصمیم بگیرن.', {
          loss: faSpan(lossSpan),
          win: faSpan(winSpan),
        }),
        unitId: 'psychology-u2',
      });
    }
  }

  // Overtrading.
  const busiest = busiestWindow(opens, 60 * 60_000);
  if (busiest >= 10) {
    out.push({
      id: 'overtrading',
      tone: 'tip',
      weight: 55,
      title: t('پرمعاملگی'),
      body: t('یه بار توی یک ساعت {n} معامله باز کردی. تعداد زیاد معامله معمولاً یعنی ورود بدون ستاپ مشخص و هزینه‌ی کارمزد بیشتر. برای خودت سقف معامله‌ی روزانه بذار.', { n: fa(busiest) }),
      unitId: 'psychology-u3',
    });
  }

  // Buys against sells.
  const longs = chrono.filter((t) => t.side === 'buy');
  const shorts = chrono.filter((t) => t.side === 'sell');
  if (longs.length >= 4 && shorts.length >= 4) {
    const netLong = longs.reduce((s, t) => s + t.pnl, 0);
    const netShort = shorts.reduce((s, t) => s + t.pnl, 0);
    if (netLong * netShort < 0) {
      const buysWin = netLong > 0;
      const nets = { good: money(buysWin ? netLong : netShort, true), bad: money(buysWin ? netShort : netLong, true) };
      out.push({
        id: 'side',
        tone: 'tip',
        weight: 45,
        title: buysWin ? t('معامله‌های فروشت ضررده‌ان') : t('معامله‌های خریدت ضررده‌ان'),
        body: buysWin
          ? t('معامله‌های خریدت {good} سود دادن ولی فروشها {bad}. شاید خلاف روند وارد می‌شی؛ قبل از فروش روند تایم‌فریم بالاتر رو چک کن.', nets)
          : t('معامله‌های فروشت {good} سود دادن ولی خریدها {bad}. شاید خلاف روند وارد می‌شی؛ قبل از خرید روند تایم‌فریم بالاتر رو چک کن.', nets),
        unitId: 'trend',
      });
    }
  }

  // Best and worst symbol.
  const bySymbol = new Map<string, { n: number; net: number }>();
  for (const t of chrono) {
    const s = bySymbol.get(t.symbol) ?? { n: 0, net: 0 };
    bySymbol.set(t.symbol, { n: s.n + 1, net: s.net + t.pnl });
  }
  const ranked = [...bySymbol.entries()].filter(([, s]) => s.n >= 3).sort((a, b) => b[1].net - a[1].net);
  if (ranked.length >= 2 && ranked[0][1].net > 0 && ranked[ranked.length - 1][1].net < 0) {
    const label = (id: string) => findSymbol(id)?.label ?? id;
    const [best, worst] = [ranked[0], ranked[ranked.length - 1]];
    out.push({
      id: 'symbols',
      tone: 'tip',
      weight: 40,
      title: t('روی نماد بهترت تمرکز کن'),
      body: t('بیشترین سودت از {best} بوده ({bestNet}) و بیشترین ضررت از {worst} ({worstNet}). بازاری که بهتر می‌شناسی‌ش رو جدی‌تر بگیر.', {
        best: label(best[0]),
        bestNet: money(best[1].net, true),
        worst: label(worst[0]),
        worstNet: money(worst[1].net, true),
      }),
      unitId: 'trading-system-u2',
    });
  }

  // Notes.
  const noted = chrono.filter((t) => t.note?.trim()).length;
  if (enough && noted / count < 0.2) {
    out.push({
      id: 'notes',
      tone: 'tip',
      weight: 30,
      title: t('برای معامله‌هات یادداشت بنویس'),
      body: t('فقط {n} معامله از {total} یادداشت داره. نوشتن دلیل ورود و حس‌وحالت، بهترین راه پیدا کردن اشتباه‌های تکراریه.', { n: fa(noted), total: fa(count), count: noted }),
      unitId: 'trading-system-u2',
    });
  }

  // Overall form.
  if (count >= 10) {
    const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = -losses.reduce((s, t) => s + t.pnl, 0);
    const pf = grossLoss > 0 ? grossWin / grossLoss : Infinity;
    if (pf >= 1.5 && wins.length / count >= 0.5) {
      out.push({
        id: 'strong',
        tone: 'good',
        weight: 25,
        title: t('عملکردت خوبه'),
        body: t('درصد بردت {winRate}ه و سودهات بیشتر از ضررهاتن. حالا همین قانون‌ها رو توی بازپخش بازار و چالش‌ها محک بزن.', { winRate: pct(wins.length / count) }),
      });
    }
  }

  const rank = { warn: 0, tip: 1, good: 2 } as const;
  out.sort((a, b) => rank[a.tone] - rank[b.tone] || b.weight - a.weight);
  return { insights: out, needMore: Math.max(0, COACH_MIN_TRADES - count) };
}
