import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { tileAt } from '../src/grid';
import { countOf, selectHotbar } from '../src/systems/bag';
import type { GameState, Tile, ToolId } from '../src/types';
import { TOOL_ORDER } from '../src/data/balance';
import { blankFarm, fresh, standAt, withBag, withTile } from './helpers';

/** Player on (10,10) facing east; target tile is (11,10). */
function setup(tool: ToolId, target: Tile = { kind: 'grass' }, patch: Partial<GameState> = {}) {
  let s = standAt(blankFarm(fresh()), 10, 10, 'e');
  s = selectHotbar(s, TOOL_ORDER.indexOf(tool) as 0 | 1 | 2 | 3 | 4);
  s = withTile(s, 11, 10, target);
  return { ...s, ...patch };
}
const use = (s: GameState) => applyCommand(s, { type: 'useTool' });
const target = (s: GameState) => tileAt(s.maps.farm, 11, 10);
const fullBag = (s: GameState) =>
  withBag(
    s,
    Array.from({ length: 12 }, () => ({ id: 'stone' as const, qty: 99 })),
  );

describe('hoe', () => {
  it('tills grass and costs 2 stamina', () => {
    const { state, events } = use(setup('hoe'));
    expect(target(state)).toEqual({ kind: 'tilled', watered: false });
    expect(state.player.stamina).toBe(98);
    expect(events).toContainEqual({ type: 'toolUsed', tool: 'hoe', x: 11, y: 10, hit: true });
    expect(events).toContainEqual({ type: 'tileTilled', x: 11, y: 10 });
  });

  it('misses on a rock: costs stamina, tile unchanged', () => {
    const { state, events } = use(setup('hoe', { kind: 'rock', hits: 0 }));
    expect(target(state)).toEqual({ kind: 'rock', hits: 0 });
    expect(state.player.stamina).toBe(98);
    expect(events).toContainEqual({ type: 'toolUsed', tool: 'hoe', x: 11, y: 10, hit: false });
  });
});

describe('watering can', () => {
  it('waters tilled soil and uses one charge', () => {
    const { state, events } = use(setup('can', { kind: 'tilled', watered: false }));
    expect(target(state)).toEqual({ kind: 'tilled', watered: true });
    expect(state.canCharges).toBe(19);
    expect(state.player.stamina).toBe(98);
    expect(events).toContainEqual({ type: 'cropWatered', x: 11, y: 10 });
  });

  it('fails with canEmpty at 0 charges and costs no stamina', () => {
    const { state, events } = use(
      setup('can', { kind: 'tilled', watered: false }, { canCharges: 0 }),
    );
    expect(events).toEqual([{ type: 'actionFailed', reason: 'canEmpty' }]);
    expect(state.player.stamina).toBe(100);
  });

  it('refills at the pond for free', () => {
    let s = setup('can', { kind: 'grass' }, { canCharges: 3 });
    s = standAt(s, 7, 19, 'w');
    const { state, events } = use(s);
    expect(state.canCharges).toBe(20);
    expect(state.player.stamina).toBe(100);
    expect(events).toContainEqual({ type: 'canRefilled' });
  });
});

describe('sickle, axe, hammer', () => {
  it('sickle cuts a weed into grass + 1 fiber for 1 stamina', () => {
    const { state, events } = use(setup('sickle', { kind: 'weed' }));
    expect(target(state)).toEqual({ kind: 'grass' });
    expect(countOf(state.bag, 'fiber')).toBe(1);
    expect(state.player.stamina).toBe(99);
    expect(events).toContainEqual({ type: 'tileCleared', x: 11, y: 10 });
    expect(events).toContainEqual({ type: 'itemGained', item: 'fiber', qty: 1 });
  });

  it('axe needs 3 hits on a stump and gives 4 wood', () => {
    let s = setup('axe', { kind: 'stump', hits: 0 });
    s = use(s).state;
    expect(target(s)).toEqual({ kind: 'stump', hits: 1 });
    s = use(use(s).state).state;
    expect(target(s)).toEqual({ kind: 'grass' });
    expect(countOf(s.bag, 'wood')).toBe(4);
    expect(s.player.stamina).toBe(88);
  });

  it('hammer breaks a rock in 2 hits for 2 stone', () => {
    const s = use(use(setup('hammer', { kind: 'rock', hits: 0 })).state).state;
    expect(target(s)).toEqual({ kind: 'grass' });
    expect(countOf(s.bag, 'stone')).toBe(2);
  });

  it('hammer turns empty tilled soil back to grass', () => {
    expect(target(use(setup('hammer', { kind: 'tilled', watered: true })).state)).toEqual({
      kind: 'grass',
    });
  });

  it('a full bag blocks the final hit and keeps the weed', () => {
    const s = fullBag(setup('sickle', { kind: 'weed' }));
    const { state, events } = use(s);
    expect(events).toContainEqual({ type: 'actionFailed', reason: 'bagFull' });
    expect(target(state)).toEqual({ kind: 'weed' });
  });
});

describe('stamina', () => {
  it('reaching 0 emits exhausted', () => {
    const s = setup('axe', { kind: 'stump', hits: 0 });
    const { state, events } = use({ ...s, player: { ...s.player, stamina: 1 } });
    expect(state.player.stamina).toBe(0);
    expect(events).toContainEqual({ type: 'exhausted' });
  });

  it('at 0 stamina tools fail with noStamina and change nothing', () => {
    const s = setup('hoe');
    const tired = { ...s, player: { ...s.player, stamina: 0 } };
    const { state, events } = use(tired);
    expect(events).toEqual([{ type: 'actionFailed', reason: 'noStamina' }]);
    expect(state).toEqual(tired);
  });

  it('crossing 20 emits staminaLow once', () => {
    const s = setup('hoe');
    const first = use({ ...s, player: { ...s.player, stamina: 21 } });
    expect(first.events).toContainEqual({ type: 'staminaLow' });
    const second = use(withTile(first.state, 11, 10, { kind: 'grass' }));
    expect(second.events).not.toContainEqual({ type: 'staminaLow' });
  });
});

describe('dispatcher', () => {
  it('tick advances the clock', () => {
    expect(applyCommand(fresh(), { type: 'tick', minutes: 15 }).state.calendar.minute).toBe(375);
  });

  it('move delegates to movement', () => {
    const s = standAt(blankFarm(fresh()), 10, 10, 'n');
    expect(applyCommand(s, { type: 'move', dx: 1, dz: 0, dtMs: 250 }).state.player.x).toBeCloseTo(
      11.15,
    );
    expect(
      applyCommand(s, { type: 'move', dx: 1, dz: 0, dtMs: 250, run: true }).state.player.x,
    ).toBeCloseTo(11.65);
  });

  it('hotbar and bag commands', () => {
    expect(applyCommand(fresh(), { type: 'selectHotbar', index: 3 }).state.activeSlot).toBe(3);
    expect(applyCommand(fresh(), { type: 'cycleHotbar', dir: -1 }).state.activeSlot).toBe(7);
    expect(applyCommand(fresh(), { type: 'moveBagItem', from: 0, to: 2 }).state.quickSlots[0]).toBe(
      2,
    );
    expect(
      applyCommand(fresh(), { type: 'assignQuickSlot', slot: 1, bagIndex: 0 }).state.quickSlots,
    ).toEqual([0, 0, null]);
  });

  it('useTool with a quick slot active does nothing', () => {
    const s = selectHotbar(fresh(), 5);
    expect(applyCommand(s, { type: 'useTool' })).toEqual({ state: s, events: [] });
  });
});
