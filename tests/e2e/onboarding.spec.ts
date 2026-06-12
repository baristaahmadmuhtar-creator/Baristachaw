import { expect, test } from '@playwright/test';
import { clearClientState } from '../helpers/cleanup';

test('client-state cleanup completes onboarding by default', async ({ page }) => {
  await page.goto('/');
  await clearClientState(page);
  await page.reload();

  await expect(page.getByTestId('first-run-onboarding')).toBeHidden();
});

test('client-state cleanup can preserve a genuine first-run state', async ({ page }) => {
  await page.goto('/');
  await clearClientState(page, { onboarding: 'fresh' });
  await page.reload();

  await expect(page.getByTestId('first-run-onboarding')).toBeVisible();
});

test('client-state cleanup waits until IndexedDB stores are empty', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('qa-cleanup-regression', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('entries');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('entries', 'readwrite');
        transaction.objectStore('entries').put({ retained: true }, 'stale');
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });

  await clearClientState(page);

  const retainedRecords = await page.evaluate(async () => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('qa-cleanup-regression');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('entries', 'readonly');
      const countRequest = transaction.objectStore('entries').count();
      countRequest.onerror = () => reject(countRequest.error);
      countRequest.onsuccess = () => {
        db.close();
        resolve(countRequest.result);
      };
    };
  }));

  expect(retainedRecords).toBe(0);
});
