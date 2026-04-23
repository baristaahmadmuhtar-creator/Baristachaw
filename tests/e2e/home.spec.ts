import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';

const isLive = String(process.env.LIVE_E2E || '').trim() === '1';

async function waitForHomeAuthState(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => {
      const signOut = document.querySelector('[aria-label="Sign Out"]');
      const signIn = Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Sign In'));
      return Boolean(signOut || signIn);
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

test('shows unauthenticated home state', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  const search = page.getByPlaceholder('Sign in to use AI search...');
  await expect(search).toBeDisabled();
});

test('supports authenticated search, copy, save, and theme toggle', async ({ page, context, browserName }) => {
  if (browserName === 'firefox') test.slow();

  await qaLogin(page.request);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForHomeAuthState(page);
  await expect(page.getByLabel('Sign Out')).toBeVisible();

  const search = page.getByPlaceholder('Search the web with AI...');
  await expect(search).toBeEnabled();

  await search.fill('qa_e2e espresso tips');
  await search.press('Enter');

  await expect(page.getByText('AI Search Result').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Live Web Sources' })).toBeVisible();
  await expect(page.getByText('2 sources')).toBeVisible();
  await expect(page.getByRole('link', { name: /QA Source 1/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /QA Source 2/i })).toBeVisible();

  await page.getByRole('button', { name: 'Copy Summary' }).click();
  await page.getByRole('button', { name: 'Save to Collection' }).click();

  await expect(page.getByText('Saved to Collection')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByLabel('Toggle theme').click();
  const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  const hasLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
  expect(hasDark || hasLight).toBeTruthy();

  const lsState = await context.storageState();
  expect(JSON.stringify(lsState.origins)).toContain('BARISTA_THEME');
});

test('language switch updates guest search placeholder copy', async ({ page }) => {
  const menuButton = page.getByRole('button', { name: /Open language menu|Buka menu bahasa/i }).first();
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const indonesianOption = page.getByRole('button', { name: /Bahasa Indonesia/i }).first();
  await expect(indonesianOption).toBeVisible();
  await indonesianOption.click();

  await expect(page.getByPlaceholder('Masuk untuk menggunakan pencarian AI...')).toBeDisabled();
});

test('arabic language option is fully visible in language menu', async ({ page }) => {
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
  const menuButton = page.getByRole('button', { name: /Open language menu|Buka menu bahasa/i }).first();
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const arabicOption = page.locator('button').filter({ hasText: 'Arabic' }).first();
  await expect(arabicOption).toBeVisible();
  await arabicOption.click();

  await expect(
    page.locator('input[placeholder*="\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a"]')
  ).toBeDisabled();
});

test('navigates to all primary routes from home cards', async ({ page }) => {
  const homeContent = page.locator('.page-container').first();

  await clickHomeCard(page, homeContent.locator('a[href="/chat"]').filter({ hasText: 'Ask BaristaClaw' }).first());
  await expect(page).toHaveURL(/\/chat$/);

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/scanner"]').filter({ hasText: 'Vision Scan' }).first());
  await expect(page).toHaveURL(/\/scanner$/);

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/tools?tab=ai-brew"]').filter({ hasText: 'AI Brew' }).first());
  await expect(page).toHaveURL(/\/tools\?tab=ai-brew$/);
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/tools"]').filter({ hasText: 'Barista Tools' }).first());
  await expect(page).toHaveURL(/\/(tools|coffee)$/);

  await page.goto('/');
  await clickHomeCard(page, homeContent.locator('a[href="/collection"]').filter({ hasText: 'Collection' }).first());
  await expect(page).toHaveURL(/\/collection$/);
});

