import { cameraOffset } from './cameraMath';

type V3 = [number, number, number];

export const INTRO_FLIGHT_MS = 6000;
const TARGET_Y = 0.6;

const lerp = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

function bezier(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  return lerp(lerp(a, b, t), lerp(b, c, t), t);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Dawn flight from the northern hills down to the follow camera behind the farmer (spec §3.11). */
export function introCameraAt(
  t: number,
  spawn: { x: number; z: number },
): { position: V3; target: V3 } {
  const k = ease(Math.min(1, Math.max(0, t)));
  const [ox, oy, oz] = cameraOffset(0, 1);
  const end: V3 = [spawn.x + ox, TARGET_Y + oy, spawn.z + oz];
  const endTarget: V3 = [spawn.x, TARGET_Y, spawn.z];
  const start: V3 = [30, 24, -16];
  const startTarget: V3 = [16, 0, 8];
  const position = bezier(start, [24, 26, 4], [spawn.x + 6, 14, spawn.z + 14], end, k);
  return {
    position: k >= 1 ? end : position,
    target: k >= 1 ? endTarget : lerp(startTarget, endTarget, k),
  };
}
