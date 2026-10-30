import { ROOTSONG_MAJOR, transpose } from '../motifs';
import type { Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';

/** The Rootsong in C, an octave up for the flute (A4–G5). */
const ROOTSONG_C = transpose(ROOTSONG_MAJOR, 10);

const MELODY_A = [
  'G4:1 r:1 C5:1 r:1 E5:2 G5:2 E5:1 r:1 C5:1 r:1 D5:2 E5:2',
  'D5:4 B4:2 G4:2 B4:2 D5:2 G5:4',
  'E5:2 A5:2 G5:2 E5:2 C5:2 E5:2 A4:4',
  'F4:2 A4:2 C5:2 F5:2 E5:4 D5:2 C5:2',
  'G4:1 r:1 C5:1 r:1 E5:2 G5:2 C6:4 B5:2 A5:2',
  'G5:4 D5:2 B4:2 G4:4 B4:2 D5:2',
  'C5:2 F5:2 A5:2 G5:2 F5:2 E5:2 D5:2 C5:2',
  'D5:4 B4:2 G4:2 D5:6 r:2',
];
const MELODY_B = [
  'A5:4 G5:2 F5:2 C5:4 F5:4',
  'G5:2 F5:2 D5:2 B4:2 D5:4 G5:4',
  'B5:4 G5:2 E5:2 B4:4 E5:4',
  'C6:2 B5:2 A5:2 E5:2 A5:8',
  'A5:2 G5:2 F5:2 C5:2 A4:2 C5:2 F5:4',
  'G5:2 F5:2 E5:2 D5:2 B4:2 D5:2 G5:4',
  'E5:1 r:1 G5:1 r:1 C6:4 G5:2 E5:2 G5:4',
  'C6:4 r:4 E5:2 D5:2 C5:2 B4:2',
];
/** For sustained strings: the A melody with its staccato notes joined up. */
const LEGATO_A = [
  'G4:2 C5:2 E5:2 G5:2 E5:2 C5:2 D5:2 E5:2',
  ...MELODY_A.slice(1, 4),
  'G4:2 C5:2 E5:2 G5:2 C6:4 B5:2 A5:2',
  ...MELODY_A.slice(5),
];
const CHORDS_A = [
  '(E4 G4 C5)',
  '(D4 G4 B4)',
  '(E4 A4 C5)',
  '(F4 A4 C5)',
  '(E4 G4 C5)',
  '(D4 G4 B4)',
  '(F4 A4 C5)',
  '(D4 G4 B4)',
];
const CHORDS_B = [
  '(F4 A4 C5)',
  '(D4 G4 B4)',
  '(E4 G4 B4)',
  '(E4 A4 C5)',
  '(F4 A4 C5)',
  '(D4 G4 B4)',
  '(E4 G4 C5)',
  '(E4 G4 C5)',
];
const HARP_A = [
  '(C3 G3 C4 E4)',
  '(G2 D3 G3 B3)',
  '(A2 E3 A3 C4)',
  '(F2 C3 F3 A3)',
  '(C3 G3 C4 E4)',
  '(G2 D3 G3 B3)',
  '(F2 C3 F3 A3)',
  '(G2 D3 G3 B3)',
];
const HARP_B = [
  '(F2 C3 F3 A3)',
  '(G2 D3 G3 B3)',
  '(E2 B2 E3 G3)',
  '(A2 E3 A3 C4)',
  '(F2 C3 F3 A3)',
  '(G2 D3 G3 B3)',
  '(C3 G3 C4 E4)',
  '(C3 G3 C4 E4)',
];
const ROOTS_A = ['C3', 'G2', 'A2', 'F2', 'C3', 'G2', 'F2', 'G2'];
const ROOTS_B = ['F2', 'G2', 'E2', 'A2', 'F2', 'G2', 'C3', 'C3'];
const stabs = (c: string) => `r:2 ${c}:2 r:2 ${c}:2 r:2 ${c}:2 r:2 ${c}:2`;
const pizzBass = (r: string) => `${r}:4 r:4 ${r}:4 r:4`;

/**
 * "Seedlings Wake": bouncy and hopeful. C major, 96 bpm, 32 bars: A B A′ B′.
 * Flute over pizzicato and harp; a clarinet counterline in B; violins take the tune in A′; tutti in B′.
 */
export const spring: Piece = {
  id: 'spring',
  kind: 'track',
  bpm: 96,
  meter: 4,
  parts: {
    flute: {
      instrument: 'flute',
      gain: 0.55,
      dyn: dyn(['mf', 16], ['mp', 8], ['mf', 8]),
      notes: bars(
        MELODY_A,
        MELODY_B,
        // A′: a high descant over the violins, with the Rootsong in C over Am and F (audio spec §4.2)
        'E6:8 D6:8',
        'D6:16',
        ROOTSONG_C,
        'E6:8 G6:8',
        'D6:16',
        'C6:8 A5:8',
        'B5:16',
        MELODY_B,
      ),
    },
    violins: {
      instrument: 'violins',
      gain: 0.5,
      dyn: dyn(['p', 16], ['mf', 8], ['mf', 8]),
      // The violins rest while the flute plays the Rootsong (bars 19–20).
      notes: bars(
        rests(16),
        LEGATO_A.slice(0, 2),
        rests(2),
        LEGATO_A.slice(4),
        MELODY_B.map((b) => b.replace(/:1 r:1/g, ':2')),
      ),
    },
    pizz: {
      instrument: 'violinsPizz',
      gain: 0.4,
      dyn: dyn(['mp', 32]),
      notes: bars(
        CHORDS_A.map(stabs),
        CHORDS_B.map(stabs),
        CHORDS_A.map(stabs),
        CHORDS_B.map(stabs),
      ),
    },
    harp: {
      instrument: 'harp',
      arp: 'up',
      arpRate: 2,
      gain: 0.35,
      dyn: dyn(['mp', 32]),
      notes: bars(held([...HARP_A, ...HARP_B, ...HARP_A, ...HARP_B])),
    },
    marimba: {
      instrument: 'marimba',
      arp: 'updown',
      arpRate: 2,
      gain: 0.28,
      dyn: dyn(['mp', 8], ['p', 8], ['mp', 8], ['p', 8]),
      notes: bars(held(CHORDS_A), rests(8), held(CHORDS_A), rests(8)),
    },
    clarinet: {
      instrument: 'clarinet',
      gain: 0.42,
      dyn: dyn(['p', 8], ['mp', 8], ['p', 8], ['mf', 8]),
      notes: bars(
        rests(8),
        'C5:8 A4:8',
        'B4:8 D5:8',
        'G4:8 B4:8',
        'C5:8 E5:8',
        'A4:8 C5:8',
        'B4:8 D5:8',
        'E5:8 G4:8',
        'C5:16',
        rests(8),
        'C5:8 A4:8',
        'B4:8 D5:8',
        'G4:8 B4:8',
        'C5:8 E5:8',
        'A4:8 C5:8',
        'B4:8 D5:8',
        'E5:8 G4:8',
        'C5:16',
      ),
    },
    cellos: {
      instrument: 'cellos',
      gain: 0.38,
      dyn: dyn(['p', 8], ['mp', 8], ['p', 8], ['mf', 8]),
      notes: bars(rests(8), held(ROOTS_B), rests(8), held(ROOTS_B)),
    },
    cellosPizz: {
      instrument: 'cellosPizz',
      gain: 0.42,
      dyn: dyn(['mp', 32]),
      notes: bars(ROOTS_A.map(pizzBass), rests(8), ROOTS_A.map(pizzBass), rests(8)),
    },
    horns: {
      instrument: 'horn',
      gain: 0.38,
      dyn: dyn(['mf', 32]),
      notes: bars(
        rests(24),
        held([
          '(A3 C4 F4)',
          '(B3 D4 G4)',
          '(B3 E4 G4)',
          '(A3 C4 E4)',
          '(A3 C4 F4)',
          '(B3 D4 G4)',
          '(G3 C4 E4)',
          '(G3 C4 E4)',
        ]),
      ),
    },
    perc: {
      instrument: 'kit',
      gain: 0.3,
      kit: { s: 'shaker', t: 'tamb' },
      dyn: dyn(['mp', 32]),
      notes: bars(
        times(8, '..s...s...s...s.'),
        times(8, '..s.t.s...s.t.s.'),
        times(8, '..s...s...s...s.'),
        times(8, '..s.t.s...s.t.s.'),
      ),
    },
  },
};
