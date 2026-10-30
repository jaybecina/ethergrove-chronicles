import type { Piece } from '../score';
import { bars, dyn, rests, silent, times } from './notation';

const HOOK_A = [
  'F5:1 r:1 F5:1 r:1 D5:1 r:1 F5:2 Bb5:4 A5:2 G5:2',
  'G5:1 r:1 G5:1 r:1 D5:2 Bb4:2 D5:2 G5:2 F5:4',
  'Eb5:1 r:1 Eb5:1 r:1 G5:2 Bb5:2 C6:2 Bb5:2 G5:4',
  'A5:2 C6:2 A5:2 F5:2 C5:8',
  'F5:1 r:1 F5:1 r:1 D5:1 r:1 F5:2 Bb5:4 A5:2 G5:2',
  'Bb5:1 r:1 A5:1 r:1 G5:1 r:1 D5:2 G5:4 Bb5:4',
  'C6:2 Bb5:2 G5:2 Eb5:2 F5:2 A5:2 C6:2 Eb6:2',
  'D6:4 Bb5:4 r:2 F5:2 G5:2 A5:2',
];
const HOOK_B = [
  'Bb5:4 G5:2 Eb5:2 G5:2 Bb5:2 Eb6:4',
  'C6:4 A5:2 F5:2 A5:2 C6:2 F6:4',
  'D6:1 r:1 D6:1 r:1 C6:1 r:1 A5:2 F5:4 D5:4',
  'G5:1 r:1 G5:1 r:1 A5:1 r:1 Bb5:2 D6:8',
  'Eb6:2 D6:2 C6:2 Bb5:2 G5:4 Eb5:4',
  'F5:2 G5:2 A5:2 Bb5:2 C6:4 A5:4',
  'C6:1 r:1 Bb5:1 r:1 G5:1 r:1 Eb5:2 G5:4 C6:4',
  'A5:4 F5:2 A5:2 C6:4 Eb6:4',
];
const CH: Record<string, string> = {
  Bb: '(D4 F4 Bb4)',
  Gm: '(D4 G4 Bb4)',
  Eb: '(Eb4 G4 Bb4)',
  F: '(C4 F4 A4)',
  Cm: '(C4 Eb4 G4)',
  Dm: '(D4 F4 A4)',
};
const HORN: Record<string, string> = {
  Eb: '(G3 Bb3 Eb4)',
  F: '(A3 C4 F4)',
  Dm: '(A3 D4 F4)',
  Gm: '(G3 Bb3 D4)',
  Cm: '(G3 C4 Eb4)',
  Bb: '(F3 Bb3 D4)',
};
const stabs = (a: string, b = a) =>
  `r:2 ${CH[a] ?? ''}:2 r:2 ${CH[a] ?? ''}:2 r:2 ${CH[b] ?? ''}:2 r:2 ${CH[b] ?? ''}:2`;
const hits = (a: string, b = a) => `r:4 ${HORN[a] ?? ''}:4 r:4 ${HORN[b] ?? ''}:4`;
const oomPah = (root: string, fifth: string, root2 = root, fifth2 = fifth) =>
  `${root}:2 r:2 ${fifth}:2 r:2 ${root2}:2 r:2 ${fifth2}:2 r:2`;
const A_STABS = [
  stabs('Bb'),
  stabs('Gm'),
  stabs('Eb'),
  stabs('F'),
  stabs('Bb'),
  stabs('Gm'),
  stabs('Cm', 'F'),
  stabs('Bb'),
];
const B_STABS = ['Eb', 'F', 'Dm', 'Gm', 'Eb', 'F', 'Cm', 'F'].map((c) => stabs(c));
const B_HITS = ['Eb', 'F', 'Dm', 'Gm', 'Eb', 'F', 'Cm', 'F'].map((c) => hits(c));
const A_HITS = [
  hits('Bb'),
  hits('Gm'),
  hits('Eb'),
  hits('F'),
  hits('Bb'),
  hits('Gm'),
  hits('Cm', 'F'),
  hits('Bb'),
];
const TUBA_A = [
  oomPah('Bb1', 'F2'),
  oomPah('G1', 'D2'),
  oomPah('Eb2', 'Bb1'),
  oomPah('F1', 'C2'),
  oomPah('Bb1', 'F2'),
  oomPah('G1', 'D2'),
  oomPah('C2', 'G1', 'F1', 'C2'),
  oomPah('Bb1', 'F2'),
];
const TUBA_B = [
  oomPah('Eb2', 'Bb1'),
  oomPah('F1', 'C2'),
  oomPah('D2', 'A1'),
  oomPah('G1', 'D2'),
  oomPah('Eb2', 'Bb1'),
  oomPah('F1', 'C2'),
  oomPah('C2', 'G1'),
  oomPah('F1', 'C2'),
];
const ANSWERS = [
  'r:12 D3:2 F3:2',
  'r:12 Bb2:2 D3:2',
  'r:12 G3:2 Eb3:2',
  'r:12 A2:2 C3:2',
  'r:12 D3:2 F3:2',
  'r:12 G2:2 Bb2:2',
  'r:12 F3:2 A3:2',
  'r:8 F2:2 r:2 F3:2 r:2',
];

/**
 * "Wandering Wares": the peddler's jaunty tune. B♭ major, 116 bpm, 32 bars: A B A′ B′.
 * A staccato clarinet hook with bassoon answers over pizzicato, tuba oom-pah and marimba; the piano takes the
 * hook in B with horn stabs; tutti in A′; down to pizzicato and marimba in B′.
 */
export const shop: Piece = {
  id: 'shop',
  kind: 'track',
  bpm: 116,
  meter: 4,
  parts: {
    clarinet: {
      instrument: 'clarinetStac',
      octave: -1,
      gain: 0.5,
      dyn: dyn(['mf', 8], ['p', 8], ['f', 8], ['p', 8]),
      notes: bars(HOOK_A, rests(8), HOOK_A, rests(8)),
    },
    bassoon: {
      instrument: 'bassoon',
      gain: 0.42,
      dyn: dyn(['mf', 32]),
      notes: bars(ANSWERS, rests(8), ANSWERS, rests(8)),
    },
    piano: {
      instrument: 'piano',
      gain: 0.42,
      dyn: dyn(['p', 8], ['mf', 8], ['mf', 8], ['p', 8]),
      notes: bars(rests(8), HOOK_B, HOOK_A, rests(8)),
    },
    marimba: {
      instrument: 'marimba',
      gain: 0.32,
      dyn: dyn(['mp', 8], ['p', 8], ['mf', 8], ['mf', 8]),
      notes: bars(HOOK_A, rests(8), HOOK_A, HOOK_B),
    },
    pizz: {
      instrument: 'violinsPizz',
      gain: 0.38,
      dyn: dyn(['mp', 32]),
      notes: bars(A_STABS, B_STABS, A_STABS, B_STABS),
    },
    horns: {
      instrument: 'horn',
      gain: 0.36,
      dyn: dyn(['mf', 32]),
      notes: bars(rests(8), B_HITS, A_HITS, rests(8)),
    },
    tuba: {
      instrument: 'tuba',
      gain: 0.4,
      dyn: dyn(['mf', 32]),
      notes: bars(TUBA_A, TUBA_B, TUBA_A, TUBA_B),
    },
    perc: {
      instrument: 'kit',
      gain: 0.25,
      kit: { t: 'tamb' },
      dyn: dyn(['mp', 32]),
      notes: bars(times(24, '....t.......t...'), silent(7), '....t...t...t.t.'),
    },
  },
};
