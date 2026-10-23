import type { StoreApi } from 'zustand/vanilla';
import type { GameStore } from '../game/store';

export function hasWebGL2(
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): boolean {
  try {
    return createCanvas().getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

/** On GPU context loss: pause behind a "Restoring graphics" overlay; on restore, remount the canvas. */
export function installContextLoss(
  canvas: HTMLCanvasElement,
  store: StoreApi<GameStore>,
): () => void {
  const lost = (e: Event) => {
    e.preventDefault();
    store.getState().setOverlay('restoring');
  };
  const restored = () => {
    const s = store.getState();
    if (s.overlay === 'restoring') s.setOverlay(null);
    s.remountCanvas();
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return () => {
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
  };
}

export async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
}
