import { gameStore } from '../game/store';
import { createGamepadSource } from './gamepad';
import { createKeyboardSource } from './keyboard';
import { createInputMapper } from './mapper';
import { createTouchSource, type TouchSource } from './touch';

export interface InputSystem {
  mapper: ReturnType<typeof createInputMapper>;
  touch: TouchSource;
}

let system: InputSystem | null = null;

/** One shared input system for the whole app (touch UI and the game loop both use it). */
export function getInputSystem(): InputSystem {
  if (!system) {
    const touch = createTouchSource();
    // Fingers lifted while the page was hidden never send pointerup.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) touch.reset();
    });
    system = {
      touch,
      mapper: createInputMapper([
        createKeyboardSource(window, {
          capture: () => {
            const s = gameStore.getState();
            return s.screen === 'game' && s.overlay === null;
          },
        }),
        createGamepadSource(),
        touch,
      ]),
    };
  }
  return system;
}
