import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameStore } from '../../game/store';
import { INTRO_LETTER, Intro } from './Intro';

beforeEach(() => {
  vi.useFakeTimers();
  act(() => {
    gameStore.getState().updateSettings({ introSeen: false });
    gameStore.getState().setScreen('intro');
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Intro', () => {
  it("uses grandpa's letter verbatim from the story bible", () => {
    expect(INTRO_LETTER).toBe(
      "If you're reading this, I've gone down into the Heartdeep and haven't come back up yet. Keep the farm alive until I do. It's gone wild, I know. So did I, for a while. Plant something. Then plant something else. The roots remember people who stay. — Grandpa Elias",
    );
  });

  it('types the letter out, then shows Continue', () => {
    render(<Intro />);
    const letter = screen.getByTestId('letter');
    expect(letter.textContent.length).toBeLessThan(INTRO_LETTER.length);
    act(() => {
      vi.advanceTimersByTime(INTRO_LETTER.length * 30 + 100);
    });
    expect(letter.textContent).toBe(INTRO_LETTER);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('a key press reveals the whole letter at once', () => {
    render(<Intro />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByTestId('letter').textContent).toBe(INTRO_LETTER);
  });

  it('offers Skip only after the intro was seen once', () => {
    const { unmount } = render(<Intro />);
    expect(screen.queryByRole('button', { name: 'Skip intro' })).not.toBeInTheDocument();
    unmount();
    act(() => {
      gameStore.getState().updateSettings({ introSeen: true });
    });
    render(<Intro />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }));
    expect(gameStore.getState().screen).toBe('game');
  });

  it('Continue flies in for 6 s, then starts the game and remembers the intro', () => {
    render(<Intro />);
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(gameStore.getState().screen).toBe('intro');
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(gameStore.getState().screen).toBe('game');
    expect(gameStore.getState().settings.introSeen).toBe(true);
  });
});
