import { expect, test } from '@playwright/test';
import { newGame, state } from './helpers';

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch layout only');

  test('touch controls are big enough and the stick walks the farmer', async ({ page }) => {
    await newGame(page, 3);
    const action = page.getByRole('button', { name: 'Use tool' });
    await expect(action).toBeVisible();
    for (const name of [
      'Use tool',
      'Interact',
      'Next tool',
      'Rotate camera left',
      'Rotate camera right',
      'Menu',
    ]) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(56);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
    }
    const start = (await state(page)).player;
    const zone = page.getByTestId('joystick-zone');
    const box = await zone.boundingBox();
    if (!box) throw new Error('no joystick zone');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await zone.dispatchEvent('pointerdown', {
      pointerId: 7,
      clientX: cx,
      clientY: cy,
      isPrimary: true,
    });
    await zone.dispatchEvent('pointermove', {
      pointerId: 7,
      clientX: cx,
      clientY: cy - 60,
      isPrimary: true,
    });
    await expect
      .poll(async () => (await state(page)).player.z, { timeout: 15_000 })
      .toBeLessThan(start.z - 0.5);
    await zone.dispatchEvent('pointerup', { pointerId: 7, clientX: cx, clientY: cy - 60 });
  });

  test('no horizontal scroll in portrait or landscape', async ({ page }) => {
    await newGame(page, 3);
    for (const size of [
      { width: 375, height: 812 },
      { width: 812, height: 375 },
    ]) {
      await page.setViewportSize(size);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.getByRole('tablist', { name: 'Hotbar' })).toBeInViewport();
    }
  });

  test('goal card fits on a phone at text size 1.5', async ({ page }) => {
    await newGame(page, 3, { lessons: true });
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('radio', { name: '150%' }).check();
    await page.getByRole('button', { name: 'Resume' }).first().click();
    const card = page.locator('.goal-card');
    // The card opens by itself when the farm shows and closes after 8 s; open it if closed.
    const head = card.getByRole('button').first();
    if ((await head.getAttribute('aria-expanded')) === 'false') await head.click();
    await expect(card.locator('.goal-body')).toBeVisible();
    const box = await card.boundingBox();
    const hotbar = await page.getByRole('tablist', { name: 'Hotbar' }).boundingBox();
    const stick = await page.getByTestId('joystick-zone').boundingBox();
    const vp = page.viewportSize();
    if (!box || !hotbar || !vp) throw new Error('missing layout');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThan(hotbar.y);
    if (stick) expect(box.y + box.height).toBeLessThanOrEqual(stick.y + stick.height / 2);
  });
});
