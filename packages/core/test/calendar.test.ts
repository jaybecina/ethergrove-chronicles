import { describe, expect, it } from 'vitest';
import {
  advanceMinutes,
  formatClock,
  nextDay,
  shouldPassOut,
  weekday,
} from '../src/systems/calendar';

describe('nextDay', () => {
  it('rolls Spring 28 into Summer 1 at 6:00', () => {
    expect(nextDay({ year: 1, season: 'spring', day: 28, minute: 900 })).toEqual({
      year: 1,
      season: 'summer',
      day: 1,
      minute: 360,
    });
  });

  it('rolls Winter 28 into Year 2 Spring 1', () => {
    expect(nextDay({ year: 1, season: 'winter', day: 28, minute: 1500 })).toEqual({
      year: 2,
      season: 'spring',
      day: 1,
      minute: 360,
    });
  });

  it('advances a normal day', () => {
    expect(nextDay({ year: 1, season: 'fall', day: 3, minute: 1200 })).toEqual({
      year: 1,
      season: 'fall',
      day: 4,
      minute: 360,
    });
  });
});

describe('weekday', () => {
  it('Spring 1 and Spring 8 are Monday; Summer 1 is Monday', () => {
    expect(weekday({ year: 1, season: 'spring', day: 1, minute: 360 })).toBe('Mon');
    expect(weekday({ year: 1, season: 'spring', day: 8, minute: 360 })).toBe('Mon');
    expect(weekday({ year: 1, season: 'summer', day: 1, minute: 360 })).toBe('Mon');
    expect(weekday({ year: 1, season: 'spring', day: 7, minute: 360 })).toBe('Sun');
  });
});

describe('formatClock', () => {
  it.each([
    [360, '6:00 AM'],
    [780, '1:00 PM'],
    [1500, '1:00 AM'],
    [0, '12:00 AM'],
    [720, '12:00 PM'],
    [1445, '12:05 AM'],
    [545, '9:05 AM'],
  ])('%i → %s', (minute, text) => {
    expect(formatClock(minute)).toBe(text);
  });
});

describe('time', () => {
  it('shouldPassOut at 1560 but not 1559', () => {
    expect(shouldPassOut({ year: 1, season: 'spring', day: 1, minute: 1559 })).toBe(false);
    expect(shouldPassOut({ year: 1, season: 'spring', day: 1, minute: 1560 })).toBe(true);
  });

  it('advanceMinutes adds minutes without rolling the day', () => {
    expect(advanceMinutes({ year: 1, season: 'spring', day: 1, minute: 1430 }, 20)).toEqual({
      year: 1,
      season: 'spring',
      day: 1,
      minute: 1450,
    });
  });

  it('advanceMinutes rejects negative input', () => {
    expect(() => advanceMinutes({ year: 1, season: 'spring', day: 1, minute: 360 }, -1)).toThrow(
      RangeError,
    );
  });
});
