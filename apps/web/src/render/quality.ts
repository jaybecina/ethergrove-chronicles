/** `low` suits weak GPUs, `medium` is the default, `high` is for stronger GPUs (presets spec §3). */
export type QualityTier = 'low' | 'medium' | 'high';

export interface TierSettings {
  shadowMapSize: 2048 | 1024;
  dprMax: 2 | 1.5 | 1;
  ao: boolean;
  /** Share of the full grass blades drawn. */
  grassDensity: number;
  /** Multiplier on the bush and flower scatter outside the fence. */
  decorDensity: number;
  /** Wind sway amplitude on crop models; 0 keeps them still. */
  cropSway: number;
  /** The sun casts a shadow map (the scene is drawn again from the sun, ~20% of a frame). */
  shadows: boolean;
  /** The mip-blur bloom pass, the heaviest effect after AO. */
  bloom: boolean;
}

export const QUALITY: Record<QualityTier, TierSettings> = {
  high: {
    shadowMapSize: 2048,
    dprMax: 2,
    ao: true,
    grassDensity: 1,
    decorDensity: 2,
    cropSway: 0.07,
    shadows: true,
    bloom: true,
  },
  medium: {
    shadowMapSize: 1024,
    dprMax: 1.5,
    ao: false,
    grassDensity: 0.6,
    decorDensity: 1,
    cropSway: 0.05,
    shadows: true,
    bloom: true,
  },
  low: {
    shadowMapSize: 1024,
    dprMax: 1,
    ao: false,
    grassDensity: 0.35,
    decorDensity: 0.5,
    cropSway: 0,
    shadows: false,
    bloom: false,
  },
};

// Software renderers, and integrated or phone GPUs too slow for the Medium tier's post-processing.
const WEAK_GPU =
  /swiftshader|llvmpipe|softpipe|basic render driver|intel\(r\) (hd|uhd) graphics|intel hd graphics|mali-[gt]?[0-9]{2}\b|adreno \(tm\) [3-5][0-9]{2}\b/i;

/** True for a WebGL renderer string that should start on the Low tier. */
export function isWeakGpu(renderer: string): boolean {
  return WEAK_GPU.test(renderer);
}

/** Automatic: weak GPUs start on Low, everything else on Medium. It never picks High. */
export function pickInitialTier(env: { renderer?: string }): QualityTier {
  return env.renderer !== undefined && isWeakGpu(env.renderer) ? 'low' : 'medium';
}

/** The next tier down when the frame rate stays low; Low is the floor. */
export function stepDown(tier: QualityTier): QualityTier {
  return tier === 'high' ? 'medium' : 'low';
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
  getContext(): WebGL2RenderingContext | WebGLRenderingContext;
}): QualityTier {
  return pickInitialTier({ renderer: rendererName(gl.getContext()) });
}
