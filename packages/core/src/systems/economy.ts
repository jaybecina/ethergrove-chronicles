import { BALANCE } from '../data/balance';
import { CROP_IDS, CROPS } from '../data/crops';
import { ITEMS, cropOfSeed, seedOf } from '../data/items';
import type { FailReason, GameState, ItemId, ItemStack, Result, SeedId } from '../types';
import { addItem, removeAt } from './bag';

const fail = (state: GameState, reason: FailReason): Result => ({
  state,
  events: [{ type: 'actionFailed', reason }],
});

export const sellPrice = (id: ItemId): number | null => ITEMS[id].sell;

export function shipItem(state: GameState, bagIndex: number, qty: number): Result {
  const stack = state.bag[bagIndex];
  if (!stack || qty < 1 || qty > stack.qty) return fail(state, 'noItem');
  if (sellPrice(stack.id) === null) return fail(state, 'notSellable');
  const i = state.bin.findIndex((s) => s.id === stack.id);
  const bin =
    i < 0
      ? [...state.bin, { id: stack.id, qty }]
      : state.bin.map((s, j) => (j === i ? { id: s.id, qty: s.qty + qty } : s));
  return { state: { ...state, bag: removeAt(state.bag, bagIndex, qty), bin }, events: [] };
}

export function unshipItem(state: GameState, binIndex: number, qty: number): Result {
  const stack = state.bin[binIndex];
  if (!stack || qty < 1 || qty > stack.qty) return fail(state, 'noItem');
  const { bag, overflow } = addItem(state.bag, stack.id, qty);
  if (overflow > 0) return fail(state, 'bagFull');
  const bin =
    stack.qty === qty
      ? state.bin.filter((_, j) => j !== binIndex)
      : state.bin.map((s, j) => (j === binIndex ? { id: s.id, qty: s.qty - qty } : s));
  return { state: { ...state, bag, bin }, events: [] };
}

export function sellBin(state: GameState): { state: GameState; total: number; items: ItemStack[] } {
  const total = state.bin.reduce((sum, s) => sum + (sellPrice(s.id) ?? 0) * s.qty, 0);
  return {
    state: { ...state, bin: [], pendingGold: state.pendingGold + total },
    total,
    items: state.bin,
  };
}

export function isCartOpen(state: GameState): boolean {
  const { minute, season } = state.calendar;
  return (
    season !== 'winter' &&
    state.weather.today !== 'storm' &&
    minute >= BALANCE.cartOpen &&
    minute < BALANCE.cartClose
  );
}

export function cartStock(state: GameState): SeedId[] {
  return CROP_IDS.filter((c) => CROPS[c].season === state.calendar.season).map(seedOf);
}

export function buyItem(state: GameState, itemId: SeedId, qty: number): Result {
  if (!Number.isInteger(qty) || qty < 1) throw new RangeError(`Bad quantity ${qty}`);
  if (!isCartOpen(state)) return fail(state, 'cartClosed');
  if (!cartStock(state).includes(itemId)) return fail(state, 'wrongSeason');
  const crop = cropOfSeed(itemId);
  const cost = crop ? CROPS[crop].seedCost * qty : Infinity;
  if (cost > state.gold) return fail(state, 'notEnoughGold');
  const { bag, overflow } = addItem(state.bag, itemId, qty);
  if (overflow > 0) return fail(state, 'bagFull');
  const gold = state.gold - cost;
  return {
    state: { ...state, bag, gold },
    events: [
      { type: 'goldChanged', gold, delta: -cost },
      { type: 'itemGained', item: itemId, qty },
    ],
  };
}
