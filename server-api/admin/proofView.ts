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
import { getSupabaseAdminConfig } from '../_supabaseAdmin.js';
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
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET_PROOF || 'payment-proofs').trim();
  if (!config.configured || !bucket) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Supabase Storage is not configured',
      errorCode: 'storage_not_configured',
    });
  }

  try {
    const path = request.proof.generatedFileName;
    const signUrl = `${config.url}/storage/v1/object/sign/${bucket}/${path}`;
    const response = await fetch(signUrl, {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 120 }), // URL valid for 2 minutes
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Supabase storage sign returned ${response.status}: ${text.slice(0, 180)}`);
    }

    const data = JSON.parse(text) as { signedURL?: string; signedUrl?: string };
    const signedUrl = data.signedURL || data.signedUrl;
    if (!signedUrl) {
      throw new Error('Signed URL was missing from storage response');
    }

    // Resolve relative signed URL path if it is relative
    const absoluteSignedUrl = signedUrl.startsWith('http') 
      ? signedUrl 
      : `${config.url}/storage/v1${signedUrl}`;

    return res.status(200).json({
      ok: true,
      requestId,
      signedUrl: absoluteSignedUrl,
      mimeType: request.proof.mimeType,
      fileName: path,
    });
  } catch (error) {
    console.error('Failed to generate signed read URL:', error);
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Failed to generate secure preview URL',
      errorCode: 'signed_url_generation_failed',
      details: sanitizeErrorDetails(error, 160),
    });
  }
}
