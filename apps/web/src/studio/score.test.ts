import { describe, expect, it } from 'vitest';
import { noteMidi } from './notes';
import { compilePiece, DYN_GAIN, validatePiece, type PartSpec, type Piece } from './score';

function piece(parts: Piece['parts'], extra: Partial<Piece> = {}): Piece {
  return { id: 't', kind: 'track', bpm: 120, meter: 4, parts, ...extra };
}
const lead = (notes: string, more: Partial<PartSpec> = {}): Piece['parts'] => ({
  lead: { instrument: 'flute', notes, ...more },
});
const at = (p: Piece) => compilePiece(p).tones.map((e) => [e.step, e.steps, e.midi]);

describe('compilePiece: notes', () => {
  it('places notes on the 16th grid and measures the piece', () => {
    const c = compilePiece(piece(lead('C4:4 D4:4 E4:8 | r:16')));
    expect(c.stepSec).toBe(0.125);
    expect(c.barSteps).toBe(16);
    expect(c.totalBars).toBe(2);
    expect(c.seconds).toBe(4);
    expect(c.tones.map((e) => [e.step, e.steps, e.midi])).toEqual([
      [0, 4, 60],
      [4, 4, 62],
      [8, 8, 64],
    ]);
  });

  it('ties a note across a bar line, and rejects a tie after a rest', () => {
    expect(at(piece(lead('C4:16 | ~:8 D4:8')))).toEqual([
      [0, 24, 60],
      [24, 8, 62],
    ]);
    expect(() => {
      validatePiece(piece(lead('C4:12 r:4 | ~:4 r:12')));
    }).toThrow('t lead bar 2: tie with no note');
  });

  it('arpeggiates chords and plays block chords together', () => {
    const arp = (mode: PartSpec['arp'] & string, steps: number, arpRate = 1) =>
      at(
        piece({
          h: {
            instrument: 'harp',
            notes: `(C4 E4 G4):${steps} r:${16 - steps}`,
            arp: mode,
            arpRate,
          },
        }),
      ).map((e) => e[2]);
    expect(arp('up', 4)).toEqual([60, 64, 67, 60]);
    expect(arp('down', 4)).toEqual([67, 64, 60, 67]);
    expect(arp('updown', 8)).toEqual([60, 64, 67, 64, 60, 64, 67, 64]);
    expect(arp('up', 6, 2)).toEqual([60, 64, 67]);
    expect(at(piece({ h: { instrument: 'violins', notes: '(C4 E4 G4):16' } }))).toEqual([
      [0, 16, 60],
      [0, 16, 64],
      [0, 16, 67],
    ]);
  });

  it('shifts a part by whole octaves', () => {
    expect(at(piece(lead('C4:16', { octave: -1 })))[0]?.[2]).toBe(48);
  });

  it('numbers notes within each part for round robins', () => {
    expect(compilePiece(piece(lead('C4 D4 E4 F4'))).tones.map((e) => e.noteIndex)).toEqual([
      0, 1, 2, 3,
    ]);
  });
});

describe('compilePiece: dynamics', () => {
  it('defaults to mf at the part gain of 0.5', () => {
    const [e] = compilePiece(piece(lead('C4:16'))).tones;
    expect(e?.gain).toBeCloseTo(0.5 * DYN_GAIN.mf);
    expect(e?.dyn).toBe('mf');
  });

  it('reads one dynamic per bar and ramps hairpins', () => {
    const c = compilePiece(piece(lead('C4:16 | C4:8 C4:8 | C4:16', { dyn: 'p < f', gain: 1 })));
    const g = c.tones.map((e) => e.gain);
    expect(g[0]).toBeCloseTo(0.4);
    expect(g[1]).toBeCloseTo(0.4);
    expect(g[2]).toBeCloseTo(0.4 + (0.85 - 0.4) * 0.5);
    expect(g[3]).toBeCloseTo(0.85);
    expect(c.tones.map((e) => e.dyn)).toEqual(['p', 'p', 'mp', 'f']);
  });

  it('needs a target after a hairpin', () => {
    expect(() => {
      validatePiece(piece(lead('C4:16 | C4:16', { dyn: 'p <' })));
    }).toThrow('t lead bar 2: hairpin needs a target');
  });

  it('rejects a dynamic count that does not match the bars', () => {
    expect(() => {
      validatePiece(piece(lead('C4:16 | C4:16', { dyn: 'p' })));
    }).toThrow('t lead: dyn has 1 bars, expected 2');
  });
});

