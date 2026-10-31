import type { Grid, Season } from '@ethergrove/core';
import { Suspense, useMemo } from 'react';
import { ASSETS, type AssetKey } from './assets';
import type { InstanceItem } from './InstancedSet';
import { ModelInstances } from './ModelInstances';
import { useGame } from '../game/store';
import { QUALITY } from '../render/quality';
import { hash01 } from './palette';

type DecorKey = Extract<AssetKey, 'bush' | 'bush-flowers' | 'flowers-1' | 'flowers-2'>;

/** Scatter candidates at density 1; Low tries half as many, High twice as many (presets spec §4.2). */
export const DECOR_CANDIDATES = 160;

/**
 * Bushes and flower clumps just outside the fence and beside the house. A higher density only adds spots:
 * every candidate keeps its hash, so switching presets never moves a bush.
 */
export function decorSpots(grid: Grid, density: number): Record<DecorKey, InstanceItem[]> {
  const out: Record<DecorKey, InstanceItem[]> = {
    bush: [],
    'bush-flowers': [],
    'flowers-1': [],
    'flowers-2': [],
  };
  const keys: DecorKey[] = ['bush', 'bush-flowers', 'flowers-1', 'flowers-2'];
  for (let i = 0; i < Math.round(DECOR_CANDIDATES * density); i++) {
    const x = -5 + hash01(i * 1.7 + 3) * (grid.width + 10);
    const z = -5 + hash01(i * 2.9 + 5) * (grid.height + 10);
    const inside = x > -0.4 && z > -0.4 && x < grid.width + 0.4 && z < grid.height + 0.4;
    const road = x > grid.width && z > 15.5 && z < 19;
    if (inside || road) continue;
    const k = keys[Math.floor(hash01(i * 4.3) * keys.length)] ?? 'bush';
    out[k].push({ x, y: 0, z, rotY: hash01(i) * 6.28, scale: 0.7 + hash01(i * 9.1) * 0.6 });
  }
  // A flower bed and bushes beside the farmhouse.
  [
    [1.5, 5.4, 'flowers-1'],
    [2.6, 5.5, 'flowers-2'],
    [8.6, 3.2, 'bush-flowers'],
    [1.4, 1.6, 'bush'],
  ].forEach(([x, z, k]) =>
    out[k as DecorKey].push({ x: x as number, y: 0, z: z as number, rotY: 0.4, scale: 1 }),
  );
  return out;
}

const FIT: Record<DecorKey, number> = {
  bush: 0.9,
  'bush-flowers': 0.9,
  'flowers-1': 0.5,
  'flowers-2': 0.5,
};

export function Decor({ grid, season }: { grid: Grid; season: Season }) {
  const density = QUALITY[useGame((s) => s.tier())].decorDensity;
  const spots = useMemo(() => decorSpots(grid, density), [grid.width, grid.height, density]); // eslint-disable-line react-hooks/exhaustive-deps
  const keys = (Object.keys(spots) as DecorKey[]).filter(
    (k) => season !== 'winter' || k === 'bush',
  );
  return (
    <Suspense fallback={null}>
      {keys.map((k) => (
        <ModelInstances
          key={k}
          url={ASSETS[k].url}
          items={spots[k]}
          capacity={400}
          fit={{ height: FIT[k] }}
          patch={{ wind: 0.07, snow: true }}
          tint={(name) => (season === 'fall' && /leaf|leaves|bush/i.test(name) ? '#e7a259' : null)}
          colorParts={() => false}
        />
      ))}
    </Suspense>
  );
}
