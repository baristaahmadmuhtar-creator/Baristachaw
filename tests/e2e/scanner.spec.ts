import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { mockAiApis } from '../helpers/network';

const isLive = String(process.env.LIVE_E2E || '').trim() === '1';
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

test.beforeEach(async ({ page }) => {
  if (!isLive) await mockAiApis(page);
  await qaLogout(page.request);
  await page.goto('/scanner');
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('shows sign in gate while unauthenticated', async ({ page }) => {
  await expect(page.getByText('Sign In Required')).toBeVisible();
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

  await page.getByRole('button', { name: /Analyze Image/i }).click();
  await expect(page.getByText('Results')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: /Save to Collection|Saved!/i }).click();
  await expect(page.getByRole('button', { name: /Saved!/i })).toBeVisible();
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

  await page.getByLabel(/Latte art request/i).fill('Turn this into a clean symmetric tulip with realistic microfoam.');
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

