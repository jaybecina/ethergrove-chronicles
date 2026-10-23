import { BALANCE, TOOL_COST } from '../data/balance';
import { setTile, tileAt } from '../grid';
import { currentGrid, withGrid } from '../state';
import type { GameEvent, GameState, ItemId, Result, Tile, ToolId } from '../types';
import { activeTool, addItem } from './bag';
import { targetTile } from './movement';

export function spendStamina(state: GameState, cost: number): Result {
  const before = state.player.stamina;
  const stamina = Math.max(0, before - cost);
  const events: GameEvent[] = [];
  if (before > BALANCE.staminaLowAt && stamina <= BALANCE.staminaLowAt)
    events.push({ type: 'staminaLow' });
  if (before > 0 && stamina === 0) events.push({ type: 'exhausted' });
  return { state: { ...state, player: { ...state.player, stamina } }, events };
}

/** What a tool does to a tile: the new tile, an optional drop, and side effects. */
interface Effect {
  tile: Tile;
  drop?: { item: ItemId; qty: number };
  events?: GameEvent[];
  charges?: number;
}

function effectOf(tool: ToolId, tile: Tile, x: number, y: number, state: GameState): Effect | null {
  const hits = (tile.hits ?? 0) + 1;
  switch (tool) {
    case 'hoe':
      return tile.kind === 'grass'
        ? { tile: { kind: 'tilled', watered: false }, events: [{ type: 'tileTilled', x, y }] }
        : null;
    case 'can':
      return tile.kind === 'tilled'
        ? {
            tile: { ...tile, watered: true },
            charges: state.canCharges - 1,
            events: [{ type: 'cropWatered', x, y }],
          }
        : null;
    case 'sickle':
      return tile.kind === 'weed'
        ? { tile: { kind: 'grass' }, drop: { item: 'fiber', qty: 1 } }
        : null;
    case 'axe':
      if (tile.kind !== 'stump') return null;
      return hits >= BALANCE.axeHits
        ? { tile: { kind: 'grass' }, drop: { item: 'wood', qty: 4 } }
        : { tile: { ...tile, hits } };
    case 'hammer':
      if (tile.kind === 'tilled' && !tile.crop) return { tile: { kind: 'grass' } };
      if (tile.kind !== 'rock') return null;
      return hits >= BALANCE.hammerHits
        ? { tile: { kind: 'grass' }, drop: { item: 'stone', qty: 2 } }
        : { tile: { ...tile, hits } };
  }
}

const fail = (state: GameState, reason: 'noStamina' | 'canEmpty' | 'bagFull'): Result => ({
  state,
  events: [{ type: 'actionFailed', reason }],
});

export function useTool(state: GameState): Result {
  const tool = activeTool(state);
  if (!tool) return { state, events: [] };
  if (state.player.stamina <= 0) return fail(state, 'noStamina');
  const { x, y } = targetTile(state.player);
  const tile = tileAt(currentGrid(state), x, y);

  if (tool === 'can' && tile?.kind === 'water') {
    return {
      state: { ...state, canCharges: BALANCE.canCharges },
      events: [{ type: 'toolUsed', tool, x, y, hit: true }, { type: 'canRefilled' }],
    };
  }
  if (tool === 'can' && state.canCharges <= 0) return fail(state, 'canEmpty');

  const effect = tile ? effectOf(tool, tile, x, y, state) : null;
  if (!effect) {
    const miss: GameEvent = { type: 'toolUsed', tool, x, y, hit: false };
    if (!BALANCE.missCostsStamina) return { state, events: [miss] };
    const spent = spendStamina(state, TOOL_COST[tool]);
    return { state: spent.state, events: [miss, ...spent.events] };
  }

  let next = withGrid(state, setTile(currentGrid(state), x, y, effect.tile));
  const events: GameEvent[] = [
    { type: 'toolUsed', tool, x, y, hit: true },
    ...(effect.events ?? []),
  ];
  if (effect.drop) {
    const { bag, overflow } = addItem(state.bag, effect.drop.item, effect.drop.qty);
    if (overflow > 0) return fail(state, 'bagFull');
    next = { ...next, bag };
    events.push({ type: 'tileCleared', x, y }, { type: 'itemGained', ...effect.drop });
  }
  if (effect.charges !== undefined) next = { ...next, canCharges: effect.charges };
  const spent = spendStamina(next, TOOL_COST[tool]);
  return { state: spent.state, events: [...events, ...spent.events] };
}
