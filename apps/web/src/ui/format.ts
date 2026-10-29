import type { Calendar } from '@ethergrove/core';

export const gold = new Intl.NumberFormat('en-US');

export const SEASON_NAME = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
} as const;

export function playTime(ms: number): string {
  const total = Math.floor(ms / 60_000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${m} min played` : `${m} min played`;
}

export function dateLine(c: Calendar): string {
  return `Year ${c.year}, ${SEASON_NAME[c.season]} ${c.day}`;
}
