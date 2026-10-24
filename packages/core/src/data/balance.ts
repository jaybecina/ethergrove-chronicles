import type { ToolId } from '../types';

export const BALANCE = {
  startGold: 500,
  startTurnipSeeds: 6,
  maxStamina: 100,
  staminaLowAt: 20,
  bagSlots: 12,
  stackMax: 99,
  canCharges: 20,
  dayStartMinute: 360,
  passOutMinute: 1560,
  seasonDays: 28,
  passOutGoldPct: 0.1,
  passOutGoldCap: 1000,
  tilledRevertChance: 0.1,
  /** tiles per second */
  walkSpeed: 2.6,
  /** tiles per second while run is held (never when exhausted) */
  runSpeed: 4.6,
  exhaustedSpeedFactor: 0.6,
  playerRadius: 0.3,
  missCostsStamina: true as boolean,
  cartOpen: 540,
  cartClose: 1020,
  axeHits: 3,
  hammerHits: 2,
  obstacleWeed: 0.3,
  obstacleRock: 0.1,
  obstacleStump: 0.05,
} as const;

export const TOOL_ORDER: readonly ToolId[] = ['hoe', 'can', 'sickle', 'axe', 'hammer'];

export const TOOL_COST: Record<ToolId, number> = { hoe: 2, can: 2, sickle: 1, axe: 4, hammer: 4 };
