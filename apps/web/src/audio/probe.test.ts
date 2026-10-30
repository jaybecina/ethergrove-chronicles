import { describe, expect, it } from 'vitest';
import { loopCorrelation, rmsOf } from './probe';

const RATE = 1000;
const sine = (n: number, hz: number) =>
  Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * hz * i) / RATE));

describe('rmsOf', () => {
  it('is the root mean square of the samples', () => {
    expect(rmsOf(new Float32Array([1, -1, 1, -1]))).toBe(1);
    expect(rmsOf(sine(1000, 5))).toBeCloseTo(Math.SQRT1_2, 3);
    expect(rmsOf(new Float32Array(0))).toBe(0);
  });
});

describe('loopCorrelation', () => {
  it('is 1 when the audio at the loop end repeats the audio at the loop start', () => {
    // A 10 Hz sine has a whole number of cycles between 0.5 s and 2.5 s.
    expect(loopCorrelation(sine(4000, 10), RATE, 0.5, 2.5, 256)).toBeCloseTo(1, 6);
  });

  it('drops when the two ends differ (a seam the player would hear)', () => {
    expect(loopCorrelation(sine(4000, 10), RATE, 0.5, 2.525, 256)).toBeLessThan(0.99);
  });

  it('is 0 when a window runs past the end of the file', () => {
    expect(loopCorrelation(sine(1000, 10), RATE, 0.1, 0.95, 256)).toBe(0);
  });
});
