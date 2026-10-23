import { tileAt } from '@hearthvale/core';
import type { StoreApi } from 'zustand/vanilla';
import type { EventBus } from '../game/eventBus';
import type { GameStore } from '../game/store';
import { onThunder } from '../render/weatherState';
import { howlerFactory } from './howler';
import { createSoundSystem, type SoundFactory } from './sound';
import { soundsFor, type SoundId, type Surface } from './soundMap';

const STEP_MS = 320;

function surfaceUnder(store: StoreApi<GameStore>): Surface {
  const g = store.getState().game;
  if (!g) return 'grass';
  if (g.player.location === 'house') return 'wood';
  if (g.calendar.season === 'winter') return 'snow';
  const t = tileAt(g.maps.farm, Math.floor(g.player.x), Math.floor(g.player.z));
  return t?.kind === 'grass' || t?.kind === 'weed' ? 'grass' : 'dirt';
}

/** Hooks the sound system to game events, settings and player movement. */
export function installAudio(
  store: StoreApi<GameStore>,
  bus: EventBus,
  factory: SoundFactory = howlerFactory,
) {
  const sys = createSoundSystem(factory);
  const unlock = () => {
    sys.unlock();
    sys.resume();
    const g = store.getState().game;
    if (g) sys.playMusic(g.calendar.season);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  const offEvents = bus.onAny((e) => {
    for (const id of soundsFor(e, { surface: surfaceUnder(store) }))
      if (!id.endsWith('Ambient')) sys.play(id as SoundId);
    if (e.type === 'cropHarvested' && store.getState().device === 'touch' && 'vibrate' in navigator)
      navigator.vibrate(15);
  });
  const offThunder = onThunder(() => {
    sys.play('thunder');
  });

  let last = { x: 0, z: 0, minute: -1, at: 0 };
  const timer = setInterval(() => {
    const s = store.getState();
    const g = s.game;
    if (!g) return;
    sys.setVolumes(s.settings.musicVolume, s.settings.sfxVolume);
    const minute = Math.floor(g.calendar.minute / 10);
    if (minute !== last.minute) {
      sys.playMusic(g.calendar.season);
      sys.setAmbient({
        weather: g.weather.today,
        minute: g.calendar.minute,
        outdoors: g.player.location === 'farm' && s.screen !== 'title',
        season: g.calendar.season,
      });
    }
    const moved = Math.hypot(g.player.x - last.x, g.player.z - last.z) > 0.25;
    const now = performance.now();
    if (moved && s.isClockRunning() && now - last.at > STEP_MS) {
      sys.footstep(surfaceUnder(store));
      last = { ...last, at: now };
    }
    last = { ...last, x: g.player.x, z: g.player.z, minute };
  }, 100);

  return () => {
    offEvents();
    offThunder();
    clearInterval(timer);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}
