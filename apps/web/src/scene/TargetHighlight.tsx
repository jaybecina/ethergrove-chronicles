import { targetTile } from '@ethergrove/core';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshBasicMaterial } from 'three';
import { gameStore } from '../game/store';

export function TargetHighlight() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    const p = gameStore.getState().game?.player;
    if (!m || !p) return;
    const t = targetTile(p);
    m.position.set(t.x + 0.5, 0.03, t.y + 0.5);
    (m.material as MeshBasicMaterial).opacity = 0.35 + Math.sin(clock.elapsedTime * 4) * 0.12;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <ringGeometry args={[0.36, 0.48, 4, 1, Math.PI / 4]} />
      <meshBasicMaterial color="#fff3c4" transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
