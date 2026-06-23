import { test, expect, type Page } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaAdminUser, buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { collectFatalBrowserErrors } from '../helpers/overflow';

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

test('pricing operations show inline errors instead of browser alerts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  
  // Mock API to return empty prices and promos so the table renders cleanly
  await page.route('**/api/admin/pricing/prices', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/admin/pricing/promos', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) });
    } else {
      await route.continue();
    }
  });

  await qaLogin(page.request, buildQaAdminUser());
  await page.goto('/admin?tab=plans&language=id', { waitUntil: 'domcontentloaded' });
  await expectAdminReady(page);

  // Open "Tambah harga" form
  await page.getByRole('button', { name: 'Tambah harga' }).click();
  
  // Submit without filling fields (operator note is empty)
  await page.getByRole('button', { name: 'Simpan harga' }).click();
  
  // Expect inline error "Operator reason required"
  // 'operatorNoteRequired' -> 'Catatan operator minimal 12 karakter.'
  await expect(page.getByText('Catatan operator minimal 12 karakter.')).toBeVisible();
  
  // Close the editor
  await page.getByRole('button', { name: 'Batal' }).click();

  // Open "Tambah promo" form
  await page.getByRole('button', { name: 'Tambah promo' }).click();
  
  // Submit without filling
  await page.getByRole('button', { name: 'Simpan promo' }).click();
  
  // The promo editor starts with code missing!
  // 'promoValidationRequired' -> 'Kode promo, jenis diskon, dan nilai diskon wajib diisi.'
  await expect(page.getByText('Kode promo, jenis diskon, dan nilai diskon wajib diisi.')).toBeVisible();
});

test('delete requires confirmation dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  
  // Mock API to return one mock price
  await page.route('**/api/admin/pricing/prices', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: [
            {
              id: 'price_mock_1',
              planCode: 'pro',
              duration: 'monthly',
              currency: 'idr',
              originalPrice: 150000,
              discountPrice: 99000,
              isActive: true,
            }
          ]
        })
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/admin/pricing/promos', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) });
    } else {
      await route.continue();
    }
  });
  
  await qaLogin(page.request, buildQaAdminUser());
  await page.goto('/admin?tab=plans&language=id', { waitUntil: 'domcontentloaded' });
  await expectAdminReady(page);

  // Click delete button for the mock price
  // Let's look for the first button with text 'Hapus' inside the prices table
  const deleteBtn = page.getByRole('button', { name: 'Hapus' }).first();
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
  
  // Expect confirmation dialog
  // 'deletePriceTitle' -> 'Hapus harga plan'
  await expect(page.getByRole('heading', { name: 'Hapus harga plan' })).toBeVisible();
  
  // Expect the description text
  // 'deletePriceDescription' -> 'Hapus {item}? Checkout akan kembali memakai harga katalog statis.'
  await expect(page.getByText('Checkout akan kembali memakai harga katalog statis.')).toBeVisible();
});

test('user plan catalog displays admin dynamic price', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  
  // Mock API to return dynamic pricing
  await page.route('**/api/billing/pricing', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          prices: [
            {
              id: 'price_mock_dynamic',
              planCode: 'pro',
              duration: 'monthly',
              currency: 'usd',
              originalPrice: 150,
              discountPrice: 88, // unique number to assert
              isActive: true,
            }
          ]
        })
      });
    } else {
      await route.continue();
    }
  });

  await qaLogin(page.request, buildQaUser());
  
  // Go to home page to see plan catalog
  await page.goto('/?language=id', { waitUntil: 'domcontentloaded' });
  
  // Click 'Tingkatkan paket' to open catalog
  await page.getByRole('button', { name: 'Tingkatkan paket' }).click();

  // The default tab might be 3 Months, so click 1 Month to see our mock
  await page.getByRole('button', { name: '1 Month' }).click();

  // The catalog should display the dynamic price: $88
  await expect(page.getByText(/\$88/)).toBeVisible({ timeout: 15_000 });
});
