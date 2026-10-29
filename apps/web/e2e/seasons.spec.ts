import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { newGame, sleepNight, state } from './helpers';

test.skip(({ isMobile }) => isMobile, 'desktop only');

test('a full year turns through every season', async ({ page }, info) => {
  test.setTimeout(600_000);
  await newGame(page, 11);
  for (const season of ['Spring', 'Summer', 'Fall', 'Winter'] as const) {
    await expect(page.locator('.clock-date')).toContainText(season);
    await page.evaluate(() => {
      window.__ethergrove?.teleport('farm', 9.5, 7.5, 's');
      window.__ethergrove?.skipMinutes(260);
    });
    await page.waitForTimeout(process.env.SAVE_MEDIA ? 12_000 : 1500);
    const shot = await page.screenshot();
    await info.attach(`${season.toLowerCase()}.png`, { body: shot, contentType: 'image/png' });
    if (process.env.SAVE_MEDIA && info.project.name === 'chromium')
      writeFileSync(
        join(import.meta.dirname, '../../../docs/media', `${season.toLowerCase()}.png`),
        shot,
      );
    for (let d = 0; d < 28; d++) await sleepNight(page);
  }
  expect((await state(page)).calendar).toMatchObject({ year: 2, season: 'spring', day: 1 });
});
