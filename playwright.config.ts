import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000';
const shouldUseLiveAi = String(process.env.LIVE_E2E || '').trim() === '1';
const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL && !process.env.BASE_URL;
const shouldReuseExistingServer = String(process.env.PLAYWRIGHT_REUSE_SERVER || '').trim() === '1' && !process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']]
    : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    extraHTTPHeaders: shouldUseLiveAi ? undefined : { 'x-e2e-mock': '1' },
  },
  webServer: shouldStartWebServer
    ? {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3000/api/health',
        timeout: 120_000,
        reuseExistingServer: shouldReuseExistingServer,
        env: {
          ...process.env,
          JWT_SECRET: process.env.JWT_SECRET || 'local-test-jwt-secret-32-chars-minimum',
          ENABLE_TEST_AUTH_ENDPOINT: process.env.ENABLE_TEST_AUTH_ENDPOINT || '1',
          TEST_AUTH_TOKEN: process.env.TEST_AUTH_TOKEN || 'local-test-token',
          QA_ALLOWED_ORIGINS: process.env.QA_ALLOWED_ORIGINS || 'http://127.0.0.1:3000',
          APP_URL: process.env.APP_URL || 'http://127.0.0.1:3000',
        },
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
});

