import { cropOfSeed, type ItemId, type ToolId } from '@hearthvale/core';

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
