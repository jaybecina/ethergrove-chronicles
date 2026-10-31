import { expect, type Page } from '@playwright/test';
import type { Command, GameEvent, GameState } from '@ethergrove/core';
import type {} from '../src/game/debugHook';

const BLANK = '/__e2e-blank';

export interface BootOptions {
  /**
   * Turn every render cost off (`?perf-off=all`, spec §7.3) for specs that only check the UI. On SwiftShader the
   * farm draws about 1.5 frames a second, and every click waits for frames, so a long UI test outran CI's 90 s
   * timeout. The canvas still draws, at about 7 frames a second.
   */
  lean?: boolean;
}

/** Fresh browser storage, then the title screen with the test hook ready. */
export async function boot(page: Page, { lean = false }: BootOptions = {}): Promise<void> {
  // Clear storage on an empty same-origin page. Loading the game here would start model
  // downloads that the next navigation aborts ("GLTFLoader: Couldn't load texture").
  await page.route(BLANK, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>blank</title>' }),
  );
  await page.goto(BLANK);
  await page.unroute(BLANK);
  // Headless browsers render on a software GPU; the Low tier keeps frames fast enough for input-driven tests.
  // README screenshots (SAVE_MEDIA) use High.
  const quality = process.env.SAVE_MEDIA ? 'high' : 'low';
  await page.evaluate(async (q) => {
    localStorage.clear();
    localStorage.setItem('ethergrove:settings', JSON.stringify({ quality: q }));
    // Delete the legacy Hearthvale database too, so no test inherits saves through the import.
    for (const name of ['ethergrove', 'hearthvale']) {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess =
          req.onerror =
          req.onblocked =
            () => {
              resolve();
            };
      });
    }
  }, quality);
  await page.goto(lean ? '/?perf-off=all' : '/');
  await page.waitForFunction(() => window.__ethergrove !== undefined);
}

/** A fresh farm. Lessons are off unless asked, so other tests see no goal card. */
export async function newGame(
  page: Page,
  seed: number,
  { lessons = false, lean = false }: { lessons?: boolean } & BootOptions = {},
): Promise<void> {
  await boot(page, { lean });
  await page.evaluate(
    ([s, l]) => {
      window.__ethergrove?.setSeed(s, { lessons: l });
    },
    [seed, lessons] as const,
  );
  await expect(page.getByRole('tablist', { name: 'Hotbar' })).toBeVisible();
}

export const state = (page: Page): Promise<GameState> =>
  page.evaluate(() => {
    const s = window.__ethergrove?.getState();
    if (!s) throw new Error('no game');
    return s;
  });

export const act = (page: Page, cmd: Command): Promise<GameEvent[]> =>
  page.evaluate((c) => window.__ethergrove?.dispatch(c) ?? [], cmd);

/** Stand south of tile (x, y), facing it. */
export const faceTile = (page: Page, x: number, y: number): Promise<void> =>
  page.evaluate(
    ([tx, ty]) => {
      window.__ethergrove?.teleport('farm', tx + 0.5, ty + 1.5, 'n');
    },
    [x, y] as const,
  );

/** First field tile that is grass with walkable grass/path just south of it. */
export const findGrass = (page: Page): Promise<{ x: number; y: number }> =>
  page.evaluate(() => {
    const g = window.__ethergrove?.getState()?.maps.farm;
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
    window.__ethergrove?.sleep();
  });
