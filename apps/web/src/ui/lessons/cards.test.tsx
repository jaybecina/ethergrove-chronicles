import { CROPS, createNewGame, type GameState, type Tile } from '@hearthvale/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameStore } from '../../game/store';
import { createEventBus } from '../../game/eventBus';
import { GoalCard, LessonAnnouncer } from './GoalCard';
import { installLessonBridge, lessonStore } from './lessonStore';
import { NoteCard } from './NoteCard';

const base = (): GameState =>
  createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari', lessons: true });
const lesson = (s: GameState, id: GameState['tutorial']['lesson'], count = 0): GameState => ({
  ...s,
  tutorial: { ...s.tutorial, lesson: id, count },
});
const withCrops = (s: GameState, tiles: Tile[]): GameState => {
  const farm = { ...s.maps.farm, tiles: s.maps.farm.tiles.slice() };
  tiles.forEach((t, i) => (farm.tiles[10 * farm.width + 5 + i] = t));
  return { ...s, maps: { ...s.maps, farm } };
};
const load = (s: GameState) => {
  act(() => {
    gameStore.getState().startGame(s, 1);
    gameStore.getState().setScreen('game');
  });
};

beforeEach(() => {
  lessonStore.setState({
    expanded: false,
    doneFlash: null,
    noteQueue: [],
    completeGift: null,
    announce: '',
  });
  act(() => {
    gameStore.getState().setDevice('keyboard');
    gameStore.getState().setOverlay(null);
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('GoalCard', () => {
  it('renders the saved lesson without any event', () => {
    load(lesson(base(), 'plant', 2));
    render(<GoalCard />);
    expect(screen.getByRole('button', { name: /Plant your turnips/ })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('shows watered / total for water lessons', () => {
    const crop = { id: 'turnip' as const, age: 0, regrowing: false };
    load(
      withCrops(lesson(base(), 'water'), [
        { kind: 'tilled', crop, watered: true },
        { kind: 'tilled', crop },
      ]),
    );
    render(<GoalCard />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('shows Ripe in N days for harvest before anything is ripe', () => {
    const crop = { id: 'turnip' as const, age: CROPS.turnip.days - 2, regrowing: false };
    load(withCrops(lesson(base(), 'harvest'), [{ kind: 'tilled', crop }]));
    render(<GoalCard />);
    expect(screen.getByText('Ripe in 2 days')).toBeInTheDocument();
  });

  it('chips follow the current device', () => {
    load(lesson(base(), 'till'));
    render(<GoalCard />);
    act(() => {
      lessonStore.getState().setExpanded(true);
    });
    expect(screen.getByText('Space')).toBeInTheDocument();
    act(() => {
      gameStore.getState().setDevice('touch');
    });
    expect(screen.getByText('✦')).toBeInTheDocument();
    expect(screen.queryByText('Space')).toBeNull();
  });

  it('toggles expanded on click and sets aria-expanded', () => {
    load(lesson(base(), 'till'));
    render(<GoalCard />);
    const button = screen.getByRole('button', { name: /Break some ground/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Grass won't take seeds/)).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Grass won't take seeds/)).toBeInTheDocument();
  });

  it('announces lesson and note events, but not a manual toggle', () => {
    load(lesson(base(), 'till'));
    const bus = createEventBus();
    const off = installLessonBridge(gameStore, bus);
    render(
      <>
        <LessonAnnouncer />
        <GoalCard />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Break some ground/ }));
    expect(screen.getByRole('status')).toHaveTextContent('');
    act(() => {
      bus.emit([{ type: 'lessonStarted', id: 'till' }]);
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      "New goal: Break some ground. Grass won't take seeds.",
    );
    act(() => {
      bus.emit([{ type: 'noteShown', id: 'rain' }]);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Note: Rainy day.');
    off();
  });

  it('shows a tick while a lesson is flashing done', () => {
    load(lesson(base(), 'plant'));
    render(<GoalCard />);
    act(() => {
      lessonStore.setState({ doneFlash: 'till' });
    });
    expect(screen.getByText('Break some ground')).toHaveClass('is-done');
  });

  it('is hidden when lessons are off or complete, or an overlay is open', () => {
    load(lesson(base(), 'off'));
    const { container, rerender } = render(<GoalCard />);
    expect(container).toBeEmptyDOMElement();
    load(lesson(base(), 'complete'));
    rerender(<GoalCard />);
    expect(container).toBeEmptyDOMElement();
    load(lesson(base(), 'till'));
    act(() => {
      gameStore.getState().setOverlay('pause');
    });
    rerender(<GoalCard />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('NoteCard', () => {
  it('shows the head of the queue; Got it dismisses; 10 s auto-dismiss', () => {
    vi.useFakeTimers();
    load(lesson(base(), 'till'));
    render(<NoteCard />);
    act(() => {
      lessonStore.setState({ noteQueue: ['canEmpty', 'rain'] });
    });
    expect(screen.getByText("From Grandpa's notes")).toBeInTheDocument();
    expect(screen.getByText('Out of water')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.getByText('Rainy day')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText('Rainy day')).toBeNull();
  });
});
