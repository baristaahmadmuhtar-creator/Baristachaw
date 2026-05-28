import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';

const ENGLISH_FORBIDDEN_INDONESIAN_COPY =
  /Alat Barista|Kalkulator|Tugas|Preset Metode Seduh|Ukuran Giling|Dosis \(g\)|Air \(ml\)|Ringkasan|Panduan Seduh|Detail tambahan|Prediksi rasa|Keyakinan|Keamanan|Simpan|Hapus|Buka katup|Air turun|air panas|Cek rasa|Seduhan Terbaru|Pakai di Timer|Pakai di Rasio|Simpan ke Koleksi|Asisten AI|Profil kopi|Detail kopi|Menyusun seduhan|\b(Tuang|Bilas|Sajikan|Rendam|Tekan|Aduk|Panaskan|Pindahkan|Saring|Dilusi|Katup|Gilingan|Suhu|Ekstraksi|Basahi|Endapkan)\b/i;

const INDONESIAN_FORBIDDEN_ENGLISH_AI_COPY =
  /\b(Brew Guide|Expected Cup|Safety|Release(?: over ice)?|Drawdown|Additional details|Prediction & confidence detail|Core cup prediction|Quick AI Brew result|Technique detail|Pro brew details|Bean profile|Bean details optional|Add bean detail|Hide bean detail|Source details|Water source used|More actions|Use in Timer|Use in Ratio|Save to Collection|Edit inputs|Close planned output|Building your brew|Taste Check|Next Brew Adjustment|Primary move|Coffee \/ origin|Target Profile|Guided brew|Ready to brew|Current step|Next step|Open timer)\b/i;

async function scanAiBrewResultTabs(page: import('@playwright/test').Page, forbidden: RegExp) {
  const result = page.getByTestId('ai-brew-result');
  const tabs = ['plan', 'flow', 'coach', 'details'] as const;

  for (const tab of tabs) {
    const trigger = result.getByTestId(`ai-brew-result-tab-${tab}`);
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-selected', 'true');
    const text = await result.innerText();
    expect(text).not.toMatch(forbidden);
  }
}

async function pickAquaWater(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-brew-water-picker').click();
  await page.getByTestId('ai-brew-picker-search-water_brand').fill('aqua');
  await page.getByTestId('ai-brew-picker-option-water_brand-aqua-id').first().click();
}

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
  await expect(page.getByRole('tab', { name: /^Brew$/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Calculator/i })).toBeVisible();

  let visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toMatch(ENGLISH_FORBIDDEN_INDONESIAN_COPY);

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

  await scanAiBrewResultTabs(page, ENGLISH_FORBIDDEN_INDONESIAN_COPY);
});

test('explicit Indonesian AI Brew precision result tabs stay localized', async ({ page }) => {
  await page.goto('/tools?tab=ai&language=id', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await page.goto('/tools?tab=ai&language=id', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.getByRole('heading', { name: /Alat Barista/i })).toBeVisible();

  await page.getByTestId('ai-brew-open-pro').click();
  await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible();
  await page.getByTestId('ai-brew-coffee-name').fill('QA Bahasa Presisi');
  await pickAquaWater(page);
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText(/QA Bahasa Presisi/i, { timeout: 30_000 });
  await expect(result.getByTestId('ai-brew-result-tab-plan')).toContainText(/Ringkasan/i);
  await expect(result.getByTestId('ai-brew-result-tab-flow')).toContainText(/Seduh/i);
  await expect(result.getByTestId('ai-brew-result-tab-coach')).toContainText(/^AI$/i);
  await expect(result.getByTestId('ai-brew-result-tab-details')).toContainText(/Detail/i);
  await expect(result).toContainText(/Prediksi Rasa|Keyakinan|Gilingan|Suhu|Ekstraksi/i);

  await scanAiBrewResultTabs(page, INDONESIAN_FORBIDDEN_ENGLISH_AI_COPY);
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
