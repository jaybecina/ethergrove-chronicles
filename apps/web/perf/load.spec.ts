import { test } from '@playwright/test';
import type {} from '../src/game/debugHook';

// Reported, not gating (spec §6.3): mid-range phone ≈ 4× CPU slowdown on Fast 4G, production build.
test('time to playable on a throttled phone profile', async ({ page }, info) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (1.5 * 1024 * 1024) / 8,
  });
  const start = Date.now();
  await page.goto('/');
  await page.getByRole('button', { name: 'New game' }).waitFor();
  const menus = Date.now() - start;
  // Playable = the lazy 3D chunk has loaded and the canvas is on screen.
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((e) => e.name.includes('GameCanvas')),
  );
  await page.locator('canvas').waitFor();
  const playable = Date.now() - start;
  info.annotations.push({
    type: 'perf',
    description: `menus ${menus} ms, 3D ready ${playable} ms`,
  });
  console.log(`[perf] menus after ${menus} ms, 3D ready after ${playable} ms (target < 5000 ms)`);
});
