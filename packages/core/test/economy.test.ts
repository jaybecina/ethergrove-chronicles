import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { countOf } from '../src/systems/bag';
import { cartStock, isCartOpen, sellBin, sellPrice } from '../src/systems/economy';
import type { GameState, Season, Weather } from '../src/types';
import { fresh, withBag } from './helpers';

const at = (
  s: GameState,
  minute: number,
  season: Season = 'spring',
  weather: Weather = 'sunny',
) => ({
  ...s,
  calendar: { ...s.calendar, minute, season },
  weather: { ...s.weather, today: weather },
});
const shop = (s: GameState) => at(s, 600);

describe('shipping bin', () => {
  it('ships, unships, and sells the rest', () => {
    let s = withBag(fresh(), [{ id: 'turnip', qty: 12 }]);
    s = applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 10 }).state;
    expect(s.bin).toEqual([{ id: 'turnip', qty: 10 }]);
    expect(countOf(s.bag, 'turnip')).toBe(2);
    s = applyCommand(s, { type: 'unshipItem', binIndex: 0, qty: 4 }).state;
    expect(s.bin).toEqual([{ id: 'turnip', qty: 6 }]);
    expect(countOf(s.bag, 'turnip')).toBe(6);
    const sold = sellBin(s);
    expect(sold.total).toBe(210);
    expect(sold.items).toEqual([{ id: 'turnip', qty: 6 }]);
    expect(sold.state.bin).toEqual([]);
    expect(sold.state.pendingGold).toBe(210);
    expect(sold.state.gold).toBe(500);
  });

  it('merges repeat shipments of the same item', () => {
    let s = withBag(fresh(), [{ id: 'wood', qty: 5 }]);
    s = applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 2 }).state;
    s = applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 3 }).state;
    expect(s.bin).toEqual([{ id: 'wood', qty: 5 }]);
    expect(s.bag[0]).toBeNull();
  });

  it('seeds are not sellable', () => {
    expect(sellPrice('seed:turnip')).toBeNull();
    expect(applyCommand(fresh(), { type: 'shipItem', bagIndex: 0, qty: 1 }).events).toEqual([
      { type: 'actionFailed', reason: 'notSellable' },
    ]);
  });

  it('shipping more than held or from an empty slot fails with noItem', () => {
    const s = withBag(fresh(), [{ id: 'turnip', qty: 1 }]);
    expect(applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 2 }).events).toEqual([
      { type: 'actionFailed', reason: 'noItem' },
    ]);
    expect(applyCommand(s, { type: 'shipItem', bagIndex: 4, qty: 1 }).events).toEqual([
      { type: 'actionFailed', reason: 'noItem' },
    ]);
    expect(applyCommand(s, { type: 'unshipItem', binIndex: 0, qty: 1 }).events).toEqual([
      { type: 'actionFailed', reason: 'noItem' },
    ]);
  });

  it('unshipping into a full bag fails and keeps the bin', () => {
    let s = withBag(fresh(), [{ id: 'turnip', qty: 3 }]);
    s = applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 3 }).state;
    s = withBag(
      s,
      Array.from({ length: 12 }, () => ({ id: 'stone' as const, qty: 99 })),
    );
    const r = applyCommand(s, { type: 'unshipItem', binIndex: 0, qty: 3 });
    expect(r.events).toEqual([{ type: 'actionFailed', reason: 'bagFull' }]);
    expect(r.state.bin).toEqual([{ id: 'turnip', qty: 3 }]);
  });
});

describe('merchant cart', () => {
  it('is open 9:00 to before 17:00', () => {
    expect(isCartOpen(at(fresh(), 539))).toBe(false);
    expect(isCartOpen(at(fresh(), 540))).toBe(true);
    expect(isCartOpen(at(fresh(), 1019))).toBe(true);
    expect(isCartOpen(at(fresh(), 1020))).toBe(false);
  });

  it('is closed in winter and in storms', () => {
    expect(isCartOpen(at(fresh(), 600, 'winter'))).toBe(false);
    expect(isCartOpen(at(fresh(), 600, 'summer', 'storm'))).toBe(false);
    expect(isCartOpen(at(fresh(), 600, 'summer', 'rain'))).toBe(true);
  });

  it('stocks only current-season seeds', () => {
    expect(cartStock(at(fresh(), 600, 'summer'))).toEqual([
      'seed:tomato',
      'seed:corn',
      'seed:melon',
    ]);
    expect(cartStock(at(fresh(), 600, 'fall'))).toEqual(['seed:pumpkin', 'seed:eggplant']);
  });

  it('buys 5 potato seeds with exactly 250 gold', () => {
    const s = { ...shop(fresh()), gold: 250 };
    const { state, events } = applyCommand(s, { type: 'buyItem', itemId: 'seed:potato', qty: 5 });
    expect(state.gold).toBe(0);
    expect(countOf(state.bag, 'seed:potato')).toBe(5);
    expect(events).toContainEqual({ type: 'goldChanged', gold: 0, delta: -250 });
  });

  it('rejects when 1 gold short and changes nothing', () => {
    const s = { ...shop(fresh()), gold: 249 };
    const r = applyCommand(s, { type: 'buyItem', itemId: 'seed:potato', qty: 5 });
    expect(r.events).toEqual([{ type: 'actionFailed', reason: 'notEnoughGold' }]);
    expect(r.state).toEqual(s);
  });

  it('rejects closed hours, off-season seeds, and a full bag', () => {
    expect(
      applyCommand(at(fresh(), 400), { type: 'buyItem', itemId: 'seed:turnip', qty: 1 }).events,
    ).toEqual([{ type: 'actionFailed', reason: 'cartClosed' }]);
    expect(
      applyCommand(shop(fresh()), { type: 'buyItem', itemId: 'seed:corn', qty: 1 }).events,
    ).toEqual([{ type: 'actionFailed', reason: 'wrongSeason' }]);
    const full = withBag(
      shop(fresh()),
      Array.from({ length: 12 }, () => ({ id: 'stone' as const, qty: 99 })),
    );
    const r = applyCommand(full, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
    expect(r.events).toEqual([{ type: 'actionFailed', reason: 'bagFull' }]);
    expect(r.state.gold).toBe(500);
  });

  it('rejects non-positive or fractional quantities', () => {
    expect(() =>
      applyCommand(shop(fresh()), { type: 'buyItem', itemId: 'seed:turnip', qty: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      applyCommand(shop(fresh()), { type: 'buyItem', itemId: 'seed:turnip', qty: 1.5 }),
    ).toThrow(RangeError);
  });
});
