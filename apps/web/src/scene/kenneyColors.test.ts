import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import { ROCK_TINT, WOOD_TINT } from './kenneyColors';

const hsl = (hex: string | null) => {
  if (!hex) throw new Error('no tint');
  return new Color(hex).getHSL({ h: 0, s: 0, l: 0 });
};

describe('rock and wood tints', () => {
  it('keeps rocks a low-saturation grey', () => {
    expect(hsl(ROCK_TINT('dirt')).s).toBeLessThan(0.15);
  });

  it('keeps the rock grey cool, so it never reads as warm brown wood', () => {
    const rock = new Color(ROCK_TINT('dirt') ?? '');
    expect(rock.b).toBeGreaterThan(rock.r);
    expect(hsl(WOOD_TINT('woodBark')).s).toBeGreaterThan(hsl(ROCK_TINT('dirt')).s + 0.15);
  });
});
