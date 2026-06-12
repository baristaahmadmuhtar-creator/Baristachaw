import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the full landing contract without console errors or overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Seduh lebih presisi/);
  await expect(page.getByRole('region', { name: /Seduh lebih presisi/ }).getByRole('link', { name: /Coba AI Brew/ })).toHaveAttribute(
    'href',
    'https://app.baristachaw.com/tools?tab=ai_brew',
  );
  await expect(page.getByRole('heading', { name: 'V60', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Espresso', exact: true })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('support widget opens, traps focus, and routes to validated support form', async ({ page }) => {
  await page.getByRole('button', { name: 'Buka bantuan Baristachaw' }).click();
  const dialog = page.getByRole('dialog', { name: 'Baristachaw Support AI' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/bukan human support 24\/7/)).toBeVisible();
  await dialog.getByRole('link', { name: 'Hubungi support' }).click();
  await expect(page).toHaveURL(/\/support$/);

  await page.getByRole('button', { name: 'Buka laporan support' }).click();
  await expect(page.getByRole('alert')).toContainText(/Periksa nama/);
  await page.getByRole('textbox', { name: 'Nama' }).fill('Ahmad');
  await page.getByRole('textbox', { name: 'Email' }).fill('not-an-email');
  await page.getByRole('textbox', { name: 'Pesan' }).fill('Masalah AI Brew pada Android setelah keyboard terbuka.');
  await page.getByRole('button', { name: 'Buka laporan support' }).click();
  await expect(page.getByRole('alert')).toContainText(/Periksa nama/);
});

test('legal and download routes are direct, honest, and non-PWA', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privasi Baristachaw' })).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Ketentuan penggunaan' })).toBeVisible();
  await page.goto('/download');
  await expect(page.getByRole('heading', { name: /Unduh Baristachaw/ })).toBeVisible();
  await expect(page.getByText(/Origin app\.baristachaw\.com sudah tertanam/)).toBeVisible();
  expect(await page.locator('link[rel="manifest"]').count()).toBe(0);
});

test('language toggle changes the public interface without mixed primary copy', async ({ page }) => {
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Brew smarter/);
  await expect(page.getByRole('region', { name: /Brew smarter/ }).getByRole('link', { name: 'Try AI Brew' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('has no serious or critical axe violations', async ({ page }) => {
  const result = await new AxeBuilder({ page }).analyze();
  const blockers = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''));
  expect(blockers).toEqual([]);
});
