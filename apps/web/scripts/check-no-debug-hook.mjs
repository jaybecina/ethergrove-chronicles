#!/usr/bin/env node
// Fails the build if the test-only window.__hearthvale hook leaked into production (spec §6.2).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Relative paths of built JS/HTML files that mention the debug hook. */
export function findDebugHook(distDir) {
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(js|mjs|html)$/.test(name) && readFileSync(path, 'utf8').includes('__hearthvale'))
        hits.push(relative(distDir, path));
    }
  };
  walk(distDir);
  return hits.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? 'dist';
  const hits = findDebugHook(dist);
  if (hits.length > 0) {
    console.error(`Debug hook found in production build: ${hits.join(', ')}`);
    process.exit(1);
  }
  console.log('No debug hook in the production build.');
}
