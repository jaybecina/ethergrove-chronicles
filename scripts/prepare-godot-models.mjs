// Builds apps/game/assets/models from the web models: `pnpm game:models`.
// Godot 4.7.2 cannot import glTF that requires EXT_meshopt_compression or KHR_mesh_quantization (it fails
// silently), so each model is decoded, dequantized, pruned and welded with glTF Transform. Idempotent: every
// output is rebuilt from the web file, so a second run writes identical bytes.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(ROOT, 'node_modules/@gltf-transform/cli/bin/cli.js');

/**
 * One job per .glb in `srcDir`, written under the same name in `outDir`.
 * @param {string} srcDir
 * @param {string} outDir
 * @param {string[]} [names] file names in srcDir (default: read the directory)
 * @returns {{ src: string, out: string }[]}
 */
export function modelJobs(srcDir, outDir, names = readdirSync(srcDir)) {
  return names
    .filter((n) => n.endsWith('.glb'))
    .sort()
    .map((n) => ({ src: join(srcDir, n), out: join(outDir, n) }));
}

/**
 * The glTF Transform CLI argument lists, in order: `copy` decodes meshopt, then the rest run in place.
 * @param {string} src
 * @param {string} out
 * @returns {string[][]}
 */
export function transformSteps(src, out) {
  return [
    ['copy', src, out],
    ['dequantize', out, out],
    ['prune', out, out],
    ['weld', out, out],
  ];
}

/** @returns {number} the number of models written */
export function main() {
  const srcDir = join(ROOT, 'apps/web/public/assets/models');
  const outDir = join(ROOT, 'apps/game/assets/models');
  mkdirSync(outDir, { recursive: true });
  const jobs = modelJobs(srcDir, outDir);
  for (const { src, out } of jobs) {
    for (const args of transformSteps(src, out)) {
      execFileSync(process.execPath, [CLI, ...args], { stdio: 'ignore' });
    }
  }
  console.log(`Prepared ${jobs.length} models in apps/game/assets/models`);
  return jobs.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
