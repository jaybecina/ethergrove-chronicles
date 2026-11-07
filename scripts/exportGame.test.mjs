// Tests for scripts/exportGame.mjs: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  buildShell,
  exportArgs,
  EXPORT_PRESETS,
  selectPresets,
  templatesInstalled,
} from './exportGame.mjs';

const SHELL = 'a\n/*DETECT_UNSUPPORTED*/\nb';

test('buildShell inlines detect.mjs and drops its export keyword so the browser can run it as a classic script', () => {
  const out = buildShell(
    SHELL,
    '// c\nexport function detectUnsupported(env) {\n  return false;\n}\n',
  );
  assert.match(out, /function detectUnsupported\(env\)/);
  assert.doesNotMatch(out, /\bexport\b/);
  assert.doesNotMatch(out, /DETECT_UNSUPPORTED/);
});

test('buildShell fails when the shell has no marker, so the check can never be skipped silently', () => {
  assert.throws(() => buildShell('<html></html>', 'export function f() {}'), /marker/);
});

test('the real shell has the marker, the exact heading and both buttons', () => {
  const shell = readFileSync(new URL('../apps/game/web/shell.html', import.meta.url), 'utf8');
  assert.ok(shell.includes('/*DETECT_UNSUPPORTED*/'));
  assert.ok(shell.includes('Ethergrove is best played on a computer'));
  assert.ok(shell.includes('Copy link for my computer'));
  assert.ok(shell.includes('Play anyway'));
  assert.ok(shell.includes('Link copied'));
});

test('three presets are exported: macOS, Windows Desktop and Web, into apps/game/build', () => {
  assert.deepEqual(
    EXPORT_PRESETS.map((p) => p.name),
    ['macOS', 'Windows Desktop', 'Web'],
  );
  for (const p of EXPORT_PRESETS) assert.match(p.output, /^apps\/game\/build\//);
});

test('exportArgs runs a headless release export of one preset', () => {
  const args = exportArgs({ name: 'Web', output: 'apps/game/build/web/index.html' });
  // Godot resolves the output relative to the project folder.
  assert.deepEqual(args, [
    '--headless',
    '--path',
    'apps/game',
    '--export-release',
    'Web',
    'build/web/index.html',
  ]);
});

test('templatesInstalled needs the version folder to exist', () => {
  assert.equal(
    templatesInstalled('/h', (p) => p.endsWith('export_templates/4.7.2.stable')),
    true,
  );
  assert.equal(
    templatesInstalled('/h', () => false),
    false,
  );
});

test('export_presets.cfg declares the same three presets and the custom Web shell', () => {
  const cfg = readFileSync(new URL('../apps/game/export_presets.cfg', import.meta.url), 'utf8');
  for (const p of EXPORT_PRESETS) assert.ok(cfg.includes(`name="${p.name}"`), p.name);
  assert.ok(cfg.includes('html/custom_html_shell="res://web/shell.generated.html"'));
});

test('project.godot enables ETC2/ASTC textures, which the universal macOS export requires', () => {
  const project = readFileSync(new URL('../apps/game/project.godot', import.meta.url), 'utf8');
  assert.match(project, /^textures\/vram_compression\/import_etc2_astc=true$/m);
});

test('selectPresets exports every preset when no names are given', () => {
  assert.deepEqual(selectPresets([]), EXPORT_PRESETS);
});

test('selectPresets keeps only the named presets, so CI can export just the Web build', () => {
  assert.deepEqual(
    selectPresets(['Web']).map((p) => p.name),
    ['Web'],
  );
});

test('selectPresets rejects an unknown preset name instead of exporting nothing', () => {
  assert.throws(() => selectPresets(['Linux']), /Unknown export preset "Linux"/);
});

test('the Godot web deploy workflow exports only Web and deploys only when the Vercel secrets exist', () => {
  const wf = readFileSync(new URL('../.github/workflows/godot-web.yml', import.meta.url), 'utf8');
  assert.match(wf, /node scripts\/exportGame\.mjs Web/);
  assert.match(wf, /branches: \[main\]/);
  assert.match(wf, /if: env\.VERCEL_TOKEN != ''/);
  assert.match(wf, /vercel@[0-9]/);
  assert.doesNotMatch(wf, /pnpm --filter web build/);
});
