import { afterEach, describe, expect, it } from 'vitest';
import { createGameStore } from './store';
import { installDebugHook } from './debugHook';

afterEach(() => {
  delete window.__ethergrove;
});

describe('debug hook', () => {
  it('is not on window until installed', () => {
    expect(window.__ethergrove).toBeUndefined();
  });

  it('exposes test controls', () => {
    const store = createGameStore();
    installDebugHook(store);
    const hv = window.__ethergrove;
    if (!hv) throw new Error('hook missing');
    hv.setSeed(7);
    expect(hv.getState()?.seed).toBe(7);
    expect(hv.getState()?.tutorial.lesson).toBe('off');
    hv.setSeed(8, { lessons: true });
    expect(hv.getState()?.tutorial.lesson).toBe('walkToField');
    hv.setSeed(7);
    expect(store.getState().screen).toBe('game');
    hv.skipMinutes(60);
    expect(hv.getState()?.calendar.minute).toBe(420);
    hv.setWeather('rain');
    expect(hv.getState()?.weather.today).toBe('rain');
    hv.teleport('farm', 10.5, 10.5, 'e');
    expect(hv.getState()?.player).toMatchObject({ x: 10.5, z: 10.5, facing: 'e' });
    hv.sleep();
    expect(hv.getState()?.calendar.day).toBe(2);
    expect(hv.dispatch({ type: 'tick', minutes: 1 })).toEqual([]);
    expect(hv.playTimeMs()).toBe(store.getState().playTimeMs);
  });
});
