import { createNewGame } from '../src/newGame';
import { setTile } from '../src/grid';
import type { GameState, ItemStack, LessonId, Tile } from '../src/types';

export const fresh = (seed = 1): GameState =>
  createNewGame({ seed, farmName: 'Elm', playerName: 'Ari' });

export function withBag(state: GameState, cells: (ItemStack | null)[]): GameState {
  const bag = Array.from({ length: 12 }, (_, i) => cells[i] ?? null);
  return { ...state, bag };
}

/** Clear farm to plain grass/path so tests control every tile. */
export function blankFarm(state: GameState): GameState {
  const tiles = state.maps.farm.tiles.map((t): Tile =>
    t.kind === 'weed' || t.kind === 'rock' || t.kind === 'stump' ? { kind: 'grass' } : t,
  );
  return { ...state, maps: { ...state.maps, farm: { ...state.maps.farm, tiles } } };
}

export function withTile(state: GameState, x: number, y: number, tile: Tile): GameState {
  const loc = state.player.location;
  return { ...state, maps: { ...state.maps, [loc]: setTile(state.maps[loc], x, y, tile) } };
}

/** Stand on tile (x, y) facing the given direction. */
export function standAt(
  state: GameState,
  x: number,
  y: number,
  facing: GameState['player']['facing'],
): GameState {
  return { ...state, player: { ...state.player, x: x + 0.5, z: y + 0.5, facing } };
}

/** Put the save on a given lesson (lessons on). */
export function lessonAt(state: GameState, id: LessonId, count = 0): GameState {
  return { ...state, tutorial: { ...state.tutorial, lesson: id, count } };
}
