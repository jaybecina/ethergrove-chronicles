import { describe, expect, it } from 'vitest';
import type { JingleFile, TrackId } from '../../audio/music';
import type { SoundId } from '../../audio/soundMap';
import { noteMidi } from '../notes';
import { KIT_MAP, SAMPLE_MAP, type InstrumentId } from '../samples';
import { compilePiece, DYN_GAIN, validatePiece, type Piece } from '../score';
import { findMotif, GRANDPA, HEARTH, ROOTSONG_MAJOR, ROOTSONG_MINOR } from '../motifs';
import { JINGLE_PIECES, SFX_RECIPES, TRACK_PIECES } from './index';

const TRACKS: Record<TrackId, { bars: number; bpm: number; meter: 3 | 4; seconds: number }> = {
  title: { bars: 28, bpm: 72, meter: 4, seconds: 93.3 },
  spring: { bars: 40, bpm: 96, meter: 4, seconds: 100 },
  summer: { bars: 44, bpm: 104, meter: 4, seconds: 101.5 },
  fall: { bars: 48, bpm: 88, meter: 3, seconds: 98 },
  winter: { bars: 32, bpm: 66, meter: 4, seconds: 116 },
  night: { bars: 20, bpm: 58, meter: 4, seconds: 83 },
  home: { bars: 28, bpm: 72, meter: 4, seconds: 93 },
  shop: { bars: 40, bpm: 112, meter: 4, seconds: 86 },
  rain: { bars: 24, bpm: 64, meter: 4, seconds: 90 },
};
const JINGLES: JingleFile[] = [
  'morning',
  'lessonsComplete',
  'faint',
  'season-spring',
  'season-summer',
  'season-fall',
  'season-winter',
];
const SFX_LEVELS: Record<SoundId, number> = {
  hoe: 0.7,
  water: 0.6,
  sickle: 0.55,
  chop: 0.75,
  break: 0.7,
  swing: 0.35,
  harvest: 0.7,
  plant: 0.55,
  refill: 0.6,
  eat: 0.55,
  coin: 0.6,
  door: 0.6,
  chime: 0.7,
  deny: 0.5,
  thunder: 0.8,
  'step-grass': 0.18,
  'step-dirt': 0.2,
  'step-wood': 0.2,
  'step-snow': 0.2,
  menuMove: 0.25,
  menuConfirm: 0.4,
  menuBack: 0.35,
};
/** Spec §6.1 ranges (trumpet to D6, see the ledger ruling). */
const RANGE: Partial<Record<InstrumentId, [string, string]>> = {
  violins: ['G3', 'E6'],
  violinsPizz: ['G3', 'E6'],
  violinsTrem: ['G3', 'E6'],
  violas: ['C3', 'A5'],
  cellos: ['C2', 'E5'],
  cellosPizz: ['C2', 'E5'],
  basses: ['E1', 'G3'],
  horn: ['B2', 'F5'],
  trumpet: ['F#3', 'D6'],
  flute: ['C4', 'C7'],
  oboe: ['B3', 'F6'],
  clarinet: ['E3', 'C6'],
  clarinetStac: ['E3', 'C6'],
  bassoon: ['Bb1', 'D5'],
  harp: ['C2', 'G6'],
  piano: ['A1', 'C7'],
  uprightNr1: ['A1', 'C7'],
  glock: ['G5', 'C8'],
};
const BRASS = new Set<string>(['horn', 'trumpet', 'trombone', 'tuba']);
const ALL: Piece[] = [...Object.values(TRACK_PIECES), ...Object.values(JINGLE_PIECES)];

