import { rootsongMajorTrack } from './folk';

/**
 * Summer: A major, 104 bpm, 44 bars (101 s). Brighter and busier than spring: a darbuka and a tambourine
 * keep the pulse under the same picked strumstick and the Rootsong.
 */
export const summer = rootsongMajorTrack({
  id: 'summer',
  bpm: 104,
  k: 7,
  chords: {
    a: ['A', 'A', 'D', 'E', 'A', 'A', 'D', 'E'],
    b: ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'E', 'A'],
    mid: ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'E', 'A'],
    outro: ['A', 'D', 'A', 'E', 'A', 'D', 'E', 'A'],
    tail: ['A', 'D', 'E', 'A'],
  },
  kit1: { darbuka: 'd.......d...d...' },
  kit2: { darbuka: 'd...d.d.d...d.d.', tamb: 't.t.t.t.t.t.t.t.' },
});
