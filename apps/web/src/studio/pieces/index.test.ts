import { describe, expect, it } from 'vitest';
import type { JingleFile, TrackId } from '../../audio/music';
import type { SoundId } from '../../audio/soundMap';
import { noteMidi } from '../notes';
import { KIT_MAP, SAMPLE_MAP, type InstrumentId } from '../samples';
import { compilePiece, DYN_GAIN, validatePiece, type Piece } from '../score';
import { validateLofi } from '../lofi';
import { findMotif, GRANDPA, HEARTH, ROOTSONG_MAJOR, ROOTSONG_MINOR } from '../motifs';
import { JINGLE_PIECES, SFX_RECIPES, TRACK_PIECES } from './index';

const TRACKS: Record<TrackId, { bars: number; bpm: number; meter: 3 | 4; seconds: number }> = {
  title: { bars: 24, bpm: 70, meter: 4, seconds: 82 },
  spring: { bars: 32, bpm: 96, meter: 4, seconds: 80 },
  summer: { bars: 32, bpm: 108, meter: 4, seconds: 71 },
  fall: { bars: 32, bpm: 88, meter: 3, seconds: 65 },
  winter: { bars: 20, bpm: 66, meter: 4, seconds: 73 },
  night: { bars: 16, bpm: 62, meter: 4, seconds: 62 },
  home: { bars: 16, bpm: 74, meter: 4, seconds: 52 },
  shop: { bars: 32, bpm: 116, meter: 4, seconds: 66 },
  rain: { bars: 16, bpm: 72, meter: 4, seconds: 53 },
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

  it('makes home, night and rain lo-fi, within the lo-fi rules (audio spec §3.3, §4.2)', () => {
    expect(TRACK_PIECES.home.lofi).toEqual({
      wowHz: 0.5,
      wowMs: 1.2,
      drive: 1.4,
      lowpassHz: 6500,
      hissDb: -44,
    });
    expect(TRACK_PIECES.night.lofi).toEqual({
      wowHz: 0.4,
      wowMs: 1.5,
      drive: 1.2,
      lowpassHz: 6000,
      hissDb: -46,
    });
    expect(TRACK_PIECES.rain.lofi).toEqual({
      wowHz: 0.6,
      wowMs: 1,
      drive: 1.6,
      lowpassHz: 7000,
      hissDb: -42,
    });
    expect([TRACK_PIECES.home.swing, TRACK_PIECES.rain.swing]).toEqual([0.1, 0.08]);
    for (const p of [TRACK_PIECES.home, TRACK_PIECES.night, TRACK_PIECES.rain])
      expect(() => {
        validateLofi(p);
      }, p.id).not.toThrow();
    const night = compilePiece(TRACK_PIECES.night);
    expect(night.hits.filter((h) => h.step < 8 * night.barSteps)).toEqual([]);
    for (const p of ALL.filter((x) => !x.lofi)) expect(p.lofi, p.id).toBeUndefined();
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
});
