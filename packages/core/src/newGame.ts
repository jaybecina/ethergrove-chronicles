import { BALANCE } from './data/balance';
import {
  FARM_LAYOUT,
  FARM_LEGEND,
  FARM_SPAWN_CHAR,
  HOUSE_LAYOUT,
  HOUSE_LEGEND,
} from './data/layouts';
import { findChar, parseLayout } from './grid';
import { nextFloat } from './rng';
import { rollWeather } from './systems/weather';
import type { GameState, Grid, NewGameOptions, Tile } from './types';

function rollObstacles(grid: Grid, rng: number): [Grid, number] {
  const tiles = grid.tiles.slice();
  let r = rng;
  FARM_LAYOUT.forEach((row, y) => {
    Array.from(row).forEach((ch, x) => {
      if (ch !== '.') return;
      const [v, next] = nextFloat(r);
      r = next;
      const { obstacleWeed: w, obstacleRock: k, obstacleStump: s } = BALANCE;
      const tile: Tile =
        v < w
          ? { kind: 'weed' }
          : v < w + k
            ? { kind: 'rock', hits: 0 }
            : v < w + k + s
              ? { kind: 'stump', hits: 0 }
              : { kind: 'grass' };
      tiles[y * grid.width + x] = tile;
    });
  });
  return [{ ...grid, tiles }, r];
}

export function createNewGame(opts: NewGameOptions): GameState {
  const [farm, afterMap] = rollObstacles(parseLayout(FARM_LAYOUT, FARM_LEGEND), opts.seed >>> 0);
  const [tomorrow, rng] = rollWeather('spring', 2, afterMap);
  const spawn = findChar(FARM_LAYOUT, FARM_SPAWN_CHAR);
  const bag: GameState['bag'] = Array.from({ length: BALANCE.bagSlots }, () => null);
  bag[0] = { id: 'seed:turnip', qty: BALANCE.startTurnipSeeds };
  return {
    version: 1,
    seed: opts.seed,
    rng,
    farmName: opts.farmName,
    playerName: opts.playerName,
    calendar: { year: 1, season: 'spring', day: 1, minute: BALANCE.dayStartMinute },
    weather: { today: 'sunny', tomorrow },
    player: {
      location: 'farm',
      x: spawn.x + 0.5,
      z: spawn.y + 0.5,
      facing: 'n',
      stamina: BALANCE.maxStamina,
    },
    canCharges: BALANCE.canCharges,
    activeSlot: 0,
    selectedQuick: 0,
    quickSlots: [0, null, null],
    bag,
    bin: [],
    gold: BALANCE.startGold,
    pendingGold: 0,
    wakeHalfStamina: false,
    maps: { farm, house: parseLayout(HOUSE_LAYOUT, HOUSE_LEGEND) },
    milestones: [],
    harvested: {},
  };
}
