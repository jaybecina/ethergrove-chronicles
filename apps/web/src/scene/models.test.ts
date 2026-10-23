import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { extractParts, fitTransform } from './models';

describe('fitTransform', () => {
  const box = new Box3(new Vector3(-1, 2, -3), new Vector3(3, 6, 1)); // 4 × 4 × 4, base at y = 2

  it('scales to a target height and stands the model on y = 0, centred', () => {
    const t = fitTransform(box, { height: 1 });
    expect(t.scale).toBeCloseTo(0.25);
    expect(t.offset.toArray()).toEqual([-1, -2, 1]);
  });

  it('scales to a target width using the larger footprint side', () => {
    expect(
      fitTransform(new Box3(new Vector3(0, 0, 0), new Vector3(2, 9, 1)), { width: 1 }).scale,
    ).toBeCloseTo(0.5);
  });
});

describe('extractParts', () => {
  it('bakes node transforms into one geometry per mesh and reports the bounds', () => {
    const root = new Group();
    const a = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ name: 'Bark' }));
    a.position.set(0, 0.5, 0);
    const b = new Mesh(new BoxGeometry(2, 2, 2), new MeshStandardMaterial({ name: 'Leaves' }));
    b.position.set(0, 2, 0);
    root.add(a, b);
    const { parts, box } = extractParts(root);
    expect(parts.map((p) => p.material.name)).toEqual(['Bark', 'Leaves']);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(3);
  });
});
