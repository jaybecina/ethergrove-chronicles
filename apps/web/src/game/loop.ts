import type { Command } from '@ethergrove/core';
import type { StoreApi } from 'zustand/vanilla';
import { GAME_MINUTES_PER_REAL_MS, MAX_FRAME_MS, STEP_MS } from './config';
import type { GameStore } from './store';

export { MAX_FRAME_MS, STEP_MS };

export function advanceAccumulator(
  accMs: number,
  frameMs: number,
): { steps: number; accMs: number } {
  const total = accMs + Math.min(Math.max(frameMs, 0), MAX_FRAME_MS);
  const steps = Math.floor(total / STEP_MS);
  return { steps, accMs: total - steps * STEP_MS };
}

/**
 * One fixed simulation step: apply this step's input commands and advance the clock.
 * Game minutes accumulate fractionally here so the core only ever sees whole-minute ticks.
 */
export function createStepper(store: StoreApi<GameStore>): (commands: readonly Command[]) => void {
  let minuteAcc = 0;
  return (commands) => {
    const s = store.getState();
    if (!s.isClockRunning()) return;
    for (const cmd of commands) s.dispatch(cmd);
    minuteAcc += STEP_MS * GAME_MINUTES_PER_REAL_MS;
    const whole = Math.floor(minuteAcc + 1e-9);
    if (whole > 0) {
      minuteAcc -= whole;
      s.dispatch({ type: 'tick', minutes: whole });
    }
    s.addPlayTime(STEP_MS);
  };
}
