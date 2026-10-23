import type { Grid, Season } from '@hearthvale/core';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
} from 'three';
import { useGame } from '../game/store';
import { QUALITY } from '../render/quality';
import { paletteFor } from '../render/seasonPalette';
import { patchMaterial } from '../render/shaders/patch';
import { hash01 } from './palette';

const BAND = 7;
const PER_TILE_FIELD = 16;
const PER_TILE_BAND = 9;

function bladeGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  // Tapered blade, local height 0..1 (the wind shader bends by height²).
  const p = [-0.04, 0, 0, 0.04, 0, 0, -0.028, 0.5, 0, 0.028, 0.5, 0, 0, 1, 0];
  const shade = [0.45, 0.45, 0.75, 0.75, 1, 1];
  g.setAttribute('position', new Float32BufferAttribute(p, 3));
  g.setAttribute(
    'color',
    new Float32BufferAttribute(
      [0, 1, 2, 3, 4].flatMap((i) => [shade[i] ?? 1, shade[i] ?? 1, shade[i] ?? 1]),
      3,
    ),
  );
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  g.computeVertexNormals();
  return g;
}

const geometry = bladeGeometry();
const material = patchMaterial(
  new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.85 }),
  { wind: 0.12, trample: true },
);
const dummy = new Object3D();
const tint = new Color();

interface Blade {
  x: number;
  z: number;
  h: number;
  r: number;
  t: number;
}

function bladesFor(grid: Grid, density: number): Blade[] {
  const out: Blade[] = [];
  const add = (tx: number, tz: number, n: number, seed: number) => {
    for (let k = 0; k < Math.round(n * density); k++) {
      const a = hash01(seed * 31 + k * 7.3);
      const b = hash01(seed * 17 + k * 3.1 + 5);
      out.push({ x: tx + a, z: tz + b, h: 0.22 + hash01(seed + k) * 0.25, r: a * 6.28, t: b });
    }
  };
  grid.tiles.forEach((t, i) => {
    if (t.kind === 'grass') add(i % grid.width, Math.floor(i / grid.width), PER_TILE_FIELD, i);
  });
  for (let z = -BAND; z < grid.height + BAND; z++)
    for (let x = -BAND; x < grid.width + BAND; x++) {
      const inside = x >= 0 && z >= 0 && x < grid.width && z < grid.height;
      const road = x >= grid.width && z >= 16 && z <= 18;
      if (!inside && !road) add(x, z, PER_TILE_BAND, 10_000 + z * 97 + x);
    }
  return out;
}

export function Grass({ grid, season }: { grid: Grid; season: Season }) {
  const ref = useRef<InstancedMesh>(null);
  const tier = useGame((s) => s.tier());
  const blades = useMemo(() => bladesFor(grid, QUALITY[tier].grassDensity), [grid, tier]);
  const capacity = useMemo(() => bladesFor(grid, 1).length + 4000, [grid]);
  const palette = paletteFor(season, 5);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const base = new Color(palette.grass);
    const tip = new Color(palette.grassTip);
    blades.slice(0, capacity).forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z);
      dummy.rotation.set(0, b.r, 0);
      dummy.scale.set(1, b.h, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, tint.copy(base).lerp(tip, b.t * 0.7));
    });
    m.count = Math.min(blades.length, capacity);
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [blades, capacity, palette.grass, palette.grassTip]);

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[geometry, material, capacity]}
      receiveShadow
      frustumCulled={false}
      visible={season !== 'winter'}
    />
  );
}
