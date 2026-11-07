import { GLOAM } from '../motifs';
import { barsOf, folkPiece, shift, type Section } from './folk';

/** The Gloam an octave up, for the bowed psaltery (B4 and up): two bars. */
const GLOAM_HIGH = barsOf(shift(GLOAM.notes, 12));
const rest = (n: number) => Array.from({ length: n }, () => 'r:16');

const sections: Section[] = [
  {
    chords: ['Bm', 'Bm', 'C', 'C', 'Bm', 'Bm', 'G', 'Bm'],
    psaltery: [...GLOAM_HIGH, ...rest(6)],
    slit: 'S...............',
    dyn: 'pp',
  },
  { chords: ['Bm', 'C', 'Bm', 'Bm'], slit: 'S.......S.......', dyn: 'pp' },
  {
    chords: ['Bm', 'Bm', 'C', 'C', 'Bm', 'Bm', 'G', 'Bm'],
    psaltery: [...rest(4), ...GLOAM_HIGH, ...rest(2)],
    slit: 'S...............',
    dyn: 'pp',
  },
  { chords: ['Bm', 'C', 'Bm', 'Bm'], dyn: 'pp' },
];

/**
 * Mossdeep: B Phrygian, 60 bpm, 24 bars (96 s). A dungeon of texture, not tune: a bare cello fifth, a slit drum and
 * the Gloam on bowed psaltery, twice, with four silent bars between.
 */
export const mossdeep = folkPiece({ id: 'mossdeep', bpm: 60, sections });
