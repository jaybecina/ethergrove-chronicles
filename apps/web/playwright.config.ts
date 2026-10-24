import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;
const gpu = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  // One live line per test, so a long run shows what is running and what passed.
  reporter: 'list',
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
