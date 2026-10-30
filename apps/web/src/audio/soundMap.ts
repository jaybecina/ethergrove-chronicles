import type { GameEvent } from '@ethergrove/core';

export type Surface = 'grass' | 'dirt' | 'wood' | 'snow';
export type MenuSound = 'menuMove' | 'menuConfirm' | 'menuBack';
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
  | `step-${Surface}`
  | MenuSound;

const TOOL_SOUND = {
  hoe: 'hoe',
  can: 'water',
  sickle: 'sickle',
  axe: 'chop',
  hammer: 'break',
} as const;

/** Which one-shot sounds a core event triggers. */
export function soundsFor(event: GameEvent, _ctx: { surface: Surface }): SoundId[] {
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
    default:
      return [];
  }
}
