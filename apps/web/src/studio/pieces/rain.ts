import { ROOTSONG_MINOR, transpose } from '../motifs';
import type { Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';

const CHORD: Record<string, string> = {
  Dm9: '(D4 F4 A4 C5 E5)',
  Bbmaj7: '(Bb3 D4 F4 A4)',
  Fmaj7: '(F3 A3 C4 E4)',
  C: '(C4 E4 G4)',
  Gm7: '(G3 Bb3 D4 F4)',
  A7sus4: '(A3 D4 E4 G4)',
  A7: '(A3 C#4 E4 G4)',
  Am7: '(A3 C4 E4 G4)',
};
const c = (name: string) => CHORD[name] ?? '(D4 F4 A4)';
const bar = (name: string) =>
  name.includes('·')
    ? name
        .split('·')
        .map((n) => `${c(n)}:8`)
        .join(' ')
    : `${c(name)}:16`;
const A = ['Dm9', 'Bbmaj7', 'Fmaj7', 'C', 'Dm9', 'Gm7', 'Bbmaj7', 'A7sus4·A7'];
const B = ['Gm7', 'Am7', 'Bbmaj7', 'C', 'Dm9', 'Gm7', 'A7sus4', 'Dm9'];
const ROOTS = [
  'D2',
  'Bb1',
  'F2',
  'C2',
  'D2',
  'G1',
  'Bb1',
  'A1',
  'G1',
  'A1',
  'Bb1',
  'C2',
  'D2',
  'G1',
  'A1',
  'D2',
];

/** The minor Rootsong in D minor for the upright (D5–Bb5), audio spec §4.2. */
const ROOTSONG_DM = transpose(ROOTSONG_MINOR, 15);

/**
 * "Rain on the Roots": lo-fi for rainy days, every season (audio spec §4.2). D minor (dorian colour), 72 bpm,
 * swing 0.08, 16 bars (≈53 s).
 * A: electric-piano chords, the second upright sings, sub bass; a soft kick on 1 and the "and" of 3, snare-tap
 * ghost notes on the off-beats (never on both 2 and 4), a tambourine shake in 16ths at pp.
 * B: the upright plays the minor Rootsong, the flute answers, a pad at p.
 */
export const rain: Piece = {
  id: 'rain',
  kind: 'track',
  bpm: 72,
  meter: 4,
  swing: 0.08,
  lofi: { wowHz: 0.6, wowMs: 1, drive: 1.6, lowpassHz: 7000, hissDb: -42 },
  parts: {
    upright: {
      instrument: 'uprightNr1',
      gain: 0.5,
      reverb: 0.3,
      dyn: dyn(['mp', 16]),
      notes: bars(
        'A4:4 C5:4 E5:8',
        'D5:4 C5:4 A4:8',
        'C5:4 E5:4 A5:8',
        'G5:8 E5:4 C5:4',
        'F5:4 E5:4 D5:8',
        'Bb4:4 D5:4 F5:8',
        'A5:8 F5:4 D5:4',
        'D5:8 C#5:8',
        ROOTSONG_DM,
        'A5:8 F5:8',
        'G5:8 E5:8',
        'F5:16',
        'D5:8 Bb4:8',
        rests(2),
      ),
    },
    flute: {
      instrument: 'flute',
      gain: 0.36,
      reverb: 0.4,
      dyn: dyn(['p', 16]),
      notes: bars(rests(10), 'F5:4 A5:4 D6:8', 'C6:8 G5:8', rests(2), 'E5:8 C#5:8', 'D5:16'),
    },
    keys: {
      instrument: 'ePiano',
      gain: 0.26,
      dyn: dyn(['p', 16]),
      notes: bars([...A, ...B].map(bar)),
    },
    pad: {
      instrument: 'pad',
      gain: 0.16,
      reverb: 0.5,
      dyn: dyn(['p', 16]),
      notes: bars(rests(8), held(B.map(c))),
    },
    bass: {
      instrument: 'subBass',
      gain: 0.42,
      reverb: 0.1,
      dyn: dyn(['mp', 16]),
      notes: bars(held(ROOTS)),
    },
    drums: {
      instrument: 'kit',
      gain: 0.3,
      kit: { k: 'softKick', t: 'snareTap' },
      dyn: dyn(['p', 16]),
      notes: bars(times(16, 'k.....t...k...t.')),
    },
    shaker: {
      instrument: 'kit',
      gain: 0.16,
      kit: { s: 'shakerSoft' },
      dyn: dyn(['pp', 16]),
      notes: bars(times(16, 'ssssssssssssssss')),
    },
  },
};
