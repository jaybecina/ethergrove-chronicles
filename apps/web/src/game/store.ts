import { applyCommand } from '@ethergrove/core';
import type { Command, GameEvent, GameState, SlotId } from '@ethergrove/core';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { eventBus as defaultBus, type EventBus } from './eventBus';
import { resolveTier, type QualityTier } from '../render/quality';
import type { Device } from '../input/intents';

export type Screen = 'title' | 'slots' | 'newGame' | 'intro' | 'game';
export type Overlay = 'pause' | 'bin' | 'cart' | 'sleep' | 'morning' | 'restoring' | 'lessons';
export type CameraYaw = 0 | 1 | 2 | 3;
export type ZoomStep = 0 | 1 | 2;

export interface Settings {
  quality: 'auto' | QualityTier;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  textScale: 1 | 1.25 | 1.5;
  introSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  musicVolume: 0.6,
  sfxVolume: 0.8,
  reducedMotion: false,
  textScale: 1,
  introSeen: false,
};

const SETTINGS_KEY = 'ethergrove:settings';
/** Where settings lived before the rename to Ethergrove (spec §3.4): read once, then removed. */
const LEGACY_SETTINGS_KEY = 'hearthvale:settings';

/** Throws on invalid JSON. */
function parseSettings(raw: string): Settings {
  const parsed = JSON.parse(raw) as Partial<Settings>;
  // Copy known keys only, so retired settings (like the old seenTips) are dropped.
  const known = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
  return Object.fromEntries(
    known.map((k) => [k, parsed[k] ?? DEFAULT_SETTINGS[k]]),
  ) as unknown as Settings;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (raw) {
      if (legacy !== null) localStorage.removeItem(LEGACY_SETTINGS_KEY);
      return parseSettings(raw);
    }
    if (legacy === null) return DEFAULT_SETTINGS;
    let settings: Settings;
    try {
      settings = parseSettings(legacy);
    } catch {
      localStorage.removeItem(LEGACY_SETTINGS_KEY);
      return DEFAULT_SETTINGS;
    }
    // Write first, then remove: if the write fails, the old key stays for the next launch.
    if (saveSettings(settings)) localStorage.removeItem(LEGACY_SETTINGS_KEY);
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Returns false when storage is blocked (private mode, quota). */
function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    // Storage blocked (private mode): settings live for this session only.
    return false;
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
  /** Last input device used; picks button glyphs in prompts. */
  device: Device;
  setDevice(device: Device): void;
  setAutoTier(tier: QualityTier): void;
  tier(): QualityTier;
  dispatch(cmd: Command): GameEvent[];
  startGame(state: GameState, slot: SlotId, playTimeMs?: number): void;
  replaceGame(state: GameState): void;
  setScreen(screen: Screen): void;
  setOverlay(overlay: Overlay | null): void;
  isClockRunning(): boolean;
  /** Bumped to remount the 3D canvas (after GPU context loss). */
  canvasKey: number;
  remountCanvas(): void;
  /** Menu button: closes the open overlay, or opens the pause menu. */
  toggleMenu(): void;
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
    device: 'keyboard',
    setDevice(device) {
      if (get().device !== device) set({ device });
    },
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
    canvasKey: 0,
    remountCanvas() {
      set((s) => ({ canvasKey: s.canvasKey + 1 }));
    },
    toggleMenu() {
      if (get().screen !== 'game') return;
      set((s) => (s.overlay === 'restoring' ? s : { overlay: s.overlay ? null : 'pause' }));
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
