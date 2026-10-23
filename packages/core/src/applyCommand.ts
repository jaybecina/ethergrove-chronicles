import { advanceMinutes } from './systems/calendar';
import { assignQuickSlot, cycleHotbar, moveBagItem, selectHotbar } from './systems/bag';
import { stepMovement } from './systems/movement';
import { useTool } from './systems/tools';
import { useItem } from './systems/crops';
import { buyItem, shipItem, unshipItem } from './systems/economy';
import type { Command, GameState, Result } from './types';

const only = (state: GameState): Result => ({ state, events: [] });

export function applyCommand(state: GameState, cmd: Command): Result {
  switch (cmd.type) {
    case 'tick':
      return only({ ...state, calendar: advanceMinutes(state.calendar, cmd.minutes) });
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
    default:
      return only(state);
  }
}
