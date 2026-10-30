import type { Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';

/**
 * The minor Rootsong in A minor for the oboe (A4–F5), laid across three 3/4 bars: its rhythm fills 12 + 12 + 8
 * steps, then a rest.
 */
const ROOTSONG_WALTZ = ['A4:2 C5:2 E5:4 D5:2 C5:2', 'F5:4 E5:2 D5:2 C5:2 B4:2', 'A4:8 r:4'];

const MELODY_A = [
  'E5:8 D5:2 C5:2',
  'D5:6 B4:2 G4:4',
  'A4:4 C5:4 E5:4',
  'F#5:6 E5:2 F#5:4',
  'A5:6 G5:2 E5:4',
  'D5:2 E5:2 D5:2 B4:2 G4:4',
  'E5:4 G5:4 B5:4',
  'A5:12',
];
/** A′: the flute a third above the oboe. */
const THIRDS_A = [
  'G5:8 F5:2 E5:2',
  'F5:6 D5:2 B4:4',
  'C5:4 E5:4 G5:4',
  'A5:6 G5:2 A5:4',
  'C6:6 B5:2 G5:4',
  'F5:2 G5:2 F5:2 D5:2 B4:4',
  'G5:4 B5:4 D6:4',
  'C6:12',
];
const MELODY_B = [
  'C6:6 A5:2 F5:4',
  'B5:2 C6:2 B5:2 A5:2 G5:4',
  'A5:4 E5:4 C5:4',
  'E5:2 F#5:2 E5:2 D5:2 C5:4',
  'A4:4 C5:4 F5:4',
  'G5:6 F5:2 D5:4',
  'E5:2 G#5:2 B5:8',
  'B5:4 G#5:4 E5:4',
];
const HARP: Record<string, string> = {
  Am: '(A2 E3 A3 C4 E4 A4)',
  G: '(G2 D3 G3 B3 D4 G4)',
  D: '(D3 A3 D4 F#4 A4 D5)',
  Em: '(E2 B2 E3 G3 B3 E4)',
  F: '(F2 C3 F3 A3 C4 F4)',
  E: '(E2 B2 E3 G#3 B3 E4)',
};
const VIOLAS: Record<string, string> = {
  Am: '(C4 E4)',
  G: '(B3 D4)',
  D: '(A3 D4)',
  Em: '(B3 E4)',
  F: '(A3 C4)',
  E: '(G#3 B3)',
};
const ROOT: Record<string, string> = { Am: 'A2', G: 'G2', D: 'D3', Em: 'E2', F: 'F2', E: 'E2' };
const A = ['Am', 'G', 'Am', 'D', 'Am', 'G', 'Em', 'Am'];
const B = ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E'];
const FORM = [...A, ...B, ...A, ...B];
const pick = (map: Record<string, string>) => FORM.map((c) => map[c] ?? 'r');

/**
 * "Amber Harvest": a folk harvest waltz, warm and bittersweet. A minor with a dorian colour, 88 bpm, 3/4,
 * 32 bars: A B A′ B′. Oboe over a harp waltz; violins and a bassoon line in B; flute and oboe in thirds in A′.
 */
export const fall: Piece = {
  id: 'fall',
  kind: 'track',
  bpm: 88,
  meter: 3,
  parts: {
    oboe: {
      instrument: 'oboe',
      gain: 0.5,
      dyn: dyn(['mf', 8], ['p', 8], ['mf', 8], ['p', 8]),
      // A′ opens with the Rootsong in A minor over Am, G, Am (audio spec §4.2).
      notes: bars(MELODY_A, rests(8, 3), ROOTSONG_WALTZ, MELODY_A.slice(3), rests(8, 3)),
    },
    flute: {
      instrument: 'flute',
      gain: 0.42,
      dyn: dyn(['p', 16], ['mf', 8], ['p', 8]),
      notes: bars(rests(16, 3), rests(3, 3), THIRDS_A.slice(3), rests(8, 3)),
    },
    violins: {
      instrument: 'violins',
      gain: 0.5,
      dyn: dyn(['p', 8], ['mf', 8], ['p', 8], ['mf', 6], ['>', 1], ['p', 1]),
      notes: bars(rests(8, 3), MELODY_B, rests(8, 3), MELODY_B),
    },
    bassoon: {
      instrument: 'bassoon',
      gain: 0.42,
      dyn: dyn(['p', 8], ['mp', 8], ['p', 8], ['mp', 8]),
      notes: bars(
        rests(8, 3),
        'A3:12',
        'B3:6 D4:6',
        'C4:12',
        'E4:6 C4:6',
        'A3:6 C4:6',
        'B3:6 G3:6',
        'G#3:12',
        'B3:6 E3:6',
        rests(8, 3),
        'A3:12',
        'B3:6 D4:6',
        'C4:12',
        'E4:6 C4:6',
        'A3:6 C4:6',
        'B3:6 G3:6',
        'G#3:12',
        'B3:6 E3:6',
      ),
    },
    harp: {
      instrument: 'harp',
      arp: 'up',
      arpRate: 2,
      gain: 0.42,
      dyn: dyn(['mp', 32]),
      notes: bars(held(pick(HARP), 3)),
    },
    violas: {
      instrument: 'violas',
      gain: 0.3,
      dyn: dyn(['mp', 32]),
      notes: bars(pick(VIOLAS).map((c) => `r:4 ${c}:4 ${c}:4`)),
    },
    cellosPizz: {
      instrument: 'cellosPizz',
      gain: 0.45,
      dyn: dyn(['mf', 32]),
      notes: bars(pick(ROOT).map((r) => `${r}:4 r:8`)),
    },
    cellos: {
      instrument: 'cellos',
      gain: 0.36,
      dyn: dyn(['p', 24], ['mf', 6], ['>', 1], ['p', 1]),
      notes: bars(
        rests(24, 3),
        held(
          B.map((c) => ROOT[c]?.replace('2', '3') ?? 'A3'),
          3,
        ),
      ),
    },
    pad: {
      instrument: 'pad',
      gain: 0.14,
      dyn: dyn(['p', 32]),
      notes: bars(
        rests(8, 3),
        held(
          B.map((c) => VIOLAS[c] ?? '(A3 C4)'),
          3,
        ),
        rests(16, 3),
      ),
    },
    perc: {
      instrument: 'kit',
      gain: 0.18,
      kit: { s: 'shaker' },
      dyn: dyn(['mp', 32]),
      notes: bars(times(32, 's...s...s...')),
    },
  },
};
