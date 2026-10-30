import { ROOTSONG_MAJOR, transpose } from '../motifs';
import type { Piece } from '../score';
import { bars, dyn, held, rests, silent, times } from './notation';

const CHORD: Record<string, string> = {
  Fmaj7: '(F3 A3 C4 E4)',
  Am7: '(A3 C4 E4 G4)',
  Bbmaj7: '(Bb3 D4 F4 A4)',
  C9: '(C4 E4 G4 Bb4 D5)',
  Dm9: '(D4 F4 A4 C5 E5)',
  Gm7: '(G3 Bb3 D4 F4)',
  Csus4: '(C4 F4 G4)',
  C: '(C4 E4 G4 Bb4)',
};
const c = (name: string) => CHORD[name] ?? '(F3 A3 C4)';
/** One bar per entry; `X·Y` splits the bar in half. */
const bar = (name: string) =>
  name.includes('·')
    ? name
        .split('·')
        .map((n) => `${c(n)}:8`)
        .join(' ')
    : `${c(name)}:16`;
const A = ['Fmaj7', 'Am7', 'Bbmaj7', 'C9', 'Fmaj7', 'Dm9', 'Gm7', 'Csus4·C'];
const B = ['Bbmaj7', 'Am7', 'Gm7', 'Fmaj7', 'Bbmaj7', 'Am7', 'Gm7·C', 'Fmaj7'];
const ROOTS = [
  'F2',
  'A2',
  'Bb2',
  'C2',
  'F2',
  'D2',
  'G2',
  'C2',
  'Bb2',
  'A2',
  'G2',
  'F2',
  'Bb2',
  'A2',
  'G2',
  'F2',
];

/** The Rootsong in F at half speed: each length doubled, so its two bars take four (audio spec §4.2). */
const HALF_SPEED_F = transpose(ROOTSONG_MAJOR, 15)
  .split(/\s+/)
  .filter((t) => t !== '|')
  .map((t) => t.replace(/:(\d+)$/, (_, n: string) => `:${String(Number(n) * 2)}`));
// Re-barred into whole 16-step bars: D5:4 F5:4 A5:8 | G5:4 F5:4 C6:8 | Bb5:4 A5:4 G5:4 A5:4 | F5:16
const HALF_BARS = [
  HALF_SPEED_F.slice(0, 3),
  HALF_SPEED_F.slice(3, 6),
  HALF_SPEED_F.slice(6, 10),
  HALF_SPEED_F.slice(10),
].map((b) => b.join(' '));

/**
 * "Fireflies": lo-fi night (audio spec §4.2). F major, 62 bpm, 16 bars (≈62 s).
 * A: electric-piano broken chords, the second upright plays the Rootsong at half speed (twice), pad and choir
 * at pp, sub bass, no drums. B: the upright answers, harp sparkles, a soft shaker, a glock on the last note.
 */
export const night: Piece = {
  id: 'night',
  kind: 'track',
  bpm: 62,
  meter: 4,
  lofi: { wowHz: 0.4, wowMs: 1.5, drive: 1.2, lowpassHz: 6000, hissDb: -46 },
  parts: {
    upright: {
      instrument: 'uprightNr1',
      gain: 0.5,
      reverb: 0.35,
      dyn: dyn(['p', 8], ['mp', 8]),
      notes: bars(
        HALF_BARS,
        HALF_BARS,
        'A5:8 F5:4 D5:4',
        'E5:8 C5:4 G5:4',
        'F5:8 D5:4 Bb4:4',
        'C5:16',
        'D5:4 F5:4 A5:8',
        'G5:4 E5:4 C5:8',
        'Bb4:8 E5:8',
        'F5:16',
      ),
    },
    keys: {
      instrument: 'ePiano',
      arp: 'up',
      arpRate: 2,
      gain: 0.3,
      dyn: dyn(['p', 16]),
      notes: bars([...A, ...B].map(bar)),
    },
    pad: {
      instrument: 'pad',
      gain: 0.18,
      reverb: 0.5,
      dyn: dyn(['pp', 16]),
      notes: bars([...A, ...B].map(bar)),
    },
    choir: {
      instrument: 'choir',
      gain: 0.14,
      dyn: dyn(['pp', 16]),
      notes: bars(A.map(bar), rests(8)),
    },
    harp: {
      instrument: 'harp',
      arp: 'up',
      arpRate: 4,
      octave: 1,
      gain: 0.22,
      dyn: dyn(['pp', 8], ['p', 8]),
      notes: bars(rests(8), held(B.map((n) => c(n.split('·')[0] ?? n)))),
    },
    glock: {
      instrument: 'glock',
      gain: 0.18,
      dyn: dyn(['pp', 16]),
      notes: bars(rests(15), 'F6:4 r:12'),
    },
    bass: {
      instrument: 'subBass',
      gain: 0.42,
      reverb: 0.1,
      dyn: dyn(['mp', 16]),
      notes: bars(held(ROOTS)),
    },
    shaker: {
      instrument: 'kit',
      gain: 0.22,
      kit: { s: 'shakerSoft' },
      dyn: dyn(['pp', 16]),
      notes: bars(silent(8), times(8, '..s...s...s...s.')),
    },
  },
};
