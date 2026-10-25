import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { act, boot, faceTile, findGrass, newGame, sleepNight, state } from './helpers';

test.skip(({ isMobile }) => isMobile, 'keyboard lessons; phones are covered in devices.spec');

const goal = (page: Page, title: string) =>
  expect(page.locator('.goal-card').getByRole('button', { name: new RegExp(title) })).toBeVisible();

test('Grandpa walks a new farmer from Day 1 to the first seed purchase', async ({ page }) => {
  test.setTimeout(240_000);
  await newGame(page, 7, { lessons: true });
  await goal(page, 'Walk to the field');

  // Walk north with real keys from the path below a field column whose first row is clear grass.
  const column = await page.evaluate(() => {
    const g = window.__hearthvale?.getState()?.maps.farm;
    if (!g) throw new Error('no farm');
    for (let x = 4; x < 27; x++) if (g.tiles[16 * g.width + x]?.kind === 'grass') return x;
    throw new Error('no open column');
  });
  await page.evaluate((x) => {
    window.__hearthvale?.teleport('farm', x + 0.5, 17.5, 'n');
  }, column);
  await page.keyboard.down('KeyW');
  await goal(page, 'Break some ground');
  await page.keyboard.up('KeyW');

  const tiles: { x: number; y: number }[] = [];
  const kindAt = async (t: { x: number; y: number }) =>
    (await state(page)).maps.farm.tiles[t.y * 32 + t.x];
  // Real keys for the first till, plant and water prove the wiring; act() after that, since the
  // action gate ignores presses that land during the previous swing.
  for (let i = 0; i < 3; i++) {
    const t = await findGrass(page);
    tiles.push(t);
    await faceTile(page, t.x, t.y);
    if (i === 0) await page.keyboard.press('Space');
    else await act(page, { type: 'useTool' });
    await expect.poll(async () => (await kindAt(t))?.kind).toBe('tilled');
  }
  await goal(page, 'Plant your turnips');

  for (const [i, t] of tiles.entries()) {
    await faceTile(page, t.x, t.y);
    if (i === 0) {
      await page.keyboard.press('Digit6');
      await expect.poll(async () => (await state(page)).activeSlot).toBe(5);
      await page.keyboard.press('KeyF');
    } else await act(page, { type: 'useItem' });
    await expect.poll(async () => (await kindAt(t))?.crop?.id).toBe('turnip');
  }
  await goal(page, 'Water the seedlings');

  const water = async (keys = false) => {
    for (const [i, t] of tiles.entries()) {
      await faceTile(page, t.x, t.y);
      if (keys && i === 0) {
        await page.keyboard.press('Digit2');
        await expect.poll(async () => (await state(page)).activeSlot).toBe(1);
        await page.keyboard.press('Space');
      } else {
        await act(page, { type: 'selectHotbar', index: 1 });
        await act(page, { type: 'useTool' });
      }
      await expect.poll(async () => (await kindAt(t))?.watered).toBe(true);
    }
  };
  await water(true);
  await goal(page, 'Rest for the night');

  await sleepNight(page);
  await goal(page, 'Water every morning');
  await water();
  await goal(page, 'Harvest a turnip');
  for (let night = 0; night < 3; night++) {
    await sleepNight(page);
    if (night < 2) await water();
  }

  const [ripe] = tiles;
  if (!ripe) throw new Error('no tile');
  await faceTile(page, ripe.x, ripe.y);
  await act(page, { type: 'interact' });
  await goal(page, 'Fill the shipping bin');

  const bagIndex = (await state(page)).bag.findIndex((c) => c?.id === 'turnip');
  await act(page, { type: 'shipItem', bagIndex, qty: 1 });
  await goal(page, 'Sleep on it');

  await sleepNight(page);
  await page.getByRole('button', { name: 'Start the day' }).click();
  await goal(page, 'Buy more seeds');

  await page.evaluate(() => {
    window.__hearthvale?.skipMinutes(240);
    window.__hearthvale?.teleport('farm', 30.5, 17.5, 'e');
  });
  await page.keyboard.press('KeyF');
  const cart = page.getByRole('dialog', { name: "Sol's cart" });
  await expect(cart).toBeVisible();
  const before = (await state(page)).gold;
  await cart.getByRole('button', { name: /Buy 1 Turnip Seeds/i }).click();
  // The completion panel waits for the cart to close.
  await expect(cart).toBeVisible();
  expect((await state(page)).gold).toBe(before - 20 + 100);
  await cart.getByRole('button', { name: 'Close' }).click();

  const done = page.getByRole('dialog', { name: 'The rest is yours' });
  await expect(done).toBeVisible();
  await expect(done.getByText('Tucked in the last page: 100 gold.')).toBeVisible();
  await done.getByRole('button', { name: 'Thanks, Grandpa' }).click();
  await expect(page.locator('.goal-card')).toHaveCount(0);
});

test('lessons can be skipped and started again from the Journal', async ({ page }) => {
  await newGame(page, 4, { lessons: true });
  await goal(page, 'Walk to the field');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Journal' }).click();
  await page.getByRole('button', { name: 'Skip lessons' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start lessons again' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).first().click();
  await expect(page.locator('.goal-card')).toHaveCount(0);
});

test('a farm started without lessons shows no goal card', async ({ page }) => {
  await newGame(page, 4);
  await expect(page.getByRole('tablist', { name: 'Hotbar' })).toBeVisible();
  await expect(page.locator('.goal-card')).toHaveCount(0);
});

test('a note shows once and Got it hides it', async ({ page }) => {
  await newGame(page, 4, { lessons: true });
  // 6 AM: the cart is closed, so buying triggers Grandpa's "Cart is closed" note.
  await act(page, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
  const note = page.locator('.note-card');
  await expect(note.getByText('Cart is closed')).toBeVisible();
  await note.getByRole('button', { name: 'Got it' }).click();
  await expect(note).toHaveCount(0);
  await act(page, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
  await expect(note).toHaveCount(0);
});

test('a Part 1 save loads with lessons off', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Load game' }).click();
  // Import only once the slot list has loaded.
  await expect(page.getByRole('heading', { name: 'Empty slot' }).first()).toBeVisible();
  await page
    .locator('input[type=file]')
    .setInputFiles(
      join(import.meta.dirname, '../../../packages/core/test/fixtures/part1-save-v1.json'),
    );
  await expect(page.getByText(/Imported into slot/)).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).first().click();
  await expect(page.getByRole('tablist', { name: 'Hotbar' })).toBeVisible();
  expect((await state(page)).tutorial.lesson).toBe('off');
  await expect(page.locator('.goal-card')).toHaveCount(0);
});
