import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { mockAiApis } from '../helpers/network';
import { expectFirstRunAuthGate } from '../helpers/authGate';

const isLive = String(process.env.LIVE_E2E || '').trim() === '1';
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const analyzeImageButton = /Analyze Image|Analisis Gambar/i;
const scannerResultsText = /Results|Hasil/i;
const saveResultButton = /Save to Collection|Save Result|Saved!|Simpan ke Koleksi|Simpan Hasil|Tersimpan!/i;
const savedResultButton = /Saved!|Tersimpan!/i;
const latteRequestLabel = /Latte art request|Permintaan latte art/i;

test.beforeEach(async ({ page }) => {
  if (!isLive) await mockAiApis(page);
  await qaLogout(page.request);
  await page.goto('/scanner');
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('shows sign in gate while unauthenticated', async ({ page }) => {
  await expectFirstRunAuthGate(page);
});

test('scans image and saves result to collection', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/scanner', { waitUntil: 'domcontentloaded' });

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'qa_e2e.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });

  await page.getByRole('button', { name: analyzeImageButton }).click();
  await expect(page.getByText(scannerResultsText)).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: saveResultButton }).click();
  await expect(page.getByRole('button', { name: savedResultButton })).toBeVisible();
});

test('generates ai latte art from an uploaded photo', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/scanner', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: /AI Latte Art|Seni Latte AI/i }).click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'latte-test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });

  await page.getByLabel(latteRequestLabel).fill('Turn this into a clean symmetric tulip with realistic microfoam.');
  await page.getByRole('button', { name: /Generate AI Latte Art|Buat AI Latte Art/i }).click();

  await expect(page.getByText(/AI latte art result|Hasil AI latte art/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('img[alt="AI latte art result"], img[alt="Hasil AI latte art"]')).toBeVisible();
});

test('rejects non-image uploads before analysis starts', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/scanner', { waitUntil: 'domcontentloaded' });

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'not-image.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image', 'utf8'),
  });

  await expect(page.getByText(/Please choose a valid image file|Pilih file gambar yang valid/i)).toBeVisible();
});

