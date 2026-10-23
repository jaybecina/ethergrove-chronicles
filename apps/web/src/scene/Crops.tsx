import { cropStage, type CropId, type Grid } from '@hearthvale/core';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, MeshStandardMaterial, Object3D, SphereGeometry, type InstancedMesh } from 'three';
import { eventBus } from '../game/eventBus';

interface Look {
  fruit: string;
  /** fruit scale x, y, z */
  size: [number, number, number];
  fruitY: number;
  bush: number;
  tall: number;
  count: number;
}

/** Placeholder looks per crop; Task 26 swaps in CC0 models. */
const LOOK: Record<CropId, Look> = {
  turnip: { fruit: '#efe1ee', size: [0.2, 0.17, 0.2], fruitY: 0.1, bush: 0.16, tall: 1, count: 1 },
  potato: {
    fruit: '#b28c5c',
    size: [0.12, 0.1, 0.12],
    fruitY: 0.08,
    bush: 0.22,
    tall: 1,
    count: 3,
  },
  strawberry: {
    fruit: '#e0313f',
    size: [0.07, 0.08, 0.07],
    fruitY: 0.16,
    bush: 0.2,
    tall: 0.9,
    count: 4,
  },
  tomato: {
    fruit: '#e64b35',
    size: [0.09, 0.09, 0.09],
    fruitY: 0.5,
    bush: 0.2,
    tall: 2.4,
    count: 4,
  },
  corn: {
    fruit: '#f2cf4a',
    size: [0.07, 0.22, 0.07],
    fruitY: 0.7,
    bush: 0.14,
    tall: 3.6,
    count: 2,
  },
  melon: {
    fruit: '#5f9e48',
    size: [0.3, 0.26, 0.34],
    fruitY: 0.14,
    bush: 0.18,
    tall: 0.7,
    count: 1,
  },
  pumpkin: {
    fruit: '#f08a24',
    size: [0.34, 0.26, 0.34],
    fruitY: 0.15,
    bush: 0.18,
    tall: 0.7,
    count: 1,
  },
  eggplant: {
    fruit: '#6b3a8a',
    size: [0.08, 0.17, 0.08],
    fruitY: 0.3,
    bush: 0.2,
    tall: 1.6,
    count: 3,
  },
};

interface Part {
  tile: number;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
}

const sphere = new SphereGeometry(1, 12, 8);
const bushMat = new MeshStandardMaterial({ roughness: 0.75 });
const fruitMat = new MeshStandardMaterial({ roughness: 0.45 });
const dummy = new Object3D();
const tint = new Color();
const POP_MS = 250;

function partsFor(grid: Grid): { bush: Part[]; fruit: Part[] } {
  const bush: Part[] = [];
  const fruit: Part[] = [];
  grid.tiles.forEach((t, tile) => {
    if (!t.crop) return;
    const cx = (tile % grid.width) + 0.5;
    const cz = Math.floor(tile / grid.width) + 0.5;
    const look = LOOK[t.crop.id];
    const stage = cropStage(t.crop);
    if (stage === 'seed') {
      bush.push({ tile, x: cx, y: 0.02, z: cz, sx: 0.1, sy: 0.04, sz: 0.1, color: '#3d2816' });
      return;
    }
    const grow = stage === 'sprout' ? 0.4 : stage === 'young' ? 0.75 : 1;
    const g = look.bush * grow;
    const h = g * look.tall;
    bush.push({
      tile,
      x: cx,
      y: h * 0.9,
      z: cz,
      sx: g,
      sy: h,
      sz: g,
      color: stage === 'sprout' ? '#8cc45a' : '#5f9a3c',
    });
    if (stage !== 'mature') return;
    for (let n = 0; n < look.count; n++) {
      const a = (n / look.count) * Math.PI * 2 + tile;
      const r = look.count > 1 ? g * 0.7 : 0;
      fruit.push({
        tile,
        x: cx + Math.cos(a) * r,
        y: look.fruitY + (look.count > 1 ? (n % 2) * 0.08 : 0),
        z: cz + Math.sin(a) * r,
        sx: look.size[0],
        sy: look.size[1],
        sz: look.size[2],
        color: look.fruit,
      });
    }
  });
  return { bush, fruit };
}

function write(mesh: InstancedMesh, parts: Part[], pop: Map<number, number>, now: number) {
  parts.forEach((p, i) => {
    const started = pop.get(p.tile);
    let k = 1;
    if (started !== undefined) {
      const t = (now - started) / POP_MS;
      k = t >= 1 ? 1 : t < 0.5 ? 0.8 + t * 0.6 : 1.1 - (t - 0.5) * 0.2;
    }
    dummy.position.set(p.x, p.y * k, p.z);
    dummy.scale.set(p.sx * k, p.sy * k, p.sz * k);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.count = parts.length;
  mesh.instanceMatrix.needsUpdate = true;
}

export function Crops({ grid }: { grid: Grid }) {
  const bushRef = useRef<InstancedMesh>(null);
  const fruitRef = useRef<InstancedMesh>(null);
  const pops = useRef(new Map<number, number>());
  const parts = useMemo(() => partsFor(grid), [grid]);
  const cap = grid.tiles.length * 4;

  useEffect(() => {
    const pop = (e: { x: number; y: number }) => {
      pops.current.set(e.y * grid.width + e.x, performance.now());
    };
    const a = eventBus.on('cropGrew', pop);
    const b = eventBus.on('cropPlanted', pop);
    return () => {
      a();
      b();
    };
  }, [grid.width]);

  useLayoutEffect(() => {
    const now = performance.now();
    for (const [mesh, list] of [
      [bushRef.current, parts.bush],
      [fruitRef.current, parts.fruit],
    ] as const) {
      if (!mesh) continue;
      list.forEach((p, i) => {
        mesh.setColorAt(i, tint.set(p.color));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      write(mesh, list, pops.current, now);
    }
  }, [parts]);

  useFrame(() => {
    if (pops.current.size === 0) return;
    const now = performance.now();
    if (bushRef.current) write(bushRef.current, parts.bush, pops.current, now);
    if (fruitRef.current) write(fruitRef.current, parts.fruit, pops.current, now);
    for (const [tile, t] of pops.current) if (now - t > POP_MS) pops.current.delete(tile);
  });

  return (
    <>
      <instancedMesh
        ref={bushRef}
        args={[sphere, bushMat, cap]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={fruitRef}
        args={[sphere, fruitMat, cap]}
        castShadow
        frustumCulled={false}
      />
    </>
  );
}
