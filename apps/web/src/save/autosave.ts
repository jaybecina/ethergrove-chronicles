import { makeSaveFile } from '@hearthvale/core';
import type { LoadResult, SaveRepository, SlotId } from '@hearthvale/core';
import type { StoreApi } from 'zustand/vanilla';
import type { EventBus } from '../game/eventBus';
import type { GameStore } from '../game/store';

export async function saveNow(store: StoreApi<GameStore>, repo: SaveRepository): Promise<void> {
  const { game, slot, playTimeMs } = store.getState();
  if (!game || slot === null) return;
  await repo.save(slot, makeSaveFile(game, playTimeMs, new Date()));
}

/** Save on every new morning and whenever the page is hidden mid-game. */
export function installAutosave(
  store: StoreApi<GameStore>,
  repo: SaveRepository,
  bus: EventBus,
): () => void {
  const save = () => {
    saveNow(store, repo).catch((err: unknown) => {
      console.error('Autosave failed', err);
    });
  };
  const offDay = bus.on('dayStarted', save);
  const onVisibility = () => {
    if (document.hidden && store.getState().screen === 'game') save();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    offDay();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Load a slot into the store; the clock stays frozen until the caller shows the game screen. */
export async function loadSlot(
  store: StoreApi<GameStore>,
  repo: SaveRepository,
  slot: SlotId,
): Promise<LoadResult> {
  const result = await repo.load(slot);
  if (result.kind === 'ok')
    store.getState().startGame(result.file.state, slot, result.file.playTimeMs);
  return result;
}
