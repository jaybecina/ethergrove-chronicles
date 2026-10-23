export const CORE_VERSION = 1 as const;

export type * from './types';
export { BALANCE, TOOL_COST, TOOL_ORDER } from './data/balance';
export { CROPS, CROP_IDS, type CropDef } from './data/crops';
export { ITEMS, cropOfSeed, seedOf, type ItemDef } from './data/items';
export { FARM_LAYOUT, HOUSE_LAYOUT } from './data/layouts';
export { WEATHER_TABLE } from './data/weatherTable';
export { nextFloat } from './rng';
export { findFeature, isBlocked, parseLayout, setTile, tileAt } from './grid';
export { createNewGame } from './newGame';
export {
  SEASONS,
  advanceMinutes,
  formatClock,
  nextDay,
  shouldPassOut,
  weekday,
  type Weekday,
} from './systems/calendar';
export { activeTool, addItem, countOf, quickItem, removeAt } from './systems/bag';
export { stepMovement, targetTile } from './systems/movement';
export { applyCommand } from './applyCommand';
