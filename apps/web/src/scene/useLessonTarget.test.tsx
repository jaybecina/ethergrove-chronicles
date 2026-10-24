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
});
