import { ROOTSONG_MAJOR, transpose } from '../motifs';
import type { Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';

/** The Rootsong in D, written an octave up for the horns (which play `octave: -1`, so it sounds B3–A4). */
const ROOTSONG_HORN = transpose(ROOTSONG_MAJOR, 12);

const MELODY_A = [
  'F#5:3 E5:3 D5:2 A4:4 D5:4',
  'B4:2 D5:2 G5:3 F#5:3 E5:2 D5:4',
  'F#5:3 A5:3 F#5:2 E5:2 D5:2 E5:4',
  'C#5:2 E5:2 A5:6 r:2 E5:4',
  'D5:3 F#5:3 B5:2 A5:2 F#5:2 D5:4',
  'G5:3 F#5:3 E5:2 D5:2 B4:2 G4:4',
  'A4:2 C#5:2 E5:3 G5:3 F#5:2 E5:4',
  'D5:8 r:2 A4:2 D5:2 F#5:2',
];
const MELODY_B = [
  'G5:6 F#5:2 E5:2 D5:2 B4:4',
  'C#5:3 E5:3 A5:2 G5:2 E5:2 C#5:4',
  'A5:6 F#5:2 C#5:4 F#5:4',
  'D6:3 C#6:3 B5:2 F#5:4 D5:4',
  'B5:3 A5:3 G5:2 D5:2 B4:2 D5:4',
  'E5:3 C#5:3 A4:2 C#5:2 E5:2 A5:4',
  'G5:2 E5:2 B4:2 D5:2 C#5:2 E5:2 G5:2 A5:2',
  'F#5:6 E5:2 D5:8',
];
const A = [
  '(D4 F#4 A4)',
  '(D4 G4 B4)',
  '(D4 F#4 A4)',
  '(C#4 E4 A4)',
  '(D4 F#4 B4)',
  '(D4 G4 B4)',
  '(C#4 E4 A4)',
  '(D4 F#4 A4)',
];
const B = ['(D4 G4 B4)', '(C#4 E4 A4)', '(C#4 F#4 A4)', '(D4 F#4 B4)', '(D4 G4 B4)', '(C#4 E4 A4)'];
const ROOTS_A = ['D2', 'G2', 'D2', 'A2', 'B2', 'G2', 'A2', 'D2'];
const ROOTS_B = ['G2', 'A2', 'F#2', 'B2', 'G2', 'A2'];
/** A syncopated piano comp. */
const comp = (c: string) => `${c}:3 ${c}:3 ${c}:2 r:2 ${c}:2 ${c}:4`;
const sub = (r: string) => `${r}:6 ${r}:2 ${r}:8`;
/** Adds the root an octave up, for a four-note arpeggio. */
const arpChord = (c: string) => {
  const root = c.slice(1, -1).split(' ')[0] ?? 'D4';
  return c.replace(')', ` ${root.replace(/\d$/, (d) => String(Number(d) + 1))})`);
};

/**
 * "Sunwarm Fields": bright and adventurous. D major, 108 bpm, 32 bars: A B A′ B′.
 * Strings sing over a piano comp, a soft synth arp and a sub bass groove; horns take B; trumpet joins in A′.
 */
export const summer: Piece = {
  id: 'summer',
  kind: 'track',
  bpm: 108,
  meter: 4,
  parts: {
    violins: {
      instrument: 'violins',
      gain: 0.5,
      dyn: dyn(['mf', 8], ['mp', 8], ['f', 8], ['mf', 8]),
      notes: bars(
        MELODY_A,
        held(['D5', 'E5', 'F#5', 'F#5', 'D5', 'E5', 'B4', 'A4']),
        MELODY_A,
        MELODY_B,
      ),
    },
    trumpet: {
      instrument: 'trumpet',
      gain: 0.36,
      dyn: dyn(['mf', 16], ['f', 8], ['mf', 8]),
      notes: bars(rests(16), MELODY_A, rests(8)),
    },
    horns: {
      instrument: 'horn',
      octave: -1,
      gain: 0.45,
      dyn: dyn(['mf', 32]),
      // B, with the Rootsong over Bm and G in bars 12–13 (audio spec §4.2). Written an octave up: `octave: -1`.
      notes: bars(rests(8), MELODY_B.slice(0, 3), ROOTSONG_HORN, MELODY_B.slice(5), rests(16)),
    },
    violas: {
      instrument: 'violas',
      gain: 0.32,
      dyn: dyn(['mp', 8], ['mf', 8], ['mp', 16]),
      notes: bars(
        held(['A3', 'B3', 'A3', 'A3', 'B3', 'B3', 'A3', 'A3']),
        held(['B3', 'C#4', 'C#4', 'D4', 'B3', 'C#4']),
        'B3:8 C#4:8',
        'A3:16',
        held(['A3', 'B3', 'A3', 'A3', 'B3', 'B3', 'A3', 'A3']),
        held(['B3', 'C#4', 'C#4', 'D4', 'B3', 'C#4']),
        'B3:8 C#4:8',
        'A3:16',
      ),
    },
    cellos: {
      instrument: 'cellos',
      gain: 0.38,
      dyn: dyn(['mp', 8], ['mf', 8], ['mf', 8], ['mp', 8]),
      notes: bars(
        held(ROOTS_A),
        held(ROOTS_B),
        'E2:8 A2:8',
        'D2:16',
        held(ROOTS_A),
        held(ROOTS_B),
        'E2:8 A2:8',
        'D2:16',
      ),
    },
    piano: {
      instrument: 'piano',
      gain: 0.4,
      dyn: dyn(['mf', 32]),
      notes: bars(
        A.map(comp),
        [...B.map(comp), '(D4 E4 G4 B4):8 (C#4 E4 G4 A4):8', comp('(D4 F#4 A4)')],
        A.map(comp),
        [...B.map(comp), '(D4 E4 G4 B4):8 (C#4 E4 G4 A4):8', comp('(D4 F#4 A4)')],
      ),
    },
    arp: {
      instrument: 'arp',
      arp: 'up',
      gain: 0.16,
      reverb: 0.45,
      pan: 0.2,
      dyn: dyn(['mf', 32]),
      notes: bars(
        held(A.map(arpChord)),
        held([...B.map(arpChord), '(D4 E4 G4 B4)', '(D4 F#4 A4 D5)']),
        held(A.map(arpChord)),
        held([...B.map(arpChord), '(D4 E4 G4 B4)', '(D4 F#4 A4 D5)']),
      ),
    },
    subBass: {
      instrument: 'subBass',
      gain: 0.45,
      reverb: 0.05,
      dyn: dyn(['mf', 32]),
      notes: bars(
        ROOTS_A.map(sub),
        [...ROOTS_B.map(sub), 'E2:8 A2:8', sub('D2')],
        ROOTS_A.map(sub),
        [...ROOTS_B.map(sub), 'E2:8 A2:8', sub('D2')],
      ),
    },
    perc: {
      instrument: 'kit',
      gain: 0.35,
      reverb: 0.2,
      kit: { k: 'bassDrum', c: 'claves', s: 'cymbalSwell', t: 'tamb' },
      dyn: dyn(['mf', 32]),
      notes: bars(
        times(8, 'k..c..c.k..c....'),
        times(7, 'k..c..c.k..c.t..'),
        's..c..c.k..c.t..',
        times(8, 'k..c..c.k..c.t..'),
        times(8, 'k..c..c.k..c....'),
      ),
    },
  },
};
