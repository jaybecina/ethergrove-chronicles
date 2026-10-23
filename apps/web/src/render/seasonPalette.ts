import type { Season } from '@hearthvale/core';

export interface SeasonPalette {
  grass: string;
  grassTip: string;
  foliage: string;
  ground: string;
  grade: { saturation: number; warmth: number };
  blossom: boolean;
  bareTrees: boolean;
  /** 0..1 white cover on upward-facing surfaces. */
  snowCover: number;
}

const BASE: Record<Season, Omit<SeasonPalette, 'snowCover'>> = {
  spring: {
    grass: '#74a94c',
    grassTip: '#b4d974',
    foliage: '#6faa45',
    ground: '#c8a56c',
    grade: { saturation: 0.12, warmth: 0.02 },
    blossom: true,
    bareTrees: false,
  },
  summer: {
    grass: '#5a9a42',
    grassTip: '#9cc65e',
    foliage: '#3f8a2e',
    ground: '#c9a265',
    grade: { saturation: 0.1, warmth: 0.05 },
    blossom: false,
    bareTrees: false,
  },
  fall: {
    grass: '#9b9a48',
    grassTip: '#d8ac4e',
    foliage: '#d36b2a',
    ground: '#b98f5b',
    grade: { saturation: 0.14, warmth: 0.12 },
    blossom: false,
    bareTrees: false,
  },
  winter: {
    grass: '#8ea38f',
    grassTip: '#d2ddd6',
    foliage: '#6d6a62',
    ground: '#b9ab98',
    grade: { saturation: -0.08, warmth: -0.08 },
    blossom: false,
    bareTrees: true,
  },
};

/** Season look. During winter day 1 the snow builds up over the day (minute 360 → 1440). */
export function paletteFor(season: Season, dayOfSeason: number, minute?: number): SeasonPalette {
  let snowCover = 0;
  if (season === 'winter') {
    snowCover =
      dayOfSeason > 1
        ? 1
        : minute === undefined
          ? 0.5
          : Math.min(1, Math.max(0, (minute - 360) / 1080));
  }
  return { ...BASE[season], snowCover };
}
