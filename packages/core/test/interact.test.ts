import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { selectHotbar } from '../src/systems/bag';
import { interact, resolveSecondary } from '../src/systems/interact';
import type { GameState, Tile } from '../src/types';
import { blankFarm, fresh, standAt, withBag, withTile } from './helpers';

const at = (s: GameState, minute: number): GameState => ({
  ...s,
  calendar: { ...s.calendar, minute },
});
const house = (s: GameState): GameState => ({ ...s, player: { ...s.player, location: 'house' } });
const mature: Tile = {
  kind: 'tilled',
  watered: false,
  crop: { id: 'turnip', age: 4, regrowing: false },
};

describe('interact', () => {
  it('the house door takes the player inside', () => {
    const { state, events } = interact(standAt(fresh(), 4, 5, 'n'));
    expect(state.player).toMatchObject({ location: 'house', x: 3.5, z: 3.5 });
    expect(events).toEqual([{ type: 'locationChanged', location: 'house' }]);
  });

  it('the exit door returns the player below the house door, facing south', () => {
    const { state, events } = interact(standAt(house(fresh()), 3, 4, 's'));
    expect(state.player).toMatchObject({ location: 'farm', x: 4.5, z: 5.5, facing: 's' });
    expect(events).toEqual([{ type: 'locationChanged', location: 'farm' }]);
  });

  it('opens the bin, the bed, and the cart when open', () => {
    expect(interact(standAt(fresh(), 7, 5, 'n')).events).toEqual([{ type: 'openUi', ui: 'bin' }]);
    expect(interact(standAt(house(fresh()), 6, 2, 'n')).events).toEqual([
      { type: 'openUi', ui: 'sleep' },
    ]);
    expect(interact(at(standAt(fresh(), 30, 17, 'e'), 600)).events).toEqual([
      { type: 'openUi', ui: 'cart' },
    ]);
    expect(interact(at(standAt(fresh(), 30, 17, 'e'), 400)).events).toEqual([
      { type: 'actionFailed', reason: 'cartClosed' },
    ]);
  });

  it('harvests a mature crop by hand', () => {
    const s = withTile(standAt(blankFarm(fresh()), 10, 10, 'e'), 11, 10, mature);
    expect(interact(s).events).toContainEqual({
      type: 'cropHarvested',
      x: 11,
      y: 10,
      crop: 'turnip',
    });
  });

  it('refills the can at the pond', () => {
    const s = { ...standAt(fresh(), 7, 19, 'w'), canCharges: 2 };
    const { state, events } = interact(s);
    expect(state.canCharges).toBe(20);
    expect(events).toEqual([{ type: 'canRefilled' }]);
  });

  it('nothing to interact with fails with noTarget', () => {
    expect(interact(standAt(blankFarm(fresh()), 10, 10, 'e')).events).toEqual([
      { type: 'actionFailed', reason: 'noTarget' },
    ]);
  });

  it('is wired into applyCommand', () => {
    expect(applyCommand(standAt(fresh(), 7, 5, 'n'), { type: 'interact' }).events).toEqual([
      { type: 'openUi', ui: 'bin' },
    ]);
  });
});

describe('resolveSecondary', () => {
  const seeds = (target: Tile) =>
    selectHotbar(withTile(standAt(blankFarm(fresh()), 10, 10, 'e'), 11, 10, target), 5);

  it('prefers interact facing the bin even with seeds selected', () => {
    expect(resolveSecondary(selectHotbar(standAt(fresh(), 7, 5, 'n'), 5))).toBe('interact');
  });

  it('plants facing empty tilled soil with seeds', () => {
    expect(resolveSecondary(seeds({ kind: 'tilled', watered: false }))).toBe('useItem');
  });

  it('eats facing grass with a turnip selected', () => {
    const s = withBag(standAt(blankFarm(fresh()), 10, 10, 'e'), [{ id: 'turnip', qty: 1 }]);
    expect(resolveSecondary(s)).toBe('useItem');
  });

  it('returns null facing grass with seeds', () => {
    expect(resolveSecondary(seeds({ kind: 'grass' }))).toBeNull();
  });

  it('interacts with a mature crop', () => {
    expect(resolveSecondary(seeds(mature))).toBe('interact');
  });
});
