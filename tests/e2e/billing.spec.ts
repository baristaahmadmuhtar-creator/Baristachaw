import { test, expect, type Page } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { mockAiApis } from '../helpers/network';

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

function accountPlan(code: 'free' | 'starter' | 'pro') {
  const names = {
    free: 'Free',
    starter: 'Barista Starter',
    pro: 'Barista Pro',
  };
  return {
    code,
    name: names[code],
    description: '',
    aiDailyLimit: code === 'free' ? 12 : code === 'starter' ? 60 : 180,
    deepDailyLimit: code === 'pro' ? 40 : 0,
    scannerDailyLimit: code === 'free' ? 2 : code === 'starter' ? 12 : 60,
    storageMb: code === 'free' ? 64 : code === 'starter' ? 512 : 2048,
    seats: 1,
    supportSlaHours: code === 'free' ? 72 : code === 'starter' ? 48 : 24,
    features: [],
    priceMonthlyUsd: code === 'free' ? 0 : code === 'starter' ? 3.99 : 11.99,
    displayPrice: code === 'free' ? 'Free' : 'Manual invoice',
    checkoutMode: code === 'free' ? 'disabled' : 'manual_invoice',
  };
}

async function mockAccountStatus(page: Page, planCode: 'starter' | 'pro') {
  await page.route('**/api/account/status**', async (route) => {
    const currentPlan = accountPlan(planCode);
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: `account_${planCode}_e2e`,
        generatedAt: new Date().toISOString(),
        dataMode: 'runtime_fallback',
        user: {
          id: `qa-${planCode}`,
          email: `qa-${planCode}@example.com`,
          name: 'QA E2E',
          role: 'user',
          status: 'active',
          planCode,
          planName: currentPlan.name,
          lastSeenAt: new Date().toISOString(),
        },
        plan: currentPlan,
        plans: [accountPlan('free'), accountPlan('starter'), accountPlan('pro')],
        billing: {
          status: 'active',
          provider: 'manual',
          market: 'unknown',
          paymentAction: planCode === 'starter' ? 'checkout' : 'none',
          paymentActionRequired: false,
          message: '',
        },
        recommendedUpgrade: planCode === 'starter'
          ? {
            planCode: 'pro',
            planName: 'Barista Pro',
            ctaLabel: 'Upgrade',
            reason: 'Upgrade to Pro.',
            action: 'checkout',
          }
          : {
            planCode: 'pro',
            planName: 'Barista Pro',
            ctaLabel: 'Active',
            reason: 'Barista Pro is active.',
            action: 'none',
          },
        featureFlags: [],
        maintenance: [],
        appAccess: { status: 'ok', message: '' },
        warnings: [],
        realtime: { strategy: 'polling', intervalSec: 60 },
      }),
    });
  });
}

async function triggerScannerGate(page: Page) {
  await page.goto('/scanner', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });
  await page.getByRole('button', { name: /Analyze Image|Analisis Gambar/i }).click();
  await expect(page.getByTestId('ai-access-gate-modal')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockAiApis(page);
  await qaLogout(page.request);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('upgrade gate flows to manual invoice checkout and handles valid/invalid proof uploads', async ({ page }) => {
  await qaLogin(page.request);
  await page.route('**/api/billing/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: 'checkout_e2e',
        mode: 'manual_invoice',
        provider: 'manual',
        paymentRequestId: 'inv_123',
        paymentActionRequired: true,
        reviewStorage: 'persisted',
        planCode: 'starter',
        duration: 'quarterly',
        manualInvoice: {
          id: 'inv_123',
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
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: 'proof_e2e',
        paymentRequestId: 'inv_123',
        status: 'pending_review',
        proof: {
          generatedFileName: 'proof.png',
          mimeType: 'image/png',
          sizeBytes: 68,
          storage: 'metadata_only',
          receivedAt: Date.now(),
        },
        proofStorage: 'storage_ready',
        deliveryMode: 'direct_upload',
        paymentActionRequired: true,
        entitlement: 'pending_admin_review',
        message: 'Proof received.',
      }),
    });
  });
  await page.goto('/scanner', { waitUntil: 'domcontentloaded' });

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });
  await page.getByRole('button', { name: /Analyze Image|Analisis Gambar/i }).click();

  const modal = page.getByTestId('ai-access-gate-modal');
  await expect(modal).toBeVisible();

  await page.getByTestId('ai-gate-plan-option-starter').click();
  await page.getByTestId('ai-gate-start-checkout').click();

  await expect(page.getByText(/TOTAL TRANSFER|Transfer Manual/i)).toBeVisible();

  await expect(page.getByTestId('ai-gate-submit-proof')).toBeDisabled();

  const proofInput = page.getByTestId('ai-gate-proof-input');
  await proofInput.setInputFiles({
    name: 'wrong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image', 'utf8'),
  });

  await expect(page.getByRole('alert')).toContainText(/Format bukti transfer harus|Please upload an image file/i);
  await expect(page.getByTestId('ai-gate-submit-proof')).toBeDisabled();

  await proofInput.setInputFiles({
    name: 'proof.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });

  await page.getByTestId('ai-gate-confirm-proof').click();

  await expect(page.getByTestId('ai-gate-submit-proof')).toBeEnabled();
  
  await page.getByTestId('ai-gate-submit-proof').click();
  await expect(page.getByText(/Bukti pembayaran sedang diperiksa|Payment proof is under review/i)).toBeVisible();
  await expect(page.getByText(/Jangan kirim ulang bukti|Do not resubmit/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /WhatsApp/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Instagram/i })).toBeVisible();

  await page.getByRole('button', { name: /Mengerti|Got it/i }).click();
  await expect(modal).toHaveCount(0);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('home-workspace-status-panel')).toContainText(/Admin review|Menunggu admin|Proof received|Bukti diterima/i);
  await expect(page.getByTestId('home-plan-open-catalog')).toHaveCount(0);
  await expect(page.getByTestId('home-workspace-status-panel').getByRole('button', { name: /Contact support|Hubungi support|Hubungi dukungan/i })).toBeVisible();
  await page.goto('/scanner', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });
  await page.getByRole('button', { name: /Analyze Image|Analisis Gambar/i }).click();
  await expect(modal).toBeVisible();
  await expect(page.getByText(/Bukti pembayaran sedang diperiksa|Payment proof is under review/i)).toBeVisible();
  await expect(page.getByText(/Jangan kirim ulang bukti|Do not resubmit/i)).toBeVisible();
  await expect(page.getByTestId('ai-gate-start-checkout')).toHaveCount(0);
});

