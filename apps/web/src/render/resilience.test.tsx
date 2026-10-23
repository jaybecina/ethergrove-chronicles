import { createNewGame } from '@hearthvale/core';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameStore } from '../game/store';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { StorageBanner } from '../ui/screens/StorageBanner';
import { WebGLFallback } from '../ui/screens/WebGLFallback';
import { hasWebGL2, installContextLoss, withRetry } from './webgl';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WebGL support', () => {
  it('detects missing WebGL2', () => {
    const none = () => ({ getContext: () => null }) as unknown as HTMLCanvasElement;
    const ok = () => ({ getContext: () => ({}) }) as unknown as HTMLCanvasElement;
    expect(hasWebGL2(none)).toBe(false);
    expect(hasWebGL2(ok)).toBe(true);
    expect(
      hasWebGL2(() => {
        throw new Error('blocked');
      }),
    ).toBe(false);
  });

  it('the fallback explains what to do', () => {
    render(<WebGLFallback />);
    expect(screen.getByRole('heading', { name: /can't show 3D/i })).toBeInTheDocument();
    expect(screen.getByText(/hardware acceleration/i)).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  it('shows the fallback and keeps the game state', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const g = createNewGame({ seed: 3, farmName: 'Elm', playerName: 'Ari' });
    act(() => {
      gameStore.getState().startGame(g, 1);
    });
    const Boom = () => {
      throw new Error('kaboom');
    };
    render(
      <ErrorBoundary fallback={<p>Something broke</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something broke')).toBeInTheDocument();
    expect(gameStore.getState().game).toBe(g);
  });
});

describe('StorageBanner', () => {
  it('warns when saving is impossible', async () => {
    render(<StorageBanner check={() => Promise.resolve(false)} />);
    expect(
      await screen.findByText("Progress can't be saved here. Use Export in the pause menu."),
    ).toBeInTheDocument();
  });

  it('stays hidden when storage works', async () => {
    render(<StorageBanner check={() => Promise.resolve(true)} />);
    await act(() => Promise.resolve());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('context loss', () => {
  it('pauses on loss and resumes on restore', () => {
    act(() => {
      gameStore.getState().startGame(createNewGame({ seed: 3, farmName: 'a', playerName: 'b' }), 1);
      gameStore.getState().setScreen('game');
    });
    const canvas = document.createElement('canvas');
    const off = installContextLoss(canvas, gameStore);
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(gameStore.getState().overlay).toBe('restoring');
    expect(gameStore.getState().isClockRunning()).toBe(false);
    const key = gameStore.getState().canvasKey;
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(gameStore.getState().overlay).toBeNull();
    expect(gameStore.getState().canvasKey).toBe(key + 1);
    off();
  });
});

describe('withRetry', () => {
  it('retries twice, then gives up', async () => {
    let n = 0;
    const flaky = () => {
      n++;
      return n < 3 ? Promise.reject(new Error('net')) : Promise.resolve('ok');
    };
    await expect(withRetry(flaky, 2)).resolves.toBe('ok');
    n = -10;
    await expect(withRetry(flaky, 2)).rejects.toThrow('net');
  });
});
