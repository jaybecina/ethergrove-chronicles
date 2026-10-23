import { describe, expect, it } from 'vitest';
import {
  activeTool,
  addItem,
  assignQuickSlot,
  countOf,
  cycleHotbar,
  moveBagItem,
  quickItem,
  removeAt,
  selectHotbar,
} from '../src/systems/bag';
import { fresh, withBag } from './helpers';

const empty = () => Array.from({ length: 12 }, () => null);

describe('addItem', () => {
  it('splits 150 turnips into stacks of 99 and 51', () => {
    const { bag, added, overflow } = addItem(empty(), 'turnip', 150);
    expect(bag.slice(0, 3)).toEqual([{ id: 'turnip', qty: 99 }, { id: 'turnip', qty: 51 }, null]);
    expect([added, overflow]).toEqual([150, 0]);
  });

  it('tops up an existing stack before using empty slots', () => {
    const start = addItem(empty(), 'wood', 98).bag;
    const { bag } = addItem(start, 'wood', 3);
    expect(bag.slice(0, 2)).toEqual([
      { id: 'wood', qty: 99 },
      { id: 'wood', qty: 2 },
    ]);
  });

  it('reports overflow and leaves a full bag unchanged', () => {
    const full = Array.from({ length: 12 }, () => ({ id: 'stone' as const, qty: 99 }));
    const { bag, added, overflow } = addItem(full, 'turnip', 5);
    expect(bag).toEqual(full);
    expect([added, overflow]).toEqual([0, 5]);
  });

  it('does not mutate the input bag', () => {
    const start = empty();
    addItem(start, 'fiber', 1);
    expect(start).toEqual(Array.from({ length: 12 }, () => null));
  });
});

describe('removeAt and countOf', () => {
  it('removes from a stack and empties it at zero', () => {
    const bag = addItem(empty(), 'turnip', 3).bag;
    expect(removeAt(bag, 0, 2)[0]).toEqual({ id: 'turnip', qty: 1 });
    expect(removeAt(bag, 0, 3)[0]).toBeNull();
  });

  it('throws when removing more than the stack holds or from an empty slot', () => {
    const bag = addItem(empty(), 'turnip', 3).bag;
    expect(() => removeAt(bag, 0, 4)).toThrow(RangeError);
    expect(() => removeAt(bag, 5, 1)).toThrow(RangeError);
  });

  it('counts across stacks', () => {
    expect(countOf(addItem(empty(), 'turnip', 150).bag, 'turnip')).toBe(150);
    expect(countOf(empty(), 'turnip')).toBe(0);
  });
});

describe('hotbar', () => {
  it('activeTool maps slots 0..4 to tools and 5..7 to null', () => {
    const s = fresh();
    expect(activeTool(s)).toBe('hoe');
    expect(activeTool(selectHotbar(s, 4))).toBe('hammer');
    expect(activeTool(selectHotbar(s, 5))).toBeNull();
  });

  it('selecting a quick slot updates selectedQuick', () => {
    expect(selectHotbar(fresh(), 7).selectedQuick).toBe(2);
    expect(selectHotbar(selectHotbar(fresh(), 7), 1).selectedQuick).toBe(2);
  });

  it('cycleHotbar wraps both ways', () => {
    const back = cycleHotbar(fresh(), -1);
    expect(back.activeSlot).toBe(7);
    expect(back.selectedQuick).toBe(2);
    expect(cycleHotbar(back, 1).activeSlot).toBe(0);
    expect(cycleHotbar(fresh(), 1).activeSlot).toBe(1);
  });
});

describe('quick slots', () => {
  it('moveBagItem swaps cells and quick slots follow the moved indexes', () => {
    const s = moveBagItem(fresh(), 0, 3);
    expect(s.bag[3]).toEqual({ id: 'seed:turnip', qty: 6 });
    expect(s.bag[0]).toBeNull();
    expect(s.quickSlots[0]).toBe(3);
  });

  it('moveBagItem swapping two pinned cells swaps both pins', () => {
    let s = withBag(fresh(), [
      { id: 'turnip', qty: 1 },
      { id: 'wood', qty: 1 },
    ]);
    s = assignQuickSlot(assignQuickSlot(s, 0, 0), 1, 1);
    s = moveBagItem(s, 0, 1);
    expect(s.quickSlots).toEqual([1, 0, null]);
  });

  it('quickItem resolves the selected quick slot', () => {
    expect(quickItem(fresh())).toEqual({ bagIndex: 0, stack: { id: 'seed:turnip', qty: 6 } });
  });

  it('quickItem is null when the pinned bag cell was emptied (Review Focus)', () => {
    const s = fresh();
    const emptied = { ...s, bag: removeAt(s.bag, 0, 6) };
    expect(quickItem(emptied)).toBeNull();
  });

  it('quickItem is null for an unassigned slot', () => {
    expect(quickItem({ ...fresh(), selectedQuick: 1 })).toBeNull();
  });

  it('assignQuickSlot can clear a slot and rejects bad indexes', () => {
    expect(assignQuickSlot(fresh(), 0, null).quickSlots).toEqual([null, null, null]);
    expect(() => assignQuickSlot(fresh(), 0, 12)).toThrow(RangeError);
    expect(() => moveBagItem(fresh(), 0, 12)).toThrow(RangeError);
  });
});
