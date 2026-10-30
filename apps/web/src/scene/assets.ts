const KAYKIT = 'KayKit Adventurers Character Pack 1.0 (Kay Lousberg)';
const QUATERNIUS = 'Stylized Nature MegaKit (Quaternius)';
const KENNEY_NATURE = 'Kenney Nature Kit';
const KENNEY_FURNITURE = 'Kenney Furniture Kit';

const m = (key: string, credit: string) => ({ url: `/assets/models/${key}.glb`, credit });

/** Every model the scene loads (produced by scripts/optimize-assets.mjs; credits in CREDITS.md). */
export const ASSETS = {
  player: m('player', KAYKIT),
  'tree-round-1': m('tree-round-1', QUATERNIUS),
  'tree-round-2': m('tree-round-2', QUATERNIUS),
  'tree-round-3': m('tree-round-3', QUATERNIUS),
  'tree-dead-1': m('tree-dead-1', QUATERNIUS),
  'tree-dead-2': m('tree-dead-2', QUATERNIUS),
  'tree-pine-1': m('tree-pine-1', QUATERNIUS),
  'tree-pine-2': m('tree-pine-2', QUATERNIUS),
  bush: m('bush', QUATERNIUS),
  'bush-flowers': m('bush-flowers', QUATERNIUS),
  'flowers-1': m('flowers-1', QUATERNIUS),
  'flowers-2': m('flowers-2', QUATERNIUS),
  'rock-1': m('rock-1', KENNEY_NATURE),
  'rock-2': m('rock-2', KENNEY_NATURE),
  'rock-3': m('rock-3', KENNEY_NATURE),
  'weed-1': m('weed-1', QUATERNIUS),
  'weed-2': m('weed-2', QUATERNIUS),
  stump: m('stump', KENNEY_NATURE),
  fence: m('fence', KENNEY_NATURE),
  'crop-sprout': m('crop-sprout', KENNEY_NATURE),
  'crop-young': m('crop-young', KENNEY_NATURE),
  'crop-turnip': m('crop-turnip', KENNEY_NATURE),
  'crop-melon': m('crop-melon', KENNEY_NATURE),
  'crop-pumpkin': m('crop-pumpkin', KENNEY_NATURE),
  'corn-a': m('corn-a', KENNEY_NATURE),
  'corn-b': m('corn-b', KENNEY_NATURE),
  'corn-c': m('corn-c', KENNEY_NATURE),
  'corn-d': m('corn-d', KENNEY_NATURE),
  bed: m('bed', KENNEY_FURNITURE),
  rug: m('rug', KENNEY_FURNITURE),
  'potted-plant': m('potted-plant', KENNEY_FURNITURE),
  table: m('table', KENNEY_FURNITURE),
  chair: m('chair', KENNEY_FURNITURE),
  lamp: m('lamp', KENNEY_FURNITURE),
} as const;

export type AssetKey = keyof typeof ASSETS;
