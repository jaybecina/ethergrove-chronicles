import { JINGLES, MUSIC, SFX_FILES, type AudioFile, type TrackFile } from './manifest';

/** Samples compared at each loop point by the seamless-loop check. */
const LOOP_WINDOW = 2048;

export type ProbeKind = 'track' | 'jingle' | 'sfx';
export interface Probe {
  rms: number;
  duration: number;
  loopStart?: number;
  loopEnd?: number;
  /** Tracks: how alike the audio is at loopStart and loopEnd (1 = identical, a seamless loop). */
  corr?: number;
}

export function rmsOf(data: Float32Array): number {
  let sum = 0;
  for (const v of data) sum += v * v;
  return data.length ? Math.sqrt(sum / data.length) : 0;
}

/** Pearson correlation of `n` samples starting at each loop point; 0 if either window runs past the data. */
export function loopCorrelation(
  data: Float32Array,
  rate: number,
  loopStart: number,
  loopEnd: number,
  n = LOOP_WINDOW,
): number {
  const a = Math.round(loopStart * rate);
  const b = Math.round(loopEnd * rate);
  if (a + n > data.length || b + n > data.length) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += data[a + i] ?? 0;
    mb += data[b + i] ?? 0;
  }
  ma /= n;
  mb /= n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const x = (data[a + i] ?? 0) - ma;
    const y = (data[b + i] ?? 0) - mb;
    cov += x * y;
    va += x * x;
    vb += y * y;
  }
  return va && vb ? cov / Math.sqrt(va * vb) : 0;
}

const table = (kind: ProbeKind): Record<string, AudioFile | TrackFile> =>
  kind === 'track' ? MUSIC : kind === 'jingle' ? JINGLES : SFX_FILES;

/** E2E only: fetches and decodes a shipped file and measures it. */
export async function probeAudio(kind: ProbeKind, id: string): Promise<Probe> {
  const entry = table(kind)[id];
  if (!entry) throw new Error(`No ${kind} "${id}" in the manifest`);
  const bytes = await (await fetch(`/assets/${entry.file}`)).arrayBuffer();
  const buffer = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(bytes);
  const data = buffer.getChannelData(0);
  const probe: Probe = { rms: rmsOf(data), duration: buffer.duration };
  if ('loopStart' in entry) {
    probe.loopStart = entry.loopStart;
    probe.loopEnd = entry.loopEnd;
    probe.corr = loopCorrelation(data, buffer.sampleRate, entry.loopStart, entry.loopEnd);
  }
  return probe;
}
