import type { Grid, Season } from '@hearthvale/core';
import { useMemo } from 'react';
import { ASSETS, type AssetKey } from './assets';
import type { InstanceItem } from './InstancedSet';
import { ModelInstances } from './ModelInstances';
import { hash01 } from './palette';
import { spots } from './treeSpots';

/** Leaf tint per season (multiplies the leaf texture). */
const LEAVES: Record<Season, string> = {
  spring: '#ffffff',
  summer: '#d9f0b8',
  fall: '#ffa04a',
  winter: '#ffffff',
};
const BLOSSOM = '#ffc2d4';
const isLeaves = (name: string) => /leaf|leaves/i.test(name);

export function TreeModels({ grid, season }: { grid: Grid; season: Season }) {
  const groups = useMemo(() => {
    const out: Partial<Record<AssetKey, InstanceItem[]>> = {};
    const add = (key: AssetKey, it: InstanceItem) => {
      (out[key] ??= []).push(it);
    };
    spots(grid).forEach((t, i) => {
      const it: InstanceItem = { x: t.x, y: 0, z: t.z, rotY: hash01(i * 7.7) * 6.28, scale: t.s };
      const v = Math.floor(hash01(i * 3.3) * 3);
      if (t.kind === 'pine') add(v === 0 ? 'tree-pine-2' : 'tree-pine-1', it);
      else if (season === 'winter') add(v === 0 ? 'tree-dead-2' : 'tree-dead-1', it);
      else if (t.kind === 'blossom' && season === 'spring')
        add('tree-round-3', { ...it, color: 'blossom' });
      else
        add((['tree-round-1', 'tree-round-2', 'tree-round-3'] as const)[v] ?? 'tree-round-1', it);
    });
    return out;
  }, [grid, season]);

  const blossomItems = (groups['tree-round-3'] ?? []).filter((t) => t.color === 'blossom');
  const plainRound3 = (groups['tree-round-3'] ?? []).filter((t) => t.color !== 'blossom');
  const keys = Object.keys(groups).filter((k) => k !== 'tree-round-3') as AssetKey[];

  return (
    <>
      {keys.map((key) => (
        <ModelInstances
          key={key}
          url={ASSETS[key].url}
          items={groups[key] ?? []}
          capacity={100}
          fit={{ height: key.startsWith('tree-pine') ? 4.6 : 4 }}
          patch={{ wind: 0.05, snow: true }}
          tint={(name) => (isLeaves(name) ? LEAVES[season] : null)}
          colorParts={() => false}
        />
      ))}
      <ModelInstances
        url={ASSETS['tree-round-3'].url}
        items={plainRound3}
        capacity={100}
        fit={{ height: 4 }}
        patch={{ wind: 0.05, snow: true }}
        tint={(name) => (isLeaves(name) ? LEAVES[season] : null)}
        colorParts={() => false}
      />
      <ModelInstances
        url={ASSETS['tree-round-3'].url}
        items={blossomItems}
        capacity={100}
        fit={{ height: 4 }}
        patch={{ wind: 0.05 }}
        tint={(name) => (isLeaves(name) ? BLOSSOM : null)}
        colorParts={() => false}
      />
    </>
  );
}
