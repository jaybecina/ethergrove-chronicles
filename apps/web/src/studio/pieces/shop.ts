import { folkPiece, type Section } from './folk';

/** Sol's tune: four bars in D Mixolydian (the flat seventh on the C), original to Ethergrove. */
const TUNE = [
  'D5:2 E5:2 F#5:4 A5:4 F#5:4',
  'G5:2 F#5:2 E5:4 D5:8',
  'D5:2 E5:2 F#5:4 A5:4 B5:4',
  'C5:8 B4:8',
];
const A = ['D', 'G', 'D', 'A', 'D', 'G', 'D', 'A'];
const DARBUKA = 'd...d.d.d...d.d.';
const TAMB = 't.t.t.t.t.t.t.t.';

const sections: Section[] = [
  { chords: A, fiddle: [...TUNE, ...TUNE], pick: true, darbuka: DARBUKA, tamb: TAMB, dyn: 'mf' },
  { chords: A, recorder: [...TUNE, ...TUNE], pick: true, harp: true, darbuka: DARBUKA, dyn: 'mf' },
  {
    chords: A,
    fiddle: [...TUNE, ...TUNE],
    recorder: [...TUNE, ...TUNE],
    pick: true,
    darbuka: DARBUKA,
    tamb: TAMB,
    dyn: 'mf',
  },
  { chords: A, fiddle: [...TUNE, ...TUNE], pick: true, darbuka: DARBUKA, dyn: 'mf' },
  {
    chords: A,
    fiddle: [...TUNE, 'r:16', 'r:16', 'r:16', 'r:16'],
    pick: true,
    darbuka: DARBUKA,
    dyn: 'mp',
  },
];

/** Sol's cart: D Mixolydian, 112 bpm, 40 bars (86 s). A tavern dance for fiddle and recorder over a picked strumstick. */
export const shop = folkPiece({ id: 'shop', bpm: 112, sections });
