import { HUMANIZE_TRACK, type Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';
import { bedBar, harpBar, move, PHRASE_MAJOR_D, PHRASE_MINOR_B, rootAt, strumBar } from './folk';

/** Chords under each bar of the minor and major Rootsong phrases (two chords split the bar in half). */
const MINOR = ['Bm G', 'F# Bm', 'D', 'A', 'Bm G', 'F# Bm', 'Em', 'Bm'];
const MAJOR = ['Bm A', 'G D', 'D', 'A', 'Bm A', 'G D', 'Bm', 'D'];
const INTRO = ['Bm', 'G A'];
const SWELL_TAIL = ['D', 'A'];
/** Bars 1-2 intro, 3-10 the bard (minor), 11-20 the swell (major), 21-28 the bard again (minor, an octave up). */
const CHORDS = [...INTRO, ...MINOR, ...MAJOR, ...SWELL_TAIL, ...MINOR];

/** Strum patterns in 16ths: a ballad lilt, a driving swell, a soft close. */
const BALLAD = [6, 2, 4, 4];
const DRIVE = [4, 2, 2, 4, 2, 2];
const SOFT = [8, 8];
const strum = (chords: readonly string[], pattern: readonly number[]) =>
  chords.map((c) => strumBar(c, pattern));
/** The first chord of a bar. */
const head = (c: string) => c.split(' ')[0] ?? c;

/** The swell's string lines: a violin counter-line over cellos on the roots, both bowed in slowly. */
const VIOLINS = [
  'F#5:8 E5:8',
  'D5:8 F#5:8',
  'A5:16',
  'E5:16',
  'F#5:8 E5:8',
  'G5:8 F#5:8',
  'F#5:16',
  'A5:16',
  'D6:16',
  'C#6:16',
];

/**
 * "Ethergrove" (cinematic folk spec §C): a bard by a fire, then the valley opens. B minor into D major, 72 bpm,
 * 28 bars (93 s).
 * Bars 1-10, the bard: a strummed strumstick and a contrabass B, then the fiddle sings the minor Rootsong.
 * Bars 11-20, the swell: a timpani roll and cymbal lead in; violins and cellos bow in under the major Rootsong on
 * fiddle and recorder in octaves, with a big bass drum on the downbeats.
 * Bars 21-28, the bard again: the recorder takes the minor Rootsong over the strumstick and a folk harp, softer, and
 * the last bars thin to the strumstick so the loop returns to bar 1.
 */
export const title: Piece = {
  id: 'title',
  kind: 'track',
  bpm: 72,
  meter: 4,
  humanize: HUMANIZE_TRACK,
  parts: {
    fiddle: {
      instrument: 'fiddle',
      gain: 0.5,
      reverb: 0.4,
      dyn: dyn(['mp', 10], ['mf', 4], ['f', 4], ['mf', 2], ['mp', 8]),
      notes: bars(rests(2), PHRASE_MINOR_B, PHRASE_MAJOR_D, rests(2), rests(8)),
    },
    recorder: {
      instrument: 'recorder',
      gain: 0.42,
      dyn: dyn(['mp', 10], ['mf', 8], ['mp', 2], ['mp', 6], ['p', 2]),
      notes: bars(rests(10), move(PHRASE_MAJOR_D, 12), rests(2), move(PHRASE_MINOR_B, 12)),
    },
    strumstick: {
      instrument: 'strumstick',
      gain: 0.3,
      strum: 22,
      dyn: dyn(['mp', 10], ['mf', 10], ['mp', 6], ['p', 2]),
      notes: bars(
        strum(CHORDS.slice(0, 10), BALLAD),
        strum(CHORDS.slice(10, 20), DRIVE),
        strum(CHORDS.slice(20, 26), BALLAD),
        strum(CHORDS.slice(26), SOFT),
      ),
    },
    folkHarp: {
      instrument: 'folkHarp',
      arp: 'up',
      arpRate: 2,
      gain: 0.32,
      reverb: 0.45,
      dyn: dyn(['pp', 20], ['p', 6], ['pp', 2]),
      notes: bars(
        rests(20),
        CHORDS.slice(20, 26).map((c) => harpBar(head(c))),
        rests(2),
      ),
    },
    droneBass: {
      instrument: 'basses',
      gain: 0.55,
      reverb: 0.35,
      dyn: dyn(['p', 10], ['mf', 10], ['p', 8]),
      notes: bars(held(CHORDS.map((c) => rootAt(c, 33)))),
    },
    droneCellos: {
      instrument: 'cellos',
      gain: 0.42,
      dyn: dyn(['p', 10], ['p', 10], ['p', 8]),
      notes: bars(
        CHORDS.slice(0, 10).map((c) => bedBar(head(c))),
        rests(10),
        CHORDS.slice(20).map((c) => bedBar(head(c))),
      ),
    },
    stringsHigh: {
      instrument: 'violins',
      gain: 0.36,
      attack: 0.9,
      reverb: 0.5,
      dyn: dyn(['p', 11], ['mp', 2], ['mf', 3], ['f', 2], ['mf', 1], ['mp', 1], ['p', 8]),
      notes: bars(rests(10), VIOLINS, rests(8)),
    },
    stringsLow: {
      instrument: 'cellos',
      gain: 0.5,
      attack: 0.6,
      reverb: 0.45,
      dyn: dyn(['p', 10], ['mp', 3], ['mf', 3], ['f', 2], ['mf', 1], ['mp', 1], ['p', 8]),
      notes: bars(rests(10), held(CHORDS.slice(10, 20).map((c) => rootAt(c, 40))), rests(8)),
    },
    timpani: {
      instrument: 'kit',
      gain: 0.45,
      kit: { R: 'timpRoll' },
      dyn: dyn(['p', 9], ['mf', 1], ['p', 8], ['mp', 1], ['p', 9]),
      notes: bars(
        times(9, '................'),
        'R...............',
        times(8, '................'),
        'R...............',
        times(9, '................'),
      ),
    },
    cymbal: {
      instrument: 'kit',
      gain: 0.3,
      kit: { S: 'cymbalSwell' },
      dyn: dyn(['mp', 28]),
      notes: bars(times(9, '................'), 'S...............', times(18, '................')),
    },
    bigDrum: {
      instrument: 'kit',
      gain: 0.5,
      kit: { B: 'bassDrumBig' },
      dyn: dyn(['mp', 10], ['mf', 4], ['f', 4], ['mp', 2], ['p', 8]),
      notes: bars(
        times(10, '................'),
        times(4, 'B...............'),
        times(4, 'B.......B.......'),
        times(2, 'B...............'),
        times(8, '................'),
      ),
    },
    frame: {
      instrument: 'kit',
      gain: 0.36,
      kit: { f: 'frameDrum' },
      dyn: dyn(['p', 10], ['mp', 10], ['pp', 8]),
      notes: bars(
        times(2, '................'),
        times(8, 'f.......f.......'),
        times(10, 'f.....f.f.......'),
        times(6, 'f...............'),
        times(2, '................'),
      ),
    },
  },
};
