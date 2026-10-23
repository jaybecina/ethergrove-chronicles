import type { GameState, Grid } from './types';

export const currentGrid = (state: GameState): Grid => state.maps[state.player.location];

export const withGrid = (state: GameState, grid: Grid): GameState => ({
  ...state,
  maps: { ...state.maps, [state.player.location]: grid },
});
