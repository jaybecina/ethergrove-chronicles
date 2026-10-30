import { describe, expect, it } from 'vitest';
import {
  asContext,
  FakeAudioContext,
  FakeBufferSource,
  FakeDelay,
  FakeFilter,
  FakeOscillator,
} from '../test/fakeAudio';
import {
  applyLofi,
  fitWowRate,
  hissSamples,
  saturationCurve,
  validateLofi,
  type LofiSpec,
} from './lofi';
import type { Piece } from './score';

const SPEC: LofiSpec = { wowHz: 0.6, wowMs: 1, drive: 1.6, lowpassHz: 7000, hissDb: -42 };

/** A lo-fi piece that passes every rule (audio spec §3.3); each test breaks one thing. */
const valid = (): Piece & { lofi: LofiSpec } => ({
  id: 'cozy',
  kind: 'track',
  bpm: 72,
  meter: 4,
  swing: 0.1,
  lofi: { ...SPEC },
  parts: {
    keys: { instrument: 'ePiano', notes: '(C4 E4 G4):16 | (A3 C4 E4):16' },
    bass: { instrument: 'subBass', notes: 'C2:16 | A1:16' },
    drums: {
      instrument: 'kit',
      notes: 'k.....t.k.......|k...s.s.k.....t.',
      kit: { k: 'softKick', t: 'snareTap', s: 'shakerSoft' },
      dyn: 'p mp',
    },
  },
});

describe('fitWowRate', () => {
  it('fits a whole number of wobble cycles into the loop, so the loop stays seamless', () => {
    const r = fitWowRate(53.3, 0.6);
    expect(Number.isInteger(Math.round(r * 53.3 * 1e9) / 1e9)).toBe(true);
    expect(r * 53.3).toBe(32);
    expect(fitWowRate(0.5, 0.4) * 0.5).toBe(1);
  });
});

describe('saturationCurve', () => {
  it('is odd, rising, and stays within ±1', () => {
    const c = saturationCurve(1.6);
    expect(c).toHaveLength(2048);
    for (let i = 0; i < c.length; i++) {
      expect(c[i]).toBeCloseTo(-(c[c.length - 1 - i] ?? 0), 6);
      if (i > 0) expect(c[i] ?? 0).toBeGreaterThan(c[i - 1] ?? 0);
    }
    expect(c[0]).toBeCloseTo(-1, 6);
    expect(c.at(-1)).toBeCloseTo(1, 6);
  });
});

describe('hissSamples', () => {
  it('is the same for the same seed, different for another, and peaks at 1', () => {
    const a = hissSamples(8000, 1);
    expect(hissSamples(8000, 1)).toEqual(a);
    expect(hissSamples(8000, 1, 24)).not.toEqual(a);
    expect(a).toHaveLength(8000);
    expect(Math.max(...a.map(Math.abs))).toBeCloseTo(1, 6);
  });

  it('is pink: brighter than brown noise, darker than white (audio spec §3.3)', () => {
    // RMS of the sample-to-sample change over the RMS: brown 0.165, pink 0.380, white 1.122 (measured).
    const h = hissSamples(44100, 2);
    let change = 0;
    let level = 0;
    for (let i = 1; i < h.length; i++) {
      change += ((h[i] ?? 0) - (h[i - 1] ?? 0)) ** 2;
      level += (h[i] ?? 0) ** 2;
    }
    const brightness = Math.sqrt(change / level);
    expect(brightness).toBeGreaterThan(0.3);
    expect(brightness).toBeLessThan(0.6);
  });

  it('loops without a step: the jump from its last sample to its first is like any other', () => {
    const h = hissSamples(44100, 53.3); // the rain loop, where the old generator jumped 0.32 against 0.10 steps
    let biggest = 0;
    for (let i = 1; i < h.length; i++)
      biggest = Math.max(biggest, Math.abs((h[i] ?? 0) - (h[i - 1] ?? 0)));
    expect(Math.abs((h[0] ?? 0) - (h.at(-1) ?? 0))).toBeLessThanOrEqual(biggest);
  });
});

describe('validateLofi', () => {
  it('accepts a piece that follows every rule', () => {
    expect(() => {
      validateLofi(valid());
    }).not.toThrow();
  });

  it.each([
    ['too fast', (p: Piece & { lofi: LofiSpec }) => (p.bpm = 90), 'bpm 90'],
    ['too swung', (p: Piece & { lofi: LofiSpec }) => (p.swing = 0.2), 'swing 0.2'],
    [
      'a loud kit',
      (p: Piece & { lofi: LofiSpec }) => ((p.parts.drums ?? { dyn: '' }).dyn = 'p mf'),
      'drums: kit above mp',
    ],
    [
      'an unmarked kit (mf by default)',
      (p: Piece & { lofi: LofiSpec }) => delete (p.parts.drums ?? {}).dyn,
      'drums: kit above mp',
    ],
    [
      'a kit sound outside the soft kit',
      (p: Piece & { lofi: LofiSpec }) =>
        ((p.parts.drums ?? { kit: {} }).kit = { k: 'bassDrum', t: 'snareTap', s: 'shakerSoft' }),
      'drums: bassDrum',
    ],
    [
      'a synth bass that is not subBass',
      (p: Piece & { lofi: LofiSpec }) =>
        ((p.parts.bass ?? { instrument: 'pad' }).instrument = 'arp'),
      'bass: arp',
    ],
    ['wobble out of range', (p: Piece & { lofi: LofiSpec }) => (p.lofi.wowMs = 3), 'wowMs 3'],
    ['hiss too loud', (p: Piece & { lofi: LofiSpec }) => (p.lofi.hissDb = -30), 'hissDb -30'],
  ])('rejects %s', (_name, breakIt, message) => {
    const p = valid();
    breakIt(p);
    expect(() => {
      validateLofi(p);
    }).toThrow(message);
  });

  it('rejects a hip-hop backbeat: snare taps on both beat 2 and beat 4 of one bar', () => {
    const p = valid();
    const drums = p.parts.drums;
    if (!drums) throw new Error('no drums');
    drums.notes = 'k.......k.......|k...t...k...t...';
    expect(() => {
      validateLofi(p);
    }).toThrow('cozy: bar 2: snare taps on beats 2 and 4');
  });
});

describe('applyLofi', () => {
  it('wobbles, saturates, darkens and adds looped hiss after the input', () => {
    const fake = new FakeAudioContext();
    fake.sampleRate = 8000;
    const ctx = asContext(fake);
    const input = ctx.createGain();
    const out = applyLofi(ctx, input, SPEC, 53.3);
    const delay = fake.created('delay')[0] as FakeDelay;
    expect(delay.delayTime.value).toBeCloseTo(0.01);
    const lfo = fake.created('oscillator')[0] as FakeOscillator;
    expect(lfo.frequency.value * 53.3).toBeCloseTo(32);
    expect(fake.created('waveShaper')).toHaveLength(1);
    const lp = fake.created('filter')[0] as FakeFilter;
    expect([lp.type, lp.frequency.value, lp.Q.value]).toEqual(['lowpass', 7000, 0.7]);
    const hiss = fake.created('bufferSource')[0] as FakeBufferSource;
    expect(hiss.loop).toBe(true);
    expect((hiss.buffer as AudioBuffer).length).toBe(Math.round(53.3 * 8000));
    expect(out).toBeDefined();
  });
});
