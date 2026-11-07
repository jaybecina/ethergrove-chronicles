// Tests for scripts/godotAudio.mjs and the real Godot audio folder: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  BUDGET,
  checkAudio,
  manifestSource,
  oggencArgs,
  scanAudio,
  trimArgs,
} from './godotAudio.mjs';

const REAL_DIR = new URL('../apps/game/assets/audio', import.meta.url).pathname;
const REAL_MANIFEST = new URL('../apps/game/game/audio/audio_manifest.gd', import.meta.url)
  .pathname;

const fixture = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'godot-audio-'));
  for (const [path, size] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), Buffer.alloc(size));
  }
  return root;
};

test('trimArgs sends the wav to stdout, trimmed to a loop seam when there is one', () => {
  const plain = trimArgs('a.wav');
  assert.deepEqual(plain.slice(-3), ['-f', 'wav', '-']);
  assert.ok(!plain.includes('-ss'));
  const loop = trimArgs('t.wav', { start: 0.5, length: 80 });
  assert.deepEqual(loop.slice(loop.indexOf('-ss'), loop.indexOf('-ss') + 4), [
    '-ss',
    '0.5',
    '-t',
    '80',
  ]);
});

test('oggencArgs reads stdin and writes Ogg Vorbis at quality 3', () => {
  assert.deepEqual(oggencArgs('a.ogg'), ['-Q', '-q', '3', '-o', 'a.ogg', '-']);
});

test('manifestSource lists each file by kind, sorted by the scan, and an empty kind as {}', () => {
  const src = manifestSource({ music: ['title', 'woods'], jingles: [], sfx: ['hoe'] });
  assert.match(
    src,
    /const MUSIC := \{\n\t"title": "res:\/\/assets\/audio\/music\/title\.ogg",\n\t"woods"/,
  );
  assert.match(src, /const JINGLES := \{\}/);
  assert.match(src, /const SFX := \{\n\t"hoe": "res:\/\/assets\/audio\/sfx\/hoe\.ogg",\n\}/);
  assert.throws(() => manifestSource({ music: ['bad id'], jingles: [], sfx: [] }), /Bad audio id/);
});

test('scanAudio finds the ogg ids of each kind', () => {
  const dir = fixture({
    'music/b.ogg': 1,
    'music/a.ogg': 1,
    'music/notes.txt': 1,
    'sfx/hoe.ogg': 1,
  });
  assert.deepEqual(scanAudio(dir), { music: ['a', 'b'], jingles: [], sfx: ['hoe'] });
});

test('checkAudio passes when the manifest matches the files', () => {
  const dir = fixture({ 'music/a.ogg': 10, 'sfx/hoe.ogg': 10 });
  const manifest = join(dir, 'audio_manifest.gd');
  writeFileSync(manifest, manifestSource(scanAudio(dir)));
  assert.deepEqual(checkAudio(dir, manifest), []);
});

test('checkAudio reports a listed file that is missing, an unlisted file and a track over budget', () => {
  const dir = fixture({ 'music/big.ogg': BUDGET.trackBytes + 1, 'sfx/hoe.ogg': 1 });
  const manifest = join(dir, 'audio_manifest.gd');
  writeFileSync(manifest, manifestSource({ music: ['big', 'ghost'], jingles: [], sfx: [] }));
  const problems = checkAudio(dir, manifest);
  assert.ok(problems.some((p) => p.includes('ghost') && p.includes('missing')));
  assert.ok(problems.some((p) => p.includes('sfx/hoe.ogg') && p.includes('not in the manifest')));
  assert.ok(problems.some((p) => p.includes('big') && p.includes('track budget')));
});

test('the real Godot audio folder matches its manifest and stays within budget', () => {
  assert.deepEqual(checkAudio(REAL_DIR, REAL_MANIFEST), []);
});
