import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers';

test.skip(({ isMobile }) => isMobile, 'desktop layout only; phones run devices and a11y specs');

const LABELS = [
  'Automatic (recommended)',
  'High (stronger GPUs)',
  'Medium',
  'Low (older or built-in graphics)',
];

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
}

test('Graphics lists Automatic, High, Medium and Low, with Medium chosen', async ({ page }) => {
  await boot(page);
  await openSettings(page);
  const radios = page.getByRole('group', { name: 'Graphics' }).getByRole('radio');
  await expect(radios).toHaveCount(4);
  for (const [i, label] of LABELS.entries())
    await expect(radios.nth(i)).toHaveAccessibleName(label);
  await expect(page.getByRole('radio', { name: 'Medium' })).toBeChecked();
});

test('a chosen preset survives a reload', async ({ page }) => {
  await boot(page);
  await openSettings(page);
  await page.getByRole('radio', { name: 'Low (older or built-in graphics)' }).check();
  await page.reload();
  await openSettings(page);
  await expect(page.getByRole('radio', { name: 'Low (older or built-in graphics)' })).toBeChecked();
});

test('an old Lowest choice opens as Low and is saved with the version', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem('ethergrove:settings', JSON.stringify({ quality: 'lite' }));
  });
  await page.reload();
  await openSettings(page);
  await expect(page.getByRole('radio', { name: 'Low (older or built-in graphics)' })).toBeChecked();
  const stored = await page.evaluate(() => localStorage.getItem('ethergrove:settings'));
  expect(JSON.parse(stored ?? '{}')).toMatchObject({ settingsVersion: 2, quality: 'low' });
});
