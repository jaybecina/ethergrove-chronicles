import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { tileAt } from '../src/grid';
import { countOf, removeAt, selectHotbar } from '../src/systems/bag';
import { cropStage, growCrops, harvestAt, killOutOfSeason } from '../src/systems/crops';
import type { CropId, GameState, Tile } from '../src/types';
import { blankFarm, fresh, standAt, withBag, withTile } from './helpers';

const tilled: Tile = { kind: 'tilled', watered: false };
const at = (s: GameState) => tileAt(s.maps.farm, 11, 10);

/** Player on (10,10) facing the tilled tile (11,10), quick slot 5 selected. */
function field(target: Tile = tilled, seed: CropId = 'turnip', qty = 5): GameState {
  let s = standAt(blankFarm(fresh()), 10, 10, 'e');
  s = withTile(s, 11, 10, target);
  s = withBag(s, [{ id: `seed:${seed}`, qty }]);
  return selectHotbar(s, 5);
}

/** Water then grow overnight n times. */
function growWatered(s: GameState, nights: number): GameState {
  let g = s.maps.farm;
  for (let i = 0; i < nights; i++) {
    const t = tileAt(g, 11, 10);
    if (!t) throw new Error('missing tile');
    const tiles = g.tiles.slice();
    tiles[10 * g.width + 11] = { ...t, watered: true };
    g = growCrops({ ...g, tiles }).grid;
  }
  return { ...s, maps: { ...s.maps, farm: g } };
}

const plant = (s: GameState) => applyCommand(s, { type: 'useItem' });

describe('planting', () => {
  it('plants a seed on empty tilled soil and consumes one seed', () => {
    const { state, events } = plant(field());
    expect(at(state)?.crop).toEqual({ id: 'turnip', age: 0, regrowing: false });
    expect(countOf(state.bag, 'seed:turnip')).toBe(4);
    expect(events).toContainEqual({ type: 'cropPlanted', x: 11, y: 10, crop: 'turnip' });
  });

  it('rejects out-of-season seeds without consuming them', () => {
    const { state, events } = plant(field(tilled, 'tomato'));
    expect(events).toEqual([{ type: 'actionFailed', reason: 'wrongSeason' }]);
    expect(countOf(state.bag, 'seed:tomato')).toBe(5);
  });

  it('rejects grass and occupied soil', () => {
    expect(plant(field({ kind: 'grass' })).events).toEqual([
      { type: 'actionFailed', reason: 'noTarget' },
    ]);
    const occupied = plant(plant(field()).state);
    expect(occupied.events).toEqual([{ type: 'actionFailed', reason: 'noTarget' }]);
  });
});

describe('growth', () => {
  it('turnip goes seed → sprout → young → mature at ages 0, 1, 2, 4', () => {
    const s = plant(field()).state;
    const stageAfter = (n: number) => {
      const crop = at(growWatered(s, n))?.crop;
      if (!crop) throw new Error('no crop');
      return cropStage(crop);
    };
    expect([stageAfter(0), stageAfter(1), stageAfter(2), stageAfter(3), stageAfter(4)]).toEqual([
      'seed',
      'sprout',
      'young',
      'young',
      'mature',
    ]);
  });

  it('does not grow on an unwatered night', () => {
    const s = plant(field()).state;
    expect(at({ ...s, maps: { ...s.maps, farm: growCrops(s.maps.farm).grid } })?.crop?.age).toBe(0);
  });

  it('emits cropGrew only when the stage changes', () => {
    const s = growWatered(plant(field()).state, 2);
    const t = at(s);
    if (!t) throw new Error();
    const g = withTile(s, 11, 10, { ...t, watered: true }).maps.farm;
    expect(growCrops(g).events).toEqual([]);
  });
});

