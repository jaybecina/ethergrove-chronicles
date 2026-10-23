import { Canvas } from '@react-three/fiber';
import { GameLoop } from './GameLoop';
import { World } from './World';

export function GameCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 40, near: 0.1, far: 300, position: [15, 12, 32] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <GameLoop />
      <World />
    </Canvas>
  );
}
