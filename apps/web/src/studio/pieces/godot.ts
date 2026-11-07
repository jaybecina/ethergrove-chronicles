import type { Piece } from '../score';
import { matron, mossdeepFight } from './combat';
import { lowmere, lowmereNight } from './lowmere';
import { mossdeep } from './mossdeep';
import { woods } from './woods';
import { woodsFight } from './woodsFight';
import { woodsNight } from './woodsNight';

/**
 * Tracks only the Godot game plays (soundtrack spec REQ-11). The web game never ships them, so they are not
 * `TrackId`s and have no manifest entry: scripts/studio.mjs renders them to the Godot audio folder.
 */
export type GodotTrackId =
  | 'lowmere'
  | 'lowmereNight'
  | 'woods'
  | 'woodsNight'
  | 'woodsFight'
  | 'mossdeep'
  | 'mossdeepFight'
  | 'matron';

export const GODOT_TRACK_PIECES: Record<GodotTrackId, Piece> = {
  lowmere,
  lowmereNight,
  woods,
  woodsNight,
  woodsFight,
  mossdeep,
  mossdeepFight,
  matron,
};
