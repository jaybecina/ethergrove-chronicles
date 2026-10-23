import { describe, expect, it } from 'vitest';
import {
  CAMERA_PITCH_DEG,
  ZOOM_DISTANCES,
  cameraOffset,
  offsetAt,
  tileToWorld,
} from './cameraMath';

describe('camera math', () => {
  it('pitches at 50° at every zoom step', () => {
    expect(CAMERA_PITCH_DEG).toBe(50);
    for (const zoom of [0, 1, 2] as const) {
      const [x, y, z] = cameraOffset(0, zoom);
      expect(y / Math.hypot(x, z)).toBeCloseTo(Math.tan((50 * Math.PI) / 180), 6);
      expect(Math.hypot(x, y, z)).toBeCloseTo(ZOOM_DISTANCES[zoom], 6);
    }
  });

  it('sits south of the player at yaw 0', () => {
    const [x, , z] = cameraOffset(0, 1);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeGreaterThan(0);
  });

  it('yaw 1 is yaw 0 rotated 90° about Y', () => {
    const [x0, y0, z0] = cameraOffset(0, 1);
    const [x1, y1, z1] = cameraOffset(1, 1);
    expect(x1).toBeCloseTo(z0, 6);
    expect(y1).toBeCloseTo(y0, 6);
    expect(z1).toBeCloseTo(-x0, 6);
  });

  it('offsetAt matches cameraOffset at whole steps', () => {
    const a = offsetAt(Math.PI, ZOOM_DISTANCES[2]);
    const b = cameraOffset(2, 2);
    a.forEach((v, i) => {
      expect(v).toBeCloseTo(b[i] ?? NaN, 9);
    });
  });

  it('maps tile (3,4) to the centre of that tile', () => {
    expect(tileToWorld(3, 4)).toEqual([3.5, 0, 4.5]);
  });
});
