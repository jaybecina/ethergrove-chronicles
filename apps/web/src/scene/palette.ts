/** Base scene colours (seasons tint these in Task 20). */
export const COLORS = {
  grass: '#6f9e4c',
  path: '#c8a56c',
  tilled: '#6e4a2e',
  watered: '#47301d',
  floor: '#b98a5a',
  wall: '#e8dcc4',
  rock: '#8d8a84',
  stump: '#7a5434',
  weed: '#5d8a34',
  fence: '#a57a4d',
  water: '#4f8fb3',
  houseWall: '#f1e4c8',
  roof: '#a7473a',
  wood: '#8a5a33',
  player: '#d9714b',
} as const;

/** Stable per-tile jitter in [0, 1) so the ground looks hand-painted, not flat. */
export function hash01(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
