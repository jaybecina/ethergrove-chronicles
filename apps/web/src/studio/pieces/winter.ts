import { folkPiece, move, PHRASE_MAJOR_D, type Section } from './folk';

const fiddle = move(PHRASE_MAJOR_D, -2);
/** An octave and a bit higher still, so the recorder stays inside its recordings. */
const recorder = move(PHRASE_MAJOR_D, 22);
const A = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'];
const B = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'];

const sections: Section[] = [
  {
    chords: A,
    psaltery: ['E5:16', 'C5:16', 'C5:16', 'D5:16', 'E5:16', 'C5:16', 'C5:16', 'D5:16'],
    harp: true,
    dyn: 'pp',
  },
  { chords: B, fiddle, pick: true, harp: true, slit: 'S...............', dyn: 'p' },
  { chords: ['Am', 'F', 'C', 'G'], slit: 'S...............', dyn: 'pp' },
  { chords: ['F', 'G', 'Am', 'C'], recorder: recorder.slice(0, 4), harp: true, dyn: 'pp' },
  { chords: A, fiddle, pick: true, harp: true, dyn: 'mp' },
];

/**
 * Winter: C major, 66 bpm, 32 bars (116 s). Cold and wide: bowed psaltery, a lone fiddle with the Rootsong and a
 * slow harp, with four bars of nothing but the cello and a slit drum.
 */
export const winter = folkPiece({ id: 'winter', bpm: 66, sections });
