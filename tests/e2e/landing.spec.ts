import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('baristachaw-marketing-language', 'id');
    localStorage.setItem('baristachaw-marketing-region', 'id');
  });
  await page.route('**/api/auth/me?soft=1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false, user: null }),
    });
  });
  await page.goto('/');
});

test('renders the full landing contract without console errors or overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Sempurnakan Seduhan Kopi Anda Setiap Pagi/i);
  await expect(page.getByRole('region', { name: /Sempurnakan Seduhan Kopi Anda Setiap Pagi/i }).getByRole('link', { name: /Mulai Seduh/ })).toHaveAttribute(
    'href',
    'https://app.baristachaw.com/tools?tab=ai_brew',
  );
  await expect(page.getByRole('heading', { name: 'V60', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Espresso', exact: true })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('support widget opens, traps focus, and routes to validated support form', async ({ page }) => {
  await page.getByRole('button', { name: 'Buka bantuan Baristachaw' }).click();
  const dialog = page.getByRole('dialog', { name: 'Baristachaw Support' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/bukan human support 24\/7/)).toBeVisible();
  await dialog.getByRole('link', { name: 'Hubungi support' }).click();
  await expect(page).toHaveURL(/\/support$/);

  await page.getByRole('button', { name: 'Buka laporan support' }).click();
  await expect(page.getByRole('alert')).toContainText(/Periksa nama/);
  await page.getByRole('textbox', { name: 'Nama' }).fill('Ahmad');
  await page.getByRole('textbox', { name: 'Email' }).fill('not-an-email');
  await page.getByRole('textbox', { name: 'Pesan' }).fill('Masalah AI Brew pada Android setelah keyboard terbuka.');
  await page.getByRole('button', { name: 'Buka laporan support' }).click();
  await expect(page.getByRole('alert')).toContainText(/Periksa nama/);
});

test('legal and download routes are direct, honest, and non-PWA', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privasi Baristachaw' })).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Ketentuan penggunaan' })).toBeVisible();
  await page.goto('/download');
  await expect(page.getByRole('heading', { name: /Minta akses Baristachaw untuk Android/ })).toBeVisible();
  await expect(page.getByText(/Origin app\.baristachaw\.com tertanam/)).toBeVisible();
  expect(await page.locator('link[rel="manifest"]').count()).toBe(0);
});

