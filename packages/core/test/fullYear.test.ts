import { expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { CROP_IDS, CROPS } from '../src/data/crops';
import { ITEMS } from '../src/data/items';
import { tileAt } from '../src/grid';
import { selectHotbar } from '../src/systems/bag';
import type { Command, CropId, GameState, HotbarIndex } from '../src/types';
import { fresh, standAt } from './helpers';

const PLOT = Array.from({ length: 16 }, (_, i) => ({ x: 10 + (i % 4), y: 10 + Math.floor(i / 4) }));
const SLOT: Record<string, HotbarIndex> = { hoe: 0, can: 1, sickle: 2, axe: 3, hammer: 4 };

function act(s: GameState, cmd: Command): GameState {
  return applyCommand(s, cmd).state;
}

function useTool(s: GameState, tool: keyof typeof SLOT): GameState {
  return act(selectHotbar(s, SLOT[tool] ?? 0), { type: 'useTool' });
}

function plantSeed(s: GameState, crop: CropId): GameState {
  const bagIndex = s.bag.findIndex((c) => c?.id === `seed:${crop}`);
  if (bagIndex < 0) return s;
  let next = act(s, { type: 'assignQuickSlot', slot: 0, bagIndex });
  next = act(next, { type: 'selectHotbar', index: 5 });
  return act(next, { type: 'useItem' });
}

/** One scripted day on a 4x4 plot. Teleports instead of pathing: this tests rules, not walking. */
function botDay(start: GameState, plan: CropId[]): GameState {
  let s: GameState = { ...start, player: { ...start.player, location: 'farm' } };
  s = act(standAt(s, 7, 19, 'w'), { type: 'interact' });
  s = act(s, { type: 'tick', minutes: 540 - s.calendar.minute });
  PLOT.forEach(({ x, y }, i) => {
    s = standAt(s, x, y + 1, 'n');
    const crop = plan[i % plan.length];
    for (let guard = 0; guard < 6; guard++) {
      const t = tileAt(s.maps.farm, x, y);
      if (!t || s.player.stamina < 6) break;
      if (t.kind === 'weed') s = useTool(s, 'sickle');
      else if (t.kind === 'rock') s = useTool(s, 'hammer');
      else if (t.kind === 'stump') s = useTool(s, 'axe');
      else if (t.kind === 'grass') s = useTool(s, 'hoe');
      else if (t.kind === 'tilled' && t.crop && t.crop.age >= CROPS[t.crop.id].days)
        s = act(s, { type: 'interact' });
      else if (t.kind === 'tilled' && !t.crop && crop) {
        const cost = CROPS[crop].seedCost;
        if (!s.bag.some((c) => c?.id === `seed:${crop}`) && s.gold >= cost)
          s = act(s, { type: 'buyItem', itemId: `seed:${crop}`, qty: 1 });
        const before = s;
        s = plantSeed(s, crop);
        if (s === before) break;
      } else if (t.kind === 'tilled' && t.crop && !t.watered) {
        if (s.canCharges === 0) s = act(standAt(s, 7, 19, 'w'), { type: 'interact' });
        s = useTool(standAt(s, x, y + 1, 'n'), 'can');
      } else break;
    }
  });
  s.bag.forEach((cell, bagIndex) => {
    if (cell && ITEMS[cell.id].kind === 'crop')
      s = act(s, { type: 'shipItem', bagIndex, qty: cell.qty });
  });
  s = { ...s, player: { ...s.player, location: 'house', x: 3.5, z: 3.5 } };
  return act(s, { type: 'sleep' });
}

it('a scripted farmer plays Spring 1 to Year 2 Spring 1 and harvests all 8 crops', () => {
  const bySeason = (season: string) => CROP_IDS.filter((c) => CROPS[c].season === season);
  let s = fresh(11);
  while (s.calendar.year === 1) s = botDay(s, bySeason(s.calendar.season));
  expect(s.calendar).toEqual({ year: 2, season: 'spring', day: 1, minute: 360 });
  for (const c of CROP_IDS) expect(s.harvested[c] ?? 0, c).toBeGreaterThanOrEqual(1);
  expect(s.milestones).toEqual(
    expect.arrayContaining(['firstHarvest', 'firstShipment', 'allCrops', 'fullYear']),
  );
});
