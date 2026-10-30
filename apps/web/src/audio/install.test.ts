import { createNewGame, type GameEvent } from '@ethergrove/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../game/eventBus';
import { createGameStore } from '../game/store';
import type { BackendStats } from './orchestraBackend';
import { installAudio } from './install';
import type { AudioBackend } from './sound';

function fakeBackend() {
  const log: string[] = [];
  let contextState: BackendStats['contextState'] = 'none';
  const backend: AudioBackend & { stats(): BackendStats } = {
    sfx: (id) => log.push(`sfx:${id}`),
    cue: (c) => log.push(`cue:${c}`),
    jingle: (id) => log.push(`jingle:${id}`),
    setVolumes: (m, s) => log.push(`vol:${m}:${s}`),
    setPaused: (p) => log.push(`paused:${p}`),
    suspend: () => log.push('suspend'),
    resume: () => {
      log.push('resume');
      if (contextState === 'none') contextState = 'suspended';
    },
    stats: () => ({ contextState, activeTracks: 0, loaded: 0 }),
  };
  return {
    backend,
    log,
    run() {
      contextState = 'running';
    },
  };
}

const fire = (type: string) => {
  window.dispatchEvent(new Event(type));
};

describe('installAudio', () => {
  let fake: ReturnType<typeof fakeBackend>;
  let store: ReturnType<typeof createGameStore>;
  let bus: ReturnType<typeof createEventBus>;
  let dispose: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    fake = fakeBackend();
    bus = createEventBus();
    store = createGameStore({ bus });
    store.getState().startGame(createNewGame({ seed: 1, farmName: 'F', playerName: 'P' }), 1);
    store.getState().setScreen('game');
    dispose = installAudio(store, bus, fake.backend);
  });
  afterEach(() => {
    dispose();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('keeps trying to start audio on gestures until the context runs', () => {
    fire('pointerdown');
    expect(fake.log.filter((l) => l === 'resume')).toHaveLength(1);
    expect(fake.log).toContain('cue:spring');
    // iOS only allows audio on the touch's end: try again on later gestures.
    fire('touchend');
    fire('pointerup');
    expect(fake.log.filter((l) => l === 'resume')).toHaveLength(3);
    fake.run();
    fire('click');
    fire('keydown');
    fire('pointerdown');
    expect(fake.log.filter((l) => l === 'resume')).toHaveLength(3);
  });

  it('plays one jingle per event batch, the new season’s own fanfare', async () => {
    fire('keydown');
    bus.emit([
      { type: 'dayStarted', calendar: store.getState().game?.calendar },
      { type: 'seasonChanged', season: 'summer' },
    ] as GameEvent[]);
    await Promise.resolve();
    expect(fake.log.filter((l) => l.startsWith('jingle:'))).toEqual(['jingle:season-summer']);
    bus.emit([{ type: 'dayStarted', calendar: store.getState().game?.calendar }] as GameEvent[]);
    await Promise.resolve();
    expect(fake.log.filter((l) => l.startsWith('jingle:'))).toEqual([
      'jingle:season-summer',
      'jingle:morning',
    ]);
  });

  it('muffles the music while the pause menu is open', () => {
    fire('keydown');
    store.getState().setOverlay('pause');
    store.getState().setOverlay(null);
    expect(fake.log.filter((l) => l.startsWith('paused'))).toEqual(['paused:true', 'paused:false']);
  });

  it('follows the music cue as the player moves', () => {
    fire('keydown');
    store.getState().setOverlay('cart');
    expect(fake.log.at(-1)).toBe('cue:shop');
  });

  it('applies the player’s saved volumes when audio starts (audio plan Review Focus 5)', () => {
    store.getState().updateSettings({ musicVolume: 0.3, sfxVolume: 0.5 });
    vi.advanceTimersByTime(200);
    fire('keydown');
    expect(fake.log).toContain('vol:0.3:0.5');
  });

  it('applies volume settings only when they change', () => {
    fire('keydown');
    vi.advanceTimersByTime(1000);
    store.getState().updateSettings({ musicVolume: 0.3 });
    vi.advanceTimersByTime(1000);
    expect(fake.log.filter((l) => l.startsWith('vol:'))).toEqual(['vol:0.6:0.8', 'vol:0.3:0.8']);
  });

  it('stops listening once disposed', async () => {
    fire('keydown');
    dispose();
    const before = fake.log.length;
    bus.emit([{ type: 'goldChanged', gold: 10, delta: 5 }]);
    await Promise.resolve();
    store.getState().setOverlay('cart');
    vi.advanceTimersByTime(1000);
    fire('pointerdown');
    expect(fake.log.slice(before)).toEqual([]);
  });
});
