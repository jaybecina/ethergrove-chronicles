import { defineConfig, devices } from '@playwright/test';

/** Load-time check against the production build (`pnpm perf`). */
export default defineConfig({
  testDir: 'perf',
  testMatch: /load\.spec\.ts/,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'],
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
