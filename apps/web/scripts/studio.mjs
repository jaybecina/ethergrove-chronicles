#!/usr/bin/env node
// Renders Ethergrove's music and sound effects from the studio scores (src/studio/) with VSCO 2 CE samples,
// encodes them to AAC with macOS afconvert, and writes public/assets/{music,sfx}/*.m4a and src/audio/manifest.ts.
// Needs: VSCO_DIR (default ../VSCO-2-CE from the repo root), VCSL_DIR (default ../VCSL: the CC0 Versilian Community
// Sample Library, github.com/sgossner/VCSL), /usr/bin/afconvert, and `pnpm --filter web dev:e2e`.
// Usage: pnpm --filter web studio [--only <id>]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  manifestSource,
  oggencArgs,
  scanAudio,
  trimArgs,
  WEB_TRACKS_FOR_GODOT,
} from '../../../scripts/godotAudio.mjs';

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(WEB, '../..');
const VSCO_DIR = resolve(process.env.VSCO_DIR ?? join(REPO, '../VSCO-2-CE'));
const VCSL_DIR = resolve(process.env.VCSL_DIR ?? join(REPO, '../VCSL'));
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const OGGENC = process.env.OGGENC ?? 'oggenc';
const GAME_AUDIO = join(REPO, 'apps/game/assets/audio');
const GAME_MANIFEST = join(REPO, 'apps/game/game/audio/audio_manifest.gd');
const AFCONVERT = '/usr/bin/afconvert';
const GAME_URL = 'http://localhost:5199/studio.html';
const OUT = join(WEB, 'studio-out');
const PUBLIC = join(WEB, 'public/assets');
const MANIFEST_JSON = join(OUT, 'manifest.json');
const MANIFEST_TS = join(WEB, 'src/audio/manifest.ts');
const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
if (!existsSync(join(VSCO_DIR, 'Strings')))
  fail(`No VSCO 2 CE at ${VSCO_DIR}. Set VSCO_DIR to your copy.`);
if (!existsSync(join(VCSL_DIR, 'Chordophones')))
  fail(
    `VCSL not found: set VCSL_DIR to the VCSL checkout (CC0, github.com/sgossner/VCSL). Looked in ${VCSL_DIR}.`,
  );
