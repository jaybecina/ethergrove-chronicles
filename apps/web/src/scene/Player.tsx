import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import { MathUtils, type Group } from 'three';
import { gameStore } from '../game/store';
import { COLORS } from './palette';
import { PlayerModel } from './PlayerModel';

const FACING_YAW = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 } as const;

/** Placeholder farmer; follows the simulated position smoothly between 50 ms steps. */
export function Player() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    const p = gameStore.getState().game?.player;
    if (!g || !p) return;
    g.visible = gameStore.getState().screen !== 'title';
    const snap = Math.hypot(g.position.x - p.x, g.position.z - p.z) > 2;
    g.position.x = snap ? p.x : MathUtils.damp(g.position.x, p.x, 20, delta);
    g.position.z = snap ? p.z : MathUtils.damp(g.position.z, p.z, 20, delta);
    const target = FACING_YAW[p.facing];
    let d = target - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, delta * 14);
  });
  return (
    <group ref={ref}>
      <Suspense fallback={<PlaceholderFarmer />}>
        <PlayerModel />
      </Suspense>
    </group>
  );
}

function PlaceholderFarmer() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.26, 0.55, 6, 12]} />
        <meshStandardMaterial color={COLORS.player} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#f2c9a0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.24, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.05, 16]} />
        <meshStandardMaterial color="#e3c169" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.12, 8]} />
        <meshStandardMaterial color="#e0a582" />
      </mesh>
    </group>
  );
}
