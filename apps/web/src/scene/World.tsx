import { useGame } from '../game/store';
import { SunLight } from '../render/SunLight';
import { CameraRig } from './CameraRig';
import { Sky } from './Sky';
import { Features } from './Features';
import { HouseInterior } from './HouseInterior';
import { Player } from './Player';
import { TargetHighlight } from './TargetHighlight';
import { Tiles } from './Tiles';
import { COLORS } from './palette';

export function World() {
  const location = useGame((s) => s.game?.player.location ?? null);
  const grid = useGame((s) => (s.game ? s.game.maps[s.game.player.location] : null));
  if (!grid || !location) return null;
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
          <meshStandardMaterial color={COLORS.grass} roughness={1} />
        </mesh>
      ) : null}
      <Tiles grid={grid} />
      {location === 'farm' ? <Features grid={grid} /> : <HouseInterior grid={grid} />}
      <Player />
      <TargetHighlight />
      <CameraRig />
    </>
  );
}
