import type { Season } from '@hearthvale/core';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  type InstancedMesh,
} from 'three';
import { gameStore } from '../game/store';
import { nightFactor } from '../render/lighting';
import { hash01 } from './palette';

const N = 140;
const BOX = { x: 26, y: 7, z: 22 };
const dummy = new Object3D();

const leafGeo = new PlaneGeometry(0.12, 0.08);
const leafMat = new MeshStandardMaterial({ side: DoubleSide, roughness: 0.8 });
const flyMat = new MeshBasicMaterial({ color: new Color(3.2, 4, 1.2), toneMapped: false });

/** Drifting petals (spring), falling leaves (fall) and fireflies (summer nights) around the player. */
export function SeasonParticles({ season }: { season: Season }) {
  const leaves = useRef<InstancedMesh>(null);
  const flies = useRef<InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => [hash01(i), hash01(i + 99), hash01(i + 199)] as const),
    [],
  );
  const colour = season === 'spring' ? '#f4b8cb' : '#d9702c';

  useFrame(({ clock }) => {
    const g = gameStore.getState().game;
    if (!g) return;
    const t = clock.elapsedTime;
    const px = g.player.x;
    const pz = g.player.z;
    const outside = g.player.location === 'farm';
    const l = leaves.current;
    if (l) {
      l.visible = outside && (season === 'spring' || season === 'fall');
      if (l.visible) {
        seeds.forEach(([a, b, c], i) => {
          const fall = (t * (0.25 + c * 0.2) + a) % 1;
          const x =
            px -
            BOX.x / 2 +
            ((((a * BOX.x + Math.sin(t * 0.6 + i) * 1.2 + t * 0.4) % BOX.x) + BOX.x) % BOX.x);
          const z = pz - BOX.z / 2 + b * BOX.z;
          dummy.position.set(x, BOX.y * (1 - fall), z);
          dummy.rotation.set(t * (1 + c) + i, t * 0.7 + i, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          l.setMatrixAt(i, dummy.matrix);
        });
        l.instanceMatrix.needsUpdate = true;
        leafMat.color.set(colour);
      }
    }
    const f = flies.current;
    if (f) {
      const night = nightFactor(g.calendar.minute);
      f.visible = outside && season === 'summer' && night > 0.4;
      if (f.visible) {
        seeds.slice(0, 60).forEach(([a, b, c], i) => {
          dummy.position.set(
            px - 12 + a * 24 + Math.sin(t * 0.7 + i) * 0.6,
            0.4 + c * 1.4 + Math.sin(t * 1.3 + i * 2) * 0.2,
            pz - 10 + b * 20 + Math.cos(t * 0.5 + i) * 0.6,
          );
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.035 * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7)) * night);
          dummy.updateMatrix();
          f.setMatrixAt(i, dummy.matrix);
        });
        f.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <instancedMesh ref={leaves} args={[leafGeo, leafMat, N]} frustumCulled={false} />
      <instancedMesh ref={flies} args={[undefined, flyMat, 60]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 4]} />
      </instancedMesh>
    </>
  );
}
