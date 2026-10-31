import type { Weather } from '@ethergrove/core';
import type { QualityTier } from './quality';

export interface WeatherVisuals {
  rain: number;
  snow: number;
  /** 1 = soaked: lower roughness, puddles. */
  wetness: number;
  /** Dims the sun and greys the sky. */
  cloudiness: number;
  lightning: boolean;
  /** 0 = default fog, 1 = thick. */
  fogDensity: number;
}

const COUNTS = {
  rain: { high: 6000, medium: 2500, low: 1200 },
  storm: { high: 9000, medium: 3500, low: 1800 },
  snow: { high: 3000, medium: 1200, low: 600 },
} as const;

export function weatherVisuals(weather: Weather, tier: QualityTier): WeatherVisuals {
  switch (weather) {
    case 'sunny':
      return { rain: 0, snow: 0, wetness: 0, cloudiness: 0, lightning: false, fogDensity: 0 };
    case 'cloudy':
      return { rain: 0, snow: 0, wetness: 0, cloudiness: 0.45, lightning: false, fogDensity: 0.2 };
    case 'rain':
      return {
        rain: COUNTS.rain[tier],
        snow: 0,
        wetness: 1,
        cloudiness: 0.65,
        lightning: false,
        fogDensity: 0.45,
      };
    case 'storm':
      return {
        rain: COUNTS.storm[tier],
        snow: 0,
        wetness: 1,
        cloudiness: 0.85,
        lightning: true,
        fogDensity: 0.6,
      };
    case 'snow':
      return {
        rain: 0,
        snow: COUNTS.snow[tier],
        wetness: 0,
        cloudiness: 0.5,
        lightning: false,
        fogDensity: 0.4,
      };
  }
}

/** Seconds (from the start of a storm scene) at which lightning flashes; seeded by day number. */
export function flashSchedule(daySeed: number, untilSec: number): number[] {
  const out: number[] = [];
  let t = 0;
  let k = 0;
  while (t < untilSec) {
    const r = Math.sin((daySeed + 1) * 12.9898 + k++ * 78.233) * 43758.5453;
    t += 6 + (r - Math.floor(r)) * 8;
    out.push(t);
  }
  return out;
}
