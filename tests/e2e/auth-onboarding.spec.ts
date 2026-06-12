import { test, expect } from '@playwright/test';
import { clearClientState } from '../helpers/cleanup';

const realAuthEmail = process.env.BARISTACHAW_E2E_REAL_EMAIL?.trim();
const realAuthPassword = process.env.BARISTACHAW_E2E_REAL_PASSWORD?.trim();

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
});

test('mobile sign-in keeps the auth actions first without marketing panel clutter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/masuk?lang=id', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Masuk ke Baristachaw' })).toBeVisible();
  const googleButton = page.getByRole('button', { name: /Lanjutkan dengan Google/i });
  const emailButton = page.getByRole('button', { name: /Lanjut dengan email/i });
  const exploreButton = page.getByRole('button', { name: /Lihat aplikasi dulu/i });
  await expect(googleButton).toBeVisible();
  await expect(emailButton).toBeVisible();
  await expect(exploreButton).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan sebagai tamu/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /English/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Indonesia/i })).toBeVisible();
  const googleBox = await googleButton.boundingBox();
  const emailBox = await emailButton.boundingBox();
  const exploreBox = await exploreButton.boundingBox();
  expect(googleBox?.y ?? 0).toBeLessThan(emailBox?.y ?? 0);
  expect(emailBox?.y ?? 0).toBeLessThan(exploreBox?.y ?? 0);
  await expect(page.getByText('Ruang kerja AI kopi')).toHaveCount(0);
  await expect(page.getByText('Satu akun untuk seduh lebih cerdas, resep, dan catatan kopi.')).toHaveCount(0);
  await expect(page.getByText('Pilih jalur yang paling pas hari ini')).toHaveCount(0);
  await expect(page.getByText('Gratis cocok untuk mencoba ruang kerja. Pro dibuat untuk seduh harian, pemindaian, dan riset kopi.')).toHaveCount(0);
  await expect(page.getByText(/Segera tersedia di web|Google tetap menjadi jalur masuk utama/i)).toHaveCount(0);

  await page.route('**/api/auth/email/reset', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, resetEmailSent: true, email: 'pemilik@example.com' }),
    });
  });
  await page.getByLabel('Alamat email').fill('pemilik@example.com');
  await emailButton.click();
  await expect(page.locator('#auth-route-password')).toBeVisible();
  await expect(page.locator('#auth-route-password')).toBeFocused();
  await page.keyboard.press('Escape');
  const authMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    activeElementId: document.activeElement?.id || '',
  }));
  expect(authMetrics.scrollWidth).toBeLessThanOrEqual(authMetrics.clientWidth + 1);
  expect(authMetrics.activeElementId).toBe('auth-route-password');
  await page.getByRole('button', { name: /Lupa password/i }).click();
  await expect(page.getByText('Cek kotak masuk Anda')).toBeVisible();
  await expect(page.getByText(/pemilik@example\.com/)).toBeVisible();
});

test('real email/password login reaches the app when secure env credentials are configured', async ({ page }) => {
  test.skip(
    !realAuthEmail || !realAuthPassword,
    'Set BARISTACHAW_E2E_REAL_EMAIL and BARISTACHAW_E2E_REAL_PASSWORD in the local environment to run real auth without committing secrets.'
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/masuk?lang=id', { waitUntil: 'domcontentloaded' });

  await page.getByLabel('Alamat email').fill(realAuthEmail!);
  await page.getByRole('button', { name: /Lanjut dengan email/i }).click();
  const passwordInput = page.locator('#auth-route-password');
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeFocused();
  await passwordInput.fill(realAuthPassword!);
  await page.getByRole('button', { name: /^Masuk$/i }).click();

  await expect(page.getByRole('heading', { name: /Baristachaw|Apa yang ingin Anda lakukan hari ini/i })).toBeVisible({ timeout: 30_000 });
  await expect(passwordInput).toHaveCount(0);
});

test('registration page uses the same low-friction flow', async ({ page }) => {
  await page.goto('/daftar?lang=id', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Daftar akun Baristachaw' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan dengan Google/i })).toBeVisible();
  await page.getByLabel('Alamat email').fill('calon@example.com');
  await page.getByRole('button', { name: /Lanjut dengan email/i }).click();
  await expect(page.getByLabel('Nama')).toBeVisible();
  await expect(page.locator('#auth-route-password')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Buat akun$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Masuk dengan akun yang sudah ada/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lanjutkan sebagai tamu/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Lihat aplikasi dulu/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sudah punya akses\? Masuk/i })).toHaveAttribute('href', '/masuk');
});