// Godot plays Ogg Vorbis (soundtrack spec REQ-19): ffmpeg trims each loop and oggenc encodes it. Without both, only
// the web audio is rendered.
const has = (cmd, arg) => {
  try {
    execFileSync(cmd, [arg], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const hasOgg = has(FFMPEG, '-version') && has(OGGENC, '--version');
if (!hasOgg)
  console.warn(
    'ffmpeg or oggenc not found: the Godot Ogg files are skipped (brew install ffmpeg vorbis-tools).',
  );
if (!existsSync(AFCONVERT)) fail('afconvert not found: the studio needs macOS to encode AAC.');
const up = await fetch(GAME_URL).catch(() => null);
if (!up?.ok) fail(`No dev server at ${GAME_URL}. Start it first: pnpm --filter web dev:e2e`);

const paths = [];
// VCSL files get the virtual prefix `vcsl/` (src/studio/samples.ts) so one path list serves both libraries.
const walk = (root, prefix, dir = root) => {
  for (const name of readdirSync(dir)) {
    if (name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(root, prefix, p);
    else if (name.toLowerCase().endsWith('.wav')) paths.push(prefix + relative(root, p));
  }
};
walk(VSCO_DIR, '');
walk(VCSL_DIR, 'vcsl/');
const chart = Object.fromEntries(
  readFileSync(join(VSCO_DIR, 'Keys/Upright Piano/MappingChart.txt'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim().split('='))
    .filter(([k]) => /^\d{3}$/.test(k ?? ''))
    .map(([k, v]) => [k, Number(v)]),
);

mkdirSync(OUT, { recursive: true });
mkdirSync(join(PUBLIC, 'music'), { recursive: true });
mkdirSync(join(PUBLIC, 'sfx'), { recursive: true });
// A single-track run only updates its own entry, so it needs the manifest of a full run to build on; without it the
// generated manifest.ts would be rewritten with that one track and lose every other entry.
if (only && !existsSync(MANIFEST_JSON))
  fail(`No ${MANIFEST_JSON}: run the studio once without --only first.`);
const manifest = existsSync(MANIFEST_JSON)
  ? JSON.parse(readFileSync(MANIFEST_JSON, 'utf8'))
  : { track: {}, jingle: {}, sfx: {} };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/vsco/**', (route) => {
  const rel = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/vsco\//, ''));
  const vcsl = rel.startsWith('vcsl/');
  const root = vcsl ? VCSL_DIR : VSCO_DIR;
  const file = join(root, vcsl ? rel.slice('vcsl/'.length) : rel);
  if (!file.startsWith(root) || !existsSync(file)) return route.fulfill({ status: 404 });
  return route.fulfill({ body: readFileSync(file), contentType: 'audio/wav' });
});
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(GAME_URL);
await page.waitForFunction(() => globalThis.studio !== undefined);
await page.evaluate(([p, c]) => globalThis.studio.init(p, c), [paths, chart]);
const list = await page.evaluate(() => globalThis.studio.list());

// 'godot' tracks (src/studio/pieces/godot.ts) are only for the Godot game: they are encoded for listening into
// studio-out/listen/ until the Ogg output exists (soundtrack spec T6), and never enter the web manifest.
mkdirSync(join(OUT, 'listen'), { recursive: true });
for (const kind of ['track', 'jingle', 'sfx', 'godot'])
  for (const id of list[kind]) {
    if (only && id !== only) continue;
    const t0 = Date.now();
    const r = await page.evaluate(([k, i]) => globalThis.studio.render(k, i), [kind, id]);
    const wav = join(OUT, `${kind}-${id}.wav`);
    writeFileSync(wav, Buffer.from(r.wav, 'base64'));
    const file = `${kind === 'sfx' ? 'sfx' : 'music'}/${id}.m4a`;
    const m4a = kind === 'godot' ? join(OUT, 'listen', `${id}.m4a`) : join(PUBLIC, file);
    execFileSync(AFCONVERT, [wav, m4a, '-f', 'm4af', '-d', 'aac', '-b', '64000', '-q', '127']);
    const bytes = statSync(m4a).size;
    if (hasOgg && (kind !== 'track' || WEB_TRACKS_FOR_GODOT.includes(id))) {
      // A loop is trimmed to exactly its seam, so Godot can loop the file from end to start.
      const folder = kind === 'sfx' ? 'sfx' : kind === 'jingle' ? 'jingles' : 'music';
      mkdirSync(join(GAME_AUDIO, folder), { recursive: true });
      const loop =
        r.loopStart === undefined
          ? undefined
          : { start: r.loopStart, length: r.loopEnd - r.loopStart };
      const trimmed = execFileSync(FFMPEG, trimArgs(wav, loop), { maxBuffer: 1 << 29 });
      execFileSync(OGGENC, oggencArgs(join(GAME_AUDIO, folder, `${id}.ogg`)), { input: trimmed });
    }
    if (kind === 'godot') {
      console.log(
        `godot  ${id.padEnd(16)} ${r.seconds.toFixed(1).padStart(5)} s  rms ${r.rms.toFixed(3)}  peak ${r.peak.toFixed(2)}  -> ${m4a}`,
      );
      continue;
    }
    manifest[kind][id] = {
      file,
      bytes,
      duration: Number(r.seconds.toFixed(4)),
      ...(r.loopStart !== undefined
        ? { loopStart: Number(r.loopStart.toFixed(6)), loopEnd: Number(r.loopEnd.toFixed(6)) }
        : {}),
    };
    console.log(
      `${kind.padEnd(6)} ${id.padEnd(16)} ${r.seconds.toFixed(1).padStart(5)} s  rms ${r.rms.toFixed(3)}  peak ${r.peak.toFixed(2)}  ${(bytes / 1024).toFixed(0).padStart(4)} KB  (${((Date.now() - t0) / 1000).toFixed(1)} s)`,
    );
  }
await browser.close();
if (hasOgg) writeFileSync(GAME_MANIFEST, manifestSource(scanAudio(GAME_AUDIO)));
writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2));

const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const ts = `// Generated by scripts/studio.mjs: do not edit. Re-run \`pnpm --filter web studio\` after changing src/studio/.
import type { JingleFile, TrackId } from './music';
import type { SoundId } from './soundMap';

export interface AudioFile {
  /** Under /assets/. */
  file: string;
  bytes: number;
  /** Seconds. */
  duration: number;
}
export interface TrackFile extends AudioFile {
  /** Seconds: the loop runs from loopStart to loopEnd, over identical audio at both ends. */
  loopStart: number;
  loopEnd: number;
}

export const MUSIC: Record<TrackId, TrackFile> = ${JSON.stringify(sorted(manifest.track), null, 2)};

export const JINGLES: Record<JingleFile, AudioFile> = ${JSON.stringify(sorted(manifest.jingle), null, 2)};

export const SFX_FILES: Record<SoundId, AudioFile> = ${JSON.stringify(sorted(manifest.sfx), null, 2)};
`;
writeFileSync(MANIFEST_TS, ts);
execFileSync('pnpm', ['exec', 'prettier', '--write', MANIFEST_TS], { cwd: WEB });
console.log(`Wrote ${relative(REPO, MANIFEST_TS)}`);
