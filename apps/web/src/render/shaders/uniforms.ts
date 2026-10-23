import { Vector3 } from 'three';

/** Uniforms shared by every patched material; updated once per frame by SeasonDriver. */
export const shared = {
  uTime: { value: 0 },
  uSnow: { value: 0 },
  uPlayer: { value: new Vector3() },
};
