import { noteMidi } from './notes';
import { hallImpulse, roomImpulse } from './reverb';
import { playSample } from './sampler';
import {
  KIT_LOWPASS,
  pickSample,
  SAMPLE_MAP,
  type InstrumentId,
  type KitId,
  type SampleIndex,
} from './samples';
import { compilePiece, type NoteEvent, type Piece } from './score';
import { applyLofi, validateLofi, type LofiSpec } from './lofi';
import { playSynth, SYNTH_IDS, type SynthId } from './synths';

export type MakeContext = (channels: number, length: number, rate: number) => OfflineAudioContext;
export type LoadSample = (path: string) => Promise<AudioBuffer>;

export interface Rendered {
  left: Float32Array;
  right: Float32Array;
  rate: number;
  /** Seconds, tracks only. */
  loopStart?: number;
  loopEnd?: number;
}

/** One layer of a sound effect; `at` and `dur` in ms. */
export interface SfxLayer {
  at: number;
  dur?: number;
  source: { file: string } | { kit: KitId } | { instrument: InstrumentId; note: string };
  gainDb?: number;
  lowpass?: number;
  highpass?: number;
  rate?: number;
  rateTo?: number;
  /** Release time constant in seconds after `dur`; default 0.03. */
  release?: number;
}
export interface SfxRecipe {
  layers: SfxLayer[];
  /** Peak level after normalizing, 0..1. */
  level: number;
}

const RATE = 44100;
const LOOP_EDGE_SEC = 0.5;
const TRACK_TAIL_SEC = 3;
const JINGLE_TAIL_SEC = 3;
const SFX_TAIL_SEC = 0.8;
const SFX_RELEASE_SEC = 0.03;
/** One-shots fade over their last 0.3 s, so a ringing note cut by the render's end never clicks. */
const ONE_SHOT_FADE_SEC = 0.3;
const LEVELS = {
  track: { rms: 0.1, peak: 0.89 },
  jingle: { rms: 0.11, peak: 0.89 },
  sfxPeak: 0.7,
};
const SYNTHS = new Set<string>(SYNTH_IDS);
const PLUCKED = new Set<InstrumentId>([
  'harp',
  'glock',
  'marimba',
  'violinsPizz',
  'cellosPizz',
  'clarinetStac',
]);

const defaultContext: MakeContext = (channels, length, rate) =>
  new OfflineAudioContext(channels, length, rate);

/**
 * The seamless-loop layout (spec §3.4): keep the second pass `[L, 2L)`, so the first pass's reverb tail wraps
 * into its start, and pad it with copies of its own edges. Both loop points then sit on identical audio, so an
 * encoder delay shifts them together and the loop stays seamless.
 */
export function wrapLoop(
  l: Float32Array,
  r: Float32Array,
  loopSamples: number,
  edgeSamples: number,
  rate: number,
): { left: Float32Array; right: Float32Array; loopStart: number; loopEnd: number } {
  const wrap = (src: Float32Array) => {
    const out = new Float32Array(loopSamples + 2 * edgeSamples);
    out.set(src.subarray(2 * loopSamples - edgeSamples, 2 * loopSamples), 0);
    out.set(src.subarray(loopSamples, 2 * loopSamples), edgeSamples);
    out.set(src.subarray(loopSamples, loopSamples + edgeSamples), edgeSamples + loopSamples);
    return out;
  };
  return {
    left: wrap(l),
    right: wrap(r),
    loopStart: edgeSamples / rate,
    loopEnd: (edgeSamples + loopSamples) / rate,
  };
}

const peakOf = (l: Float32Array, r: Float32Array) => {
  let p = 0;
  for (let i = 0; i < l.length; i++) p = Math.max(p, Math.abs(l[i] ?? 0), Math.abs(r[i] ?? 0));
  return p;
};

/** The gain that brings the RMS to `rmsTarget`, or less if the peak would pass `peakMax`. */
export function normalizeGain(
  l: Float32Array,
  r: Float32Array,
  rmsTarget: number,
  peakMax: number,
): number {
  let sum = 0;
  for (let i = 0; i < l.length; i++) sum += (l[i] ?? 0) ** 2 + (r[i] ?? 0) ** 2;
  const rms = Math.sqrt(sum / (2 * l.length || 1));
  const peak = peakOf(l, r);
  if (rms === 0 || peak === 0) return 1;
  return Math.min(rmsTarget / rms, peakMax / peak);
}

/** The length up to the last sample louder than `floorDb`. */
export function trimTail(l: Float32Array, r: Float32Array, floorDb = -70): number {
  const floor = 10 ** (floorDb / 20);
  for (let i = l.length - 1; i >= 0; i--)
    if (Math.abs(l[i] ?? 0) > floor || Math.abs(r[i] ?? 0) > floor) return i + 1;
  return 0;
}

