import { createNewGame } from '@hearthvale/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { gameStore } from '../game/store';
import { useLessonTarget } from './useLessonTarget';

describe('useLessonTarget', () => {
  it('returns a stable target without re-rendering forever', () => {
    act(() => {
      gameStore
        .getState()
        .startGame(createNewGame({ seed: 5, farmName: 'A', playerName: 'B', lessons: true }), 1);
    });
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders++;
      return useLessonTarget();
    });
    const first = result.current;
    expect(first).toMatchObject({ location: 'farm' });
    rerender();
    expect(result.current).toBe(first);
    expect(renders).toBeLessThan(5);
  });

  it('does not re-render when the game ticks but the target stays put', () => {
    act(() => {
      gameStore
        .getState()
        .startGame(createNewGame({ seed: 5, farmName: 'A', playerName: 'B', lessons: true }), 1);
    });
    let renders = 0;
    renderHook(() => {
      renders++;
      return useLessonTarget();
    });
    const before = renders;
    act(() => {
      for (let i = 0; i < 10; i++) gameStore.getState().dispatch({ type: 'tick', minutes: 1 });
    });
    expect(renders).toBe(before);
  });
});
