import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3, type Camera, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { gameStore } from '../game/store';
import { markerScreen } from './markerScreen';
import { useLessonTarget } from './useLessonTarget';

const HEIGHT = 1.4;
const ON_SCREEN_INSET = 48;
const v = new Vector3();

interface Projected {
  x: number;
  y: number;
  behind: boolean;
}

function project(
  x: number,
  y: number,
  z: number,
  camera: Camera,
  size: { width: number; height: number },
): Projected {
  v.set(x, y, z).project(camera);
  return {
    x: ((v.x + 1) / 2) * size.width,
    y: ((1 - v.y) / 2) * size.height,
    behind: v.z > 1,
  };
}

const inView = (p: Projected, size: { width: number; height: number }) =>
  !p.behind &&
  p.x >= ON_SCREEN_INSET &&
  p.x <= size.width - ON_SCREEN_INSET &&
  p.y >= ON_SCREEN_INSET &&
  p.y <= size.height - ON_SCREEN_INSET;

/** A glowing gold diamond over the lesson's target tile (spec §4.6). */
export function LessonMarker() {
  const target = useLessonTarget();
  const gem = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame(({ clock }) => {
    if (!target) {
      markerScreen.visible = false;
      return;
    }
    const still = gameStore.getState().settings.reducedMotion;
    const t = clock.elapsedTime;
    if (gem.current) {
      gem.current.position.y = HEIGHT + (still ? 0 : Math.sin(t * Math.PI * 2) * 0.08);
      gem.current.rotation.y = still ? 0 : t * 0.6;
    }
    const mat = ring.current?.material as MeshBasicMaterial | undefined;
    if (mat) mat.opacity = still ? 0.6 : 0.575 + Math.sin(t * Math.PI * 2) * 0.225;

    // On screen when either the gem or its ground ring is in view.
    const gemAt = project(target.x + 0.5, HEIGHT, target.y + 0.5, camera, size);
    const ringAt = project(target.x + 0.5, 0, target.y + 0.5, camera, size);
    markerScreen.visible = true;
    markerScreen.behind = gemAt.behind;
    markerScreen.x = gemAt.x;
    markerScreen.y = gemAt.y;
    markerScreen.onScreen = inView(gemAt, size) || inView(ringAt, size);
  });

  if (!target) return null;
  return (
    <group position={[target.x + 0.5, 0, target.y + 0.5]}>
      <group ref={gem} position={[0, HEIGHT, 0]}>
        <mesh>
          <octahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color="#f3cf72" emissive="#d9a441" emissiveIntensity={1.5} />
        </mesh>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.36, 0.46, 48]} />
        <meshBasicMaterial color="#f3cf72" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}
