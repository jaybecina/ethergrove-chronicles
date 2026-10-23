import { BALANCE } from '../data/balance';
import { HOUSE_LAYOUT, HOUSE_SPAWN_CHAR } from '../data/layouts';
import { ITEMS } from '../data/items';
import { findChar, findFeature, tileAt } from '../grid';
import { currentGrid } from '../state';
import type { GameState, Result, Tile } from '../types';
import { quickItem } from './bag';
import { harvestAt, isMature } from './crops';
import { isCartOpen } from './economy';
import { targetTile } from './movement';

const isInteractable = (tile: Tile | undefined): boolean =>
  tile !== undefined &&
  (tile.feature !== undefined ||
    tile.kind === 'water' ||
    (tile.crop !== undefined && isMature(tile.crop)));

export function interact(state: GameState): Result {
  const { x, y } = targetTile(state.player);
  const tile = tileAt(currentGrid(state), x, y);
  switch (tile?.feature) {
    case 'houseDoor': {
      const spawn = findChar(HOUSE_LAYOUT, HOUSE_SPAWN_CHAR);
      return {
        state: {
          ...state,
          player: {
            ...state.player,
            location: 'house',
            x: spawn.x + 0.5,
            z: spawn.y + 0.5,
            facing: 'n',
          },
        },
        events: [{ type: 'locationChanged', location: 'house' }],
      };
    }
    case 'exitDoor': {
      const door = findFeature(state.maps.farm, 'houseDoor');
      return {
        state: {
          ...state,
          player: {
            ...state.player,
            location: 'farm',
            x: door.x + 0.5,
            z: door.y + 1.5,
            facing: 's',
          },
        },
        events: [{ type: 'locationChanged', location: 'farm' }],
      };
    }
    case 'bin':
      return { state, events: [{ type: 'openUi', ui: 'bin' }] };
    case 'bed':
      return { state, events: [{ type: 'openUi', ui: 'sleep' }] };
    case 'cart':
      return isCartOpen(state)
        ? { state, events: [{ type: 'openUi', ui: 'cart' }] }
        : { state, events: [{ type: 'actionFailed', reason: 'cartClosed' }] };
    case undefined:
      break;
  }
  if (tile?.crop && isMature(tile.crop)) return harvestAt(state, x, y);
  if (tile?.kind === 'water')
    return {
      state: { ...state, canCharges: BALANCE.canCharges },
      events: [{ type: 'canRefilled' }],
    };
  return { state, events: [{ type: 'actionFailed', reason: 'noTarget' }] };
}

/** What the secondary button does right now (spec §5.3 order). */
export function resolveSecondary(state: GameState): 'interact' | 'useItem' | null {
  const { x, y } = targetTile(state.player);
  const tile = tileAt(currentGrid(state), x, y);
  if (isInteractable(tile)) return 'interact';
  const q = quickItem(state);
  if (!q) return null;
  const def = ITEMS[q.stack.id];
  if (def.kind === 'seed') return tile?.kind === 'tilled' && !tile.crop ? 'useItem' : null;
  return def.eat !== null ? 'useItem' : null;
}
