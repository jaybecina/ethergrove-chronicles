import { BALANCE } from '../data/balance';
import { HOUSE_LAYOUT, HOUSE_SPAWN_CHAR } from '../data/layouts';
import { findChar } from '../grid';
import { nextFloat } from '../rng';
import type { GameEvent, GameState, Grid, Result } from '../types';
import { nextDay } from './calendar';
import { growCrops, killOutOfSeason } from './crops';
import { sellBin } from './economy';
import { rollWeather } from './weather';

function dryAndRain(grid: Grid, wet: boolean): Grid {
  const tiles = grid.tiles.map((t) => (t.kind === 'tilled' ? { ...t, watered: wet } : t));
  return { ...grid, tiles };
}

function revertBareSoil(grid: Grid, rng: number): [Grid, number] {
  let r = rng;
  const tiles = grid.tiles.map((t) => {
    if (t.kind !== 'tilled' || t.crop || t.watered) return t;
    const [v, next] = nextFloat(r);
    r = next;
    return v < BALANCE.tilledRevertChance ? { kind: 'grass' as const } : t;
  });
  return [{ ...grid, tiles }, r];
}

/** Overnight processing, in the order fixed by spec §3.2. */
export function endDay(state: GameState, reason: 'sleep' | 'passOut'): Result {
  const events: GameEvent[] = [];
  let s = state;

  if (reason === 'passOut') {
    const loss = Math.min(Math.floor(s.gold * BALANCE.passOutGoldPct), BALANCE.passOutGoldCap);
    s = { ...s, gold: s.gold - loss, wakeHalfStamina: true };
    events.push({ type: 'passedOut' });
    if (loss > 0) events.push({ type: 'goldChanged', gold: s.gold, delta: -loss });
  }

  // 1. Sell the shipping bin.
  const sold = sellBin(s);
  s = sold.state;
  events.push({ type: 'shippingReport', items: sold.items, total: sold.total });

  // 2. Grow watered crops.
  const grown = growCrops(s.maps.farm);
  let farm = grown.grid;
  events.push(...grown.events);

  // 3. Advance the date; kill out-of-season crops on a season change.
  const calendar = nextDay(s.calendar);
  if (calendar.season !== s.calendar.season) {
    const killed = killOutOfSeason(farm, calendar.season);
    farm = killed.grid;
    events.push({ type: 'seasonChanged', season: calendar.season }, ...killed.events);
  }

  // 4. Weather: today becomes the forecast; roll a new forecast.
  const today = s.weather.tomorrow;
  const following = nextDay(calendar);
  const [tomorrow, rngAfterWeather] = rollWeather(following.season, following.day, s.rng);
  events.push({ type: 'weatherChanged', weather: today });

  // 7. Bare soil left unwatered today may revert. Eligibility uses today's water,
  // so it is decided before step 5 dries the field and tomorrow's rain re-wets it.
  const [reverted, rng] = revertBareSoil(farm, rngAfterWeather);

  // 5. Dry all soil; rain and storms water it.
  farm = dryAndRain(reverted, today === 'rain' || today === 'storm');

  // 6. Restore stamina and credit gold.
  const stamina = s.wakeHalfStamina ? BALANCE.maxStamina / 2 : BALANCE.maxStamina;
  const gold = s.gold + s.pendingGold;
  if (s.pendingGold > 0) events.push({ type: 'goldChanged', gold, delta: s.pendingGold });

  const spawn = findChar(HOUSE_LAYOUT, HOUSE_SPAWN_CHAR);
  const next: GameState = {
    ...s,
    rng,
    calendar,
    weather: { today, tomorrow },
    gold,
    pendingGold: 0,
    wakeHalfStamina: false,
    maps: { ...s.maps, farm },
    player: { location: 'house', x: spawn.x + 0.5, z: spawn.y + 0.5, facing: 's', stamina },
  };
  events.push({ type: 'dayStarted', calendar });
  return { state: next, events };
}

export function sleep(state: GameState): Result {
  if (state.player.location !== 'house')
    return { state, events: [{ type: 'actionFailed', reason: 'notHere' }] };
  return endDay(state, 'sleep');
}
