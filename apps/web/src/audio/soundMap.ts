import type { GameEvent, Season } from '@hearthvale/core';

export type Surface = 'grass' | 'dirt' | 'wood' | 'snow';
export type SoundId =
  | 'hoe'
  | 'water'
  | 'sickle'
  | 'chop'
  | 'break'
  | 'swing'
  | 'harvest'
  | 'plant'
  | 'refill'
  | 'eat'
  | 'coin'
  | 'door'
  | 'chime'
  | 'deny'
  | 'thunder'
  | `step-${Surface}`;
export type LoopId =
  'birds' | 'cicadas' | 'wind' | 'night' | 'rainAmbient' | 'thunderAmbient' | `music-${Season}`;

const TOOL_SOUND = {
  hoe: 'hoe',
  can: 'water',
  sickle: 'sickle',
  axe: 'chop',
  hammer: 'break',
} as const;

/** Which one-shot (or ambience) sounds a core event triggers. */
export function soundsFor(event: GameEvent, _ctx: { surface: Surface }): (SoundId | LoopId)[] {
  switch (event.type) {
    case 'toolUsed':
      return [event.hit ? TOOL_SOUND[event.tool] : 'swing'];
    case 'canRefilled':
      return ['refill'];
    case 'cropHarvested':
      return ['harvest'];
    case 'cropPlanted':
      return ['plant'];
    case 'itemEaten':
      return ['eat'];
    case 'goldChanged':
      return event.delta > 0 ? ['coin'] : [];
    case 'locationChanged':
      return ['door'];
    case 'milestoneReached':
    case 'lessonDone':
    case 'lessonsComplete':
      return ['chime'];
    case 'actionFailed':
      return ['deny'];
    case 'weatherChanged':
      return event.weather === 'storm'
        ? ['rainAmbient', 'thunderAmbient']
        : event.weather === 'rain'
          ? ['rainAmbient']
          : [];
    default:
      return [];
  }
}

/** Audio files (CC0, see CREDITS.md): Ogg first, AAC for browsers without Ogg. */
export const soundUrls = (id: SoundId | LoopId): string[] => [
  `/assets/audio/${id}.ogg`,
  `/assets/audio/${id}.m4a`,
];
