import { describe, expect, it } from 'vitest';
import { FakeAudioContext, FakeBufferSource, FakeConvolver, FakeFilter } from '../test/fakeAudio';
import {
  normalizeGain,
  renderPiece,
  renderSfx,
  trimTail,
  wrapLoop,
  type MakeContext,
  type SfxRecipe,
} from './render';
import { buildIndex, type SampleIndex } from './samples';
import type { Piece } from './score';

const ramp = (n: number) => Float32Array.from({ length: n }, (_, i) => i);

describe('wrapLoop', () => {
  it('keeps the second pass, so the reverb tail of the first wraps into its start', () => {
    const l = ramp(100);
    const out = wrapLoop(l, ramp(100), 40, 5, 10);
    expect(out.left).toHaveLength(40 + 2 * 5);
    expect(out.left[5]).toBe(40);
    expect(out.left[0]).toBe(75);
    expect(out.left[49]).toBe(44);
    expect(out.loopStart).toBe(0.5);
    expect(out.loopEnd).toBe(4.5);
  });

  it('has the same audio at both loop points, so any decoder offset stays seamless', () => {
    const out = wrapLoop(ramp(100), ramp(100), 40, 5, 10);
    for (let k = -5; k < 5; k++) expect(out.left[5 + 40 + k]).toBe(out.left[5 + k]);
  });
});

describe('levels', () => {
  it('normalizes to an RMS target unless that would push the peak too high', () => {
    const quiet = new Float32Array([0.05, -0.05, 0.05, -0.05]);
    expect(normalizeGain(quiet, quiet, 0.1, 0.89)).toBeCloseTo(2);
    const spiky = new Float32Array([0.5, 0, 0, 0]);
    expect(normalizeGain(spiky, spiky, 0.5, 0.89)).toBeCloseTo(0.89 / 0.5);
  });

  it('trims silence after the last audible sample', () => {
    const l = new Float32Array([0.5, 0.2, 0.001, 0, 0]);
    const r = new Float32Array([0, 0, 0, 0.0000001, 0]);
    expect(trimTail(l, r)).toBe(3);
  });
});

/** An offline context made of the fake, which "renders" a buffer full of a constant. */
function fakeOffline(value = 0.2): { make: MakeContext; ctxs: FakeAudioContext[] } {
  const ctxs: FakeAudioContext[] = [];
  const make: MakeContext = (_channels, length, rate) => {
    const f = new FakeAudioContext();
    f.sampleRate = rate;
    ctxs.push(f);
    return Object.assign(f, {
      startRendering: () =>
        Promise.resolve({
          length,
          getChannelData: () => new Float32Array(length).fill(value),
        } as unknown as AudioBuffer),
    }) as unknown as OfflineAudioContext;
  };
  return { make, ctxs };
}

const H = 'Strings/Harp/';
const INDEX: SampleIndex = buildIndex(
  [`${H}KSHarp_C4_mf.wav`, `${H}KSHarp_C5_mf.wav`, 'VSCO 1 Percussion/varWood/claves_mp.wav'],
  {},
);
const load = (path: string) =>
  Promise.resolve({ duration: 2, length: 16000, sampleRate: 8000, path } as unknown as AudioBuffer);

const track: Piece = {
  id: 'demo',
  kind: 'track',
  bpm: 120,
  meter: 4,
  parts: {
    harp: { instrument: 'harp', notes: 'C4:8 C5:8' },
    pad: { instrument: 'pad', notes: 'C4:16', reverb: 0.5 },
    perc: { instrument: 'kit', notes: 'c...............', kit: { c: 'claves' } },
  },
};

