import { findFeature, type Grid } from '@ethergrove/core';
import { Suspense, useMemo } from 'react';
import { Furniture } from './Furniture';
import { COLORS } from './palette';

/** Low walls so the angled camera can see inside. */
export function HouseInterior({ grid }: { grid: Grid }) {
  const walls = useMemo(
    () =>
      grid.tiles.flatMap((t, i) =>
        t.kind === 'wall'
          ? [{ x: (i % grid.width) + 0.5, z: Math.floor(i / grid.width) + 0.5, i }]
          : [],
      ),
    [grid],
  );
  const bed = findFeature(grid, 'bed');
  const exit = findFeature(grid, 'exitDoor');
  return (
    <group>
      {walls.map((w) => (
        <mesh key={w.i} position={[w.x, 0.35, w.z]} castShadow receiveShadow>
          <boxGeometry args={[1, 0.7, 1]} />
          <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
        </mesh>
      ))}
      <Suspense fallback={<ProceduralBed bed={bed} />}>
        <Furniture bed={bed} />
      </Suspense>
      <mesh position={[exit.x + 0.5, 0.02, exit.y + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial color="#9e4b3c" />
      </mesh>
    </group>
  );
}

function ProceduralBed({ bed }: { bed: { x: number; y: number } }) {
  return (
    <group position={[bed.x + 0.5, 0, bed.y + 0.5]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.9, 0.3, 0.95]} />
        <meshStandardMaterial color="#6d4426" />
      </mesh>
      <mesh position={[0, 0.43, 0.08]} castShadow>
        <boxGeometry args={[0.8, 0.1, 0.75]} />
        <meshStandardMaterial color="#5f86b8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.48, -0.32]}>
        <boxGeometry args={[0.6, 0.12, 0.22]} />
        <meshStandardMaterial color="#f4ecdc" />
      </mesh>
    </group>
  );
}
