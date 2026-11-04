// Runs the Godot project in apps/game: `node scripts/game.mjs <import|test|smoke|playthrough|shot>`.
// Every task is headless except `shot`, which opens a 1280x720 window to render a screenshot.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAC_BIN = '/Applications/Godot.app/Contents/MacOS/Godot';
const BASE = ['--headless', '--path', 'apps/game'];

/**
 * Finds the Godot binary: GODOT_BIN, then the macOS app bundle, then `godot` on PATH.
 * @param {NodeJS.ProcessEnv} env
 * @param {string} platform
 * @param {(p: string) => boolean} exists
 * @returns {string | null}
 */
export function resolveGodotBin(env, platform, exists) {
  if (env.GODOT_BIN && exists(env.GODOT_BIN)) return env.GODOT_BIN;
  if (platform === 'darwin' && exists(MAC_BIN)) return MAC_BIN;
  if (platform !== 'darwin' && exists('godot')) return 'godot';
  return null;
}

/** `pnpm game:smoke` runs these in order and fails when either fails. */
export const SMOKE_TASKS = /** @type {const} */ (['smoke', 'playthrough']);

/** Frames after which a `shot` run quits even when the script never saved its PNG. */
const SHOT_QUIT_AFTER = 600;

/**
 * The line a smoke task must print to pass, or null for tasks with none.
 * @param {string} task
 * @returns {string | null}
 */
export function okLine(task) {
  if (task === 'smoke') return 'SMOKE OK';
  if (task === 'playthrough') return 'PLAYTHROUGH OK';
  return null;
}

/**
 * Godot args for one screenshot (apps/game/tools/shot.gd) in a real 1280x720 window, not headless: the dummy
 * renderer draws nothing. `extra` are the `key=value` options after `pnpm game:shot --`.
 * @param {string[]} extra
 * @returns {string[]}
 */
export function shotArgs(extra) {
  const opts = extra.filter((a) => a !== '--');
  for (const a of opts)
    if (!/^[a-z]+=.+$/.test(a)) throw new Error(`shot option "${a}" is not key=value`);
  return [
    '--path',
    'apps/game',
    '--resolution',
    '1280x720',
    '--quit-after',
    String(SHOT_QUIT_AFTER),
    '-s',
    'res://tools/shot.gd',
    '--',
    ...opts,
  ];
}

/**
 * @param {'import' | 'test' | 'smoke' | 'playthrough'} task
 * @returns {string[]}
 */
export function godotArgs(task) {
  switch (task) {
    case 'import':
      return [...BASE, '--import'];
    case 'test':
      return [
        ...BASE,
        '-s',
        'res://addons/gut/gut_cmdln.gd',
        '-gdir=res://test',
        '-ginclude_subdirs',
        '-gexit',
      ];
    case 'smoke':
      return [...BASE, '-s', 'res://test/smoke/smoke_boot.gd'];
    case 'playthrough':
      return [...BASE, '-s', 'res://test/smoke/smoke_playthrough.gd'];
  }
}

/**
 * Godot output that means a script did not compile or load. GUT skips such a test script and still
 * reports "All tests passed" with exit code 0, so the runner has to look for these itself.
 */
const SCRIPT_ERROR = /SCRIPT ERROR|Parse Error|Failed to load script|does not extend GutTest/;

/** Terminal colour codes (ESC [ … m) in GUT's output. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** @param {string} text */
const stripAnsi = (text) => text.replace(ANSI, '');

/**
 * @param {string} text Godot's combined stdout and stderr
 * @returns {boolean}
 */
export function outputHasScriptErrors(text) {
  return SCRIPT_ERROR.test(stripAnsi(text));
}

/**
 * The `Scripts N` count of GUT's run summary, or null when there is no summary.
 * @param {string} text
 * @returns {number | null}
 */
export function gutScriptCount(text) {
  const m = /^Scripts\s+(\d+)\s*$/m.exec(stripAnsi(text));
  return m ? Number(m[1]) : null;
}

/**
 * The number of `test_*.gd` files under `dir`, in every subfolder.
 * @param {string} dir
 * @returns {number}
 */
export function countTestScripts(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter(
    (e) => e.isFile() && /^test_.*\.gd$/.test(e.name),
  ).length;
}

/** @param {string} name a bare command name */
function onPath(name) {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', ''] : [''];
  return (process.env.PATH ?? '')
    .split(delimiter)
    .some((dir) => exts.some((ext) => existsSync(join(dir, name + ext))));
}

/** @param {string} p */
function exists(p) {
  return p === 'godot' ? onPath(p) : existsSync(p);
}

/** @param {string[]} args */
function run(bin, args) {
  return spawnSync(bin, args, { stdio: 'inherit' }).status ?? 1;
}

/**
 * Runs Godot with its output piped (and echoed), then fails the run on any script error, for the
 * `test` task when GUT ran fewer scripts than there are `test_*.gd` files (a skipped script), and for a
 * smoke task when its OK line is missing.
 * @param {string} bin
 * @param {'test' | 'smoke' | 'playthrough'} task
 * @returns {number}
 */
function runChecked(bin, task) {
  const r = spawnSync(bin, godotArgs(task), {
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.error) {
    console.error(`Godot did not run: ${r.error.message}`);
    return 1;
  }
  const code = r.status ?? 1;
  if (code !== 0) return code;
  const text = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  if (outputHasScriptErrors(text)) {
    console.error('A Godot script failed to compile or load (see the errors above).');
    return 1;
  }
  const ok = okLine(task);
  if (ok !== null && !text.split(/\r?\n/).some((line) => line.trim() === ok)) {
    console.error(`Godot exited 0 but did not print "${ok}".`);
    return 1;
  }
  if (task === 'test') {
    const ran = gutScriptCount(text);
    const files = countTestScripts(fileURLToPath(new URL('../apps/game/test', import.meta.url)));
    if (ran === null || ran < files) {
      console.error(
        `GUT ran ${String(ran ?? 'no')} scripts but apps/game/test has ${files} test_*.gd files.`,
      );
      return 1;
    }
  }
  return 0;
}

const TASKS = ['import', 'test', 'smoke', 'playthrough', 'shot'];

function main() {
  const task = process.argv[2];
  if (!TASKS.includes(task)) {
    console.error(`Usage: node scripts/game.mjs <${TASKS.join('|')}>`);
    return 2;
  }
  const bin = resolveGodotBin(process.env, process.platform, exists);
  if (!bin) {
    console.log('Godot not found: set GODOT_BIN to run the Godot checks. Skipped.');
    return process.env.CI === 'true' ? 1 : 0;
  }
  if (task === 'import') return run(bin, godotArgs('import'));
  const imported = run(bin, godotArgs('import'));
  if (imported !== 0) return imported;
  if (task === 'shot') return run(bin, shotArgs(process.argv.slice(3)));
  if (task === 'smoke') {
    for (const t of SMOKE_TASKS) {
      const code = runChecked(bin, t);
      if (code !== 0) return code;
    }
    return 0;
  }
  return runChecked(bin, /** @type {'test' | 'playthrough'} */ (task));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
