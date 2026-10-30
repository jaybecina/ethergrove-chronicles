/** 16-bit stereo PCM WAV, for the studio's renders. */
export function encodeWav(
  left: Float32Array,
  right: Float32Array,
  rate: number,
): Uint8Array<ArrayBuffer> {
  const frames = left.length;
  const dataBytes = frames * 4;
  const view = new DataView(new ArrayBuffer(44 + dataBytes));
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  const pcm = (v: number) => {
    const c = Math.max(-1, Math.min(1, v));
    return c < 0 ? c * 0x8000 : c * 0x7fff;
  };
  for (let i = 0; i < frames; i++) {
    view.setInt16(44 + i * 4, pcm(left[i] ?? 0), true);
    view.setInt16(46 + i * 4, pcm(right[i] ?? 0), true);
  }
  return new Uint8Array(view.buffer);
}
