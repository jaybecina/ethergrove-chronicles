import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { findFeature, tileAt } from '../src/grid';
import { endDay } from '../src/systems/day';
import type { GameState, Tile, Weather } from '../src/types';
import { blankFarm, fresh, withTile } from './helpers';

const turnip = (watered: boolean): Tile => ({
  kind: 'tilled',
  watered,
  crop: { id: 'turnip', age: 1, regrowing: false },
});
const inHouse = (s: GameState): GameState => ({ ...s, player: { ...s.player, location: 'house' } });
const tomorrow = (s: GameState, w: Weather): GameState => ({
  ...s,
  weather: { ...s.weather, tomorrow: w },
});
const sleep = (s: GameState) => endDay(s, 'sleep');

describe('endDay', () => {
  it('grows watered crops but not dry ones', () => {
    let s = withTile(blankFarm(fresh()), 10, 10, turnip(true));
    s = withTile(s, 11, 10, turnip(false));
    const next = sleep(s).state;
    expect(tileAt(next.maps.farm, 10, 10)?.crop?.age).toBe(2);
    expect(tileAt(next.maps.farm, 11, 10)?.crop?.age).toBe(1);
  });

  it('grows before the season change kills the crop', () => {
    let s = withTile(blankFarm(fresh()), 10, 10, turnip(true));
    s = { ...s, calendar: { ...s.calendar, day: 28 } };
    const { state, events } = sleep(s);
    expect(state.calendar).toEqual({ year: 1, season: 'summer', day: 1, minute: 360 });
    const types = events.map((e) => e.type);
    expect(types.indexOf('cropGrew')).toBeLessThan(types.indexOf('cropDied'));
    expect(events).toContainEqual({ type: 'seasonChanged', season: 'summer' });
    expect(tileAt(state.maps.farm, 10, 10)).toEqual({ kind: 'tilled', watered: false });
  });

  it('a rain day leaves every tilled tile watered at 6:00', () => {
    const s = tomorrow(
      withTile(blankFarm(fresh()), 10, 10, { kind: 'tilled', watered: false }),
      'rain',
    );
    const { state, events } = sleep(s);
    expect(state.weather.today).toBe('rain');
    expect(tileAt(state.maps.farm, 10, 10)?.watered).toBe(true);
    expect(events).toContainEqual({ type: 'weatherChanged', weather: 'rain' });
  });

  it('a sunny day leaves tilled tiles dry', () => {
    const s = tomorrow(withTile(blankFarm(fresh()), 10, 10, turnip(true)), 'sunny');
    expect(tileAt(sleep(s).state.maps.farm, 10, 10)?.watered).toBe(false);
  });

  it('rolls a fresh forecast for the following day', () => {
    const seen = new Set<Weather>();
    let s = fresh(3);
    for (let i = 0; i < 20; i++) {
      s = sleep(s).state;
      seen.add(s.weather.tomorrow);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('pass-out costs 10% gold and half stamina the next day only', () => {
    const s = { ...fresh(), gold: 5000 };
    const out = endDay(s, 'passOut');
    expect(out.state.gold).toBe(4500);
    expect(out.state.player.stamina).toBe(50);
    expect(out.events[0]).toEqual({ type: 'passedOut' });
    expect(out.state.wakeHalfStamina).toBe(false);
    expect(sleep(out.state).state.player.stamina).toBe(100);
  });

  it('pass-out loses at most 1000 gold', () => {
    expect(endDay({ ...fresh(), gold: 20_000 }, 'passOut').state.gold).toBe(19_000);
  });

  it('credits shipped goods the next morning with a report', () => {
    const s = { ...fresh(), bin: [{ id: 'turnip' as const, qty: 6 }] };
    const { state, events } = sleep(s);
    expect(state.gold).toBe(710);
    expect(state.pendingGold).toBe(0);
    expect(state.bin).toEqual([]);
    expect(events).toContainEqual({
      type: 'shippingReport',
      items: [{ id: 'turnip', qty: 6 }],
      total: 210,
    });
    expect(events).toContainEqual({ type: 'goldChanged', gold: 710, delta: 210 });
  });

  it('wakes in the house at 6:00 and ends with dayStarted', () => {
    const { state, events } = sleep(fresh());
    expect(state.player.location).toBe('house');
    expect(state.calendar.minute).toBe(360);
    expect(events.at(-1)).toEqual({ type: 'dayStarted', calendar: state.calendar });
  });

  it('Winter 28 rolls into Year 2 Spring 1', () => {
    const s = {
      ...fresh(),
      calendar: { year: 1, season: 'winter' as const, day: 28, minute: 1300 },
    };
    expect(sleep(s).state.calendar).toEqual({ year: 2, season: 'spring', day: 1, minute: 360 });
  });

  it('bare tilled soil may revert to grass, seeded', () => {
    let s = blankFarm(fresh(5));
    for (let y = 6; y < 9; y++)
      for (let x = 3; x < 28; x++) s = withTile(s, x, y, { kind: 'tilled', watered: false });
    const tiles = (st: GameState) =>
      Array.from(
        { length: 75 },
        (_, i) => tileAt(st.maps.farm, (i % 25) + 3, 6 + Math.floor(i / 25))?.kind,
      );
    const after = sleep(s).state;
    const reverted = tiles(after).filter((k) => k === 'grass').length;
    expect(reverted).toBeGreaterThan(0);
    expect(reverted).toBeLessThan(20);
    expect(tiles(sleep(s).state)).toEqual(tiles(after));
  });
});

describe('sleep and pass-out commands', () => {
  it('sleep works only inside the house', () => {
    expect(applyCommand(fresh(), { type: 'sleep' }).events).toEqual([
      { type: 'actionFailed', reason: 'notHere' },
    ]);
    expect(applyCommand(inHouse(fresh()), { type: 'sleep' }).state.calendar.day).toBe(2);
  });

  it('ticking past 26:00 triggers pass-out', () => {
    const s = { ...fresh(), calendar: { ...fresh().calendar, minute: 1550 } };
    const { state, events } = applyCommand(s, { type: 'tick', minutes: 10 });
    expect(events[0]).toEqual({ type: 'passedOut' });
    expect(state.calendar.day).toBe(2);
    expect(applyCommand(s, { type: 'tick', minutes: 9 }).state.calendar.minute).toBe(1559);
  });

  it('places the player on the house spawn after waking', () => {
    const { state } = applyCommand(inHouse(fresh()), { type: 'sleep' });
    const bed = findFeature(state.maps.house, 'bed');
    expect(Math.floor(state.player.z)).toBeGreaterThan(bed.y);
  });
});
