import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';

async function fetchAuthStateFromPage(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        signal: controller.signal,
      });
      const text = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        text,
      };
    } catch (error) {
      return {
        ok: false,
        status: -1,
        text: error instanceof Error ? error.message : String(error),
      };
    } finally {
      window.clearTimeout(timeout);
    }
  });
}

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('qa login is visible to both page.request and browser fetch', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const apiResponse = await page.request.get('/api/auth/me');
  const apiText = await apiResponse.text();
  const browserResponse = await fetchAuthStateFromPage(page);

  expect(apiResponse.status(), `page.request /api/auth/me -> ${apiText}`).toBe(200);
  expect(browserResponse.status, `browser fetch /api/auth/me -> ${browserResponse.text}`).toBe(200);
});

test('guest state is visible to both page.request and browser fetch', async ({ page }) => {
  await qaLogout(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const apiResponse = await page.request.get('/api/auth/me');
  const apiText = await apiResponse.text();
  const browserResponse = await fetchAuthStateFromPage(page);

  expect(apiResponse.status(), `page.request /api/auth/me -> ${apiText}`).toBe(401);
  expect(browserResponse.status, `browser fetch /api/auth/me -> ${browserResponse.text}`).toBe(401);
});