describe('the soundtrack', () => {
  it('every piece is a valid score, and nothing is missing', () => {
    for (const p of ALL)
      expect(() => {
        validatePiece(p);
      }, p.id).not.toThrow();
    expect(Object.keys(TRACK_PIECES).sort()).toEqual(Object.keys(TRACKS).sort());
    expect(Object.keys(JINGLE_PIECES).sort()).toEqual([...JINGLES].sort());
  });

  it.each(Object.keys(TRACKS) as TrackId[])('%s matches the spec table', (id) => {
    const want = TRACKS[id];
    const c = compilePiece(TRACK_PIECES[id]);
    expect(c.kind).toBe('track');
    expect([c.totalBars, c.bpm, c.meter]).toEqual([want.bars, want.bpm, want.meter]);
    expect(Math.abs(c.seconds - want.seconds)).toBeLessThanOrEqual(1);
  });

  it('plays the Rootsong in the title, every season, night, rain and every season fanfare (audio spec §7)', () => {
    const rootsong = (p: Piece) => findMotif(p, ROOTSONG_MAJOR) || findMotif(p, ROOTSONG_MINOR);
    for (const p of [
      TRACK_PIECES.title,
      TRACK_PIECES.spring,
      TRACK_PIECES.summer,
      TRACK_PIECES.fall,
      TRACK_PIECES.winter,
      TRACK_PIECES.night,
      TRACK_PIECES.rain,
      ...JINGLES.filter((j) => j.startsWith('season-')).map((j) => JINGLE_PIECES[j]),
    ])
      expect(rootsong(p), p.id).toBe(true);
    expect(
      findMotif(TRACK_PIECES.title, ROOTSONG_MAJOR) &&
        findMotif(TRACK_PIECES.title, ROOTSONG_MINOR),
    ).toBe(true);
    for (const p of [TRACK_PIECES.fall, TRACK_PIECES.rain, JINGLE_PIECES['season-fall']])
      expect(findMotif(p, ROOTSONG_MINOR), p.id).toBe(true);
  });

  it("plays Grandpa's theme at home", () => {
    expect(findMotif(TRACK_PIECES.home, GRANDPA)).toBe(true);
  });

  it('never plays the retired Hearth motif in any track or jingle (SFX recipes hold no melodies)', () => {
    for (const p of ALL) expect(findMotif(p, HEARTH), p.id).toBe(false);
  });

  it('never holds a sustained note longer than its recording', () => {
    for (const p of ALL) {
      const c = compilePiece(p);
      for (const t of c.tones) {
        const def = SAMPLE_MAP[t.instrument as InstrumentId] as
          (typeof SAMPLE_MAP)[InstrumentId] | undefined;
        if (!def?.sustained) continue;
        expect(t.steps * c.stepSec, `${p.id} ${t.part} step ${t.step}`).toBeLessThanOrEqual(
          def.maxSustainSec,
        );
      }
    }
  });

  it('keeps every instrument in its range', () => {
    for (const p of ALL)
      for (const t of compilePiece(p).tones) {
        const r = RANGE[t.instrument as InstrumentId];
        if (!r) continue;
        const where = `${p.id} ${t.part} step ${t.step} midi ${t.midi}`;
        expect(t.midi, where).toBeGreaterThanOrEqual(noteMidi(r[0]));
        expect(t.midi, where).toBeLessThanOrEqual(noteMidi(r[1]));
      }
  });

  it('brings in brass only at mf or louder', () => {
    for (const p of ALL)
      for (const t of compilePiece(p).tones)
        if (BRASS.has(t.instrument))
          expect(DYN_GAIN[t.dyn], `${p.id} ${t.part} step ${t.step}`).toBeGreaterThanOrEqual(
            DYN_GAIN.mf,
          );
  });
});

