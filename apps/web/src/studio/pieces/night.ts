import { folkPiece, move, PHRASE_MINOR_B, type Section } from './folk';

const recorder = move(PHRASE_MINOR_B, 12);
const rest4 = ['r:16', 'r:16', 'r:16', 'r:16'];
const A = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'A'];

const sections: Section[] = [
  { chords: A, recorder: [...recorder.slice(0, 4), ...rest4], harp: true, dyn: 'p' },
  { chords: ['Bm', 'G', 'D', 'A'], frame: 'f...............', dyn: 'pp' },
  {
    chords: A,
    fiddle: [...PHRASE_MINOR_B.slice(0, 4), ...rest4],
    psaltery: ['F#5:16', 'D5:16', 'E5:16', 'C#5:16', 'B4:16', 'D5:16', 'E5:16', 'F#5:16'],
    harp: true,
    dyn: 'pp',
  },
];

/**
 * The farm at night: B minor, 58 bpm, 20 bars (83 s). Few voices and a lot of room: the minor Rootsong on the
 * recorder, then the fiddle, over a rolling harp, a psaltery and the cello's bare fifth.
 */
export const night = folkPiece({ id: 'night', bpm: 58, sections });
