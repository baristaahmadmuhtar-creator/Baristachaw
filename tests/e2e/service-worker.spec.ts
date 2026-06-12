import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('static production build registers the offline service worker', async ({ page }) => {
  test.skip(
    String(process.env.PLAYWRIGHT_STATIC_BUILD || '').trim() !== '1',
    'Run against the static production build with PLAYWRIGHT_STATIC_BUILD=1.',
  );

  await page.goto('/', { waitUntil: 'load' });
  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    const worker = ready.active;
    if (worker && worker.state !== 'activated') {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Service worker activation timed out.')), 10_000);
        worker.addEventListener('statechange', () => {
          if (worker.state !== 'activated') return;
          window.clearTimeout(timeout);
          resolve();
        });
      });
    }
    return {
      active: worker?.state || '',
      scope: ready.scope,
    };
  });

  expect(registration.active).toBe('activated');
  expect(registration.scope).toBe(`${new URL(page.url()).origin}/`);
});
