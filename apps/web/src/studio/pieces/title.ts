import { ROOTSONG_MAJOR, ROOTSONG_MINOR, transpose } from '../motifs';
import type { Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';

// Chords per section (audio spec §4.2), close voicings with the root below in the cellos and basses.
const A = [
  '(B3 D4 F#4)',
  '(G3 B3 D4)',
  '(A3 D4 F#4)',
  '(A3 C#4 E4)',
  '(B3 D4 F#4)',
  '(G3 B3 D4)',
  '(G3 B3 E4)',
];
const A_LAST = '(F#3 B3 C#4):8 (F#3 A#3 C#4):8';
const B = [
  '(A3 D4 F#4)',
  '(A3 C#4 E4)',
  '(B3 D4 F#4)',
  '(G3 B3 D4)',
  '(A3 D4 F#4)',
  '(G3 B3 D4)',
  '(G3 B3 D4 E4)',
  '(A3 C#4 E4)',
];
const C = [
  '(G3 B3 D4)',
  '(A3 C#4 E4)',
  '(A3 C#4 F#4)',
  '(B3 D4 F#4)',
  '(G3 B3 D4)',
  '(A3 D4 F#4)',
  '(G3 B3 D4 E4)',
];
const C_LAST = '(A3 D4 E4):8 (A3 C#4 E4):8';
const ROOTS_A = ['B2', 'G2', 'D3', 'A2', 'B2', 'G2', 'E2', 'F#2'];
const ROOTS_B = ['D3', 'A2', 'B2', 'G2', 'F#2', 'G2', 'E2', 'A2'];
const ROOTS_C = ['G2', 'A2', 'F#2', 'B2', 'G2', 'F#2', 'E2', 'A2'];
const HARP_A = [
  '(B2 F#3 B3 D4 F#4)',
  '(G2 D3 G3 B3 D4)',
  '(D3 A3 D4 F#4 A4)',
  '(A2 E3 A3 C#4 E4)',
  '(B2 F#3 B3 D4 F#4)',
  '(G2 D3 G3 B3 D4)',
  '(E2 B2 E3 G3 B3)',
  '(F#2 C#3 F#3 A#3 C#4)',
];

/** The minor Rootsong in B minor, an octave up for the flute (B4–G5). */
const MINOR_FLUTE = transpose(ROOTSONG_MINOR, 12);
/** The Rootsong in D: horns at B3–A4, violins an octave up, the flute two octaves up. */
const MAJOR_HORN = ROOTSONG_MAJOR.notes;
const MAJOR_VIOLIN = transpose(ROOTSONG_MAJOR, 12);
const MAJOR_FLUTE = transpose(ROOTSONG_MAJOR, 24);

/**
 * "Ethergrove": wonder and mystery. D major, 70 bpm, 24 bars (≈82 s): A B C.
 * A: harp and glock arpeggios, a pad shimmer, the flute plays the minor Rootsong — small and secret.
 * B: the horns answer with the Rootsong in major over a cello countermelody and string tremolo; a timpani roll.
 * C: tutti, the violins sing the Rootsong in octaves with the violas and flute, then fade to p into bar 1.
 */
export const title: Piece = {
  id: 'title',
  kind: 'track',
  bpm: 70,
  meter: 4,
  parts: {
    flute: {
      instrument: 'flute',
      gain: 0.48,
      dyn: dyn(['p', 8], ['mp', 8], ['f', 6], ['>', 1], ['p', 1]),
      notes: bars(
        MINOR_FLUTE,
        'A5:4 F#5:4 D5:8',
        'E5:8 C#5:4 A4:4',
        MINOR_FLUTE,
        'G5:4 E5:4 B4:8',
        'B4:8 A#4:8',
        rests(8),
        rests(3),
        MAJOR_FLUTE,
        rests(3),
      ),
    },
    harp: {
      instrument: 'harp',
      arp: 'up',
      arpRate: 2,
      gain: 0.36,
      dyn: dyn(['p', 8], ['mp', 16]),
      notes: bars(held(HARP_A), held(HARP_A), held(HARP_A)),
    },
    glock: {
      instrument: 'glock',
      gain: 0.18,
      dyn: dyn(['pp', 24]),
      notes: bars(
        times(2, 'r:12 F#6:4'),
        'r:12 A6:4',
        'r:12 E6:4',
        times(2, 'r:12 D6:4'),
        'r:12 B5:4',
        'r:8 C#6:8',
        rests(16),
      ),
    },
    pad: {
      instrument: 'pad',
      gain: 0.22,
      reverb: 0.5,
      dyn: dyn(['pp', 24]),
      notes: bars(held(A), A_LAST, held(B), held(C), C_LAST),
    },
    horns: {
      instrument: 'horn',
      gain: 0.42,
      dyn: dyn(['mf', 16], ['f', 6], ['mf', 2]),
      notes: bars(
        rests(8),
        'F#4:8 A4:8',
        'E4:16',
        MAJOR_HORN,
        'F#4:8 D4:8',
        'D4:8 B3:8',
        'E4:16',
        'E4:8 C#4:8',
        held(['(B3 D4)', '(C#4 E4)', '(C#4 F#4)', '(D4 F#4)', '(B3 D4)', '(A3 D4)']),
        rests(2),
      ),
    },
    violinsTrem: {
      instrument: 'violinsTrem',
      octave: 1,
      gain: 0.3,
      dyn: dyn(['p', 12], ['mp', 12]),
      notes: bars(rests(8), held(B), rests(8)),
    },
    violins: {
      instrument: 'violins',
      gain: 0.5,
      dyn: dyn(['mf', 16], ['f', 6], ['>', 1], ['p', 1]),
      notes: bars(
        rests(16),
        'B4:8 D5:8',
        'C#5:8 E5:8',
        'C#5:4 A4:4 F#4:8',
        MAJOR_VIOLIN,
        'A5:8 F#5:8',
        'G5:8 E5:8',
        'E5:8 C#5:8',
      ),
    },
    violas: {
      instrument: 'violas',
      gain: 0.42,
      dyn: dyn(['pp', 8], ['p', 8], ['f', 6], ['>', 1], ['p', 1]),
      notes: bars(
        held(['D4', 'B3', 'A3', 'C#4', 'D4', 'B3', 'B3']),
        'B3:8 A#3:8',
        rests(8),
        'D4:16',
        'E4:16',
        'C#4:16',
        MAJOR_HORN,
        'D4:16',
        'D4:16',
        'C#4:16',
      ),
    },
    cellos: {
      instrument: 'cellos',
      gain: 0.4,
      dyn: dyn(['pp', 8], ['mp', 8], ['f', 6], ['>', 1], ['p', 1]),
      notes: bars(
        held(ROOTS_A.map((r) => r.replace('2', '3'))),
        // B: a countermelody under the horns
        'F#3:8 A3:8',
        'E3:8 C#3:8',
        'D3:8 F#3:8',
        'G3:8 B3:8',
        'A3:8 F#3:8',
        'B3:8 D4:8',
        'E4:8 D4:8',
        'C#4:8 E3:4 A3:4',
        held(ROOTS_C.map((r) => r.replace('2', '3'))),
      ),
    },
    basses: {
      instrument: 'basses',
      gain: 0.38,
      dyn: dyn(['pp', 8], ['mp', 8], ['f', 6], ['>', 1], ['p', 1]),
      notes: bars(held(ROOTS_A), held(ROOTS_B), held(ROOTS_C)),
    },
    choir: {
      instrument: 'choir',
      gain: 0.2,
      dyn: dyn(['pp', 16], ['mp', 6], ['>', 1], ['p', 1]),
      notes: bars(rests(16), held(C), C_LAST),
    },
    perc: {
      instrument: 'kit',
      gain: 0.45,
      kit: { r: 'timpRoll', t: 'timpHit', s: 'cymbalSwell' },
      dyn: dyn(['mp', 16], ['f', 8]),
      notes: bars(
        times(15, '................'),
        '....s...r.......',
        't...............',
        times(7, '................'),
      ),
    },
  },
};
