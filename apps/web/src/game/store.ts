import { applyCommand } from '@hearthvale/core';
import type { Command, GameEvent, GameState, SlotId } from '@hearthvale/core';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { eventBus as defaultBus, type EventBus } from './eventBus';
import { resolveTier, type QualityTier } from '../render/quality';

export type Screen = 'title' | 'slots' | 'newGame' | 'intro' | 'game';
export type Overlay = 'pause' | 'bin' | 'cart' | 'sleep' | 'morning' | 'restoring';
export type CameraYaw = 0 | 1 | 2 | 3;
export type ZoomStep = 0 | 1 | 2;

export interface Settings {
  quality: 'auto' | 'high' | 'low';
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  textScale: 1 | 1.25 | 1.5;
  seenTips: string[];
  introSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  musicVolume: 0.6,
  sfxVolume: 0.8,
  reducedMotion: false,
  textScale: 1,
  seenTips: [],
  introSeen: false,
};

const SETTINGS_KEY = 'hearthvale:settings';

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage blocked (private mode): settings live for this session only.
  }
}

export interface GameStore {
  game: GameState | null;
  screen: Screen;
  overlay: Overlay | null;
  slot: SlotId | null;
  playTimeMs: number;
  settings: Settings;
  cameraYaw: CameraYaw;
  zoomStep: ZoomStep;
  /** Tier picked from the device and lowered by the performance monitor. */
  autoTier: QualityTier;
  setAutoTier(tier: QualityTier): void;
  tier(): QualityTier;
  dispatch(cmd: Command): GameEvent[];
  startGame(state: GameState, slot: SlotId, playTimeMs?: number): void;
  replaceGame(state: GameState): void;
  setScreen(screen: Screen): void;
  setOverlay(overlay: Overlay | null): void;
  isClockRunning(): boolean;
  addPlayTime(ms: number): void;
  updateSettings(patch: Partial<Settings>): void;
  rotateCamera(dir: 1 | -1): void;
  zoom(dir: 1 | -1): void;
}

export function createGameStore({
  bus = defaultBus,
}: { bus?: EventBus } = {}): StoreApi<GameStore> {
  return createStore<GameStore>()((set, get) => ({
    game: null,
    screen: 'title',
    overlay: null,
    slot: null,
    playTimeMs: 0,
    settings: loadSettings(),
    cameraYaw: 0,
    zoomStep: 1,
    autoTier: 'high',
    setAutoTier(autoTier) {
      set({ autoTier });
    },
    tier() {
      return resolveTier(get().settings.quality, get().autoTier);
    },
    dispatch(cmd) {
      const { game } = get();
      if (!game) return [];
      const { state, events } = applyCommand(game, cmd);
      if (state !== game) set({ game: state });
      bus.emit(events);
      return events;
    },
    startGame(state, slot, playTimeMs = 0) {
      set({ game: state, slot, playTimeMs, overlay: null });
    },
    replaceGame(state) {
      set({ game: state });
    },
    setScreen(screen) {
      set({ screen });
    },
    setOverlay(overlay) {
      set({ overlay });
    },
    isClockRunning() {
      const { game, screen, overlay } = get();
      return game !== null && screen === 'game' && overlay === null && !document.hidden;
    },
    addPlayTime(ms) {
      set((s) => ({ playTimeMs: s.playTimeMs + ms }));
    },
    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      saveSettings(settings);
      set({ settings });
    },
    rotateCamera(dir) {
      set((s) => ({ cameraYaw: ((s.cameraYaw + dir + 4) % 4) as CameraYaw }));
    },
    zoom(dir) {
      set((s) => ({ zoomStep: Math.max(0, Math.min(2, s.zoomStep + dir)) as ZoomStep }));
    },
  }));
}

export const gameStore = createGameStore();

export function useGame<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore, selector);
}
