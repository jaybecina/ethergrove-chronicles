import { mulberry32 } from './reverb';
import { compilePiece, type Dyn, type Piece } from './score';
import type { KitId } from './samples';

/** The lo-fi master stage (audio spec §3.3). */
export interface LofiSpec {
  /** Tape wobble rate, 0.4–0.8 Hz. */
  wowHz: number;
  /** Wobble depth: delay swing, 0.5–2.0 ms. */
  wowMs: number;
  /** Saturation drive, 1.0–2.0. */
  drive: number;
  /** 5000–8000 Hz. */
  lowpassHz: number;
  /** Hiss level, −48 to −38 dBFS. */
  hissDb: number;
}

const RANGES: Record<keyof LofiSpec, [number, number]> = {
  wowHz: [0.4, 0.8],
  wowMs: [0.5, 2],
  drive: [1, 2],
  lowpassHz: [5000, 8000],
  hissDb: [-48, -38],
};
const SOFT_KIT = new Set<KitId>(['softKick', 'snareTap', 'shakerSoft']);
const SOFT_DYN = new Set<Dyn>(['pp', 'p', 'mp']);
const LOFI_BASS = new Set(['subBass', 'cellosPizz']);
const WOW_BASE_SEC = 0.01;
const HISS_SEED = 23;
const HISS_LOWPASS_HZ = 7000;

/** The wobble rate nearest `hz` that fits a whole number of cycles (at least 1) into the loop. */
export function fitWowRate(loopSeconds: number, hz: number): number {
  return Math.max(1, Math.round(loopSeconds * hz)) / loopSeconds;
}

/** Soft clipping: tanh(drive·x) / tanh(drive) over x in [−1, 1]. */
export function saturationCurve(drive: number, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  const norm = Math.tanh(drive);
  for (let i = 0; i < n; i++) c[i] = Math.tanh(drive * ((2 * i) / (n - 1) - 1)) / norm;
  return c;
}

/** Seeded pink noise, lowpassed at 7 kHz, peak-normalized to 1, that loops seamlessly at its own length. */
export function hissSamples(
  rate: number,
  seconds: number,
  seed = HISS_SEED,
): Float32Array<ArrayBuffer> {
  const rand = mulberry32(seed);
  const n = Math.round(rate * seconds);
  const white = Float32Array.from({ length: n }, () => rand() * 2 - 1);
  const out = new Float32Array(n);
  const lp = Math.exp((-2 * Math.PI * HISS_LOWPASS_HZ) / rate);
  // Paul Kellet's economy pink filter (−3 dB/octave), then the lowpass. The filters run over the same white noise
  // twice and only the second pass is kept: it continues from its own end, so the buffer loops with no step.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let y = 0;
  let peak = 0;
  for (let i = 0; i < 2 * n; i++) {
    const w = white[i % n] ?? 0;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    y = lp * y + (1 - lp) * (b0 + b1 + b2 + w * 0.1848);
    if (i >= n) {
      out[i - n] = y;
      peak = Math.max(peak, Math.abs(y));
    }
  }
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = (out[i] ?? 0) / peak;
  return out;
}

/**
 * Checks the lo-fi rules (audio spec §3.3) and throws naming the piece and the rule: tempo, swing, the soft kit at
 * mp or quieter, no snare taps on both beats 2 and 4 of a bar, a soft bass, and the `LofiSpec` ranges.
 */
export function validateLofi(p: Piece & { lofi?: LofiSpec }): void {
  const fail = (problem: string): never => {
    throw new Error(`${p.id}: ${problem}`);
  };
  if (!p.lofi) fail('not a lo-fi piece');
  const lofi = p.lofi as LofiSpec;
  if (p.bpm < 60 || p.bpm > 85) fail(`bpm ${String(p.bpm)} is outside 60–85`);
  if ((p.swing ?? 0) > 0.15) fail(`swing ${String(p.swing)} is above 0.15`);
  for (const key of Object.keys(RANGES) as (keyof LofiSpec)[]) {
    const [lo, hi] = RANGES[key];
    if (lofi[key] < lo || lofi[key] > hi)
      fail(`${key} ${String(lofi[key])} is outside ${String(lo)}–${String(hi)}`);
  }
  for (const [name, part] of Object.entries(p.parts)) {
    if (part.instrument === 'kit') {
      for (const kit of Object.values(part.kit ?? {}))
        if (!SOFT_KIT.has(kit)) fail(`${name}: ${kit} is not in the soft kit`);
      const dyns = (part.dyn ?? 'mf').split(/\s+/).filter((d) => d !== '<' && d !== '>');
      if (dyns.some((d) => !SOFT_DYN.has(d as Dyn))) fail(`${name}: kit above mp`);
    }
    if (/^bass/i.test(name) && !LOFI_BASS.has(part.instrument))
      fail(`${name}: ${part.instrument} is not subBass or cellosPizz`);
  }
  const c = compilePiece(p);
  for (let bar = 0; bar < c.totalBars; bar++) {
    const taps = new Set(
      c.hits
        .filter((h) => h.kit === 'snareTap' && Math.floor(h.step / c.barSteps) === bar)
        .map((h) => h.step % c.barSteps),
    );
    const beat = c.barSteps / c.meter;
    if (taps.has(beat) && taps.has(3 * beat))
      fail(`bar ${String(bar + 1)}: snare taps on beats 2 and 4`);
  }
}

/**
 * The lo-fi stage after `input`: tape wobble (a delay swung by a whole number of cycles per loop), saturation, a
 * lowpass, and seeded hiss looped at the loop length. Returns the stage's output node.
 */
export function applyLofi(
  ctx: BaseAudioContext,
  input: AudioNode,
  spec: LofiSpec,
  loopSeconds: number,
): AudioNode {
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = WOW_BASE_SEC;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = fitWowRate(loopSeconds, spec.wowHz);
  const depth = ctx.createGain();
  depth.gain.value = spec.wowMs / 1000;
  lfo.connect(depth).connect(delay.delayTime);
  const shaper = ctx.createWaveShaper();
  shaper.curve = saturationCurve(spec.drive);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = spec.lowpassHz;
  lowpass.Q.value = 0.7;
  const out = ctx.createGain();
  input.connect(delay).connect(shaper).connect(lowpass).connect(out);
  const samples = hissSamples(ctx.sampleRate, loopSeconds);
  const buffer = ctx.createBuffer(2, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  buffer.copyToChannel(samples, 1);
  const hiss = ctx.createBufferSource();
  hiss.buffer = buffer;
  hiss.loop = true;
  const level = ctx.createGain();
  level.gain.value = 10 ** (spec.hissDb / 20);
  hiss.connect(level).connect(out);
  lfo.start(0);
  hiss.start(0);
  return out;
}
