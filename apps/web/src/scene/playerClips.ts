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

/** Walk and run speeds (tiles/s) the clips were tuned for; match core BALANCE. */
const WALK_SPEED = 2.6;
const RUN_SPEED = 4.6;

/** Looping clip for the current ground speed (tiles per second). */
export function locomotionClip(speed: number, exhausted: boolean): Clip {
  if (speed < 0.3) return 'Idle';
  return exhausted || speed < (WALK_SPEED + RUN_SPEED) / 2 ? 'Walking_A' : 'Running_A';
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Playback rate so the feet keep pace with the ground (no skating, no sprinting on the spot). */
export function clipRate(clip: Clip, speed: number): number {
  if (clip === 'Walking_A') return clamp(speed / WALK_SPEED, 0.5, 1.4);
  if (clip === 'Running_A') return clamp(speed / RUN_SPEED, 0.7, 1.3);
  return 1;
}
