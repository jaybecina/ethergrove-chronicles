import { describe, expect, it } from 'vitest';
import { encodeWav } from './wav';

describe('encodeWav', () => {
  it('writes a 16-bit stereo PCM header', () => {
    const bytes = encodeWav(new Float32Array(3), new Float32Array(3), 44100);
    const view = new DataView(bytes.buffer);
    const text = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4));
    expect(bytes).toHaveLength(44 + 3 * 4);
    expect([text(0), text(8), text(12), text(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(view.getUint32(4, true)).toBe(36 + 12);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(28, true)).toBe(44100 * 4);
    expect(view.getUint16(32, true)).toBe(4);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(12);
  });

  it('interleaves left and right, clipped to the 16-bit range', () => {
    const bytes = encodeWav(new Float32Array([0.5, 2]), new Float32Array([-0.5, -2]), 8000);
    const view = new DataView(bytes.buffer);
    expect([0, 1, 2, 3].map((i) => view.getInt16(44 + i * 2, true))).toEqual([
      16383, -16384, 32767, -32768,
    ]);
  });
});
