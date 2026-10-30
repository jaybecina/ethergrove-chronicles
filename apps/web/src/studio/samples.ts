import { noteMidi } from './notes';
import type { Dyn } from './score';

export type InstrumentId =
  | 'violins'
  | 'violinsPizz'
  | 'violinsTrem'
  | 'violas'
  | 'cellos'
  | 'cellosPizz'
  | 'basses'
  | 'harp'
  | 'horn'
  | 'trumpet'
  | 'trombone'
  | 'tuba'
  | 'flute'
  | 'oboe'
  | 'clarinet'
  | 'clarinetStac'
  | 'bassoon'
  | 'piano'
  | 'uprightNr1'
  | 'glock'
  | 'marimba';
export type KitId =
  | 'timpHit'
  | 'timpRoll'
  | 'bassDrum'
  | 'cymbalSwell'
  | 'cymbalHit'
  | 'triangle'
  | 'sleigh'
  | 'tamb'
  | 'shaker'
  | 'claves'
  | 'logDrum'
  | 'bellTree'
  | 'glockGliss'
  | 'gong'
  | 'softKick'
  | 'snareTap'
  | 'shakerSoft';

/**
 * Where each instrument's samples live in VSCO 2 CE (spec §3.1). Patterns use named groups: `note`, `layer`, `rr`
 * (and `idx` for the piano, keyed through its mapping chart).
 */
export interface InstrumentDef {
  dir: string;
  pattern: RegExp;
  sustained: boolean;
  /** Longest note a score may hold before the recording runs out. */
  maxSustainSec: number;
  /** Semitones from the file name's note to the pitch that sounds. */
  nameOffset: number;
}

/**
 * VSCO names notes with middle C as "C3", so most files sound an octave above their name (measured: the "G4"
 * violins play 787 Hz, G5). The harp is named in standard pitch. The piano is keyed by MIDI number.
 */
const VSCO_OCTAVE = 12;
const def = (
  dir: string,
  pattern: RegExp,
  maxSustainSec = 0,
  nameOffset = VSCO_OCTAVE,
): InstrumentDef => ({
  dir,
  pattern,
  sustained: maxSustainSec > 0,
  maxSustainSec,
  nameOffset,
});
const N = '(?<note>[A-G]#?\\d)';
const re = (s: string) => new RegExp(`^${s}\\.wav$`);

export const SAMPLE_MAP: Record<InstrumentId, InstrumentDef> = {
  violins: def('Strings/Violin Section/susVib', re(`VlnEns_susVib_${N}_v(?<layer>\\d)`), 12),
  violinsPizz: def(
    'Strings/Violin Section/Pizz',
    re(`VlnEns_Pizz_${N}_v(?<layer>\\d)_rr(?<rr>\\d)`),
  ),
  violinsTrem: def('Strings/Violin Section/Trem', re(`VlnEns_Trem_${N}_v(?<layer>\\d)`), 8),
  violas: def('Strings/Viola Section/susvib', re(`ViolaEns_susvib_${N}_v(?<layer>\\d)_1`), 8),
  cellos: def('Strings/Cello Section/susvib', re(`susvib_${N}_v(?<layer>\\d)_1`), 6),
  cellosPizz: def('Strings/Cello Section/pizzT', re(`pizzT_${N}_v(?<layer>\\d)_RR(?<rr>\\d)`)),
  basses: def(
    'Strings/Solo Contrabass/SusVib',
    re(`BKCtbss_SusVib_${N}_v(?<layer>\\d)_rr(?<rr>\\d)`),
    6,
  ),
  harp: def('Strings/Harp', re(`KSHarp_${N}_(?<layer>mf|f)`), 0, 0),
  horn: def('Brass/F Horn/sus', re(`MOHorn_sus_${N}_v(?<layer>\\d)_1`), 12),
  trumpet: def('Brass/Trumpet/sus', re(`Sum_SHTrumpet_sus_${N}_v(?<layer>\\d)_rr(?<rr>\\d)`), 6),
  trombone: def('Brass/Tenor Trombone/sus', re(`tenortbn_sus_${N}_v(?<layer>\\d)_1`), 6),
  tuba: def('Brass/Tuba/sus', re(`Tuba3_sus_${N}_v(?<layer>\\d)_rr(?<rr>\\d)_Mid`), 6),
  flute: def('Woodwinds/Flute/susvib', re(`LDFlute_susvib_${N}_v(?<layer>\\d)_1`), 7),
  oboe: def('Woodwinds/Oboe/Sus', re(`Oboe_Sus_${N}_v(?<layer>\\d)_Main`), 6),
  clarinet: def(
    'Woodwinds/Clarinet/susLong',
    re(`DCClar_susLong_${N}_v(?<layer>\\d)_rr(?<rr>\\d)_sum`),
    8,
  ),
  clarinetStac: def(
    'Woodwinds/Clarinet/stac',
    re(`DCClar_stac_${N}_v(?<layer>\\d)_rr(?<rr>\\d)_sum`),
  ),
  bassoon: def('Woodwinds/Bassoon/sus', re(`PSBassoon_${N}_v(?<layer>\\d)_1`), 6),
  piano: def('Keys/Upright Piano', re('Player_dyn(?<layer>\\d)_rr1_(?<idx>\\d{3})'), 0, 0),
  // Named in standard pitch (measured: UR1_C4 sounds 262.5 Hz). Only C and G are sampled in each octave.
  uprightNr1: def('Keys/Upright Nr1', re(`UR1_${N}_(?<layer>pp|mf|f)_RR(?<rr>\\d)`), 0, 0),
  glock: def('Percussion/Glock', re(`glock_medium_${N}`)),
  marimba: def('Percussion/Marimba', re(`Marimba_hit_Outrigger_${N}_loud_01`)),
};

