import { GRANDPA } from '../motifs';
import { barsOf, folkPiece, move, type Section } from './folk';

/** Grandpa's theme in G with an answer and an ending: 8 bars. */
const THEME = [
  ...barsOf(GRANDPA.notes),
  'B4:8 A4:8',
  'G4:16',
  ...barsOf(GRANDPA.notes),
  'D5:8 B4:8',
  'G4:16',
];
const A = ['G', 'G', 'C', 'D', 'G', 'Em', 'C', 'D'];
const B = ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'G'];

const sections: Section[] = [
  { chords: A, fiddle: THEME, pick: true, harp: true, dyn: 'p' },
  { chords: B, clarinet: THEME, pick: true, harp: true, dyn: 'p' },
  { chords: A, fiddle: move(THEME, 12), clarinet: THEME, pick: true, harp: true, dyn: 'mp' },
  { chords: ['Em', 'C', 'D', 'G'], pick: true, dyn: 'pp' },
];

/** The farmhouse: G major, 72 bpm, 28 bars (93 s). Grandpa's theme by the hearth, on fiddle and clarinet. */
export const home = folkPiece({ id: 'home', bpm: 72, sections });
