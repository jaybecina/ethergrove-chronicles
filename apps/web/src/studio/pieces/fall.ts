import { folkPiece, move, type Section } from './folk';

/**
 * The minor Rootsong in A minor, laid across three 3/4 bars: its rhythm fills 12 + 12 + 8 steps, then a rest. The
 * five bars after it are an answer and an ending, so a phrase is 8 bars.
 */
const PHRASE = [
  'A4:2 C5:2 E5:4 D5:2 C5:2',
  'F5:4 E5:2 D5:2 C5:2 B4:2',
  'A4:8 r:4',
  'E5:8 D5:2 C5:2',
  'D5:6 B4:2 G4:4',
  'A4:4 C5:4 E5:4',
  'A4:12',
  'r:12',
];
const recorder = move(PHRASE, 12);
const A = ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'Dm', 'E'];
const B = ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'Am'];
const WALTZ = 'f.....f.....';

const sections: Section[] = [
  { chords: A, recorder, pick: true, frame: WALTZ, dyn: 'mp' },
  { chords: B, fiddle: PHRASE, pick: true, harp: true, frame: WALTZ, dyn: 'mf' },
  { chords: A, recorder, fiddle: PHRASE, pick: true, harp: true, frame: WALTZ, dyn: 'mf' },
  { chords: ['Am', 'F', 'C', 'G'], slit: 'S...........', dyn: 'p' },
  {
    chords: ['Am', 'F', 'E', 'Am'],
    fiddle: ['E5:8 D5:2 C5:2', 'D5:6 B4:2 G4:4', 'A4:4 C5:4 E5:4', 'A4:12'],
    pick: true,
    harp: true,
    dyn: 'mp',
  },
  { chords: B, recorder, fiddle: PHRASE, pick: true, harp: true, frame: WALTZ, dyn: 'mp' },
  {
    chords: A,
    recorder: [...recorder.slice(0, 3), ...Array.from({ length: 5 }, () => 'r:12')],
    pick: true,
    dyn: 'p',
  },
];

/** Fall: A minor in 3/4, 88 bpm, 48 bars (98 s). A waltz of picked strings with the minor Rootsong. */
export const fall = folkPiece({ id: 'fall', bpm: 88, meter: 3, sections });
