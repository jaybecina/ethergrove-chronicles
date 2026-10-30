import 'fake-indexeddb/auto';
import { createNewGame } from '@ethergrove/core';
import type { SaveRepository, SlotId } from '@ethergrove/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../game/eventBus';
import { createGameStore } from '../game/store';
import { installAutosave, loadSlot } from './autosave';
import { createIdbRepository } from './idbRepository';

let n = 0;
const flush = () => new Promise((r) => setTimeout(r, 20));

/**
 * Autosave writes in the background, so poll until the slot holds a save. A fixed wait
 * failed under the full suite's load, when the fake IndexedDB write took longer than 20 ms.
 */
async function savedIn(repo: SaveRepository, slot: SlotId) {
  return vi.waitFor(async () => {
    const loaded = await repo.load(slot);
    if (loaded.kind !== 'ok') throw new Error(`slot ${String(slot)} not saved yet`);
    return loaded;
  });
}

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('autosave', () => {
  it('saves when a new day starts', async () => {
    const bus = createEventBus();
    const repo = createIdbRepository(`auto-${++n}`);
    const store = createGameStore({ bus });
    const g = createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' });
    store.getState().startGame({ ...g, player: { ...g.player, location: 'house' } }, 1);
    store.getState().setScreen('game');
    const dispose = installAutosave(store, repo, bus);
    store.getState().dispatch({ type: 'sleep' });
    const loaded = await savedIn(repo, 1);
    expect(loaded.file.state.calendar.day).toBe(2);
    dispose();
  });

  it('restores a mid-day hidden-tab autosave exactly, with the clock frozen (Review Focus)', async () => {
    const bus = createEventBus();
    const repo = createIdbRepository(`auto-${++n}`);
    const store = createGameStore({ bus });
    const g = createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' });
    store.getState().startGame(
      {
        ...g,
        calendar: { ...g.calendar, minute: 845 },
        player: { ...g.player, location: 'farm', x: 10.5, z: 7.25 },
      },
      3,
    );
    store.getState().setScreen('game');
    const dispose = installAutosave(store, repo, bus);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await savedIn(repo, 3);
    dispose();

    const fresh = createGameStore({ bus: createEventBus() });
    fresh.getState().setScreen('slots');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    expect((await loadSlot(fresh, repo, 3)).kind).toBe('ok');
    const s = fresh.getState().game;
    expect(s?.calendar.minute).toBe(845);
    expect(s?.player).toMatchObject({ location: 'farm', x: 10.5, z: 7.25 });
    expect(fresh.getState().slot).toBe(3);
    expect(fresh.getState().isClockRunning()).toBe(false);
    fresh.getState().setScreen('game');
    expect(fresh.getState().isClockRunning()).toBe(true);
  });

  it('does not save from the title screen', async () => {
    const bus = createEventBus();
    const repo = createIdbRepository(`auto-${++n}`);
    const store = createGameStore({ bus });
    const dispose = installAutosave(store, repo, bus);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(await repo.list()).toEqual(
      [1, 2, 3].map((slot) => ({
        slot,
        summary: null,
        savedAt: null,
        playTimeMs: 0,
        corrupt: false,
      })),
    );
    dispose();
  });
});
