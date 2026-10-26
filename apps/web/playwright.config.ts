import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;
const gpu = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // On CI each job runs 1 worker, so this only makes `--shard` split by test instead of by file.
  fullyParallel: !!process.env.GITHUB_ACTIONS,
  // Locally, 2 workers cut the full e2e run from 3m 47s to ~2m 30s with no flakes in 3 runs (decision 0008).
  // GitHub's 4-vCPU runners cannot render two software-WebGL Chromiums at once: the Chromium job took 14 min
  // and timed out, so CI uses 1 worker per job and shards instead (lessons/ci-e2e-one-worker).
  workers: process.env.GITHUB_ACTIONS ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  // One live line per test, so a long run shows what is running and what passed. On GitHub Actions,
  // failures are also annotated on the pull request.
  reporter: process.env.GITHUB_ACTIONS ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm dev:e2e',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: gpu } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'pixel-7',
      use: { ...devices['Pixel 7'], launchOptions: { args: gpu } },
      testMatch: /devices|a11y/,
    },
    { name: 'iphone-14', use: { ...devices['iPhone 14'] }, testMatch: /devices/ },
  ],
});
