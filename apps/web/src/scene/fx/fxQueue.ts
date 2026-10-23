import type { GameEvent } from '@hearthvale/core';
import { displayName } from '../../ui/labels';

export type FxKind = 'dust' | 'splash' | 'chips' | 'sparkle' | 'leafPuff';
export type FxSpawn =
  { kind: FxKind; x: number; y: number } | { kind: 'float'; x: number; y: number; text: string };

export function fxFromEvents(events: readonly GameEvent[]): FxSpawn[] {
  return events.flatMap((e): FxSpawn[] => {
    switch (e.type) {
      case 'tileTilled':
        return [{ kind: 'dust', x: e.x, y: e.y }];
      case 'cropWatered':
        return [{ kind: 'splash', x: e.x, y: e.y }];
      case 'tileCleared':
        return [{ kind: 'leafPuff', x: e.x, y: e.y }];
      case 'toolUsed':
        return e.hit && (e.tool === 'axe' || e.tool === 'hammer')
          ? [{ kind: 'chips', x: e.x, y: e.y }]
          : [];
      case 'cropHarvested':
        return [
          { kind: 'sparkle', x: e.x, y: e.y },
          { kind: 'float', x: e.x, y: e.y, text: `+1 ${displayName(e.crop)}` },
        ];
      default:
        return [];
    }
  });
}
