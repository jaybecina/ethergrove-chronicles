import type { TierSettings } from './quality';

/** Rendering costs the frame-rate profile turns off one at a time (spec §7.3). */
export const PROFILE_SWITCHES = ['dpr', 'ao', 'shadows', 'grass', 'particles', 'post'] as const;
export type ProfileSwitch = (typeof PROFILE_SWITCHES)[number];
export type ProfileOff = Readonly<Record<ProfileSwitch, boolean>>;

export const NONE_OFF: ProfileOff = {
  dpr: false,
  ao: false,
  shadows: false,
  grass: false,
  particles: false,
  post: false,
};

const isSwitch = (name: string): name is ProfileSwitch =>
  (PROFILE_SWITCHES as readonly string[]).includes(name);

/** Reads `?perf-off=ao,grass` (or `all`) from a location search string. Unknown names are ignored. */
export function parseProfileOff(search: string): ProfileOff {
  const names = (new URLSearchParams(search).get('perf-off') ?? '').split(',');
  if (names.includes('all'))
    return { dpr: true, ao: true, shadows: true, grass: true, particles: true, post: true };
  const off: Record<ProfileSwitch, boolean> = { ...NONE_OFF };
  for (const name of names) if (isSwitch(name)) off[name] = true;
  return off;
}

let current: ProfileOff = NONE_OFF;

/** Set once at startup, in E2E builds only (main.tsx); production always keeps everything on. */
export function setProfileOff(off: ProfileOff): void {
  current = off;
}

export function profileOff(): ProfileOff {
  return current;
}

/** A tier's settings after the profile switches; the pixel ratio can drop to 1, below any tier. */
export type ProfiledSettings = Omit<TierSettings, 'dprMax'> & { dprMax: number };

/** The tier's settings with the profile's pixel-ratio and AO switches applied. */
export function profiledTier(tier: TierSettings, off: ProfileOff): ProfiledSettings {
  return {
    ...tier,
    dprMax: off.dpr ? 1 : tier.dprMax,
    ao: off.ao ? false : tier.ao,
  };
}
