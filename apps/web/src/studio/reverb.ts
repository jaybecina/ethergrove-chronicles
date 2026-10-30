/** A small seeded PRNG, so the reverb (and the whole render) is the same every time. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A generated concert-hall impulse (spec §3.3): decorrelated noise per side, decaying to −60 dB at `seconds`,
 * after a short pre-delay, through a lowpass that darkens the tail from 12 kHz to 3 kHz.
 */
export function impulseSamples(
  rate: number,
  seconds: number,
  seed: number,
  preDelaySec = 0.02,
): { left: Float32Array; right: Float32Array } {
  const n = Math.round(rate * seconds);
  const pre = Math.round(rate * preDelaySec);
  const side = (rng: () => number) => {
    const out = new Float32Array(n);
    let y = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / rate;
      const frac = (i - pre) / (n - pre);
      const cutoff = 12000 - 9000 * frac;
      const a = Math.exp((-2 * Math.PI * cutoff) / rate);
      const x = (rng() * 2 - 1) * Math.exp((-6.9 * t) / seconds);
      y = (1 - a) * x + a * y;
      out[i] = y;
    }
    return out;
  };
  return { left: side(mulberry32(seed)), right: side(mulberry32(seed * 7919 + 1)) };
}

const toBuffer = (ctx: BaseAudioContext, seconds: number, seed: number): AudioBuffer => {
  const { left, right } = impulseSamples(ctx.sampleRate, seconds, seed);
  const buf = ctx.createBuffer(2, left.length, ctx.sampleRate);
  buf.copyToChannel(left as Float32Array<ArrayBuffer>, 0);
  buf.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
  return buf;
};

/** The music's hall: 2.8 s. */
export const hallImpulse = (ctx: BaseAudioContext): AudioBuffer => toBuffer(ctx, 2.8, 7);
/** A small room for sound effects: 0.6 s. */
export const roomImpulse = (ctx: BaseAudioContext): AudioBuffer => toBuffer(ctx, 0.6, 11);
