export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow';
export type CropId =
  'turnip' | 'potato' | 'strawberry' | 'tomato' | 'corn' | 'melon' | 'pumpkin' | 'eggplant';
export type SeedId = `seed:${CropId}`;
export type ItemId = SeedId | CropId | 'fiber' | 'wood' | 'stone';
export type ToolId = 'hoe' | 'can' | 'sickle' | 'axe' | 'hammer';
export type Facing = 'n' | 's' | 'e' | 'w';
export type LocationId = 'farm' | 'house';
export type FeatureId = 'houseDoor' | 'exitDoor' | 'bin' | 'bed' | 'cart';
export type TileKind =
  | 'grass'
  | 'path'
  | 'weed'
  | 'rock'
  | 'stump'
  | 'tilled'
  | 'water'
  | 'building'
  | 'fence'
  | 'wall'
  | 'floor'
  | 'feature';

export interface CropState {
  id: CropId;
  age: number;
  regrowing: boolean;
}
export interface Tile {
  kind: TileKind;
  feature?: FeatureId;
  hits?: number;
  watered?: boolean;
  crop?: CropState;
}
/** Row-major: index = y * width + x. */
export interface Grid {
  width: number;
  height: number;
  tiles: Tile[];
}
/** day 1..28, minute since 00:00 (may exceed 1440 after midnight). */
export interface Calendar {
  year: number;
  season: Season;
  day: number;
  minute: number;
}
export interface ItemStack {
  id: ItemId;
  qty: number;
}
/** 0..4 tools (TOOL_ORDER), 5..7 quick slots. */
export type HotbarIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface PlayerState {
  location: LocationId;
  x: number;
  z: number;
  facing: Facing;
  stamina: number;
}
export type MilestoneId =
  | 'firstTill'
  | 'firstPlant'
  | 'firstHarvest'
  | 'firstShipment'
  | 'gold1k'
  | 'gold10k'
  | 'allCrops'
  | 'fullYear';

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  farmName: string;
  playerName: string;
  calendar: Calendar;
  weather: { today: Weather; tomorrow: Weather };
  player: PlayerState;
  canCharges: number;
  activeSlot: HotbarIndex;
  selectedQuick: 0 | 1 | 2;
  /** Bag indexes pinned to hotbar slots 5..7. */
  quickSlots: [number | null, number | null, number | null];
  bag: (ItemStack | null)[];
  bin: ItemStack[];
  gold: number;
  pendingGold: number;
  wakeHalfStamina: boolean;
  maps: Record<LocationId, Grid>;
  milestones: MilestoneId[];
  harvested: Partial<Record<CropId, number>>;
}

export type Command =
  | { type: 'tick'; minutes: number }
  | { type: 'move'; dx: number; dz: number; dtMs: number }
  | { type: 'selectHotbar'; index: HotbarIndex }
  | { type: 'cycleHotbar'; dir: 1 | -1 }
  | { type: 'useTool' }
  | { type: 'useItem' }
  | { type: 'interact' }
  | { type: 'shipItem'; bagIndex: number; qty: number }
  | { type: 'unshipItem'; binIndex: number; qty: number }
  | { type: 'buyItem'; itemId: SeedId; qty: number }
  | { type: 'sleep' }
  | { type: 'moveBagItem'; from: number; to: number }
  | { type: 'assignQuickSlot'; slot: 0 | 1 | 2; bagIndex: number | null };

export type FailReason =
  | 'noStamina'
  | 'canEmpty'
  | 'bagFull'
  | 'notEnoughGold'
  | 'wrongSeason'
  | 'cartClosed'
  | 'noTarget'
  | 'noItem'
  | 'notSellable'
  | 'notHere';

export type GameEvent =
  | { type: 'toolUsed'; tool: ToolId; x: number; y: number; hit: boolean }
  | { type: 'tileTilled' | 'cropWatered' | 'tileCleared'; x: number; y: number }
  | { type: 'canRefilled' }
  | {
      type: 'cropPlanted' | 'cropHarvested' | 'cropDied' | 'cropGrew';
      x: number;
      y: number;
      crop: CropId;
    }
  | { type: 'itemGained'; item: ItemId; qty: number }
  | { type: 'itemEaten'; item: CropId; stamina: number }
  | { type: 'staminaLow' | 'exhausted' | 'passedOut' }
  | { type: 'dayStarted'; calendar: Calendar }
  | { type: 'seasonChanged'; season: Season }
  | { type: 'weatherChanged'; weather: Weather }
  | { type: 'goldChanged'; gold: number; delta: number }
  | { type: 'shippingReport'; items: ItemStack[]; total: number }
  | { type: 'milestoneReached'; id: MilestoneId }
  | { type: 'locationChanged'; location: LocationId }
  | { type: 'openUi'; ui: 'bin' | 'cart' | 'sleep' }
  | { type: 'actionFailed'; reason: FailReason };

export interface Result {
  state: GameState;
  events: GameEvent[];
}
export interface NewGameOptions {
  seed: number;
  farmName: string;
  playerName: string;
}
