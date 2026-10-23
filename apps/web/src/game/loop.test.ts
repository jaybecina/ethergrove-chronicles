import { describe, expect, it } from 'vitest';
import { createNewGame } from '@hearthvale/core';
import { MAX_FRAME_MS, STEP_MS, advanceAccumulator, createStepper } from './loop';
import { createGameStore } from './store';

describe('advanceAccumulator', () => {
  it('runs whole steps and keeps the remainder', () => {
    expect(advanceAccumulator(0, 120)).toEqual({ steps: 2, accMs: 20 });
    expect(advanceAccumulator(20, 30)).toEqual({ steps: 1, accMs: 0 });
  });

  it('clamps a huge frame gap to 250 ms (Review Focus)', () => {
    expect(MAX_FRAME_MS).toBe(250);
    expect(advanceAccumulator(0, 60_000)).toEqual({ steps: 5, accMs: 0 });
  });

  it('treats negative frames as zero', () => {
    expect(advanceAccumulator(10, -5)).toEqual({ steps: 0, accMs: 10 });
  });
});

describe('createStepper', () => {
  const started = () => {
    const store = createGameStore();
    store.getState().startGame(createNewGame({ seed: 1, farmName: 'a', playerName: 'b' }), 1);
    store.getState().setScreen('game');
    return store;
  };

  it('advances one game minute every 14 steps (10 min / 7 s)', () => {
    const store = started();
    const step = createStepper(store);
    for (let i = 0; i < 13; i++) step([]);
    expect(store.getState().game?.calendar.minute).toBe(360);
    step([]);
    expect(store.getState().game?.calendar.minute).toBe(361);
    expect(store.getState().playTimeMs).toBe(14 * STEP_MS);
  });

  it('a 60 s frame gap advances at most 5 steps of time', () => {
    const store = started();
    const step = createStepper(store);
    const { steps } = advanceAccumulator(0, 60_000);
    for (let i = 0; i < steps; i++) step([]);
    expect(store.getState().game?.calendar.minute).toBe(360);
  });

  it('freezes time and ignores commands while an overlay is open', () => {
    const store = started();
    store.getState().setOverlay('pause');
    const step = createStepper(store);
    for (let i = 0; i < 100; i++) step([{ type: 'move', dx: 1, dz: 0, dtMs: STEP_MS }]);
    expect(store.getState().game?.calendar.minute).toBe(360);
    expect(store.getState().game?.player.x).toBe(15.5);
  });

  it('dispatches commands while running', () => {
    const store = started();
    createStepper(store)([{ type: 'move', dx: 0, dz: -1, dtMs: STEP_MS }]);
    expect(store.getState().game?.player.z).toBeCloseTo(22.3);
  });
});
