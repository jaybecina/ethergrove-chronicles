import { CanvasTexture } from 'three';
import { useGame } from '../game/store';
import { QUALITY, type TierSettings } from '../render/quality';

/** Without a shadow map (Low) the farmer would float, so a soft dark disc grounds them. */
export function showBlobShadow(settings: TierSettings): boolean {
  return !settings.shadows;
}

let texture: CanvasTexture | null = null;

/** A 64 × 64 radial gradient, opaque in the centre and clear at the rim; built once. */
function blobTexture(): CanvasTexture {
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  texture = new CanvasTexture(canvas);
  return texture;
}

export function PlayerBlobShadow() {
  const tier = useGame((s) => s.tier());
  if (!showBlobShadow(QUALITY[tier])) return null;
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.02} renderOrder={1}>
      <circleGeometry args={[0.42, 24]} />
      <meshBasicMaterial
        color="#000000"
        map={blobTexture()}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </mesh>
  );
}
