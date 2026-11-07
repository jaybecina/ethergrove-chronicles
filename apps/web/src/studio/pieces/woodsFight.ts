import { HUMANIZE_TRACK, type Piece } from '../score';
import { bars, dyn, rests, times } from './notation';

/** One 4-bar cycle of chords: D (the home chord of D Phrygian dominant), and E-flat, its flat second. */
const CYCLE = ['D', 'D', 'Eb', 'D'] as const;
type Chord = (typeof CYCLE)[number];
const each = (n: number, make: (c: Chord) => string) =>
  Array.from({ length: n }, (_, i) => make(CYCLE[i % 4] ?? 'D'));

/** The cellos' spiccato ostinato, in every 8th of every bar (the wall, REQ-28). */
const OST: Record<Chord, string> = {
  D: 'D2:2 D3:2 D2:2 Eb3:2 D2:2 D3:2 C3:2 A2:2',
  Eb: 'Eb2:2 Eb3:2 Eb2:2 D3:2 Eb2:2 Eb3:2 D3:2 Bb2:2',
};
/** Contrabass pizzicato: root, root, fifth below. */
const BASS: Record<Chord, string> = { D: 'D2:8 D2:4 A1:4', Eb: 'Eb2:8 Eb2:4 Bb1:4' };
/** The violin's gypsy chop on every off-beat. */
const CHOP: Record<Chord, string> = {
  D: 'r:2 (A4 D5):2 r:2 (A4 D5):2 r:2 (A4 F#5):2 r:2 (A4 D5):2',
  Eb: 'r:2 (G4 Eb5):2 r:2 (G4 Eb5):2 r:2 (Bb4 Eb5):2 r:2 (G4 Eb5):2',
};
/** Tremolo violins hold the chord (its third and fifth, up high): the wall over the drums. */
const TREM: Record<Chord, string> = { D: '(D4 F#4 A4):16', Eb: '(Eb4 G4 Bb4):16' };
const TREM_HIGH: Record<Chord, string> = { D: '(F#5 A5):16', Eb: '(G5 Bb5):16' };

/** The fiddle's riff in D Phrygian dominant: E-flat to F-sharp is the augmented second (REQ-27). */
const RIFF = [
  'D5:2 Eb5:2 F#5:2 G5:2 A5:4 G5:2 F#5:2',
  'Eb5:4 F#5:4 D5:8',
  'Eb5:2 F#5:2 G5:2 A5:2 Bb5:4 A5:2 G5:2',
  'F#5:2 Eb5:2 D5:2 C5:2 D5:8',
];
/** The climax, higher. */
const RIFF_HIGH = [
  'A5:2 Bb5:2 A5:2 G5:2 F#5:2 G5:2 A5:4',
  'D6:4 C6:2 Bb5:2 A5:8',
  'Bb5:2 A5:2 G5:2 F#5:2 Eb5:2 F#5:2 G5:4',
  'F#5:2 Eb5:2 D5:4 r:8',
];

/**
 * A fight in the Woods (cinematic folk spec §C): gypsy and cinematic. D Phrygian dominant, 126 bpm, 28 bars (53 s).
 * 1-4: cello spiccato, contrabass pizzicato, frame drum and a big bass drum. 5-8: the violin's off-beat chop, a
 * darbuka and tremolo violins join. 9-16: the fiddle's riff and a tenor drum. 17-24: the climax, a step louder and
 * an octave up, after a timpani roll and a cymbal. 25-28: back to the drums and the ostinato, into bar 1.
 */
export const woodsFight: Piece = {
  id: 'woodsFight',
  kind: 'track',
  bpm: 126,
  meter: 4,
  humanize: HUMANIZE_TRACK,
  parts: {
    cellosOst: {
      instrument: 'cellosSpic',
      gain: 0.5,
      dyn: dyn(['mf', 16], ['f', 8], ['mf', 4]),
      notes: bars(each(28, (c) => OST[c])),
    },
    bassPizz: {
      instrument: 'bassesPizz',
      gain: 0.6,
      dyn: dyn(['mf', 16], ['f', 8], ['mf', 4]),
      notes: bars(each(28, (c) => BASS[c])),
    },
    chop: {
      instrument: 'fiddleSpic',
      gain: 0.3,
      dyn: dyn(['mf', 28]),
      notes: bars(
        rests(4),
        each(24, (c) => CHOP[c]),
      ),
    },
    fiddle: {
      instrument: 'fiddle',
      gain: 0.5,
      reverb: 0.35,
      dyn: dyn(['mf', 16], ['f', 8], ['mf', 4]),
      notes: bars(rests(8), RIFF, RIFF, RIFF_HIGH, RIFF_HIGH, rests(4)),
    },
    stringsTrem: {
      instrument: 'violinsTrem',
      gain: 0.45,
      attack: 0.5,
      reverb: 0.4,
      dyn: dyn(['mf', 4], ['f', 20], ['mf', 4]),
      notes: bars(
        rests(4),
        each(12, (c) => TREM[c]),
        each(8, (c) => TREM_HIGH[c]),
        rests(4),
      ),
    },
    frame: {
      instrument: 'kit',
      gain: 0.34,
      kit: { f: 'frameDrum' },
      dyn: dyn(['mf', 16], ['f', 8], ['mf', 4]),
      notes: bars(times(28, 'f..f..f.f..f..f.')),
    },
    bigDrum: {
      instrument: 'kit',
      gain: 0.4,
      kit: { B: 'bassDrumBig' },
      dyn: dyn(['mf', 16], ['f', 8], ['mf', 4]),
      notes: bars(
        times(16, 'B.....B...B.....'),
        times(8, 'B.....B...B...B.'),
        times(4, 'B.....B...B.....'),
      ),
    },
    tenor: {
      instrument: 'kit',
      gain: 0.26,
      kit: { t: 'tenorDrum' },
      dyn: dyn(['mf', 28]),
      notes: bars(
        times(8, '................'),
        times(16, '..t...t...t.t.tt'),
        times(4, '................'),
      ),
    },
    darbuka: {
      instrument: 'kit',
      gain: 0.3,
      kit: { d: 'darbuka' },
      dyn: dyn(['mf', 28]),
      notes: bars(
        times(4, '................'),
        times(20, 'd..d..d.d.d.d..d'),
        times(4, 'd.......d.......'),
      ),
    },
    timpani: {
      instrument: 'kit',
      gain: 0.45,
      kit: { R: 'timpRoll' },
      dyn: dyn(['mf', 28]),
      notes: bars(
        times(7, '................'),
        'R...............',
        times(7, '................'),
        'R...............',
        times(12, '................'),
      ),
    },
    cymbal: {
      instrument: 'kit',
      gain: 0.3,
      kit: { S: 'cymbalSwell', C: 'cymbalHit' },
      dyn: dyn(['mf', 28]),
      notes: bars(
        times(15, '................'),
        'S...............',
        'C...............',
        times(11, '................'),
      ),
    },
  },
};
