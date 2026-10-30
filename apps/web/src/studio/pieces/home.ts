import { GRANDPA } from '../motifs';
import type { Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';

const CHORD: Record<string, string> = {
  Gmaj7: '(G3 B3 D4 F#4)',
  Em7: '(E3 G3 B3 D4)',
  Cmaj7: '(C4 E4 G4 B4)',
  D7: '(D4 F#4 A4 C5)',
  Am7: '(A3 C4 E4 G4)',
  Bm7: '(B3 D4 F#4 A4)',
  D7sus4: '(D4 G4 A4 C5)',
};
const c = (name: string) => CHORD[name] ?? '(G3 B3 D4)';
const A = ['Gmaj7', 'Em7', 'Cmaj7', 'D7', 'Gmaj7', 'Em7', 'Am7', 'D7'];
const B = ['Cmaj7', 'Bm7', 'Am7', 'D7sus4·D7', 'Gmaj7', 'Em7', 'Am7·D7', 'Gmaj7'];
const ROOTS = [
  'G2',
  'E2',
  'C2',
  'D2',
  'G2',
  'E2',
  'A2',
  'D2',
  'C2',
  'B1',
  'A1',
  'D2',
  'G2',
  'E2',
  'A1 D2',
  'G2',
];

/** A soft block chord on beat 1 (the upright piano). */
const block = (name: string) =>
  name.includes('·')
    ? name
        .split('·')
        .map((n) => `${c(n)}:4 r:4`)
        .join(' ')
    : `${c(name)}:4 r:12`;
/** Electric-piano comping on the off-beats. */
const comp = (name: string) =>
  name.includes('·')
    ? name
        .split('·')
        .map((n) => `r:2 ${c(n)}:2 r:2 ${c(n)}:2`)
        .join(' ')
    : `r:2 ${c(name)}:2 r:2 ${c(name)}:2 r:2 ${c(name)}:2 r:2 ${c(name)}:2`;
/** Sub bass roots; two roots in a bar split it in half. */
const root = (r: string) =>
  r.includes(' ')
    ? r
        .split(' ')
        .map((n) => `${n}:8`)
        .join(' ')
    : `${r}:16`;

const THEME = GRANDPA.notes;

/**
 * "Grandpa's Kitchen": lo-fi, warm and a little worn (audio spec §4.2). G major, 74 bpm, swing 0.1, 16 bars.
 * A: soft upright chords on beat 1, electric-piano comping on the off-beats, the clarinet plays Grandpa's theme,
 * sub bass; a soft kick, a tambourine shake and one snare tap on the "and" of 2 — never a backbeat.
 * B: the electric piano takes the tune and the clarinet answers with Grandpa's theme; a pad at pp.
 */
export const home: Piece = {
  id: 'home',
  kind: 'track',
  bpm: 74,
  meter: 4,
  swing: 0.1,
  lofi: { wowHz: 0.5, wowMs: 1.2, drive: 1.4, lowpassHz: 6500, hissDb: -44 },
  parts: {
    clarinet: {
      instrument: 'clarinet',
      gain: 0.46,
      reverb: 0.25,
      dyn: dyn(['p', 16]),
      notes: bars(
        THEME,
        'E4:4 G4:4 B4:8',
        'A4:8 F#4:8',
        THEME,
        'C5:4 A4:4 E4:8',
        'F#4:8 A4:4 D4:4',
        rests(4),
        THEME,
        'E4:8 F#4:8',
        'G4:16',
      ),
    },
    lead: {
      instrument: 'ePiano',
      gain: 0.32,
      dyn: dyn(['mp', 16]),
      notes: bars(
        rests(8),
        'E5:4 G5:4 B5:8',
        'A5:4 F#5:4 D5:8',
        'C5:4 E5:4 G5:8',
        'G5:8 F#5:8',
        rests(4),
      ),
    },
    comp: {
      instrument: 'ePiano',
      gain: 0.18,
      dyn: dyn(['p', 16]),
      notes: bars([...A, ...B].map(comp)),
    },
    piano: {
      instrument: 'piano',
      gain: 0.32,
      reverb: 0.25,
      dyn: dyn(['p', 16]),
      notes: bars([...A, ...B].map(block)),
    },
    pad: {
      instrument: 'pad',
      gain: 0.14,
      reverb: 0.4,
      dyn: dyn(['pp', 16]),
      notes: bars(rests(8), held(B.map((n) => c(n.split('·')[0] ?? n)))),
    },
    bass: {
      instrument: 'subBass',
      gain: 0.42,
      reverb: 0.1,
      dyn: dyn(['mp', 16]),
      notes: bars(ROOTS.map(root)),
    },
    drums: {
      instrument: 'kit',
      gain: 0.32,
      kit: { k: 'softKick', t: 'snareTap' },
      dyn: dyn(['p', 16]),
      notes: bars(times(16, 'k.....t.........')),
    },
    shaker: {
      instrument: 'kit',
      gain: 0.2,
      kit: { s: 'shakerSoft' },
      dyn: dyn(['pp', 16]),
      notes: bars(times(16, 's.s.s.s.s.s.s.s.')),
    },
  },
};
