import { BALANCE } from '../data/balance';
import { CROPS } from '../data/crops';
import { ITEMS, cropOfSeed } from '../data/items';
import { setTile, tileAt } from '../grid';
import { currentGrid, withGrid } from '../state';
import type {
  CropId,
  CropState,
  GameEvent,
  GameState,
  Grid,
  Result,
  Season,
  SeedId,
} from '../types';
import { addItem, quickItem, removeAt } from './bag';
import { targetTile } from './movement';

export type CropStage = 'seed' | 'sprout' | 'young' | 'mature';

export const isMature = (crop: CropState): boolean => crop.age >= CROPS[crop.id].days;

export function cropStage(crop: CropState): CropStage {
  const { days } = CROPS[crop.id];
  if (isMature(crop)) return 'mature';
  if (crop.regrowing) return 'young';
  if (crop.age === 0) return 'seed';
  return crop.age < days / 3 ? 'sprout' : 'young';
}

const fail = (
  state: GameState,
  reason: 'noTarget' | 'wrongSeason' | 'bagFull' | 'noItem',
): Result => ({
  state,
  events: [{ type: 'actionFailed', reason }],
});

export function plantAt(state: GameState, x: number, y: number, seed: SeedId): Result {
  const tile = tileAt(currentGrid(state), x, y);
  const crop = cropOfSeed(seed);
  if (!crop || tile?.kind !== 'tilled' || tile.crop) return fail(state, 'noTarget');
  if (CROPS[crop].season !== state.calendar.season) return fail(state, 'wrongSeason');
  const grid = setTile(currentGrid(state), x, y, {
    ...tile,
    crop: { id: crop, age: 0, regrowing: false },
  });
  return { state: withGrid(state, grid), events: [{ type: 'cropPlanted', x, y, crop }] };
}

export function harvestAt(state: GameState, x: number, y: number): Result {
  const tile = tileAt(currentGrid(state), x, y);
  const crop = tile?.crop;
  if (!tile || !crop || !isMature(crop)) return fail(state, 'noTarget');
  const { bag, overflow } = addItem(state.bag, crop.id, 1);
  if (overflow > 0) return fail(state, 'bagFull');
  const def = CROPS[crop.id];
  const { crop: _gone, ...soil } = tile;
  const next =
    def.regrow === null
      ? soil
      : { ...tile, crop: { id: crop.id, age: def.days - def.regrow, regrowing: true } };
  const harvested = { ...state.harvested, [crop.id]: (state.harvested[crop.id] ?? 0) + 1 };
  return {
    state: { ...withGrid(state, setTile(currentGrid(state), x, y, next)), bag, harvested },
    events: [
      { type: 'cropHarvested', x, y, crop: crop.id },
      { type: 'itemGained', item: crop.id, qty: 1 },
    ],
  };
}

export function growCrops(grid: Grid): { grid: Grid; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const tiles = grid.tiles.map((t, i) => {
    if (!t.crop || !t.watered) return t;
    const crop = { ...t.crop, age: t.crop.age + 1 };
    if (cropStage(crop) !== cropStage(t.crop))
      events.push({
        type: 'cropGrew',
        x: i % grid.width,
        y: Math.floor(i / grid.width),
        crop: crop.id,
      });
    return { ...t, crop };
  });
  return { grid: { ...grid, tiles }, events };
}

export function killOutOfSeason(grid: Grid, season: Season): { grid: Grid; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const tiles = grid.tiles.map((t, i) => {
    if (!t.crop || CROPS[t.crop.id].season === season) return t;
    events.push({
      type: 'cropDied',
      x: i % grid.width,
      y: Math.floor(i / grid.width),
      crop: t.crop.id,
    });
    const { crop: _dead, ...soil } = t;
    return soil;
  });
  return { grid: { ...grid, tiles }, events };
}

export function useItem(state: GameState): Result {
  const q = quickItem(state);
  if (!q) return fail(state, 'noItem');
  const { id } = q.stack;
  const def = ITEMS[id];
  if (def.kind === 'seed') {
    const { x, y } = targetTile(state.player);
    const planted = plantAt(state, x, y, id as SeedId);
    if (planted.events[0]?.type !== 'cropPlanted') return planted;
    return { ...planted, state: { ...planted.state, bag: removeAt(state.bag, q.bagIndex, 1) } };
  }
  if (def.eat !== null) {
    const stamina = Math.min(BALANCE.maxStamina, state.player.stamina + def.eat);
    const gained = stamina - state.player.stamina;
    return {
      state: {
        ...state,
        bag: removeAt(state.bag, q.bagIndex, 1),
        player: { ...state.player, stamina },
      },
      events: [{ type: 'itemEaten', item: id as CropId, stamina: gained }],
    };
  }
  return fail(state, 'noTarget');
}
