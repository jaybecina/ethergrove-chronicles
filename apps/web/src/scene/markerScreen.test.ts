import { describe, expect, it } from 'vitest';
import { edgePoint } from './markerScreen';

const view = { w: 800, h: 600 };

describe('edgePoint', () => {
  it('clamps to the right edge for a point far right', () => {
    expect(edgePoint({ x: 5000, y: 300 }, view, 24)).toMatchObject({ x: 776, y: 300, angle: 0 });
  });

  it('clamps to the bottom edge first when that is nearer along the ray', () => {
    const p = edgePoint({ x: 5000, y: 5000 }, view, 24);
    expect(p.y).toBeCloseTo(576, 6);
    expect(p.x).toBeGreaterThan(400);
    expect(p.x).toBeLessThanOrEqual(776);
    expect(p.angle).toBeCloseTo(Math.atan2(4700, 4600), 6);
  });

  it('handles the left and top edges', () => {
    expect(edgePoint({ x: -900, y: 300 }, view, 24)).toMatchObject({ x: 24, y: 300 });
    expect(edgePoint({ x: 400, y: -900 }, view, 24)).toMatchObject({ x: 400, y: 24 });
  });

  it('flips points behind the camera', () => {
    const p = edgePoint({ x: 5000, y: 300 }, view, 24, true);
    expect(p).toMatchObject({ x: 24, y: 300 });
    expect(Math.abs(p.angle)).toBeCloseTo(Math.PI, 6);
  });

  it('returns the centre for a point at the centre', () => {
    expect(edgePoint({ x: 400, y: 300 }, view, 24)).toEqual({ x: 400, y: 300, angle: 0 });
  });
});
