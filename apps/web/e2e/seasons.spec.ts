import { expect, test } from '@playwright/test';
import { newGame, sleepNight, state } from './helpers';

test.skip(({ isMobile }) => isMobile, 'desktop only');

test('a full year turns through every season', async ({ page }, info) => {
  test.setTimeout(180_000);
  await newGame(page, 11);
  for (const season of ['Spring', 'Summer', 'Fall', 'Winter'] as const) {
    await expect(page.locator('.clock-date')).toContainText(season);
    await page.evaluate(() => {
      window.__hearthvale?.teleport('farm', 16.5, 19.5, 'n');
      window.__hearthvale?.skipMinutes(330);
    });
    await page.waitForTimeout(1500);
    await info.attach(`${season.toLowerCase()}.png`, {
      body: await page.locator('canvas').screenshot(),
      contentType: 'image/png',
    });
    for (let d = 0; d < 28; d++) await sleepNight(page);
    await page.keyboard.press('Escape');
  }
  expect((await state(page)).calendar).toMatchObject({ year: 2, season: 'spring', day: 1 });
});
