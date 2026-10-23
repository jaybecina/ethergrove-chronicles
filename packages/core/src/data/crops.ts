import type { CropId, Season } from '../types';

export interface CropDef {
  season: Season;
  seedCost: number;
  days: number;
  regrow: number | null;
  sell: number;
  eat: number;
}

export const CROP_IDS: readonly CropId[] = [
  'turnip',
  'potato',
  'strawberry',
  'tomato',
  'corn',
  'melon',
  'pumpkin',
  'eggplant',
];

export const CROPS: Record<CropId, CropDef> = {
  turnip: { season: 'spring', seedCost: 20, days: 4, regrow: null, sell: 35, eat: 8 },
  potato: { season: 'spring', seedCost: 50, days: 7, regrow: null, sell: 80, eat: 12 },
  strawberry: { season: 'spring', seedCost: 100, days: 8, regrow: 4, sell: 60, eat: 10 },
  tomato: { season: 'summer', seedCost: 50, days: 9, regrow: 3, sell: 60, eat: 10 },
  corn: { season: 'summer', seedCost: 150, days: 12, regrow: 4, sell: 50, eat: 12 },
  melon: { season: 'summer', seedCost: 80, days: 11, regrow: null, sell: 250, eat: 20 },
  pumpkin: { season: 'fall', seedCost: 100, days: 13, regrow: null, sell: 320, eat: 20 },
  eggplant: { season: 'fall', seedCost: 20, days: 9, regrow: 4, sell: 60, eat: 10 },
};
