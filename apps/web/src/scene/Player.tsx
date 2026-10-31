import { useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import type { Group } from 'three';
import { gameStore } from '../game/store';
import { COLORS } from './palette';
import { FACING_YAW, followMotion, playerMotion, type Motion } from './motion';
import { PlayerBlobShadow } from './PlayerBlobShadow';
import { PlayerModel } from './PlayerModel';

/** Placeholder farmer; follows the simulated position smoothly between 50 ms steps. */
export function Player() {
  const ref = useRef<Group>(null);
  const motion = useRef<Motion | null>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    const p = gameStore.getState().game?.player;
    if (!g || !p) return;
    g.visible = gameStore.getState().screen !== 'title';
    const m = motion.current
      ? followMotion(motion.current, p, Math.min(delta, 0.1))
      : { x: p.x, z: p.z, speed: 0, yaw: FACING_YAW[p.facing] };
    motion.current = m;
    Object.assign(playerMotion, m);
    g.position.set(m.x, 0, m.z);
    g.rotation.y = m.yaw;
  });
  return (
    <group ref={ref}>
      <PlayerBlobShadow />
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
