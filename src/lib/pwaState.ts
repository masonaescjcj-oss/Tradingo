import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { safeStorage } from './storage';

/**
 * How the web app can be installed here: the browser's own install prompt, Safari's
 * "Add to Home Screen" (iOS has no prompt), the browser menu on other phones, or not at all.
 */
export type InstallMode = 'prompt' | 'ios' | 'manual' | null;

type PwaState = {
  mode: InstallMode;
  /** Running as the installed app (its own window, no browser bar). */
  installed: boolean;
  /** A new release is downloaded and waits for a reload. */
  updateReady: boolean;
};

export const usePwa = create<PwaState>(() => ({ mode: null, installed: false, updateReady: false }));

/** When the install banner was last dismissed, remembered on this device only (not synced). */
export const useInstallNudge = create<{ dismissedAt: number; dismiss: (at: number) => void }>()(
  persist((set) => ({ dismissedAt: 0, dismiss: (at) => set({ dismissedAt: at }) }), {
    name: 'chartoon-install',
    storage: createJSONStorage(() => safeStorage),
  }),
);

/** The banner comes back this long after "later". */
export const NUDGE_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;
/** Lessons finished before the banner first shows, so it greets someone who's staying. */
export const NUDGE_AFTER_LESSONS = 2;

export function showInstallNudge(p: { mode: InstallMode; installed: boolean; dismissedAt: number; now: number; lessons: number }): boolean {
  return p.mode != null && !p.installed && p.lessons >= NUDGE_AFTER_LESSONS && p.now - p.dismissedAt >= NUDGE_AGAIN_MS;
}
