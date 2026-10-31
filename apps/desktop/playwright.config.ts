import { defineConfig } from '@playwright/test';

// Boots the unpackaged desktop app with Playwright's Electron driver (desktop spec §5).
// Run `pnpm --filter desktop build` first; the spec fails fast when the build is missing.
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.GITHUB_ACTIONS ? [['list'], ['github']] : 'list',
  use: { trace: 'retain-on-failure' },
});
