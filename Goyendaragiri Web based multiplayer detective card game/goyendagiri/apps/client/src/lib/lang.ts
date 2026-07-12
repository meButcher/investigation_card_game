// ─── Personal language order — client-side only, persisted per browser. ──────
import { writable, derived } from 'svelte/store';

export type Lang = 'bn' | 'en';
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('gy_lang') : null;
export const lang = writable<Lang>(stored === 'en' ? 'en' : 'bn');
lang.subscribe(l => { try { localStorage.setItem('gy_lang', l); } catch { /* private mode */ } });

/** Ordered bilingual pair: $bi('বাংলা টেক্সট', 'English text') → "বাংলা টেক্সট · English text" (or flipped). */
export const bi = derived(lang, l => (bn: string, en: string) => (l === 'bn' ? `${bn} · ${en}` : `${en} · ${bn}`));

/** Flip an existing "বাংলা · English" literal by preference — leaves other strings untouched. */
export const t = derived(lang, l => (s: string) => {
  if (l === 'bn') return s;
  const parts = s.split(' · ');
  return parts.length === 2 ? `${parts[1]} · ${parts[0]}` : s;
});
