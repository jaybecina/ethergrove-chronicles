import { useFrame } from '@react-three/fiber';
import { gameStore } from '../game/store';
import { paletteFor } from '../render/seasonPalette';
import { shared } from '../render/shaders/uniforms';

/** Feeds time, snow and player position to every patched material. */
export function SeasonDriver() {
  useFrame(({ clock }) => {
    const g = gameStore.getState().game;
    shared.uTime.value = clock.elapsedTime;
    if (!g) return;
    const { season, day, minute } = g.calendar;
    shared.uSnow.value =
      g.player.location === 'farm' ? paletteFor(season, day, minute).snowCover : 0;
    shared.uPlayer.value.set(g.player.x, 0, g.player.z);
  });
  return null;
}
