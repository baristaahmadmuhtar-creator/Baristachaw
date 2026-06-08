import { expect, type Page } from '@playwright/test';

export const authModalHeading = /Mulai dengan akun Anda|Start with your account/i;
export const authModalCopy = /perlu akun|needs an account/i;
export const browseOnlyHomeHeading = /Apa yang ingin Anda lakukan hari ini\?|What would you like to do today\?/i;

export async function expectBrowseOnlyHome(page: Page) {
  await expect(page.getByRole('heading', { name: browseOnlyHomeHeading })).toBeVisible({ timeout: 30_000 });
}

export async function expectAccountModal(page: Page) {
  const dialog = page.getByRole('dialog', { name: authModalHeading });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByText(authModalCopy).first()).toBeVisible();
}
