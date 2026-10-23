import type { CropId, ItemId, SeedId } from '../types';
import { CROP_IDS, CROPS } from './crops';

export interface ItemDef {
  kind: 'seed' | 'crop' | 'material';
  sell: number | null;
  eat: number | null;
}

export const seedOf = (crop: CropId): SeedId => `seed:${crop}`;

export function cropOfSeed(id: ItemId): CropId | null {
  return id.startsWith('seed:') ? (id.slice(5) as CropId) : null;
}

export const ITEMS = {
  fiber: { kind: 'material', sell: 1, eat: null },
  wood: { kind: 'material', sell: 2, eat: null },
  stone: { kind: 'material', sell: 2, eat: null },
  ...Object.fromEntries(
    CROP_IDS.flatMap((c) => [
      [c, { kind: 'crop', sell: CROPS[c].sell, eat: CROPS[c].eat }],
      [seedOf(c), { kind: 'seed', sell: null, eat: null }],
    ]),
  ),
} as Record<ItemId, ItemDef>;
