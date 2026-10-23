import type { HotbarIndex } from '@hearthvale/core';
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

export function createKeyboardSource(target: Window): InputSource {
  const held = new Set<string>();
  const edges = createEdges();

  const onDown = (e: KeyboardEvent) => {
    if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    held.add(e.code);
    if (e.repeat) return;
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
      return { move: normalize(x, z), primary: held.has('Space'), ...edges.take() };
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
