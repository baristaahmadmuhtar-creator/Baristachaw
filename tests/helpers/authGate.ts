import { expect, type Page } from '@playwright/test';

export const authGateHeading = /Masuk ke Baristachaw|Sign in to Baristachaw/i;
export const guestEntryButton = /Lanjut(?:kan)? sebagai tamu|Continue as guest/i;

export async function expectFirstRunAuthGate(page: Page) {
  await expect(page.getByRole('heading', { name: authGateHeading })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: guestEntryButton }).first()).toBeVisible();
  await expect(page.locator('a[href="/daftar"], a[href="/signup"]').first()).toBeVisible();
}

export async function continueAsGuestFromAuthGate(page: Page) {
  await expectFirstRunAuthGate(page);
  const dialogGuestButton = page.getByRole('dialog').getByRole('button', { name: guestEntryButton }).first();
  await expect(dialogGuestButton).toBeVisible({ timeout: 10_000 });
  await dialogGuestButton.click();
  await expect(page.getByRole('heading', { name: authGateHeading })).not.toBeVisible({ timeout: 30_000 });
}
