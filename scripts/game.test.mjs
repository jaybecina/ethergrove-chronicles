// Unit tests for the Godot runner script: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  countTestScripts,
  godotArgs,
  gutScriptCount,
  gutSelection,
  passSummary,
  okLine,
  outputHasScriptErrors,
  resolveGodotBin,
  shotArgs,
  SMOKE_TASKS,
} from './game.mjs';

const MAC_BIN = '/Applications/Godot.app/Contents/MacOS/Godot';

test('GODOT_BIN wins when it exists', () => {
  assert.equal(
    resolveGodotBin({ GODOT_BIN: '/x/godot' }, 'linux', (p) => p === '/x/godot'),
    '/x/godot',
  );
});
test('GODOT_BIN that does not exist is not used', () => {
  assert.equal(
    resolveGodotBin({ GODOT_BIN: '/nope' }, 'linux', () => false),
    null,
  );
});
test('macOS falls back to the app bundle', () => {
  assert.equal(
    resolveGodotBin({}, 'darwin', (p) => p === MAC_BIN),
    MAC_BIN,
  );
});
test('linux falls back to godot on PATH', () => {
  assert.equal(
    resolveGodotBin({}, 'linux', (p) => p === 'godot'),
    'godot',
  );
});
test('null when nothing is found', () => {
  assert.equal(
    resolveGodotBin({}, 'linux', () => false),
    null,
  );
});
test('test args run GUT over res://test and exit', () => {
  assert.deepEqual(godotArgs('test'), [
    '--headless',
    '--path',
    'apps/game',
    '-s',
    'res://addons/gut/gut_cmdln.gd',
    '-gdir=res://test',
    '-ginclude_subdirs',
    '-gexit',
  ]);
});
test('import and smoke args', () => {
  assert.deepEqual(godotArgs('import'), ['--headless', '--path', 'apps/game', '--import']);
  assert.deepEqual(godotArgs('smoke'), [
    '--headless',
    '--path',
    'apps/game',
    '-s',
    'res://test/smoke/smoke_boot.gd',
  ]);
});

test('playthrough args run the headless playthrough script', () => {
  assert.deepEqual(godotArgs('playthrough'), [
    '--headless',
    '--path',
    'apps/game',
    '-s',
    'res://test/smoke/smoke_playthrough.gd',
  ]);
});
test('smoke runs both the boot smoke and the playthrough, each needing its OK line', () => {
  assert.deepEqual(SMOKE_TASKS, ['smoke', 'playthrough']);
  assert.equal(okLine('smoke'), 'SMOKE OK');
  assert.equal(okLine('playthrough'), 'PLAYTHROUGH OK');
  assert.equal(okLine('test'), null);
});
test('shot args open a 1280x720 window (not headless) and pass the shot options through', () => {
  assert.deepEqual(shotArgs(['scene=farm', 'tier=low', 'season=winter', 'out=/tmp/a.png']), [
    '--path',
    'apps/game',
    '--resolution',
    '1280x720',
    '--quit-after',
    '600',
    '-s',
    'res://tools/shot.gd',
    '--',
    'scene=farm',
    'tier=low',
    'season=winter',
    'out=/tmp/a.png',
  ]);
  assert.equal(shotArgs([]).includes('--headless'), false);
});
test('shot args drop the pnpm "--" separator and reject anything but key=value', () => {
  assert.deepEqual(shotArgs(['--', 'scene=house']).slice(-2), ['--', 'scene=house']);
  assert.throws(() => shotArgs(['scene']), /key=value/);
});

