import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group, PointLight } from 'three';
import { eventBus } from '../game/eventBus';
import { gameStore } from '../game/store';
import { toastStore } from '../ui/toastStore';

const DURATION = 4;
const HILLS = { x: 26, z: -8 };

/** One-time glimpse of a Kindling spirit on the first harvest (story foreshadowing). */
export function Kindling() {
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const start = useRef<{ t: number | null; x: number; z: number }>({ t: null, x: 0, z: 0 });

  useEffect(
    () =>
      eventBus.on('milestoneReached', (e) => {
        if (e.id !== 'firstHarvest') return;
        const p = gameStore.getState().game?.player;
        start.current = { t: -1, x: p?.x ?? 16, z: p?.z ?? 12 };
        toastStore.getState().push('Something small and bright wakes in the hills…', 'magic', 4500);
      }),
    [],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    const s = start.current;
    if (!g || s.t === null) return;
    if (s.t < 0) s.t = clock.elapsedTime;
    const k = (clock.elapsedTime - s.t) / DURATION;
    if (k >= 1) {
      s.t = null;
      g.visible = false;
      return;
    }
    g.visible = true;
    const ease = k * k * (3 - 2 * k);
    g.position.set(
      s.x + (HILLS.x - s.x) * ease + Math.sin(k * 18) * 0.3,
      1 + ease * 6 + Math.sin(k * 11) * 0.25,
      s.z + (HILLS.z - s.z) * ease,
    );
    const fade = Math.min(1, k * 6) * Math.min(1, (1 - k) * 3);
    g.scale.setScalar(0.6 + fade * 0.4);
    if (light.current) light.current.intensity = fade * 6;
  });

  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshBasicMaterial color={[6, 5, 2.4]} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color="#ffd27a" distance={6} intensity={0} />
    </group>
  );
}
