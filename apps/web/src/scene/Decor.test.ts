import type { Grid } from '@ethergrove/core';
import { describe, expect, it } from 'vitest';
import { decorSpots } from './Decor';

const grid = { width: 32, height: 24 } as Grid;
const flat = (density: number) =>
  Object.entries(decorSpots(grid, density)).flatMap(([k, items]) =>
    items.map((i) => `${k}@${i.x},${i.z}`),
  );

describe('decor density per preset', () => {
  it('more density never moves a bush, only adds', () => {
    const [low, medium, high] = [flat(0.5), flat(1), flat(2)];
    expect(low.every((s) => medium.includes(s))).toBe(true);
    expect(medium.every((s) => high.includes(s))).toBe(true);
    expect(low.length).toBeLessThan(medium.length);
    expect(medium.length).toBeLessThan(high.length);
  });

  it('the farmhouse flower bed is on every preset', () => {
    for (const d of [0.5, 1, 2])
      for (const s of [
        'flowers-1@1.5,5.4',
        'flowers-2@2.6,5.5',
        'bush-flowers@8.6,3.2',
        'bush@1.4,1.6',
      ])
        expect(flat(d), `${s} at ${d}`).toContain(s);
  });

  it('density 1 matches the scatter before presets', () => {
    expect(flat(1).length).toBe(75);
  });
});
