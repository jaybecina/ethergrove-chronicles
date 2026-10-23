import { Howl } from 'howler';
import { SOUND_FILES } from '../scene/assets';
import type { SoundFactory } from './sound';
import { soundUrls, type SoundId } from './soundMap';
import { synthPlay } from './synth';

/** Howler-backed sounds. One-shots without a (loadable) file use the synth; loops without one stay silent. */
export const howlerFactory: SoundFactory = (id, { loop }) => {
  let vol = 1;
  let failed = !(SOUND_FILES as readonly string[]).includes(id);
  const howl = failed
    ? null
    : new Howl({
        src: soundUrls(id),
        loop,
        preload: true,
        onloaderror: () => {
          failed = true;
        },
      });
  return {
    play() {
      if (failed || !howl) {
        if (!loop) synthPlay(id as SoundId, vol);
        return;
      }
      if (loop && howl.playing()) return;
      howl.play();
    },
    stop() {
      howl?.stop();
    },
    volume(v) {
      vol = v;
      howl?.volume(v);
    },
    fade(from, to, ms) {
      vol = to;
      if (!failed) howl?.fade(from, to, ms);
    },
  };
};
