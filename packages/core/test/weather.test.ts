import { describe, expect, it } from 'vitest';
import { createNewGame } from '../src/newGame';
import { rollWeather } from '../src/systems/weather';
import type { Season, Weather } from '../src/types';

function tally(season: Season, n = 10_000): Record<Weather, number> {
  const counts: Record<Weather, number> = { sunny: 0, cloudy: 0, rain: 0, storm: 0, snow: 0 };
  let rng = 99;
  for (let i = 0; i < n; i++) {
    const [w, next] = rollWeather(season, 5, rng);
    counts[w]++;
    rng = next;
  }
  return counts;
}

describe('rollWeather', () => {
  it('day 1 is always sunny and does not consume rng', () => {
    for (const season of ['spring', 'summer', 'fall', 'winter'] as const) {
      expect(rollWeather(season, 1, 1234)).toEqual(['sunny', 1234]);
    }
  });

  it('only rolls weather valid for the season', () => {
    const spring = tally('spring');
    expect(spring.snow + spring.storm).toBe(0);
    const winter = tally('winter');
    expect(winter.rain + winter.storm).toBe(0);
    expect(tally('summer').snow).toBe(0);
  });

  it('spring rain share is within 0.27–0.33', () => {
    const share = tally('spring').rain / 10_000;
    expect(share).toBeGreaterThan(0.27);
    expect(share).toBeLessThan(0.33);
  });

  it('is deterministic for the same rng', () => {
    expect(rollWeather('summer', 9, 555)).toEqual(rollWeather('summer', 9, 555));
  });
});

describe('new game forecast', () => {
  it('rolls tomorrow for Spring 2 from the game rng', () => {
    const forecasts = new Set(
      Array.from(
        { length: 40 },
        (_, seed) => createNewGame({ seed, farmName: 'a', playerName: 'b' }).weather.tomorrow,
      ),
    );
    expect(forecasts.has('rain')).toBe(true);
    expect(forecasts.has('snow')).toBe(false);
  });
});
