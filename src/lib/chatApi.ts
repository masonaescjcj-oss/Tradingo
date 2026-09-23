/**
 * Server calls for the community chat. Reading rooms works without an account;
 * joining and writing need a signed-in server account.
 */
import { create } from 'zustand';

import { parseMessage, type ChatChart, type ChatMessage, type ChatRoom, type ChatTopic } from './chat';
import { CloudError, rpc, serverVersion, sessionEnded, sessionToken } from './cloud';

/** Whether the chat functions are installed on the server. */
export async function chatAvailable(): Promise<boolean> {
  return (await serverVersion()) >= 2;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Runs a server call, turning failures into an error kind the screens can show. */
async function call<T>(fn: string, args: Record<string, unknown>): Promise<Result<T>> {
  try {
    const value = await rpc<T & { error?: string }>(fn, args);
    if (value && typeof value === 'object' && 'error' in value && value.error) return { ok: false, error: String(value.error) };
    return { ok: true, value };
  } catch (e) {
    if (e instanceof CloudError && e.kind === 'session') {
      await sessionEnded();
      return { ok: false, error: 'session' };
    }
    return { ok: false, error: e instanceof CloudError && e.kind === 'network' ? 'network' : 'server' };
  }
}

function signedIn(): string | null {
  return sessionToken();
}

type ChatState = {
  rooms: ChatRoom[];
  loaded: boolean;
  error: string | null;
};

/** The room list, shared by the chat tab and the "share analysis" sheet. */
export const useChat = create<ChatState>()(() => ({ rooms: [], loaded: false, error: null }));

export async function loadRooms(): Promise<void> {
  const res = await call<ChatRoom[]>('tradingo_chat_rooms', { p_token: signedIn() });
  if (res.ok) useChat.setState({ rooms: Array.isArray(res.value) ? res.value : [], loaded: true, error: null });
  else useChat.setState({ loaded: true, error: res.error });
}

export async function joinRoom(room: string): Promise<string | null> {
  const token = signedIn();
  if (!token) return 'session';
  const res = await call('tradingo_chat_join', { p_token: token, p_room: room });
  if (res.ok) await loadRooms();
  return res.ok ? null : res.error;
}

export async function leaveRoom(room: string): Promise<string | null> {
  const token = signedIn();
  if (!token) return 'session';
  const res = await call('tradingo_chat_leave', { p_token: token, p_room: room });
  if (res.ok) await loadRooms();
  return res.ok ? null : res.error;
}

export async function createRoom(title: string, about: string, topic: ChatTopic): Promise<Result<string>> {
  const token = signedIn();
  if (!token) return { ok: false, error: 'session' };
  const res = await call<{ id: string }>('tradingo_chat_create', { p_token: token, p_title: title, p_about: about, p_topic: topic });
  if (!res.ok) return res;
  await loadRooms();
  return { ok: true, value: res.value.id };
}

/** The latest messages, older ones (`before`), or new ones since `after`, oldest first. */
export async function fetchMessages(room: string, opts: { before?: number; after?: number } = {}): Promise<Result<ChatMessage[]>> {
  const res = await call<Record<string, unknown>[]>('tradingo_chat_messages', {
    p_token: signedIn(),
    p_room: room,
    p_before: opts.before ?? null,
    p_after: opts.after ?? null,
  });
  if (!res.ok) return res;
  return { ok: true, value: (Array.isArray(res.value) ? res.value : []).map(parseMessage) };
}

export async function sendMessage(room: string, body: string, chart?: ChatChart): Promise<Result<ChatMessage>> {
  const token = signedIn();
  if (!token) return { ok: false, error: 'session' };
  const res = await call<Record<string, unknown>>('tradingo_chat_send', { p_token: token, p_room: room, p_body: body, p_chart: chart ?? null });
  return res.ok ? { ok: true, value: parseMessage(res.value) } : res;
}

export async function reportMessage(id: number): Promise<string | null> {
  const token = signedIn();
  if (!token) return 'session';
  const res = await call('tradingo_chat_report', { p_token: token, p_message: id });
  return res.ok ? null : res.error;
}

export async function deleteMessage(id: number): Promise<string | null> {
  const token = signedIn();
  if (!token) return 'session';
  const res = await call('tradingo_chat_delete', { p_token: token, p_message: id });
  return res.ok ? null : res.error;
}
