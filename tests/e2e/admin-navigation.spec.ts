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
  await qaLogin(page.request, buildQaAdminUser());
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const mobileNav = page.getByTestId('mobile-bottom-nav');
  await expect(mobileNav).toBeVisible({ timeout: 30_000 });

  const adminLink = mobileNav.getByRole('link', { name: 'Admin' });
  await expect(adminLink).toBeVisible();
  await adminLink.click();

  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await expect(page.getByRole('heading', { name: 'Admin Management' })).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Kembali ke aplikasi' }).click();
  await expect(page).toHaveURL(/\/$/);
});
