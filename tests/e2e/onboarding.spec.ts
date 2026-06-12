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

test('first-run onboarding uses logo and custom favorite equipment pickers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await clearClientState(page, { onboarding: 'fresh' });
  await page.reload();

  await expect(page.getByTestId('first-run-onboarding')).toBeVisible();
  await expect(page.getByTestId('onboarding-logo')).toHaveAttribute('src', /\/icons\/icon-192\.png/);
  await expect(page.getByTestId('onboarding-language-icon')).toBeVisible();
  await page.getByRole('button', { name: /Continue|Lanjut/i }).click();

  await expect(page.getByTestId('onboarding-equipment-step')).toBeVisible();
  await expect(page.locator('select')).toHaveCount(0);
  await expect(page.getByPlaceholder(/Brewer not listed\? Enter your brewer model|Alat seduh tidak ada\? Tulis model alat seduh Anda/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Grinder not listed\? Enter your grinder model|Grinder tidak ada\? Tulis model grinder Anda/i)).toBeVisible();

  await page.getByTestId('onboarding-dripper-picker').click();
  await expect(page.getByRole('dialog', { name: /brewer|alat seduh/i })).toBeVisible();
  await expect(page.getByTestId('onboarding-dripper-picker-option-hario-v60')).toBeVisible();
  await page.getByTestId('onboarding-dripper-picker-option-hario-v60').click();
  await expect(page.getByTestId('onboarding-dripper-picker')).toContainText(/Hario V60/i);

  await page.getByTestId('onboarding-grinder-picker').click();
  await expect(page.getByRole('dialog', { name: /grinder/i })).toBeVisible();
  await expect(page.getByTestId('onboarding-grinder-picker-option-1zpresso-k-ultra')).toBeVisible();
  await page.getByTestId('onboarding-grinder-picker-option-1zpresso-k-ultra').click();
  await expect(page.getByTestId('onboarding-grinder-picker')).toContainText(/K-Ultra|1Zpresso/i);

  await page.getByRole('button', { name: /Save and start|Simpan dan mulai/i }).click();
  await expect(page.getByTestId('first-run-onboarding')).toBeHidden();
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
