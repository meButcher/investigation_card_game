// ─── Sound: synthesized SFX with optional file override. ─────────────────────
// Zero-asset by default (WebAudio tones). If a matching file exists under
// /sfx/<name>.(mp3|ogg|wav) it plays that instead. Candlelit-noir flavour:
// warm, soft, low. Respects a persisted mute toggle.
import { writable } from 'svelte/store';

export type SfxName =
  | 'click' | 'ready' | 'marker' | 'deal' | 'accuse'
  | 'phase' | 'error' | 'win' | 'lose' | 'toast' | 'flip';

const STORE_KEY = 'gy_muted';
const initialMuted = (() => { try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; } })();
export const muted = writable<boolean>(initialMuted);
let isMuted = initialMuted;
muted.subscribe(v => { isMuted = v; try { localStorage.setItem(STORE_KEY, v ? '1' : '0'); } catch {} });
export const toggleMute = () => muted.update(v => !v);

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Call once on the first user gesture so browsers permit audio.
let unlocked = false;
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  ac(); // create + resume
  detectFiles();
}

// ── optional file override ──────────────────────────────────────────────────
const fileUrl: Partial<Record<SfxName, string>> = {};
let detected = false;
const NAMES: SfxName[] = ['click', 'ready', 'marker', 'deal', 'accuse', 'phase', 'error', 'win', 'lose', 'toast', 'flip'];
async function detectFiles() {
  if (detected) return; detected = true;
  await Promise.all(NAMES.map(async (n) => {
    for (const ext of ['mp3', 'ogg', 'wav']) {
      try {
        const r = await fetch(`/sfx/${n}.${ext}`, { method: 'HEAD' });
        if (r.ok) { fileUrl[n] = `/sfx/${n}.${ext}`; return; }
      } catch { /* not present */ }
    }
  }));
}

// ── synth voices ────────────────────────────────────────────────────────────
function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, glideTo?: number) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function chord(freqs: number[], dur: number, type: OscillatorType, gain: number, stagger = 0.06) {
  freqs.forEach((f, i) => tone(f, dur, type, gain, i * stagger));
}

const SYNTH: Record<SfxName, () => void> = {
  click:  () => tone(320, 0.05, 'triangle', 0.10, 0, 240),
  ready:  () => { tone(523, 0.09, 'triangle', 0.12); tone(784, 0.12, 'triangle', 0.10, 0.07); },
  marker: () => { tone(440, 0.05, 'square', 0.08); tone(660, 0.10, 'triangle', 0.11, 0.05); },
  deal:   () => tone(180, 0.12, 'sawtooth', 0.06, 0, 90),
  accuse: () => { tone(196, 0.18, 'sawtooth', 0.12, 0, 140); tone(147, 0.28, 'sine', 0.10, 0.05); },
  phase:  () => { tone(110, 0.5, 'sine', 0.10, 0, 165); tone(220, 0.4, 'triangle', 0.05, 0.05); },
  error:  () => { tone(160, 0.16, 'square', 0.09, 0, 120); tone(120, 0.18, 'square', 0.08, 0.08); },
  win:    () => chord([523, 659, 784, 1047], 0.5, 'triangle', 0.12, 0.10),
  lose:   () => chord([392, 330, 262, 196], 0.55, 'sine', 0.12, 0.12),
  toast:  () => tone(600, 0.06, 'sine', 0.08),
  flip:   () => tone(500, 0.10, 'triangle', 0.09, 0, 720),
};

export function sfx(name: string) {
  if (isMuted) return;
  const key = name as SfxName;
  const url = fileUrl[key];
  if (url) {
    try { const a = new Audio(url); a.volume = 0.7; a.play().catch(() => {}); return; } catch { /* fall through */ }
  }
  const voice = SYNTH[key];
  if (voice) { try { voice(); } catch { /* audio not ready */ } }
}
