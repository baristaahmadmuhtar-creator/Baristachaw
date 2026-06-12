import { defineConfig, devices } from '@playwright/test';

const remoteBaseUrl = process.env.LANDING_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: remoteBaseUrl || 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'landing-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'landing-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: 'npm run dev --workspace @baristachaw/landing -- --host 127.0.0.1 --port 4175 --strictPort',
        url: 'http://127.0.0.1:4175',
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
