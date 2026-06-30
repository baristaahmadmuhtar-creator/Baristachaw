import { test, expect, type Page } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaAdminUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { collectFatalBrowserErrors, expectNoHorizontalOverflow } from '../helpers/overflow';

test.beforeEach(async ({ page }) => {
  await qaLogout(page.request);
  await page.goto('/');
  await clearClientState(page);
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

async function expectAdminReady(page: Page) {
  await expect(page.getByRole('main', { name: 'Konten admin' })).toBeVisible({ timeout: 30_000 });
}

test('admin users get a mobile Admin entry and can return to the app', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());
  await page.goto('/?language=id', { waitUntil: 'domcontentloaded' });

  const mobileNav = page.getByTestId('mobile-bottom-nav');
  await expect(mobileNav).toBeVisible({ timeout: 30_000 });

  const adminLink = mobileNav.getByRole('link', { name: 'Admin' });
  await expect(adminLink).toBeVisible();
  await adminLink.click();

  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await expectAdminReady(page);

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('button', { name: 'Aplikasi' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('admin mobile manage opens account control without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());
  await page.goto('/admin?tab=users&language=id', { waitUntil: 'domcontentloaded' });

  await expectAdminReady(page);
  await page.getByRole('button', { name: 'Kelola' }).first().click();

  await expect(page.getByRole('heading', { name: 'Kontrol akun' })).toBeVisible();
  await expect(page.getByText('Kontrol plan cepat')).toBeVisible();
  await expect(page.getByRole('link', { name: /Kontak user/i })).toBeVisible();
  await expect(page.getByLabel('Tanggal past due')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terapkan sementara' }).first()).toBeVisible();
});

test('admin mobile exposes editable plans and catalog operations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());

  await page.goto('/admin?tab=plans&language=id', { waitUntil: 'domcontentloaded' });
  await expectAdminReady(page);
  await expect(page.getByText('Katalog plan')).toBeVisible();
  await expect(page.getByLabel('Catatan operator').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan' }).first()).toBeVisible();

  await page.goto('/admin?tab=database&language=id', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Operasi katalog')).toBeVisible();
  await expect(page.getByText('Request katalog baru')).toBeVisible();
  await expect(page.getByLabel('Payload JSON')).toBeVisible();
});

test('admin payment queue is a dedicated compact mobile page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());

  await page.goto('/admin?tab=queues&language=id', { waitUntil: 'domcontentloaded' });

  await expectAdminReady(page);
  await expect(page.getByRole('heading', { name: 'Antrean payment dan plan' })).toBeVisible();
  await expect(page.getByTestId('admin-payment-queue')).toBeVisible();
  await expect(page.getByPlaceholder('Cari invoice, email, user, plan, bank, path bukti')).toBeVisible();
  await expect(page.getByTestId('admin-plan-user-queue')).toBeVisible();
  await expect(page.getByRole('button', { name: /Semua/i }).first()).toBeVisible();
});

test('admin AI control shows provider health without exposing secrets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await qaLogin(page.request, buildQaAdminUser());

  await page.goto('/admin?tab=ai&language=id', { waitUntil: 'domcontentloaded' });

  await expectAdminReady(page);
  await expect(page.getByText('Kontrol provider AI')).toBeVisible();
  await expect(page.getByText('Inventory aman secret')).toBeVisible();
  await expect(page.getByText('Pemakaian provider AI Brew')).toBeVisible();
  await expect(page.getByText('Hari ini', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terapkan range' })).toBeVisible();
  await expect(page.getByText('Groq', { exact: true })).toBeVisible();
  await expect(page.getByText('Gemini', { exact: true })).toBeVisible();
  await expect(page.getByText('Key standar / Key paid').first()).toBeVisible();
  await expect(page.getByText(/sk-|gsk_|AIza/i)).not.toBeVisible();
});

test('admin iOS XR viewport keeps primary tabs inside the page without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  const browserErrors = collectFatalBrowserErrors(page);
  await qaLogin(page.request, buildQaAdminUser());

  for (const tab of ['overview', 'users', 'plans', 'queues', 'ai'] as const) {
    await page.goto(`/admin?tab=${tab}&language=id`, { waitUntil: 'domcontentloaded' });
    await expectAdminReady(page);
    await expectNoHorizontalOverflow(page, `admin iOS XR ${tab}`);
  }

  browserErrors.expectNoFatalErrors('admin iOS XR tabs');
});

test('admin iOS PWA shell scrolls internally and keeps form controls zoom-safe', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const root = document.documentElement;
    root.setAttribute('data-ios', '');
    root.setAttribute('data-pwa', '');
    root.setAttribute('data-ios-standalone', '');
    root.setAttribute('data-web-parity', '');
    root.style.setProperty('--app-height', '844px');
    root.style.setProperty('--device-safe-bottom', '34px');
    root.style.setProperty('--safe-bottom', '34px');
  });
  await qaLogin(page.request, buildQaAdminUser());

  await page.goto('/admin?tab=users&language=id&runtime=web_parity&ui_profile=pwa&host_safe_bottom=34', { waitUntil: 'domcontentloaded' });
  await expectAdminReady(page);

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    root.setAttribute('data-ios', '');
    root.setAttribute('data-pwa', '');
    root.setAttribute('data-ios-standalone', '');
    root.setAttribute('data-web-parity', '');
    root.style.setProperty('--app-height', '844px');
    root.style.setProperty('--device-safe-bottom', '34px');
    root.style.setProperty('--safe-bottom', '34px');

    const pane = document.querySelector<HTMLElement>('[data-testid="admin-scroll-pane"]');
    const field = document.querySelector<HTMLElement>('.admin-app-shell input, .admin-app-shell select, .admin-app-shell textarea');
    if (!pane || !field) return null;

    pane.scrollTop = 720;
    return {
      paneClientHeight: pane.clientHeight,
      paneOverflowY: getComputedStyle(pane).overflowY,
      paneScrollHeight: pane.scrollHeight,
      paneScrollTop: pane.scrollTop,
      fieldFontSize: Number.parseFloat(getComputedStyle(field).fontSize),
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.paneScrollHeight ?? 0).toBeGreaterThan(metrics?.paneClientHeight ?? 0);
  expect(metrics?.paneScrollTop ?? 0).toBeGreaterThan(100);
  expect(metrics?.paneOverflowY).toMatch(/auto|scroll/);
  expect(metrics?.fieldFontSize ?? 0).toBeGreaterThanOrEqual(16);
  expect(metrics?.bodyOverflowY).toBe('hidden');
  expect(metrics?.htmlOverflowY).toBe('hidden');
});
