/**
 * Talking to the AI coach (the tradingo-coach Edge Function). The conversation stays on
 * this device; each question carries the latest turns and the learner's data.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { historyFor, type CoachTurn } from './coach';
import { sessionEnded, sessionToken } from './cloud';
import { safeStorage } from './storage';

/** Turns kept on the device. */
const KEEP_TURNS = 60;
/** AI answers can take a while; give up after this long. */
const TIMEOUT_MS = 45_000;

export const useCoach = create<{ turns: CoachTurn[] }>()(
  persist(() => ({ turns: [] as CoachTurn[] }), { name: 'tradingo-coach', storage: createJSONStorage(() => safeStorage) }),
);

export function addTurn(role: CoachTurn['role'], text: string): CoachTurn {
  const turn: CoachTurn = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text, at: Date.now() };
  useCoach.setState((s) => ({ turns: [...s.turns, turn].slice(-KEEP_TURNS) }));
  return turn;
}

export function clearCoach() {
  useCoach.setState({ turns: [] });
}

/** Asks the coach. `earlier` are the turns before this question. */
export async function askCoach(earlier: CoachTurn[], question: string, context: string): Promise<{ reply?: string; remaining?: number; error?: string }> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { error: 'not_configured' };
  const token = sessionToken();
  if (!token) return { error: 'session' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/functions/v1/tradingo-coach`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, messages: historyFor(earlier, question), context }),
      signal: controller.signal,
    });
    // No function yet on this project.
    if (res.status === 404) return { error: 'not_configured' };
    const data = (await res.json().catch(() => ({}))) as { reply?: string; remaining?: number; error?: string };
    if (data.error === 'session') await sessionEnded();
    if (!res.ok || !data.reply) return { error: data.error ?? 'ai' };
    return { reply: data.reply, remaining: data.remaining };
  } catch {
    return { error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
