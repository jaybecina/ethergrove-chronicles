#!/usr/bin/env node
// Renders build/icon.svg to the 1024 × 1024 build/icon.png that electron-builder turns into the
// macOS .icns and Windows .ico (desktop spec §3.2). Run after changing the SVG: `pnpm --filter desktop icon`.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const svg = fileURLToPath(new URL('../build/icon.svg', import.meta.url));
const png = fileURLToPath(new URL('../build/icon.png', import.meta.url));
await sharp(svg, { density: 300 }).resize(1024, 1024).png().toFile(png);
console.log(`Wrote ${png}`);
