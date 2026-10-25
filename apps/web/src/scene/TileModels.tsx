import { useMemo } from 'react';
import { ASSETS } from './assets';
import type { InstanceItem } from './InstancedSet';
import { ModelInstances } from './ModelInstances';
import { ROCK_TINT, WOOD_TINT } from './kenneyColors';

interface Props {
  rocks: InstanceItem[];
  stumps: InstanceItem[];
  weeds: InstanceItem[];
  fences: InstanceItem[];
  capacity: number;
}

/** Split items between model variants by a stable hash of their position. */
function byVariant(items: InstanceItem[], n: number): InstanceItem[][] {
  const out: InstanceItem[][] = Array.from({ length: n }, () => []);
  items.forEach((it) => {
    out[Math.floor(Math.abs(Math.sin(it.x * 12.9 + it.z * 78.2)) * 1000) % n]?.push(it);
  });
  return out;
}

const ground = (items: InstanceItem[]) => items.map((it) => ({ ...it, y: 0 }));

/** CC0 models for field obstacles and the boundary fence. */
export function TileModels({ rocks, stumps, weeds, fences, capacity }: Props) {
  const rockSets = useMemo(() => byVariant(ground(rocks), 3), [rocks]);
  const weedSets = useMemo(() => byVariant(ground(weeds), 2), [weeds]);
  const stumpItems = useMemo(() => ground(stumps), [stumps]);
  const fenceItems = useMemo(() => ground(fences), [fences]);
  const snow = { snow: true };
  return (
    <>
      {(['rock-1', 'rock-2', 'rock-3'] as const).map((key, i) => (
        <ModelInstances
          key={key}
          url={ASSETS[key].url}
          items={rockSets[i] ?? []}
          capacity={capacity}
          fit={{ width: 0.7 }}
          patch={snow}
          tint={ROCK_TINT}
          matte
        />
      ))}
      {(['weed-1', 'weed-2'] as const).map((key, i) => (
        <ModelInstances
          key={key}
          url={ASSETS[key].url}
          items={weedSets[i] ?? []}
          capacity={capacity * 2}
          fit={key === 'weed-1' ? { width: 0.75 } : { height: 0.55 }}
          patch={{ wind: 0.08, snow: true }}
        />
      ))}
      <ModelInstances
        url={ASSETS.stump.url}
        items={stumpItems}
        capacity={capacity}
        fit={{ width: 0.7 }}
        patch={snow}
        tint={WOOD_TINT}
      />
      <ModelInstances
        url={ASSETS.fence.url}
        items={fenceItems}
        capacity={capacity}
        fit={{ width: 1.02 }}
        patch={snow}
        tint={WOOD_TINT}
      />
    </>
  );
}
