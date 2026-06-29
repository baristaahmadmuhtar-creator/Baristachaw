import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildManualPaymentSupportMessage,
  buildManualPaymentWhatsappUrl,
  manualPaymentDurationLabel,
  manualPaymentPlanLabel,
  manualPaymentProofStatusLabel,
  manualPaymentStatusLabel,
} from '../../packages/shared/src/manualPaymentMessage.ts';

const BASE_INPUT = {
  paymentRequestId: 'manual_lx_test123456789abc',
  userId: 'user_123',
  userEmail: 'buyer@example.com',
  userName: 'Ahmad Buyer',
  planCode: 'pro',
  planDisplayName: 'Barista Pro',
  duration: 'quarterly',
  amount: 399000,
  amountLabel: 'Rp 399.000',
  currency: 'idr',
  promoCode: 'LAUNCH10',
  status: 'pending_review',
  proofStatus: 'none',
  createdAt: Date.parse('2026-06-29T01:02:03.000Z'),
  updatedAt: Date.parse('2026-06-29T02:03:04.000Z'),
};

test('manual payment labels normalize plan, duration, status, and proof status in Indonesian', () => {
  assert.equal(manualPaymentPlanLabel('starter'), 'Starter');
  assert.equal(manualPaymentPlanLabel('pro'), 'Pro');
  assert.equal(manualPaymentPlanLabel('team'), 'Team');
  assert.equal(manualPaymentPlanLabel('enterprise'), 'Enterprise');
  assert.equal(manualPaymentPlanLabel('unknown-plan'), 'Paket tidak diketahui');
  assert.equal(manualPaymentDurationLabel('monthly'), '1 bulan');
  assert.equal(manualPaymentDurationLabel('quarterly'), '3 bulan');
  assert.equal(manualPaymentDurationLabel('yearly'), '1 tahun');
  assert.equal(manualPaymentDurationLabel('lifetime'), 'Durasi tidak diketahui');
  assert.equal(manualPaymentStatusLabel('pending_review'), 'Menunggu pembayaran / bukti transfer');
  assert.equal(manualPaymentStatusLabel('receipt_received'), 'Bukti diterima, menunggu review admin');
  assert.equal(manualPaymentProofStatusLabel('metadata_only'), 'Bukti tercatat, file dikirim manual/support');
  assert.equal(manualPaymentProofStatusLabel('supabase_signed_upload'), 'Bukti berhasil diupload');
});

test('payment initiated template always includes admin-critical identifiers and payment detail', () => {
  const message = buildManualPaymentSupportMessage({
    ...BASE_INPUT,
    templateType: 'payment_initiated',
  });

  assert.equal(message.templateType, 'payment_initiated');
  assert.match(message.text, /Halo Admin Baristachaw, saya ingin konfirmasi pembayaran manual\./);
  assert.match(message.text, /Payment ID: manual_lx_test123456789abc/);
  assert.match(message.text, /User ID: user_123/);
  assert.match(message.text, /Email: buyer@example\.com/);
  assert.match(message.text, /Nama: Ahmad Buyer/);
  assert.match(message.text, /Paket: Barista Pro \(pro\)/);
  assert.match(message.text, /Durasi: 3 bulan/);
  assert.match(message.text, /Nominal: Rp 399\.000/);
  assert.match(message.text, /Mata uang: IDR/);
  assert.match(message.text, /Promo: LAUNCH10/);
  assert.match(message.previewLabel, /manual_lx_test123456789abc/);
  assert.equal(message.warnings.length, 0);
  assert.equal(message.requiredMissing.length, 0);
});

test('proof submitted template includes proof status and file name', () => {
  const message = buildManualPaymentSupportMessage({
    ...BASE_INPUT,
    templateType: 'proof_submitted',
    status: 'receipt_received',
    proofStatus: 'supabase_signed_upload',
    proofFileName: 'manual_lx_test123456789abc_proof.png',
  });

  assert.match(message.text, /sudah mengirim bukti transfer/);
  assert.match(message.text, /Status bukti: Bukti berhasil diupload/);
  assert.match(message.text, /File bukti: manual_lx_test123456789abc_proof\.png/);
  assert.match(message.emailSubject, /Bukti pembayaran manual_lx_test123456789abc/);
});

test('failed upload fallback template explains support handoff clearly', () => {
  const message = buildManualPaymentSupportMessage({
    ...BASE_INPUT,
    templateType: 'proof_upload_failed_support_fallback',
    status: 'receipt_received',
    proofStatus: 'metadata_only',
  });

  assert.match(message.text, /upload bukti transfer di aplikasi gagal/);
  assert.match(message.text, /Saya akan kirim bukti transfer melalui chat ini/);
  assert.match(message.text, /Payment ID: manual_lx_test123456789abc/);
});

test('validator warns on optional missing fields and records required missing fields', () => {
  const message = buildManualPaymentSupportMessage({
    templateType: 'payment_problem',
    paymentRequestId: '',
    userId: '',
    userEmail: '',
    userName: '',
    planCode: '',
    duration: '',
    amountLabel: '',
    currency: '',
    status: '',
    proofStatus: '',
    userNote: '',
  });

  assert.match(message.text, /Payment ID: -/);
  assert.match(message.text, /User ID: -/);
  assert.match(message.text, /Masalah:\nMohon jelaskan kendala pembayaran di sini\./);
  assert.deepEqual(message.requiredMissing.sort(), ['amountLabel', 'paymentRequestId', 'planCode', 'userId'].sort());
  assert.ok(message.warnings.includes('missing:userEmail'));
  assert.ok(message.warnings.includes('missing:userName'));
  assert.ok(message.warnings.includes('missing:promoCode'));
  assert.ok(message.warnings.includes('missing:proofFileName'));
});

test('WhatsApp URL encodes canonical text, normalizes phone, compacts long text, and never leaks secrets', () => {
  const message = buildManualPaymentSupportMessage({
    ...BASE_INPUT,
    templateType: 'payment_problem',
    userNote: [
      'Saya sudah transfer tetapi status belum berubah.',
      'draftToken=secret uploadUrl=https://supabase.invalid/signedUrl service_role_key=hidden',
      'x'.repeat(2600),
    ].join('\n'),
  });
  const url = buildManualPaymentWhatsappUrl('+62 (812) 3456-7890', message, { maxEncodedLength: 1200 });

  assert.ok(url);
  assert.match(url!, /^https:\/\/wa\.me\/6281234567890\?text=/);
  const decoded = decodeURIComponent(url!.split('text=')[1] || '');
  assert.match(decoded, /Payment ID: manual_lx_test123456789abc/);
  assert.match(decoded, /User ID: user_123/);
  assert.match(decoded, /Email: buyer@example\.com/);
  assert.match(decoded, /Paket: Barista Pro \(pro\)/);
  assert.match(decoded, /Durasi: 3 bulan/);
  assert.match(decoded, /Nominal: Rp 399\.000/);
  assert.doesNotMatch(decoded, /draftToken|uploadUrl|signedUrl|service_role/i);
});
