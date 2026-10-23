import type { Grid, Season } from '@hearthvale/core';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
} from 'three';
import { paletteFor } from '../render/seasonPalette';
import { patchMaterial } from '../render/shaders/patch';
import { hash01 } from './palette';
import { TreeModels } from './TreeModels';
import { spots } from './treeSpots';

const trunkGeo = new CylinderGeometry(0.12, 0.18, 1, 7);
trunkGeo.translate(0, 0.5, 0);
const trunkMat = patchMaterial(new MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.9 }), {
  snow: true,
});
const blobGeo = new IcosahedronGeometry(0.75, 1);
const blobMat = patchMaterial(new MeshStandardMaterial({ roughness: 0.8, flatShading: true }), {
  wind: 0.05,
  snow: true,
});
const pineGeo = new ConeGeometry(0.75, 1.6, 7);
pineGeo.translate(0, 0.8, 0);
const pineMat = patchMaterial(
  new MeshStandardMaterial({ color: '#2f5f3a', roughness: 0.85, flatShading: true }),
  {
    wind: 0.03,
    snow: true,
  },
);
const dummy = new Object3D();
const tint = new Color();

function TreesPlaceholder({ grid, season }: { grid: Grid; season: Season }) {
  const trunks = useRef<InstancedMesh>(null);
  const blobs = useRef<InstancedMesh>(null);
  const pines = useRef<InstancedMesh>(null);
  const list = useMemo(() => spots(grid), [grid.width, grid.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const palette = paletteFor(season, 5);

  useLayoutEffect(() => {
    const [tm, bm, pm] = [trunks.current, blobs.current, pines.current];
    if (!tm || !bm || !pm) return;
    let b = 0;
    let p = 0;
    list.forEach((t, i) => {
      const trunkH = t.kind === 'pine' ? 0.7 : 1.4;
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, t.s * 9, 0);
      dummy.scale.set(t.s, trunkH * t.s, t.s);
      dummy.updateMatrix();
      tm.setMatrixAt(i, dummy.matrix);
      if (t.kind === 'pine') {
        for (let tier = 0; tier < 3; tier++) {
          const s = t.s * (1.1 - tier * 0.25);
          dummy.position.set(t.x, (0.6 + tier * 0.75) * t.s, t.z);
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          pm.setMatrixAt(p++, dummy.matrix);
        }
        return;
      }
      if (palette.bareTrees) return;
      const colour = t.kind === 'blossom' && palette.blossom ? '#f2b6c8' : palette.foliage;
      for (let n = 0; n < 3; n++) {
        const off =
          n === 0 ? [0, 0] : [Math.cos(n * 2.4 + t.s) * 0.45, Math.sin(n * 2.4 + t.s) * 0.45];
        dummy.position.set(
          t.x + (off[0] ?? 0) * t.s,
          (1.9 - n * 0.15) * t.s + n * 0.1,
          t.z + (off[1] ?? 0) * t.s,
        );
        dummy.scale.setScalar(t.s * (n === 0 ? 1 : 0.7));
        dummy.updateMatrix();
        bm.setMatrixAt(b, dummy.matrix);
        bm.setColorAt(b++, tint.set(colour).offsetHSL(0, 0, (hash01(i + n) - 0.5) * 0.08));
      }
    });
    tm.count = list.length;
    bm.count = b;
    pm.count = p;
    for (const m of [tm, bm, pm]) m.instanceMatrix.needsUpdate = true;
    if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
  }, [list, palette.bareTrees, palette.blossom, palette.foliage]);

  return (
    <>
      <instancedMesh
        ref={trunks}
        args={[trunkGeo, trunkMat, 100]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={blobs}
        args={[blobGeo, blobMat, 300]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={pines}
        args={[pineGeo, pineMat, 300]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
    </>
  );
}

export function Trees({ grid, season }: { grid: Grid; season: Season }) {
  return (
    <Suspense fallback={<TreesPlaceholder grid={grid} season={season} />}>
      <TreeModels grid={grid} season={season} />
    </Suspense>
  );
}
