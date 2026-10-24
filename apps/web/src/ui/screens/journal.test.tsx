import { createNewGame, NOTE_IDS, type GameState } from '@hearthvale/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore } from '../../game/store';
import { memoryRepo } from '../../test/memoryRepo';
import { LessonsComplete } from '../lessons/LessonsComplete';
import { lessonStore } from '../lessons/lessonStore';
import { NOTE_TEXT } from '../lessons/lessonText';
import { uiStore } from '../uiStore';
import { JournalPanel } from './JournalPanel';
import { NewGame } from './NewGame';
import { Pause } from './Pause';

const game = (lesson: GameState['tutorial']['lesson']): GameState => {
  const g = createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari', lessons: true });
  return { ...g, tutorial: { ...g.tutorial, lesson } };
};
const start = (g: GameState) => {
  act(() => {
    gameStore.getState().startGame(g, 1);
    gameStore.getState().setScreen('game');
    gameStore.getState().setDevice('keyboard');
  });
};
const rows = () => within(screen.getByRole('list', { name: 'Lessons' })).getAllByRole('button');

beforeEach(() => {
  act(() => {
    gameStore.getState().setOverlay(null);
  });
  lessonStore.setState({ completeGift: null });
});

describe('Journal', () => {
  it('is a tab in the pause menu', () => {
    start(game('till'));
    render(<Pause repo={memoryRepo()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Journal' }));
    expect(screen.getByRole('list', { name: 'Lessons' })).toBeInTheDocument();
  });

  it('marks done, current and upcoming rows mid-path', () => {
    start(game('water'));
    render(<JournalPanel />);
    const names = rows().map((b) => b.textContent);
    expect(names.filter((n) => n.startsWith('Done'))).toHaveLength(3);
    expect(names.filter((n) => n.startsWith('Current'))).toEqual(['Current: Water the seedlings']);
    expect(names.filter((n) => n.startsWith('Upcoming'))).toHaveLength(6);
  });

  it('shows plain rows when off and all ticks when complete', () => {
    start(game('off'));
    const { unmount } = render(<JournalPanel />);
    expect(rows()[0]).toHaveTextContent(/^Walk to the field$/);
    unmount();
    start(game('complete'));
    render(<JournalPanel />);
    expect(rows().every((b) => b.textContent.startsWith('Done'))).toBe(true);
  });

  it('rows expand to their body and device chips', () => {
    start(game('till'));
    render(<JournalPanel />);
    const row = rows()[1] as HTMLElement;
    expect(row).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Grass won't take seeds/)).toBeInTheDocument();
    expect(screen.getAllByText('Space').length).toBeGreaterThan(0);
  });

  it('lists every note, readable even if not seen yet', () => {
    start(game('till'));
    render(<JournalPanel />);
    for (const id of NOTE_IDS) expect(screen.getByText(NOTE_TEXT[id].title)).toBeInTheDocument();
  });

  it('Skip lessons asks first; Keep learning has focus; Skip turns lessons off', () => {
    start(game('till'));
    render(<JournalPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip lessons' }));
    const dialog = screen.getByRole('alertdialog', { name: "Skip Grandpa's lessons?" });
    expect(within(dialog).getByRole('button', { name: 'Keep learning' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep learning' }));
    expect(gameStore.getState().game?.tutorial.lesson).toBe('till');
    fireEvent.click(screen.getByRole('button', { name: 'Skip lessons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(gameStore.getState().game?.tutorial.lesson).toBe('off');
    expect(screen.getByRole('button', { name: 'Start lessons again' })).toBeInTheDocument();
  });

  it('returns focus to the Journal button after the Skip dialog closes', () => {
    start(game('till'));
    render(<JournalPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip lessons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep learning' }));
    expect(screen.getByRole('button', { name: 'Skip lessons' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Skip lessons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByRole('button', { name: 'Start lessons again' })).toHaveFocus();
  });

  it('Start lessons again restarts and closes the menu', () => {
    start(game('off'));
    act(() => {
      gameStore.getState().setOverlay('pause');
    });
    render(<JournalPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Start lessons again' }));
    expect(gameStore.getState().game?.tutorial.lesson).toBe('walkToField');
    expect(gameStore.getState().overlay).toBeNull();
  });

  it('Controls table highlights the current device column', () => {
    start(game('till'));
    act(() => {
      gameStore.getState().setDevice('touch');
    });
    render(<JournalPanel />);
    const table = screen.getByRole('table', { name: 'Controls' });
    expect(within(table).getByRole('columnheader', { name: 'Touch' })).toHaveClass('is-current');
    expect(within(table).getByRole('columnheader', { name: 'Keyboard' })).not.toHaveClass(
      'is-current',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show all devices' }));
    expect(table).toHaveClass('show-all');
  });
});

describe('LessonsComplete', () => {
  it('shows the gift and closes on Thanks, Grandpa', () => {
    start(game('complete'));
    act(() => {
      lessonStore.setState({ completeGift: 100 });
      gameStore.getState().setOverlay('lessons');
    });
    render(<LessonsComplete />);
    expect(screen.getByRole('dialog', { name: 'The rest is yours' })).toBeInTheDocument();
    expect(screen.getByText('Tucked in the last page: 100 gold.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thanks, Grandpa' }));
    expect(lessonStore.getState().completeGift).toBeNull();
    expect(gameStore.getState().overlay).toBeNull();
  });
});

describe('LessonsComplete without a gift', () => {
  it('omits the gift line when the gift was already given', () => {
    start(game('complete'));
    act(() => {
      lessonStore.setState({ completeGift: 0 });
      gameStore.getState().setOverlay('lessons');
    });
    render(<LessonsComplete />);
    expect(screen.getByRole('dialog', { name: 'The rest is yours' })).toBeInTheDocument();
    expect(screen.queryByText(/Tucked in the last page/)).toBeNull();
  });
});

describe('NewGame lessons option', () => {
  it.each([
    [true, 'walkToField'],
    [false, 'off'],
  ] as const)('checkbox %s starts lessons %s', async (checked, lesson) => {
    const user = userEvent.setup();
    act(() => {
      uiStore.getState().setPendingSlot(1);
    });
    render(<NewGame repo={memoryRepo()} />);
    const box = screen.getByRole('checkbox', { name: /Grandpa's lessons/ });
    expect(box).toBeChecked();
    if (!checked) await user.click(box);
    await user.type(screen.getByLabelText('Your name'), 'Ari');
    await user.type(screen.getByLabelText('Farm name'), 'Elm');
    await user.click(screen.getByRole('button', { name: 'Start farming' }));
    expect(gameStore.getState().game?.tutorial.lesson).toBe(lesson);
  });
});
