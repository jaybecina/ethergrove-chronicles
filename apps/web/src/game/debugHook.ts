import { createNewGame } from '@hearthvale/core';
import type { Command, Facing, GameEvent, GameState, LocationId, Weather } from '@hearthvale/core';
import type { StoreApi } from 'zustand/vanilla';
import type { GameStore } from './store';

export interface DebugHook {
  getState(): GameState | null;
  dispatch(cmd: Command): GameEvent[];
  setSeed(seed: number): void;
  skipMinutes(minutes: number): void;
  sleep(): void;
  setWeather(today: Weather): void;
  teleport(location: LocationId, x: number, z: number, facing: Facing): void;
}

declare global {
  interface Window {
    __hearthvale?: DebugHook;
  }
}

/** Test-only controls. Loaded only when VITE_E2E === 'true' (see main.tsx). */
export function installDebugHook(store: StoreApi<GameStore>): void {
  const edit = (fn: (g: GameState) => GameState) => {
    const { game } = store.getState();
    if (game) store.getState().replaceGame(fn(game));
  };
  window.__hearthvale = {
    getState: () => store.getState().game,
    dispatch: (cmd) => store.getState().dispatch(cmd),
    setSeed(seed) {
      store
        .getState()
        .startGame(createNewGame({ seed, farmName: 'Testfield', playerName: 'Tester' }), 1);
      store.getState().setScreen('game');
    },
    skipMinutes(minutes) {
      store.getState().dispatch({ type: 'tick', minutes });
    },
    sleep() {
      edit((g) => ({ ...g, player: { ...g.player, location: 'house' } }));
      store.getState().dispatch({ type: 'sleep' });
    },
    setWeather(today) {
      edit((g) => ({ ...g, weather: { ...g.weather, today } }));
    },
    teleport(location, x, z, facing) {
      edit((g) => ({ ...g, player: { ...g.player, location, x, z, facing } }));
    },
  };
}
