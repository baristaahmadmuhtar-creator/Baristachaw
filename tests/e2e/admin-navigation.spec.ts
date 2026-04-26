import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaAdminUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';

test.beforeEach(async ({ page }) => {
  await qaLogout(page.request);
  await page.goto('/');
  await clearClientState(page);
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('admin users get a mobile Admin entry and can return to the app', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const mobileNav = page.getByTestId('mobile-bottom-nav');
  await expect(mobileNav).toBeVisible({ timeout: 30_000 });

  const adminLink = mobileNav.getByRole('link', { name: 'Admin' });
  await expect(adminLink).toBeVisible();
  await adminLink.click();

  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await expect(page.getByRole('heading', { name: 'Manajemen Admin' })).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Aplikasi' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('admin mobile manage opens account control without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());
  await page.goto('/admin?tab=users', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Manajemen Admin' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Kelola' }).first().click();

  await expect(page.getByRole('heading', { name: 'Kontrol akun' })).toBeVisible();
  await expect(page.getByText('Kontrol plan cepat')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terapkan sementara' }).first()).toBeVisible();
});

test('admin mobile exposes editable plans and catalog operations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());

  await page.goto('/admin?tab=plans', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Manajemen Admin' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Katalog plan')).toBeVisible();
  await expect(page.getByLabel('Catatan operator').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan' }).first()).toBeVisible();

  await page.goto('/admin?tab=database', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Operasi katalog')).toBeVisible();
  await expect(page.getByText('Request katalog baru')).toBeVisible();
  await expect(page.getByLabel('Payload JSON')).toBeVisible();
});
