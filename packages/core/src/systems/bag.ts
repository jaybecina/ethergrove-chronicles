import { BALANCE, TOOL_ORDER } from '../data/balance';
import type { GameState, HotbarIndex, ItemId, ItemStack, ToolId } from '../types';

type Bag = (ItemStack | null)[];

const checkIndex = (bag: Bag, i: number): void => {
  if (!Number.isInteger(i) || i < 0 || i >= bag.length) throw new RangeError(`Bad bag index ${i}`);
};

export function addItem(
  bag: Bag,
  id: ItemId,
  qty: number,
): { bag: Bag; added: number; overflow: number } {
  const next = bag.slice();
  let left = qty;
  for (let i = 0; i < next.length && left > 0; i++) {
    const cell = next[i];
    if (cell?.id !== id || cell.qty >= BALANCE.stackMax) continue;
    const put = Math.min(left, BALANCE.stackMax - cell.qty);
    next[i] = { id, qty: cell.qty + put };
    left -= put;
  }
  for (let i = 0; i < next.length && left > 0; i++) {
    if (next[i] !== null) continue;
    const put = Math.min(left, BALANCE.stackMax);
    next[i] = { id, qty: put };
    left -= put;
  }
  if (left > 0) return { bag, added: 0, overflow: qty };
  return { bag: next, added: qty, overflow: 0 };
}

export function removeAt(bag: Bag, index: number, qty: number): Bag {
  checkIndex(bag, index);
  const cell = bag[index];
  if (!cell || qty > cell.qty) throw new RangeError(`Cannot remove ${qty} from slot ${index}`);
  const next = bag.slice();
  next[index] = cell.qty === qty ? null : { id: cell.id, qty: cell.qty - qty };
  return next;
}

export function countOf(bag: Bag, id: ItemId): number {
  return bag.reduce((n, c) => (c?.id === id ? n + c.qty : n), 0);
}

export function quickItem(state: GameState): { bagIndex: number; stack: ItemStack } | null {
  const bagIndex = state.quickSlots[state.selectedQuick];
  if (bagIndex === null) return null;
  const stack = state.bag[bagIndex];
  return stack ? { bagIndex, stack } : null;
}

export function activeTool(state: GameState): ToolId | null {
  return TOOL_ORDER[state.activeSlot] ?? null;
}

export function selectHotbar(state: GameState, index: HotbarIndex): GameState {
  const selectedQuick = index >= 5 ? ((index - 5) as 0 | 1 | 2) : state.selectedQuick;
  return { ...state, activeSlot: index, selectedQuick };
}

export function cycleHotbar(state: GameState, dir: 1 | -1): GameState {
  return selectHotbar(state, ((state.activeSlot + dir + 8) % 8) as HotbarIndex);
}

export function moveBagItem(state: GameState, from: number, to: number): GameState {
  checkIndex(state.bag, from);
  checkIndex(state.bag, to);
  const bag = state.bag.slice();
  [bag[from], bag[to]] = [bag[to] ?? null, bag[from] ?? null];
  const follow = (q: number | null) => (q === from ? to : q === to ? from : q);
  const [a, b, c] = state.quickSlots;
  return { ...state, bag, quickSlots: [follow(a), follow(b), follow(c)] };
}

export function assignQuickSlot(
  state: GameState,
  slot: 0 | 1 | 2,
  bagIndex: number | null,
): GameState {
  if (bagIndex !== null) checkIndex(state.bag, bagIndex);
  const quickSlots: GameState['quickSlots'] = [...state.quickSlots];
  quickSlots[slot] = bagIndex;
  return { ...state, quickSlots };
}
