// ─── Shared card zoom (design: hold/long-press any card → zoom to centre) ─────
// Works with mouse (press-and-hold) and touch (long-press). Tapping the backdrop
// closes it. Used across Initiation / Board / Night via `use:zoomable`.
import { writable } from 'svelte/store';

export type ZoomCard = { type: 'evidence' | 'means'; bn: string; en: string; icon?: string };

export const zoomedCard = writable<ZoomCard | null>(null);

const LONG_PRESS_MS = 320;

// Svelte action: attach to a card element. Long-press opens the zoom overlay and
// suppresses the follow-up click so it doesn't also trigger a parent handler
// (e.g. opening a suspect on the Board).
export function zoomable(node: HTMLElement, card: ZoomCard) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current = card;
  let longPressed = false;
  let startX = 0, startY = 0;

  const clear = () => { if (timer) { clearTimeout(timer); timer = undefined; } };

  const onDown = (e: PointerEvent) => {
    longPressed = false;
    startX = e.clientX; startY = e.clientY;
    clear();
    timer = setTimeout(() => { longPressed = true; zoomedCard.set(current); }, LONG_PRESS_MS);
  };
  // If the pointer moves too far it's a scroll/drag, not a hold — cancel.
  const onMove = (e: PointerEvent) => {
    if (timer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) clear();
  };
  const onUp = () => clear();
  // Swallow the click that follows a long-press so parents don't also fire.
  const onClickCapture = (e: MouseEvent) => {
    if (longPressed) { e.stopPropagation(); e.preventDefault(); longPressed = false; }
  };
  const onContext = (e: Event) => e.preventDefault(); // no iOS/Android callout menu

  node.style.touchAction = 'manipulation';
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointerleave', onUp);
  node.addEventListener('pointercancel', onUp);
  node.addEventListener('click', onClickCapture, true);
  node.addEventListener('contextmenu', onContext);

  return {
    update(next: ZoomCard) { current = next; },
    destroy() {
      clear();
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointerleave', onUp);
      node.removeEventListener('pointercancel', onUp);
      node.removeEventListener('click', onClickCapture, true);
      node.removeEventListener('contextmenu', onContext);
    },
  };
}
