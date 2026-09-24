/**
 * Problem reports on lesson steps (wrong answer, typo, broken chart, unclear text), sent to
 * the tradingo_report_create database function. Guests can report too. A report made
 * offline waits on the device and goes out with the next report or the next app start.
 */
import Constants from 'expo-constants';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { callRpc, sessionToken } from './cloud';
import { MAX_QUEUED, MAX_REPORT_MESSAGE, type Report } from './reports';
import { safeStorage } from './storage';

export { MAX_REPORT_MESSAGE, parseStepRef, REPORT_REASONS, type Report, type ReportReason } from './reports';

const useQueue = create<{ reports: Report[] }>()(
  persist(() => ({ reports: [] as Report[] }), { name: 'chartoon-reports', storage: createJSONStorage(() => safeStorage) }),
);

const version = () => Constants.expoConfig?.version ?? '';

/** The queue loads from storage after start-up; reading or adding before that would lose reports. */
function queueReady(): Promise<void> {
  if (useQueue.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = useQueue.persist.onFinishHydration(() => {
      stop();
      resolve();
    });
  });
}

let flushing: Promise<void> | null = null;

type Outcome = 'sent' | 'queued' | 'rejected';

async function post(r: Report): Promise<Outcome> {
  const res = await callRpc<{ ok: boolean }>('tradingo_report_create', {
    p_token: sessionToken(),
    p_lesson: r.lesson,
    p_step: r.step,
    p_step_type: r.stepType.slice(0, 40),
    p_reason: r.reason,
    p_message: r.message.trim().slice(0, MAX_REPORT_MESSAGE),
    p_version: version(),
  });
  if (res.ok) return 'sent';
  // Only a connection problem is worth another try; a refused report (limit, bad input) isn't.
  return res.error === 'network' || res.error === 'server' ? 'queued' : 'rejected';
}

/** Sends reports saved while offline, oldest first, and stops at the first connection problem. */
export function flushReports(): Promise<void> {
  // One run at a time, so no report goes out twice.
  flushing ??= (async () => {
    await queueReady();
    while (useQueue.getState().reports.length) {
      const [first] = useQueue.getState().reports;
      if ((await post(first)) === 'queued') break;
      useQueue.setState((s) => ({ reports: s.reports.slice(1) }));
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Sends one report; offline, it's kept and sent later. */
export async function sendReport(r: Report): Promise<Outcome> {
  const outcome = await post(r);
  if (outcome === 'queued') {
    await queueReady();
    useQueue.setState((s) => ({ reports: [...s.reports, r].slice(-MAX_QUEUED) }));
  } else if (outcome === 'sent') {
    void flushReports();
  }
  return outcome;
}
