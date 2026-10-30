import type { Piece } from '../score';
import { bars, dyn, held, rests, silent, times } from './notation';

/** The Rootsong in E♭ for the piano (C5–B♭5), written in flats. */
const ROOTSONG_EB = 'C5:2 Eb5:2 G5:4 F5:2 Eb5:2 Bb5:4 | Ab5:2 G5:2 F5:2 G5:2 Eb5:8';

const MELODY_A = [
  'G5:4 Bb5:4 Eb6:8',
  'D6:4 C6:4 G5:8',
  'Ab5:4 C6:4 Eb6:4 C6:4',
  'Bb5:12 r:4',
  'G5:4 Bb5:4 Eb6:4 F6:4',
  'G6:8 Eb6:4 C6:4',
  'Ab5:6 G5:2 F5:8',
  'F5:4 Bb5:4 D6:8',
];
const MELODY_B = [
  'C6:8 Eb6:4 C6:4',
  'D6:8 F6:4 D6:4',
  'Bb5:4 D6:4 G6:8',
  'G6:4 Eb6:4 C6:8',
  'Ab5:4 C6:4 Eb6:4 Ab6:4',
  'F6:8 C6:4 Ab5:4',
  'Eb6:8 F5:4 Bb5:4',
  'D6:12 r:4',
];
const CODA = ['G5:4 Bb5:4 Eb6:8', 'C6:8 G5:8', 'Ab5:4 C6:4 Eb6:8', 'D6:12 r:4'];
const LH: Record<string, string> = {
  Eb: '(Eb3 Bb3 G4)',
  Cm: '(C3 G3 Eb4)',
  Ab: '(Ab2 Eb3 C4)',
  Bb: '(Bb2 F3 D4)',
  Fm7: '(F2 C3 Ab3 Eb4)',
  Gm: '(G2 D3 Bb3)',
  Fm: '(F2 C3 Ab3)',
  Bbsus4: '(Bb2 F3 Eb4)',
};
const A = ['Eb', 'Cm', 'Ab', 'Bb', 'Eb', 'Cm', 'Fm7', 'Bb'];
const B = ['Ab', 'Bb', 'Gm', 'Cm', 'Ab', 'Fm', 'Bbsus4', 'Bb'];
const C = ['Eb', 'Cm', 'Ab', 'Bb'];

/**
 * "Snow on the Roots": tender, a piano by the fire. E♭ major, 66 bpm, 20 bars: A, B, then four bars of piano alone.
 * A glock doubles every other phrase; violins sing B over sleigh bells; a harp gliss leads into the coda.
 */
export const winter: Piece = {
  id: 'winter',
  kind: 'track',
  bpm: 66,
  meter: 4,
  parts: {
    piano: {
      instrument: 'piano',
      gain: 0.55,
      reverb: 0.4,
      dyn: dyn(['mp', 8], ['p', 8], ['p', 4]),
      // In B the piano takes the Rootsong over Cm and Ab (bars 12–13, audio spec §4.2).
      notes: bars(MELODY_A, rests(3), ROOTSONG_EB, rests(3), CODA),
    },
    pianoLeft: {
      instrument: 'piano',
      arp: 'up',
      arpRate: 2,
      gain: 0.38,
      reverb: 0.4,
      dyn: dyn(['mp', 8], ['p', 12]),
      notes: bars(held([...A, ...B, ...C].map((c) => LH[c] ?? '(Eb3 Bb3 G4)'))),
    },
    glock: {
      instrument: 'glock',
      octave: 1,
      gain: 0.22,
      dyn: dyn(['p', 20]),
      notes: bars(rests(4), MELODY_A.slice(4), rests(5), MELODY_B.slice(5), rests(4)),
    },
    violins: {
      instrument: 'violins',
      octave: -1,
      gain: 0.48,
      dyn: dyn(['pp', 8], ['p', 8], ['pp', 4]),
      // Rests while the piano plays the Rootsong (bars 12–13).
      notes: bars(rests(8), MELODY_B.slice(0, 3), rests(2), MELODY_B.slice(5), rests(4)),
    },
    violas: {
      instrument: 'violas',
      gain: 0.28,
      dyn: dyn(['pp', 16], ['pp', 4]),
      notes: bars(
        held(['G3', 'G3', 'Ab3', 'F3', 'G3', 'G3', 'Ab3', 'F3']),
        held(['Ab3', 'Bb3', 'Bb3', 'G3', 'Ab3', 'Ab3', 'Bb3', 'Bb3']),
        rests(4),
      ),
    },
    cellos: {
      instrument: 'cellos',
      gain: 0.32,
      dyn: dyn(['pp', 16], ['pp', 4]),
      notes: bars(
        held(['Eb2', 'C2', 'Ab2', 'Bb2', 'Eb2', 'C2', 'F2', 'Bb2']),
        held(['Ab2', 'Bb2', 'G2', 'C2', 'Ab2', 'F2', 'Bb2', 'Bb2']),
        rests(4),
      ),
    },
    pad: {
      instrument: 'pad',
      gain: 0.12,
      dyn: dyn(['pp', 20]),
      notes: bars(
        held([
          '(Eb4 G4 Bb4)',
          '(Eb4 G4 C5)',
          '(Eb4 Ab4 C5)',
          '(D4 F4 Bb4)',
          '(Eb4 G4 Bb4)',
          '(Eb4 G4 C5)',
          '(Eb4 Ab4 C5)',
          '(D4 F4 Bb4)',
        ]),
        held([
          '(Eb4 Ab4 C5)',
          '(D4 F4 Bb4)',
          '(D4 G4 Bb4)',
          '(Eb4 G4 C5)',
          '(Eb4 Ab4 C5)',
          '(F4 Ab4 C5)',
          '(Eb4 F4 Bb4)',
          '(D4 F4 Bb4)',
        ]),
        rests(4),
      ),
    },
    harp: {
      instrument: 'harp',
      arp: 'up',
      gain: 0.35,
      dyn: dyn(['mp', 20]),
      notes: bars(rests(15), 'r:8 (Bb3 D4 F4 Bb4 D5 F5 Bb5 D6):8', rests(4)),
    },
    perc: {
      instrument: 'kit',
      gain: 0.2,
      kit: { s: 'sleigh' },
      dyn: dyn(['pp', 20]),
      notes: bars(silent(8), times(8, '..s...s...s...s.'), silent(4)),
    },
  },
};
