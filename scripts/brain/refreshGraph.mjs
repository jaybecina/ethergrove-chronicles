#!/usr/bin/env node
// Rebuilds the Graphify code map in the background (~2 s, no LLM). Never blocks or fails the caller:
// it is a no-op when graphify is not installed or another refresh is still running.
// Run directly by the Husky post-commit, post-merge and post-checkout hooks, and imported by hook.mjs.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCK_MAX_AGE_MS = 60_000;

/** @param {string} root repo root */
export function refreshGraph(root) {
  try {
    if (spawnSync('graphify', ['--help'], { stdio: 'ignore' }).error) return;
    const out = join(root, 'graphify-out');
    const lock = join(out, '.refresh.lock');
    if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs < LOCK_MAX_AGE_MS) return;
    mkdirSync(out, { recursive: true });
    const child = spawn(
      'sh',
      ['-c', 'touch "$1"; graphify update . >/dev/null 2>&1; rm -f "$1"', 'refresh', lock],
      { cwd: root, detached: true, stdio: 'ignore' },
    );
    child.unref();
  } catch {
    // The map is a convenience; a failed refresh must never break a commit or a session.
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  refreshGraph(resolve(fileURLToPath(import.meta.url), '../../..'));
}
