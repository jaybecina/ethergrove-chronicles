import type { JingleFile, TrackId } from './music';
import { createPlayer, type Player } from './player';
import type { SoundId } from './soundMap';

export interface BackendStats {
  contextState: AudioContextState | 'none';
  /** Tracks playing, including one still fading out. */
  activeTracks: number;
  /** Decoded tracks held in memory (at most 2). */
  loaded: number;
}

export interface OrchestraBackend {
  sfx(id: SoundId, pitchMul: number): void;
  cue(cue: TrackId): void;
  jingle(id: JingleFile): void;
  setVolumes(music: number, sfx: number): void;
  setPaused(paused: boolean): void;
  suspend(): void;
  resume(): void;
  stats(): BackendStats;
}

const ignore = () => undefined;

const defaultContext = (): AudioContext | null => {
  if (typeof AudioContext === 'undefined') return null;
  try {
    return new AudioContext();
  } catch {
    return null;
  }
};

const defaultFetch = async (url: string): Promise<ArrayBuffer> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${String(r.status)}`);
  return r.arrayBuffer();
};

/**
 * The game's audio backend over the AAC loop player (orchestral spec §5.2, audio spec §5). The context is made on
 * the first resume(), which runs inside the unlocking gesture. With no Web Audio, every call is a no-op.
 */
export function orchestraBackend(
  makeContext: () => AudioContext | null = defaultContext,
  fetchBytes: (url: string) => Promise<ArrayBuffer> = defaultFetch,
): OrchestraBackend {
  let ctx: AudioContext | null = null;
  let player: Player | null = null;
  let tried = false;
  const vol = { music: 0.6, sfx: 0.8 };
  let paused = false;

  const ready = () => {
    if (!tried) {
      tried = true;
      ctx = makeContext();
      if (ctx) {
        player = createPlayer({ ctx, fetchBytes });
        player.setVolumes(vol.music, vol.sfx);
        player.setPaused(paused);
      }
    }
  };

  return {
    sfx(id, pitchMul) {
      player?.playSfx(id, pitchMul);
    },
    cue(cue) {
      void player?.playTrack(cue);
    },
    jingle(id) {
      void player?.playJingle(id);
    },
    setVolumes(music, sfx) {
      vol.music = music;
      vol.sfx = sfx;
      player?.setVolumes(music, sfx);
    },
    setPaused(p) {
      paused = p;
      player?.setPaused(p);
    },
    suspend() {
      ctx?.suspend().catch(ignore);
    },
    resume() {
      ready();
      // Refused outside a user gesture; install.ts retries on the next one.
      ctx?.resume().catch(ignore);
    },
    stats() {
      const s = player?.stats() ?? { activeTracks: 0, loaded: 0 };
      return { contextState: ctx?.state ?? 'none', ...s };
    },
  };
}
