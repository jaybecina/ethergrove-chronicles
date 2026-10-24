import type { Facing } from '@hearthvale/core';

export const FACING_YAW: Record<Facing, number> = {
  n: Math.PI,
  s: 0,
  e: Math.PI / 2,
  w: -Math.PI / 2,
};

/** The farmer's drawn position, smoothed speed (tiles/s) and body yaw. */
export interface Motion {
  x: number;
  z: number;
  speed: number;
  yaw: number;
}

const FOLLOW = 12; // position catch-up rate (1/s): smooths the 50 ms core steps
const SPEED_SMOOTH = 8; // speed averaging rate (1/s): no walk/run flicker between steps
const TURN = 10; // body turn rate (1/s)
const SNAP = 2; // tiles: farther than this is a teleport
const MOVING = 0.3; // tiles/s: below this the farmer is standing

const damp = (a: number, b: number, rate: number, dt: number) => b + (a - b) * Math.exp(-rate * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** One frame of following the simulated player; pure so the feel is tested, not guessed. */
export function followMotion(
  m: Motion,
  target: { x: number; z: number; facing: Facing },
  dt: number,
): Motion {
  if (Math.hypot(target.x - m.x, target.z - m.z) > SNAP)
    return { x: target.x, z: target.z, speed: 0, yaw: FACING_YAW[target.facing] };
  if (dt <= 0) return m;
  const x = damp(m.x, target.x, FOLLOW, dt);
  const z = damp(m.z, target.z, FOLLOW, dt);
  const vx = (x - m.x) / dt;
  const vz = (z - m.z) / dt;
  const speed = damp(m.speed, Math.hypot(vx, vz), SPEED_SMOOTH, dt);
  const heading =
    speed > MOVING && Math.hypot(vx, vz) > MOVING ? Math.atan2(vx, vz) : FACING_YAW[target.facing];
  const yaw = m.yaw + wrap(heading - m.yaw) * Math.min(1, dt * TURN);
  return { x, z, speed, yaw };
}

/** Shared with the animated model, which picks walk/run clips from `speed`. */
export const playerMotion: Motion = { x: 0, z: 0, speed: 0, yaw: 0 };
