// ─── Network layer: Colyseus client + Svelte stores. ─────────────────────────
import { Client, Room } from 'colyseus.js';
import { writable, type Writable } from 'svelte/store';
import type { ClientView } from '@goyendagiri/rules';
import { sfx } from './sound';

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
export const connStatus: Writable<'offline' | 'connecting' | 'connected' | 'reconnecting'> = writable('offline');

let room: Room | null = null;
let intentional = false;

// Map an outgoing action to a sound cue. Only non-button gestures live here;
// plain <button> presses are covered by the global click sound in App.svelte,
// so these avoid doubling up.
const ACTION_SFX: Record<string, string> = {
  placeMarker: 'marker', pickSolution: 'marker', pickWitness: 'marker',
  swapDraw: 'deal', swapChoose: 'deal', accuse: 'accuse',
};

function wire(r: Room) {
  connStatus.set('connected');
  room = r;
  roomCode.set(r.roomId);
  // Colyseus 0.15: persist the reconnectionToken (not sessionId) for silent rejoin.
  sessionStorage.setItem('gy_session', JSON.stringify({ token: r.reconnectionToken }));
  sessionStorage.setItem('gy_room', r.roomId);
  r.onMessage('view', (v: ClientView) => view.set(v));
  r.onMessage('chat', (m: ChatMsg) => chat.update(c => [...c.slice(-99), m]));
  r.onMessage('toast', (t: { msg: string }) => {
    toast.set(t.msg);
    sfx('error');
    setTimeout(() => toast.set(null), 3500);
  });
  r.onLeave((code) => {
    room = null;
    if (code === 4001) { toast.set('Host reset the room · হোস্ট রুম রিসেট করেছে'); setTimeout(() => toast.set(null), 3500); }
    if (intentional) { connStatus.set('offline'); return; }
    recover(); // unexpected drop (tab sleep, network) — try to come back silently
  });
}

const client = () => new Client(SERVER_URL);

export async function createRoom(name: string) {
  intentional = false;
  connStatus.set('connecting');
  try { wire(await client().create('goyendagiri', { name })); connError.set(null); sessionStorage.setItem('gy_name', name); }
  catch (e: any) { connError.set(e.message ?? 'connection failed'); connStatus.set('offline'); }
}
export async function joinRoom(code: string, name: string) {
  intentional = false;
  connStatus.set('connecting');
  try { wire(await client().joinById(code.trim(), { name })); connError.set(null); sessionStorage.setItem('gy_name', name); }
  catch (e: any) { connError.set('Room not found or already started'); connStatus.set('offline'); }
}
/** Silent rejoin after tab-suspend (design doc §3.5 / §6.5). Colyseus 0.15 token. */
export async function tryReconnect(): Promise<boolean> {
  const raw = sessionStorage.getItem('gy_session');
  if (!raw) return false;
  try {
    const { token } = JSON.parse(raw);
    if (!token) return false;
    wire(await client().reconnect(token));
    return true;
  } catch { sessionStorage.removeItem('gy_session'); return false; }
}

let recovering = false;
/** Silent recovery after an unexpected disconnect: token first, then lobby re-join. */
async function recover() {
  if (recovering || intentional) return;
  recovering = true;
  connStatus.set('reconnecting');
  try {
    if (await tryReconnect()) return;
    const code = sessionStorage.getItem('gy_room');
    const name = sessionStorage.getItem('gy_name') ?? 'Player';
    if (code) {
      try { wire(await client().joinById(code, { name })); return; } catch { /* room gone or in-game */ }
    }
    connStatus.set('offline');
    toast.set('🔌 সংযোগ হারিয়ে গেছে — পেজ রিফ্রেশ করে আবার ঢুকো · connection lost, refresh the page to rejoin');
    setTimeout(() => toast.set(null), 6000);
  } finally { recovering = false; }
}
if (typeof window !== 'undefined') {
  const tryRecover = () => { if (!room && !intentional && sessionStorage.getItem('gy_session')) recover(); };
  window.addEventListener('online', tryRecover);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tryRecover(); });
}

export const send = (type: string, payload: Record<string, unknown> = {}) => {
  const cue = ACTION_SFX[type];
  if (cue) sfx(cue);
  room?.send(type, payload);
};
/** Host-only: abort the current game back to a fresh lobby (same code). */
export const resetLobby = () => room?.send('resetLobby');
// intentional stays true until the next createRoom/joinRoom — onLeave fires async, so
// resetting it here would let the recover() path run after a deliberate exit.
export function leave() { intentional = true; room?.leave(true); room = null; view.set(null); chat.set([]); roomCode.set(null); connStatus.set('offline'); sessionStorage.removeItem('gy_session'); sessionStorage.removeItem('gy_room'); }
