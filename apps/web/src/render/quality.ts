/** `lite` is the Lowest tier for weak GPUs (desktop spec §4). */
export type QualityTier = 'high' | 'low' | 'lite';

export interface TierSettings {
  shadowMapSize: 2048 | 1024;
  dprMax: 2 | 1.5 | 1;
  ao: boolean;
  grassDensity: 1 | 0.5;
  /** The sun casts a shadow map (the scene is drawn again from the sun, ~20% of a frame). */
  shadows: boolean;
  /** The mip-blur bloom pass, the heaviest effect after AO. */
  bloom: boolean;
}

export const QUALITY: Record<QualityTier, TierSettings> = {
  high: { shadowMapSize: 2048, dprMax: 2, ao: true, grassDensity: 1, shadows: true, bloom: true },
  low: {
    shadowMapSize: 1024,
    dprMax: 1.5,
    ao: false,
    grassDensity: 0.5,
    shadows: true,
    bloom: true,
  },
  lite: {
    shadowMapSize: 1024,
    dprMax: 1,
    ao: false,
    grassDensity: 0.5,
    shadows: false,
    bloom: false,
  },
};

// Software renderers, and integrated or phone GPUs too slow for the Low tier's post-processing.
const WEAK_GPU =
  /swiftshader|llvmpipe|softpipe|basic render driver|intel\(r\) (hd|uhd) graphics|intel hd graphics|mali-[gt]?[0-9]{2}\b|adreno \(tm\) [3-5][0-9]{2}\b/i;

/** True for a WebGL renderer string that should start on the Lowest tier. */
export function isWeakGpu(renderer: string): boolean {
  return WEAK_GPU.test(renderer);
}

export function pickInitialTier(env: {
  coarsePointer: boolean;
  deviceMemory?: number;
  maxTextureSize: number;
  renderer?: string;
}): QualityTier {
  if (env.renderer !== undefined && isWeakGpu(env.renderer)) return 'lite';
  if (env.coarsePointer) return 'low';
  if (env.deviceMemory !== undefined && env.deviceMemory <= 4) return 'low';
  return env.maxTextureSize >= 8192 ? 'high' : 'low';
}

/** The next tier down when the frame rate stays low; Lowest is the floor. */
export function stepDown(tier: QualityTier): QualityTier {
  return tier === 'high' ? 'low' : 'lite';
}

export function resolveTier(setting: 'auto' | QualityTier, auto: QualityTier): QualityTier {
  return setting === 'auto' ? auto : setting;
}

/** The GPU's name, read on this device only and never sent anywhere. Empty when hidden. */
function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return typeof name === 'string' ? name : '';
}

/** Reads the current device; used once at startup. */
export function detectTier(gl: {
  capabilities: { maxTextureSize: number };
  getContext(): WebGL2RenderingContext | WebGLRenderingContext;
}): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return pickInitialTier({
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    ...(nav.deviceMemory !== undefined ? { deviceMemory: nav.deviceMemory } : {}),
    maxTextureSize: gl.capabilities.maxTextureSize,
    renderer: rendererName(gl.getContext()),
  });
}
