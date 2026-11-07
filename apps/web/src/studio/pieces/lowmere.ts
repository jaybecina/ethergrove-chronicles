import { HUMANIZE_TRACK, type Piece } from '../score';
import {
  atOrAbove,
  bedBar,
  folkPiece,
  midiName,
  move,
  PHRASE_MAJOR_D,
  strumBar,
  triad,
  type Section,
} from './folk';
import { bars, dyn, rests, times } from './notation';

/** Chords under the major Rootsong phrase, two to a bar where the tune changes at the half. */
const ROOTSONG = ['G A', 'G D', 'D', 'A', 'G A', 'G D', 'D', 'D'];
/** The gypsy turn in D Phrygian dominant: D and its flat-second E-flat, with C minor and G minor. */
const TURN = ['D', 'Eb', 'D', 'Cm', 'D', 'Eb', 'Gm', 'D'];
const REST = ['D', 'D', 'D', 'D'];
/** The outro is Mixolydian, with the town's flat seventh, C. */
const OUTRO = ['D', 'C', 'G', 'D', 'D', 'C', 'D', 'D'];
/** A1 1-8, A2 9-16, the turn 17-24, rest 25-28, A3 29-36, outro 37-44. */
const CHORDS = [...ROOTSONG, ...ROOTSONG, ...TURN, ...REST, ...ROOTSONG, ...OUTRO];

/** The boom: contrabass pizzicato on beats 1 and 3, the chord's root then its fifth (or the second chord's root). */
function boom(chords: string): string {
  const [a, b] = chords.split(' ');
  const root = (c: string) => atOrAbove(triad(c)[0], 36);
  const first = root(a ?? 'D');
  return `${midiName(first)}:8 ${midiName(b ? root(b) : first + 7)}:8`;
}

/** The gypsy turn on the clarinet: E-flat to F-sharp is the augmented second (REQ-27). */
const TURN_CLARINET = [
  'D4:2 Eb4:2 F#4:4 G4:2 F#4:2 Eb4:4',
  'D4:4 Eb4:4 G4:8',
  'A4:2 Bb4:2 A4:2 G4:2 F#4:4 Eb4:4',
  'D4:4 C4:4 Eb4:8',
  'F#4:2 G4:2 A4:4 Bb4:2 A4:2 G4:2 F#4:2',
  'G4:4 Eb4:4 Bb3:8',
  'D4:2 Eb4:2 D4:2 C4:2 Bb3:4 A3:4',
  'D4:16',
];
/** Under the third Rootsong the clarinet holds a lower line. */
const HARMONY = [
  'G3:8 A3:8',
  'B3:8 A3:8',
  'A3:16',
  'A3:8 C#4:8',
  'D4:8 C#4:8',
  'B3:8 A3:8',
  'F#3:16',
  'F#3:16',
];
const TAG = ['A4:4 F#4:4 D4:8', 'G4:4 E4:4 C4:8', 'D4:4 B3:4 G3:8', 'A3:16'];

/**
 * Lowmere by day (cinematic folk spec §C): a bard and a gypsy band in the tavern yard. D major, 100 bpm, a light
 * swing, 44 bars (106 s). A1: boom-chuck (contrabass and frame drum on 1 and 3, a quick strum on 2 and 4) under the fiddle's
 * Rootsong. A2: the clarinet sings it, the fiddle doubles an octave up, a tambourine on the backbeat. The turn: D
 * Phrygian dominant, the clarinet leads and the fiddle holds long notes over a faster chop. Rest: four bars of cello
 * drone and hand drums. A3: the Rootsong again over a clarinet line. Outro: a Mixolydian tag, then the band alone.
 */
