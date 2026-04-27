import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';
import { continueAsGuestFromAuthGate, expectFirstRunAuthGate } from '../helpers/authGate';

const isLive = String(process.env.LIVE_E2E || '').trim() === '1';

async function waitForHomeAuthState(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => {
      const signOut = document.querySelector('[aria-label="Sign Out"]');
      const localizedSignOut = document.querySelector('[aria-label="Keluar"]');
      const signIn = Array.from(document.querySelectorAll('button')).some((button) => /Sign In|Masuk/.test(button.textContent || ''));
      return Boolean(signOut || localizedSignOut || signIn);
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function clickHomeCard(page: import('@playwright/test').Page, locator: import('@playwright/test').Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

test.beforeEach(async ({ page }) => {
  if (!isLive) await mockAiApis(page);
  await qaLogout(page.request);
  await page.goto('/');
  await clearClientState(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('shows first-run auth gate and keeps guest entry available', async ({ page }) => {
  await expectFirstRunAuthGate(page);
  await continueAsGuestFromAuthGate(page);
  const search = page.getByPlaceholder(/Masuk untuk memakai pencarian AI|Sign in to use AI search/i);
  await expect(search).toBeEnabled({ timeout: 30_000 });
  await search.fill('qa_e2e guest search');
  await search.press('Enter');
  await expect(page.getByTestId('ai-access-gate-modal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Masuk untuk memakai Pencarian AI|Sign in to use AI Search/i })).toBeVisible();
});

test('supports authenticated search, copy, save, and theme toggle', async ({ page, context, browserName }) => {
  if (browserName === 'firefox') test.slow();

  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForHomeAuthState(page);
  await expect(page.getByLabel(/Sign Out|Keluar/i)).toBeVisible();

  const search = page.getByPlaceholder(/Search the web with AI|Cari di web dengan AI/i);
  await expect(search).toBeEnabled();

  await search.fill('qa_e2e espresso tips');
  await search.press('Enter');

  await expect(page.getByText(/AI Search Result|Hasil Pencarian AI/i).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /Live Web Sources|Sumber Web Langsung/i })).toBeVisible();
  await expect(page.getByText(/2 sources|2 sumber/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /QA Source 1/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /QA Source 2/i })).toBeVisible();

  await page.getByRole('button', { name: /Copy Summary|Salin Ringkasan/i }).click();
  await page.getByRole('button', { name: /Save to Collection|Simpan ke Koleksi/i }).click();

  await expect(page.getByText(/Saved to Collection|Disimpan ke Koleksi/i)).toBeVisible();
  await page.getByRole('button', { name: /Close|Tutup/i }).click();

  await page.getByLabel(/Toggle theme|Ubah tema/i).click();
  const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  const hasLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
  expect(hasDark || hasLight).toBeTruthy();

  const lsState = await context.storageState();
  expect(JSON.stringify(lsState.origins)).toContain('BARISTA_THEME');
});

test('shows paid plan choices and upgrades free users when AI search is attempted', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForHomeAuthState(page);

  const panel = page.getByTestId('home-plan-growth-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByText(/Workspace status|Status ruang kerja/i)).toHaveCount(0);
  await expect(panel.getByRole('button', { name: /View plan options|Lihat pilihan paket/i })).toBeVisible();

  await page.getByTestId('home-plan-open-catalog').click();
  const dialog = page.getByRole('dialog', { name: /Pick the plan|Pilih paket/i });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('plan-card-free')).toBeVisible();
  await expect(page.getByTestId('plan-card-pro')).toBeVisible();
  await expect(dialog.getByText(/Recommended|Rekomendasi/i).first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Stay on Free|Tetap di Gratis/i })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  const search = page.getByPlaceholder(/Search the web with AI|Cari di web dengan AI/i);
  await expect(search).toBeEnabled();
  await search.fill('qa_e2e free search');
  await search.press('Enter');
  await expect(page.getByTestId('ai-access-gate-modal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Pencarian AI dibuka mulai paket Starter|AI Search starts on Starter/i })).toBeVisible();
});

test('language switch updates guest search placeholder copy', async ({ page }) => {
  await continueAsGuestFromAuthGate(page);
  const menuButton = page.getByRole('button', { name: /Open language menu|Buka menu bahasa/i }).first();
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const indonesianOption = page.getByRole('button', { name: /Bahasa Indonesia/i }).first();
  await expect(indonesianOption).toBeVisible();
  await indonesianOption.click();

  await expect(page.getByPlaceholder('Masuk untuk memakai pencarian AI...')).toBeEnabled();
});

test('arabic language option is fully visible in language menu', async ({ page }) => {
  await continueAsGuestFromAuthGate(page);
  const menuButton = page.getByRole('button', { name: /Open language menu|Buka menu bahasa/i }).first();
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const arabicOption = page.locator('button').filter({ hasText: 'Arabic' }).first();
  await expect(arabicOption).toBeVisible();

  const nativeLabel = arabicOption.locator('span[dir="rtl"]').first();
  await expect(nativeLabel).toHaveText('\u0627\u0644\u0639\u0631\u0628\u064a\u0629');
  await expect(nativeLabel).not.toHaveClass(/truncate/);
});

test('language switch updates guest search placeholder copy for arabic', async ({ page }) => {
  await continueAsGuestFromAuthGate(page);
  const menuButton = page.getByRole('button', { name: /Open language menu|Buka menu bahasa/i }).first();
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const arabicOption = page.locator('button').filter({ hasText: 'Arabic' }).first();
  await expect(arabicOption).toBeVisible();
  await arabicOption.click();

  await expect(
    page.locator('input[placeholder*="\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a"]')
  ).toBeEnabled();
});

test('navigates to all primary routes from home cards', async ({ page }) => {
  await continueAsGuestFromAuthGate(page);
  const homeContent = page.locator('.page-container').first();

  await clickHomeCard(page, homeContent.locator('a[href="/chat"]').first());
  await expect(page).toHaveURL(/\/chat$/);

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/scanner"]').first());
  await expect(page).toHaveURL(/\/scanner$/);

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/tools?tab=ai-brew"]').first());
  await expect(page).toHaveURL(/\/tools\?tab=ai-brew$/);
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/tools"]').first());
  await expect(page).toHaveURL(/\/(tools|coffee)$/);

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/collection"]').first());
  await expect(page).toHaveURL(/\/collection$/);
});
