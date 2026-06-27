import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { mockAiApis } from '../helpers/network';
import { expectMobileParityPageHealthy, mobileParityPath } from '../helpers/mobileParity';

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

test.beforeEach(async ({ page }) => {
  await mockAiApis(page);
  await qaLogout(page.request);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ id: 'qa-android-billing', email: 'qa-android-billing@example.com' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('Android native shell billing opens manual invoice and proof review without duplicate checkout', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'android web parity billing is a mobile-store gate');

  await page.route('**/api/billing/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        requestId: 'android_checkout_e2e',
        mode: 'manual_invoice',
        provider: 'manual',
        paymentRequestId: 'inv_android_123',
        paymentActionRequired: true,
        reviewStorage: 'persisted',
        planCode: 'starter',
        duration: 'quarterly',
        manualInvoice: {
          id: 'inv_android_123',
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
          message: 'Invoice is ready. Transfer the exact amount, then upload proof to enter admin review.',
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
        requestId: 'android_proof_e2e',
        paymentRequestId: 'inv_android_123',
        status: 'receipt_received',
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

  await page.goto(mobileParityPath('/scanner', { platform: 'android', language: 'id', hostSafeBottom: 28 }), {
    waitUntil: 'domcontentloaded',
  });
  await expectMobileParityPageHealthy(page, 'android billing scanner route');

  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'android-billing.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });
  await page.getByRole('button', { name: /Analisis Gambar|Analyze Image/i }).click();

  const modal = page.getByTestId('ai-access-gate-modal');
  await expect(modal).toBeVisible();
  await page.getByTestId('ai-gate-plan-option-starter').click();
  await page.getByTestId('ai-gate-start-checkout').click();
  await expect(page.getByText(/TOTAL YANG DITRANSFER|TOTAL TRANSFER|Transfer Manual/i)).toBeVisible();

  const proofInput = page.getByTestId('ai-gate-proof-input');
  await proofInput.setInputFiles({
    name: 'proof.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });
  await page.getByTestId('ai-gate-confirm-proof').click();
  await page.getByTestId('ai-gate-submit-proof').click();

  await expect(page.getByText(/Bukti pembayaran sedang diperiksa|Payment proof is under review/i)).toBeVisible();
  await expect(page.getByText(/Jangan kirim ulang bukti|Do not resubmit/i)).toBeVisible();
  await expect(page.getByTestId('ai-gate-start-checkout')).toHaveCount(0);
  await expectMobileParityPageHealthy(page, 'android billing proof review');
});
