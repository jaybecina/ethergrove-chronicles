import { rootsongMajorTrack } from './folk';

/**
 * Spring on the farm: D major, 96 bpm, 40 bars (100 s). The recorder, then the fiddle, sing the Rootsong over a
 * picked strumstick and a light frame drum; four bars hold only the cello and a slit drum.
 */
export const spring = rootsongMajorTrack({
  id: 'spring',
  bpm: 96,
  k: 0,
  chords: {
    a: ['D', 'D', 'G', 'A', 'D', 'D', 'G', 'A'],
    b: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D'],
    mid: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D'],
    outro: ['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D'],
  },
  kit1: { frame: 'f.......f.......' },
  kit2: { frame: 'f...f.f.f...f...' },
});
