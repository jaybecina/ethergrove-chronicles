import { describe, expect, it } from 'vitest';
import { FakeAudioContext, FakeBufferSource } from '../test/fakeAudio';
import { orchestraBackend } from './orchestraBackend';

function fakeContext() {
  const fake = new FakeAudioContext();
  Object.assign(fake, { decodeAudioData: () => Promise.resolve({ duration: 2 }) });
  return fake;
}
const fetchBytes = () => Promise.resolve(new ArrayBuffer(8));
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('orchestra backend', () => {
  it('runs silent when there is no AudioContext', () => {
    const b = orchestraBackend(() => null, fetchBytes);
    b.resume();
    b.cue('spring');
    b.jingle('morning');
    b.sfx('hoe', 1);
    b.setVolumes(0.5, 0.5);
    b.setPaused(true);
    b.suspend();
    expect(b.stats()).toEqual({ contextState: 'none', activeTracks: 0, loaded: 0 });
  });

  it('makes the context on the first resume, then plays cues', async () => {
    const fake = fakeContext();
    let made = 0;
    const b = orchestraBackend(() => {
      made++;
      return fake as unknown as AudioContext;
    }, fetchBytes);
    b.cue('spring');
    expect(made).toBe(0);
    b.resume();
    b.resume();
    expect(made).toBe(1);
    b.cue('rain');
    await settle();
    expect((fake.created('bufferSource') as FakeBufferSource[]).filter((s) => s.loop)).toHaveLength(
      1,
    );
    expect(b.stats()).toMatchObject({ contextState: 'running', activeTracks: 1, loaded: 1 });
  });

  it('applies volumes set before the context existed', () => {
    const fake = fakeContext();
    const b = orchestraBackend(() => fake as unknown as AudioContext, fetchBytes);
    b.setVolumes(0.3, 0.5);
    b.resume();
    const [, musicOut, sfxOut] = fake.created('gain');
    expect(
      (musicOut as unknown as { gain: { calls: unknown[][] } }).gain.calls.at(-1)?.[1],
    ).toBeCloseTo(0.3);
    expect((sfxOut as unknown as { gain: { value: number } }).gain.value).toBe(0.5);
  });

  it('swallows a refused resume or suspend (outside a gesture)', async () => {
    const fake = fakeContext();
    fake.resume = () => Promise.reject(new Error('not allowed'));
    fake.suspend = () => Promise.reject(new Error('not allowed'));
    const b = orchestraBackend(() => fake as unknown as AudioContext, fetchBytes);
    b.resume();
    b.suspend();
    await settle();
  });
});
