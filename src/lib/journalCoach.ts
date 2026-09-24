/**
 * The journal coach: reads the simulator's closed trades and points out the habits that cost
 * money (no stop-loss, oversized risk, revenge trades, cutting winners early…) and the ones
 * worth keeping, each with the unit that teaches the fix. Pure: history in, advice out.
 */
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

const pct = (x: number) => `${fa(Math.round(x * 100))}٪`;
/** Dollars kept left-to-right inside Persian sentences. */
const money = (x: number, signed = false) => `\u2066${usd(x, signed)}\u2069`;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** «۴۵ ثانیه»، «۳ دقیقه»، «۲ ساعت» or «۱ روز». */
export function faSpan(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${fa(s)} ثانیه`;
  if (s < 3600) return `${fa(Math.round(s / 60))} دقیقه`;
  if (s < 86_400) return `${fa(Math.round(s / 3600))} ساعت`;
  return `${fa(Math.round(s / 86_400))} روز`;
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
      title: 'لیکوئید شدی',
      body: `${fa(liquidated)} معامله‌ت با لیکوئید بسته شد و کل وجه تضمینش از دست رفت. اهرم رو پایین بیار و حد ضرری بذار که قبل از قیمت لیکوئید فعال بشه.`,
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
      title: 'معامله بدون حد ضرر',
      body: `${pct(noStop / count)} معامله‌هات (${fa(noStop)} از ${fa(count)}) حد ضرر نداشتن. بدون حد ضرر، یه حرکت بد می‌تونه سود چند معامله‌ی خوب رو پاک کنه. قبل از ورود، جای خروجت رو مشخص کن.`,
      unitId: 'orders-u1',
    });
  } else if (enough && noStop === 0) {
    out.push({ id: 'all-stops', tone: 'good', weight: 20, title: 'همیشه حد ضرر داری', body: 'همه‌ی معامله‌هات حد ضرر داشتن. این مهم‌ترین عادت یه تریدره؛ نگهش دار.' });
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
      title: 'ریسک هر معامله زیاده',
      body: `توی ${fa(oversized.length)} معامله بیشتر از ${pct(MAX_RISK_SHARE)} حسابت رو ریسک کردی (بیشترینش ${pct(Math.max(...oversized))}). حرفه‌ای‌ها معمولاً ۱ تا ۲ درصد ریسک می‌کنن تا چند ضرر پشت سر هم حساب رو از پا درنیاره.`,
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
        title: 'اهرم خیلی بالا',
        body: `میانگین اهرمت ${fa(Math.round(mean))}x بوده${top >= 50 ? ` و تا ${fa(top)}x هم رفتی` : ''}. با اهرم بالا، یه حرکت کوچیک خلاف جهت کافیه تا بخش بزرگی از حساب بره یا لیکوئید بشی.`,
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
      title: 'افت سرمایه‌ی سنگین',
      body: `حسابت از سقفش ${pct(dd)} افت کرده. برای برگشتن به سقف حالا ${pct(dd / (1 - dd))} سود لازمه؛ ضرر رو باید کوچیک نگه داشت.`,
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
        title: 'ضررهات از سودهات بزرگ‌ترن',
        body: `میانگین ضررت ${money(avgLoss)} و میانگین سودت ${money(avgWin)}ه. با این نسبت باید دست‌کم ${pct(breakEven)} معامله‌هات سودده باشن تا سر به سر بشی؛ الان ${pct(winRate)}ه. حد سود رو حداقل دو برابر فاصله‌ی حد ضرر بذار.`,
        unitId: 'risk-u2',
      });
    } else if (avgWin >= avgLoss * 1.5) {
      out.push({ id: 'good-payoff', tone: 'good', weight: 15, title: 'سودهات بزرگ‌تر از ضررهاتن', body: `میانگین سودت ${money(avgWin)} و میانگین ضررت ${money(avgLoss)}ه. با این نسبت، حتی با درصد برد متوسط هم سودده می‌مونی.` });
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
      title: 'معامله‌ی انتقامی',
      body: `${fa(revenge)} بار کمتر از دو دقیقه بعد از یه ضرر، دوباره وارد معامله شدی. ورود سریع بعد از ضرر معمولاً از روی عصبانیته، نه تحلیل. بعد از هر ضرر یه مکث کوتاه بکن و دوباره ستاپ رو چک کن.`,
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
        title: 'ضرر رو نگه می‌داری، سود رو زود می‌بندی',
        body: `معامله‌های ضررده‌ت به‌طور متوسط ${faSpan(lossSpan)} باز موندن ولی سودده‌ها فقط ${faSpan(winSpan)}. این همون سوگیری معروفه: امید به برگشت ضرر و ترس از پس دادن سود. بذار حد ضرر و حد سود تصمیم بگیرن.`,
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
      title: 'پرمعاملگی',
      body: `یه بار توی یک ساعت ${fa(busiest)} معامله باز کردی. تعداد زیاد معامله معمولاً یعنی ورود بدون ستاپ مشخص و هزینه‌ی کارمزد بیشتر. برای خودت سقف معامله‌ی روزانه بذار.`,
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
      const [good, bad, goodNet, badNet] = netLong > 0 ? ['خرید', 'فروش', netLong, netShort] : ['فروش', 'خرید', netShort, netLong];
      out.push({
        id: 'side',
        tone: 'tip',
        weight: 45,
        title: `معامله‌های ${bad}ت ضررده‌ان`,
        body: `معامله‌های ${good}ت ${money(goodNet, true)} سود دادن ولی ${bad}ها ${money(badNet, true)}. شاید خلاف روند وارد می‌شی؛ قبل از ${bad} روند تایم‌فریم بالاتر رو چک کن.`,
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
      title: 'روی نماد بهترت تمرکز کن',
      body: `بیشترین سودت از ${label(best[0])} بوده (${money(best[1].net, true)}) و بیشترین ضررت از ${label(worst[0])} (${money(worst[1].net, true)}). بازاری که بهتر می‌شناسی‌ش رو جدی‌تر بگیر.`,
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
      title: 'برای معامله‌هات یادداشت بنویس',
      body: `فقط ${fa(noted)} معامله از ${fa(count)} یادداشت داره. نوشتن دلیل ورود و حس‌وحالت، بهترین راه پیدا کردن اشتباه‌های تکراریه.`,
      unitId: 'trading-system-u2',
    });
  }

  // Overall form.
  if (count >= 10) {
    const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = -losses.reduce((s, t) => s + t.pnl, 0);
    const pf = grossLoss > 0 ? grossWin / grossLoss : Infinity;
    if (pf >= 1.5 && wins.length / count >= 0.5) {
      out.push({ id: 'strong', tone: 'good', weight: 25, title: 'عملکردت خوبه', body: `درصد بردت ${pct(wins.length / count)}ه و سودهات بیشتر از ضررهاتن. حالا همین قانون‌ها رو توی بازپخش بازار و چالش‌ها محک بزن.` });
    }
  }

  const rank = { warn: 0, tip: 1, good: 2 } as const;
  out.sort((a, b) => rank[a.tone] - rank[b.tone] || b.weight - a.weight);
  return { insights: out, needMore: Math.max(0, COACH_MIN_TRADES - count) };
}
