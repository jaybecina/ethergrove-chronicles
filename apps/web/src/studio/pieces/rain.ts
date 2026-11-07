import { folkPiece, move, PHRASE_MINOR_B, type Section } from './folk';

const A = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'A'];
const recorder = move(PHRASE_MINOR_B, 12);

const sections: Section[] = [
  { chords: A, fiddle: PHRASE_MINOR_B, pick: true, ocean: 'o...............', dyn: 'pp' },
  { chords: A, harp: true, pick: true, ocean: 'o...............', dyn: 'pp' },
  {
    chords: A,
    recorder: [...recorder.slice(0, 4), 'r:16', 'r:16', 'r:16', 'r:16'],
    harp: true,
    ocean: 'o...............',
    dyn: 'pp',
  },
];

/** Rain: B minor, 64 bpm, 24 bars (90 s). A soft picked strumstick, the minor Rootsong and an ocean drum for the rain. */
export const rain = folkPiece({ id: 'rain', bpm: 64, sections });
