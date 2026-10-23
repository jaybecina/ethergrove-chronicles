import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { selectHotbar } from '../src/systems/bag';
import type { GameState } from '../src/types';
import { blankFarm, fresh, standAt, withBag, withTile } from './helpers';

describe('quick slot pins follow items, not positions (review finding 6)', () => {
  it('planting the last seed clears its pin, so a later harvest in that slot is never eaten by mistake', () => {
    let s: GameState = standAt(blankFarm(fresh()), 10, 10, 'e');
    s = withTile(s, 11, 10, { kind: 'tilled', watered: false });
    s = selectHotbar(withBag(s, [{ id: 'seed:turnip', qty: 1 }]), 5);
    s = applyCommand(s, { type: 'useItem' }).state;
    expect(s.bag[0]).toBeNull();
    expect(s.quickSlots[0]).toBeNull();
    s = withBag(s, [{ id: 'turnip', qty: 1 }]);
    const r = applyCommand(s, { type: 'useItem' });
    expect(r.events).toEqual([{ type: 'actionFailed', reason: 'noItem' }]);
  });

  it('shipping a whole pinned stack clears the pin', () => {
    const s = withBag(fresh(), [{ id: 'turnip', qty: 2 }]);
    const r = applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 2 });
    expect(r.state.quickSlots[0]).toBeNull();
  });

  it('pins stay when the stack still has items', () => {
    const s = withBag(fresh(), [{ id: 'turnip', qty: 2 }]);
    expect(applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 1 }).state.quickSlots[0]).toBe(0);
  });
});

describe('eating at full stamina (review finding 6)', () => {
  it('is refused and keeps the food', () => {
    const s = selectHotbar(withBag(fresh(), [{ id: 'melon', qty: 1 }]), 5);
    const r = applyCommand(s, { type: 'useItem' });
    expect(r.events).toEqual([{ type: 'actionFailed', reason: 'notHungry' }]);
    expect(r.state.bag[0]).toEqual({ id: 'melon', qty: 1 });
  });
});