export const lowmere: Piece = {
  id: 'lowmere',
  kind: 'track',
  bpm: 100,
  meter: 4,
  swing: 0.12,
  humanize: HUMANIZE_TRACK,
  parts: {
    fiddle: {
      instrument: 'fiddle',
      gain: 0.48,
      reverb: 0.32,
      dyn: dyn(['mp', 8], ['mf', 8], ['mp', 8], ['mp', 4], ['mf', 8], ['mp', 8]),
      notes: bars(
        PHRASE_MAJOR_D,
        move(PHRASE_MAJOR_D, 12),
        rests(4),
        'A5:16',
        'Bb5:16',
        'Bb5:16',
        'A5:16',
        rests(4),
        PHRASE_MAJOR_D,
        TAG,
        rests(4),
      ),
    },
    clarinet: {
      instrument: 'clarinet',
      gain: 0.42,
      reverb: 0.3,
      dyn: dyn(['mp', 8], ['mf', 8], ['mf', 8], ['mp', 4], ['p', 8], ['mp', 8]),
      notes: bars(rests(8), PHRASE_MAJOR_D, TURN_CLARINET, rests(4), HARMONY, rests(8)),
    },
    strumstick: {
      instrument: 'strumstick',
      gain: 0.3,
      strum: 18,
      dyn: dyn(['mp', 16], ['mf', 8], ['mp', 4], ['mp', 8], ['p', 8]),
      notes: bars(
        CHORDS.slice(0, 16).map((c) => strumBar(c, [-4, 4, -4, 4])),
        CHORDS.slice(16, 24).map((c) => strumBar(c, [-2, 2, -2, 2, -2, 2, -2, 2])),
        rests(4),
        CHORDS.slice(28).map((c) => strumBar(c, [-4, 4, -4, 4])),
      ),
    },
    bassPizz: {
      instrument: 'bassesPizz',
      gain: 0.95,
      dyn: dyn(['mf', 24], ['mf', 4], ['mf', 8], ['mp', 8]),
      notes: bars(CHORDS.slice(0, 24).map(boom), rests(4), CHORDS.slice(28).map(boom)),
    },
    droneCellos: {
      instrument: 'cellos',
      gain: 0.45,
      // A soft root-and-fifth bed under the band (like an accordion's bass), fuller in the four rest bars.
      dyn: dyn(['p', 24], ['mp', 4], ['p', 16]),
      notes: bars(CHORDS.map((c) => bedBar(c.split(' ')[0] ?? c))),
    },
    darbuka: {
      instrument: 'kit',
      gain: 0.34,
      kit: { d: 'darbuka' },
      dyn: dyn(['mp', 16], ['mf', 8], ['mp', 12], ['p', 8]),
      notes: bars(
        times(16, 'd.......d.d.....'),
        times(8, 'd..d..d.d..d..d.'),
        times(4, 'd...d...d...d.d.'),
        times(8, 'd.......d.d.....'),
        times(8, 'd.......d.......'),
      ),
    },
    tamb: {
      instrument: 'kit',
      gain: 0.22,
      kit: { t: 'tamb' },
      dyn: dyn(['mp', 44]),
      notes: bars(
        times(8, '................'),
        times(8, '....t.......t...'),
        times(20, '................'),
        times(8, '....t.......t...'),
      ),
    },
    frame: {
      instrument: 'kit',
      gain: 0.4,
      kit: { f: 'frameDrum' },
      dyn: dyn(['mp', 44]),
      // The other half of the boom: a frame drum under the contrabass on 1 and 3.
      notes: bars(times(44, 'f.......f.......')),
    },
  },
};

const recorder = move(PHRASE_MAJOR_D, 12);
const fiddle = move(PHRASE_MAJOR_D, 0);
const rest4 = ['r:16', 'r:16', 'r:16', 'r:16'];
const sections: Section[] = [
  {
    chords: ['D', 'D', 'G', 'D', 'D', 'C', 'G', 'A'],
    recorder: [...recorder.slice(0, 4), ...rest4],
    harp: true,
    dyn: 'p',
  },
  { chords: ['Bm', 'G', 'D', 'A'], frame: 'f...............', dyn: 'pp' },
  {
    chords: ['D', 'D', 'G', 'D', 'D', 'C', 'G', 'A'],
    fiddle: [...fiddle.slice(0, 4), ...rest4],
    harp: true,
    dyn: 'pp',
  },
  { chords: ['Bm', 'G', 'A', 'D'], pick: true, dyn: 'pp' },
];

/** Lowmere at night: the same key and Rootsong, 72 bpm, 24 bars (80 s), few voices and a lot of room. */
export const lowmereNight = folkPiece({ id: 'lowmereNight', bpm: 72, sections });
