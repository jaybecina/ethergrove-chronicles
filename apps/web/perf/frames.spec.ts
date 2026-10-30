import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { Facing, LocationId, Weather } from '@ethergrove/core';
import type {} from '../src/game/debugHook';
import { installFrameStats, type FrameSummary } from './frameStats';

// Frame-rate profile (spec §7.3): today's renderer, then one cost off at a time. Reported, not gating.
const WARMUP_MS = 3000;
const MEASURE_MS = 5000;

interface Run {
  scene: string;
  off: string;
  quality: 'high' | 'low';
  location: LocationId;
  x: number;
  z: number;
  facing: Facing;
  weather: Weather;
}

const farm = { location: 'farm', x: 12.5, z: 12.5, facing: 's' } as const;
const SINGLES = ['dpr', 'ao', 'shadows', 'grass', 'particles', 'post'];
const RUNS: Run[] = [
  ...['', ...SINGLES, 'all'].map((off): Run => ({
    scene: 'farm, sunny',
    off,
    quality: 'high',
    ...farm,
    weather: 'sunny',
  })),
  { scene: 'farm, rain', off: '', quality: 'high', ...farm, weather: 'rain' },
  { scene: 'farm, snow', off: '', quality: 'high', ...farm, weather: 'snow' },
  {
    scene: 'house',
    off: '',
    quality: 'high',
    location: 'house',
    x: 3.5,
    z: 3.5,
    facing: 's',
    weather: 'sunny',
  },
  { scene: 'farm, sunny', off: '', quality: 'low', ...farm, weather: 'sunny' },
];

async function measure(page: Page, run: Run): Promise<FrameSummary> {
  const query = new URLSearchParams({ q: run.quality });
  if (run.off) query.set('perf-off', run.off);
  await page.goto(`/?${query.toString()}`);
  await page.waitForFunction(() => window.__ethergrove !== undefined);
  await page.evaluate((r) => {
    const h = window.__ethergrove;
    if (!h) throw new Error('debug hook missing');
    h.setSeed(7);
    h.skipMinutes(360); // 12:00, high sun
    h.setWeather(r.weather);
    h.teleport(r.location, r.x, r.z, r.facing);
  }, run);
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(WARMUP_MS);
  await page.evaluate(() => window.__frames?.start());
  await page.waitForTimeout(MEASURE_MS);
  const summary = await page.evaluate(() => window.__frames?.stop());
  if (!summary) throw new Error('frame stats missing');
  return summary;
}

test('frame-rate profile', async ({ page }, info) => {
  test.setTimeout(RUNS.length * 60_000);
  const throttle = info.project.name === 'phone' ? 4 : 1;
  if (throttle > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  await page.addInitScript(installFrameStats);
  // The quality setting comes from `?q=`, written before the game reads its settings.
  await page.addInitScript(() => {
    const quality = new URLSearchParams(location.search).get('q');
    if (quality) localStorage.setItem('ethergrove:settings', JSON.stringify({ quality }));
  });

  const rows: (Run & FrameSummary)[] = [];
  for (const run of RUNS) {
    const s = await measure(page, run);
    // Software rendering measures the CPU, not the GPU: the profile is meaningless there.
    expect(s.gpu, 'profile needs a real GPU').not.toMatch(/swiftshader|llvmpipe/i);
    rows.push({ ...run, ...s });
    console.log(
      `[frames] ${info.project.name} | ${run.scene} | ${run.quality} | off: ${run.off || 'none'} | ` +
        `${String(s.fps)} fps | frame p50 ${String(s.frameP50)} ms p95 ${String(s.frameP95)} ms | ` +
        `gpu p50 ${String(s.gpuP50 ?? 'n/a')} ms | ${String(s.drawCalls)} calls | ${String(s.triangles)} tris | ${s.canvas}`,
    );
  }
  mkdirSync('perf-results', { recursive: true });
  writeFileSync(
    `perf-results/frames-${info.project.name}.json`,
    JSON.stringify({ project: info.project.name, cpuThrottle: throttle, rows }, null, 2),
  );
});
