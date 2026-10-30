import { describe, expect, it } from 'vitest';
import {
  asContext,
  FakeAudioContext,
  FakeBufferSource,
  FakeFilter,
  FakeGain,
  FakeOscillator,
  FakeSource,
} from '../test/fakeAudio';
import { playSample } from './sampler';
import { playSynth, type SynthId } from './synths';

const buffer = (duration: number) =>
  ({ duration, length: duration * 8000, sampleRate: 8000 }) as AudioBuffer;

function setup() {
  const fake = new FakeAudioContext();
  const ctx = asContext(fake);
  const dest = fake.createGain() as unknown as AudioNode;
  return { fake, ctx, dest };
}
const endAll = (fake: FakeAudioContext, from: number) => {
  for (const n of fake.nodes.slice(from)) if (n instanceof FakeSource) n.end();
};

describe('playSample', () => {
  it('pitches the sample and starts it on time', () => {
    const { fake, ctx, dest } = setup();
    playSample(ctx, buffer(4), { start: 2, dur: 1, rate: 1.5, gain: 0.5, release: 0.25, dest });
    const src = fake.created('bufferSource')[0] as FakeBufferSource;
    expect(src.startedAt).toBe(2);
    expect(src.playbackRate.calls[0]).toEqual(['setValueAtTime', 1.5, 2]);
  });

  it('releases after the note and stops once silent, or when the sample runs out', () => {
    const { fake, ctx, dest } = setup();
    playSample(ctx, buffer(10), { start: 0, dur: 1, rate: 1, gain: 0.5, release: 0.25, dest });
    playSample(ctx, buffer(2), { start: 0, dur: 5, rate: 1, gain: 0.5, release: 0.25, dest });
    playSample(ctx, buffer(3), { start: 1, dur: null, rate: 2, gain: 0.5, release: 0.08, dest });
    const stops = (fake.created('bufferSource') as FakeBufferSource[]).map((s) => s.stoppedAt);
    expect(stops).toEqual([1 + 1.25, 2, 1 + 1.5]);
  });

  it('can filter and sweep the pitch', () => {
    const { fake, ctx, dest } = setup();
    playSample(ctx, buffer(1), {
      start: 0,
      dur: 0.5,
      rate: 0.8,
      rateTo: 1.3,
      gain: 0.5,
      release: 0.08,
      dest,
      lowpass: 900,
      highpass: 200,
    });
    const src = fake.created('bufferSource')[0] as FakeBufferSource;
    expect(src.playbackRate.calls.at(-1)?.[0]).toBe('linearRampToValueAtTime');
    expect(src.playbackRate.calls.at(-1)?.[1]).toBe(1.3);
    const filters = fake.created('filter') as FakeFilter[];
    expect(filters.map((f) => [f.type, f.frequency.value])).toEqual([
      ['lowpass', 900],
      ['highpass', 200],
    ]);
  });

  it('disconnects everything it made when it ends', () => {
    const { fake, ctx, dest } = setup();
    const from = fake.nodes.length;
    playSample(ctx, buffer(1), {
      start: 0,
      dur: 0.5,
      rate: 1,
      gain: 0.5,
      release: 0.1,
      dest,
      lowpass: 500,
    });
    endAll(fake, from);
    expect(fake.nodes.slice(from).every((n) => n.disconnected)).toBe(true);
  });
});

describe('playSynth', () => {
  it('detunes the pad’s three saws and warms them with a lowpass', () => {
    const { fake, ctx, dest } = setup();
    playSynth(ctx, 'pad', { start: 0, dur: 2, midi: 60, gain: 0.3, dest });
    const oscs = fake.created('oscillator') as FakeOscillator[];
    expect(oscs.map((o) => [o.type, o.detune.value])).toEqual([
      ['sawtooth', -7],
      ['sawtooth', 0],
      ['sawtooth', 7],
    ]);
    expect((fake.created('filter')[0] as FakeFilter).frequency.value).toBe(1800);
  });

  it('shapes the choir with two vowel formants', () => {
    const { fake, ctx, dest } = setup();
    playSynth(ctx, 'choir', { start: 0, dur: 2, midi: 60, gain: 0.3, dest });
    const bands = (fake.created('filter') as FakeFilter[]).filter((f) => f.type === 'bandpass');
    expect(bands.map((f) => f.frequency.value)).toEqual([700, 1200]);
  });

  it('makes the electric piano with FM, a fading brightness and a tremolo (audio spec §3.2)', () => {
    const { fake, ctx, dest } = setup();
    playSynth(ctx, 'ePiano', { start: 1, dur: 2, midi: 69, gain: 0.3, dest });
    const oscs = fake.created('oscillator') as FakeOscillator[];
    // Carrier and modulator at 440 Hz (ratio 1), and the 4.5 Hz tremolo.
    expect(oscs.map((o) => [o.type, o.frequency.value])).toEqual([
      ['sine', 440],
      ['sine', 440],
      ['sine', 4.5],
    ]);
    const gains = fake.created('gain') as FakeGain[];
    // FM index 2.0 → 0.3 over 0.6 s: deviation 880 Hz → 132 Hz.
    const index = gains.find(
      (g) => g.gain.calls[0]?.[0] === 'setValueAtTime' && g.gain.calls[0][1] === 880,
    );
    const [set, ramp] = index?.gain.calls ?? [];
    expect(set).toEqual(['setValueAtTime', 880, 1]);
    expect(ramp?.[0]).toBe('linearRampToValueAtTime');
    expect(ramp?.[1]).toBeCloseTo(132);
    expect(ramp?.[2]).toBeCloseTo(1.6);
    expect(gains.some((g) => Math.abs(g.gain.value - (10 ** (1.5 / 20) - 1)) < 1e-9)).toBe(true);
    // gains[0] is the test's own destination; the envelope is the first gain the synth makes.
    const env = gains[1];
    expect(env?.gain.calls[1]).toEqual(['linearRampToValueAtTime', 0.3, 1.004]);
    expect(oscs[0]?.stoppedAt).toBeCloseTo(3 + 0.35 * 4);
  });

  it('never ramps exponentially to zero and always cleans up', () => {
    const { fake, ctx, dest } = setup();
    const from = fake.nodes.length;
    for (const id of ['pad', 'subBass', 'arp', 'choir', 'ePiano'] as SynthId[])
      playSynth(ctx, id, { start: 0, dur: 1, midi: 48, gain: 0.3, dest });
    const bad = fake
      .allParamCalls()
      .filter((c) => c[0] === 'exponentialRampToValueAtTime' && c[1] <= 0);
    expect(bad).toEqual([]);
    endAll(fake, from);
    expect(fake.nodes.slice(from).every((n) => n.disconnected)).toBe(true);
  });
});
