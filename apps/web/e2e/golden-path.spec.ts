import { expect, test } from '@playwright/test';
import { act, faceTile, findGrass, newGame, sleepNight, state } from './helpers';

test('till, plant, water, grow, harvest, ship, earn, and continue after reload', async ({
  page,
}) => {
  await newGame(page, 7);
  const { x, y } = await findGrass(page);
  await faceTile(page, x, y);

  // Real keyboard input for the first actions proves the input → loop → core wiring.
  await page.keyboard.press('Space');
  await expect
    .poll(async () => (await state(page)).maps.farm.tiles[y * 32 + x]?.kind)
    .toBe('tilled');
  await page.keyboard.press('Digit6');
  await expect.poll(async () => (await state(page)).activeSlot).toBe(5);
  await page.keyboard.press('KeyF');
  await expect
    .poll(async () => (await state(page)).maps.farm.tiles[y * 32 + x]?.crop?.id)
    .toBe('turnip');

  const water = async () => {
    await faceTile(page, x, y);
    await act(page, { type: 'selectHotbar', index: 1 });
    await act(page, { type: 'useTool' });
  };
  await water();
  for (let night = 0; night < 4; night++) {
    await sleepNight(page);
    if (night < 3) await water();
  }
  // Nothing was shipped yet, so no sales report interrupts the morning.
  await expect(page.getByRole('dialog', { name: "Yesterday's sales" })).toHaveCount(0);

  await faceTile(page, x, y);
  const harvest = await act(page, { type: 'interact' });
  expect(harvest.map((e) => e.type)).toContain('cropHarvested');
  const bagIndex = (await state(page)).bag.findIndex((c) => c?.id === 'turnip');
  await act(page, { type: 'shipItem', bagIndex, qty: 1 });
  await sleepNight(page);

  await expect(page.getByRole('dialog', { name: "Yesterday's sales" })).toBeVisible();
  const before = await state(page);
  expect(before.gold).toBe(535);
  await page.getByRole('button', { name: 'Start the day' }).click();

  await page.reload();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(page.getByRole('tablist', { name: 'Hotbar' })).toBeVisible();
  const after = await state(page);
  expect(after.calendar).toEqual(before.calendar);
  expect(after.gold).toBe(before.gold);
  expect(after.bag).toEqual(before.bag);
});
