import { afterEach, describe, expect, it } from 'vitest';
import { QUALITY } from './quality';
import {
  NONE_OFF,
  PROFILE_SWITCHES,
  parseProfileOff,
  profileOff,
  profiledTier,
  setProfileOff,
} from './profileSwitches';

afterEach(() => {
  setProfileOff(NONE_OFF);
});

describe('frame-rate profile switches', () => {
  it('lists every cost the profile turns off (spec §7.3)', () => {
    expect(PROFILE_SWITCHES).toEqual(['dpr', 'ao', 'shadows', 'grass', 'particles', 'post']);
  });

  it('turns nothing off without a perf-off parameter', () => {
    expect(parseProfileOff('')).toEqual(NONE_OFF);
    expect(parseProfileOff('?seed=4')).toEqual(NONE_OFF);
  });

  it('reads a comma-separated list and ignores unknown names', () => {
    expect(parseProfileOff('?perf-off=ao,grass,lasers')).toEqual({
      ...NONE_OFF,
      ao: true,
      grass: true,
    });
  });

  it('accepts "all"', () => {
    expect(Object.values(parseProfileOff('?perf-off=all')).every(Boolean)).toBe(true);
  });

  it('keeps the tier settings when nothing is off', () => {
    expect(profiledTier(QUALITY.high, NONE_OFF)).toEqual(QUALITY.high);
  });

  it('caps the pixel ratio at 1 and drops the AO pass when those are off', () => {
    const off = parseProfileOff('?perf-off=dpr,ao');
    expect(profiledTier(QUALITY.high, off)).toEqual({ ...QUALITY.high, dprMax: 1, ao: false });
  });

  it('is shared through setProfileOff', () => {
    setProfileOff(parseProfileOff('?perf-off=shadows'));
    expect(profileOff().shadows).toBe(true);
    expect(profileOff().grass).toBe(false);
  });
});
