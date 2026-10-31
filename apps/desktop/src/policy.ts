// Pure security and serving rules for the desktop app (desktop spec §3.3). No Electron runtime imports,
// so Vitest covers every rule; main.ts only wires them to Electron.
import path from 'node:path';
import type { MenuItemConstructorOptions } from 'electron';

export const APP_SCHEME = 'app';
export const APP_HOST = 'ethergrove';
export const START_URL = `${APP_SCHEME}://${APP_HOST}/`;

/**
 * The file under `root` that an `app://ethergrove/<path>` URL names, or null when the URL is for another
 * scheme or host, cannot be decoded, or would leave `root`. `/` is `index.html`; the query is ignored.
 */
export function resolveAppPath(url: string, root: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== `${APP_SCHEME}:` || parsed.host !== APP_HOST) return null;
  let pathname: string;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  const back = path.relative(root, file);
  if (back === '' || back.startsWith('..') || path.isAbsolute(back)) return null;
  return file;
}

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ktx2': 'image/ktx2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

export function mimeFor(file: string): string {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

// `wasm-unsafe-eval` lets the meshopt glTF decoder compile; inline styles only, never inline scripts.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export function responseHeaders(file: string): Record<string, string> {
  return {
    'content-type': mimeFor(file),
    'content-security-policy': CONTENT_SECURITY_POLICY,
    'x-content-type-options': 'nosniff',
  };
}

/** True for the game's own origin; every other navigation is cancelled. */
export function isAppUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === `${APP_SCHEME}:` && u.host === APP_HOST;
  } catch {
    return false;
  }
}

/** The only web permission the game uses. */
export function allowPermission(permission: string): boolean {
  return permission === 'fullscreen';
}

/** The app menu: what a game needs, plus reload and dev tools in unpackaged runs. */
export function menuTemplate(
  platform: NodeJS.Platform,
  dev: boolean,
): MenuItemConstructorOptions[] {
  const devItems: MenuItemConstructorOptions[] = dev
    ? [{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }]
    : [];
  if (platform === 'darwin')
    return [
      { role: 'appMenu' },
      { role: 'editMenu' },
      { label: 'View', submenu: [{ role: 'togglefullscreen' }, ...devItems] },
      { role: 'windowMenu' },
    ];
  return [
    {
      label: 'View',
      submenu: [{ role: 'togglefullscreen', accelerator: 'F11' }, ...devItems],
    },
  ];
}