describe('harvest', () => {
  it('harvests a mature turnip with the sickle and leaves tilled soil', () => {
    let s = growWatered(plant(field()).state, 4);
    s = selectHotbar(s, 2);
    const { state, events } = applyCommand(s, { type: 'useTool' });
    expect(at(state)).toEqual({ kind: 'tilled', watered: true });
    expect(countOf(state.bag, 'turnip')).toBe(1);
    expect(state.harvested.turnip).toBe(1);
    expect(state.player.stamina).toBe(99);
    expect(events).toContainEqual({ type: 'cropHarvested', x: 11, y: 10, crop: 'turnip' });
  });

  it('sickle on an immature crop is a miss', () => {
    const s = selectHotbar(plant(field()).state, 2);
    const { state, events } = applyCommand(s, { type: 'useTool' });
    expect(at(state)?.crop?.age).toBe(0);
    expect(events).toContainEqual({ type: 'toolUsed', tool: 'sickle', x: 11, y: 10, hit: false });
  });

  it('strawberry regrows: young after harvest, mature again after 4 watered nights', () => {
    const s = growWatered(plant(field(tilled, 'strawberry')).state, 8);
    const h = harvestAt(s, 11, 10).state;
    const crop = at(h)?.crop;
    expect(crop).toEqual({ id: 'strawberry', age: 4, regrowing: true });
    expect(crop && cropStage(crop)).toBe('young');
    const again = at(growWatered(h, 4))?.crop;
    expect(again && cropStage(again)).toBe('mature');
    const three = at(growWatered(h, 3))?.crop;
    expect(three && cropStage(three)).toBe('young');
  });

  it('tomato regrows in 3 nights', () => {
    const summer = (s: GameState): GameState => ({
      ...s,
      calendar: { ...s.calendar, season: 'summer' },
    });
    const s = growWatered(plant(summer(field(tilled, 'tomato'))).state, 9);
    const h = harvestAt(s, 11, 10).state;
    const crop = at(growWatered(h, 3))?.crop;
    expect(crop && cropStage(crop)).toBe('mature');
  });

  it('a full bag blocks harvest and keeps the crop', () => {
    const s = growWatered(plant(field()).state, 4);
    const full = withBag(
      s,
      Array.from({ length: 12 }, () => ({ id: 'stone' as const, qty: 99 })),
    );
    const { state, events } = harvestAt(full, 11, 10);
    expect(events).toEqual([{ type: 'actionFailed', reason: 'bagFull' }]);
    expect(at(state)?.crop?.age).toBe(4);
  });

  it('harvestAt on an immature crop fails with noTarget', () => {
    expect(harvestAt(plant(field()).state, 11, 10).events).toEqual([
      { type: 'actionFailed', reason: 'noTarget' },
    ]);
  });
});

describe('eating', () => {
  it('eating a melon at 90 stamina caps at 100', () => {
    let s = withBag(fresh(), [{ id: 'melon', qty: 2 }]);
    s = selectHotbar({ ...s, player: { ...s.player, stamina: 90 } }, 5);
    const { state, events } = applyCommand(s, { type: 'useItem' });
    expect(state.player.stamina).toBe(100);
    expect(countOf(state.bag, 'melon')).toBe(1);
    expect(events).toContainEqual({ type: 'itemEaten', item: 'melon', stamina: 10 });
  });

  it('materials cannot be used', () => {
    const s = selectHotbar(withBag(fresh(), [{ id: 'wood', qty: 2 }]), 5);
    expect(applyCommand(s, { type: 'useItem' }).events).toEqual([
      { type: 'actionFailed', reason: 'noTarget' },
    ]);
  });

  it('an emptied quick slot fails with noItem and changes nothing (Review Focus)', () => {
    const s0 = field();
    const s = { ...s0, bag: removeAt(s0.bag, 0, 5) };
    const result = applyCommand(s, { type: 'useItem' });
    expect(result.events).toEqual([{ type: 'actionFailed', reason: 'noItem' }]);
    expect(result.state).toEqual(s);
  });
});

describe('seasons', () => {
  it('killOutOfSeason removes a turnip in summer but keeps the tile tilled', () => {
    const s = plant(field({ kind: 'tilled', watered: true })).state;
    const { grid, events } = killOutOfSeason(s.maps.farm, 'summer');
    expect(tileAt(grid, 11, 10)).toEqual({ kind: 'tilled', watered: true });
    expect(events).toEqual([{ type: 'cropDied', x: 11, y: 10, crop: 'turnip' }]);
    expect(killOutOfSeason(s.maps.farm, 'spring').events).toEqual([]);
  });
});
