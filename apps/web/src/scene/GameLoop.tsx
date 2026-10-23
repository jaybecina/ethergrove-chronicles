import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { STEP_MS } from '../game/config';
import { advanceAccumulator, createStepper } from '../game/loop';
import { gameStore } from '../game/store';
import { createActionGate } from '../input/actionGate';
import { getInputSystem } from '../input/system';
import { intentsToCommands } from '../input/toCommands';
import type { Intents } from '../input/intents';

const NAV_KEY = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
} as const;

/** Gamepad d-pad / A / B drive menus by replaying them as keyboard input on the focused element. */
function menuKeys(intents: Intents) {
  const target = (document.activeElement as HTMLElement | null) ?? document.body;
  if (intents.nav)
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: NAV_KEY[intents.nav], bubbles: true }),
    );
  const s = gameStore.getState();
  const inMenu = s.overlay !== null || s.screen !== 'game';
  if (intents.confirm && inMenu && target instanceof HTMLButtonElement) target.click();
  if (intents.back && s.overlay) s.setOverlay(null);
}

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
      s.setDevice(intents.device);
      if (intents.nav || intents.confirm || intents.back) menuKeys(intents);
      if (s.screen !== 'game' || !s.game) continue;
      if (intents.menu) s.toggleMenu();
      if (!s.isClockRunning()) continue;
      if (intents.rotate !== 0) s.rotateCamera(intents.rotate);
      if (intents.zoom !== 0) s.zoom(intents.zoom);
      stepper(intentsToCommands(intents, s.game, s.cameraYaw, gate, now.current));
    }
  });
  return null;
}
