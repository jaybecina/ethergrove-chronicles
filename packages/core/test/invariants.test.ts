import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { isBlocked, tileAt } from '../src/grid';
import type { Command, GameState } from '../src/types';
import { arbCommand } from './arbitraries';
import { fresh } from './helpers';

function run(seed: number, cmds: Command[], check?: (s: GameState) => void): GameState {
  let s = fresh(seed);
  for (const cmd of cmds) {
    s = applyCommand(s, cmd).state;
    check?.(s);
  }
  return s;
}

function assertInvariants(s: GameState): void {
  expect(s.gold).toBeGreaterThanOrEqual(0);
  expect(s.player.stamina).toBeGreaterThanOrEqual(0);
  expect(s.player.stamina).toBeLessThanOrEqual(100);
  expect(s.canCharges).toBeGreaterThanOrEqual(0);
  expect(s.canCharges).toBeLessThanOrEqual(20);
  expect(s.bag).toHaveLength(12);
  for (const cell of s.bag) {
    if (cell) {
      expect(cell.qty).toBeGreaterThanOrEqual(1);
      expect(cell.qty).toBeLessThanOrEqual(99);
    }
  }
  expect([s.maps.farm.width, s.maps.farm.height, s.maps.farm.tiles.length]).toEqual([32, 24, 768]);
  expect([s.maps.house.width, s.maps.house.height, s.maps.house.tiles.length]).toEqual([8, 6, 48]);
  expect(s.calendar.minute).toBeGreaterThanOrEqual(360);
  expect(s.calendar.minute).toBeLessThan(1560);
  expect(s.calendar.day).toBeGreaterThanOrEqual(1);
  expect(s.calendar.day).toBeLessThanOrEqual(28);
  const here = tileAt(s.maps[s.player.location], Math.floor(s.player.x), Math.floor(s.player.z));
  expect(isBlocked(here)).toBe(false);
}

describe('invariants under random play', () => {
  it('holds for random command sequences', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.array(arbCommand, { maxLength: 200 }),
        (seed, cmds) => {
          run(seed, cmds, assertInvariants);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('determinism', () => {
  it('same seed and commands give equal states', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.array(arbCommand, { maxLength: 200 }),
        (seed, cmds) => {
          expect(run(seed, cmds)).toEqual(run(seed, cmds));
        },
      ),
      { numRuns: 50 },
    );
  });
});
