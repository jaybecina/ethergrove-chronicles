import { HUMANIZE_TRACK, type Piece } from '../score';
import { bars, dyn, held, rests, times } from './notation';
import { bedBar, rootAt, shift, strumBar } from './folk';

/** The Woods tune: three 2-bar phrases in D Dorian (its B natural is the colour), original to Ethergrove. */
export const W1 = 'D5:4 F5:4 A5:4 G5:2 F5:2 | E5:6 F5:2 D5:8';
export const W2 = 'F5:4 G5:4 A5:4 B5:2 A5:2 | G5:6 F5:2 E5:8';
export const W3 = 'A5:4 G5:2 F5:2 E5:4 D5:4 | C5:8 D5:8';

const TUNE = ['Dm', 'Dm', 'G', 'C', 'Am', 'Dm'];
/** A 1-8, B 9-16, R 17-20 (no tune), C 21-28 (the swell), D 29-32 (fading into bar 1). */
const CHORDS = [
  ...['Dm', 'Dm', ...TUNE],
  ...[...TUNE, 'C', 'Dm'],
  ...['Dm', 'Dm', 'C', 'Dm'],
  ...[...TUNE, 'C', 'Dm'],
  ...['Dm', 'C', 'Dm', 'Dm'],
];
const strum = (from: number, to: number, pattern: readonly number[]) =>
  CHORDS.slice(from, to).map((c) => strumBar(c, pattern));

/**
 * Lowmere Woods by day (cinematic folk spec §C): medieval wilds, a drone and a tune. D Dorian, 78 bpm, 32 bars (98 s).
 * A: a fiddle fifth drones like a hurdy-gurdy over contrabass and cellos; the strumstick strums on the beats and the
 * recorder sings the tune. B: the fiddle takes the tune, a tenor drum walks, the recorder and a bowed psaltery hold
 * long notes over it. R: four bars of only drones and drums, so the wood can be heard. C: a timpani roll, then
 * violins and cellos bow in while fiddle and recorder trade the phrases. D: the recorder alone fades into bar 1.
 */
export const woods: Piece = {
  id: 'woods',
  kind: 'track',
  bpm: 78,
  meter: 4,
  humanize: HUMANIZE_TRACK,
  parts: {
    recorder: {
      instrument: 'recorder',
      gain: 0.42,
      dyn: dyn(['mp', 8], ['p', 8], ['mp', 4], ['mf', 8], ['p', 4]),
      notes: bars(
        rests(2),
        W1,
        W2,
        W3,
        rests(2),
        'D6:16',
        'C6:16',
        'A5:16',
        'A5:16',
        rests(2),
        rests(4),
        rests(2),
        W2,
        W3,
        'G5:16',
        'A5:16',
        'A5:16',
        'G5:8 E5:8',
        'D5:16',
        rests(1),
      ),
    },
    fiddle: {
      instrument: 'fiddle',
      gain: 0.48,
      reverb: 0.4,
      dyn: dyn(['mp', 16], ['mp', 4], ['mf', 8], ['mp', 4]),
      notes: bars(
        rests(8),
        W1,
        W2,
        W3,
        'E5:16',
        'D5:16',
        rests(4),
        W1,
        rests(2),
        shift(W3, -12),
        'E5:16',
        'D5:16',
        rests(4),
      ),
    },
    psaltery: {
      instrument: 'psaltery',
      gain: 0.3,
      reverb: 0.55,
      dyn: dyn(['p', 32]),
      notes: bars(rests(14), 'G5:16', 'A5:16', rests(16)),
    },
    strumstick: {
      instrument: 'strumstick',
      gain: 0.3,
      strum: 28,
      dyn: dyn(['mp', 8], ['mp', 8], ['p', 4], ['mf', 8], ['p', 4]),
      notes: bars(
        strum(0, 8, [8, 8]),
        strum(8, 16, [6, 2, 8]),
        rests(4),
        strum(20, 28, [6, 2, 4, 4]),
        strum(28, 31, [16]),
        rests(1),
      ),
    },
    droneFiddle: {
      instrument: 'fiddle',
      gain: 0.2,
      reverb: 0.45,
      dyn: dyn(['p', 32]),
      notes: bars(
        held(times(8, '(D4 A4)')),
        rests(8),
        held(times(4, '(D4 A4)')),
        rests(8),
        held(times(4, '(D4 A4)')),
      ),
    },
    droneBass: {
      instrument: 'basses',
      gain: 0.5,
      reverb: 0.35,
      dyn: dyn(['mp', 20], ['mf', 8], ['mp', 4]),
      notes: bars(held(CHORDS.map((c) => rootAt(c, 33)))),
    },
    droneCellos: {
      instrument: 'cellos',
      gain: 0.38,
      dyn: dyn(['p', 32]),
      notes: bars(CHORDS.map((c) => bedBar(c))),
    },
    stringsHigh: {
      instrument: 'violins',
      gain: 0.34,
      attack: 0.9,
      reverb: 0.5,
      dyn: dyn(['p', 20], ['p', 1], ['mp', 2], ['mf', 3], ['mp', 2], ['p', 4]),
      notes: bars(
        rests(20),
        'A4:16',
        'A4:16',
        'B4:16',
        'C5:16',
        'C5:16',
        'D5:16',
        'E5:16',
        'F5:16',
        rests(4),
      ),
    },
    stringsLow: {
      instrument: 'cellos',
      gain: 0.45,
      attack: 0.6,
      reverb: 0.45,
      dyn: dyn(['p', 20], ['mp', 2], ['mf', 4], ['mp', 2], ['p', 4]),
      notes: bars(rests(20), held(CHORDS.slice(20, 28).map((c) => rootAt(c, 45))), rests(4)),
    },
    frame: {
      instrument: 'kit',
      gain: 0.38,
      kit: { f: 'frameDrum' },
      dyn: dyn(['p', 8], ['mp', 12], ['mf', 8], ['p', 4]),
      notes: bars(
        times(8, 'f.......f.......'),
        times(8, 'f.....f.f.......'),
        times(4, 'f.......f.......'),
        times(8, 'f.....f.f...f...'),
        times(4, 'f...............'),
      ),
    },
    tenor: {
      instrument: 'kit',
      gain: 0.3,
      kit: { t: 'tenorDrum' },
      dyn: dyn(['p', 8], ['p', 12], ['mp', 8], ['p', 4]),
      notes: bars(
        times(8, '................'),
        times(8, '....t.......t.t.'),
        times(4, '....t.......t...'),
        times(8, '....t.......t.t.'),
        times(4, '................'),
      ),
    },
    timpani: {
      instrument: 'kit',
      gain: 0.4,
      kit: { R: 'timpRoll' },
      dyn: dyn(['mp', 32]),
      notes: bars(times(19, '................'), 'R...............', times(12, '................')),
    },
    bigDrum: {
      instrument: 'kit',
      gain: 0.42,
      kit: { B: 'bassDrumBig' },
      dyn: dyn(['mp', 20], ['mf', 8], ['p', 4]),
      notes: bars(
        times(20, '................'),
        times(8, 'B...............'),
        times(4, '................'),
      ),
    },
  },
};
