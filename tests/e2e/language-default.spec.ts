import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';

const INDONESIAN_CRITICAL_COPY =
  /Alat Barista|Kalkulator|Tugas|Preset Metode Seduh|Ukuran Giling|Dosis \(g\)|Air \(ml\)|Ringkasan|Panduan Seduh|Detail tambahan|Prediksi rasa|Keyakinan|Keamanan|Simpan|Hapus|Buka katup|Air turun/i;

test.beforeEach(async ({ page }) => {
  await qaLogout(page.request);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await mockAiApis(page);
  await page.addInitScript(() => {
    localStorage.removeItem('BARISTA_LANGUAGE');
    localStorage.removeItem('BARISTA_AI_SETTINGS');
    localStorage.removeItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED');
  });
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('fresh launch defaults to English and AI Brew result surfaces stay English', async ({ page }) => {
  await page.goto('/tools?tab=ai', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await page.goto('/tools?tab=ai', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Barista Tools/i })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('tab', { name: /AI Brew/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Calculator/i })).toBeVisible();

  let visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toMatch(INDONESIAN_CRITICAL_COPY);

  await page.getByTestId('ai-brew-open-quick').click();
  await expect(page.getByTestId('ai-brew-builder-quick')).toBeVisible();
  await page.getByTestId('ai-brew-coffee-name').fill('English QA Ethiopia');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText(/English QA Ethiopia/i, { timeout: 30_000 });
  await expect(result.getByRole('tab', { name: /Plan/i })).toBeVisible();
  await expect(result.getByRole('tab', { name: /Brew Guide/i })).toBeVisible();
  await expect(result.getByRole('tab', { name: /Coach/i })).toBeVisible();
  await expect(result.getByRole('tab', { name: /Details/i })).toBeVisible();
  await expect(result).toContainText(/Expected cup|Confidence|Safety|Grind|Temperature|Extraction/i);

  visibleText = await result.innerText();
  expect(visibleText).not.toMatch(INDONESIAN_CRITICAL_COPY);
});

test('explicit Indonesian still uses professional barista copy', async ({ page }) => {
  await page.goto('/tools?tab=ratio&language=id', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Alat Barista/i })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.getByRole('tab', { name: /Kalkulator/i })).toBeVisible();
  await page.getByRole('button', { name: /Ukuran Giling/i }).click();
  await expect(page.getByText(/Light roast|Medium roast|Dark roast/i).first()).toBeVisible();
  await expect(page.getByText(/Terang|Gelap/i)).toHaveCount(0);
});
