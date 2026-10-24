import { describe, expect, it } from 'vitest';
import { FACING_YAW, followMotion, type Motion } from './motion';

/** Drive followMotion at 60 fps while the core moves in 50 ms steps, like the real loop. */
function simulate(
  vx: number,
  vz: number,
  seconds: number,
  start: Motion = { x: 0, z: 0, speed: 0, yaw: 0 },
) {
  let m = start;
  let core = { x: start.x, z: start.z };
  let acc = 0;
  const frame = 1 / 60;
  const speeds: number[] = [];
  for (let t = 0; t < seconds; t += frame) {
    acc += frame;
    while (acc >= 0.05) {
      acc -= 0.05;
      core = { x: core.x + vx * 0.05, z: core.z + vz * 0.05 };
    }
    m = followMotion(m, { ...core, facing: 's' }, frame);
    speeds.push(m.speed);
  }
  return { m, speeds };
}

describe('followMotion', () => {
  it('settles on the walking speed without jitter between 50 ms core steps', () => {
    const { m, speeds } = simulate(2.6, 0, 3);
    expect(m.speed).toBeGreaterThan(2.3);
    expect(m.speed).toBeLessThan(2.9);
    const tail = speeds.slice(-60);
    expect(Math.max(...tail) - Math.min(...tail)).toBeLessThan(0.6);
  });

  it('reaches running speed when the core runs', () => {
    expect(simulate(4.6, 0, 3).m.speed).toBeGreaterThan(4.1);
  });

  it('turns to the real movement direction, including diagonals', () => {
    const d = 2.6 * Math.SQRT1_2;
    const { m } = simulate(d, d, 2);
    expect(m.yaw).toBeCloseTo(Math.PI / 4, 1);
  });

  it('eases to a stop and then faces the core facing', () => {
    const moving = simulate(2.6, 0, 2).m;
    let m = moving;
    for (let i = 0; i < 120; i++)
      m = followMotion(m, { x: moving.x, z: moving.z, facing: 'n' }, 1 / 60);
    expect(m.speed).toBeLessThan(0.3);
    expect(
      Math.abs(Math.atan2(Math.sin(m.yaw - FACING_YAW.n), Math.cos(m.yaw - FACING_YAW.n))),
    ).toBeLessThan(0.1);
  });

  it('snaps on teleports instead of sliding across the map', () => {
    const m = followMotion({ x: 0, z: 0, speed: 0, yaw: 0 }, { x: 10, z: 0, facing: 'e' }, 1 / 60);
    expect(m).toEqual({ x: 10, z: 0, speed: 0, yaw: FACING_YAW.e });
  });
});
