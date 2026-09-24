/** Trading challenges for the simulator: rules, rewards and progress. Pure. */
import { isEn, t } from '@/i18n';
import { fa } from '@/utils/format';

import { maxDrawdown } from './stats';
import type { ClosedTrade } from './trading';

export type ChallengeId = 'profit10' | 'streak3' | 'rr2' | 'stops5' | 'noLiq10' | 'pending';

export type Challenge = {
  id: ChallengeId;
  title: string;
  rules: string;
  xp: number;
  coins: number;
};

/** Saved per challenge once the learner presses start. */
export type ChallengeRecord = { startedAt: number; startBalance: number; completedAt?: number };

export type ChallengeStatus = {
  /** 0–1 */
  progress: number;
  /** Short progress text, e.g. "2 of 5". */
  label: string;
  done: boolean;
  /** The attempt broke a rule; start again to retry. */
  failed: boolean;
};

export const CHALLENGES: Challenge[] = [
  {
    id: 'stops5',
    title: '۵ معامله با حد ضرر', // i18n-ignore: translated where shown
    rules: '۵ تا معامله ببند که همه‌شون از اول حد ضرر داشتن. سود یا ضررش مهم نیست؛ عادتش مهمه.', // i18n-ignore: translated where shown
    xp: 20,
    coins: 25,
  },
  {
    id: 'rr2',
    title: 'ریسک به ریوارد ۱ به ۲', // i18n-ignore: translated where shown
    rules: 'یه معامله باز کن که حد سودش حداقل دو برابرِ فاصله‌ی حد ضررش باشه و بذار به حد سود برسه.', // i18n-ignore: translated where shown
    xp: 30,
    coins: 40,
  },
  {
    id: 'pending',
    title: 'سفارش در قیمت بهتر', // i18n-ignore: translated where shown
    rules: 'یه سفارش لیمیت یا استاپ بذار، صبر کن پر بشه و معامله رو با سود ببند.', // i18n-ignore: translated where shown
    xp: 20,
    coins: 30,
  },
  {
    id: 'streak3',
    title: '۳ معامله‌ی سودده پشت‌سرهم', // i18n-ignore: translated where shown
    rules: '۳ تا معامله‌ی پشت‌سرهم با سود ببند. یه ضرر وسطش شمارش رو صفر می‌کنه.', // i18n-ignore: translated where shown
    xp: 30,
    coins: 40,
  },
  {
    id: 'noLiq10',
    title: '۱۰ معامله بدون لیکوئید', // i18n-ignore: translated where shown
    rules: '۱۰ تا معامله ببند بدون اینکه حتی یکی‌شون لیکوئید بشه. اگه لیکوئید بشی، چالش از اول شروع می‌شه.', // i18n-ignore: translated where shown
    xp: 40,
    coins: 50,
  },
  {
    id: 'profit10',
    title: '۱۰٪ سود بدون افت بیشتر از ۵٪', // i18n-ignore: translated where shown
    rules: 'موجودیت رو ۱۰٪ بالا ببر، بدون اینکه موجودی از بالاترین نقطه‌ش بیشتر از ۵٪ پایین بیاد. معامله‌های بسته‌شده حساب می‌شن.', // i18n-ignore: translated where shown
    xp: 60,
    coins: 100,
  },
];

export function findChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

const count = (n: number, of: number) => t('{n} از {total}', { n: fa(Math.min(n, of)), total: fa(of) });
const pct = (v: number) => {
  const n = fa((v * 100).toFixed(1).replace(/\.0$/, ''));
  return t('{n}٪', { n: isEn() ? n : n.replace('.', '٫') }); // i18n-ignore: the Persian decimal mark
};

/** Trades closed since the challenge started, oldest first. */
function tradesSince(historyNewestFirst: ClosedTrade[], startedAt: number): ClosedTrade[] {
  return historyNewestFirst.filter((t) => t.closedAt >= startedAt).reverse();
}

