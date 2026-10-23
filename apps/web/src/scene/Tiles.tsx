import type { Grid, Tile } from '@hearthvale/core';
import { useMemo } from 'react';
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  MeshStandardMaterial,
} from 'three';
import { COLORS, hash01 } from './palette';
import { InstancedSet, type InstanceItem } from './InstancedSet';

const ground = new BoxGeometry(1, 0.2, 1);
const groundMat = new MeshStandardMaterial({ roughness: 0.95 });
const rockGeo = new DodecahedronGeometry(0.38, 0);
const rockMat = new MeshStandardMaterial({ color: COLORS.rock, roughness: 0.9, flatShading: true });
const stumpGeo = new CylinderGeometry(0.28, 0.34, 0.4, 9);
const stumpMat = new MeshStandardMaterial({ color: COLORS.stump, roughness: 0.85 });
const weedGeo = new ConeGeometry(0.22, 0.45, 5);
const weedMat = new MeshStandardMaterial({ color: COLORS.weed, roughness: 0.8, flatShading: true });
const postGeo = new BoxGeometry(0.14, 0.8, 0.14);
const fenceMat = new MeshStandardMaterial({ color: COLORS.fence, roughness: 0.8 });

const shade = new Color();
function groundColor(t: Tile, i: number): string | null {
  const base =
    t.kind === 'tilled'
      ? t.watered
        ? COLORS.watered
        : COLORS.tilled
      : t.kind === 'path'
        ? COLORS.path
        : t.kind === 'floor' || t.kind === 'wall' || t.feature === 'bed' || t.feature === 'exitDoor'
          ? COLORS.floor
          : t.kind === 'water'
            ? null
            : COLORS.grass;
  if (!base) return null;
  return `#${shade
    .set(base)
    .offsetHSL(0, 0, (hash01(i) - 0.5) * 0.06)
    .getHexString()}`;
}

interface Props {
  grid: Grid;
}

export function Tiles({ grid }: Props) {
  const sets = useMemo(() => {
    const groundItems: InstanceItem[] = [];
    const rocks: InstanceItem[] = [];
    const stumps: InstanceItem[] = [];
    const weeds: InstanceItem[] = [];
    const posts: InstanceItem[] = [];
    grid.tiles.forEach((t, i) => {
      const x = (i % grid.width) + 0.5;
      const z = Math.floor(i / grid.width) + 0.5;
      const color = groundColor(t, i);
      const sunk = t.kind === 'tilled' ? -0.13 : -0.1;
      if (color) groundItems.push({ x, y: sunk, z, color });
      const j = hash01(i + 17);
      if (t.kind === 'rock') rocks.push({ x, y: 0.2, z, rotY: j * 6, scale: 0.85 + j * 0.3 });
      if (t.kind === 'stump') stumps.push({ x, y: 0.2, z, rotY: j * 6 });
      if (t.kind === 'weed')
        weeds.push(
          { x: x - 0.15, y: 0.22, z: z - 0.1, rotY: j * 6, scale: 0.9 + j * 0.4 },
          { x: x + 0.18, y: 0.18, z: z + 0.12, rotY: j * 3, scale: 0.7 + j * 0.3 },
        );
      if (t.kind === 'fence') posts.push({ x, y: 0.4, z, rotY: j * 0.3 });
    });
    return { groundItems, rocks, stumps, weeds, posts };
  }, [grid]);

  const cap = grid.tiles.length;
  return (
    <group>
      <InstancedSet
        items={sets.groundItems}
        geometry={ground}
        material={groundMat}
        capacity={cap}
        castShadow={false}
      />
      <InstancedSet items={sets.rocks} geometry={rockGeo} material={rockMat} capacity={cap} />
      <InstancedSet items={sets.stumps} geometry={stumpGeo} material={stumpMat} capacity={cap} />
      <InstancedSet items={sets.weeds} geometry={weedGeo} material={weedMat} capacity={cap * 2} />
      <InstancedSet items={sets.posts} geometry={postGeo} material={fenceMat} capacity={cap} />
    </group>
  );
}
