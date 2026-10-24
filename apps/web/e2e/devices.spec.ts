import { expect, test } from '@playwright/test';
import { act, newGame, state } from './helpers';

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

  test('lesson cards clear the stamina bar, fit, and stay tappable over the joystick', async ({
    page,
  }) => {
    await newGame(page, 3, { lessons: true });
    const fits = async (size: { width: number; height: number }) => {
      const column = await page.locator('.hud-lessons').boundingBox();
      const stamina = await page.locator('.hud-stamina').boundingBox();
      if (!column || !stamina) throw new Error('missing layout');
      expect(column.y).toBeGreaterThanOrEqual(stamina.y + stamina.height);
      expect(column.y + column.height).toBeLessThanOrEqual(size.height);
    };
    // Landscape is the tight case: the joystick zone covers the lower-left of the screen.
    const landscape = { width: 812, height: 375 };
    await page.setViewportSize(landscape);
    // 6 AM: the cart is closed, so buying queues a note above the goal card (it lasts 10 s).
    await act(page, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
    const gotIt = page.locator('.note-card').getByRole('button', { name: 'Got it' });
    await gotIt.scrollIntoViewIfNeeded();
    const b = await gotIt.boundingBox();
    if (!b) throw new Error('no Got it');
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('.note-card') !== null,
      [b.x + b.width / 2, b.y + b.height / 2] as const,
    );
    expect(hit).toBe(true);
    await fits(landscape);
    const portrait = { width: 375, height: 667 };
    await page.setViewportSize(portrait);
    await fits(portrait);
  });
});
