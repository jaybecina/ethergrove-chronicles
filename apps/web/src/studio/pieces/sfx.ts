import type { SoundId } from '../../audio/soundMap';
import type { SfxRecipe } from '../render';

const P = 'VSCO 1 Percussion';
const M = 'Miscellania Raw';
const BD = `${P}/drums/bass`;

/** Every sound effect (spec §7): real recordings layered, softened, in a small room. Times in ms. */
export const SFX_RECIPES: Record<SoundId, SfxRecipe> = {
  hoe: {
    level: 0.7,
    layers: [
      { at: 0, source: { file: `${M}/Misc 1/brick_scrape.wav` }, dur: 180 },
      {
        at: 0,
        source: { file: `${BD}/bdrum_muted_pp_1.wav` },
        lowpass: 300,
        dur: 300,
        release: 0.08,
      },
    ],
  },
  water: {
    level: 0.6,
    layers: [
      { at: 0, source: { file: `${M}/Misc 1/bubbles.wav` }, dur: 400, release: 0.06 },
      { at: 40, source: { instrument: 'harp', note: 'E6' }, gainDb: -10, dur: 300, release: 0.2 },
    ],
  },
  sickle: {
    level: 0.55,
    layers: [
      { at: 0, source: { file: `${M}/Misc 2/tamb3_1.wav` }, highpass: 4000, dur: 150 },
      { at: 0, source: { file: `${P}/varMetal/various/cabasa_1.wav` }, dur: 150 },
    ],
  },
  chop: {
    level: 0.75,
    layers: [
      { at: 0, source: { kit: 'logDrum' }, dur: 400, release: 0.08 },
      { at: 0, source: { file: `${P}/varWood/claves_mp.wav` }, gainDb: -8, dur: 200 },
    ],
  },
  break: {
    level: 0.7,
    layers: [
      {
        at: 0,
        source: { file: `${M}/Misc 1/metal_hit3.wav` },
        lowpass: 2500,
        dur: 500,
        release: 0.1,
      },
      { at: 0, source: { file: `${BD}/bdrum_mp_1.wav` }, dur: 400, release: 0.1 },
    ],
  },
  swing: {
    level: 0.35,
    layers: [
      {
        at: 0,
        source: { file: `${P}/varMetal/various/cabasa_2.wav` },
        rate: 0.8,
        rateTo: 1.3,
        dur: 250,
      },
    ],
  },
  harvest: {
    level: 0.7,
    layers: [
      { at: 0, source: { instrument: 'marimba', note: 'C6' }, dur: 400, release: 0.2 },
      { at: 60, source: { instrument: 'glock', note: 'G6' }, dur: 500, release: 0.25 },
      { at: 0, source: { kit: 'bellTree' }, gainDb: -12, dur: 700, release: 0.2 },
    ],
  },
  plant: {
    level: 0.55,
    layers: [
      { at: 0, source: { instrument: 'marimba', note: 'G4' }, gainDb: -4, dur: 300, release: 0.15 },
      { at: 0, source: { kit: 'shaker' }, gainDb: -10, dur: 150 },
    ],
  },
  refill: {
    level: 0.6,
    layers: [{ at: 0, source: { file: `${M}/Misc 1/bubbles2.wav` }, dur: 700, release: 0.08 }],
  },
  eat: {
    level: 0.55,
    layers: [
      { at: 0, source: { file: `${P}/varWood/claves_pp1.wav` }, dur: 120 },
      { at: 120, source: { file: `${P}/varWood/claves_pp1.wav` }, rate: 1.1, dur: 120 },
      { at: 260, source: { instrument: 'harp', note: 'G5' }, dur: 300, release: 0.2 },
    ],
  },
  coin: {
    level: 0.6,
    layers: [
      { at: 0, source: { instrument: 'glock', note: 'C7' }, dur: 400, release: 0.25 },
      { at: 0, source: { kit: 'triangle' }, gainDb: -10, dur: 500, release: 0.2 },
    ],
  },
  door: {
    level: 0.6,
    layers: [
      {
        at: 0,
        source: { file: `${BD}/bdrum_muted_mp_1.wav` },
        lowpass: 600,
        dur: 300,
        release: 0.08,
      },
      { at: 20, source: { file: `${P}/varWood/claves_mp.wav` }, rate: 0.5, dur: 250 },
    ],
  },
  chime: {
    level: 0.7,
    layers: [
      { at: 0, source: { kit: 'glockGliss' }, dur: 900, release: 0.25 },
      { at: 0, source: { instrument: 'harp', note: 'E5' }, dur: 300, release: 0.3 },
      { at: 50, source: { instrument: 'harp', note: 'G#5' }, dur: 300, release: 0.3 },
      { at: 100, source: { instrument: 'harp', note: 'B5' }, dur: 300, release: 0.3 },
      { at: 150, source: { instrument: 'harp', note: 'E6' }, dur: 500, release: 0.3 },
    ],
  },
  deny: {
    level: 0.5,
    layers: [
      { at: 0, source: { instrument: 'piano', note: 'D3' }, gainDb: -4, dur: 120, release: 0.1 },
      { at: 90, source: { instrument: 'piano', note: 'C#3' }, gainDb: -4, dur: 200, release: 0.12 },
      { at: 0, source: { file: `${BD}/bdrum_muted_ppp_1.wav` }, dur: 250, release: 0.08 },
    ],
  },
  thunder: {
    level: 0.8,
    layers: [
      { at: 0, source: { kit: 'timpRoll' }, lowpass: 400, dur: 2200, release: 0.3 },
      { at: 0, source: { file: `${BD}/bdrum_roll1.wav` }, lowpass: 400, dur: 2200, release: 0.3 },
    ],
  },
  'step-grass': {
    level: 0.18,
    layers: [
      { at: 0, source: { file: `${P}/varMetal/various/cabasa_3.wav` }, highpass: 2000, dur: 60 },
    ],
  },
  'step-dirt': {
    level: 0.2,
    layers: [
      {
        at: 0,
        source: { file: `${BD}/bdrum_muted_ppp_2.wav` },
        lowpass: 900,
        dur: 150,
        release: 0.05,
      },
    ],
  },
  'step-wood': {
    level: 0.2,
    layers: [{ at: 0, source: { file: `${P}/varWood/claves_pp1.wav` }, lowpass: 1500, dur: 100 }],
  },
  'step-snow': {
    level: 0.2,
    layers: [{ at: 0, source: { file: `${P}/varWood/maraca1.wav` }, lowpass: 2000, dur: 150 }],
  },
  menuMove: {
    level: 0.25,
    layers: [
      { at: 0, source: { instrument: 'glock', note: 'C7' }, lowpass: 4000, dur: 80, release: 0.06 },
    ],
  },
  menuConfirm: {
    level: 0.4,
    layers: [
      { at: 0, source: { instrument: 'harp', note: 'E5' }, dur: 200, release: 0.15 },
      { at: 50, source: { instrument: 'harp', note: 'B5' }, dur: 300, release: 0.2 },
    ],
  },
  menuBack: {
    level: 0.35,
    layers: [
      { at: 0, source: { instrument: 'harp', note: 'B5' }, dur: 200, release: 0.15 },
      { at: 50, source: { instrument: 'harp', note: 'E5' }, dur: 300, release: 0.2 },
    ],
  },
};