describe('compilePiece: kit, pan and reverb', () => {
  it('reads kit parts one step per character', () => {
    const c = compilePiece(
      piece({
        perc: { instrument: 'kit', notes: 'k...t... k...t...', kit: { k: 'bassDrum', t: 'tamb' } },
      }),
    );
    expect(c.hits.map((h) => `${h.kit}@${h.step}`)).toEqual([
      'bassDrum@0',
      'tamb@4',
      'bassDrum@8',
      'tamb@12',
    ]);
    expect(() => {
      validatePiece(
        piece({ perc: { instrument: 'kit', notes: 'k...x...........', kit: { k: 'bassDrum' } } }),
      );
    }).toThrow('t perc bar 1: bad token "x"');
  });

  it('seats instruments in the orchestra unless the part says otherwise', () => {
    const c = compilePiece(
      piece({
        a: { instrument: 'violins', notes: 'C5:16' },
        b: { instrument: 'cellos', notes: 'C3:16', pan: -0.9, reverb: 0.6 },
      }),
    );
    expect(c.parts.a).toEqual({ pan: -0.35, reverb: 0.3 });
    expect(c.parts.b).toEqual({ pan: -0.9, reverb: 0.6 });
  });
});

describe('compilePiece: humanise, strum and swell (cinematic folk REQ-20 to REQ-22)', () => {
  const run = 'C4:2 D4:2 E4:2 F4:2 G4:2 A4:2 B4:2 C5:2';
  const human = { ms: 14, gain: 0.1 };

  it('moves notes and scales their gain the same way every time, within the limits', () => {
    const p = piece(lead(run, { gain: 1 }), { humanize: human });
    const a = compilePiece(p).tones;
    expect(a.map((e) => [e.offset, e.gain])).toEqual(
      compilePiece(p).tones.map((e) => [e.offset, e.gain]),
    );
    for (const e of a) {
      expect(Math.abs(e.offset)).toBeLessThanOrEqual(0.014);
      expect(e.gain).toBeGreaterThanOrEqual(DYN_GAIN.mf * 0.9 - 1e-9);
      expect(e.gain).toBeLessThanOrEqual(DYN_GAIN.mf * 1.1 + 1e-9);
    }
    expect(new Set(a.map((e) => e.offset)).size).toBeGreaterThan(4);
    expect(a[0]?.offset).toBeGreaterThanOrEqual(0);
  });

  it('leaves notes and hits on the grid at full gain without humanise', () => {
    const c = compilePiece(
      piece({
        ...lead(run, { gain: 1 }),
        perc: { instrument: 'kit', notes: 'k...k...k...k...', kit: { k: 'frameDrum' } },
      }),
    );
    expect(c.tones.every((e) => e.offset === 0 && e.gain === DYN_GAIN.mf)).toBe(true);
    expect(c.hits.every((h) => h.offset === 0)).toBe(true);
  });

  it('humanises kit hits too', () => {
    const c = compilePiece(
      piece(
        { perc: { instrument: 'kit', notes: 'k.k.k.k.k.k.k.k.', kit: { k: 'frameDrum' } } },
        { humanize: human },
      ),
    );
    expect(new Set(c.hits.map((h) => h.offset)).size).toBeGreaterThan(4);
    for (const h of c.hits) expect(Math.abs(h.offset)).toBeLessThanOrEqual(0.014);
  });

  it('strums block chords down on even 8ths and up on odd ones, at full gain', () => {
    const c = compilePiece(
      piece({
        s: {
          instrument: 'strumstick',
          notes: '(E3 B3 E4):2 (E3 B3 E4):2 r:12',
          strum: 25,
          gain: 1,
        },
      }),
    );
    const at = (step: number) =>
      c.tones.filter((e) => e.step === step).map((e) => [e.midi, e.offset]);
    expect(at(0)).toEqual([
      [52, 0],
      [59, 0.025],
      [64, 0.05],
    ]);
    expect(at(2)).toEqual([
      [52, 0.05],
      [59, 0.025],
      [64, 0],
    ]);
    expect(c.tones.every((e) => e.gain === DYN_GAIN.mf)).toBe(true);
  });

  it("gives every note its part's attack", () => {
    const c = compilePiece(piece(lead('C4:8 D4:8', { attack: 0.5 })));
    expect(c.tones.map((e) => e.attack)).toEqual([0.5, 0.5]);
    expect(compilePiece(piece(lead('C4:16'))).tones[0]?.attack).toBeUndefined();
  });
});

describe('validatePiece', () => {
  it('names the piece, part and bar of each problem', () => {
    const bad = (notes: string) => () => {
      validatePiece(piece(lead(notes)));
    };
    expect(bad('C4:12')).toThrow('t lead bar 1: has 12 steps, expected 16');
    expect(bad('C9:16')).toThrow('t lead bar 1: bad token "C9:16"');
    expect(bad('B8:16')).toThrow('t lead bar 1: note B8 out of range');
    expect(bad('~:4 r:12')).toThrow('t lead bar 1: tie with no note');
  });

  it('rejects parts of different lengths', () => {
    expect(() => {
      validatePiece(
        piece({
          a: { instrument: 'violins', notes: 'C5:16 | C5:16' },
          b: { instrument: 'cellos', notes: 'C3:16' },
        }),
      );
    }).toThrow('t: parts have different bar counts');
  });

  it('accepts sample-range notes down to octave 0', () => {
    expect(at(piece({ b: { instrument: 'tuba', notes: 'A#0:16' } }))[0]?.[2]).toBe(noteMidi('A#0'));
  });
});
