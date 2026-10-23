import { BALANCE } from '../data/balance';
import type { Calendar, Season } from '../types';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'fall', 'winter'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export function advanceMinutes(cal: Calendar, minutes: number): Calendar {
  if (minutes < 0) throw new RangeError('Cannot advance time backwards');
  return { ...cal, minute: cal.minute + minutes };
}

export function nextDay(cal: Calendar): Calendar {
  const minute = BALANCE.dayStartMinute;
  if (cal.day < BALANCE.seasonDays) return { ...cal, day: cal.day + 1, minute };
  const i = SEASONS.indexOf(cal.season);
  const season = SEASONS[(i + 1) % SEASONS.length] ?? 'spring';
  return { year: season === 'spring' ? cal.year + 1 : cal.year, season, day: 1, minute };
}

/** Seasons are 28 days (4 weeks), so day 1 of every season is a Monday. */
export function weekday(cal: Calendar): Weekday {
  return WEEKDAYS[(cal.day - 1) % 7] ?? 'Mon';
}

export function formatClock(minute: number): string {
  const m = Math.floor(minute) % 1440;
  const h24 = Math.floor(m / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(m % 60).padStart(2, '0');
  return `${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export function shouldPassOut(cal: Calendar): boolean {
  return cal.minute >= BALANCE.passOutMinute;
}
