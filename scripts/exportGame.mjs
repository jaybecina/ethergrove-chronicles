// Exports the Godot game for macOS, Windows and Web into apps/game/build/: `node scripts/exportGame.mjs`
// (M1 spec §9.1). The Web export uses a custom shell that shows the phone and tablet message; this script
// builds that shell from apps/game/web/shell.html and detect.mjs first. Needs Godot's export templates, which
// the owner installs once (M1 spec §11.1).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGodotBin } from './game.mjs';

const GODOT_VERSION_DIR = '4.7.2.stable';
const SHELL_MARKER = '/*DETECT_UNSUPPORTED*/';

export const EXPORT_PRESETS = [
  { name: 'macOS', output: 'apps/game/build/macos/Ethergrove.zip' },
  { name: 'Windows Desktop', output: 'apps/game/build/windows/Ethergrove.exe' },
  { name: 'Web', output: 'apps/game/build/web/index.html' },
];

/**
 * The Web shell with detectUnsupported() inlined. The export copies only the shell file, and the shell runs as a
 * classic script, so the module's `export` keyword is removed.
 * @param {string} shell
 * @param {string} detectSource
 * @returns {string}
 */
export function buildShell(shell, detectSource) {
  if (!shell.includes(SHELL_MARKER)) throw new Error(`the shell has no ${SHELL_MARKER} marker`);
  const classic = detectSource.replace(/^export\s+/gm, '');
  return shell.replace(SHELL_MARKER, () => classic);
}

/**
 * @param {{ name: string, output: string }} preset
 * @returns {string[]}
 */
export function exportArgs(preset) {
  return [
    '--headless',
    '--path',
    'apps/game',
    '--export-release',
    preset.name,
    preset.output.replace(/^apps\/game\//, ''),
  ];
}

/**
 * @param {string} home
 * @param {(p: string) => boolean} exists
 * @returns {boolean}
 */
export function templatesInstalled(home, exists) {
  const dirs = [
    join(home, 'Library/Application Support/Godot/export_templates', GODOT_VERSION_DIR),
    join(home, '.local/share/godot/export_templates', GODOT_VERSION_DIR),
  ];
  return dirs.some((d) => exists(d));
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  process.chdir(root);
  const bin = resolveGodotBin(process.env, process.platform, existsSync);
  if (!bin) {
    console.error('Godot not found. Set GODOT_BIN or install it.');
    process.exit(1);
  }
  if (!templatesInstalled(homedir(), existsSync)) {
    console.error(
      `Godot ${GODOT_VERSION_DIR} export templates are not installed (Editor > Manage Export Templates).`,
    );
    process.exit(1);
  }
  const web = 'apps/game/web';
  const shell = buildShell(
    readFileSync(`${web}/shell.html`, 'utf8'),
    readFileSync(`${web}/detect.mjs`, 'utf8'),
  );
  writeFileSync(`${web}/shell.generated.html`, shell);
  for (const preset of EXPORT_PRESETS) {
    mkdirSync(join(root, preset.output, '..'), { recursive: true });
    const r = spawnSync(bin, exportArgs(preset), { stdio: 'inherit' });
    if (r.status !== 0) {
      console.error(`Export "${preset.name}" failed.`);
      process.exit(r.status ?? 1);
    }
    console.log(`Exported ${preset.name} → ${preset.output}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