const P = 'VSCO 1 Percussion';
const M = 'Miscellania Raw';
/** Unpitched sounds, as VSCO-relative files; several files alternate as round robins. */
export const KIT_MAP: Record<KitId, readonly string[]> = {
  timpHit: [
    'Percussion/Timpani/Timpani2_Hit_v3_rr1_Sum.wav',
    'Percussion/Timpani/Timpani2_Hit_v3_rr2_Sum.wav',
  ],
  timpRoll: ['Percussion/Timpani/Rolls/Timpani2_Roll_v3_rr1_Sum.wav'],
  bassDrum: [`${P}/drums/bass/bdrum_mp_1.wav`, `${P}/drums/bass/bdrum_mp_2.wav`],
  cymbalSwell: [`${P}/varMetal/Cymbals/susp/susp_hit_softmall_roll2_cresc.wav`],
  cymbalHit: [`${P}/varMetal/Cymbals/susp/susp_hit_hardmall_mf.wav`],
  triangle: [`${P}/varMetal/triangle/1/triangle1_hit_mp.wav`],
  sleigh: [1, 2, 3].map((n) => `${M}/Misc 2/sleighbell1_hit_${n}.wav`),
  tamb: [1, 2, 3, 4].map((n) => `${M}/Misc 2/tamb3_${n}.wav`),
  shaker: [1, 2, 3].map((n) => `${P}/varMetal/various/cabasa_${n}.wav`),
  claves: [`${P}/varWood/claves_mp.wav`],
  logDrum: [`${P}/varWood/log_drum/slitdrum0_ff_1.wav`],
  bellTree: [`${P}/varMetal/various/bell_tree_scrape1.wav`],
  glockGliss: [`${M}/Misc 2/glock_glisses/glock_fx_up_chromatic_med_01.wav`],
  gong: [`${P}/varMetal/Gong/gong_hit_p.wav`],
  // The soft lo-fi kit (audio spec §3.2): the two softest bass-drum layers, snare taps and a tambourine shake.
  softKick: [1, 2].flatMap((v) =>
    [1, 2].map((rr) => `Percussion/BDrumNewhit_v${v}_rr${rr}_Sum.wav`),
  ),
  snareTap: [1, 2, 3, 4].flatMap((v) =>
    [1, 2].map((rr) => `Percussion/Snare2-taps_v${v}_rr${rr}_Sum.wav`),
  ),
  shakerSoft: [1, 2].map((rr) => `Percussion/Tamb1-Shake_v1_rr${rr}_Sum.wav`),
};

