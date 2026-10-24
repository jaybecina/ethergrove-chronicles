import { expect, test, type Page } from '@playwright/test';
import { newGame, state } from './helpers';

test.skip(({ isMobile }) => isMobile, 'keyboard movement');

const playTime = (page: Page) => page.evaluate(() => window.__hearthvale?.playTimeMs() ?? 0);

/** Hold keys and return tiles moved per simulated second (independent of the test machine's frame rate). */
async function eastSpeed(page: Page, run: boolean): Promise<number> {
  await page.evaluate(() => {
    window.__hearthvale?.teleport('farm', 4.5, 22.5, 'e');
  });
  // Wait until the loop is actually stepping (shader compiles can stall the first frames).
  const warm = await playTime(page);
  await expect.poll(() => playTime(page), { timeout: 30_000 }).toBeGreaterThan(warm + 200);
  if (run) await page.keyboard.down('Shift');
  await page.keyboard.down('KeyD');
  const x0 = (await state(page)).player.x;
  const t0 = await playTime(page);
  await expect.poll(() => playTime(page), { timeout: 30_000 }).toBeGreaterThan(t0 + 800);
  const x1 = (await state(page)).player.x;
  const t1 = await playTime(page);
  await page.keyboard.up('KeyD');
  if (run) await page.keyboard.up('Shift');
  return (x1 - x0) / ((t1 - t0) / 1000);
}

test('walking is the default (2.6 tiles/s) and Shift runs (4.6 tiles/s)', async ({ page }) => {
  await newGame(page, 4);
  expect(await eastSpeed(page, false)).toBeCloseTo(2.6, 0);
  expect(await eastSpeed(page, true)).toBeCloseTo(4.6, 0);
});
