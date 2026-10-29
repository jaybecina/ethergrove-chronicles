import type { Grid } from '@ethergrove/core';
import { hash01 } from './palette';

export interface TreeSpot {
  x: number;
  z: number;
  s: number;
  kind: 'round' | 'pine' | 'blossom';
}

/** Seeded tree positions in a ring outside the fence, leaving the east road clear. */
export function spots(grid: Grid): TreeSpot[] {
  const out: TreeSpot[] = [];
  for (let i = 0; i < 260 && out.length < 50; i++) {
    const a = hash01(i * 3.7 + 1);
    const b = hash01(i * 5.3 + 2);
    const x = -9 + a * (grid.width + 18);
    const z = -9 + b * (grid.height + 18);
    const insideish = x > -1.5 && z > -1.5 && x < grid.width + 1.5 && z < grid.height + 1.5;
    const road = x > grid.width && z > 15 && z < 19.5;
    if (insideish || road || out.some((t) => Math.hypot(t.x - x, t.z - z) < 2.1)) continue;
    const k = hash01(i * 9.1);
    out.push({
      x,
      z,
      s: 0.8 + hash01(i * 2.2) * 0.7,
      kind: k < 0.35 ? 'pine' : k < 0.5 ? 'blossom' : 'round',
    });
  }
  return out;
}
