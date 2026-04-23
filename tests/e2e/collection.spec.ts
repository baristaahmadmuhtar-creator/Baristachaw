import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { clearClientState } from '../helpers/cleanup';

test.beforeEach(async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/collection', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogin(page.request);
  await page.goto('/collection', { waitUntil: 'domcontentloaded' });
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('supports folder create, rename, delete flow', async ({ page }) => {
  await page.getByTitle('Create Folder').click();
  await page.getByPlaceholder('Folder name').fill('qa_e2e collection folder');
  await page.getByPlaceholder('Folder name').press('Enter');

  await expect(page.getByText('qa_e2e collection folder')).toBeVisible({ timeout: 20_000 });

  const card = page.getByText('qa_e2e collection folder').first();
  const container = card.locator('xpath=ancestor::div[contains(@class,"group")]').first();
  await container.locator('button').nth(1).click();
  await page.getByRole('button', { name: /Rename/i }).click();
  const renameInput = container.locator('input').first();
  await renameInput.fill('qa_e2e renamed folder');
  await container.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('qa_e2e renamed folder')).toBeVisible();
});

test('keeps create-folder panel visible with many folders and renames the correct target', async ({ page }) => {
  test.setTimeout(120_000);
  for (let i = 0; i < 12; i += 1) {
    await page.getByTitle('Create Folder').click();
    const createInput = page.getByPlaceholder('Folder name');
    await expect(createInput).toBeVisible();
    await expect(createInput).toBeFocused();
    await createInput.fill(`qa_many_${i}`);
    await createInput.press('Enter');
    await expect(page.locator('h3', { hasText: new RegExp(`^qa_many_${i}$`) }).first()).toBeVisible();
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByTitle('Create Folder').click();
  const createInput = page.getByPlaceholder('Folder name');
  await expect(createInput).toBeVisible();
  await expect(createInput).toBeFocused();
  await createInput.fill('qa_many_final');
  await createInput.press('Enter');
  await expect(page.locator('h3', { hasText: /^qa_many_final$/ }).first()).toBeVisible();

  const firstCard = page.locator('h3', { hasText: /^qa_many_0$/ }).first().locator('xpath=ancestor::div[contains(@class,"group")]').first();
  const secondCard = page.locator('h3', { hasText: /^qa_many_1$/ }).first().locator('xpath=ancestor::div[contains(@class,"group")]').first();

  await secondCard.locator('button').nth(1).click();
  await page.getByRole('button', { name: /Rename/i }).click();
  await secondCard.locator('input').first().fill('qa_many_1_renamed');
  await secondCard.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.locator('h3', { hasText: /^qa_many_1_renamed$/ }).first()).toBeVisible();
  await expect(firstCard.locator('h3', { hasText: /^qa_many_0$/ })).toBeVisible();
});

test('supports notes CRUD, filter, search, and move folder flow', async ({ page }) => {
  await page.getByTitle('Create Folder').click();
  await page.getByPlaceholder('Folder name').fill('qa_note_folder');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('h3', { hasText: /^qa_note_folder$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /New Note/i }).click();
  await page.getByPlaceholder(/Note title|Judul catatan/i).fill('qa_note_title');
  await page.getByPlaceholder(/Note content|Isi catatan/i).fill('qa note body markdown');
  await page.locator('select').first().selectOption({ label: 'qa_note_folder' });
  await page.getByRole('button', { name: /Save Note|Simpan Catatan/i }).click();

  await page.getByRole('button', { name: /Notes/i }).click();
  await expect(page.getByText('qa_note_title')).toBeVisible();
  await page.getByPlaceholder(/Search notes|Cari catatan/i).fill('qa note body');
  await expect(page.getByText('qa_note_title')).toBeVisible();

  await page.getByText('qa_note_title').first().click();
  await page.getByRole('button', { name: /Edit Note|Ubah Catatan/i }).click();
  await page.getByPlaceholder(/Note content|Isi catatan/i).fill('qa note body edited');
  await page.getByRole('button', { name: /Update Note|Perbarui Catatan/i }).click();
  await expect(page.getByText('qa note body edited')).toBeVisible();
  await page.locator('select').first().selectOption('');
  await page.getByLabel('Close item details').click();

  const noteCard = page.getByText('qa_note_title').first().locator('xpath=ancestor::div[contains(@class,"group")]').first();
  await noteCard.locator('button').last().click();
  await expect(page.getByText('qa_note_title')).not.toBeVisible();
});
