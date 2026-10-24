export const CORE_VERSION = 1 as const;

export type * from './types';
export { BALANCE, TOOL_COST, TOOL_ORDER } from './data/balance';
export { CROPS, CROP_IDS, type CropDef } from './data/crops';
export { ITEMS, cropOfSeed, seedOf, type ItemDef } from './data/items';
export { FARM_LAYOUT, FIELD_RECT, HOUSE_LAYOUT } from './data/layouts';
export { LESSON_GOAL, LESSON_ORDER, LESSONS_GIFT, NOTE_IDS } from './data/lessons';
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
export { cropStage, isMature, type CropStage } from './systems/crops';
export { rollWeather } from './systems/weather';
export { cartStock, isCartOpen, sellPrice } from './systems/economy';
export { endDay } from './systems/day';
export { resolveSecondary } from './systems/interact';
export { CURRENT_SAVE_VERSION, MIGRATIONS, makeSaveFile, migrate } from './save/migrate';
export type { Migration, MigrateResult } from './save/migrate';
export { gameStateSchema, saveFileSchema } from './save/schema';
export type {
  LoadResult,
  SaveFile,
  SaveRepository,
  SaveSlotSummary,
  SaveSummary,
  SlotId,
} from './save/repository';
