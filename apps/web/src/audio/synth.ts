import type { SoundId } from './soundMap';

/** Tiny procedural stand-ins for SFX whose audio file is missing. */
type Recipe = (ctx: AudioContext, out: AudioNode, t: number) => void;

function noise(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

const burst =
  (type: BiquadFilterType, freq: number, q: number, peak: number, decay: number): Recipe =>
  (ctx, out, t) => {
    const src = noise(ctx, decay + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(env(ctx, out, t, peak, 0.005, decay));
    src.start(t);
  };

const tones =
  (wave: OscillatorType, notes: number[], step: number, peak: number, decay: number): Recipe =>
  (ctx, out, t) => {
    notes.forEach((hz, i) => {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = hz;
      o.connect(env(ctx, out, t + i * step, peak, 0.01, decay));
      o.start(t + i * step);
      o.stop(t + i * step + decay + 0.05);
    });
  };

const RECIPES: Partial<Record<SoundId, Recipe>> = {
  hoe: burst('lowpass', 600, 1, 0.6, 0.12),
  water: burst('bandpass', 1800, 0.8, 0.25, 0.35),
  sickle: burst('highpass', 3500, 0.7, 0.3, 0.08),
  chop: burst('bandpass', 900, 3, 0.7, 0.1),
  break: burst('bandpass', 2400, 2, 0.6, 0.12),
  swing: burst('bandpass', 1200, 0.5, 0.12, 0.15),
  plant: tones('sine', [520], 0, 0.2, 0.12),
  refill: tones('sine', [420, 560, 700], 0.05, 0.12, 0.08),
  harvest: tones('triangle', [660, 990], 0.08, 0.25, 0.25),
  coin: tones('triangle', [1320, 1760], 0.06, 0.18, 0.18),
  chime: tones('sine', [784, 988, 1175, 1568], 0.09, 0.15, 0.6),
  eat: burst('bandpass', 2200, 1.5, 0.3, 0.06),
  door: burst('lowpass', 300, 1, 0.7, 0.18),
  deny: tones('square', [180, 150], 0.07, 0.06, 0.08),
  'step-grass': burst('highpass', 2500, 0.6, 0.06, 0.05),
  'step-dirt': burst('lowpass', 900, 0.8, 0.09, 0.05),
  'step-wood': burst('bandpass', 700, 4, 0.12, 0.05),
  'step-snow': burst('lowpass', 1600, 0.5, 0.1, 0.09),
  thunder: burst('lowpass', 160, 0.7, 0.9, 2.2),
};

let ctx: AudioContext | null = null;

export function synthPlay(id: SoundId, volume: number): boolean {
  const recipe = RECIPES[id];
  if (!recipe || typeof AudioContext === 'undefined') return false;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  recipe(ctx, master, ctx.currentTime + 0.01);
  return true;
}
