import { expect, test, type Page } from '@playwright/test';
import { JINGLES, MUSIC, SFX_FILES } from '../src/audio/manifest';
import { boot, newGame } from './helpers';

test.skip(({ isMobile }) => isMobile, 'desktop only');

const audio = (page: Page) =>
  page.evaluate(() => {
    const a = window.__ethergrove?.audio();
    if (!a) throw new Error('no audio debug');
    return a;
  });
const cue = async (page: Page) => (await audio(page)).cue;
/** Any key unlocks audio; Shift alone only changes walking to running, so it moves nothing. */
const unlock = (page: Page) => page.keyboard.press('Shift');

test('music waits for a gesture, then the title theme plays', async ({ page }) => {
  await boot(page);
  expect((await audio(page)).unlocked).toBe(false);
  await unlock(page);
  await expect
    .poll(async () => audio(page))
    .toMatchObject({
      unlocked: true,
      cue: 'title',
      contextState: 'running',
    });
  await expect.poll(async () => (await audio(page)).loaded).toBe(1);
  await expect.poll(async () => (await audio(page)).activeTracks).toBe(1);
});

test('each place gets its own music', async ({ page }) => {
  await newGame(page, 3);
  await unlock(page);
  await expect.poll(() => cue(page)).toBe('spring');
  await page.evaluate(() => {
    window.__ethergrove?.teleport('house', 4.5, 4.5, 's');
  });
  await expect.poll(() => cue(page)).toBe('home');
  await page.evaluate(() => {
    window.__ethergrove?.teleport('farm', 9.5, 7.5, 's');
    window.__ethergrove?.skipMinutes(900);
  });
  await expect.poll(() => cue(page)).toBe('night');
});

test('rain plays its own lo-fi track', async ({ page }) => {
  await newGame(page, 3);
  await unlock(page);
  await page.evaluate(() => {
    window.__ethergrove?.setWeather('rain');
  });
  await expect.poll(() => cue(page)).toBe('rain');
  await expect.poll(async () => (await audio(page)).activeTracks).toBe(1);
});

test('opening and closing the cart quickly never stacks tracks', async ({ page }) => {
  await newGame(page, 3);
  await unlock(page);
  await expect.poll(() => cue(page)).toBe('spring');
  const flaps: ('cart' | null)[] = ['cart', null, 'cart', null, 'cart'];
  for (const o of flaps) {
    await page.evaluate((overlay) => {
      window.__ethergrove?.setOverlay(overlay);
    }, o);
    await page.waitForTimeout(50);
  }
  expect((await audio(page)).activeTracks).toBeLessThanOrEqual(2);
  await expect.poll(async () => (await audio(page)).activeTracks).toBe(1);
  expect(await cue(page)).toBe('shop');
});

test('a hidden tab suspends the music and a visible one resumes it', async ({ page }) => {
  await boot(page);
  await unlock(page);
  await expect.poll(async () => (await audio(page)).contextState).toBe('running');
  const setHidden = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { value: h, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await setHidden(true);
  await expect.poll(async () => (await audio(page)).contextState).toBe('suspended');
  await setHidden(false);
  await expect.poll(async () => (await audio(page)).contextState).toBe('running');
});

test('every shipped file plays real sound, has its length, and every track loops seamlessly', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await boot(page);
  const probe = (kind: 'track' | 'jingle' | 'sfx', id: string) =>
    page.evaluate(([k, i]) => window.__ethergrove?.probeAudio(k, i), [kind, id] as const);
  const tables = [
    ['track', MUSIC, 0.01],
    ['jingle', JINGLES, 0.01],
    ['sfx', SFX_FILES, 0.005],
  ] as const;
  for (const [kind, table, minRms] of tables)
    for (const [id, file] of Object.entries(table)) {
      const p = await probe(kind, id);
      const where = `${kind} ${id}`;
      expect(p?.rms, where).toBeGreaterThan(minRms);
      expect(Math.abs((p?.duration ?? 0) - file.duration), where).toBeLessThanOrEqual(0.1);
      // A seamless loop: the audio at the loop end repeats the audio at the loop start (audio plan Review Focus 3).
      // Rendered loops match exactly (1.0); AAC noise brings them to 0.98–0.99 after decoding, while a broken wrap
      // measures 0.59 (ledger, Task 9), so 0.95 tells the two apart.
      if (kind === 'track') expect(p?.corr, where).toBeGreaterThan(0.95);
    }
});
