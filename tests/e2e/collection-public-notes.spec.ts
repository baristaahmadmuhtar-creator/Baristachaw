import { test, expect } from '@playwright/test';
import { qaLogout } from '../fixtures/auth';
import { clearClientState } from '../helpers/cleanup';

test.beforeEach(async ({ page }) => {
  await qaLogout(page.request);
  await page.goto('/collection', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogout(page.request);
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('browse-only users can create and reopen local collection notes without sign-in', async ({ page }) => {
  await page.goto('/collection', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByRole('heading', { name: /Collection|Koleksi/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Sign in to Baristachaw|Masuk ke Baristachaw/i })).toHaveCount(0);

  await page.getByRole('button', { name: /New Note|Catatan Baru/i }).click();
  await page.getByPlaceholder(/Note title|Judul catatan/i).fill('qa_public_note_title');
  await page.getByPlaceholder(/Note content|Isi catatan/i).fill('qa public note body');
  await page.getByRole('button', { name: /Save Note|Simpan Catatan/i }).click();

  await expect(page.getByText('qa_public_note_title')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByText('qa_public_note_title')).toBeVisible();
});