const scale = (a: Float32Array, g: number) => {
  for (let i = 0; i < a.length; i++) a[i] = (a[i] ?? 0) * g;
};

const fadeOut = (a: Float32Array, samples: number) => {
  const n = Math.min(samples, a.length);
  for (let i = 0; i < n; i++) {
    const k = a.length - n + i;
    a[k] = (a[k] ?? 0) * (1 - (i + 1) / n);
  }
};

/**
 * The music master: compressor into the destination, with a hall reverb return. `post` inserts a stage between
 * the compressor and the destination (the lo-fi stage, audio spec §3.3).
 */
function musicGraph(
  ctx: OfflineAudioContext,
  impulse: (c: BaseAudioContext) => AudioBuffer,
  post?: (input: AudioNode) => AudioNode,
) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.02;
  comp.release.value = 0.25;
  (post ? post(comp) : comp).connect(ctx.destination);
  const master = ctx.createGain();
  master.connect(comp);
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx);
  verb.connect(master);
  const bus = (pan: number, send: number) => {
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(master);
    const s = ctx.createGain();
    s.gain.value = send;
    p.connect(s).connect(verb);
    return g;
  };
  return { bus };
}

async function loadAll(
  paths: Iterable<string>,
  load: LoadSample,
): Promise<Map<string, AudioBuffer>> {
  const unique = [...new Set(paths)];
  const buffers = await Promise.all(unique.map((p) => load(p)));
  return new Map(unique.map((p, i) => [p, buffers[i] as AudioBuffer]));
}

/** Renders a track (a seamless loop) or a jingle to normalized stereo samples. */
export async function renderPiece(
  piece: Piece,
  load: LoadSample,
  index: SampleIndex,
  makeContext: MakeContext = defaultContext,
): Promise<Rendered> {
  const c = compilePiece(piece);
  if (piece.lofi) validateLofi(piece);
  const isTrack = piece.kind === 'track';
  const passes = isTrack ? 2 : 1;
  const seconds = c.seconds * passes + (isTrack ? TRACK_TAIL_SEC : JINGLE_TAIL_SEC);
  const ctx = makeContext(2, Math.ceil(seconds * RATE), RATE);
  const { bus } = musicGraph(
    ctx,
    hallImpulse,
    piece.lofi && ((input) => applyLofi(ctx, input, piece.lofi as LofiSpec, c.seconds)),
  );
  const buses = Object.fromEntries(
    Object.entries(c.parts).map(([name, p]) => [name, bus(p.pan, p.reverb)]),
  );
  const sampleFor = (e: NoteEvent) => {
    if (SYNTHS.has(e.instrument)) return null;
    const pick = pickSample(index, e.instrument as InstrumentId, e.midi, e.dyn, e.noteIndex);
    if (!pick)
      throw new Error(`${piece.id} ${e.part}: no ${e.instrument} sample for MIDI ${e.midi}`);
    return pick;
  };
  const picks = c.tones.map(sampleFor);
  const kitPath = (kit: KitId, i: number) => {
    const files = index.kit[kit];
    const path = files[i % files.length];
    if (!path) throw new Error(`${piece.id}: no ${kit} sample`);
    return path;
  };
  const buffers = await loadAll(
    [
      ...picks.flatMap((p) => (p ? [p.ref.path] : [])),
      ...c.hits.map((h) => kitPath(h.kit, h.noteIndex)),
    ],
    load,
  );
  const timeOf = (step: number) =>
    step * c.stepSec + (step % 4 === 2 ? c.swing * c.stepSec * 2 : 0);
  for (let pass = 0; pass < passes; pass++) {
    const offset = pass * c.seconds;
    c.tones.forEach((e, i) => {
      const dest = buses[e.part] as GainNode;
      const start = offset + timeOf(e.step);
      const dur = e.steps * c.stepSec;
      const pick = picks[i];
      if (!pick) {
        playSynth(ctx, e.instrument as SynthId, { start, dur, midi: e.midi, gain: e.gain, dest });
        return;
      }
      const buffer = buffers.get(pick.ref.path) as AudioBuffer;
      const id = e.instrument as InstrumentId;
      const plucked = PLUCKED.has(id);
      const piano = id === 'piano';
      playSample(ctx, buffer, {
        start,
        dur: plucked
          ? null
          : piano
            ? dur + 0.1
            : Math.min(dur, SAMPLE_MAP[id].maxSustainSec || dur),
        rate: pick.rate,
        gain: e.gain,
        release: 0.25,
        dest,
      });
    });
    for (const h of c.hits) {
      const buffer = buffers.get(kitPath(h.kit, h.noteIndex)) as AudioBuffer;
      const lowpass = KIT_LOWPASS[h.kit];
      playSample(ctx, buffer, {
        start: offset + timeOf(h.step),
        dur: null,
        rate: 1,
        gain: h.gain,
        release: 0.1,
        dest: buses[h.part] as GainNode,
        ...(lowpass === undefined ? {} : { lowpass }),
      });
    }
  }
  const out = await ctx.startRendering();
  const l = out.getChannelData(0);
  const r = out.getChannelData(Math.min(1, out.numberOfChannels - 1 || 0));
  if (isTrack) {
    const L = Math.round(c.seconds * RATE);
    const w = wrapLoop(l, r, L, Math.round(LOOP_EDGE_SEC * RATE), RATE);
    const g = normalizeGain(w.left, w.right, LEVELS.track.rms, LEVELS.track.peak);
    scale(w.left, g);
    scale(w.right, g);
    return { ...w, rate: RATE };
  }
  const n = trimTail(l, r);
  const left = l.slice(0, n);
  const right = r.slice(0, n);
  const g = normalizeGain(left, right, LEVELS.jingle.rms, LEVELS.jingle.peak);
  scale(left, g);
  scale(right, g);
  fadeOut(left, ONE_SHOT_FADE_SEC * RATE);
  fadeOut(right, ONE_SHOT_FADE_SEC * RATE);
  return { left, right, rate: RATE };
}

