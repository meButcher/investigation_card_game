// ─── Network layer: Colyseus client + Svelte stores. ─────────────────────────
import { Client, Room } from 'colyseus.js';
import { writable, type Writable } from 'svelte/store';
import type { ClientView } from '@goyendagiri/rules';

const isSecure = location.protocol === 'https:';
const defaultProtocol = isSecure ? 'wss' : 'ws';

// Only append port 2567 if running locally on localhost or 127.0.0.1
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const defaultHost = isLocalhost ? `${location.hostname}:2567` : location.hostname;

export const SERVER_URL =
  (import.meta as any).env?.VITE_SERVER_URL ?? `${defaultProtocol}://${defaultHost}`;

export interface ChatMsg { seat: number; name: string; text: string }

export const view: Writable<ClientView | null> = writable(null);
export const chat: Writable<ChatMsg[]> = writable([]);
export const toast: Writable<string | null> = writable(null);
export const roomCode: Writable<string | null> = writable(null);
export const connError: Writable<string | null> = writable(null);

let room: Room | null = null;

function wire(r: Room) {
  room = r;
  roomCode.set(r.roomId);
  sessionStorage.setItem('gy_session', JSON.stringify({ roomId: r.roomId, sessionId: r.sessionId }));
  r.onMessage('view', (v: ClientView) => view.set(v));
  r.onMessage('chat', (m: ChatMsg) => chat.update(c => [...c.slice(-99), m]));
  r.onMessage('toast', (t: { msg: string }) => {
    toast.set(t.msg);
    setTimeout(() => toast.set(null), 3500);
  });
  r.onLeave(() => { /* reconnect attempt happens on next page load via session token */ });
}

const client = () => new Client(SERVER_URL);

export async function createRoom(name: string) {
  try { wire(await client().create('goyendagiri', { name })); connError.set(null); }
  catch (e: any) { connError.set(e.message ?? 'connection failed'); }
}
export async function joinRoom(code: string, name: string) {
  try { wire(await client().joinById(code.trim(), { name })); connError.set(null); }
  catch (e: any) { connError.set('Room not found or already started'); }
}
/** Silent rejoin after tab-suspend (design doc §3.5 / §6.5). */
export async function tryReconnect(): Promise<boolean> {
  const raw = sessionStorage.getItem('gy_session');
  if (!raw) return false;
  try {
    const { roomId, sessionId } = JSON.parse(raw);
    wire(await client().reconnect(roomId, sessionId));
    return true;
  } catch { sessionStorage.removeItem('gy_session'); return false; }
}

export const send = (type: string, payload: Record<string, unknown> = {}) => room?.send(type, payload);
export function leave() { room?.leave(true); room = null; view.set(null); chat.set([]); roomCode.set(null); sessionStorage.removeItem('gy_session'); }
