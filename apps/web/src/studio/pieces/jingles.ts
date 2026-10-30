import { ROOTSONG_MAJOR, ROOTSONG_MINOR, transpose } from '../motifs';
import type { JingleFile } from '../../audio/music';
import type { Piece, PartSpec } from '../score';
import { bars } from './notation';

const jingle = (id: string, bpm: number, parts: Record<string, PartSpec>): Piece => ({
  id,
  kind: 'jingle',
  bpm,
  meter: 4,
  parts,
});

/** A new day: a harp gliss up, a three-note flute call and a glock sparkle. C major. */
const morning = jingle('morning', 120, {
  harp: { instrument: 'harp', arp: 'up', gain: 0.5, notes: '(C4 E4 G4 C5 E5 G5 C6):7 r:9 | r:16' },
  flute: { instrument: 'flute', gain: 0.5, notes: 'r:6 G5:2 C6:2 E6:6 | r:16' },
  glock: { instrument: 'glock', gain: 0.3, notes: 'r:8 C7:8 | r:16' },
  strings: { instrument: 'violins', gain: 0.35, dyn: 'p p', notes: '(C4 E4 G4):16 | r:16' },
});

/** Each season's fanfare: the Rootsong on horns, in the season's key, over strings and timpani. */
function season(
  id: JingleFile,
  horn: string,
  chords: [string, string, string, string],
  roots: [string, string, string, string],
  sleigh = false,
): Piece {
  return jingle(id, 120, {
    horn: { instrument: 'horn', gain: 0.55, dyn: 'mf mf f', notes: horn },
    strings: {
      instrument: 'violins',
      gain: 0.4,
      dyn: 'mp mf f',
      notes: bars(`${chords[0]}:16`, `${chords[1]}:8 ${chords[2]}:8`, `${chords[3]}:12 r:4`),
    },
    cellos: {
      instrument: 'cellos',
      gain: 0.42,
      dyn: 'mp mf f',
      notes: bars(`${roots[0]}:16`, `${roots[1]}:8 ${roots[2]}:8`, `${roots[3]}:12 r:4`),
    },
    perc: {
      instrument: 'kit',
      gain: 0.5,
      kit: { r: 'timpRoll', t: 'timpHit', s: 'cymbalSwell', b: 'sleigh' },
      notes: bars(
        '................',
        '....s...r.......',
        sleigh ? 't.b...b...b.....' : 't...............',
      ),
    },
  });
}

// The Rootsong opens on the sixth of the key, so the fanfares harmonize it vi – IV – I – I (audio spec §4.3).
const seasonSpring = season(
  'season-spring',
  `${transpose(ROOTSONG_MAJOR, -2)} | E4:12 r:4`,
  ['(A4 C5 E5)', '(A4 C5 F5)', '(G4 C5 E5)', '(G4 C5 E5)'],
  ['A2', 'F2', 'C3', 'C3'],
);
const seasonSummer = season(
  'season-summer',
  `${ROOTSONG_MAJOR.notes} | F#4:12 r:4`,
  ['(B4 D5 F#5)', '(B4 D5 G5)', '(A4 D5 F#5)', '(A4 D5 F#5)'],
  ['B2', 'G2', 'D3', 'D3'],
);
// Fall: the minor Rootsong in A minor, harmonized i – v – i – i.
const seasonFall = season(
  'season-fall',
  `${transpose(ROOTSONG_MINOR, -2)} | C4:12 r:4`,
  ['(A4 C5 E5)', '(G4 B4 E5)', '(A4 C5 E5)', '(A4 C5 E5)'],
  ['A2', 'E2', 'A2', 'A2'],
);
const seasonWinter = season(
  'season-winter',
  'C4:2 Eb4:2 G4:4 F4:2 Eb4:2 Bb4:4 | Ab4:2 G4:2 F4:2 G4:2 Eb4:8 | G4:12 r:4',
  ['(C5 Eb5 G5)', '(C5 Eb5 Ab5)', '(Bb4 Eb5 G5)', '(Bb4 Eb5 G5)'],
  ['C3', 'Ab2', 'Eb3', 'Eb3'],
  true,
);

/** All lessons done: a bright brass fanfare over string tremolo, timpani and a cymbal. C major. */
const lessonsComplete = jingle('lessonsComplete', 120, {
  trumpet: {
    instrument: 'trumpet',
    gain: 0.5,
    dyn: 'f f',
    notes: 'C5:2 E5:2 G5:2 C6:6 r:4 | A5:2 B5:2 D6:2 C6:10',
  },
  horn: {
    instrument: 'horn',
    gain: 0.45,
    dyn: 'f f',
    notes: 'E4:2 G4:2 C5:2 E5:6 r:4 | F4:2 G4:2 B4:2 E5:10',
  },
  strings: {
    instrument: 'violinsTrem',
    gain: 0.4,
    dyn: 'f f',
    notes: '(E4 G4 C5):16 | (F4 A4 C5):6 (E4 G4 C5):10',
  },
  cellos: { instrument: 'cellos', gain: 0.45, dyn: 'f f', notes: 'C3:4 G2:4 C3:8 | F2:6 C3:10' },
  perc: {
    instrument: 'kit',
    gain: 0.55,
    kit: { t: 'timpHit', c: 'cymbalHit' },
    notes: 't............... | t.....c.........',
  },
});

/** Passing out: cellos sink chromatically over a low piano and a fading pad. */
const faint = jingle('faint', 70, {
  cellos: {
    instrument: 'cellos',
    gain: 0.5,
    dyn: 'p p',
    notes: 'E4:4 Eb4:4 D4:4 Db4:4 | C4:12 r:4',
  },
  piano: { instrument: 'piano', gain: 0.4, dyn: 'pp pp', notes: '(C2 G2 C3):16 | r:16' },
  pad: { instrument: 'pad', gain: 0.18, dyn: 'p pp', notes: '(C3 G3 Eb4):16 | (C3 G3 Eb4):12 r:4' },
});

export const JINGLE_PIECES: Record<JingleFile, Piece> = {
  morning,
  lessonsComplete,
  faint,
  'season-spring': seasonSpring,
  'season-summer': seasonSummer,
  'season-fall': seasonFall,
  'season-winter': seasonWinter,
};
