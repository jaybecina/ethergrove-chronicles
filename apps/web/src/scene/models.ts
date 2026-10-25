import {
  Box3,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';

const isMesh = (o: Object3D): o is Mesh => (o as { isMesh?: boolean }).isMesh === true;

export interface ModelPart {
  geometry: BufferGeometry;
  material: Material;
}

/** Flatten a loaded glTF scene into one world-space geometry per mesh (for instancing). */
export function extractParts(root: Object3D): { parts: ModelPart[]; box: Box3 } {
  root.updateMatrixWorld(true);
  const parts: ModelPart[] = [];
  const box = new Box3();
  root.traverse((mesh) => {
    if (!isMesh(mesh)) return;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
    const material: Material | undefined = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;
    if (material) parts.push({ geometry, material });
  });
  return { parts, box };
}

/** Scale and offset that make a model stand on y = 0, centred, at a target height or footprint width. */
export function fitTransform(box: Box3, fit: { height: number } | { width: number }) {
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = 'height' in fit ? fit.height / size.y : fit.width / Math.max(size.x, size.z);
  return { scale, offset: new Vector3(-center.x, -box.min.y, -center.z), height: size.y };
}

/**
 * Render a material as non-metal. Kenney glTFs omit `metallicFactor`, which three.js reads as fully
 * metallic; with no environment map that hides the base colour, so a grey rock comes out dark brown.
 */
export function makeMatte(material: Material): void {
  if (!(material instanceof MeshStandardMaterial)) return;
  material.metalness = 0;
  material.roughness = 0.9;
}
