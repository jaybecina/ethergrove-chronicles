import { useLayoutEffect, useRef } from 'react';
import { Color, Object3D, type BufferGeometry, type InstancedMesh, type Material } from 'three';

export interface InstanceItem {
  x: number;
  y: number;
  z: number;
  rotY?: number;
  scale?: number | [number, number, number];
  color?: string;
  /** Optional owner id (e.g. tile index) for per-item animation. */
  id?: number;
}

const dummy = new Object3D();
const tint = new Color();

interface Props {
  items: readonly InstanceItem[];
  geometry: BufferGeometry;
  material: Material;
  capacity: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/** An InstancedMesh whose instances follow `items`; capacity is fixed so it never remounts. */
export function InstancedSet({
  items,
  geometry,
  material,
  capacity,
  castShadow = true,
  receiveShadow = true,
}: Props) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.slice(0, capacity).forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.rotY ?? 0, 0);
      const s = it.scale ?? 1;
      if (typeof s === 'number') dummy.scale.setScalar(s);
      else dummy.scale.set(...s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (it.color) mesh.setColorAt(i, tint.set(it.color));
    });
    mesh.count = Math.min(items.length, capacity);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, capacity]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, capacity]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  );
}