// Real lines from a GUT run where test_parity_harness.gd did not compile (GUT skipped it and exited 0).
const BROKEN = [
  'SCRIPT ERROR: Parse Error: Identifier "JsonNorm" not declared in the current scope.',
  'ERROR: Failed to load script "res://test/core/test_parity_harness.gd" with error "Parse error".',
  '\u001b[33m[GUT WARNING]:  \u001b[0mIgnoring script res://test/core/test_parity_harness.gd because it does not extend GutTest',
];
const CLEAN = `res://test/core/test_sanity.gd
\u001b[0m* test_arithmetic_works
\u001b[1m1/1 passed.
Totals
------
Scripts               2
Tests                13
Passing Tests        13
Asserts              29
Time              0.461s

\u001b[32m---- All tests passed! ----
\u001b[0m`;

test('each broken-script line is detected on its own', () => {
  for (const line of BROKEN) assert.equal(outputHasScriptErrors(`ok\n${line}\nok`), true, line);
  assert.equal(outputHasScriptErrors('Parse Error: Unexpected "Indent" in class body.'), true);
});
test('a clean GUT run has no script errors', () => {
  assert.equal(outputHasScriptErrors(CLEAN), false);
});
test('gutScriptCount reads the summary, ANSI codes or not', () => {
  assert.equal(gutScriptCount(CLEAN), 2);
  assert.equal(gutScriptCount('\u001b[0mScripts               7\u001b[0m\n'), 7);
  assert.equal(gutScriptCount('no summary here'), null);
});
test('countTestScripts counts test_*.gd files in every subfolder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gut-'));
  mkdirSync(join(dir, 'core'));
  mkdirSync(join(dir, 'support'));
  for (const f of [
    'core/test_a.gd',
    'core/test_b.gd',
    'test_c.gd',
    'support/core_test.gd',
    'core/test_a.gd.uid',
  ])
    writeFileSync(join(dir, f), '');
  assert.equal(countTestScripts(dir), 3);
});

test('gutSelection turns test files into res:// paths, from the repo root or apps/game', () => {
  assert.deepEqual(gutSelection([]), []);
  assert.deepEqual(
    gutSelection(['--', 'apps/game/test/core/test_crops.gd', 'test/game/test_hud.gd']),
    ['res://test/core/test_crops.gd', 'res://test/game/test_hud.gd'],
  );
  assert.deepEqual(gutSelection(['res://test/core/test_crops.gd']), [
    'res://test/core/test_crops.gd',
  ]);
});
test('gutSelection rejects anything but a test_*.gd file under test/', () => {
  for (const bad of [
    'test/core/crops.gd',
    'core/test_crops.gd',
    'test/../core/test_x.gd',
    '-gdir=res://x',
  ])
    assert.throws(() => gutSelection([bad]), /test_\*\.gd/, bad);
});
test('test args with a selection run only those scripts', () => {
  assert.deepEqual(
    godotArgs('test', ['res://test/core/test_crops.gd', 'res://test/game/test_hud.gd']),
    [
      '--headless',
      '--path',
      'apps/game',
      '-s',
      'res://addons/gut/gut_cmdln.gd',
      '-gtest=res://test/core/test_crops.gd,res://test/game/test_hud.gd',
      '-gexit',
    ],
  );
});
test('passSummary keeps only the GUT run summary of a passing run', () => {
  const run = `Godot Engine v4.7.2\n[  16% ] loading\nERROR: expected loud error\n   at: push_error\n${CLEAN}\nERROR: trailing noise\n`;
  const out = passSummary('test', run);
  assert.match(out, /Scripts\s+2/);
  assert.match(out, /All tests passed/);
  assert.doesNotMatch(out, /Godot Engine|loading|ERROR|test_arithmetic_works/);
});
test('passSummary of a smoke task is its OK line', () => {
  assert.equal(passSummary('smoke', 'noise\nSMOKE OK\nmore noise'), 'SMOKE OK');
  assert.equal(passSummary('playthrough', 'x\nPLAYTHROUGH OK'), 'PLAYTHROUGH OK');
});
test('passSummary falls back to the whole output when it finds no summary', () => {
  assert.equal(passSummary('test', 'odd output'), 'odd output');
});
