import type { GameEvent } from '@ethergrove/core';
import { describe, expect, it } from 'vitest';
import { jingleFile, jingleFor, pickTrack, type MusicInput } from './music';

const base: MusicInput = {
  screen: 'game',
  overlay: null,
  location: 'farm',
  season: 'spring',
  minute: 600,
  weather: 'sunny',
};
const pick = (patch: Partial<MusicInput>) => pickTrack({ ...base, ...patch });

describe('pickTrack', () => {
  it('plays the main theme outside the game', () => {
    expect(pickTrack(null)).toBe('title');
    for (const screen of ['title', 'slots', 'newGame', 'intro'] as const)
      expect(pick({ screen })).toBe('title');
  });

  it('plays the season by day on the farm', () => {
    expect(pick({})).toBe('spring');
    expect(pick({ season: 'winter', weather: 'snow' })).toBe('winter');
    expect(pick({ season: 'fall', weather: 'cloudy' })).toBe('fall');
  });

  it('the cart wins over everything in the game, even at night', () => {
    expect(pick({ overlay: 'cart' })).toBe('shop');
    expect(pick({ overlay: 'cart', minute: 1300 })).toBe('shop');
  });

  it('night starts at 20:00', () => {
    expect(pick({ minute: 1199 })).toBe('spring');
    expect(pick({ minute: 1200 })).toBe('night');
    expect(pick({ location: 'house', minute: 1250 })).toBe('night');
  });

  it('the house has its own tune, rain or shine', () => {
    expect(pick({ location: 'house' })).toBe('home');
    expect(pick({ location: 'house', weather: 'rain' })).toBe('home');
  });

  it('rain and storms play the rain track in every season; snow keeps the season (audio spec §4.1)', () => {
    for (const season of ['spring', 'summer', 'fall', 'winter'] as const) {
      expect(pick({ season, weather: 'rain' }), season).toBe('rain');
      expect(pick({ season, weather: 'storm' }), season).toBe('rain');
    }
    expect(pick({ season: 'winter', weather: 'snow' })).toBe('winter');
  });

  it('night, the house and the cart still win over a storm (audio plan Review Focus 1)', () => {
    expect(pick({ weather: 'storm', minute: 1260 })).toBe('night');
    expect(pick({ weather: 'storm', location: 'house' })).toBe('home');
    expect(pick({ weather: 'storm', overlay: 'cart' })).toBe('shop');
  });

  it('other overlays keep the current music', () => {
    expect(pick({ overlay: 'pause' })).toBe('spring');
    expect(pick({ overlay: 'bin', location: 'house' })).toBe('home');
  });
});

describe('jingleFor', () => {
  const ev = (type: string, extra: object = {}) => ({ type, ...extra }) as GameEvent;
  const dayStarted = ev('dayStarted', { calendar: {} });

  it('picks one jingle per batch, by priority', () => {
    expect(jingleFor([dayStarted, ev('passedOut')])).toBe('faint');
    expect(jingleFor([dayStarted, ev('seasonChanged', { season: 'summer' })])).toBe('season');
    expect(jingleFor([dayStarted])).toBe('morning');
    expect(jingleFor([ev('lessonsComplete', { gift: 100 })])).toBe('lessonsComplete');
    expect(jingleFor([ev('goldChanged', { gold: 1, delta: 1 })])).toBeNull();
    expect(jingleFor([])).toBeNull();
  });

  it('plays the new season’s own fanfare file', () => {
    expect(jingleFile('season', 'fall')).toBe('season-fall');
    expect(jingleFile('season', 'winter')).toBe('season-winter');
    expect(jingleFile('morning', 'fall')).toBe('morning');
  });
});
