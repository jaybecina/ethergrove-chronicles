import { findFeature, type Grid } from '@hearthvale/core';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { MeshStandardMaterial } from 'three';
import { gameStore } from '../game/store';
import { nightFactor } from '../render/lighting';
import { Water } from './Water';
import { COLORS } from './palette';

function bounds(grid: Grid, kind: 'building' | 'water') {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  grid.tiles.forEach((t, i) => {
    if (t.kind !== kind && !(kind === 'building' && t.feature === 'houseDoor')) return;
    const x = i % grid.width;
    const y = Math.floor(i / grid.width);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  return {
    x0,
    x1,
    y0,
    y1,
    w: x1 - x0 + 1,
    d: y1 - y0 + 1,
    cx: (x0 + x1 + 1) / 2,
    cz: (y0 + y1 + 1) / 2,
  };
}

export function Features({ grid }: { grid: Grid }) {
  const house = useMemo(() => bounds(grid, 'building'), [grid]);
  const pond = useMemo(() => bounds(grid, 'water'), [grid]);
  const door = findFeature(grid, 'houseDoor');
  const bin = findFeature(grid, 'bin');
  const cart = findFeature(grid, 'cart');
  const wallH = 2.2;
  const windowMat = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    const minute = gameStore.getState().game?.calendar.minute ?? 720;
    // Windows light up from dusk (18:00); emissive > 1 so bloom catches them.
    if (windowMat.current) windowMat.current.emissiveIntensity = 0.15 + nightFactor(minute) * 3;
  });

  return (
    <group>
      {/* Farmhouse */}
      <mesh position={[house.cx, wallH / 2, house.cz]} castShadow receiveShadow>
        <boxGeometry args={[house.w - 0.1, wallH, house.d - 0.1]} />
        <meshStandardMaterial color={COLORS.houseWall} roughness={0.9} />
      </mesh>
      <mesh position={[house.cx, wallH + 0.75, house.cz]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.hypot(house.w, house.d) / 2 + 0.3, 1.5, 4]} />
        <meshStandardMaterial color={COLORS.roof} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[door.x + 0.5, 0.65, door.y + 0.97]}>
        <boxGeometry args={[0.7, 1.3, 0.08]} />
        <meshStandardMaterial color={COLORS.wood} roughness={0.7} />
      </mesh>
      <mesh position={[door.x + 1.6, 1.4, door.y + 0.97]}>
        <boxGeometry args={[0.6, 0.5, 0.06]} />
        <meshStandardMaterial
          ref={windowMat}
          color="#ffd98a"
          emissive="#ffb84d"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Shipping bin */}
      <group position={[bin.x + 0.5, 0, bin.y + 0.5]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.6, 0.7]} />
          <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.65, -0.05]} rotation={[-0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.86, 0.08, 0.76]} />
          <meshStandardMaterial color="#6d4426" roughness={0.8} />
        </mesh>
      </group>

      {/* Merchant cart (Sol) */}
      <group position={[cart.x + 0.3, 0, cart.y + 0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.5, 0.9]} />
          <meshStandardMaterial color="#9b6a3c" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.45, 0]} castShadow>
          <boxGeometry args={[1.8, 0.08, 1.1]} />
          <meshStandardMaterial color="#d8604a" roughness={0.6} />
        </mesh>
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} position={[x, 1, 0.45]}>
            <cylinderGeometry args={[0.03, 0.03, 0.9]} />
            <meshStandardMaterial color="#5a3a20" />
          </mesh>
        ))}
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.3, 0.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.08, 12]} />
            <meshStandardMaterial color="#4b3220" />
          </mesh>
        ))}
      </group>

      {/* Pond: dark bed under shader water */}
      <mesh position={[pond.cx, -0.25, pond.cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[pond.w + 0.2, pond.d + 0.2]} />
        <meshStandardMaterial color="#20384a" roughness={1} />
      </mesh>
      <Water x={pond.cx} z={pond.cz} w={pond.w} d={pond.d} />
    </group>
  );
}
