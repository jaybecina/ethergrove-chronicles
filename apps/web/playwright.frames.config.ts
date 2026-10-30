import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

// Full Chromium on the real GPU, with vsync and the frame cap off so frame times show the real headroom.
// Never SwiftShader (the e2e default), which measures software rendering.
const gpu = {
  channel: 'chromium',
  launchOptions: {
    args: [
      '--ignore-gpu-blocklist',
      '--enable-gpu',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
    ],
  },
};

/** Frame-rate profile (spec §7.3) against an E2E production build: `pnpm --filter web perf:frames`. */
export default defineConfig({
  testDir: 'perf',
  testMatch: /frames\.spec\.ts/,
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://localhost:${String(PORT)}` },
  webServer: {
    command: `VITE_E2E=true vite build --outDir dist-perf && vite preview --outDir dist-perf --port ${String(PORT)} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 2,
        ...gpu,
      },
    },
    { name: 'phone', use: { ...devices['Pixel 7'], ...gpu } },
  ],
});
