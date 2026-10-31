#!/usr/bin/env node
// Copies the production web build (apps/web/dist) into apps/desktop/web for Electron to serve,
// without source maps (desktop spec §3.2). Run `pnpm build` at the repo root first.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../web/dist/', import.meta.url));
const to = fileURLToPath(new URL('../web/', import.meta.url));

if (!existsSync(`${from}index.html`)) {
  console.error(`No web build at ${from}. Run \`pnpm build\` at the repo root first.`);
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true, filter: (src) => !src.endsWith('.map') });
console.log(`Copied the web build into ${to}`);
