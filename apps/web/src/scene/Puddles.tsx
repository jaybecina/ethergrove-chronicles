import type { Grid } from '@ethergrove/core';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { CircleGeometry, MeshStandardMaterial } from 'three';
import { weatherNow } from '../render/weatherState';
import { InstancedSet, type InstanceItem } from './InstancedSet';
import { hash01 } from './palette';

const geo = new CircleGeometry(0.42, 18);
geo.rotateX(-Math.PI / 2);
const mat = new MeshStandardMaterial({
  color: '#3d4f5c',
  roughness: 0.05,
  metalness: 0.3,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

/** Puddles that fade in on path tiles while it rains. */
export function Puddles({ grid }: { grid: Grid }) {
  const items = useMemo(
    () =>
      grid.tiles.flatMap((t, i): InstanceItem[] =>
        t.kind === 'path' && hash01(i * 4.1) < 0.12
          ? [
              {
                x: (i % grid.width) + 0.3 + hash01(i) * 0.4,
                y: 0.005,
                z: Math.floor(i / grid.width) + 0.3 + hash01(i + 3) * 0.4,
                scale: [0.6 + hash01(i + 7) * 0.8, 1, 0.5 + hash01(i + 9) * 0.6],
                rotY: hash01(i + 5) * 6,
              },
            ]
          : [],
      ),
    [grid],
  );
  useFrame((_, delta) => {
    const target = weatherNow.visuals.wetness * 0.75;
    mat.opacity += (target - mat.opacity) * Math.min(1, delta * 0.5);
    mat.visible = mat.opacity > 0.01;
  });
  return (
    <InstancedSet
      items={items}
      geometry={geo}
      material={mat}
      capacity={grid.tiles.length}
      castShadow={false}
    />
  );
}
