export type QualityTier = 'high' | 'low';

export interface TierSettings {
  shadowMapSize: 2048 | 1024;
  dprMax: 2 | 1.5;
  ao: boolean;
  grassDensity: 1 | 0.5;
}

export const QUALITY: Record<QualityTier, TierSettings> = {
  high: { shadowMapSize: 2048, dprMax: 2, ao: true, grassDensity: 1 },
  low: { shadowMapSize: 1024, dprMax: 1.5, ao: false, grassDensity: 0.5 },
};

export function pickInitialTier(env: {
  coarsePointer: boolean;
  deviceMemory?: number;
  maxTextureSize: number;
}): QualityTier {
  if (env.coarsePointer) return 'low';
  if (env.deviceMemory !== undefined && env.deviceMemory <= 4) return 'low';
  return env.maxTextureSize >= 8192 ? 'high' : 'low';
}

export function resolveTier(setting: 'auto' | QualityTier, auto: QualityTier): QualityTier {
  return setting === 'auto' ? auto : setting;
}

/** Reads the current device; used once at startup. */
export function detectTier(gl: { capabilities: { maxTextureSize: number } }): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return pickInitialTier({
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    ...(nav.deviceMemory !== undefined ? { deviceMemory: nav.deviceMemory } : {}),
    maxTextureSize: gl.capabilities.maxTextureSize,
  });
}
