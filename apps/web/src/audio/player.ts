import { JINGLES, MUSIC, SFX_FILES } from './manifest';
import type { JingleFile, TrackId } from './music';
import type { SoundId } from './soundMap';

export interface PlayerDeps {
  ctx: BaseAudioContext;
  fetchBytes: (url: string) => Promise<ArrayBuffer>;
}

export interface Player {
  /** Crossfades to the track (1.2 s). The same track again does nothing; a load overtaken by a newer cue is dropped. */
  playTrack(id: TrackId): Promise<void>;
  /** Plays a jingle over the music, ducking the track and bringing it back after. */
  playJingle(id: JingleFile): Promise<void>;
  playSfx(id: SoundId, pitchMul: number): void;
  setPaused(paused: boolean): void;
  setVolumes(music: number, sfx: number): void;
  stats(): { activeTracks: number; loaded: number };
}

interface Playing {
  id: TrackId;
  src: AudioBufferSourceNode;
  gain: GainNode;
  /** When a fading track stops; null while it plays. */
  stopAt: number | null;
}

const CROSSFADE_SEC = 1.2;
/** A track already fading when the next cue arrives is cut this fast, so at most two ever overlap. */
const QUICK_FADE_SEC = 0.03;
/** SFX start this far ahead, so the audio thread never lands past their attack. */
const SFX_LEAD_SEC = 0.005;
const DUCK = { level: 0.25, downSec: 0.08, upSec: 0.8 };
const FILTER_HZ = { normal: 20000, paused: 1200 };
const FILTER_SEC = 0.4;
const PAUSED_GAIN = 0.6;
/** Decoded tracks are big (≈35 MB for 90 s); keep only this many (audio spec §5, orchestral spec §5.3). */
const MAX_DECODED_TRACKS = 2;

const url = (file: string) => `/assets/${file}`;

/**
 * The AAC loop player (orchestral spec §5.1, audio spec §5). Graph, built in this order:
 * trackBus (duck) → musicFilter (pause) → musicOut (volume) → destination, and sfxOut → destination.
 * Jingles join at musicFilter, past the duck. Every load error is caught: that sound stays silent.
 */
