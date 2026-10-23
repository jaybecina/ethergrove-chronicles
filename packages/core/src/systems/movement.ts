import { BALANCE } from '../data/balance';
import { isBlocked, tileAt } from '../grid';
import type { Facing, GameState, Grid, PlayerState } from '../types';

const DEADZONE = 0.1;
const MAX_SUBSTEP = 0.25;
const R = BALANCE.playerRadius;

const spanOf = (c: number): [number, number] => [Math.floor(c - R), Math.ceil(c + R) - 1];

/** Tile indexes along `axis` of blocked tiles overlapped by the player circle at (x, z). */
function blockedLines(grid: Grid, x: number, z: number, axis: 'x' | 'z'): number[] {
  const [x0, x1] = spanOf(x);
  const [z0, z1] = spanOf(z);
  const hits: number[] = [];
  for (let tx = x0; tx <= x1; tx++)
    for (let tz = z0; tz <= z1; tz++)
      if (isBlocked(tileAt(grid, tx, tz))) hits.push(axis === 'x' ? tx : tz);
  return hits;
}

/** Move one axis by d, stopping flush against the first blocked tile. */
function slide(pos: number, d: number, hits: number[]): number {
  if (hits.length === 0) return pos + d;
  return d > 0 ? Math.max(pos, Math.min(...hits) - R) : Math.min(pos, Math.max(...hits) + 1 + R);
}

function facingOf(dx: number, dz: number): Facing {
  if (Math.abs(dx) >= Math.abs(dz)) return dx > 0 ? 'e' : 'w';
  return dz > 0 ? 's' : 'n';
}

export function stepMovement(state: GameState, dx: number, dz: number, dtMs: number): GameState {
  if (Math.abs(dx) < DEADZONE && Math.abs(dz) < DEADZONE) return state;
  const len = Math.hypot(dx, dz);
  const [ux, uz] = len > 1 ? [dx / len, dz / len] : [dx, dz];
  const speed = BALANCE.walkSpeed * (state.player.stamina <= 0 ? BALANCE.exhaustedSpeedFactor : 1);
  const reach = speed * (dtMs / 1000);
  const steps = Math.max(1, Math.ceil((reach * Math.hypot(ux, uz)) / MAX_SUBSTEP));
  const grid = state.maps[state.player.location];
  let { x, z } = state.player;
  const sx = (ux * reach) / steps;
  const sz = (uz * reach) / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) x = slide(x, sx, blockedLines(grid, x + sx, z, 'x'));
    if (sz !== 0) z = slide(z, sz, blockedLines(grid, x, z + sz, 'z'));
  }
  return { ...state, player: { ...state.player, x, z, facing: facingOf(dx, dz) } };
}

const FACING_DELTA: Record<Facing, [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
};

export function targetTile(player: PlayerState): { x: number; y: number } {
  const [ox, oy] = FACING_DELTA[player.facing];
  return { x: Math.floor(player.x) + ox, y: Math.floor(player.z) + oy };
}
