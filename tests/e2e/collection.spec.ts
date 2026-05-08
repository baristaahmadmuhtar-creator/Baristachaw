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

const createFolderButton = /^Create Folder$|^Buat Folder$/i;
const folderNameInput = /Folder name|Nama Folder/i;
const saveButton = /^Save$|^Simpan$/i;
const confirmButton = /^Confirm$|^Konfirmasi$/i;
const renameButton = /Rename|Ubah nama/i;
const notesTab = /^Notes(?:\s*\(\d+\))?$|^Catatan(?:\s*\(\d+\))?$/i;
const closeItemDetailsButton = /Close item details|Tutup detail item/i;
const newNoteButton = /New Note|Catatan Baru/i;
const editNoteButton = /^Edit Note$|^Ubah Catatan$/i;

async function submitCreateFolder(page: import('@playwright/test').Page, name: string) {
  const createInput = page.getByRole('textbox', { name: folderNameInput });
  await expect(createInput).toBeVisible();
  await createInput.click();
  await createInput.fill('');
  await createInput.pressSequentially(name);
  await expect(createInput).toHaveValue(name);
  const submitButton = createInput.locator('xpath=following-sibling::button[1]');
  await expect(submitButton).toBeEnabled({ timeout: 10_000 });
  await submitButton.click();
}

test('supports folder create, rename, delete flow', async ({ page }) => {
  await page.getByRole('button', { name: createFolderButton }).click();
  await submitCreateFolder(page, 'qa_e2e collection folder');

  await expect(page.getByText('qa_e2e collection folder')).toBeVisible({ timeout: 20_000 });

  const card = page.getByText('qa_e2e collection folder').first();
  const container = card.locator('xpath=ancestor::div[contains(@class,"group")]').first();
  await container.locator('button').nth(1).click();
  await page.getByRole('button', { name: renameButton }).click();
  const renameInput = container.locator('input').first();
  await renameInput.fill('qa_e2e renamed folder');
  await container.getByRole('button', { name: confirmButton }).click();
  await expect(page.getByText('qa_e2e renamed folder')).toBeVisible();
});

test('keeps create-folder panel visible with many folders and renames the correct target', async ({ page }) => {
  test.setTimeout(120_000);
  for (let i = 0; i < 12; i += 1) {
    await page.getByRole('button', { name: createFolderButton }).click();
    await submitCreateFolder(page, `qa_many_${i}`);
    await expect(page.locator('h3', { hasText: new RegExp(`^qa_many_${i}$`) }).first()).toBeVisible();
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: createFolderButton }).click();
  await submitCreateFolder(page, 'qa_many_final');
  await expect(page.locator('h3', { hasText: /^qa_many_final$/ }).first()).toBeVisible();

  const firstCard = page.locator('h3', { hasText: /^qa_many_0$/ }).first().locator('xpath=ancestor::div[contains(@class,"group")]').first();
  const secondCard = page.locator('h3', { hasText: /^qa_many_1$/ }).first().locator('xpath=ancestor::div[contains(@class,"group")]').first();

  await secondCard.locator('button').nth(1).click();
  await page.getByRole('button', { name: renameButton }).click();
  await secondCard.locator('input').first().fill('qa_many_1_renamed');
  await secondCard.getByRole('button', { name: confirmButton }).click();

  await expect(page.locator('h3', { hasText: /^qa_many_1_renamed$/ }).first()).toBeVisible();
  await expect(firstCard.locator('h3', { hasText: /^qa_many_0$/ })).toBeVisible();
});

test('supports notes CRUD, filter, search, and move folder flow', async ({ page }) => {
  await page.getByRole('button', { name: createFolderButton }).click();
  await page.getByRole('textbox', { name: folderNameInput }).fill('qa_note_folder');
  await page.getByRole('button', { name: saveButton }).click();
  await expect(page.locator('h3', { hasText: /^qa_note_folder$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: newNoteButton }).click();
  await page.getByPlaceholder(/Note title|Judul catatan/i).fill('qa_note_title');
  await page.getByPlaceholder(/Note content|Isi catatan/i).fill('qa note body markdown');
  await page.locator('select').first().selectOption({ label: 'qa_note_folder' });
  await page.getByRole('button', { name: /Save Note|Simpan Catatan/i }).click();

  await page.getByRole('button', { name: notesTab }).click();
  await expect(page.getByText('qa_note_title')).toBeVisible();
  await page.getByPlaceholder(/Search notes|Cari catatan/i).fill('qa note body');
  await expect(page.getByText('qa_note_title')).toBeVisible();

  await page.getByText('qa_note_title').first().click();
  await page.getByRole('button', { name: editNoteButton }).click();
  await page.getByPlaceholder(/Note content|Isi catatan/i).fill('qa note body edited');
  await page.getByRole('button', { name: /Update Note|Perbarui Catatan/i }).click();
  await expect(page.getByText('qa note body edited')).toBeVisible();
  await page.locator('select').first().selectOption('');
  await page.getByLabel(closeItemDetailsButton).click();

  const noteCard = page.getByText('qa_note_title').first().locator('xpath=ancestor::div[contains(@class,"group")]').first();
  await noteCard.locator('button').last().click();
  const deleteDialog = page.getByRole('dialog', { name: /Delete item|Hapus item/i });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: /^Delete$|^Hapus$/i }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'qa_note_title' })).not.toBeVisible();
});
