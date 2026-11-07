import { barsOf, folkPiece, type Section } from './folk';
import { W1 } from './woods';

const rest6 = Array.from({ length: 6 }, () => 'r:16');
const sections: Section[] = [
  {
    chords: ['Dm', 'Dm', 'C', 'C', 'G', 'G', 'Dm', 'Am'],
    recorder: [...barsOf(W1), ...rest6],
    harp: true,
    dyn: 'p',
  },
  { chords: ['Dm', 'C', 'G', 'Dm'], frame: 'f...............', dyn: 'pp' },
  {
    chords: ['Dm', 'Dm', 'C', 'C', 'G', 'G', 'Dm', 'Am'],
    fiddle: [...barsOf(W1), ...rest6],
    psaltery: ['D5:16', 'D5:16', 'C5:16', 'C5:16', 'G5:16', 'G5:16', 'A5:16', 'A5:16'],
    harp: true,
    dyn: 'pp',
  },
];

/** The Woods at night: the same D Dorian tune as the day, 58 bpm, 20 bars (83 s), with only three voices at most. */
export const woodsNight = folkPiece({ id: 'woodsNight', bpm: 58, sections });
