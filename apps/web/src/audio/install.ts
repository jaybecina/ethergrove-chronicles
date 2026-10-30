import { tileAt, type GameEvent } from '@ethergrove/core';
import type { StoreApi } from 'zustand/vanilla';
import type { EventBus } from '../game/eventBus';
import type { GameStore } from '../game/store';
import { onThunder } from '../render/weatherState';
import { orchestraBackend, type BackendStats } from './orchestraBackend';
import { installMenuSounds } from './menuSounds';
import { jingleFile, jingleFor, pickTrack, type MusicInput } from './music';
import { createSoundSystem, type AudioBackend, type AudioState } from './sound';
import { soundsFor, type Surface } from './soundMap';

const STEP_MS = 320;

function surfaceUnder(store: StoreApi<GameStore>): Surface {
  const g = store.getState().game;
  if (!g) return 'grass';
  if (g.player.location === 'house') return 'wood';
  if (g.calendar.season === 'winter') return 'snow';
  const t = tileAt(g.maps.farm, Math.floor(g.player.x), Math.floor(g.player.z));
  return t?.kind === 'grass' || t?.kind === 'weed' ? 'grass' : 'dirt';
}

/** Filled in place on every store change (each 50 ms step), so following the music allocates nothing. */
const input: MusicInput = {
  screen: 'title',
  overlay: null,
  location: 'farm',
  season: 'spring',
  minute: 0,
  weather: 'sunny',
};
function musicInput(s: GameStore): MusicInput | null {
  const g = s.game;
  if (!g) return null;
  input.screen = s.screen;
  input.overlay = s.overlay;
  input.location = g.player.location;
  input.season = g.calendar.season;
  input.minute = g.calendar.minute;
  input.weather = g.weather.today;
  return input;
}

/** Gestures that may start audio. iOS only counts a touch when it ends, so keep listening for several. */
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

const NO_STATS: BackendStats = { contextState: 'none', activeTracks: 0, loaded: 0 };
let debug: () => AudioState & BackendStats = () => ({
  unlocked: false,
  cue: null,
  jingle: null,
  lastSfx: null,
  ...NO_STATS,
});

/** What the audio is doing now, for the e2e debug hook. */
export const audioDebug = (): AudioState & BackendStats => debug();

/** Hooks music and sound to the store, game events, menus, settings and player movement. */
export function installAudio(
  store: StoreApi<GameStore>,
  bus: EventBus,
  backend: AudioBackend & { stats?(): BackendStats } = orchestraBackend(),
) {
  const sys = createSoundSystem(backend);
  debug = () => ({ ...sys.state(), ...(backend.stats?.() ?? NO_STATS) });

  // Retry on every gesture until the context really runs: a gesture the browser doesn't count leaves it suspended.
  const stopListening = () => {
    for (const type of GESTURES) window.removeEventListener(type, unlock);
  };
  const unlock = () => {
    if (backend.stats && backend.stats().contextState === 'running') {
      stopListening();
      return;
    }
    if (sys.state().unlocked) sys.resume();
    else sys.unlock();
    if (!backend.stats) stopListening();
  };
  for (const type of GESTURES) window.addEventListener(type, unlock);

  // One dispatch emits its events back to back; the jingle is chosen once per batch.
  let batch: GameEvent[] = [];
  const flushBatch = () => {
    const id = jingleFor(batch);
    let season = store.getState().game?.calendar.season ?? 'spring';
    for (const e of batch) if (e.type === 'seasonChanged') season = e.season;
    batch = [];
    if (id) sys.playJingle(jingleFile(id, season));
  };
  const offEvents = bus.onAny((e) => {
    for (const id of soundsFor(e, { surface: surfaceUnder(store) })) sys.play(id);
    if (e.type === 'cropHarvested' && store.getState().device === 'touch' && 'vibrate' in navigator)
      navigator.vibrate(15);
    if (batch.length === 0) queueMicrotask(flushBatch);
    batch.push(e);
  });
  const offThunder = onThunder(() => {
    sys.play('thunder');
  });

  const follow = (s: GameStore) => {
    sys.setCue(pickTrack(musicInput(s)));
    sys.setPaused(s.overlay === 'pause');
  };
  follow(store.getState());
  const offStore = store.subscribe(follow);

  const onVisibility = () => {
    if (document.hidden) sys.suspend();
    else sys.resume();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const offMenu = installMenuSounds((id) => {
    sys.play(id);
  }, store);

  let last = { x: 0, z: 0, at: 0 };
  const timer = setInterval(() => {
    const s = store.getState();
    const g = s.game;
    sys.setVolumes(s.settings.musicVolume, s.settings.sfxVolume);
    if (!g) return;
    const moved = Math.hypot(g.player.x - last.x, g.player.z - last.z) > 0.25;
    const now = performance.now();
    if (moved && s.isClockRunning() && now - last.at > STEP_MS) {
      sys.footstep(surfaceUnder(store));
      last = { ...last, at: now };
    }
    last = { ...last, x: g.player.x, z: g.player.z };
  }, 100);

  return () => {
    offEvents();
    offThunder();
    offStore();
    offMenu();
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    stopListening();
  };
}
