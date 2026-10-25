import { LessonMarker } from './LessonMarker';
import { useGame } from '../game/store';
import { SunLight } from '../render/SunLight';
import { CameraRig } from './CameraRig';
import { Sky } from './Sky';
import { Features } from './Features';
import { HouseInterior } from './HouseInterior';
import { Player } from './Player';
import { TargetHighlight } from './TargetHighlight';
import { Tiles } from './Tiles';
import { Crops } from './Crops';
import { CropModels } from './CropModels';
import { Suspense } from 'react';
import { Kindling } from './Kindling';
import { FxLayer } from './fx/FxLayer';
import { MeshStandardMaterial } from 'three';
import { paletteFor } from '../render/seasonPalette';
import { patchMaterial } from '../render/shaders/patch';
import { Grass } from './Grass';
import { SeasonDriver } from './SeasonDriver';
import { SeasonParticles } from './SeasonParticles';
import { Trees } from './Trees';
import { Decor } from './Decor';
import { Puddles } from './Puddles';
import { Weather } from './Weather';

const outerGround = patchMaterial(new MeshStandardMaterial({ roughness: 1 }), { snow: true });

export function World() {
  const location = useGame((s) => s.game?.player.location ?? null);
  const grid = useGame((s) => (s.game ? s.game.maps[s.game.player.location] : null));
  const season = useGame((s) => s.game?.calendar.season ?? 'spring');
  if (!grid || !location) return null;
  const outdoor = location === 'farm';
  return (
    <>
      <SunLight />
      {location === 'farm' ? <Sky /> : <color attach="background" args={['#2a1f17']} />}
      {location === 'farm' ? (
        <mesh
          position={[grid.width / 2, -0.21, grid.height / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[grid.width + 160, grid.height + 160]} />
          <primitive object={outerGround} attach="material" color={paletteFor(season, 5).grass} />
        </mesh>
      ) : null}
      <SeasonDriver />
      <Tiles grid={grid} season={season} />
      {outdoor && <Grass grid={grid} season={season} />}
      {outdoor && <Trees grid={grid} season={season} />}
      {outdoor && <Decor grid={grid} season={season} />}
      {outdoor && <SeasonParticles season={season} />}
      {outdoor && <Puddles grid={grid} />}
      <Weather />
      <Suspense fallback={<Crops grid={grid} />}>
        <Crops grid={grid} modelMode />
        <CropModels grid={grid} />
      </Suspense>
      {location === 'farm' ? <Features grid={grid} /> : <HouseInterior grid={grid} />}
      <Player />
      <TargetHighlight />
      <LessonMarker />
      <FxLayer />
      <Kindling />
      <CameraRig />
    </>
  );
}
