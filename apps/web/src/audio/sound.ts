import type { Season, Weather } from '@hearthvale/core';
import type { LoopId, SoundId, Surface } from './soundMap';

export interface SoundHandle {
  play(): void;
  stop(): void;
  volume(v: number): void;
  fade(from: number, to: number, ms: number): void;
}
export type SoundFactory = (id: SoundId | LoopId, opts: { loop: boolean }) => SoundHandle;

export interface AmbientState {
  weather: Weather;
  minute: number;
  outdoors: boolean;
  season: Season;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const CROSSFADE_MS = 2000;

function wantedAmbience(a: AmbientState): LoopId[] {
  if (!a.outdoors) return [];
  if (a.weather === 'storm') return ['rainAmbient', 'thunderAmbient'];
  if (a.weather === 'rain') return ['rainAmbient'];
  if (a.minute >= 1200 || a.minute < 330) return a.season === 'winter' ? ['wind'] : ['night'];
  if (a.season === 'summer') return ['cicadas'];
  if (a.season === 'winter') return ['wind'];
  return ['birds'];
}

export function createSoundSystem(factory: SoundFactory) {
  const handles = new Map<string, SoundHandle>();
  const get = (id: SoundId | LoopId, loop: boolean) => {
    let h = handles.get(id);
    if (!h) {
      h = factory(id, { loop });
      handles.set(id, h);
    }
    return h;
  };
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      // A sound that fails to load or play must never break the game.
    }
  };
  let unlocked = false;
  let music = 0.6;
  let sfx = 0.8;
  let track: LoopId | null = null;
  let ambience = new Set<LoopId>();
  let lastAmbient: AmbientState | null = null;

  const sys = {
    unlock() {
      unlocked = true;
    },
    play(id: SoundId) {
      if (!unlocked) return;
      const h = get(id, false);
      safe(() => {
        h.volume(sfx);
        h.play();
      });
    },
    playMusic(season: Season) {
      const next: LoopId = `music-${season}`;
      if (!unlocked || track === next) return;
      if (track) {
        const old = get(track, true);
        safe(() => {
          old.fade(music, 0, CROSSFADE_MS);
        });
      }
      const h = get(next, true);
      safe(() => {
        h.play();
        h.fade(0, music, CROSSFADE_MS);
      });
      track = next;
    },
    setAmbient(a: AmbientState) {
      lastAmbient = a;
      if (!unlocked) return;
      const want = new Set(wantedAmbience(a));
      for (const id of ambience)
        if (!want.has(id))
          safe(() => {
            get(id, true).stop();
          });
      for (const id of want)
        if (!ambience.has(id))
          safe(() => {
            const h = get(id, true);
            h.volume(sfx * 0.6);
            h.play();
          });
      ambience = want;
    },
    setVolumes(m: number, s: number) {
      music = clamp01(m);
      sfx = clamp01(s);
      if (track) {
        const h = get(track, true);
        safe(() => {
          h.volume(music);
        });
      }
      for (const id of ambience)
        safe(() => {
          get(id, true).volume(sfx * 0.6);
        });
    },
    volumes() {
      return { music, sfx };
    },
    footstep(surface: Surface) {
      sys.play(`step-${surface}`);
    },
    /** Re-apply ambience after unlock (sounds requested before the first gesture). */
    resume() {
      if (lastAmbient) sys.setAmbient(lastAmbient);
    },
  };
  return sys;
}

export type SoundSystem = ReturnType<typeof createSoundSystem>;
