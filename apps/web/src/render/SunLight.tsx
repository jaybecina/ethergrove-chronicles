import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type AmbientLight, type DirectionalLight, type HemisphereLight } from 'three';
import { gameStore, useGame } from '../game/store';
import { sunAt, sunDirection } from './lighting';
import { QUALITY } from './quality';
import { weatherNow } from './weatherState';

const SHADOW_SPAN = 12;
const tmp = new Color();

/** Sun/moon light that follows the player so the shadow map stays sharp nearby. */
export function SunLight() {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const amb = useRef<AmbientLight>(null);
  const tier = useGame((s) => s.tier());
  const shadowSize = QUALITY[tier].shadowMapSize;

  useFrame(() => {
    const g = gameStore.getState().game;
    const l = sun.current;
    if (!g || !l || !hemi.current || !amb.current) return;
    const indoors = g.player.location === 'house';
    const s = sunAt(g.calendar.minute);
    const [dx, dy, dz] = sunDirection(s);
    l.position.set(g.player.x + dx * 30, dy * 30, g.player.z + dz * 30);
    l.target.position.set(g.player.x, 0, g.player.z);
    l.target.updateMatrixWorld();
    l.color.set(indoors ? '#ffe2b8' : s.color);
    const { cloudiness } = weatherNow.visuals;
    const flash = weatherNow.flash * 6;
    l.intensity = indoors ? 1.6 : s.intensity * (1 - cloudiness * 0.7) + flash;
    hemi.current.color.set(indoors ? '#ffe9cc' : s.skyTop);
    hemi.current.groundColor.set(tmp.set(indoors ? '#4a3425' : '#5c6b3a'));
    hemi.current.intensity = indoors
      ? 0.8
      : 0.2 + s.ambient * 0.9 + cloudiness * 0.15 + flash * 0.4;
    amb.current.intensity = indoors ? 0.35 : s.ambient * 0.5;
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <ambientLight ref={amb} />
      <directionalLight
        key={shadowSize}
        ref={sun}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-SHADOW_SPAN}
        shadow-camera-right={SHADOW_SPAN}
        shadow-camera-top={SHADOW_SPAN}
        shadow-camera-bottom={-SHADOW_SPAN}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
    </>
  );
}
