import { describe, expect, it } from 'vitest';
import { CROPS } from '../src/data/crops';
import { FIELD_RECT } from '../src/data/layouts';
import { findFeature, setTile } from '../src/grid';
import { lessonSlot, lessonTarget } from '../src/systems/tutorial';
import type { GameState, Tile } from '../src/types';
import { blankFarm, fresh, lessonAt, standAt, withTile } from './helpers';

const crop = (age = 0, watered = false): Tile => ({
  kind: 'tilled',
  watered,
  crop: { id: 'turnip', age, regrowing: false },
});
/** Field with no grass (all path) so tests place exactly the tiles they need. */
function bareField(s: GameState): GameState {
  const r: Record<'x0' | 'y0' | 'x1' | 'y1', number> = FIELD_RECT;
  let farm = s.maps.farm;
  for (let y = r.y0; y <= r.y1; y++)
    for (let x = r.x0; x <= r.x1; x++) farm = setTile(farm, x, y, { kind: 'path' });
  return { ...s, maps: { ...s.maps, farm } };
}
const at = (x: number, y: number) => standAt(bareField(blankFarm(fresh())), x, y, 'e');
const inHouse = (s: GameState): GameState => ({
  ...s,
  player: { ...s.player, location: 'house' },
});

describe('lessonTarget', () => {
  it('walkToField and till point at the nearest field grass', () => {
    const s = withTile(withTile(at(10, 10), 20, 10, { kind: 'grass' }), 12, 12, { kind: 'grass' });
    expect(lessonTarget(lessonAt(s, 'walkToField'))).toEqual({ location: 'farm', x: 12, y: 12 });
    expect(lessonTarget(lessonAt(s, 'till'))).toEqual({ location: 'farm', x: 12, y: 12 });
  });

  it('breaks distance ties by lower y, then lower x', () => {
    let s = at(10, 10);
    for (const [x, y] of [
      [11, 10],
      [9, 10],
      [10, 11],
    ] as const)
      s = withTile(s, x, y, { kind: 'grass' });
    expect(lessonTarget(lessonAt(s, 'till'))).toEqual({ location: 'farm', x: 9, y: 10 });
  });

  it('plant points at empty tilled soil, else at grass', () => {
    const s = withTile(withTile(at(10, 10), 14, 10, { kind: 'tilled' }), 11, 10, { kind: 'grass' });
    expect(lessonTarget(lessonAt(s, 'plant'))).toEqual({ location: 'farm', x: 14, y: 10 });
    const noSoil = withTile(at(10, 10), 11, 10, { kind: 'grass' });
    expect(lessonTarget(lessonAt(noSoil, 'plant'))).toEqual({ location: 'farm', x: 11, y: 10 });
  });

  it('water lessons point at the nearest dry crop, or nothing', () => {
    const s = withTile(withTile(at(10, 10), 11, 10, crop(0, true)), 13, 10, crop());
    expect(lessonTarget(lessonAt(s, 'water'))).toEqual({ location: 'farm', x: 13, y: 10 });
    expect(lessonTarget(lessonAt(s, 'waterDaily'))).toEqual({ location: 'farm', x: 13, y: 10 });
    const wet = withTile(at(10, 10), 11, 10, crop(0, true));
    expect(lessonTarget(lessonAt(wet, 'water'))).toBeNull();
  });

  it('harvest points at a ripe crop, or nothing before one is ripe', () => {
    const young = withTile(at(10, 10), 11, 10, crop(1));
    expect(lessonTarget(lessonAt(young, 'harvest'))).toBeNull();
    const ripe = withTile(young, 15, 10, crop(CROPS.turnip.days));
    expect(lessonTarget(lessonAt(ripe, 'harvest'))).toEqual({ location: 'farm', x: 15, y: 10 });
  });

  it('ship, buySeeds, sleep and sellOvernight point at the bin, cart and bed', () => {
    const s = at(10, 10);
    const farm = s.maps.farm;
    expect(lessonTarget(lessonAt(s, 'ship'))).toEqual({
      location: 'farm',
      ...findFeature(farm, 'bin'),
    });
    expect(lessonTarget(lessonAt(s, 'buySeeds'))).toEqual({
      location: 'farm',
      ...findFeature(farm, 'cart'),
    });
    const house = inHouse(s);
    const bed = { location: 'house', ...findFeature(s.maps.house, 'bed') };
    expect(lessonTarget(lessonAt(house, 'sleep'))).toEqual(bed);
    expect(lessonTarget(lessonAt(house, 'sellOvernight'))).toEqual(bed);
  });

  it('points at the door when the target is on the other map', () => {
    const s = at(10, 10);
    expect(lessonTarget(lessonAt(s, 'sleep'))).toEqual({
      location: 'farm',
      ...findFeature(s.maps.farm, 'houseDoor'),
    });
    const house = inHouse(s);
    expect(lessonTarget(lessonAt(house, 'ship'))).toEqual({
      location: 'house',
      ...findFeature(s.maps.house, 'exitDoor'),
    });
  });

  it('is null when lessons are off or complete', () => {
    const s = at(10, 10);
    expect(lessonTarget(s)).toBeNull();
    expect(lessonTarget({ ...s, tutorial: { ...s.tutorial, lesson: 'complete' } })).toBeNull();
  });
});

describe('lessonSlot', () => {
  it('picks the tool for till, water and harvest', () => {
    expect(lessonSlot(lessonAt(fresh(), 'till'))).toBe(0);
    expect(lessonSlot(lessonAt(fresh(), 'water'))).toBe(1);
    expect(lessonSlot(lessonAt(fresh(), 'waterDaily'))).toBe(1);
    expect(lessonSlot(lessonAt(fresh(), 'harvest'))).toBe(2);
    expect(lessonSlot(lessonAt(fresh(), 'ship'))).toBeNull();
  });

  it('picks the pinned seed quick slot for plant', () => {
    const s = lessonAt(fresh(), 'plant');
    expect(lessonSlot(s)).toBe(5);
    expect(lessonSlot({ ...s, quickSlots: [null, null, 0] })).toBe(7);
    expect(lessonSlot({ ...s, quickSlots: [null, null, null] })).toBeNull();
  });
});
