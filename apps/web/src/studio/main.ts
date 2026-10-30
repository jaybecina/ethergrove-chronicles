import { JINGLE_PIECES, SFX_RECIPES, TRACK_PIECES } from './pieces';
import { renderPiece, renderSfx, type Rendered } from './render';
import { buildIndex, type SampleIndex } from './samples';
import { encodeWav } from './wav';

/** The studio page's API, driven by scripts/studio.mjs in headless Chromium. Dev only. */
export interface StudioApi {
  init(paths: string[], pianoChart: Record<string, number>): void;
  list(): { track: string[]; jingle: string[]; sfx: string[] };
  render(
    kind: 'track' | 'jingle' | 'sfx',
    id: string,
  ): Promise<{
    wav: string;
    seconds: number;
    rms: number;
    peak: number;
    loopStart?: number;
    loopEnd?: number;
  }>;
}

declare global {
  interface Window {
    studio?: StudioApi;
  }
}

let index: SampleIndex | null = null;
const decoder = new OfflineAudioContext(2, 1, 44100);
const cache = new Map<string, Promise<AudioBuffer>>();
const load = (path: string): Promise<AudioBuffer> => {
  let hit = cache.get(path);
  if (!hit) {
    const url = `/vsco/${path.split('/').map(encodeURIComponent).join('/')}`;
    hit = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Missing sample ${path} (${String(r.status)})`);
        return r.arrayBuffer();
      })
      .then((bytes) => decoder.decodeAudioData(bytes));
    cache.set(path, hit);
  }
  return hit;
};

function base64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function levels(r: Rendered) {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < r.left.length; i++) {
    const l = r.left[i] ?? 0;
    const rt = r.right[i] ?? 0;
    sum += l * l + rt * rt;
    peak = Math.max(peak, Math.abs(l), Math.abs(rt));
  }
  return { rms: Math.sqrt(sum / (2 * r.left.length || 1)), peak };
}

window.studio = {
  init(paths, chart) {
    index = buildIndex(paths, chart);
  },
  list() {
    return {
      track: Object.keys(TRACK_PIECES),
      jingle: Object.keys(JINGLE_PIECES),
      sfx: Object.keys(SFX_RECIPES),
    };
  },
  async render(kind, id) {
    if (!index) throw new Error('studio.init() first');
    const table = { track: TRACK_PIECES, jingle: JINGLE_PIECES } as const;
    const r =
      kind === 'sfx'
        ? await renderSfx(id, SFX_RECIPES[id as keyof typeof SFX_RECIPES], load, index)
        : await renderPiece(
            (table[kind] as Record<string, Parameters<typeof renderPiece>[0]>)[id] as Parameters<
              typeof renderPiece
            >[0],
            load,
            index,
          );
    return {
      wav: base64(encodeWav(r.left, r.right, r.rate)),
      seconds: r.left.length / r.rate,
      ...levels(r),
      ...(r.loopStart !== undefined ? { loopStart: r.loopStart, loopEnd: r.loopEnd } : {}),
    };
  },
};
