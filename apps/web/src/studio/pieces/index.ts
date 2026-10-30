import type { TrackId } from '../../audio/music';
import type { Piece } from '../score';
import { fall } from './fall';
import { home } from './home';
import { night } from './night';
import { rain } from './rain';
import { shop } from './shop';
import { spring } from './spring';
import { summer } from './summer';
import { title } from './title';
import { winter } from './winter';

export { JINGLE_PIECES } from './jingles';
export { SFX_RECIPES } from './sfx';

/** The farm soundtrack (audio spec §4): every piece is original to Ethergrove. */
export const TRACK_PIECES: Record<TrackId, Piece> = {
  title,
  spring,
  summer,
  fall,
  winter,
  night,
  home,
  shop,
  rain,
};
