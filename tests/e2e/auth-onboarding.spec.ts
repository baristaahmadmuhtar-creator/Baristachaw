import { test, expect } from '@playwright/test';

test('mobile sign-in keeps the auth actions first without marketing panel clutter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/masuk?lang=id', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Masuk ke Baristachaw' })).toBeVisible();
  const googleButton = page.getByRole('button', { name: /Lanjutkan dengan Google/i });
  const emailButton = page.getByRole('button', { name: /Lanjut dengan email/i });
  const guestButton = page.getByRole('button', { name: /Lanjutkan sebagai tamu/i });
  await expect(googleButton).toBeVisible();
  await expect(emailButton).toBeVisible();
  await expect(guestButton).toBeVisible();
  const googleBox = await googleButton.boundingBox();
  const emailBox = await emailButton.boundingBox();
  const guestBox = await guestButton.boundingBox();
  expect(googleBox?.y ?? 0).toBeLessThan(emailBox?.y ?? 0);
  expect(emailBox?.y ?? 0).toBeLessThan(guestBox?.y ?? 0);
  await expect(page.getByText('Ruang kerja AI kopi')).toHaveCount(0);
  await expect(page.getByText('Satu akun untuk seduh lebih cerdas, resep, dan catatan kopi.')).toHaveCount(0);
  await expect(page.getByText('Pilih jalur yang paling pas hari ini')).toHaveCount(0);
  await expect(page.getByText('Gratis cocok untuk mencoba ruang kerja. Pro dibuat untuk seduh harian, pemindaian, dan riset kopi.')).toHaveCount(0);
  await expect(page.getByText(/Segera tersedia di web|Google tetap menjadi jalur masuk utama/i)).toHaveCount(0);
});

test('registration page uses the same low-friction flow', async ({ page }) => {
  await page.goto('/daftar?lang=id', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Daftar akun Baristachaw' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan dengan Google/i })).toBeVisible();
  await page.getByLabel('Email').fill('calon@example.com');
  await page.getByRole('button', { name: /Lanjut dengan email/i }).click();
  await expect(page.getByLabel('Nama')).toBeVisible();
  await expect(page.locator('#auth-route-password')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Buat akun$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Masuk dengan akun yang sudah ada/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan sebagai tamu/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sudah punya akses\? Masuk/i })).toHaveAttribute('href', '/masuk');
});