/** Kit sounds played through a lowpass, in Hz (audio spec §3.2). */
export const KIT_LOWPASS: Partial<Record<KitId, number>> = { softKick: 2000 };

/** The first note name in a sample's file name, as MIDI. */
export function parseRoot(fileName: string): number | null {
  const m = /(?:^|_)([A-G]#?\d)(?=_|\.)/.exec(fileName);
  return m?.[1] ? noteMidi(m[1]) : null;
}

/** The upright piano's files are numbered; its mapping chart gives each number's key. */
export function pianoKey(fileName: string, chart: Record<string, number>): number | null {
  const m = /_(\d{3})\.wav$/.exec(fileName);
  return m?.[1] !== undefined ? (chart[m[1]] ?? null) : null;
}

export interface SampleRef {
  path: string;
  root: number;
  layer: number;
  rr: number;
}
export interface SampleIndex {
  instruments: Record<InstrumentId, SampleRef[]>;
  kit: Record<KitId, string[]>;
}

const LAYER_WORDS: Record<string, number> = { pp: 0, mf: 1, f: 2 };

/** Sorts a list of VSCO-relative paths into instruments and kit sounds. */
export function buildIndex(
  paths: readonly string[],
  pianoChart: Record<string, number>,
): SampleIndex {
  const ids = Object.keys(SAMPLE_MAP) as InstrumentId[];
  const instruments = Object.fromEntries(ids.map((id) => [id, [] as SampleRef[]])) as Record<
    InstrumentId,
    SampleRef[]
  >;
  const all = new Set(paths);
  for (const path of paths) {
    const slash = path.lastIndexOf('/');
    const dir = path.slice(0, slash);
    const name = path.slice(slash + 1);
    for (const id of ids) {
      const d = SAMPLE_MAP[id];
      if (d.dir !== dir) continue;
      const g = d.pattern.exec(name)?.groups;
      if (!g) continue;
      const root =
        g.idx !== undefined
          ? pianoKey(name, pianoChart)
          : g.note
            ? noteMidi(g.note) + d.nameOffset
            : null;
      if (root === null) continue;
      const layer = LAYER_WORDS[g.layer ?? ''] ?? Number(g.layer ?? 1);
      instruments[id].push({ path, root, layer, rr: Number(g.rr ?? 1) });
    }
  }
  for (const list of Object.values(instruments))
    list.sort((a, b) => a.root - b.root || a.layer - b.layer || a.rr - b.rr);
  const kit = Object.fromEntries(
    (Object.keys(KIT_MAP) as KitId[]).map((k) => [k, KIT_MAP[k].filter((p) => all.has(p))]),
  ) as Record<KitId, string[]>;
  return { instruments, kit };
}

const MAX_SHIFT = 7;

/** The sample to play for a note: nearest root (at or below first), the dynamic's layer, round robin by note index. */
export function pickSample(
  index: SampleIndex,
  id: InstrumentId,
  midi: number,
  dyn: Dyn,
  noteIndex: number,
): { ref: SampleRef; rate: number } | null {
  const refs = index.instruments[id];
  const roots = [...new Set(refs.map((r) => r.root))];
  const below = roots.filter((r) => r <= midi && midi - r <= MAX_SHIFT).at(-1);
  const above = roots.find((r) => r > midi && r - midi <= MAX_SHIFT);
  const root = below ?? above;
  if (root === undefined) return null;
  const atRoot = refs.filter((r) => r.root === root);
  const layers = [...new Set(atRoot.map((r) => r.layer))].sort((a, b) => a - b);
  const n = layers.length;
  const slot =
    dyn === 'pp' || dyn === 'p' ? 0 : dyn === 'mp' || dyn === 'mf' ? Math.ceil(n / 2) - 1 : n - 1;
  const layer = layers[slot] ?? layers[0];
  const choices = atRoot.filter((r) => r.layer === layer);
  const ref = choices[noteIndex % choices.length];
  return ref ? { ref, rate: 2 ** ((midi - root) / 12) } : null;
}
