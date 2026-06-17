import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
} from '../_shared.js';
import {
  attachManualPaymentProof,
  getManualPaymentProofMaxBytes,
  loadPersistedManualPaymentRequest,
  persistManualPaymentProof,
} from './manualPayments.js';

import {
  getSupabaseAdminConfig,
  createSignedUploadUrl,
} from '../_supabaseAdmin.js';

const BILLING_PROOF_RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 6,
  burstWindowMs: 10 * 1000,
} as const;

function normalizeRequestId(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

function normalizeMimeType(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 80) : '';
}

function normalizeSize(value: unknown): number {
  const size = Number(value);
  return Number.isFinite(size) ? Math.floor(size) : 0;
}

function supportLinksFor(request: { instructions: { whatsappUrl?: string; supportEmail?: string; instagramUrl?: string } }) {
  return {
    whatsappUrl: request.instructions.whatsappUrl,
    supportEmail: request.instructions.supportEmail,
    instagramUrl: request.instructions.instagramUrl,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      error: authResult.error,
      errorCode: authResult.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/billing/proof', authResult.auth.userId, BILLING_PROOF_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      error: 'Rate limit exceeded',
      errorCode: 'rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const paymentRequestId = normalizeRequestId(req.body?.requestId);
  const proofInput = {
    requestId: paymentRequestId,
    userId: authResult.auth.userId,
    mimeType: normalizeMimeType(req.body?.mimeType),
    sizeBytes: normalizeSize(req.body?.sizeBytes),
  };

  let result = attachManualPaymentProof(proofInput);
  if (result.ok === false && result.errorCode === 'manual_payment_not_found' && paymentRequestId) {
    await loadPersistedManualPaymentRequest(paymentRequestId, authResult.auth.userId).catch((error) => {
      console.error('Failed to hydrate persisted manual payment request:', error);
      return undefined;
    });
    result = attachManualPaymentProof(proofInput);
  }

  if (result.ok === false) {
    return res.status(result.statusCode).json({
      ok: false,
      requestId,
      error: result.error,
      errorCode: result.errorCode,
      maxBytes: getManualPaymentProofMaxBytes(),
    });
  }

  let proofStorage: 'storage_ready' | 'support_fallback' = 'support_fallback';
  let uploadUrl = '';
  let persistenceReady = false;
  try {
    persistenceReady = await persistManualPaymentProof(result.request);
  } catch (error) {
    console.error('Failed to persist manual payment proof:', error);
  }

  const config = getSupabaseAdminConfig();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET_PROOF || 'payment-proofs').trim();
  if (persistenceReady && config.configured && bucket) {
    try {
      const signedData = await createSignedUploadUrl(config, bucket, result.proof.generatedFileName);
      uploadUrl = signedData.signedUrl;
      proofStorage = 'storage_ready';
    } catch (error) {
      console.error('Failed to generate signed upload URL:', error);
    }
  }

  return res.status(200).json({
    ok: true,
    requestId,
    paymentRequestId: result.request.id,
    status: result.request.status,
    proof: result.proof,
    proofStorage,
    deliveryMode: uploadUrl ? 'direct_upload' : 'manual_support',
    uploadUrl: uploadUrl || undefined,
    supportLinks: supportLinksFor(result.request),
    paymentActionRequired: true,
    entitlement: 'pending_admin_review',
    message: uploadUrl
      ? 'Proof registered. Please upload the file using the uploadUrl.'
      : 'Proof metadata is registered for admin review. Send the receipt file to support with this invoice ID if automatic upload is unavailable.',
  });
}
