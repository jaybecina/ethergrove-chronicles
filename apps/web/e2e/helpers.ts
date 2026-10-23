import { expect, type Page } from '@playwright/test';
import type { Command, GameEvent, GameState } from '@hearthvale/core';
import type {} from '../src/game/debugHook';

/** Fresh browser storage, then the title screen with the test hook ready. */
export async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('hearthvale');
      req.onsuccess =
        req.onerror =
        req.onblocked =
          () => {
            resolve();
          };
    });
  });
  await page.reload();
  await page.waitForFunction(() => window.__hearthvale !== undefined);
}

export async function newGame(page: Page, seed: number): Promise<void> {
  await boot(page);
  await page.evaluate((s) => {
    window.__hearthvale?.setSeed(s);
  }, seed);
  await expect(page.getByRole('tablist', { name: 'Hotbar' })).toBeVisible();
}

export const state = (page: Page): Promise<GameState> =>
  page.evaluate(() => {
    const s = window.__hearthvale?.getState();
    if (!s) throw new Error('no game');
    return s;
  });

export const act = (page: Page, cmd: Command): Promise<GameEvent[]> =>
  page.evaluate((c) => window.__hearthvale?.dispatch(c) ?? [], cmd);

/** Stand south of tile (x, y), facing it. */
export const faceTile = (page: Page, x: number, y: number): Promise<void> =>
  page.evaluate(
    ([tx, ty]) => {
      window.__hearthvale?.teleport('farm', tx + 0.5, ty + 1.5, 'n');
    },
    [x, y] as const,
  );

/** First field tile that is grass with walkable grass/path just south of it. */
export const findGrass = (page: Page): Promise<{ x: number; y: number }> =>
  page.evaluate(() => {
    const g = window.__hearthvale?.getState()?.maps.farm;
    if (!g) throw new Error('no farm');
    for (let y = 8; y < 16; y++)
      for (let x = 4; x < 27; x++) {
        const t = g.tiles[y * g.width + x];
        const below = g.tiles[(y + 1) * g.width + x];
        if (t?.kind === 'grass' && (below?.kind === 'grass' || below?.kind === 'path'))
          return { x, y };
      }
    throw new Error('no grass tile');
  });

export const sleepNight = (page: Page): Promise<void> =>
  page.evaluate(() => {
    window.__hearthvale?.sleep();
  });
