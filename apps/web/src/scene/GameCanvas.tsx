import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { NoToneMapping } from 'three';
import { gameStore, useGame } from '../game/store';
import { PostFX } from '../render/PostFX';
import { profileOff, profiledTier } from '../render/profileSwitches';
import { QUALITY, detectTier, stepDown } from '../render/quality';
import { installContextLoss } from '../render/webgl';
import { GameLoop } from './GameLoop';
import { World } from './World';
import { ASSETS } from './assets';

// This chunk loads after the title screen is up; start fetching every model right away.
for (const a of Object.values(ASSETS)) useGLTF.preload(a.url);

export function GameCanvas() {
  const tier = useGame((s) => s.tier());
  const off = profileOff();
  const settings = profiledTier(QUALITY[tier], off);
  return (
    <Canvas
      shadows={off.shadows ? false : 'soft'}
      dpr={[1, settings.dprMax]}
      camera={{ fov: 40, near: 0.1, far: 400, position: [15, 12, 32] }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: NoToneMapping }}
      onCreated={({ gl }) => {
        gameStore.getState().setAutoTier(detectTier(gl));
        installContextLoss(gl.domElement, gameStore);
      }}
    >
      <PerformanceMonitor
        bounds={(refresh) => (refresh > 90 ? [50, 90] : [45, 60])}
        flipflops={2}
        onDecline={() => {
          const s = gameStore.getState();
          s.setAutoTier(stepDown(s.autoTier));
        }}
      />
      <GameLoop />
      <World />
      {off.post ? null : <PostFX tier={tier} ao={settings.ao} />}
    </Canvas>
  );
}
