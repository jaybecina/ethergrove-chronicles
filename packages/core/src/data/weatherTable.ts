import type { Season, Weather } from '../types';

/** Weighted picks per season (spec §3.9); weights sum to 1. */
export const WEATHER_TABLE: Record<Season, [Weather, number][]> = {
  spring: [
    ['sunny', 0.5],
    ['cloudy', 0.2],
    ['rain', 0.3],
  ],
  summer: [
    ['sunny', 0.55],
    ['cloudy', 0.15],
    ['rain', 0.15],
    ['storm', 0.15],
  ],
  fall: [
    ['sunny', 0.5],
    ['cloudy', 0.25],
    ['rain', 0.25],
  ],
  winter: [
    ['sunny', 0.35],
    ['cloudy', 0.25],
    ['snow', 0.4],
  ],
};
