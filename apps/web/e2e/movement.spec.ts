import { expect, test, type Page } from '@playwright/test';
import { newGame } from './helpers';

test.skip(({ isMobile }) => isMobile, 'keyboard movement');

/** Position and simulated play time read in ONE call, so no frame can run between them. */
const sample = (page: Page) =>
  page.evaluate(() => ({
    x: window.__hearthvale?.getState()?.player.x ?? 0,
    t: window.__hearthvale?.playTimeMs() ?? 0,
  }));

/** Hold keys and return tiles moved per simulated second (independent of the test machine's frame rate). */
async function eastSpeed(page: Page, run: boolean): Promise<number> {
  await page.evaluate(() => {
    window.__hearthvale?.teleport('farm', 4.5, 22.5, 'e');
  });
  // Wait until the loop is actually stepping (shader compiles can stall the first frames).
  const warm = (await sample(page)).t;
  await expect
    .poll(async () => (await sample(page)).t, { timeout: 30_000 })
    .toBeGreaterThan(warm + 200);
  if (run) await page.keyboard.down('Shift');
  await page.keyboard.down('KeyD');
  // Start measuring once the farmer is moving, so key-press latency is not counted.
  await expect.poll(async () => (await sample(page)).x, { timeout: 30_000 }).toBeGreaterThan(4.6);
  const a = await sample(page);
  await expect
    .poll(async () => (await sample(page)).t, { timeout: 30_000 })
    .toBeGreaterThan(a.t + 800);
  const b = await sample(page);
  await page.keyboard.up('KeyD');
  if (run) await page.keyboard.up('Shift');
  return (b.x - a.x) / ((b.t - a.t) / 1000);
}

test('walking is the default (2.6 tiles/s) and Shift runs (4.6 tiles/s)', async ({ page }) => {
  await newGame(page, 4);
  expect(await eastSpeed(page, false)).toBeCloseTo(2.6, 1);
  expect(await eastSpeed(page, true)).toBeCloseTo(4.6, 1);
});
