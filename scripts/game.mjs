// Runs the Godot project in apps/game: `node scripts/game.mjs <import|test|smoke|playthrough|shot>`.
// Every task is headless except `shot`, which opens a 1280x720 window to render a screenshot.
// `pnpm game:test -- test/core/test_crops.gd …` runs only those scripts. A passing run prints only its summary
// (GUT's totals or the smoke OK line) so agents and CI logs stay short; a failure prints everything.
// GAME_VERBOSE=1 always prints everything.
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
 * The GUT scripts named after `pnpm game:test --`, as res:// paths. Accepts paths from the repo root
 * (`apps/game/test/…`), from apps/game (`test/…`) or res:// paths; anything else throws.
 * @param {string[]} argv
 * @returns {string[]}
 */
export function gutSelection(argv) {
  return argv
    .filter((a) => a !== '--')
    .map((a) => {
      const rel = a.replace(/^res:\/\//, '').replace(/^apps\/game\//, '');
      if (!/^test\/([\w-]+\/)*test_[\w-]+\.gd$/.test(rel))
        throw new Error(`"${a}" is not a test_*.gd file under apps/game/test`);
      return `res://${rel}`;
    });
}

/**
 * @param {'import' | 'test' | 'smoke' | 'playthrough'} task
 * @param {string[]} [selection] res:// test scripts to run instead of the whole of res://test
 * @returns {string[]}
 */
export function godotArgs(task, selection = []) {
  switch (task) {
    case 'import':
      return [...BASE, '--import'];
    case 'test':
      return [
        ...BASE,
        '-s',
        'res://addons/gut/gut_cmdln.gd',
        ...(selection.length > 0
          ? [`-gtest=${selection.join(',')}`]
          : ['-gdir=res://test', '-ginclude_subdirs']),
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
 * What a passing run prints: GUT's totals block (from `Totals` to the `---- … ----` verdict) for `test`, the
 * OK line for a smoke task, or the whole output when neither is found.
 * @param {'test' | 'smoke' | 'playthrough'} task
 * @param {string} text Godot's combined stdout and stderr
 * @returns {string}
 */
export function passSummary(task, text) {
  const lines = stripAnsi(text).split(/\r?\n/);
  const ok = okLine(task);
  if (ok !== null) return lines.some((l) => l.trim() === ok) ? ok : text;
  const start = lines.findIndex((l) => l.trim() === 'Totals');
  if (start < 0) return text;
  const end = lines.findIndex((l, i) => i > start && /^---- .+ ----$/.test(l.trim()));
  return lines
    .slice(start, end < 0 ? undefined : end + 1)
    .join('\n')
    .trim();
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

const VERBOSE = process.env.GAME_VERBOSE === '1';

/** @param {string[]} args */
function run(bin, args) {
  return spawnSync(bin, args, { stdio: 'inherit' }).status ?? 1;
}

/**
 * Runs Godot quietly: its output is printed only when it fails (or with GAME_VERBOSE=1).
 * @param {string} bin
 * @param {string[]} args
 * @returns {number}
 */
function runQuiet(bin, args) {
  if (VERBOSE) return run(bin, args);
  const r = spawnSync(bin, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const code = r.error ? 1 : (r.status ?? 1);
  if (code !== 0) {
    process.stdout.write(r.stdout ?? '');
    process.stderr.write(r.stderr ?? '');
    if (r.error) console.error(`Godot did not run: ${r.error.message}`);
  }
  return code;
}

/**
 * Runs Godot with its output piped (and echoed), then fails the run on any script error, for the
 * `test` task when GUT ran fewer scripts than there are `test_*.gd` files (a skipped script), and for a
 * smoke task when its OK line is missing.
 * @param {string} bin
 * @param {'test' | 'smoke' | 'playthrough'} task
 * @param {string[]} [selection] for `test`: only these res:// scripts
 * @returns {number}
 */
function runChecked(bin, task, selection = []) {
  const r = spawnSync(bin, godotArgs(task, selection), {
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const code = checkRun(task, selection, r.error ? 1 : (r.status ?? 1), text);
  if (VERBOSE || code !== 0) {
    process.stdout.write(r.stdout ?? '');
    process.stderr.write(r.stderr ?? '');
  } else {
    console.log(passSummary(task, text));
  }
  if (r.error) console.error(`Godot did not run: ${r.error.message}`);
  else if (code !== 0 && code !== r.status) console.error(failReason(task, selection, text));
  return code;
}

/**
 * Exit code of a finished run: Godot's own, or 1 when it exited 0 but the output shows a failure.
 * @param {'test' | 'smoke' | 'playthrough'} task
 * @param {string[]} selection
 * @param {number} status
 * @param {string} text
 * @returns {number}
 */
function checkRun(task, selection, status, text) {
  if (status !== 0) return status;
  return failReason(task, selection, text) === null ? 0 : 1;
}

/**
 * Why a run that exited 0 still failed, or null when it passed.
 * @param {'test' | 'smoke' | 'playthrough'} task
 * @param {string[]} selection
 * @param {string} text
 * @returns {string | null}
 */
function failReason(task, selection, text) {
  if (outputHasScriptErrors(text))
    return 'A Godot script failed to compile or load (see the errors above).';
  const ok = okLine(task);
  if (ok !== null && !text.split(/\r?\n/).some((line) => line.trim() === ok))
    return `Godot exited 0 but did not print "${ok}".`;
  if (task === 'test') {
    const ran = gutScriptCount(text);
    const want =
      selection.length > 0
        ? selection.length
        : countTestScripts(fileURLToPath(new URL('../apps/game/test', import.meta.url)));
    if (ran === null || ran < want)
      return `GUT ran ${String(ran ?? 'no')} scripts but ${String(want)} were expected.`;
  }
  return null;
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
  const imported = runQuiet(bin, godotArgs('import'));
  if (imported !== 0) return imported;
  if (task === 'shot') return run(bin, shotArgs(process.argv.slice(3)));
  if (task === 'smoke') {
    for (const t of SMOKE_TASKS) {
      const code = runChecked(bin, t);
      if (code !== 0) return code;
    }
    return 0;
  }
  if (task === 'test') {
    let selection;
    try {
      selection = gutSelection(process.argv.slice(3));
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      return 2;
    }
    return runChecked(bin, 'test', selection);
  }
  return runChecked(bin, 'playthrough');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
