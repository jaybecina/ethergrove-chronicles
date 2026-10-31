import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from '@ethergrove/core';
import { createEventBus } from './eventBus';
import { DEFAULT_SETTINGS, createGameStore, migrateSettings } from './store';

const game = () => createNewGame({ seed: 1, farmName: 'a', playerName: 'b' });

afterEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  localStorage.clear();
});

describe('game store', () => {
  it('dispatch applies core commands and emits events on the bus', () => {
    const bus = createEventBus();
    const seen = vi.fn();
    bus.on('locationChanged', seen);
    const store = createGameStore({ bus });
    const g = game();
    store.getState().startGame({ ...g, player: { ...g.player, x: 4.5, z: 5.5, facing: 'n' } }, 2);
    const events = store.getState().dispatch({ type: 'interact' });
    expect(events).toEqual([{ type: 'locationChanged', location: 'house' }]);
    expect(store.getState().game?.player.location).toBe('house');
    expect(store.getState().slot).toBe(2);
    expect(seen).toHaveBeenCalledWith({ type: 'locationChanged', location: 'house' });
  });

  it('dispatch without a game is a no-op', () => {
    expect(createGameStore().getState().dispatch({ type: 'useTool' })).toEqual([]);
  });

  it('the clock runs only in the game screen with no overlay and a visible page', () => {
    const store = createGameStore();
    store.getState().startGame(game(), 1);
    expect(store.getState().isClockRunning()).toBe(false);
    store.getState().setScreen('game');
    expect(store.getState().isClockRunning()).toBe(true);
    store.getState().setOverlay('cart');
    expect(store.getState().isClockRunning()).toBe(false);
    store.getState().setOverlay(null);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    expect(store.getState().isClockRunning()).toBe(false);
  });

  it('rotates the camera in 90° steps and wraps', () => {
    const store = createGameStore();
    store.getState().rotateCamera(-1);
    expect(store.getState().cameraYaw).toBe(3);
    store.getState().rotateCamera(1);
    expect(store.getState().cameraYaw).toBe(0);
  });

  it('clamps zoom steps to 0..2', () => {
    const store = createGameStore();
    store.getState().zoom(1);
    store.getState().zoom(1);
    store.getState().zoom(1);
    expect(store.getState().zoomStep).toBe(2);
  });

  it('persists settings and survives broken storage', () => {
    const store = createGameStore();
    store.getState().updateSettings({ musicVolume: 0.3 });
    expect(createGameStore().getState().settings.musicVolume).toBe(0.3);
    localStorage.setItem('ethergrove:settings', '{not json');
    expect(createGameStore().getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('loadSettings drops unknown keys like the old seenTips', () => {
    localStorage.setItem(
      'ethergrove:settings',
      JSON.stringify({ musicVolume: 0.4, seenTips: ['hoe'], bogus: 1 }),
    );
    const settings = createGameStore().getState().settings;
    expect(settings.musicVolume).toBe(0.4);
    expect(settings).not.toHaveProperty('seenTips');
    expect(settings).not.toHaveProperty('bogus');
    expect(Object.keys(settings).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });
});

describe('settings carry-over from Hearthvale', () => {
  it('moves old settings to the new key', () => {
    localStorage.setItem('hearthvale:settings', JSON.stringify({ musicVolume: 0.2 }));
    expect(createGameStore().getState().settings.musicVolume).toBe(0.2);
    expect(JSON.parse(localStorage.getItem('ethergrove:settings') ?? '{}')).toMatchObject({
      musicVolume: 0.2,
    });
    expect(localStorage.getItem('hearthvale:settings')).toBeNull();
  });

  it('drops broken old settings and removes the old key', () => {
    localStorage.setItem('hearthvale:settings', '{not json');
    expect(createGameStore().getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem('hearthvale:settings')).toBeNull();
  });

  it('prefers the new key', () => {
    localStorage.setItem('ethergrove:settings', JSON.stringify({ musicVolume: 0.9 }));
    localStorage.setItem('hearthvale:settings', JSON.stringify({ musicVolume: 0.1 }));
    expect(createGameStore().getState().settings.musicVolume).toBe(0.9);
    expect(localStorage.getItem('hearthvale:settings')).toBeNull();
  });

  it('survives blocked storage', () => {
    localStorage.setItem('hearthvale:settings', JSON.stringify({ musicVolume: 0.2 }));
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(createGameStore().getState().settings.musicVolume).toBe(0.2);
    // Not written to the new key, so the old one stays for the next launch (spec §3.4: write, then remove).
    expect(localStorage.getItem('hearthvale:settings')).not.toBeNull();
    spy.mockRestore();
  });
});

describe('settings migration (presets spec §3.3)', () => {
  it.each([
    ['low', 'medium'],
    ['lite', 'low'],
    ['high', 'high'],
    ['auto', 'auto'],
  ])('unversioned %s loads as %s', (from, to) => {
    const s = migrateSettings({ quality: from });
    expect(s.quality).toBe(to);
    expect(s.settingsVersion).toBe(2);
  });

  it('unknown or non-string quality becomes auto', () => {
    for (const q of ['ultra', null, 3])
      expect(migrateSettings({ quality: q }).quality).toBe('auto');
  });

  it('a versioned value is not mapped again', () => {
    expect(migrateSettings({ settingsVersion: 2, quality: 'low' }).quality).toBe('low');
    expect(migrateSettings({ settingsVersion: 2, quality: 'lite' }).quality).toBe('auto');
  });

  it('an old stored value is written back once with the version', () => {
    localStorage.setItem('ethergrove:settings', '{"quality":"lite"}');
    expect(createGameStore().getState().settings.quality).toBe('low');
    expect(JSON.parse(localStorage.getItem('ethergrove:settings') ?? '{}')).toMatchObject({
      settingsVersion: 2,
      quality: 'low',
    });
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    createGameStore();
    expect(spy.mock.calls.filter(([k]) => k === 'ethergrove:settings')).toHaveLength(0);
    spy.mockRestore();
  });

  it('legacy Hearthvale settings are migrated', () => {
    localStorage.setItem('hearthvale:settings', '{"quality":"lite"}');
    expect(createGameStore().getState().settings.quality).toBe('low');
  });

  it('migrates with blocked storage', () => {
    localStorage.setItem('ethergrove:settings', '{"quality":"low"}');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(createGameStore().getState().settings.quality).toBe('medium');
    spy.mockRestore();
  });
});
