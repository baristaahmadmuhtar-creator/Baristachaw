import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { mockAiApis } from '../helpers/network';

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

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

  await page.getByRole('button', { name: /Upgrade to Barista Starter|Pilih Barista Starter|Select Barista Starter/i }).click();

  await expect(page.getByText(/TOTAL TRANSFER|Transfer Manual/i)).toBeVisible();

  await expect(page.getByRole('button', { name: /Kirim Bukti/i })).toBeDisabled();

  const proofInput = page.locator('input#proof-file-input');
  await proofInput.setInputFiles({
    name: 'wrong.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image', 'utf8'),
  });

  await expect(page.getByRole('alert')).toContainText(/Format bukti transfer harus/i);
  await expect(page.getByRole('button', { name: /Kirim Bukti/i })).toBeDisabled();

  await proofInput.setInputFiles({
    name: 'proof.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  });

  await page.getByText(/Verifikasi bahwa Anda adalah manusia/i).click();

  await expect(page.getByRole('button', { name: /Kirim Bukti/i })).toBeEnabled();
  
  await page.getByRole('button', { name: /Kirim Bukti/i }).click();
  await expect(page.getByText(/Bukti Diterima - Menunggu Review/i)).toBeVisible();
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
