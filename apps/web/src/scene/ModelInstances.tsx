import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, MeshStandardMaterial, Object3D, type InstancedMesh } from 'three';
import { patchMaterial, type PatchOptions } from '../render/shaders/patch';
import type { InstanceItem } from './InstancedSet';
import { extractParts, fitTransform } from './models';

const dummy = new Object3D();
const base = new Matrix4();
const tmp = new Matrix4();
const tint = new Color();

interface Props {
  url: string;
  items: readonly InstanceItem[];
  capacity: number;
  fit: { height: number } | { width: number };
  patch?: PatchOptions;
  /** Material colour override by glTF material name (e.g. seasonal leaves). */
  tint?: (materialName: string) => string | null;
  /**
   * Render as non-metal. Kenney glTFs omit `metallicFactor`, which three.js reads as fully metallic;
   * with no environment map that hides the base colour, so a grey rock comes out dark brown.
   */
  matte?: boolean;
  /** Which materials take each item's own `color` (others keep their texture colour). */
  colorParts?: (materialName: string) => boolean;
  /** Extra per-item scale, re-applied every frame while `animating()` is true (crop pops). */
  scaleOf?: (item: InstanceItem, index: number) => number;
  animating?: () => boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/** Draws one glTF model many times with one InstancedMesh per material. */
export function ModelInstances(props: Props) {
  const {
    url,
    items,
    capacity,
    fit,
    patch,
    tint: tintOf,
    matte,
    colorParts,
    scaleOf,
    animating,
  } = props;
  const gltf = useGLTF(url);
  const { parts, box } = useMemo(() => extractParts(gltf.scene), [gltf.scene]);
  const fitKey = 'height' in fit ? `h${fit.height}` : `w${fit.width}`;
  const t = useMemo(() => fitTransform(box, fit), [box, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const patchKey = JSON.stringify(patch ?? null);
  const materials = useMemo(
    () =>
      parts.map((p) => {
        const m = p.material.clone();
        if (matte && m instanceof MeshStandardMaterial) {
          m.metalness = 0;
          m.roughness = 0.9;
        }
        return patch ? patchMaterial(m, { ...patch, height: t.height }) : m;
      }),
    [parts, patchKey, t.height, matte], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const refs = useRef<(InstancedMesh | null)[]>([]);

  useLayoutEffect(() => {
    materials.forEach((m) => {
      const c = tintOf?.(m.name) ?? null;
      if (m instanceof MeshStandardMaterial && c) m.color.set(c);
    });
  });

  const write = () => {
    base
      .makeScale(t.scale, t.scale, t.scale)
      .multiply(tmp.makeTranslation(t.offset.x, t.offset.y, t.offset.z));
    refs.current.forEach((mesh, pi) => {
      if (!mesh) return;
      const mat = materials[pi];
      const colored = colorParts?.(mat?.name ?? '') ?? true;
      items.slice(0, capacity).forEach((it, i) => {
        const k = scaleOf?.(it, i) ?? 1;
        const s = it.scale ?? 1;
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.rotY ?? 0, 0);
        if (typeof s === 'number') dummy.scale.setScalar(s * k);
        else dummy.scale.set(s[0] * k, s[1] * k, s[2] * k);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, tmp.multiplyMatrices(dummy.matrix, base));
        if (colored && it.color) mesh.setColorAt(i, tint.set(it.color));
      });
      mesh.count = Math.min(items.length, capacity);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  };
  useLayoutEffect(write);
  useFrame(() => {
    if (animating?.()) write();
  });

  return (
    <>
      {parts.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          args={[p.geometry, materials[i], capacity]}
          castShadow={props.castShadow ?? true}
          receiveShadow={props.receiveShadow ?? true}
          frustumCulled={false}
        />
      ))}
    </>
  );
}
