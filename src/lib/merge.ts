import { canonicalCourseId, canonicalCourseIds } from '@/content';
import { mergeChallenges } from '@/lib/challenges';
import type { GameData, LessonRecord } from '@/store/game';

const later = (a: string | null, b: string | null) => ((a ?? '') >= (b ?? '') ? a : b);

function mergeCompleted(a: Record<string, LessonRecord>, b: Record<string, LessonRecord>) {
  const out: Record<string, LessonRecord> = { ...b };
  for (const [id, rec] of Object.entries(a)) {
    const other = out[id];
    if (!other) out[id] = rec;
    else
      out[id] = {
        best: Math.max(rec.skipped ? 0 : rec.best, other.skipped ? 0 : other.best),
        perfect: rec.perfect || other.perfect,
        ...(rec.skipped && other.skipped ? { skipped: true } : {}),
      };
  }
  return out;
}

/**
 * Combines this device's progress with the cloud copy without losing either:
 * lessons, chests and courses are united, counters keep the higher value and
 * day/week based fields follow whichever side is more recent.
 */
export function mergeProgress(local: GameData, remote: GameData): GameData {
  const localNewerDay = (local.lastActiveDay ?? '') >= (remote.lastActiveDay ?? '');
  const sameWeek = local.weekKey === remote.weekKey;
  const localNewerWeek = local.weekKey > remote.weekKey;
  const sameDay = local.dailyDay === remote.dailyDay;
  const base = local.onboarded ? local : remote;
  const other = base === local ? remote : local;
  return {
    ...base,
    onboarded: local.onboarded || remote.onboarded,
    name: local.name !== 'تریدر' ? local.name : remote.name,
    xp: Math.max(local.xp, remote.xp),
    coins: Math.max(local.coins, remote.coins),
    streak: localNewerDay ? local.streak : remote.streak,
    lastActiveDay: later(local.lastActiveDay, remote.lastActiveDay),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    activeDays: [...new Set([...remote.activeDays, ...local.activeDays])].sort().slice(-30),
    dailyXp: sameDay ? Math.max(local.dailyXp, remote.dailyXp) : local.dailyDay > remote.dailyDay ? local.dailyXp : remote.dailyXp,
    dailyDay: local.dailyDay > remote.dailyDay ? local.dailyDay : remote.dailyDay,
    dailyClaimedDay: later(local.dailyClaimedDay, remote.dailyClaimedDay),
    weekKey: localNewerWeek || sameWeek ? local.weekKey : remote.weekKey,
    weeklyXp: sameWeek ? Math.max(local.weeklyXp, remote.weeklyXp) : localNewerWeek ? local.weeklyXp : remote.weeklyXp,
    league: sameWeek ? Math.max(local.league, remote.league) : localNewerWeek ? local.league : remote.league,
    completed: mergeCompleted(local.completed, remote.completed),
    chests: [...new Set([...remote.chests, ...local.chests])],
    // Either side may still use course ids from before the topics were merged.
    enrolled: canonicalCourseIds([...local.enrolled, ...remote.enrolled]),
    activeCourse: canonicalCourseId(base.activeCourse),
    mistakes: [...new Set([...local.mistakes, ...remote.mistakes])].slice(0, 40),
    practiceSessions: Math.max(local.practiceSessions, remote.practiceSessions),
    reviews: { ...(remote.reviews ?? {}), ...(local.reviews ?? {}) },
    mastered: [...new Set([...(local.mastered ?? []), ...(remote.mastered ?? [])])],
    user: local.user ?? remote.user ?? null,
    signedOut: false,
    answers: { ...(remote.answers ?? {}), ...(local.answers ?? {}) },
    // The simulator accounts travel together with `sim` from the same side, so balances,
    // positions and orders never mix. Finished challenges are kept from both sides.
    simOrders: base.simOrders ?? [],
    simReplay: base.simReplay ?? other.simReplay,
    simChallenges: mergeChallenges(local.simChallenges, remote.simChallenges),
    simTools: base.simTools ?? other.simTools,
  };
}