/** Reward-to-risk of a trade's planned stop and target, or null without both. */
export function plannedRR(t: Pick<ClosedTrade, 'entry' | 'sl' | 'tp'>): number | null {
  if (t.sl == null || t.tp == null) return null;
  const risk = Math.abs(t.entry - t.sl);
  return risk > 0 ? Math.abs(t.tp - t.entry) / risk : null;
}

export function evaluateChallenge(c: Challenge, record: ChallengeRecord | undefined, historyNewestFirst: ClosedTrade[]): ChallengeStatus {
  if (record?.completedAt != null) return { progress: 1, label: t('انجام شد'), done: true, failed: false };
  if (!record) return { progress: 0, label: t('شروع نشده'), done: false, failed: false };
  const trades = tradesSince(historyNewestFirst, record.startedAt);

  switch (c.id) {
    case 'stops5': {
      const n = trades.filter((t) => t.sl != null).length;
      return { progress: Math.min(1, n / 5), label: count(n, 5), done: n >= 5, failed: false };
    }
    case 'rr2': {
      const ok = trades.some((t) => t.reason === 'tp' && (plannedRR(t) ?? 0) >= 2 - 1e-9);
      return { progress: ok ? 1 : 0, label: count(ok ? 1 : 0, 1), done: ok, failed: false };
    }
    case 'pending': {
      const ok = trades.some((t) => (t.orderType === 'limit' || t.orderType === 'stop') && t.pnl > 0);
      return { progress: ok ? 1 : 0, label: count(ok ? 1 : 0, 1), done: ok, failed: false };
    }
    case 'streak3': {
      let run = 0;
      for (const t of trades) {
        run = t.pnl > 0 ? run + 1 : 0;
        if (run >= 3) return { progress: 1, label: count(3, 3), done: true, failed: false };
      }
      return { progress: run / 3, label: count(run, 3), done: false, failed: false };
    }
    case 'noLiq10': {
      let n = 0;
      for (const trade of trades) {
        if (trade.reason === 'liquidation') return { progress: n / 10, label: t('لیکوئید شدی'), done: false, failed: true };
        n += 1;
        if (n >= 10) return { progress: 1, label: count(10, 10), done: true, failed: false };
      }
      return { progress: n / 10, label: count(n, 10), done: false, failed: false };
    }
    case 'profit10': {
      const start = record.startBalance;
      const curve = [start];
      for (const trade of trades) {
        curve.push(curve[curve.length - 1] + trade.pnl);
        const dd = maxDrawdown(curve).pct;
        const gain = (curve[curve.length - 1] - start) / start;
        if (dd >= 0.05) return { progress: Math.max(0, gain) / 0.1, label: t('افت {dd}', { dd: pct(dd) }), done: false, failed: true };
        if (gain >= 0.1) return { progress: 1, label: t('سود {gain}', { gain: pct(gain) }), done: true, failed: false };
      }
      const gain = (curve[curve.length - 1] - start) / start;
      const dd = maxDrawdown(curve).pct;
      return { progress: Math.max(0, Math.min(1, gain / 0.1)), label: t('سود {gain} · افت {dd}', { gain: pct(Math.max(0, gain)), dd: pct(dd) }), done: false, failed: false };
    }
  }
}

/** Keeps every finished challenge from both sides, otherwise this side's attempt. */
export function mergeChallenges(
  local: Record<string, ChallengeRecord> | undefined,
  remote: Record<string, ChallengeRecord> | undefined,
): Record<string, ChallengeRecord> {
  const out: Record<string, ChallengeRecord> = { ...(remote ?? {}) };
  for (const [id, rec] of Object.entries(local ?? {})) {
    const other = out[id];
    if (!other || rec.completedAt != null || other.completedAt == null) {
      out[id] = other?.completedAt != null && rec.completedAt != null ? (rec.completedAt <= other.completedAt ? rec : other) : rec;
    }
  }
  return out;
}
