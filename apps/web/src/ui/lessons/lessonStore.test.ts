import { createNewGame } from '@hearthvale/core';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../game/eventBus';
import { createGameStore } from '../../game/store';
import { installLessonBridge } from './lessonStore';
import { lessonStore } from './lessonStore';

let off: () => void = () => undefined;
const setup = () => {
  const store = createGameStore();
  const bus = createEventBus();
  off = installLessonBridge(store, bus);
  // The card can be seen on the game screen with no overlay open.
  store.setState({ screen: 'game' });
  return { store, bus };
};

beforeEach(() => {
  vi.useFakeTimers();
  lessonStore.setState({
    expanded: false,
    doneFlash: null,
    noteQueue: [],
    completeGift: null,
    announce: '',
  });
});
afterEach(() => {
  off();
  vi.useRealTimers();
});

describe('lesson bridge', () => {
  it('expands on lessonStarted and collapses after 8 s', () => {
    const { bus } = setup();
    bus.emit([{ type: 'lessonStarted', id: 'till' }]);
    expect(lessonStore.getState().expanded).toBe(true);
    vi.advanceTimersByTime(7999);
    expect(lessonStore.getState().expanded).toBe(true);
    vi.advanceTimersByTime(1);
    expect(lessonStore.getState().expanded).toBe(false);
  });

  it('flashes done for 1.2 s', () => {
    const { bus } = setup();
    bus.emit([{ type: 'lessonDone', id: 'till' }]);
    expect(lessonStore.getState().doneFlash).toBe('till');
    vi.advanceTimersByTime(1200);
    expect(lessonStore.getState().doneFlash).toBeNull();
  });

  it('queues notes in arrival order and dismissNote pops the head', () => {
    const { bus } = setup();
    bus.emit([
      { type: 'noteShown', id: 'rain' },
      { type: 'noteShown', id: 'bagFull' },
    ]);
    expect(lessonStore.getState().noteQueue).toEqual(['rain', 'bagFull']);
    lessonStore.getState().dismissNote();
    expect(lessonStore.getState().noteQueue).toEqual(['bagFull']);
  });

  it('opens the lessons overlay only once no other overlay is open', () => {
    const { store, bus } = setup();
    store.getState().setOverlay('cart');
    bus.emit([{ type: 'lessonsComplete', gift: 100 }]);
    expect(lessonStore.getState().completeGift).toBe(100);
    expect(store.getState().overlay).toBe('cart');
    store.getState().setOverlay(null);
    expect(store.getState().overlay).toBe('lessons');
  });

  it('opens it at once when nothing else is open, and clearComplete ends it', () => {
    const { store, bus } = setup();
    bus.emit([{ type: 'lessonsComplete', gift: 100 }]);
    expect(store.getState().overlay).toBe('lessons');
    lessonStore.getState().clearComplete();
    store.getState().setOverlay(null);
    expect(store.getState().overlay).toBeNull();
  });

  it('opens the goal card when the farm first shows (new game or load)', () => {
    const { store } = setup();
    act(() => {
      store
        .getState()
        .startGame(createNewGame({ seed: 1, farmName: 'A', playerName: 'B', lessons: true }), 1);
      store.getState().setScreen('intro');
    });
    expect(lessonStore.getState().expanded).toBe(false);
    act(() => {
      store.getState().setScreen('game');
    });
    expect(lessonStore.getState().expanded).toBe(true);
    expect(lessonStore.getState().announce).toBe(
      'New goal: Walk to the field. The old field lies north of where you stand. Walk up and take a look.',
    );
    vi.advanceTimersByTime(8000);
    expect(lessonStore.getState().expanded).toBe(false);
  });

  it('Escape (toggleMenu) and B (setOverlay null) close the completion panel for good', () => {
    const { store, bus } = setup();
    act(() => {
      store.getState().setScreen('game');
    });
    bus.emit([{ type: 'lessonsComplete', gift: 100 }]);
    expect(store.getState().overlay).toBe('lessons');
    store.getState().toggleMenu();
    expect(store.getState().overlay).toBeNull();
    expect(lessonStore.getState().completeGift).toBeNull();
    bus.emit([{ type: 'lessonsComplete', gift: 0 }]);
    expect(store.getState().overlay).toBe('lessons');
    store.getState().setOverlay(null);
    expect(store.getState().overlay).toBeNull();
  });

  it('starts the collapse and done timers only once the card can be seen', () => {
    const { store, bus } = setup();
    act(() => {
      store
        .getState()
        .startGame(createNewGame({ seed: 1, farmName: 'A', playerName: 'B', lessons: true }), 1);
      store.getState().setScreen('game');
      store.getState().setOverlay('bin');
    });
    bus.emit([
      { type: 'lessonDone', id: 'ship' },
      { type: 'lessonStarted', id: 'sellOvernight' },
    ]);
    vi.advanceTimersByTime(10_000);
    expect(lessonStore.getState()).toMatchObject({ expanded: true, doneFlash: 'ship' });
    act(() => {
      store.getState().setOverlay(null);
    });
    vi.advanceTimersByTime(1200);
    expect(lessonStore.getState()).toMatchObject({ expanded: true, doneFlash: null });
    vi.advanceTimersByTime(8000);
    expect(lessonStore.getState().expanded).toBe(false);
  });
});
