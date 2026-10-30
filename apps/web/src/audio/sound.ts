import type { CueId, JingleFile } from './music';
import type { SoundId, Surface } from './soundMap';

/** What actually makes sound. The chip backend in the game; a fake in tests. */
export interface AudioBackend {
  sfx(id: SoundId, pitchMul: number): void;
  cue(cue: CueId): void;
  jingle(id: JingleFile): void;
  setVolumes(music: number, sfx: number): void;
  setPaused(paused: boolean): void;
  suspend(): void;
  resume(): void;
}

export interface AudioState {
  unlocked: boolean;
  cue: CueId | null;
  /** The last jingle played. */
  jingle: JingleFile | null;
  lastSfx: SoundId | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The same one-shot within this window plays once (e.g. a milestone and a lesson chiming together). */
const REPEAT_MS = 150;
/** Footsteps alternate a little up and down in pitch. */
const STEP_PITCH = [0.97, 1.03] as const;

/** The game's audio rules: silent until a gesture unlocks it, deduped one-shots, clamped volumes. */
export function createSoundSystem(
  backend: AudioBackend,
  now: () => number = () => performance.now(),
) {
  const lastPlayed = new Map<SoundId, number>();
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      // A sound that fails to play must never break the game.
    }
  };
  let unlocked = false;
  let music = 0.6;
  let sfx = 0.8;
  let cue: CueId | null = null;
  let sentCue: CueId | null = null;
  let paused = false;
  let jingle: JingleFile | null = null;
  let lastSfx: SoundId | null = null;
  let step = 0;

  const sendCue = () => {
    if (!unlocked || cue === null || cue === sentCue) return;
    sentCue = cue;
    const c = cue;
    safe(() => {
      backend.cue(c);
    });
  };
  const playAt = (id: SoundId, pitchMul: number) => {
    if (!unlocked) return;
    const t = now();
    const last = lastPlayed.get(id);
    if (last !== undefined && t - last < REPEAT_MS) return;
    lastPlayed.set(id, t);
    lastSfx = id;
    safe(() => {
      backend.sfx(id, pitchMul);
    });
  };

  return {
    /** Call inside a user gesture: browsers only allow audio to start there. */
    unlock() {
      if (unlocked) return;
      unlocked = true;
      safe(() => {
        backend.resume();
      });
      safe(() => {
        backend.setVolumes(music, sfx);
      });
      if (paused)
        safe(() => {
          backend.setPaused(true);
        });
      sendCue();
    },
    play(id: SoundId) {
      playAt(id, 1);
    },
    footstep(surface: Surface) {
      playAt(`step-${surface}`, STEP_PITCH[step++ % 2] ?? 1);
    },
    setCue(next: CueId) {
      cue = next;
      sendCue();
    },
    playJingle(id: JingleFile) {
      if (!unlocked) return;
      jingle = id;
      safe(() => {
        backend.jingle(id);
      });
    },
    setVolumes(m: number, s: number) {
      const nm = clamp01(m);
      const ns = clamp01(s);
      if (nm === music && ns === sfx) return;
      music = nm;
      sfx = ns;
      if (unlocked)
        safe(() => {
          backend.setVolumes(music, sfx);
        });
    },
    volumes() {
      return { music, sfx };
    },
    setPaused(p: boolean) {
      if (p === paused) return;
      paused = p;
      if (unlocked)
        safe(() => {
          backend.setPaused(p);
        });
    },
    suspend() {
      if (unlocked)
        safe(() => {
          backend.suspend();
        });
    },
    resume() {
      if (unlocked)
        safe(() => {
          backend.resume();
        });
    },
    state(): AudioState {
      return { unlocked, cue, jingle, lastSfx };
    },
  };
}

export type SoundSystem = ReturnType<typeof createSoundSystem>;
