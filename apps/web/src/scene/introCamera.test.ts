import { describe, expect, it } from 'vitest';
import { cameraOffset } from './cameraMath';
import { introCameraAt } from './introCamera';

const spawn = { x: 15.5, z: 22.5 };

describe('introCameraAt', () => {
  it('ends exactly at the follow camera pose behind the spawn', () => {
    const [ox, oy, oz] = cameraOffset(0, 1);
    const end = introCameraAt(1, spawn);
    expect(end.position[0]).toBeCloseTo(spawn.x + ox, 6);
    expect(end.position[1]).toBeCloseTo(0.6 + oy, 6);
    expect(end.position[2]).toBeCloseTo(spawn.z + oz, 6);
    expect(end.target).toEqual([spawn.x, 0.6, spawn.z]);
  });

  it('starts high over the hills', () => {
    const start = introCameraAt(0, spawn);
    expect(start.position[1]).toBeGreaterThan(15);
    expect(start.position[2]).toBeLessThan(0);
  });

  it('clamps t and moves continuously', () => {
    expect(introCameraAt(-1, spawn)).toEqual(introCameraAt(0, spawn));
    expect(introCameraAt(2, spawn)).toEqual(introCameraAt(1, spawn));
    for (let i = 0; i < 100; i++) {
      const a = introCameraAt(i / 100, spawn).position;
      const b = introCameraAt((i + 1) / 100, spawn).position;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(2);
    }
  });
});
