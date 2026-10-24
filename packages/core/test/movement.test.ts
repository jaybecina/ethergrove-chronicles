import { describe, expect, it } from 'vitest';
import { stepMovement, targetTile } from '../src/systems/movement';
import { blankFarm, fresh, standAt } from './helpers';

const open = () => standAt(blankFarm(fresh()), 10, 10, 'n');

describe('stepMovement', () => {
  it('walks 2.6 tiles east in 1000 ms on open ground', () => {
    const s = stepMovement(open(), 1, 0, 1000);
    expect(s.player.x).toBeCloseTo(13.1, 9);
    expect(s.player.z).toBeCloseTo(10.5, 9);
    expect(s.player.facing).toBe('e');
  });

  it('moves at 60% speed when exhausted', () => {
    const tired = { ...open(), player: { ...open().player, stamina: 0 } };
    expect(stepMovement(tired, 1, 0, 1000).player.x).toBeCloseTo(12.06, 9);
  });

  it('runs 4.6 tiles in 1000 ms when run is held', () => {
    expect(stepMovement(open(), 1, 0, 1000, true).player.x).toBeCloseTo(15.1, 9);
  });

  it('cannot run when exhausted: stays at the tired walk', () => {
    const tired = { ...open(), player: { ...open().player, stamina: 0 } };
    expect(stepMovement(tired, 1, 0, 1000, true).player.x).toBeCloseTo(12.06, 9);
  });

  it('half stick tilt walks at half speed (analog)', () => {
    expect(stepMovement(open(), 0.5, 0, 1000).player.x).toBeCloseTo(11.8, 9);
  });

  it('stops at the fence minus the player radius', () => {
    const s = stepMovement(standAt(blankFarm(fresh()), 29, 10, 'n'), 1, 0, 1000);
    expect(s.player.x).toBeCloseTo(30.7, 6);
  });

  it('stops against a fence when moving west and north too', () => {
    const w = stepMovement(standAt(blankFarm(fresh()), 2, 10, 'n'), -1, 0, 1000);
    expect(w.player.x).toBeCloseTo(1.3, 6);
    const n = stepMovement(standAt(blankFarm(fresh()), 20, 1, 'n'), 0, -1, 1000);
    expect(n.player.z).toBeCloseTo(1.3, 6);
  });

  it('normalizes diagonal input', () => {
    const s = stepMovement(open(), 1, 1, 1000);
    const dist = Math.hypot(s.player.x - 10.5, s.player.z - 10.5);
    expect(dist).toBeCloseTo(2.6, 6);
  });

  it('slides along a wall on the free axis', () => {
    const s = stepMovement(standAt(blankFarm(fresh()), 29, 10, 'n'), 1, 1, 1000);
    expect(s.player.x).toBeCloseTo(30.7, 6);
    expect(s.player.z).toBeCloseTo(10.5 + 2.6 * Math.SQRT1_2, 6);
  });

  it('ignores tiny input: no move and no facing change', () => {
    const s = stepMovement(open(), 0.05, 0, 1000);
    expect(s.player).toEqual(open().player);
  });

  it('cannot pass through a single-tile wall even in one long step', () => {
    const s = stepMovement(standAt(blankFarm(fresh()), 10, 19, 'n'), 0, 1, 5000);
    expect(s.player.z).toBeLessThan(22.8);
    expect(s.player.z).toBeCloseTo(22.7, 6);
  });

  it('uses the facing of the dominant axis', () => {
    expect(stepMovement(open(), 0.3, -0.9, 50).player.facing).toBe('n');
    expect(stepMovement(open(), -0.9, 0.3, 50).player.facing).toBe('w');
    expect(stepMovement(open(), 0, 0.5, 50).player.facing).toBe('s');
  });
});

describe('targetTile', () => {
  it.each([
    ['n', { x: 10, y: 9 }],
    ['s', { x: 10, y: 11 }],
    ['e', { x: 11, y: 10 }],
    ['w', { x: 9, y: 10 }],
  ] as const)('facing %s', (facing, expected) => {
    expect(targetTile(standAt(fresh(), 10, 10, facing).player)).toEqual(expected);
  });
});
