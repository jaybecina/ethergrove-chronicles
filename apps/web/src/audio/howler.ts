import { Howl } from 'howler';
import type { SoundFactory } from './sound';
import { soundUrl, type SoundId } from './soundMap';
import { synthPlay } from './synth';

/** Howler-backed sounds; one-shots fall back to the synth if their file can't load. */
export const howlerFactory: SoundFactory = (id, { loop }) => {
  let failed = false;
  let vol = 1;
  const howl = new Howl({
    src: [soundUrl(id)],
    loop,
    preload: true,
    onloaderror: () => {
      failed = true;
    },
  });
  return {
    play() {
      if (failed) {
        if (!loop) synthPlay(id as SoundId, vol);
        return;
      }
      if (loop && howl.playing()) return;
      howl.play();
    },
    stop() {
      howl.stop();
    },
    volume(v) {
      vol = v;
      howl.volume(v);
    },
    fade(from, to, ms) {
      vol = to;
      if (failed) return;
      howl.fade(from, to, ms);
    },
  };
};
