import { describe, expect, it } from 'vitest';
import { FARM_LAYOUT, FARM_LEGEND, HOUSE_LAYOUT, HOUSE_LEGEND } from '../src/data/layouts';
import { findFeature, isBlocked, parseLayout, setTile, tileAt } from '../src/grid';

describe('layouts', () => {
  it('parses FARM_LAYOUT to 32x24', () => {
    const g = parseLayout(FARM_LAYOUT, FARM_LEGEND);
    expect([g.width, g.height, g.tiles.length]).toEqual([32, 24, 768]);
  });

  it('parses HOUSE_LAYOUT to 8x6', () => {
    const g = parseLayout(HOUSE_LAYOUT, HOUSE_LEGEND);
    expect([g.width, g.height]).toEqual([8, 6]);
  });

  it('rejects ragged rows and unknown characters', () => {
    expect(() => parseLayout(['##', '#'], FARM_LEGEND)).toThrow(RangeError);
    expect(() => parseLayout(['#?'], FARM_LEGEND)).toThrow(RangeError);
  });

  it('places every feature exactly once', () => {
    const farm = parseLayout(FARM_LAYOUT, FARM_LEGEND);
    const house = parseLayout(HOUSE_LAYOUT, HOUSE_LEGEND);
    expect(findFeature(farm, 'houseDoor')).toEqual({ x: 4, y: 4 });
    expect(findFeature(farm, 'bin')).toEqual({ x: 7, y: 4 });
    expect(findFeature(farm, 'cart')).toEqual({ x: 31, y: 17 });
    expect(findFeature(house, 'bed')).toEqual({ x: 6, y: 1 });
    expect(findFeature(house, 'exitDoor')).toEqual({ x: 3, y: 5 });
    expect(() => findFeature(house, 'cart')).toThrow(RangeError);
  });
});

describe('tile access', () => {
  const g = parseLayout(['#_', '~#'], FARM_LEGEND);

  it('tileAt returns undefined out of bounds', () => {
    expect(tileAt(g, 1, 0)).toEqual({ kind: 'path' });
    expect(tileAt(g, -1, 0)).toBeUndefined();
    expect(tileAt(g, 2, 0)).toBeUndefined();
    expect(tileAt(g, 0, 2)).toBeUndefined();
  });

  it('setTile does not mutate the source grid', () => {
    const next = setTile(g, 1, 0, { kind: 'tilled', watered: false });
    expect(tileAt(next, 1, 0)).toEqual({ kind: 'tilled', watered: false });
    expect(tileAt(g, 1, 0)).toEqual({ kind: 'path' });
    expect(() => setTile(g, 5, 5, { kind: 'grass' })).toThrow(RangeError);
  });

  it('isBlocked: rock/stump/water/fence/feature true; grass/weed/tilled false', () => {
    for (const kind of [
      'rock',
      'stump',
      'water',
      'building',
      'fence',
      'wall',
      'feature',
    ] as const) {
      expect(isBlocked({ kind })).toBe(true);
    }
    for (const kind of ['grass', 'path', 'weed', 'tilled', 'floor'] as const) {
      expect(isBlocked({ kind })).toBe(false);
    }
    expect(isBlocked(undefined)).toBe(true);
  });
});
