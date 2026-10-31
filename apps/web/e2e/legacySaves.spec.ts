import { createNewGame, makeSaveFile } from '@ethergrove/core';
import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers';

// Hearthvale saves carry over to Ethergrove in a real browser (Ethergrove Chronicles spec §3.4).
// The import opens the old database without creating it, which depends on the browser engine.

const BLANK = '/__e2e-blank';

/** Fresh storage with a Hearthvale-era save in slot 1, on a blank same-origin page. */
async function seedHearthvaleSave(page: Page, save: unknown): Promise<void> {
  await page.route(BLANK, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>blank</title>' }),
  );
  await page.goto(BLANK);
  await page.unroute(BLANK);
  await page.evaluate(async (file) => {
    localStorage.clear();
    localStorage.setItem(
      'ethergrove:settings',
      JSON.stringify({ settingsVersion: 2, quality: 'medium' }),
    );
    const run = (req: IDBRequest | IDBOpenDBRequest) =>
      new Promise<void>((resolve) => {
        req.onsuccess = req.onerror = () => {
          resolve();
        };
      });
    for (const name of ['ethergrove', 'hearthvale']) await run(indexedDB.deleteDatabase(name));
    const open = indexedDB.open('hearthvale', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('saves');
    await run(open);
    const db = open.result;
    const tx = db.transaction('saves', 'readwrite');
    tx.objectStore('saves').put(file, 'slot:1');
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => {
        resolve();
      };
    });
    db.close();
  }, save);
}

test('a Hearthvale save shows up on the Ethergrove title screen', async ({ page }) => {
  const game = createNewGame({ seed: 5, farmName: 'Oldfield', playerName: 'Ari' });
  await seedHearthvaleSave(page, makeSaveFile(game, 60_000, new Date(0)));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continue Oldfield' })).toBeVisible();
});

test('a new player gets no leftover Hearthvale database', async ({ page }) => {
  await boot(page);
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name)))
    .toContain('ethergrove');
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(names).not.toContain('hearthvale');
});
