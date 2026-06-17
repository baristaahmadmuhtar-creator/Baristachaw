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

  try {
    await persistManualPaymentProof(result.request);
  } catch (error) {
    console.error('Failed to persist manual payment proof:', error);
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Manual payment proof storage is not ready',
      errorCode: 'manual_payment_storage_unavailable',
      maxBytes: getManualPaymentProofMaxBytes(),
    });
  }

  return res.status(200).json({
    ok: true,
    requestId,
    paymentRequestId: result.request.id,
    status: result.request.status,
    proof: result.proof,
    paymentActionRequired: true,
    entitlement: 'pending_admin_review',
    message: 'Proof received. Paid entitlement is not granted until an admin verifies the payment.',
  });
}