test('free users can choose Pro directly from the AI gate checkout', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ id: 'qa-free-pro-direct', email: 'qa-free-pro-direct@example.com' }));

  let checkoutBody: { planCode?: string } | null = null;
  await page.route('**/api/billing/checkout', async (route) => {
    checkoutBody = route.request().postDataJSON() as { planCode?: string };
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: 'checkout_pro_e2e',
        mode: 'manual_invoice',
        provider: 'manual',
        paymentRequestId: 'inv_pro_123',
        paymentActionRequired: true,
        reviewStorage: 'persisted',
        planCode: 'pro',
        duration: 'quarterly',
        manualInvoice: {
          id: 'inv_pro_123',
          status: 'pending_review',
          amount: 399000,
          amountLabel: 'Rp 399.000',
          currency: 'idr',
          uniqueSuffix: 321,
          instructions: {
            bankName: 'BCA',
            accountName: 'Baristachaw QA',
            accountNumber: '1234567890',
            notifyWebhookConfigured: false,
            whatsappNumber: '+6738270092',
            whatsappUrl: 'https://wa.me/6738270092',
            instagramUrl: 'https://instagram.com/baristachaw',
            instagramHandle: '@baristachaw',
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

  await triggerScannerGate(page);
  await expect(page.getByTestId('ai-gate-plan-option-starter')).toBeVisible();
  await expect(page.getByTestId('ai-gate-plan-option-pro')).toBeVisible();

  await page.getByTestId('ai-gate-plan-option-pro').click();
  await page.getByTestId('ai-gate-start-checkout').click();

  await expect.poll(() => checkoutBody?.planCode).toBe('pro');
  await expect(page.getByText(/TOTAL TRANSFER|Transfer Manual/i)).toBeVisible();
});

test('starter users only see Pro as a webapp upgrade option', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ id: 'qa-starter-upgrade', email: 'qa-starter-upgrade@example.com', planCode: 'starter' }));
  await mockAccountStatus(page, 'starter');

  let checkoutBody: { planCode?: string } | null = null;
  await page.route('**/api/billing/checkout', async (route) => {
    checkoutBody = route.request().postDataJSON() as { planCode?: string };
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: 'checkout_starter_to_pro_e2e',
        mode: 'manual_invoice',
        provider: 'manual',
        paymentRequestId: 'inv_starter_pro_123',
        paymentActionRequired: true,
        reviewStorage: 'persisted',
        planCode: 'pro',
        duration: 'quarterly',
        manualInvoice: {
          id: 'inv_starter_pro_123',
          status: 'pending_review',
          amount: 250000,
          amountLabel: 'Rp 250.000',
          currency: 'idr',
          uniqueSuffix: 444,
          instructions: {
            bankName: 'BCA',
            accountName: 'Baristachaw QA',
            accountNumber: '1234567890',
            notifyWebhookConfigured: false,
            whatsappNumber: '+6738270092',
            whatsappUrl: 'https://wa.me/6738270092',
            instagramUrl: 'https://instagram.com/baristachaw',
            instagramHandle: '@baristachaw',
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

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('home-workspace-status-panel')).toBeVisible();
  await page.getByTestId('home-plan-open-catalog').click();

  await expect(page.getByTestId('home-plan-catalog-modal')).toBeVisible();
  await expect(page.getByTestId('plan-card-starter')).toHaveCount(0);
  await expect(page.getByTestId('plan-card-pro')).toBeVisible();

  await page.getByTestId('plan-card-pro-choose').click();
  await expect.poll(() => checkoutBody?.planCode).toBe('pro');
  await expect(page.getByText(/TOTAL TRANSFER|Transfer Manual/i)).toBeVisible();
  await expect(page.getByText(/Rp 250\.000/i)).toBeVisible();
});

test('active Pro users see active-plan state instead of duplicate checkout', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ id: 'qa-active-pro', email: 'qa-active-pro@example.com', planCode: 'pro' }));
  await mockAccountStatus(page, 'pro');

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('home-workspace-status-panel')).toBeVisible();
  await page.getByTestId('home-plan-open-catalog').click();

  await expect(page.getByTestId('home-plan-catalog-modal')).toBeVisible();
  await expect(page.getByTestId('billing-active-plan-state')).toBeVisible();
  await expect(page.getByTestId('plan-card-starter')).toHaveCount(0);
  await expect(page.getByTestId('plan-card-pro')).toHaveCount(0);
});

test('scanner soft-opens for paid users if quota sync fails', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/scanner', { waitUntil: 'domcontentloaded' });

  await page.route('**/rest/v1/rpc/consume_app_quota', async (route) => {
    await route.fulfill({ status: 404, json: { message: 'Not found' } });
  });

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'qa_e2e.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });

  await page.getByRole('button', { name: /Analyze Image|Analisis Gambar/i }).click();

  await expect(page.getByText(/Results|Hasil/i)).toBeVisible({ timeout: 10_000 });
});
