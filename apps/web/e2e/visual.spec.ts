import { expect, test } from '@playwright/test';
import { boot, newGame } from './helpers';

test.skip(
  ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
  'baselines are Chromium desktop only',
);
// Baselines are rendered on macOS; Linux CI fonts differ, so CI regenerates them only on demand.
test.skip(!!process.env.CI, 'visual baselines are checked locally');

// The 3D view is full-screen and GPU-dependent, so it is hidden (not masked: a mask would cover the UI too).
const HIDE_3D =
  'canvas { visibility: hidden !important; } body, #root { background: #6b7f5a !important; }';

const opts = (page: import('@playwright/test').Page) => ({
  animations: 'disabled' as const,
  mask: [page.locator('.clock-time'), page.locator('.dial'), page.locator('.toasts')],
  maxDiffPixelRatio: 0.02,
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('load', () => {
    void page.addStyleTag({ content: HIDE_3D });
  });
});

test('title screen', async ({ page }) => {
  await boot(page);
  await expect(page.getByRole('heading', { name: 'Hearthvale' })).toBeVisible();
  await expect(page).toHaveScreenshot('title.png', opts(page));
});

test('pause menu and cart', async ({ page }) => {
  await newGame(page, 5);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('pause.png', opts(page));
  await page.getByRole('button', { name: 'Resume' }).first().click();
  await page.evaluate(() => {
    window.__hearthvale?.skipMinutes(200);
    window.__hearthvale?.teleport('farm', 30.5, 17.5, 'e');
  });
  await page.keyboard.press('KeyF');
  await expect(page.getByRole('dialog', { name: "Sol's cart" })).toBeVisible();
  await expect(page).toHaveScreenshot('cart.png', opts(page));
});
