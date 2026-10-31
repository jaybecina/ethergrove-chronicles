import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';

const appDir = fileURLToPath(new URL('..', import.meta.url));

test.beforeAll(() => {
  const built = ['dist/main.js', 'web/index.html'].every((f) => existsSync(path.join(appDir, f)));
  if (!built) throw new Error('Run `pnpm --filter desktop build` before the desktop e2e.');
});

let userData = '';
test.beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), 'ethergrove-desktop-'));
});
test.afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

const launch = (): Promise<ElectronApplication> =>
  electron.launch({
    args: [appDir],
    cwd: appDir,
    env: { ...process.env, ETHERGROVE_USER_DATA: userData },
  });

test('boots to the title screen on WebGL 2 with no errors', async () => {
  const app = await launch();
  const errors: string[] = [];
  const page = await app.firstWindow();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  expect(page.url()).toBe('app://ethergrove/');
  await expect(page.getByRole('heading', { name: 'Ethergrove Chronicles' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  expect(await page.title()).toBe('Ethergrove Chronicles');
  expect(
    await page.evaluate(() => document.createElement('canvas').getContext('webgl2') !== null),
  ).toBe(true);
  // The title showcase is the 3D farm: wait for its canvas, models and music to load.
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(3000);
  expect(errors).toEqual([]);
  await app.close();
});

test('serves only the game: no traversal, no new windows, no outside navigation', async () => {
  const app = await launch();
  const page = await app.firstWindow();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();

  const status = await page.evaluate(async () => {
    const r = await fetch('app://ethergrove/..%2fpackage.json');
    return r.status;
  });
  expect(status).toBe(404);
  const csp = await page.evaluate(async () => {
    const r = await fetch('app://ethergrove/');
    return r.headers.get('content-security-policy');
  });
  expect(csp).toContain("default-src 'self'");

  expect(await page.evaluate(() => window.open('https://example.com') === null)).toBe(true);
  expect(app.windows()).toHaveLength(1);

  await page.evaluate(() => {
    location.href = 'https://example.com/';
  });
  await page.waitForTimeout(1000);
  expect(page.url()).toBe('app://ethergrove/');
  await app.close();
});

test('settings and saves survive a restart', async () => {
  const first = await launch();
  const page = await first.firstWindow();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  await page.evaluate(async () => {
    localStorage.setItem('ethergrove:settings', JSON.stringify({ quality: 'lite' }));
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('desktop-smoke', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        const tx = req.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put('kept', 'farm');
        tx.oncomplete = () => {
          req.result.close();
          resolve();
        };
        tx.onerror = () => {
          reject(new Error('write failed'));
        };
      };
      req.onerror = () => {
        reject(new Error('open failed'));
      };
    });
  });
  await first.close();

  const second = await launch();
  const again = await second.firstWindow();
  await expect(again.getByRole('button', { name: 'New game' })).toBeVisible();
  const kept = await again.evaluate(async () => {
    const settings = localStorage.getItem('ethergrove:settings');
    const farm = await new Promise<unknown>((resolve, reject) => {
      const req = indexedDB.open('desktop-smoke', 1);
      req.onsuccess = () => {
        const get = req.result.transaction('kv').objectStore('kv').get('farm');
        get.onsuccess = () => {
          req.result.close();
          resolve(get.result);
        };
      };
      req.onerror = () => {
        reject(new Error('open failed'));
      };
    });
    return { settings, farm };
  });
  expect(kept).toEqual({ settings: JSON.stringify({ quality: 'lite' }), farm: 'kept' });
  await second.close();
});
