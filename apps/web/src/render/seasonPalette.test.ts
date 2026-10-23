import { describe, expect, it } from 'vitest';
import { paletteFor } from './seasonPalette';

describe('paletteFor', () => {
  it('snow ramps in during winter day 1 and stays', () => {
    const day1 = paletteFor('winter', 1).snowCover;
    expect(day1).toBeGreaterThan(0);
    expect(day1).toBeLessThan(1);
    expect(paletteFor('winter', 1, 360).snowCover).toBe(0);
    expect(paletteFor('winter', 1, 1440).snowCover).toBe(1);
    expect(paletteFor('winter', 2).snowCover).toBe(1);
    expect(paletteFor('winter', 28).snowCover).toBe(1);
  });

  it('no snow outside winter', () => {
    for (const s of ['spring', 'summer', 'fall'] as const)
      expect(paletteFor(s, 10).snowCover).toBe(0);
  });

  it('each season has its own grass colour', () => {
    const colours = new Set(
      (['spring', 'summer', 'fall', 'winter'] as const).map((s) => paletteFor(s, 5).grass),
    );
    expect(colours.size).toBe(4);
  });

  it('fall foliage is warm (red channel above green)', () => {
    const f = paletteFor('fall', 10).foliage;
    expect(parseInt(f.slice(1, 3), 16)).toBeGreaterThan(parseInt(f.slice(3, 5), 16));
  });

  it('only spring has blossoms; winter trees are bare', () => {
    expect(paletteFor('spring', 3).blossom).toBe(true);
    expect(paletteFor('summer', 3).blossom).toBe(false);
    expect(paletteFor('winter', 3).bareTrees).toBe(true);
    expect(paletteFor('fall', 3).bareTrees).toBe(false);
  });
});
