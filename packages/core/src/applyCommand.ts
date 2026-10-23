import { advanceMinutes, shouldPassOut } from './systems/calendar';
import { endDay, sleep } from './systems/day';
import { assignQuickSlot, cycleHotbar, moveBagItem, prunePins, selectHotbar } from './systems/bag';
import { stepMovement } from './systems/movement';
import { useTool } from './systems/tools';
import { useItem } from './systems/crops';
import { buyItem, shipItem, unshipItem } from './systems/economy';
import { interact } from './systems/interact';
import { checkMilestones } from './systems/milestones';
import type { Command, GameState, Result } from './types';

const only = (state: GameState): Result => ({ state, events: [] });

function dispatch(state: GameState, cmd: Command): Result {
  switch (cmd.type) {
    case 'tick': {
      const next = { ...state, calendar: advanceMinutes(state.calendar, cmd.minutes) };
      return shouldPassOut(next.calendar) ? endDay(next, 'passOut') : only(next);
    }
    case 'sleep':
      return sleep(state);
    case 'interact':
      return interact(state);
    case 'move':
      return only(stepMovement(state, cmd.dx, cmd.dz, cmd.dtMs));
    case 'selectHotbar':
      return only(selectHotbar(state, cmd.index));
    case 'cycleHotbar':
      return only(cycleHotbar(state, cmd.dir));
    case 'moveBagItem':
      return only(moveBagItem(state, cmd.from, cmd.to));
    case 'assignQuickSlot':
      return only(assignQuickSlot(state, cmd.slot, cmd.bagIndex));
    case 'useTool':
      return useTool(state);
    case 'useItem':
      return useItem(state);
    case 'shipItem':
      return shipItem(state, cmd.bagIndex, cmd.qty);
    case 'unshipItem':
      return unshipItem(state, cmd.binIndex, cmd.qty);
    case 'buyItem':
      return buyItem(state, cmd.itemId, cmd.qty);
  }
}

export function applyCommand(state: GameState, cmd: Command): Result {
  const result = dispatch(state, cmd);
  const next = result.state.bag === state.bag ? result.state : prunePins(result.state);
  return checkMilestones(state, next, result.events);
}
