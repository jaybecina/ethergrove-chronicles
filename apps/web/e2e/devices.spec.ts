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
});
