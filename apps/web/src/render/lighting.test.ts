import { describe, expect, it } from 'vitest';
import { nightFactor, sunAt, sunDirection } from './lighting';

describe('sunAt', () => {
  it('the sun is higher at noon than at 6:40', () => {
    expect(sunAt(720).elevationDeg).toBeGreaterThan(sunAt(400).elevationDeg);
  });

  it('night stays playable (intensity ≥ 0.15)', () => {
    for (const m of [1300, 1440, 1500, 1559, 0, 200])
      expect(sunAt(m).intensity).toBeGreaterThanOrEqual(0.15);
  });

  it('changes smoothly: < 0.02 intensity per minute', () => {
    for (let m = 0; m < 1560; m++) {
      expect(Math.abs(sunAt(m + 1).intensity - sunAt(m).intensity)).toBeLessThan(0.02);
    }
  });

  it('returns hex colours', () => {
    const s = sunAt(1080);
    for (const c of [s.color, s.skyTop, s.skyBottom]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('sunset light is warmer than noon light', () => {
    const red = (hex: string) => parseInt(hex.slice(1, 3), 16);
    const blue = (hex: string) => parseInt(hex.slice(5, 7), 16);
    const sunset = sunAt(1080).color;
    expect(red(sunset) - blue(sunset)).toBeGreaterThan(
      red(sunAt(720).color) - blue(sunAt(720).color),
    );
  });

  it('nightFactor is 0 at noon and 1 deep at night', () => {
    expect(nightFactor(720)).toBe(0);
    expect(nightFactor(1440)).toBe(1);
    expect(nightFactor(1150)).toBeGreaterThan(0);
    expect(nightFactor(1150)).toBeLessThan(1);
  });

  it('sunDirection points up for positive elevation and is unit length', () => {
    const [x, y, z] = sunDirection(sunAt(720));
    expect(y).toBeGreaterThan(0.8);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
  });
});
