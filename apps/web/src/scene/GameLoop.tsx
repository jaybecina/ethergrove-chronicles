import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { STEP_MS } from '../game/config';
import { advanceAccumulator, createStepper } from '../game/loop';
import { gameStore } from '../game/store';
import { createActionGate } from '../input/actionGate';
import { getInputSystem } from '../input/system';
import { intentsToCommands } from '../input/toCommands';

/** Runs the fixed-step simulation inside the render loop. */
export function GameLoop() {
  const acc = useRef(0);
  const now = useRef(0);
  const stepper = useMemo(() => createStepper(gameStore), []);
  const gate = useMemo(() => createActionGate(), []);

  useFrame((_, delta) => {
    const { steps, accMs } = advanceAccumulator(acc.current, delta * 1000);
    acc.current = accMs;
    const { mapper } = getInputSystem();
    for (let i = 0; i < steps; i++) {
      now.current += STEP_MS;
      const intents = mapper.read();
      const s = gameStore.getState();
      if (s.screen !== 'game' || !s.game) continue;
      if (intents.menu) s.setOverlay(s.overlay ? null : 'pause');
      if (!s.isClockRunning()) continue;
      if (intents.rotate !== 0) s.rotateCamera(intents.rotate);
      if (intents.zoom !== 0) s.zoom(intents.zoom);
      stepper(intentsToCommands(intents, s.game, s.cameraYaw, gate, now.current));
    }
  });
  return null;
}
