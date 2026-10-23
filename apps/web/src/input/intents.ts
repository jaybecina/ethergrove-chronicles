import type { HotbarIndex } from '@hearthvale/core';

export type Device = 'keyboard' | 'gamepad' | 'touch';

export interface Intents {
  move: { x: number; z: number };
  /** Held: the action gate decides when it repeats. */
  primary: boolean;
  /** Edge: true for one read per press. */
  secondary: boolean;
  cycle: -1 | 0 | 1;
  hotbar: HotbarIndex | null;
  rotate: -1 | 0 | 1;
  zoom: -1 | 0 | 1;
  menu: boolean;
  device: Device;
}

export interface InputSource {
  readonly device: Device;
  read(): Partial<Intents>;
  reset(): void;
  dispose(): void;
}

export const EMPTY_INTENTS: Intents = {
  move: { x: 0, z: 0 },
  primary: false,
  secondary: false,
  cycle: 0,
  hotbar: null,
  rotate: 0,
  zoom: 0,
  menu: false,
  device: 'keyboard',
};

export function normalize(x: number, z: number): { x: number; z: number } {
  const len = Math.hypot(x, z);
  return len > 1 ? { x: x / len, z: z / len } : { x, z };
}

/** Collects one-shot inputs between reads. */
export function createEdges() {
  let pending: Partial<Intents> = {};
  return {
    add(patch: Partial<Intents>) {
      pending = { ...pending, ...patch };
    },
    take(): Partial<Intents> {
      const out = pending;
      pending = {};
      return out;
    },
    clear() {
      pending = {};
    },
  };
}
