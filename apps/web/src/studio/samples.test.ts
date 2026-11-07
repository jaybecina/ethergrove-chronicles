import { describe, expect, it } from 'vitest';
import {
  buildIndex,
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

  it('knows how long each sustained instrument can hold a note', () => {
    expect(SAMPLE_MAP.cellos).toMatchObject({ sustained: true, maxSustainSec: 6 });
    expect(SAMPLE_MAP.harp.sustained).toBe(false);
  });
});

describe('short string articulations and big drums (cinematic folk REQ-23)', () => {
  const idx = buildIndex(
    [
      'Strings/Cello Section/spic/spic_A2_v1_RR1.wav',
      'Strings/Cello Section/spic/spic_A2_v2_RR2.wav',
      'Strings/Solo Contrabass/Pizz/BKCtbss_Pizz_A1_v3_rr1.wav',
      'Strings/Solo Violin/spic/LLVln_spic_A4_v2_rr1.wav',
      ...Object.values(KIT_MAP).flat(),
    ],
    {},
  );

  it('reads each at the pitch it was measured to sound', () => {
    // Measured 2026-11-05 by the energy at each candidate pitch: spic_A2 peaks at 220 Hz (A3), Pizz_A1 at 110 Hz
    // (A2), LLVln_spic_A4 at 880 Hz (A5), unlike the arco solo violin, which sounds as named.
    expect(idx.instruments.cellosSpic.map((r) => [r.root, r.layer, r.rr])).toEqual([
      [57, 1, 1],
      [57, 2, 2],
    ]);
    expect(idx.instruments.bassesPizz.map((r) => r.root)).toEqual([45]);
    expect(idx.instruments.fiddleSpic.map((r) => r.root)).toEqual([81]);
  });

  it('plays them as short notes that ring out', () => {
    for (const id of ['cellosSpic', 'bassesPizz', 'fiddleSpic'] as const)
      expect(SAMPLE_MAP[id].sustained, id).toBe(false);
  });

  it('finds the tenor drum and the big bass drum in VSCO', () => {
    for (const id of ['tenorDrum', 'bassDrumBig'] as const) {
      expect(idx.kit[id].length, id).toBeGreaterThan(1);
      expect(
        KIT_MAP[id].every((f) => f.startsWith('VSCO 1 Percussion/drums/')),
        id,
      ).toBe(true);
    }
  });
});

describe('folk instruments from VCSL (CC0) and the solo violin (soundtrack spec REQ-08)', () => {
  const VC = 'vcsl/';
  const STRUM = `${VC}Chordophones/Composite Chordophones/Strumstick/Finger/`;
  const HARP = `${VC}Chordophones/Composite Chordophones/Folk Harp/`;
  const PSALTERY = `${VC}Chordophones/Zithers/Psaltery, Bowed and Plucked/`;
  const RECORDER = `${VC}Aerophones/Edge-blown Aerophones/Baroque Alto Recorder/Sustain/`;
  const FIDDLE = 'Strings/Solo Violin/Arco Vib/';
  const folk = buildIndex(
    [
      `${STRUM}Strumstick_Finger_Str1_Main_D2_vl1_rr1.wav`,
      `${STRUM}Strumstick_Finger_Str1_Main_D2_vl3_rr1.wav`,
      `${STRUM}Strumstick_Finger_Str3_Main_D4_vl2_rr1.wav`,
      `${HARP}EWHarp_Normal_C3_v2_RR1.wav`,
      `${HARP}EWHarp_Normal_C3_v3_RR1.wav`,
      `${PSALTERY}LongBow/BowedPsaltery_E4_Main_LongBow_rr2.wav`,
      `${PSALTERY}Pluck/BowedPsaltery_E5_Main_Pluck_rr1.wav`,
      `${RECORDER}AltRecorder_Sus_E4_rr1_Main.wav`,
      `${RECORDER}AltRecorder_Sus_A#3_rr1_Main.wav`,
      `${FIDDLE}LLVln_ArcoVib_A3_p.wav`,
      `${FIDDLE}LLVln_ArcoVib_A3_f.wav`,
      ...Object.values(KIT_MAP).flat(),
    ],
    {},
  );

  it('reads each instrument at the pitch it was measured to sound', () => {
    // Measured by autocorrelation: Str1_D2 sounds 147 Hz (D3), C3 harp 262.5 Hz (C4), the recorder E4 658 Hz (E5),
    // the psaltery E4 658 Hz (E5): VCSL calls middle C "C3" like VSCO. The solo violin A3 sounds 220 Hz (A3).
    expect(folk.instruments.strumstick.map((r) => [r.root, r.layer])).toEqual([
      [50, 1],
      [50, 3],
      [74, 2],
    ]);
    expect(folk.instruments.folkHarp.map((r) => [r.root, r.layer])).toEqual([
      [60, 2],
      [60, 3],
    ]);
    expect(folk.instruments.recorder.map((r) => r.root)).toEqual([70, 76]);
    expect(folk.instruments.fiddle.map((r) => [r.root, r.layer])).toEqual([
      [57, 0],
      [57, 2],
    ]);
  });

  it('uses only the bowed psaltery, never its plucked or spiccato files', () => {
    expect(folk.instruments.psaltery.map((r) => r.root)).toEqual([76]);
  });

  it('plays the strumstick softly or hard by dynamic, and the fiddle p or f', () => {
    expect(pickSample(folk, 'strumstick', 51, 'p', 0)?.ref.layer).toBe(1);
    expect(pickSample(folk, 'strumstick', 51, 'f', 0)?.ref.layer).toBe(3);
    expect(pickSample(folk, 'fiddle', 58, 'p', 0)?.ref.path).toContain('A3_p');
    expect(pickSample(folk, 'fiddle', 58, 'f', 0)?.ref.path).toContain('A3_f');
  });

  it('keeps notes from running out of recording', () => {
    for (const id of ['fiddle', 'recorder', 'psaltery'] as const)
      expect(SAMPLE_MAP[id].sustained, id).toBe(true);
    for (const id of ['strumstick', 'folkHarp'] as const)
      expect(SAMPLE_MAP[id].sustained, id).toBe(false);
  });

  it('finds the new hand drums, which all come from VCSL', () => {
    for (const id of ['frameDrum', 'darbuka', 'slitDrum', 'oceanDrum'] as const) {
      expect(folk.kit[id].length, id).toBeGreaterThan(0);
      expect(
        KIT_MAP[id].every((f) => f.startsWith(VC)),
        id,
      ).toBe(true);
    }
  });
});
