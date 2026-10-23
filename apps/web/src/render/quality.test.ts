import { describe, expect, it } from 'vitest';
import { QUALITY, pickInitialTier, resolveTier } from './quality';

describe('quality tiers', () => {
  it('touch devices start on low', () => {
    expect(pickInitialTier({ coarsePointer: true, maxTextureSize: 4096 })).toBe('low');
  });

  it('desktops start on high', () => {
    expect(pickInitialTier({ coarsePointer: false, maxTextureSize: 16384, deviceMemory: 16 })).toBe(
      'high',
    );
  });

  it('low memory or small GPUs start on low', () => {
    expect(pickInitialTier({ coarsePointer: false, maxTextureSize: 16384, deviceMemory: 2 })).toBe(
      'low',
    );
    expect(pickInitialTier({ coarsePointer: false, maxTextureSize: 4096 })).toBe('low');
  });

  it('a settings override beats auto', () => {
    expect(resolveTier('low', 'high')).toBe('low');
    expect(resolveTier('high', 'low')).toBe('high');
    expect(resolveTier('auto', 'low')).toBe('low');
  });

  it('tiers match the spec', () => {
    expect(QUALITY.high).toEqual({ shadowMapSize: 2048, dprMax: 2, ao: true, grassDensity: 1 });
    expect(QUALITY.low).toEqual({ shadowMapSize: 1024, dprMax: 1.5, ao: false, grassDensity: 0.5 });
  });
});
