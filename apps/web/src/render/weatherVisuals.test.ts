import { describe, expect, it } from 'vitest';
import { flashSchedule, weatherVisuals } from './weatherVisuals';

describe('weatherVisuals', () => {
  it('sunny is clear', () => {
    expect(weatherVisuals('sunny', 'high')).toEqual({
      rain: 0,
      snow: 0,
      wetness: 0,
      cloudiness: 0,
      lightning: false,
      fogDensity: 0,
    });
  });

  it('storm on high pours 9000 drops with lightning', () => {
    expect(weatherVisuals('storm', 'high')).toMatchObject({
      rain: 9000,
      lightning: true,
      wetness: 1,
    });
  });

  it('rain and snow counts match the spec per tier', () => {
    expect(weatherVisuals('rain', 'high').rain).toBe(6000);
    expect(weatherVisuals('rain', 'low').rain).toBe(2500);
    expect(weatherVisuals('storm', 'low').rain).toBe(3500);
    expect(weatherVisuals('snow', 'high').snow).toBe(3000);
    expect(weatherVisuals('snow', 'low').snow).toBe(1200);
  });

  it('low tier never draws more particles than high', () => {
    for (const w of ['sunny', 'cloudy', 'rain', 'storm', 'snow'] as const) {
      const hi = weatherVisuals(w, 'high');
      const lo = weatherVisuals(w, 'low');
      expect(lo.rain).toBeLessThanOrEqual(hi.rain);
      expect(lo.snow).toBeLessThanOrEqual(hi.snow);
    }
  });

  it('cloudy dims but stays dry', () => {
    expect(weatherVisuals('cloudy', 'high')).toMatchObject({ rain: 0, wetness: 0 });
    expect(weatherVisuals('cloudy', 'high').cloudiness).toBeGreaterThan(0);
  });
});

describe('flashSchedule', () => {
  it('spaces flashes 6–14 s apart and is seeded by the day', () => {
    const a = flashSchedule(12, 60);
    expect(a).toEqual(flashSchedule(12, 60));
    expect(a).not.toEqual(flashSchedule(13, 60));
    a.reduce((prev, t) => {
      expect(t - prev).toBeGreaterThanOrEqual(6);
      expect(t - prev).toBeLessThanOrEqual(14);
      return t;
    }, 0);
  });
});
