import { describe, expect, it } from 'vitest';
import { FARM_LAYOUT } from '../src/data/layouts';
import { isBlocked, tileAt } from '../src/grid';
import { createNewGame } from '../src/newGame';

const opts = { seed: 1, farmName: 'Elm', playerName: 'Ari' };

function fieldCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  FARM_LAYOUT.forEach((row, y) => {
    Array.from(row).forEach((ch, x) => {
      if (ch === '.') cells.push({ x, y });
    });
  });
  return cells;
}

describe('createNewGame', () => {
  it('starts at Year 1 Spring 1 6:00 with 500 gold and 6 turnip seeds in bag[0] pinned to quick slot 0', () => {
    const s = createNewGame(opts);
    expect(s.calendar).toEqual({ year: 1, season: 'spring', day: 1, minute: 360 });
    expect(s.gold).toBe(500);
    expect(s.pendingGold).toBe(0);
    expect(s.bag[0]).toEqual({ id: 'seed:turnip', qty: 6 });
    expect(s.bag).toHaveLength(12);
    expect(s.bag.slice(1).every((c) => c === null)).toBe(true);
    expect(s.quickSlots).toEqual([0, null, null]);
    expect(s.weather.today).toBe('sunny');
    expect(s.player).toMatchObject({ location: 'farm', stamina: 100 });
    expect(s.canCharges).toBe(20);
    expect(s.activeSlot).toBe(0);
    expect(s.milestones).toEqual([]);
    expect(s.farmName).toBe('Elm');
    expect(s.playerName).toBe('Ari');
    expect(s.version).toBe(1);
  });

  it('field obstacles are seeded: same seed same map, different seed different map', () => {
    expect(createNewGame(opts).maps.farm).toEqual(createNewGame(opts).maps.farm);
    expect(createNewGame({ ...opts, seed: 2 }).maps.farm).not.toEqual(
      createNewGame(opts).maps.farm,
    );
  });

  it('obstacle share in field cells is near spec for seed 1', () => {
    const farm = createNewGame(opts).maps.farm;
    const cells = fieldCells();
    const share = (kind: string) =>
      cells.filter(({ x, y }) => tileAt(farm, x, y)?.kind === kind).length / cells.length;
    expect(share('weed')).toBeGreaterThanOrEqual(0.25);
    expect(share('weed')).toBeLessThanOrEqual(0.35);
    expect(share('rock')).toBeGreaterThanOrEqual(0.07);
    expect(share('rock')).toBeLessThanOrEqual(0.13);
    expect(share('stump')).toBeGreaterThanOrEqual(0.03);
    expect(share('stump')).toBeLessThanOrEqual(0.07);
  });

  it('player spawn tile is not blocked', () => {
    const s = createNewGame(opts);
    expect(isBlocked(tileAt(s.maps.farm, Math.floor(s.player.x), Math.floor(s.player.z)))).toBe(
      false,
    );
  });
});
