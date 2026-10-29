import { resolveSecondary, type Command, type GameState } from '@ethergrove/core';
import { STEP_MS } from '../game/config';
import type { Intents } from './intents';
import { cameraRelative } from './mapper';

export function intentsToCommands(
  intents: Intents,
  state: GameState,
  yawSteps: 0 | 1 | 2 | 3,
  gate: { allow(pressed: boolean, nowMs: number): boolean },
  nowMs: number,
): Command[] {
  const cmds: Command[] = [];
  if (intents.hotbar !== null) cmds.push({ type: 'selectHotbar', index: intents.hotbar });
  if (intents.cycle !== 0) cmds.push({ type: 'cycleHotbar', dir: intents.cycle });
  const m = cameraRelative(intents.move, yawSteps);
  cmds.push({ type: 'move', dx: m.x, dz: m.z, dtMs: STEP_MS, run: intents.run });
  if (gate.allow(intents.primary, nowMs))
    cmds.push({ type: state.activeSlot <= 4 ? 'useTool' : 'useItem' });
  if (intents.secondary) {
    const action = resolveSecondary(state);
    if (action) cmds.push({ type: action });
  }
  return cmds;
}