describe('sound effects', () => {
  it('cover every sound at the spec level', () => {
    expect(Object.keys(SFX_RECIPES).sort()).toEqual(Object.keys(SFX_LEVELS).sort());
    for (const [id, level] of Object.entries(SFX_LEVELS))
      expect(SFX_RECIPES[id as SoundId].level, id).toBe(level);
  });

  it('use only files confirmed in the library, and stay short', () => {
    const known = new Set([
      ...Object.values(KIT_MAP).flat(),
      'Miscellania Raw/Misc 1/brick_scrape.wav',
      'Miscellania Raw/Misc 1/bubbles.wav',
      'Miscellania Raw/Misc 1/bubbles2.wav',
      'Miscellania Raw/Misc 1/metal_hit3.wav',
      'VSCO 1 Percussion/drums/bass/bdrum_mp_1.wav',
      'VSCO 1 Percussion/drums/bass/bdrum_muted_pp_1.wav',
      'VSCO 1 Percussion/drums/bass/bdrum_muted_mp_1.wav',
      'VSCO 1 Percussion/drums/bass/bdrum_muted_ppp_1.wav',
      'VSCO 1 Percussion/drums/bass/bdrum_muted_ppp_2.wav',
      'VSCO 1 Percussion/drums/bass/bdrum_roll1.wav',
      'VSCO 1 Percussion/varMetal/various/cabasa_1.wav',
      'VSCO 1 Percussion/varMetal/various/cabasa_2.wav',
      'VSCO 1 Percussion/varMetal/various/cabasa_3.wav',
      'VSCO 1 Percussion/varWood/claves_mp.wav',
      'VSCO 1 Percussion/varWood/claves_pp1.wav',
      'VSCO 1 Percussion/varWood/maraca1.wav',
      'Miscellania Raw/Misc 2/tamb3_1.wav',
    ]);
    for (const [id, r] of Object.entries(SFX_RECIPES))
      for (const layer of r.layers) {
        if ('file' in layer.source)
          expect(known.has(layer.source.file), `${id} ${layer.source.file}`).toBe(true);
        expect(layer.at + (layer.dur ?? 0), id).toBeLessThanOrEqual(2500);
      }
  });

  it('strum the menu and coin sounds like a bard, with no marimba (cinematic folk REQ-31)', () => {
    const notes = (id: SoundId) =>
      SFX_RECIPES[id].layers.flatMap((l) =>
        'instrument' in l.source ? [[l.source.instrument, l.source.note, l.at]] : [],
      );
    const kits = (id: SoundId) =>
      SFX_RECIPES[id].layers.flatMap((l) => ('kit' in l.source ? [[l.source.kit, l.gainDb]] : []));
    expect(notes('menuConfirm')).toEqual([
      ['strumstick', 'E3', 0],
      ['strumstick', 'B3', 25],
      ['strumstick', 'E4', 50],
    ]);
    expect(kits('menuConfirm').map((k) => k[0])).toEqual(['frameDrum']);
    expect(notes('menuBack')).toEqual([
      ['strumstick', 'E4', 0],
      ['strumstick', 'B3', 25],
      ['strumstick', 'E3', 50],
    ]);
    expect(SFX_RECIPES.menuBack.layers.every((l) => l.gainDb === -3)).toBe(true);
    expect(notes('coin')).toEqual([
      ['strumstick', 'B4', 0],
      ['strumstick', 'E5', 40],
    ]);
    expect(kits('coin')).toEqual([['tamb', -12]]);
  });

  it('keep the eight chime-like effects free of bells and long harp rolls (soundtrack spec REQ-13)', () => {
    const CHIMES: SoundId[] = [
      'water',
      'harvest',
      'eat',
      'coin',
      'chime',
      'menuMove',
      'menuConfirm',
      'menuBack',
    ];
    for (const id of CHIMES)
      for (const layer of SFX_RECIPES[id].layers) {
        const where = `${id} at ${String(layer.at)}`;
        if ('instrument' in layer.source) {
          expect(['glock', 'harp'], where).not.toContain(layer.source.instrument);
          if (['strumstick', 'folkHarp'].includes(layer.source.instrument))
            expect(layer.dur ?? 0, where).toBeLessThanOrEqual(300);
        }
        if ('kit' in layer.source)
          expect(['bellTree', 'glockGliss', 'triangle'], where).not.toContain(layer.source.kit);
      }
  });
});
