import { expect, type Page } from '@playwright/test';

export const authGateHeading = /^Baristachaw$/i;
export const authGateCopy = /Masuk ke Baristachaw|Sign in to Baristachaw/i;
export const guestEntryButton = /Lanjut(?:kan)? sebagai tamu|Continue as guest/i;

export async function expectFirstRunAuthGate(page: Page) {
  await expect(page.getByRole('heading', { name: authGateHeading })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(authGateCopy).first()).toBeVisible();
  await expect(page.getByRole('button', { name: guestEntryButton }).first()).toBeVisible();
  await expect(page.locator('a[href="/daftar"], a[href="/signup"]').first()).toBeVisible();
}

export async function continueAsGuestFromAuthGate(page: Page) {
  await expectFirstRunAuthGate(page);
  const guestButton = page.getByRole('button', { name: guestEntryButton }).first();
  await expect(guestButton).toBeVisible({ timeout: 10_000 });
  await guestButton.click();
  await expect(page.getByRole('heading', { name: authGateHeading })).not.toBeVisible({ timeout: 30_000 });
}
