// Decides whether to show the "best played on a computer" message (M1 spec §9.2, ARPG spec §13.4).
// Input type decides, not the screen size alone, so touch laptops, Chromebooks and the Steam Deck are never blocked.

/** Screens whose shorter side is under this many CSS px count as small. */
const SMALL_SIDE_PX = 900;

/**
 * @typedef {object} DetectEnv
 * @property {(query: string) => { matches: boolean }} matchMedia
 * @property {{ width: number, height: number }} screen
 * @property {{ platform: string, maxTouchPoints: number }} navigator
 */

/**
 * True on a phone or tablet. Any fine pointer or hover-capable input means a computer, so it wins.
 * @param {DetectEnv} env
 * @returns {boolean}
 */
export function detectUnsupported(env) {
  const matches = (/** @type {string} */ q) => env.matchMedia(q).matches;
  const fine = matches('(pointer: fine)');
  const canHover = matches('(hover: hover)');
  if (fine || canHover) return false;

  const smallScreen = Math.min(env.screen.width, env.screen.height) < SMALL_SIDE_PX;
  const touchOnly = matches('(pointer: coarse)') && matches('(hover: none)');
  if (touchOnly && smallScreen) return true;

  // An iPad in desktop mode reports itself as a Mac but has touch points and no fine pointer.
  return env.navigator.platform === 'MacIntel' && env.navigator.maxTouchPoints > 1;
}
