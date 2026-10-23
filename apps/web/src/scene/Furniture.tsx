import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { Box3, Vector3, Mesh } from 'three';
import { ASSETS, type AssetKey } from './assets';

interface Piece {
  key: AssetKey;
  x: number;
  z: number;
  rotY: number;
  width: number;
}

function Model({ piece }: { piece: Piece }) {
  const { scene } = useGLTF(ASSETS[piece.key].url);
  const object = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((c) => {
      if (c instanceof Mesh) c.castShadow = c.receiveShadow = true;
    });
    const box = new Box3().setFromObject(o);
    const size = box.getSize(new Vector3());
    const s = piece.width / Math.max(size.x, size.z);
    o.scale.setScalar(s);
    const c = box.getCenter(new Vector3());
    o.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    return o;
  }, [scene, piece.width]);
  return (
    <group position={[piece.x, 0, piece.z]} rotation={[0, piece.rotY, 0]}>
      <primitive object={object} />
    </group>
  );
}

/** CC0 furniture for the farmhouse; the bed sits on the core's bed tile. */
export function Furniture({ bed }: { bed: { x: number; y: number } }) {
  const pieces: Piece[] = [
    { key: 'bed', x: bed.x + 0.5, z: bed.y + 0.55, rotY: Math.PI, width: 1.05 },
    { key: 'rug', x: 3.5, z: 2.9, rotY: 0, width: 2.2 },
    { key: 'table', x: 1.7, z: 1.7, rotY: 0, width: 0.9 },
    { key: 'chair', x: 2.5, z: 1.8, rotY: -Math.PI / 2, width: 0.5 },
    { key: 'potted-plant', x: 6.4, z: 4.4, rotY: 0, width: 0.45 },
    { key: 'lamp', x: 1.4, z: 4.4, rotY: 0, width: 0.4 },
  ];
  return (
    <>
      {pieces.map((p) => (
        <Model key={p.key} piece={p} />
      ))}
      <pointLight
        position={[1.4, 1.3, 4.4]}
        color="#ffcf8a"
        intensity={4}
        distance={5}
        decay={1.6}
      />
    </>
  );
}
