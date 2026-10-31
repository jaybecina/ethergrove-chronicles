import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTENT_SECURITY_POLICY,
  START_URL,
  allowPermission,
  isAppUrl,
  menuTemplate,
  mimeFor,
  readMacSigned,
  releasePageUrl,
  resolveAppPath,
  responseHeaders,
  updateMode,
} from './policy.js';

const root = path.resolve('/game/web');

describe('resolveAppPath', () => {
  it('serves index.html at the start URL, ignoring the query', () => {
    expect(START_URL).toBe('app://ethergrove/');
    expect(resolveAppPath('app://ethergrove/', root)).toBe(path.join(root, 'index.html'));
    expect(resolveAppPath('app://ethergrove/?perf-off=all', root)).toBe(
      path.join(root, 'index.html'),
    );
  });

  it('maps asset paths into the web folder and decodes them', () => {
    expect(resolveAppPath('app://ethergrove/assets/index-abc.js', root)).toBe(
      path.join(root, 'assets', 'index-abc.js'),
    );
    expect(resolveAppPath('app://ethergrove/assets/music/a%20b.m4a', root)).toBe(
      path.join(root, 'assets', 'music', 'a b.m4a'),
    );
  });

  it('never leaves the web folder', () => {
    expect(resolveAppPath('app://ethergrove/..%2fpackage.json', root)).toBeNull();
    expect(resolveAppPath('app://ethergrove/assets/..%2f..%2f..%2fetc/passwd', root)).toBeNull();
    expect(resolveAppPath('app://ethergrove/%2e%2e%5c..%5csecret', root)).toBeNull();
    expect(resolveAppPath('app://ethergrove/bad%00name', root)).toBeNull();
    expect(resolveAppPath('app://ethergrove/%E0%A4%A', root)).toBeNull();
  });

  it('rejects other hosts and schemes', () => {
    expect(resolveAppPath('app://evil/index.html', root)).toBeNull();
    expect(resolveAppPath('https://ethergrove/index.html', root)).toBeNull();
    expect(resolveAppPath('not a url', root)).toBeNull();
  });
});

describe('responses', () => {
  it('names the MIME type of every file the game ships', () => {
    expect(mimeFor('index.html')).toBe('text/html; charset=utf-8');
    expect(mimeFor('a.js')).toBe('text/javascript; charset=utf-8');
    expect(mimeFor('a.css')).toBe('text/css; charset=utf-8');
    expect(mimeFor('a.json')).toBe('application/json');
    expect(mimeFor('tree.glb')).toBe('model/gltf-binary');
    expect(mimeFor('theme.m4a')).toBe('audio/mp4');
    expect(mimeFor('font.woff2')).toBe('font/woff2');
    expect(mimeFor('decoder.wasm')).toBe('application/wasm');
    expect(mimeFor('leaf.PNG')).toBe('image/png');
    expect(mimeFor('mystery.xyz')).toBe('application/octet-stream');
  });

  it('locks content to the app with a strict CSP', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self' 'wasm-unsafe-eval';");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:/);
    expect(responseHeaders('/game/web/index.html')).toEqual({
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': CONTENT_SECURITY_POLICY,
      'x-content-type-options': 'nosniff',
    });
  });
});

describe('navigation and permissions', () => {
  it('only the app origin may load', () => {
    expect(isAppUrl('app://ethergrove/')).toBe(true);
    expect(isAppUrl('app://ethergrove/index.html#x')).toBe(true);
    expect(isAppUrl('app://other/')).toBe(false);
    expect(isAppUrl('https://example.com/')).toBe(false);
    expect(isAppUrl('file:///etc/passwd')).toBe(false);
    expect(isAppUrl('garbage')).toBe(false);
  });

  it('grants fullscreen and nothing else', () => {
    expect(allowPermission('fullscreen')).toBe(true);
    for (const p of ['media', 'geolocation', 'notifications', 'clipboard-read', 'openExternal'])
      expect(allowPermission(p)).toBe(false);
  });
});

describe('menuTemplate', () => {
  const roles = (t: ReturnType<typeof menuTemplate>) =>
    t.flatMap((m) =>
      [m.role, ...(Array.isArray(m.submenu) ? m.submenu.map((s) => s.role) : [])].filter(Boolean),
    );

  it('macOS gets the app, edit, view and window menus', () => {
    const r = roles(menuTemplate('darwin', false));
    expect(r).toEqual(
      expect.arrayContaining(['appMenu', 'editMenu', 'togglefullscreen', 'windowMenu']),
    );
    expect(r).not.toContain('reload');
    expect(r).not.toContain('toggleDevTools');
  });

  it('Windows gets one View menu with full screen on F11', () => {
    const t = menuTemplate('win32', false);
    expect(t).toHaveLength(1);
    expect(t[0]?.label).toBe('View');
    const full = Array.isArray(t[0]?.submenu) ? t[0].submenu[0] : undefined;
    expect(full).toMatchObject({ role: 'togglefullscreen', accelerator: 'F11' });
  });

  it('unpackaged runs add reload and developer tools', () => {
    for (const platform of ['darwin', 'win32'] as const) {
      const r = roles(menuTemplate(platform, true));
      expect(r).toContain('reload');
      expect(r).toContain('toggleDevTools');
    }
  });
});

describe('updates (auto-update spec §5.1)', () => {
  it.each([
    ['win32', false, false, false, 'off'],
    ['win32', true, false, true, 'off'],
    ['win32', true, false, false, 'install'],
    ['darwin', true, true, false, 'install'],
    ['darwin', true, false, false, 'notify'],
    ['linux', true, false, false, 'off'],
  ] as const)(
    '%s packaged=%s signed=%s disabled=%s → %s',
    (platform, packaged, macSigned, disabled, expected) => {
      expect(updateMode({ platform, packaged, macSigned, disabled })).toBe(expected);
    },
  );

  it('links to the release page of a version', () => {
    expect(releasePageUrl('0.2.0')).toBe(
      'https://github.com/jaybecina/ethergrove-chronicles/releases/tag/v0.2.0',
    );
  });

  it('only a boolean true in the packaged package.json means Developer ID signed', () => {
    expect(readMacSigned({ ethergroveMacSigned: true })).toBe(true);
    for (const bad of [{}, { ethergroveMacSigned: 'true' }, null, 'x'])
      expect(readMacSigned(bad), JSON.stringify(bad)).toBe(false);
  });
});
