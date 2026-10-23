import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { STEP_MS } from '../game/config';
import { advanceAccumulator, createStepper } from '../game/loop';
import { gameStore } from '../game/store';
import { createActionGate } from '../input/actionGate';
import { createResumeGuard } from '../input/resumeGuard';
import { getInputSystem } from '../input/system';
import { intentsToCommands } from '../input/toCommands';
import { applyMenuIntent } from '../input/menuIntents';

/** Runs the fixed-step simulation inside the render loop. */
export function GameLoop() {
  const acc = useRef(0);
  const now = useRef(0);
  const stepper = useMemo(() => createStepper(gameStore), []);
  const gate = useMemo(() => createActionGate(), []);
  const resume = useMemo(() => createResumeGuard(), []);

  useFrame((_, delta) => {
    const { steps, accMs } = advanceAccumulator(acc.current, delta * 1000);
    acc.current = accMs;
    const { mapper } = getInputSystem();
    for (let i = 0; i < steps; i++) {
      now.current += STEP_MS;
      const intents = mapper.read();
      const s = gameStore.getState();
      s.setDevice(intents.device);
      if (intents.nav || intents.confirm || intents.back) applyMenuIntent(intents, gameStore);
      if (s.screen !== 'game' || !s.game) continue;
      if (intents.menu) s.toggleMenu();
      const primary = resume.filter(intents.primary, s.isClockRunning());
      if (!s.isClockRunning()) continue;
      if (intents.rotate !== 0) s.rotateCamera(intents.rotate);
      if (intents.zoom !== 0) s.zoom(intents.zoom);
      stepper(intentsToCommands({ ...intents, primary }, s.game, s.cameraYaw, gate, now.current));
    }
  });
  return null;
}
