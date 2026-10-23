import fc from 'fast-check';
import { CROP_IDS } from '../src/data/crops';
import type { Command, HotbarIndex } from '../src/types';

const bagIndex = fc.integer({ min: 0, max: 11 });

export const arbCommand: fc.Arbitrary<Command> = fc.oneof(
  {
    weight: 30,
    arbitrary: fc.record({
      type: fc.constant('move' as const),
      dx: fc.double({ min: -1, max: 1, noNaN: true }),
      dz: fc.double({ min: -1, max: 1, noNaN: true }),
      dtMs: fc.constant(50),
    }),
  },
  { weight: 12, arbitrary: fc.constant({ type: 'useTool' as const }) },
  { weight: 8, arbitrary: fc.constant({ type: 'useItem' as const }) },
  { weight: 8, arbitrary: fc.constant({ type: 'interact' as const }) },
  {
    weight: 10,
    arbitrary: fc.record({
      type: fc.constant('tick' as const),
      minutes: fc.integer({ min: 1, max: 30 }),
    }),
  },
  { weight: 2, arbitrary: fc.constant({ type: 'sleep' as const }) },
  {
    weight: 6,
    arbitrary: fc.record({
      type: fc.constant('selectHotbar' as const),
      index: fc.integer({ min: 0, max: 7 }).map((i) => i as HotbarIndex),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      type: fc.constant('cycleHotbar' as const),
      dir: fc.constantFrom(1 as const, -1 as const),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      type: fc.constant('buyItem' as const),
      itemId: fc.constantFrom(...CROP_IDS.map((c) => `seed:${c}` as const)),
      qty: fc.integer({ min: 1, max: 5 }),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      type: fc.constant('shipItem' as const),
      bagIndex,
      qty: fc.integer({ min: 1, max: 3 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      type: fc.constant('unshipItem' as const),
      binIndex: fc.integer({ min: 0, max: 3 }),
      qty: fc.integer({ min: 1, max: 3 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      type: fc.constant('moveBagItem' as const),
      from: bagIndex,
      to: bagIndex,
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      type: fc.constant('assignQuickSlot' as const),
      slot: fc.constantFrom(0 as const, 1 as const, 2 as const),
      bagIndex: fc.option(bagIndex, { nil: null }),
    }),
  },
);