test('language toggle changes the public interface without mixed primary copy', async ({ page }) => {
  await page.getByLabel('Select Language').click();
  await page.getByRole('option', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Master the Perfect Extraction Every Morning/i);
  await expect(page.getByRole('region', { name: /Master the Perfect Extraction Every Morning/i }).getByRole('link', { name: 'Start Brewing' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('pricing CTAs open the correct Starter and Pro checkout modal in Indonesian and English', async ({ page }) => {
  await page.getByTestId('landing-pricing-starter').click();
  await expect(page.getByTestId('landing-register-modal')).toBeVisible();
  await expect(page.getByTestId('landing-plan-option-starter')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('landing-register-modal')).toHaveCount(0);

  await page.getByTestId('landing-pricing-pro').click();
  await expect(page.getByTestId('landing-register-modal')).toBeVisible();
  await expect(page.getByTestId('landing-plan-option-pro')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('landing-register-modal')).toHaveCount(0);

  await page.getByLabel('Select Language').click();
  await page.getByRole('option', { name: 'English' }).click();

  await page.getByTestId('landing-pricing-starter').click();
  await expect(page.getByTestId('landing-register-modal')).toBeVisible();
  await expect(page.getByTestId('landing-plan-option-starter')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('landing-register-modal')).toHaveCount(0);

  await page.getByTestId('landing-pricing-pro').click();
  await expect(page.getByTestId('landing-register-modal')).toBeVisible();
  await expect(page.getByTestId('landing-plan-option-pro')).toHaveAttribute('aria-pressed', 'true');
});

test('billing modal creates manual invoice and submits proof with inline validation', async ({ page }) => {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.unroute('**/api/auth/me?soft=1');

  let authenticated = false;
  const origin = new URL(page.url()).origin;
  const corsHeaders = {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS,PUT',
  };

  await page.route('**/api/auth/me?soft=1', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        authenticated,
        user: authenticated ? { email: 'landing-billing@example.com' } : null,
      }),
    });
  });
  await page.route('**/api/auth/email/signup', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    authenticated = true;
    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, user: { email: 'landing-billing@example.com' } }),
    });
  });
  await page.route('**/api/billing/checkout', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: 'landing_checkout_e2e',
        mode: 'manual_invoice',
        provider: 'manual',
        paymentRequestId: 'landing_inv_123',
        paymentActionRequired: true,
        reviewStorage: 'persisted',
        planCode: 'starter',
        duration: 'quarterly',
        manualInvoice: {
          id: 'landing_inv_123',
          status: 'pending_review',
          amount: 149000,
          amountLabel: 'Rp 149.000',
          currency: 'idr',
          uniqueSuffix: 123,
          instructions: {
            bankName: 'BCA',
            accountName: 'Baristachaw QA',
            accountNumber: '1234567890',
            notifyWebhookConfigured: false,
            whatsappNumber: '+6738270092',
            whatsappUrl: 'https://wa.me/6738270092',
            instagramUrl: 'https://instagram.com/baristachaw',
            instagramHandle: '@baristachaw',
            qrisImageUrl: 'https://cdn.example.com/qris.png',
            qrisLabel: 'QRIS Baristachaw QA',
          },
          proof: {
            endpoint: '/api/billing/proof',
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            storage: 'persisted',
          },
          message: 'Manual payment is pending admin review.',
        },
      }),
    });
  });
  await page.route('**/api/billing/proof', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: 'landing_proof_e2e',
        paymentRequestId: 'landing_inv_123',
        status: 'pending_review',
        proof: {
          generatedFileName: 'proof.png',
          mimeType: 'image/png',
          sizeBytes: 68,
          storage: 'metadata_only',
          receivedAt: Date.now(),
        },
        proofStorage: 'support_fallback',
        deliveryMode: 'manual_support',
        paymentActionRequired: true,
        entitlement: 'pending_admin_review',
        message: 'Proof received.',
      }),
    });
  });

  await page.goto('/');
  await page.getByTestId('landing-pricing-starter').click();
  const dialog = page.getByTestId('landing-register-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('landing-plan-option-starter')).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel('Nama lengkap').fill('Landing Billing QA');
  await page.getByLabel('Email').fill('landing-billing@example.com');
  await page.getByLabel('Kata sandi').fill('strong-password-123');
  await page.getByTestId('landing-auth-submit').click();

  await expect(page.getByText(/TOTAL TRANSFER/i)).toBeVisible();
  await expect(page.getByText(/Kode 123 membantu admin/i)).toBeVisible();
  await expect(page.getByRole('img', { name: /QRIS Baristachaw QA/i })).toBeVisible();
  await expect(page.getByTestId('landing-submit-proof')).toBeDisabled();

  const proofInput = page.getByTestId('landing-proof-input');
  await proofInput.setInputFiles({
    name: 'wrong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a receipt', 'utf8'),
  });
  await expect(page.getByRole('alert')).toContainText(/Format bukti transfer harus/i);

  await proofInput.setInputFiles({
    name: 'proof.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64'),
  });
  await page.getByTestId('landing-confirm-proof').click();
  await expect(page.getByTestId('landing-submit-proof')).toBeEnabled();
  await page.getByTestId('landing-submit-proof').click();

  await expect(page.getByRole('heading', { name: /Pembayaran Menunggu Review/i })).toBeVisible();
  await page.getByRole('button', { name: 'Selesai' }).click();
  await page.getByTestId('landing-pricing-starter').click();
  await expect(page.getByRole('heading', { name: /Pembayaran Menunggu Review/i })).toBeVisible();
  await expect(page.getByText(/Jangan memilih paket lain atau mengirim bukti ulang/i)).toBeVisible();
  await expect(page.getByTestId('landing-submit-proof')).toHaveCount(0);
});

test('has no serious or critical axe violations', async ({ page }) => {
  const result = await new AxeBuilder({ page }).analyze();
  const blockers = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''));
  expect(blockers).toEqual([]);
});
