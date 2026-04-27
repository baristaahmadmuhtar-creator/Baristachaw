import { test, expect } from '@playwright/test';

test('mobile sign-in keeps the auth actions first and shows plan value without technical copy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/masuk?lang=id', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Masuk ke Baristachaw' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan dengan Google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan sebagai tamu/i })).toBeVisible();
  await expect(page.getByText('Coba gratis')).toBeVisible();
  await expect(page.getByText('Progres tersimpan')).toBeVisible();
  await expect(page.getByText('Gratis cocok untuk mencoba ruang kerja. Pro dibuat untuk seduh harian, pemindaian, dan riset kopi.')).toBeVisible();
  await expect(page.getByText(/Segera tersedia di web|Google tetap menjadi jalur masuk utama/i)).toHaveCount(0);
});

test('registration page uses the same low-friction flow', async ({ page }) => {
  await page.goto('/daftar?lang=id', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Daftar akun Baristachaw' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan dengan Google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan sebagai tamu/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sudah punya akses\? Masuk/i })).toHaveAttribute('href', '/masuk');
});
