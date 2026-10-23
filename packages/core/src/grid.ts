import type { FeatureId, Grid, Tile, TileKind } from './types';

const BLOCKED: ReadonlySet<TileKind> = new Set([
  'rock',
  'stump',
  'water',
  'building',
  'fence',
  'wall',
  'feature',
]);

export function parseLayout(rows: string[], legend: Record<string, Tile>): Grid {
  const width = rows[0]?.length ?? 0;
  const tiles: Tile[] = [];
  for (const row of rows) {
    if (row.length !== width) throw new RangeError('Layout rows must have equal length');
    for (const ch of row) {
      const tile = legend[ch];
      if (!tile) throw new RangeError(`Unknown layout character "${ch}"`);
      tiles.push({ ...tile });
    }
  }
  return { width, height: rows.length, tiles };
}

const inBounds = (grid: Grid, x: number, y: number): boolean =>
  Number.isInteger(x) &&
  Number.isInteger(y) &&
  x >= 0 &&
  y >= 0 &&
  x < grid.width &&
  y < grid.height;

export function tileAt(grid: Grid, x: number, y: number): Tile | undefined {
  return inBounds(grid, x, y) ? grid.tiles[y * grid.width + x] : undefined;
}

export function setTile(grid: Grid, x: number, y: number, tile: Tile): Grid {
  if (!inBounds(grid, x, y)) throw new RangeError(`Tile ${x},${y} is out of bounds`);
  const tiles = grid.tiles.slice();
  tiles[y * grid.width + x] = tile;
  return { ...grid, tiles };
}

export function isBlocked(tile: Tile | undefined): boolean {
  return tile === undefined || BLOCKED.has(tile.kind);
}

export function findFeature(grid: Grid, feature: FeatureId): { x: number; y: number } {
  const i = grid.tiles.findIndex((t) => t.feature === feature);
  if (i < 0) throw new RangeError(`Feature ${feature} not found`);
  return { x: i % grid.width, y: Math.floor(i / grid.width) };
}

export function findChar(rows: string[], ch: string): { x: number; y: number } {
  const y = rows.findIndex((r) => r.includes(ch));
  if (y < 0) throw new RangeError(`Character ${ch} not found`);
  return { x: (rows[y] ?? '').indexOf(ch), y };
}
