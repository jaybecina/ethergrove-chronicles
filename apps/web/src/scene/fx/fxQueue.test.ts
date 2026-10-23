import { describe, expect, it } from 'vitest';
import { fxFromEvents } from './fxQueue';

describe('fxFromEvents', () => {
  it('maps gameplay events to effects', () => {
    expect(
      fxFromEvents([
        { type: 'tileTilled', x: 1, y: 2 },
        { type: 'cropWatered', x: 3, y: 4 },
        { type: 'tileCleared', x: 5, y: 6 },
        { type: 'cropHarvested', x: 7, y: 8, crop: 'turnip' },
      ]),
    ).toEqual([
      { kind: 'dust', x: 1, y: 2 },
      { kind: 'splash', x: 3, y: 4 },
      { kind: 'leafPuff', x: 5, y: 6 },
      { kind: 'sparkle', x: 7, y: 8 },
      { kind: 'float', x: 7, y: 8, text: '+1 Turnip' },
    ]);
  });

  it('axe and hammer hits throw chips; misses and other tools do not', () => {
    expect(fxFromEvents([{ type: 'toolUsed', tool: 'axe', x: 1, y: 1, hit: true }])).toEqual([
      { kind: 'chips', x: 1, y: 1 },
    ]);
    expect(fxFromEvents([{ type: 'toolUsed', tool: 'hammer', x: 2, y: 2, hit: true }])).toEqual([
      { kind: 'chips', x: 2, y: 2 },
    ]);
    expect(fxFromEvents([{ type: 'toolUsed', tool: 'axe', x: 1, y: 1, hit: false }])).toEqual([]);
    expect(fxFromEvents([{ type: 'toolUsed', tool: 'hoe', x: 1, y: 1, hit: true }])).toEqual([]);
  });

  it('uses display names in float text', () => {
    expect(fxFromEvents([{ type: 'cropHarvested', x: 0, y: 0, crop: 'eggplant' }])[1]).toEqual({
      kind: 'float',
      x: 0,
      y: 0,
      text: '+1 Eggplant',
    });
  });

  it('ignores unrelated events', () => {
    expect(fxFromEvents([{ type: 'canRefilled' }, { type: 'staminaLow' }])).toEqual([]);
  });
});