describe('renderPiece', () => {
  it('renders a track twice, through a hall reverb, and returns its loop points', async () => {
    const { make, ctxs } = fakeOffline();
    const out = await renderPiece(track, load, INDEX, make);
    const f = ctxs[0];
    if (!f) throw new Error('no context');
    // 2 s piece: two passes plus 3 s of tail, at 44.1 kHz.
    expect(f.sampleRate).toBe(44100);
    const starts = (f.created('bufferSource') as FakeBufferSource[])
      .map((s) => s.startedAt)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(starts).toEqual([0, 0, 1, 2, 2, 3]);
    expect(f.created('oscillator').length).toBeGreaterThan(0);
    expect((f.created('convolver')[0] as FakeConvolver).buffer).not.toBeNull();
    expect(out.loopStart).toBe(0.5);
    expect(out.loopEnd).toBe(2.5);
    expect(out.left).toHaveLength(Math.round(44100 * 3));
    expect(Math.sqrt(out.left.reduce((s, v) => s + v * v, 0) / out.left.length)).toBeCloseTo(0.1);
  });

  it('renders a jingle once, without loop points', async () => {
    const { make, ctxs } = fakeOffline();
    const out = await renderPiece({ ...track, id: 'j', kind: 'jingle' }, load, INDEX, make);
    expect(out.loopStart).toBeUndefined();
    expect((ctxs[0]?.created('bufferSource') ?? []).length).toBe(3);
    // A one-shot fades out over its last 0.3 s, so a still-ringing harp never ends on a click.
    expect(out.left.at(-1)).toBeCloseTo(0, 3);
    expect(out.left[out.left.length - Math.round(0.6 * 44100)]).toBeCloseTo(0.2 * (0.11 / 0.2), 2);
  });

  it('plays the soft kick through a 2000 Hz lowpass, and other kit sounds unfiltered', async () => {
    const { make, ctxs } = fakeOffline();
    const index = buildIndex(
      ['Percussion/BDrumNewhit_v1_rr1_Sum.wav', 'VSCO 1 Percussion/varWood/claves_mp.wav'],
      {},
    );
    const kicks: Piece = {
      ...track,
      kind: 'jingle',
      parts: {
        perc: { instrument: 'kit', notes: 'k.......c.......', kit: { k: 'softKick', c: 'claves' } },
      },
    };
    await renderPiece(kicks, load, index, make);
    const lowpasses = (ctxs[0]?.created('filter') ?? []).filter(
      (f) => (f as FakeFilter).type === 'lowpass' && (f as FakeFilter).frequency.value === 2000,
    );
    expect(lowpasses).toHaveLength(1);
  });

  it('runs a lo-fi track through the lo-fi stage, and refuses one that breaks the rules', async () => {
    const { make, ctxs } = fakeOffline();
    const lofi: Piece = {
      ...track,
      bpm: 72,
      parts: { keys: { instrument: 'ePiano', notes: 'C4:16' } },
      lofi: { wowHz: 0.6, wowMs: 1, drive: 1.4, lowpassHz: 6500, hissDb: -44 },
    };
    await renderPiece(lofi, load, INDEX, make);
    expect(ctxs[0]?.created('waveShaper')).toHaveLength(1);
    expect((ctxs[0]?.created('bufferSource') as FakeBufferSource[]).some((s) => s.loop)).toBe(true);
    await expect(renderPiece({ ...lofi, bpm: 120 }, load, INDEX, make)).rejects.toThrow(
      'demo: bpm 120',
    );
    await renderPiece(track, load, INDEX, make);
    expect(ctxs.at(-1)?.created('waveShaper')).toHaveLength(0);
  });

  it('fails clearly when a note has no sample', async () => {
    const { make } = fakeOffline();
    await expect(
      renderPiece(
        { ...track, parts: { v: { instrument: 'violins', notes: 'C4:16' } } },
        load,
        INDEX,
        make,
      ),
    ).rejects.toThrow('demo v: no violins sample for MIDI 60');
  });
});

describe('renderSfx', () => {
  it('lets a layer ring for its own release before stopping', async () => {
    const { make, ctxs } = fakeOffline(0.5);
    await renderSfx(
      'ring',
      {
        level: 0.5,
        layers: [{ at: 0, source: { instrument: 'harp', note: 'C5' }, dur: 400, release: 0.25 }],
      },
      load,
      INDEX,
      make,
    );
    expect((ctxs[0]?.created('bufferSource')[0] as FakeBufferSource).stoppedAt).toBeCloseTo(
      0.4 + 0.25 * 5,
    );
  });

  it('layers files, kit sounds and notes into a small room, peaking at the recipe level', async () => {
    const { make, ctxs } = fakeOffline(0.5);
    const recipe: SfxRecipe = {
      level: 0.6,
      layers: [
        { at: 0, source: { file: 'Miscellania Raw/Misc 1/bubbles.wav' }, dur: 400, lowpass: 2000 },
        { at: 60, source: { kit: 'claves' }, gainDb: -6 },
        { at: 120, source: { instrument: 'harp', note: 'C5' } },
      ],
    };
    const out = await renderSfx('test', recipe, load, INDEX, make);
    const starts = (ctxs[0]?.created('bufferSource') as FakeBufferSource[]).map((s) => s.startedAt);
    expect(starts).toEqual([0, 0.06, 0.12]);
    expect(out.left.reduce((m, v) => Math.max(m, Math.abs(v)), 0)).toBeCloseTo(0.7 * 0.6);
  });
});
