/**
 * Friend duels on the server: whoever starts a duel plays it first and saves the rounds
 * with their result under a short code; the friend opens the code, plays the same rounds,
 * and both results come back. Needs a signed-in server account.
 */
import { Platform } from 'react-native';

import { t } from '@/i18n';

import { callRpc, serverVersion, sessionToken, type RpcResult } from './cloud';
import { parseResult, parseRounds, type DuelResult, type DuelRounds } from './duel';
import { APP_ORIGIN } from './proxy';

export type DuelRole = 'creator' | 'opponent' | null;
export type DuelStatus = 'open' | 'done' | 'expired';

export type DuelInfo = {
  code: string;
  status: DuelStatus;
  role: DuelRole;
  creatorName: string;
  opponentName: string | null;
  /** Only while the caller can still play it, or once they have. */
  rounds: DuelRounds | null;
  creatorResult: DuelResult | null;
  opponentResult: DuelResult | null;
};

export type DuelSummary = {
  code: string;
  status: DuelStatus;
  role: Exclude<DuelRole, null>;
  otherName: string | null;
  mine: DuelResult | null;
  theirs: DuelResult | null;
  createdAt: string;
};

/** Friend duels need migration 3 on the server. */
export async function duelsAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 3;
}

const CODE_CHARS = /[^A-Z2-9]/g;

/** Invite codes are six letters and digits; people may type them in lower case or with spaces. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(CODE_CHARS, '').slice(0, 6);
}

export function duelLink(code: string): string {
  // The phone app links to the web app, which the Android app also opens (app.json intentFilters).
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : APP_ORIGIN;
  return `${origin}/duel/${code}`;
}

type RawInfo = {
  code: string;
  status: DuelStatus;
  role: DuelRole;
  creator_name: string;
  opponent_name: string | null;
  rounds: unknown;
  creator_result: unknown;
  opponent_result: unknown;
};

function info(raw: RawInfo): DuelInfo {
  return {
    code: raw.code,
    status: raw.status,
    role: raw.role ?? null,
    creatorName: raw.creator_name,
    opponentName: raw.opponent_name ?? null,
    rounds: raw.rounds ? parseRounds(raw.rounds) : null,
    creatorResult: parseResult(raw.creator_result),
    opponentResult: parseResult(raw.opponent_result),
  };
}

function token(): string | null {
  return sessionToken();
}

export async function createDuel(rounds: DuelRounds, result: DuelResult): Promise<RpcResult<{ code: string }>> {
  const t = token();
  if (!t) return { ok: false, error: 'session' };
  return callRpc<{ code: string }>('tradingo_duel_create', { p_token: t, p_rounds: rounds, p_result: result });
}

export async function getDuel(code: string): Promise<RpcResult<DuelInfo>> {
  const res = await callRpc<RawInfo>('tradingo_duel_get', { p_token: token(), p_code: normalizeCode(code) });
  return res.ok ? { ok: true, value: info(res.value) } : res;
}

export async function submitDuel(code: string, result: DuelResult): Promise<RpcResult<DuelInfo>> {
  const t = token();
  if (!t) return { ok: false, error: 'session' };
  const res = await callRpc<RawInfo>('tradingo_duel_submit', { p_token: t, p_code: normalizeCode(code), p_result: result });
  return res.ok ? { ok: true, value: info(res.value) } : res;
}

type RawSummary = { code: string; status: DuelStatus; role: 'creator' | 'opponent'; other_name: string | null; my_result: unknown; their_result: unknown; created_at: string };

export async function myDuels(): Promise<RpcResult<DuelSummary[]>> {
  const t = token();
  if (!t) return { ok: false, error: 'session' };
  const res = await callRpc<RawSummary[]>('tradingo_duel_list', { p_token: t });
  if (!res.ok) return res;
  return {
    ok: true,
    value: (Array.isArray(res.value) ? res.value : []).map((d) => ({
      code: d.code,
      status: d.status,
      role: d.role,
      otherName: d.other_name,
      mine: parseResult(d.my_result),
      theirs: parseResult(d.their_result),
      createdAt: d.created_at,
    })),
  };
}

/** What to tell the player when a duel call fails. */
export function duelErrorText(error: string): string {
  switch (error) {
    case 'session':
      return t('برای دوئل با دوستت باید وارد حسابت بشی.');
    case 'not_found':
      return t('دوئلی با این کد پیدا نشد. کد رو دوباره نگاه کن.');
    case 'taken':
      return t('یکی دیگه زودتر این دوئل رو بازی کرده.');
    case 'own':
      return t('این دوئل رو خودت ساختی؛ لینکش رو برای یه دوست بفرست.');
    case 'expired':
      return t('این دوئل قدیمی شده و دیگه باز نیست.');
    case 'rate':
      return t('امروز دوئل زیادی ساختی؛ فردا دوباره امتحان کن.');
    case 'invalid':
      return t('اطلاعات دوئل درست نبود؛ یه بار دیگه امتحان کن.');
    case 'network':
      return t('به اینترنت وصل نیستی یا سرور جواب نمی‌ده.');
    default:
      return t('یه مشکلی پیش اومد؛ یه بار دیگه امتحان کن.');
  }
}
