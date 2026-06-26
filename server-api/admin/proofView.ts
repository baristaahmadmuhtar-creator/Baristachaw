import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  sanitizeErrorDetails,
} from '../_shared.js';
import { requireAdmin } from './_access.js';
import { getSupabaseAdminConfig, createSignedReadUrl } from '../_supabaseAdmin.js';
import { loadPersistedManualPaymentRequest, getManualPaymentRequest } from '../billing/manualPayments.js';

const ADMIN_PROOF_VIEW_RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 12,
  burstWindowMs: 10 * 1000,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const access = requireAdmin(req);
  if (access.ok === false) {
    return res.status(access.statusCode).json({
      ok: false,
      requestId,
      error: access.error,
      errorCode: access.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/admin/proof-view', access.auth.userId, ADMIN_PROOF_VIEW_RATE_LIMIT);
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

  const paymentRequestId = typeof req.query.paymentRequestId === 'string' ? req.query.paymentRequestId.trim() : '';
  if (!paymentRequestId) {
    return res.status(400).json({
      ok: false,
      requestId,
      error: 'paymentRequestId query parameter is required',
      errorCode: 'validation_error',
    });
  }

  // Hydrate payment request from memory or database
  let request = getManualPaymentRequest(paymentRequestId);
  if (!request) {
    request = await loadPersistedManualPaymentRequest(paymentRequestId).catch(() => undefined);
  }

  if (!request) {
    return res.status(404).json({
      ok: false,
      requestId,
      error: 'Manual payment request not found',
      errorCode: 'manual_payment_not_found',
    });
  }

  if (!request.proof || !request.proof.generatedFileName) {
    return res.status(404).json({
      ok: false,
      requestId,
      error: 'No proof file has been uploaded for this request',
      errorCode: 'proof_not_uploaded',
    });
  }

  const config = getSupabaseAdminConfig();
  const bucket = request.proof.bucket || (process.env.SUPABASE_STORAGE_BUCKET_PROOF || 'payment-proofs').trim();
  if (!config.configured || !bucket) {
    return res.status(200).json({
      ok: true,
      requestId,
      mode: 'manual_support',
      message: 'Automatic proof preview is not available. Ask the customer to send the receipt through the support links on the payment request.',
      supportLinks: {
        whatsappUrl: request.instructions.whatsappUrl,
        supportEmail: request.instructions.supportEmail,
        instagramUrl: request.instructions.instagramUrl,
      },
    });
  }

  try {
    const path = request.proof.objectPath || request.proof.generatedFileName;
    const signedData = await createSignedReadUrl(config, bucket, path, 120);

    return res.status(200).json({
      ok: true,
      requestId,
      signedUrl: signedData.signedUrl,
      mimeType: request.proof.mimeType,
      fileName: signedData.path,
    });
  } catch (error) {
    console.error('Failed to generate signed read URL:', error);
    return res.status(200).json({
      ok: true,
      requestId,
      mode: 'manual_support',
      message: `Automatic proof preview is not available: ${sanitizeErrorDetails(error, 120)}. Use the support links to verify the receipt manually.`,
      supportLinks: {
        whatsappUrl: request.instructions.whatsappUrl,
        supportEmail: request.instructions.supportEmail,
        instagramUrl: request.instructions.instagramUrl,
      },
    });
  }
}
