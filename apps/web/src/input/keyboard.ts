import type { HotbarIndex } from '@ethergrove/core';
import { createEdges, normalize, type InputSource, type Intents } from './intents';

const EDGE_KEYS: Record<string, Partial<Intents>> = {
  KeyF: { secondary: true },
  KeyQ: { rotate: -1 },
  KeyE: { rotate: 1 },
  Equal: { zoom: -1 },
  NumpadAdd: { zoom: -1 },
  Minus: { zoom: 1 },
  NumpadSubtract: { zoom: 1 },
  Escape: { menu: true },
  Tab: { menu: true },
};

const isTextEntry = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT');

interface Options {
  /** True while the game itself has the keyboard (in play, no menu open). */
  capture?: () => boolean;
}

export function createKeyboardSource(
  target: Window,
  { capture = () => true }: Options = {},
): InputSource {
  const held = new Set<string>();
  const edges = createEdges();
  // A press and release between two reads must still count as one action.
  let tapped = false;

  const onDown = (e: KeyboardEvent) => {
    // Text fields and menus keep their own keys (typing spaces, Tab focus, Space on buttons).
    if (isTextEntry(e.target)) return;
    if (!capture()) {
      if (e.code === 'Escape' && !e.repeat) edges.add({ menu: true });
      return;
    }
    if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    held.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Space') tapped = true;
    const edge = EDGE_KEYS[e.code];
    if (edge) edges.add(edge);
    const digit = /^Digit([1-8])$/.exec(e.code)?.[1];
    if (digit) edges.add({ hotbar: (Number(digit) - 1) as HotbarIndex });
  };
  const onUp = (e: KeyboardEvent) => {
    held.delete(e.code);
  };
  const onWheel = (e: WheelEvent) => {
    if (e.deltaY !== 0) edges.add({ cycle: e.deltaY > 0 ? 1 : -1 });
  };
  const reset = () => {
    held.clear();
    edges.clear();
    tapped = false;
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('wheel', onWheel, { passive: true });
  target.addEventListener('blur', reset);

  const any = (...codes: string[]) => codes.some((c) => held.has(c));
  return {
    device: 'keyboard',
    read() {
      const x = (any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0);
      const z = (any('KeyS', 'ArrowDown') ? 1 : 0) - (any('KeyW', 'ArrowUp') ? 1 : 0);
      const primary = held.has('Space') || tapped;
      tapped = false;
      const run = held.has('ShiftLeft') || held.has('ShiftRight');
      return { move: normalize(x, z), primary, run, ...edges.take() };
    },
    reset,
    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('wheel', onWheel);
      target.removeEventListener('blur', reset);
    },
  };
}
