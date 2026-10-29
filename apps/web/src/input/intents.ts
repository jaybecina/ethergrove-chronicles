import type { HotbarIndex } from '@ethergrove/core';

export type Device = 'keyboard' | 'gamepad' | 'touch';

export interface Intents {
  move: { x: number; z: number };
  /** Held: Shift, full stick tilt, gamepad B, or the joystick's outer ring. */
  run: boolean;
  /** Held: the action gate decides when it repeats. */
  primary: boolean;
  /** Edge: true for one read per press. */
  secondary: boolean;
  cycle: -1 | 0 | 1;
  hotbar: HotbarIndex | null;
  rotate: -1 | 0 | 1;
  zoom: -1 | 0 | 1;
  menu: boolean;
  /** Gamepad menu navigation (d-pad, A, B) — edges. */
  nav: 'up' | 'down' | 'left' | 'right' | null;
  confirm: boolean;
  back: boolean;
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
  run: false,
  primary: false,
  secondary: false,
  cycle: 0,
  hotbar: null,
  rotate: 0,
  zoom: 0,
  menu: false,
  nav: null,
  confirm: false,
  back: false,
  device: 'keyboard',
};

/** Stick or joystick tilt at or above this runs. */
export const RUN_TILT = 0.85;

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
