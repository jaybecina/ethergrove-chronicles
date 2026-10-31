import { describe, expect, it } from 'vitest';
import { QUALITY, isWeakGpu, pickInitialTier, resolveTier, stepDown } from './quality';

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
    expect(QUALITY.high).toEqual({
      shadowMapSize: 2048,
      dprMax: 2,
      ao: true,
      grassDensity: 1,
      shadows: true,
      bloom: true,
    });
    expect(QUALITY.low).toEqual({
      shadowMapSize: 1024,
      dprMax: 1.5,
      ao: false,
      grassDensity: 0.5,
      shadows: true,
      bloom: true,
    });
    expect(QUALITY.lite).toEqual({
      shadowMapSize: 1024,
      dprMax: 1,
      ao: false,
      grassDensity: 0.5,
      shadows: false,
      bloom: false,
    });
  });
});

describe('lowest tier (desktop spec §4)', () => {
  const weak = [
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Microsoft Basic Render Driver',
    'Mali-G52',
    'Adreno (TM) 506',
  ];
  const capable = [
    'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
    'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Adreno (TM) 740',
    '',
  ];

  it('spots software renderers and old integrated GPUs', () => {
    for (const r of weak) expect(isWeakGpu(r), r).toBe(true);
    for (const r of capable) expect(isWeakGpu(r), r).toBe(false);
  });

  it('a weak GPU starts on the lowest tier', () => {
    expect(
      pickInitialTier({
        coarsePointer: false,
        deviceMemory: 8,
        maxTextureSize: 16384,
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      }),
    ).toBe('lite');
    expect(
      pickInitialTier({
        coarsePointer: false,
        maxTextureSize: 16384,
        renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
      }),
    ).toBe('high');
  });

  it('a falling frame rate steps down one tier at a time', () => {
    expect(stepDown('high')).toBe('low');
    expect(stepDown('low')).toBe('lite');
    expect(stepDown('lite')).toBe('lite');
  });

  it('the lowest tier draws no more than Battery saver', () => {
    expect(QUALITY.lite.dprMax).toBeLessThan(QUALITY.low.dprMax);
    expect(QUALITY.lite.grassDensity).toBeLessThanOrEqual(QUALITY.low.grassDensity);
  });
});
