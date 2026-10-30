import { describe, expect, it } from 'vitest';
import {
  buildIndex,
  KIT_LOWPASS,
  KIT_MAP,
  parseRoot,
  pianoKey,
  pickSample,
  SAMPLE_MAP,
  type KitId,
} from './samples';

const V = 'Strings/Violin Section/susVib/';
const PATHS = [
  `${V}VlnEns_susVib_G4_v1.wav`,
  `${V}VlnEns_susVib_G4_v2.wav`,
  `${V}VlnEns_susVib_B4_v1.wav`,
  `${V}VlnEns_susVib_B4_v2.wav`,
  'Strings/Violin Section/Pizz/VlnEns_Pizz_D4_v1_rr1.wav',
  'Strings/Violin Section/Pizz/VlnEns_Pizz_D4_v1_rr2.wav',
  'Strings/Harp/KSHarp_A4_mf.wav',
  'Strings/Harp/KSHarp_A4_f.wav',
  'Keys/Upright Piano/Player_dyn1_rr1_024.wav',
  'Keys/Upright Piano/Player_dyn2_rr1_024.wav',
  'Brass/Tuba/sus/Tuba3_sus_A#0_v1_rr1_Mid.wav',
  'Strings/Violin Section/susVib/notes.txt',
  'Keys/Upright Nr1/UR1_C4_pp_RR1.wav',
  'Keys/Upright Nr1/UR1_C4_mf_RR2.wav',
  'Keys/Upright Nr1/UR1_C4_f_RR1.wav',
  'Keys/Upright Nr1/UR1_G4_mf_RR1.wav',
  'Keys/Upright Nr1/Notes.txt',
  ...Object.values(KIT_MAP).flat(),
];

describe('sample names', () => {
  it('reads the root note from a file name', () => {
    expect(parseRoot('VlnEns_susVib_G4_v1.wav')).toBe(67);
    expect(parseRoot('Tuba3_sus_A#0_v2_rr1_Mid.wav')).toBe(22);
    expect(parseRoot('x.wav')).toBeNull();
  });

  it('reads piano keys from the mapping chart', () => {
    expect(pianoKey('Player_dyn1_rr1_024.wav', { '024': 69 })).toBe(69);
    expect(pianoKey('Player_dyn1_rr1_999.wav', { '024': 69 })).toBeNull();
  });
});

describe('buildIndex and pickSample', () => {
  const index = buildIndex(PATHS, { '024': 69 });

  it('groups files by instrument with root, layer and round robin', () => {
    expect(index.instruments.violins).toHaveLength(4);
    expect(index.instruments.violinsPizz.map((r) => r.rr)).toEqual([1, 2]);
    expect(index.instruments.harp.map((r) => r.layer).sort()).toEqual([1, 2]);
    expect(index.instruments.piano.map((r) => [r.root, r.layer])).toEqual([
      [69, 1],
      [69, 2],
    ]);
    expect(index.instruments.cellos).toEqual([]);
  });

  it('corrects VSCO names, which call middle C "C3", except the harp', () => {
    // Measured: VlnEns_susVib_G4 sounds G5 (787 Hz); KSHarp_A4 sounds A4 (437 Hz).
    expect(index.instruments.violins[0]?.root).toBe(79);
    expect(index.instruments.harp[0]?.root).toBe(69);
    expect(index.instruments.tuba[0]?.root).toBe(34);
    expect(index.instruments.piano[0]?.root).toBe(69);
  });

  it('picks the nearest root at or below, in the layer for the dynamic', () => {
    const pick = pickSample(index, 'violins', 81, 'f', 0);
    expect(pick?.ref.path).toBe(`${V}VlnEns_susVib_G4_v2.wav`);
    expect(pick?.rate).toBeCloseTo(2 ** (2 / 12));
    expect(pickSample(index, 'violins', 81, 'p', 0)?.ref.layer).toBe(1);
    expect(pickSample(index, 'violins', 83, 'mf', 0)?.ref.root).toBe(83);
    expect(pickSample(index, 'violins', 77, 'mf', 0)?.ref.root).toBe(79);
  });

  it('gives up beyond seven semitones', () => {
    expect(pickSample(index, 'violins', 62, 'mf', 0)).toBeNull();
    expect(pickSample(index, 'cellos', 50, 'mf', 0)).toBeNull();
  });

  it('alternates round robins by note index', () => {
    const rr = [0, 1, 2].map((i) => pickSample(index, 'violinsPizz', 74, 'mf', i)?.ref.rr);
    expect(rr).toEqual([1, 2, 1]);
  });

  it('finds every kit sound', () => {
    for (const id of Object.keys(KIT_MAP) as KitId[])
      expect(index.kit[id].length, id).toBeGreaterThan(0);
  });

  it('reads the second upright in standard pitch, with pp, mf and f layers', () => {
    // Measured: UR1_C4 sounds 262.5 Hz, middle C (audio spec §3.2).
    expect(index.instruments.uprightNr1.map((r) => r.root)).toEqual([60, 60, 60, 67]);
    expect(pickSample(index, 'uprightNr1', 62, 'p', 0)?.ref.path).toBe(
      'Keys/Upright Nr1/UR1_C4_pp_RR1.wav',
    );
    expect(pickSample(index, 'uprightNr1', 62, 'mf', 0)?.ref.path).toBe(
      'Keys/Upright Nr1/UR1_C4_mf_RR2.wav',
    );
    expect(pickSample(index, 'uprightNr1', 62, 'f', 0)?.ref.path).toBe(
      'Keys/Upright Nr1/UR1_C4_f_RR1.wav',
    );
    expect(pickSample(index, 'uprightNr1', 69, 'mf', 0)?.ref.root).toBe(67);
  });

  it('maps the soft lo-fi kit to the files checked in the library (audio spec §3.2)', () => {
    const p = 'Percussion/';
    expect(KIT_MAP.softKick).toEqual([
      `${p}BDrumNewhit_v1_rr1_Sum.wav`,
      `${p}BDrumNewhit_v1_rr2_Sum.wav`,
      `${p}BDrumNewhit_v2_rr1_Sum.wav`,
      `${p}BDrumNewhit_v2_rr2_Sum.wav`,
    ]);
    expect(KIT_MAP.snareTap).toHaveLength(8);
    expect(KIT_MAP.snareTap.every((f) => f.startsWith(`${p}Snare2-taps_v`))).toBe(true);
    expect(KIT_MAP.shakerSoft).toEqual([
      `${p}Tamb1-Shake_v1_rr1_Sum.wav`,
      `${p}Tamb1-Shake_v1_rr2_Sum.wav`,
    ]);
    expect(KIT_LOWPASS).toEqual({ softKick: 2000 });
  });

  it('knows how long each sustained instrument can hold a note', () => {
    expect(SAMPLE_MAP.cellos).toMatchObject({ sustained: true, maxSustainSec: 6 });
    expect(SAMPLE_MAP.harp.sustained).toBe(false);
  });
});