export function createPlayer({ ctx, fetchBytes }: PlayerDeps): Player {
  const trackBus = ctx.createGain();
  const musicOut = ctx.createGain();
  const sfxOut = ctx.createGain();
  const musicFilter = ctx.createBiquadFilter();
  musicFilter.type = 'lowpass';
  musicFilter.frequency.value = FILTER_HZ.normal;
  trackBus.connect(musicFilter).connect(musicOut).connect(ctx.destination);
  sfxOut.connect(ctx.destination);

  let musicVolume = 1;
  let paused = false;
  const tracks: Playing[] = [];
  let wanted: TrackId | null = null;
  let token = 0;
  let jingle: AudioBufferSourceNode | null = null;

  const bytes = new Map<string, Promise<ArrayBuffer>>();
  const decoded = new Map<TrackId, AudioBuffer>();
  const jingles = new Map<JingleFile, Promise<AudioBuffer>>();
  const sfx = new Map<SoundId, Promise<AudioBuffer>>();

  const fetchCached = (file: string) => {
    let hit = bytes.get(file);
    if (!hit) {
      hit = fetchBytes(url(file));
      bytes.set(file, hit);
      // A failed fetch may succeed later (the network came back).
      hit.catch(() => bytes.delete(file));
    }
    return hit;
  };
  // decodeAudioData detaches its input, so each decode gets its own copy of the cached bytes.
  const decode = async (file: string) => ctx.decodeAudioData((await fetchCached(file)).slice(0));

  const loadTrack = async (id: TrackId): Promise<AudioBuffer> => {
    const hit = decoded.get(id);
    if (hit) {
      decoded.delete(id);
      decoded.set(id, hit);
      return hit;
    }
    return decode(MUSIC[id].file);
  };
  /** Keeps a track's decoded audio, newest last. Only tracks that start playing are kept (a load a newer cue
   * overtook is dropped), so at most two are ever held: the one playing and the one fading out. */
  const remember = (id: TrackId, buffer: AudioBuffer) => {
    decoded.delete(id);
    decoded.set(id, buffer);
    for (const old of decoded.keys()) if (decoded.size > MAX_DECODED_TRACKS) decoded.delete(old);
  };

  const once = <K, V>(cache: Map<K, Promise<V>>, key: K, load: () => Promise<V>) => {
    let hit = cache.get(key);
    if (!hit) {
      hit = load();
      cache.set(key, hit);
      hit.catch(() => cache.delete(key));
    }
    return hit;
  };

  const prune = (now: number) => {
    for (let i = tracks.length - 1; i >= 0; i--) {
      const t = tracks[i];
      if (t && t.stopAt !== null && t.stopAt <= now) tracks.splice(i, 1);
    }
  };

  const fadeOut = (t: Playing, now: number, sec: number) => {
    const g = t.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + sec);
    t.src.stop(now + sec);
    t.stopAt = now + sec;
  };

  const applyMusicGain = () => {
    musicOut.gain.setTargetAtTime(musicVolume * (paused ? PAUSED_GAIN : 1), ctx.currentTime, 0.02);
  };

  return {
    async playTrack(id) {
      // Back to the track that is still playing (a cue flapped while another track loaded): keep it, and drop
      // the pending load so it never starts.
      if (tracks.some((t) => t.id === id && t.stopAt === null)) {
        wanted = id;
        token++;
        return;
      }
      if (wanted === id) return;
      wanted = id;
      const mine = ++token;
      let buffer: AudioBuffer;
      try {
        buffer = await loadTrack(id);
      } catch {
        if (mine === token) wanted = null;
        return;
      }
      if (mine !== token) return;
      remember(id, buffer);
      const now = ctx.currentTime;
      prune(now);
      for (let i = tracks.length - 1; i >= 0; i--) {
        const t = tracks[i];
        if (!t) continue;
        if (t.stopAt === null) fadeOut(t, now, CROSSFADE_SEC);
        else {
          fadeOut(t, now, QUICK_FADE_SEC);
          tracks.splice(i, 1);
        }
      }
      const { loopStart, loopEnd } = MUSIC[id];
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = loopStart;
      src.loopEnd = loopEnd;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SEC);
      src.connect(gain).connect(trackBus);
      src.onended = () => {
        src.disconnect();
        gain.disconnect();
      };
      src.start(now, loopStart);
      tracks.push({ id, src, gain, stopAt: null });
    },

    async playJingle(id) {
      let buffer: AudioBuffer;
      try {
        buffer = await once(jingles, id, () => decode(JINGLES[id].file));
      } catch {
        return;
      }
      const now = ctx.currentTime;
      jingle?.stop(now);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(musicFilter);
      src.onended = () => {
        src.disconnect();
      };
      src.start(now);
      jingle = src;
      const end = now + buffer.duration;
      const g = trackBus.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(DUCK.level, now + DUCK.downSec);
      g.setValueAtTime(DUCK.level, end);
      g.linearRampToValueAtTime(1, end + DUCK.upSec);
    },

    playSfx(id, pitchMul) {
      once(sfx, id, () => decode(SFX_FILES[id].file))
        .then((buffer) => {
          // A suspended context's clock is frozen: anything scheduled now would all play at once on resume
          // (iOS keeps it suspended until a gesture it counts). A missed one-shot is better than a burst.
          if (ctx.state !== 'running') return;
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.playbackRate.value = pitchMul;
          src.connect(sfxOut);
          src.onended = () => {
            src.disconnect();
          };
          src.start(ctx.currentTime + SFX_LEAD_SEC);
        })
        .catch(() => undefined);
    },

    setPaused(p) {
      paused = p;
      musicFilter.frequency.setTargetAtTime(
        p ? FILTER_HZ.paused : FILTER_HZ.normal,
        ctx.currentTime,
        FILTER_SEC / 3,
      );
      applyMusicGain();
    },

    setVolumes(music, sfxVolume) {
      musicVolume = music;
      sfxOut.gain.value = sfxVolume;
      applyMusicGain();
    },

    stats() {
      prune(ctx.currentTime);
      return { activeTracks: tracks.length, loaded: decoded.size };
    },
  };
}
