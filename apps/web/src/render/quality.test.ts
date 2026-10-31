import { describe, expect, it } from 'vitest';
import { QUALITY, isWeakGpu, pickInitialTier, resolveTier, stepDown } from './quality';

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

describe('quality tiers', () => {
  it('Automatic starts every capable device on medium, never high', () => {
    expect(pickInitialTier({})).toBe('medium');
    for (const r of capable) expect(pickInitialTier({ renderer: r }), r).toBe('medium');
  });

  it('a weak GPU starts on low', () => {
    for (const r of weak) expect(pickInitialTier({ renderer: r }), r).toBe('low');
  });

  it('spots software renderers and old integrated GPUs', () => {
    for (const r of weak) expect(isWeakGpu(r), r).toBe(true);
    for (const r of capable) expect(isWeakGpu(r), r).toBe(false);
  });

  it('a settings override beats auto', () => {
    expect(resolveTier('medium', 'low')).toBe('medium');
    expect(resolveTier('high', 'medium')).toBe('high');
    expect(resolveTier('auto', 'low')).toBe('low');
  });

  it('a falling frame rate steps down one tier at a time', () => {
    expect(stepDown('high')).toBe('medium');
    expect(stepDown('medium')).toBe('low');
    expect(stepDown('low')).toBe('low');
  });

  it('tiers match the spec', () => {
    expect(QUALITY.high).toEqual({
      shadowMapSize: 2048,
      dprMax: 2,
      ao: true,
      grassDensity: 1,
      decorDensity: 2,
      cropSway: 0.07,
      shadows: true,
      bloom: true,
    });
    expect(QUALITY.medium).toEqual({
      shadowMapSize: 1024,
      dprMax: 1.5,
      ao: false,
      grassDensity: 0.6,
      decorDensity: 1,
      cropSway: 0.05,
      shadows: true,
      bloom: true,
    });
    expect(QUALITY.low).toEqual({
      shadowMapSize: 1024,
      dprMax: 1,
      ao: false,
      grassDensity: 0.35,
      decorDensity: 0.5,
      cropSway: 0,
      shadows: false,
      bloom: false,
    });
  });

  it('each preset draws no more than the one above', () => {
    for (const [lo, hi] of [
      [QUALITY.low, QUALITY.medium],
      [QUALITY.medium, QUALITY.high],
    ] as const) {
      for (const k of Object.keys(lo) as (keyof typeof lo)[]) {
        const a = lo[k];
        const b = hi[k];
        if (typeof a === 'number' && typeof b === 'number') expect(a, k).toBeLessThanOrEqual(b);
        if (typeof a === 'boolean') expect(a && !b, k).toBe(false);
      }
    }
  });
});
