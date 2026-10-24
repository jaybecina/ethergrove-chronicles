import { LESSON_ORDER, NOTE_IDS } from '../data/lessons';
import { z } from 'zod';
import { BALANCE } from '../data/balance';
import { CROP_IDS } from '../data/crops';
import type { CropId, GameState, ItemId, SeedId } from '../types';

const cropId = z.enum(CROP_IDS as [CropId, ...CropId[]]);
const seedIds = CROP_IDS.map((c): SeedId => `seed:${c}`);
const ITEM_IDS: ItemId[] = ['fiber', 'wood', 'stone', ...CROP_IDS, ...seedIds];
const itemId = z.enum(ITEM_IDS as [ItemId, ...ItemId[]]);
const int = z.number().int();
const nonNeg = int.nonnegative();

const stack = z.object({ id: itemId, qty: int.min(1).max(BALANCE.stackMax) });

const tile = z.object({
  kind: z.enum([
    'grass',
    'path',
    'weed',
    'rock',
    'stump',
    'tilled',
    'water',
    'building',
    'fence',
    'wall',
    'floor',
    'feature',
  ]),
  feature: z.enum(['houseDoor', 'exitDoor', 'bin', 'bed', 'cart']).exactOptional(),
  hits: nonNeg.exactOptional(),
  watered: z.boolean().exactOptional(),
  crop: z.object({ id: cropId, age: nonNeg, regrowing: z.boolean() }).exactOptional(),
});

const grid = z
  .object({ width: int.positive(), height: int.positive(), tiles: z.array(tile) })
  .refine((g) => g.tiles.length === g.width * g.height, 'tiles must fill the grid');

const season = z.enum(['spring', 'summer', 'fall', 'winter']);
const weather = z.enum(['sunny', 'cloudy', 'rain', 'storm', 'snow']);
const bagIndex = int
  .min(0)
  .max(BALANCE.bagSlots - 1)
  .nullable();

export const calendarSchema = z.object({
  year: int.min(1),
  season,
  day: int.min(1).max(BALANCE.seasonDays),
  minute: nonNeg.max(BALANCE.passOutMinute),
});

export const gameStateSchema: z.ZodType<GameState> = z.object({
  version: z.literal(2),
  seed: int,
  rng: int,
  farmName: z.string(),
  playerName: z.string(),
  calendar: calendarSchema,
  weather: z.object({ today: weather, tomorrow: weather }),
  player: z.object({
    location: z.enum(['farm', 'house']),
    x: z.number(),
    z: z.number(),
    facing: z.enum(['n', 's', 'e', 'w']),
    stamina: z.number().min(0).max(BALANCE.maxStamina),
  }),
  canCharges: nonNeg.max(BALANCE.canCharges),
  activeSlot: z.literal([0, 1, 2, 3, 4, 5, 6, 7]),
  selectedQuick: z.literal([0, 1, 2]),
  quickSlots: z.tuple([bagIndex, bagIndex, bagIndex]),
  bag: z.array(stack.nullable()).length(BALANCE.bagSlots),
  bin: z.array(z.object({ id: itemId, qty: int.min(1) })),
  gold: nonNeg,
  pendingGold: nonNeg,
  wakeHalfStamina: z.boolean(),
  maps: z.object({ farm: grid, house: grid }),
  milestones: z.array(
    z.enum([
      'firstTill',
      'firstPlant',
      'firstHarvest',
      'firstShipment',
      'gold1k',
      'gold10k',
      'allCrops',
      'fullYear',
    ]),
  ),
  harvested: z.partialRecord(cropId, nonNeg),
  tutorial: z.object({
    lesson: z.enum([...LESSON_ORDER, 'complete', 'off']),
    count: int.min(0),
    notesSeen: z.array(z.enum(NOTE_IDS)),
  }),
});

export const saveFileSchema = z.object({
  version: int,
  savedAt: z.string(),
  playTimeMs: nonNeg,
  summary: z.object({
    farmName: z.string(),
    playerName: z.string(),
    calendar: calendarSchema,
    gold: nonNeg,
  }),
  state: gameStateSchema,
});
