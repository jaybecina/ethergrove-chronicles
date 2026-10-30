import { describe, expect, it } from 'vitest';
import { impulseSamples, mulberry32 } from './reverb';

const rms = (a: Float32Array) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

describe('generated reverb', () => {
  it('is seeded: the same seed always gives the same random numbers', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const c = mulberry32(8);
    const xs = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(xs);
    expect(c()).not.toBe(xs[0]);
    for (const x of xs) expect(x >= 0 && x < 1).toBe(true);
  });

  it('renders the same impulse for the same seed, and a different one otherwise', () => {
    const a = impulseSamples(8000, 1, 7);
    expect(impulseSamples(8000, 1, 7).left).toEqual(a.left);
    expect(impulseSamples(8000, 1, 9).left).not.toEqual(a.left);
  });

  it('is silent for the pre-delay, then decays to almost nothing', () => {
    const { left, right } = impulseSamples(8000, 1, 7);
    expect(left).toHaveLength(8000);
    expect([...left.slice(0, 160)].every((v) => v === 0)).toBe(true);
    const early = rms(left.slice(160, 960));
    const late = rms(left.slice(7200));
    expect(late).toBeLessThan(early * 0.01);
    expect(right).not.toEqual(left);
  });
});
