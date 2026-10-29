import {
  ITEMS,
  activeTool,
  cropOfSeed,
  isMature,
  quickItem,
  resolveSecondary,
  targetTile,
  tileAt,
  type GameState,
  type ItemId,
  type ToolId,
} from '@ethergrove/core';

const TOOL_NAMES: Record<ToolId, string> = {
  hoe: 'Hoe',
  can: 'Watering Can',
  sickle: 'Sickle',
  axe: 'Axe',
  hammer: 'Hammer',
};

const ITEM_NAMES: Record<string, string> = {
  fiber: 'Fiber',
  wood: 'Wood',
  stone: 'Stone',
  turnip: 'Turnip',
  potato: 'Potato',
  strawberry: 'Strawberry',
  tomato: 'Tomato',
  corn: 'Corn',
  melon: 'Melon',
  pumpkin: 'Pumpkin',
  eggplant: 'Eggplant',
};

export function displayName(id: ItemId | ToolId): string {
  if (id in TOOL_NAMES) return TOOL_NAMES[id as ToolId];
  const crop = cropOfSeed(id as ItemId);
  if (crop) return `${ITEM_NAMES[crop] ?? crop} Seeds`;
  return ITEM_NAMES[id] ?? id;
}

type Verb =
  | 'Till'
  | 'Water'
  | 'Refill'
  | 'Cut'
  | 'Chop'
  | 'Break'
  | 'Plant'
  | 'Harvest'
  | 'Ship'
  | 'Sleep'
  | 'Enter'
  | 'Exit'
  | 'Shop'
  | 'Eat';

function toolVerb(state: GameState): Verb | null {
  const tool = activeTool(state);
  if (!tool) return null;
  const { x, y } = targetTile(state.player);
  const t = tileAt(state.maps[state.player.location], x, y);
  if (!t) return null;
  if (tool === 'hoe' && t.kind === 'grass') return 'Till';
  if (tool === 'can' && t.kind === 'water') return 'Refill';
  if (tool === 'can' && t.kind === 'tilled') return 'Water';
  if (tool === 'sickle' && t.kind === 'weed') return 'Cut';
  if (tool === 'sickle' && t.crop && isMature(t.crop)) return 'Harvest';
  if (tool === 'axe' && t.kind === 'stump') return 'Chop';
  if (tool === 'hammer' && t.kind === 'rock') return 'Break';
  return null;
}

function secondaryVerb(state: GameState): Verb | null {
  const action = resolveSecondary(state);
  if (action === 'useItem') {
    const q = quickItem(state);
    return q && ITEMS[q.stack.id].kind === 'seed' ? 'Plant' : 'Eat';
  }
  if (action !== 'interact') return null;
  const { x, y } = targetTile(state.player);
  const t = tileAt(state.maps[state.player.location], x, y);
  const byFeature = {
    houseDoor: 'Enter',
    exitDoor: 'Exit',
    bin: 'Ship',
    bed: 'Sleep',
    cart: 'Shop',
  } as const;
  if (t?.feature) return byFeature[t.feature];
  return t?.kind === 'water' ? 'Refill' : 'Harvest';
}

/** Verbs for the primary (tool) and secondary (interact/plant/eat) buttons right now. */
export function promptsFor(state: GameState): { primary: Verb | null; secondary: Verb | null } {
  return { primary: toolVerb(state), secondary: secondaryVerb(state) };
}

export function promptFor(state: GameState): Verb | null {
  const p = promptsFor(state);
  return p.primary ?? p.secondary;
}
