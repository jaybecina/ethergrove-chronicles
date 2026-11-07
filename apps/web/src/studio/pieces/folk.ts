import { ROOTSONG_MAJOR, ROOTSONG_MINOR } from '../motifs';
import { noteMidi } from '../notes';
import type { KitId } from '../samples';
import type { PartSpec, Piece } from '../score';
import { dyn, rests, silent } from './notation';

/** The folk arrangement builder (soundtrack spec §A): chords and phrases in, a small ensemble out. */

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const midiName = (m: number): string =>
  `${NAMES[m % 12] ?? 'C'}${String(Math.floor(m / 12) - 1)}`;

/** Every note name in `notes` moved by `semitones` (rests and ties are left alone). */
export const shift = (notes: string, semitones: number): string =>
  notes.replace(/([A-G][#b]?\d)(?=[:\s)]|$)/g, (n) => midiName(noteMidi(n) + semitones));
/** The bars of a `|`-separated phrase. */
export const barsOf = (phrase: string): string[] => phrase.split('|').map((b) => b.trim());

const PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/** A major or minor triad from its name (`D`, `F#m`, `Bb`), as pitch classes root, third, fifth. */
export function triad(name: string): [number, number, number] {
  const m = /^([A-G][#b]?)(m?)$/.exec(name);
  const root = m ? PC[m[1] ?? ''] : undefined;
  if (!m || root === undefined) throw new Error(`Bad chord "${name}"`);
  return [root, (root + (m[2] ? 3 : 4)) % 12, (root + 7) % 12];
}
/** The lowest MIDI note with pitch class `pc` at or above `floor`. */
export const atOrAbove = (pc: number, floor: number): number => floor + ((pc - floor + 1200) % 12);

/** One bar of finger-picked strumstick (root E3 to D#4, never below its recordings). */
export function pickBar(chord: string, meter: 3 | 4 = 4): string {
  const [r, t, f] = triad(chord).map((pc) => pc);
  const root = atOrAbove(r ?? 0, 52);
  const third = midiName(atOrAbove(t ?? 0, root + 1));
  const fifth = midiName(atOrAbove(f ?? 0, root + 1));
  const R = midiName(root);
  return meter === 4
    ? `${R}:2 ${fifth}:2 ${third}:2 ${fifth}:2 ${R}:2 ${fifth}:2 ${third}:2 ${fifth}:2`
    : `${R}:4 ${fifth}:2 ${third}:2 ${fifth}:2 ${third}:2`;
}
/** One bar of folk harp rolled upward over the whole bar (B2 and up). */
export function harpBar(chord: string, meter: 3 | 4 = 4): string {
  const [r, t, f] = triad(chord);
  const root = atOrAbove(r, 47);
  const third = atOrAbove(t, root + 1);
  const fifth = atOrAbove(f, root + 1);
  const notes = [root, fifth, root + 12, third + 12, fifth + 12].map(midiName);
  return `(${notes.join(' ')}):${String(meter * 4)}`;
}
/** One bar of the cello's bed: the root and its fifth, a held whole bar. */
export function bedBar(chord: string, meter: 3 | 4 = 4): string {
  const [r] = triad(chord);
  const root = atOrAbove(r, 36);
  return `(${midiName(root)} ${midiName(root + 7)}):${String(meter * 4)}`;
}

/** The Rootsong at D with an answer and an ending, in the fiddle's octave (B3 to A4): 8 bars of 4/4. */
const ANSWER_D = ['F#4:8 A4:8', 'E4:16'];
const ENDING_D = ['D4:8 F#4:8', 'D4:16'];
export const PHRASE_MAJOR_D: string[] = [
  ...barsOf(ROOTSONG_MAJOR.notes),
  ...ANSWER_D,
  ...barsOf(ROOTSONG_MAJOR.notes),
  ...ENDING_D,
];
/** The minor Rootsong at B in the same octave, with its answer and ending: 8 bars of 4/4. */
export const PHRASE_MINOR_B: string[] = [
  ...barsOf(ROOTSONG_MINOR.notes),
  'A4:4 F#4:4 D4:8',
  'E4:8 C#4:4 A4:4',
  ...barsOf(ROOTSONG_MINOR.notes),
  'G4:4 E4:4 B3:8',
  'B3:16',
];
/** A phrase moved by `semitones`. */
export const move = (phrase: readonly string[], semitones: number): string[] =>
  phrase.map((b) => shift(b, semitones));

export interface Section {
  /** One chord name per bar; the section is this many bars long. */
  chords: readonly string[];
  /** Melody parts: one string per bar; a missing part rests the whole section. */
  recorder?: readonly string[];
  fiddle?: readonly string[];
  psaltery?: readonly string[];
  clarinet?: readonly string[];
  /** Strumstick picks the chords; the folk harp rolls them. */
  pick?: boolean;
  harp?: boolean;
  /** The cello's root-and-fifth bed (default on). */
  drone?: boolean;
  /** One bar of kit pattern per kit part, repeated each bar. */
  frame?: string;
  slit?: string;
  darbuka?: string;
  tamb?: string;
  ocean?: string;
  /** The section's dynamic. */
  dyn: string;
}

interface Options {
  id: string;
  bpm: number;
  meter?: 3 | 4;
  sections: readonly Section[];
  /** Part gain overrides. */
  gains?: Partial<Record<string, number>>;
}

const KITS: Record<'frame' | 'slit' | 'darbuka' | 'tamb' | 'ocean', [string, KitId]> = {
  frame: ['f', 'frameDrum'],
  slit: ['S', 'slitDrum'],
  darbuka: ['d', 'darbuka'],
  tamb: ['t', 'tamb'],
  ocean: ['o', 'oceanDrum'],
};
const MELODY = ['recorder', 'fiddle', 'psaltery', 'clarinet'] as const;
const MELODY_GAIN: Record<(typeof MELODY)[number], number> = {
  recorder: 0.5,
  fiddle: 0.5,
  psaltery: 0.36,
  clarinet: 0.5,
};

/** Builds a track from sections: every part has the same bar count, and an idle part rests. */
export function folkPiece(o: Options): Piece {
  const meter = o.meter ?? 4;
  const total = o.sections.reduce((n, s) => n + s.chords.length, 0);
  const each = (make: (s: Section, n: number) => string[] | readonly string[]): string =>
    o.sections.flatMap((s) => make(s, s.chords.length)).join(' | ');
  const dynamics = (level: (s: Section) => string): string =>
    dyn(...o.sections.map((s): [string, number] => [level(s), s.chords.length]));
  const gain = (name: string, fallback: number) => o.gains?.[name] ?? fallback;

  const parts: Record<string, PartSpec> = {};
  for (const name of MELODY) {
    if (!o.sections.some((s) => s[name])) continue;
    parts[name] = {
      instrument: name,
      gain: gain(name, MELODY_GAIN[name]),
      ...(name === 'psaltery' ? { reverb: 0.5 } : {}),
      dyn: dynamics((s) => s.dyn),
      notes: each((s, n) => s[name] ?? rests(n, meter)),
    };
  }
  if (o.sections.some((s) => s.pick))
    parts.strumstick = {
      instrument: 'strumstick',
      gain: gain('strumstick', 0.5),
      dyn: dynamics((s) => s.dyn),
      notes: each((s, n) => (s.pick ? s.chords.map((c) => pickBar(c, meter)) : rests(n, meter))),
    };
  if (o.sections.some((s) => s.harp))
    parts.folkHarp = {
      instrument: 'folkHarp',
      arp: 'up',
      arpRate: 2,
      gain: gain('folkHarp', 0.4),
      reverb: 0.4,
      dyn: dynamics((s) => s.dyn),
      notes: each((s, n) => (s.harp ? s.chords.map((c) => harpBar(c, meter)) : rests(n, meter))),
    };
  parts.droneCellos = {
    instrument: 'cellos',
    gain: gain('droneCellos', 0.36),
    dyn: dynamics(() => 'pp'),
    notes: each((s, n) =>
      s.drone === false ? rests(n, meter) : s.chords.map((c) => bedBar(c, meter)),
    ),
  };
  for (const [name, [char, kit]] of Object.entries(KITS) as [
    keyof typeof KITS,
    [string, KitId],
  ][]) {
    if (!o.sections.some((s) => s[name])) continue;
    parts[name] = {
      instrument: 'kit',
      gain: gain(name, 0.4),
      kit: { [char]: kit },
      dyn: dynamics((s) => s.dyn),
      notes: each((s, n) => {
        const pattern = s[name];
        return pattern ? Array.from({ length: n }, () => pattern) : silent(n, meter);
      }),
    };
  }
  if (total === 0) throw new Error(`${o.id}: no sections`);
  return { id: o.id, kind: 'track', bpm: o.bpm, meter, parts };
}

/** A season on the farm: the major Rootsong in key `k` (semitones from D) over a picked strumstick (spec §A). */
export function rootsongMajorTrack(o: {
  id: string;
  bpm: number;
  k: number;
  chords: { a: string[]; b: string[]; mid: string[]; outro: string[]; tail?: string[] };
  /** Kit patterns for the first and second halves, merged into each section. */
  kit1: Partial<Pick<Section, 'frame' | 'slit' | 'darbuka' | 'tamb'>>;
  kit2: Partial<Pick<Section, 'frame' | 'slit' | 'darbuka' | 'tamb'>>;
}): Piece {
  const fiddle = move(PHRASE_MAJOR_D, o.k);
  const recorder = move(PHRASE_MAJOR_D, 12 + o.k);
  const bridge = ['B4:8 D5:8', 'C#5:16', 'D5:8 F#5:8', 'A4:16'].map((b) => shift(b, o.k));
  const { a, b, mid, outro, tail } = o.chords;
  const sections: Section[] = [
    { chords: a, recorder, pick: true, dyn: 'mp', ...o.kit1 },
    { chords: b, fiddle, pick: true, harp: true, dyn: 'mf', ...o.kit2 },
    { chords: a, recorder, fiddle, pick: true, harp: true, dyn: 'mf', ...o.kit2 },
    // Four bars of only the bed and a drum, then the fiddle comes back.
    { chords: mid.slice(0, 4), slit: 'S.......S.......', dyn: 'p' },
    { chords: mid.slice(4), fiddle: bridge, pick: true, harp: true, dyn: 'mp' },
    {
      chords: outro,
      recorder: [...recorder.slice(0, 4), ...recorder.slice(6), 'r:16', 'r:16'],
      pick: true,
      dyn: 'p',
    },
    ...(tail ? [{ chords: tail, pick: true, dyn: 'pp' } satisfies Section] : []),
  ];
  return folkPiece({ id: o.id, bpm: o.bpm, sections });
}

/**
 * A strumstick chord shape (cinematic folk §C): root at D3 or above, then fifth, octave and tenth, like an open
 * guitar shape. Every chord the pieces use stays within the recorded D3 to A5.
 */
export function voicing(chord: string): string {
  const [r, t, f] = triad(chord);
  const root = atOrAbove(r, 50);
  const notes = [root, atOrAbove(f, root + 1), root + 12, atOrAbove(t, root + 13)];
  return `(${notes.map(midiName).join(' ')})`;
}

/**
 * One bar of strummed chords. `chords` is one chord, or two split at the half bar. `pattern` lists durations in
 * 16ths: a positive number strums, a negative one rests. Strum spacing comes from the part's `strum`.
 */
export function strumBar(chords: string, pattern: readonly number[], meter: 3 | 4 = 4): string {
  const [first, second] = chords.trim().split(/\s+/);
  const half = (meter * 4) / 2;
  let at = 0;
  return pattern
    .map((d) => {
      const steps = Math.abs(d);
      const chord = second !== undefined && at >= half ? second : (first ?? '');
      at += steps;
      return d > 0 ? `${voicing(chord)}:${String(steps)}` : `r:${String(steps)}`;
    })
    .join(' ');
}

/** The root of a chord name (or of the first of two) at or above `floor`, as a note name. */
export const rootAt = (chords: string, floor: number): string =>
  midiName(atOrAbove(triad(chords.trim().split(/\s+/)[0] ?? '')[0], floor));
