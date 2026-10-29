import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { boot, faceTile, newGame } from './helpers';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).exclude('canvas').analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  // Measure settled UI, not panels mid-animation.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('title, slots and new game screens', async ({ page }) => {
  await boot(page);
  await expect(page.getByRole('heading', { name: 'Ethergrove Chronicles' })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByText('Choose a slot for your farm')).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Start here' }).first().click();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('pause, cart and bin', async ({ page }) => {
  await newGame(page, 5);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Resume' }).first().click();

  await page.evaluate(() => {
    window.__ethergrove?.skipMinutes(200);
    window.__ethergrove?.teleport('farm', 30.5, 17.5, 'e');
  });
  await page.keyboard.press('KeyF');
  await expect(page.getByRole('dialog', { name: "Sol's cart" })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Close' }).click();

  await faceTile(page, 7, 4);
  await page.keyboard.press('KeyF');
  await expect(page.getByRole('dialog', { name: 'Shipping bin' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('lesson goal card and Journal tab', async ({ page }) => {
  await newGame(page, 5, { lessons: true });
  await expect(page.locator('.goal-card .goal-body')).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Journal' }).click();
  await expect(page.getByRole('list', { name: 'Lessons' })).toBeVisible();
  await expectNoSeriousViolations(page);
});
