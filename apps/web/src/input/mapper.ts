import { EMPTY_INTENTS, type Device, type InputSource, type Intents } from './intents';

/** Rotate a screen-space move vector into world space for a camera turned yawSteps × 90°. */
export function cameraRelative(move: { x: number; z: number }, yawSteps: 0 | 1 | 2 | 3) {
  if (yawSteps === 0) return move;
  const a = (yawSteps * Math.PI) / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: move.x * c + move.z * s, z: -move.x * s + move.z * c };
}

const isActive = (p: Partial<Intents>): boolean =>
  (p.move !== undefined && (p.move.x !== 0 || p.move.z !== 0)) ||
  p.primary === true ||
  p.secondary === true ||
  (p.cycle ?? 0) !== 0 ||
  (p.rotate ?? 0) !== 0 ||
  (p.zoom ?? 0) !== 0 ||
  p.menu === true ||
  (p.hotbar ?? null) !== null;

export function createInputMapper(sources: readonly InputSource[]): { read(): Intents } {
  let device: Device = 'keyboard';
  const wasActive = new Map<InputSource, boolean>();
  return {
    read() {
      const out: Intents = { ...EMPTY_INTENTS, move: { x: 0, z: 0 } };
      let best = 0;
      for (const src of sources) {
        const p = src.read();
        const active = isActive(p);
        // Switch device when a source starts being used, so a held stick elsewhere can't steal it back.
        if (active && wasActive.get(src) !== true) device = src.device;
        wasActive.set(src, active);
        const m = p.move;
        if (m && Math.hypot(m.x, m.z) > best) {
          best = Math.hypot(m.x, m.z);
          out.move = m;
        }
        out.primary ||= p.primary === true;
        out.secondary ||= p.secondary === true;
        out.menu ||= p.menu === true;
        out.confirm ||= p.confirm === true;
        out.back ||= p.back === true;
        if (p.nav) out.nav = p.nav;
        if (p.cycle) out.cycle = p.cycle;
        if (p.rotate) out.rotate = p.rotate;
        if (p.zoom) out.zoom = p.zoom;
        if (p.hotbar !== undefined && p.hotbar !== null) out.hotbar = p.hotbar;
      }
      out.device = device;
      return out;
    },
  };
}