/** Renders one sound effect: its layers in a small room, peaking at `0.7 × level`. */
export async function renderSfx(
  id: string,
  recipe: SfxRecipe,
  load: LoadSample,
  index: SampleIndex,
  makeContext: MakeContext = defaultContext,
): Promise<Rendered> {
  const resolve = (layer: SfxLayer): { path: string; rate: number } => {
    const s = layer.source;
    if ('file' in s) return { path: s.file, rate: layer.rate ?? 1 };
    if ('kit' in s) {
      const path = index.kit[s.kit][0];
      if (!path) throw new Error(`${id}: no ${s.kit} sample`);
      return { path, rate: layer.rate ?? 1 };
    }
    const pick = pickSample(index, s.instrument, noteMidi(s.note), 'mf', 0);
    if (!pick) throw new Error(`${id}: no ${s.instrument} sample for ${s.note}`);
    return { path: pick.ref.path, rate: pick.rate * (layer.rate ?? 1) };
  };
  const sources = recipe.layers.map(resolve);
  const buffers = await loadAll(
    sources.map((s) => s.path),
    load,
  );
  const ends = recipe.layers.map((layer, i) => {
    const src = sources[i];
    const natural = src ? (buffers.get(src.path)?.duration ?? 0) / src.rate : 0;
    const release = layer.release ?? SFX_RELEASE_SEC;
    return (
      layer.at / 1000 +
      (layer.dur !== undefined ? Math.min(natural, layer.dur / 1000 + release * 5) : natural)
    );
  });
  const seconds = Math.max(...ends) + SFX_TAIL_SEC;
  const ctx = makeContext(2, Math.ceil(seconds * RATE), RATE);
  const { bus } = musicGraph(ctx, roomImpulse);
  const dest = bus(0, 0.15);
  recipe.layers.forEach((layer, i) => {
    const src = sources[i];
    if (!src) return;
    playSample(ctx, buffers.get(src.path) as AudioBuffer, {
      start: layer.at / 1000,
      dur: layer.dur !== undefined ? layer.dur / 1000 : null,
      rate: src.rate,
      ...(layer.rateTo !== undefined
        ? { rateTo: src.rate * (layer.rateTo / (layer.rate ?? 1)) }
        : {}),
      gain: 10 ** ((layer.gainDb ?? 0) / 20),
      release: layer.release ?? SFX_RELEASE_SEC,
      dest,
      ...(layer.lowpass !== undefined ? { lowpass: layer.lowpass } : {}),
      ...(layer.highpass !== undefined ? { highpass: layer.highpass } : {}),
    });
  });
  const out = await ctx.startRendering();
  const l = out.getChannelData(0);
  const r = out.getChannelData(Math.min(1, out.numberOfChannels - 1 || 0));
  const n = trimTail(l, r);
  const left = l.slice(0, n);
  const right = r.slice(0, n);
  const peak = peakOf(left, right);
  const g = peak > 0 ? (LEVELS.sfxPeak * recipe.level) / peak : 1;
  scale(left, g);
  scale(right, g);
  // Short sounds fade over at most their last quarter, so the fade never dulls the hit itself.
  const fade = Math.min(ONE_SHOT_FADE_SEC * RATE, left.length / 4);
  fadeOut(left, fade);
  fadeOut(right, fade);
  return { left, right, rate: RATE };
}
