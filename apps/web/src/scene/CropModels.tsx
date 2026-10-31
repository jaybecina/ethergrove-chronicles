import { CROPS, cropStage, type CropState, type Grid } from '@ethergrove/core';
import { useEffect, useMemo, useRef } from 'react';
import { eventBus } from '../game/eventBus';
import { useGame } from '../game/store';
import { QUALITY } from '../render/quality';
import { ASSETS, type AssetKey } from './assets';
import { MODEL_MATURE } from './Crops';
import type { InstanceItem } from './InstancedSet';
import { ModelInstances } from './ModelInstances';
import { CROP_TINT } from './kenneyColors';

type CropKey = Extract<
  AssetKey,
  | 'crop-sprout'
  | 'crop-young'
  | 'crop-turnip'
  | 'crop-melon'
  | 'crop-pumpkin'
  | 'corn-a'
  | 'corn-b'
  | 'corn-c'
  | 'corn-d'
>;

const FIT: Record<CropKey, { height: number } | { width: number }> = {
  'crop-sprout': { width: 0.45 },
  'crop-young': { width: 0.7 },
  'crop-turnip': { width: 0.55 },
  'crop-melon': { width: 0.75 },
  'crop-pumpkin': { width: 0.8 },
  'corn-a': { height: 0.35 },
  'corn-b': { height: 0.8 },
  'corn-c': { height: 1.2 },
  'corn-d': { height: 1.55 },
};

/** Which model shows a crop at its current stage (null = seed speck, drawn procedurally). */
export function cropModel(crop: CropState): CropKey | null {
  const stage = cropStage(crop);
  if (stage === 'seed') return null;
  if (crop.id === 'corn') {
    if (stage === 'sprout') return 'corn-a';
    if (stage === 'young') return crop.age < (CROPS.corn.days * 2) / 3 ? 'corn-b' : 'corn-c';
    return 'corn-d';
  }
  if (stage === 'sprout') return 'crop-sprout';
  if (stage === 'mature' && MODEL_MATURE.has(crop.id)) return `crop-${crop.id}` as CropKey;
  return 'crop-young';
}

const POP_MS = 250;

export function CropModels({ grid }: { grid: Grid }) {
  const sway = QUALITY[useGame((s) => s.tier())].cropSway;
  const pops = useRef(new Map<number, number>());
  const groups = useMemo(() => {
    const out = new Map<CropKey, InstanceItem[]>();
    grid.tiles.forEach((t, tile) => {
      if (!t.crop) return;
      const key = cropModel(t.crop);
      if (!key) return;
      const list = out.get(key) ?? [];
      list.push({
        x: (tile % grid.width) + 0.5,
        y: 0,
        z: Math.floor(tile / grid.width) + 0.5,
        rotY: (tile * 2.3) % 6.28,
        id: tile,
      });
      out.set(key, list);
    });
    return out;
  }, [grid]);

  useEffect(() => {
    const pop = (e: { x: number; y: number }) => {
      pops.current.set(e.y * grid.width + e.x, performance.now());
    };
    const a = eventBus.on('cropGrew', pop);
    const b = eventBus.on('cropPlanted', pop);
    return () => {
      a();
      b();
    };
  }, [grid.width]);

  const scaleOf = (it: InstanceItem) => {
    const start = it.id === undefined ? undefined : pops.current.get(it.id);
    if (start === undefined) return 1;
    const t = (performance.now() - start) / POP_MS;
    if (t >= 1) {
      if (it.id !== undefined) pops.current.delete(it.id);
      return 1;
    }
    return t < 0.5 ? 0.8 + t * 0.6 : 1.1 - (t - 0.5) * 0.2;
  };

  return (
    <>
      {[...groups.entries()].map(([key, items]) => (
        <ModelInstances
          key={key}
          url={ASSETS[key].url}
          items={items}
          capacity={grid.tiles.length}
          fit={FIT[key]}
          patch={{ wind: sway }}
          tint={CROP_TINT}
          scaleOf={scaleOf}
          animating={() => pops.current.size > 0}
        />
      ))}
    </>
  );
}
