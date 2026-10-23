import type { GameEvent } from '@hearthvale/core';

export type Clip =
  | 'Idle'
  | 'Walking_A'
  | 'Running_A'
  | '2H_Melee_Attack_Chop'
  | '1H_Melee_Attack_Slice_Horizontal'
  | 'Use_Item'
  | 'Interact'
  | 'PickUp'
  | 'Cheer';

/** The one-shot animation an event plays on the farmer, if any. */
export function clipForEvent(e: GameEvent): Clip | null {
  switch (e.type) {
    case 'toolUsed':
      return e.tool === 'sickle'
        ? '1H_Melee_Attack_Slice_Horizontal'
        : e.tool === 'can'
          ? 'Use_Item'
          : '2H_Melee_Attack_Chop';
    case 'cropHarvested':
      return 'PickUp';
    case 'cropPlanted':
      return 'Interact';
    case 'itemEaten':
      return 'Use_Item';
    case 'milestoneReached':
      return 'Cheer';
    default:
      return null;
  }
}

/** Looping clip for the current ground speed (tiles per second). */
export function locomotionClip(speed: number, exhausted: boolean): Clip {
  if (speed < 0.3) return 'Idle';
  return exhausted || speed < 3 ? 'Walking_A' : 'Running_A';
}
