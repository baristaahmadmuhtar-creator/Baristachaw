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
  getManualPaymentProofMaxBytes,
  persistManualPaymentRequest,
  verifyDraftToken,
} from './manualPayments.js';

const ALLOWED_PROOF_TYPES: ReadonlyMap<string, string> = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
] as const);

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
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return /^manual_[a-z0-9]+_[a-f0-9]{12}$/i.test(normalized) ? normalized : '';
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
  const draftToken = typeof req.body?.draftToken === 'string' ? req.body.draftToken : '';
  const mimeType = normalizeMimeType(req.body?.mimeType);
  const sizeBytes = normalizeSize(req.body?.sizeBytes);

  if (!draftToken) {
    return res.status(400).json({
      ok: false,
      requestId,
      error: 'Draft token is required to submit payment proof.',
      errorCode: 'validation_error',
    });
  }

  const manualRequest = verifyDraftToken(draftToken, authResult.auth.userId);
  if (!manualRequest || manualRequest.id !== paymentRequestId) {
    return res.status(403).json({
      ok: false,
      requestId,
      error: 'Invalid or expired manual payment session.',
      errorCode: 'invalid_draft_token',
      details: 'Please start a new checkout process.',
    });
  }

  // Pre-attach the proof without persisting the request just yet to leverage validation
  const proofInput = {
    requestId: manualRequest.id,
    userId: manualRequest.userId,
    mimeType,
    sizeBytes,
  };

  // Temporarily place the reconstructed request in memory so attachManualPaymentProof can find it
  // But attachManualPaymentProof expects it via REQUESTS.get(). Actually it's easier to just call attachManualPaymentProof if it's in REQUESTS.
  // We can just construct the proof metadata directly, or inject the request. Let's see...
  // Actually, wait, `attachManualPaymentProof` loads the request from REQUESTS or DB. 
  // Let's modify attachManualPaymentProof to accept a preloaded request or bypass it here.
  // Actually, I can just create the proof object manually here since we have the reconstructed request!
  const maxBytes = getManualPaymentProofMaxBytes();
  if (sizeBytes > maxBytes) {
    return res.status(413).json({
      ok: false,
      requestId,
      error: 'File size exceeds maximum allowed',
      errorCode: 'payload_too_large',
      maxBytes,
    });
  }

  const extension = ALLOWED_PROOF_TYPES.get(mimeType);
  if (!extension) {
    return res.status(415).json({
      ok: false,
      requestId,
      error: 'Unsupported file type',
      errorCode: 'unsupported_media_type',
    });
  }

  const generatedFileName = `${manualRequest.userId}/${manualRequest.id}_proof_${Date.now()}.${extension}`;
  const proofMetadata = {
    generatedFileName,
    mimeType,
    sizeBytes,
    storage: 'metadata_only' as const,
    receivedAt: Date.now(),
  };

  manualRequest.proof = proofMetadata;
  manualRequest.status = 'receipt_received';

  let proofStorage: 'storage_ready' | 'support_fallback' = 'support_fallback';
  let uploadUrl = '';
  let persistenceReady = false;
  try {
    persistenceReady = await persistManualPaymentRequest(manualRequest);
  } catch (error) {
    console.error('Failed to persist manual payment request during proof upload:', error);
  }

  const config = getSupabaseAdminConfig();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET_PROOF || 'payment-proofs').trim();
  if (persistenceReady && config.configured && bucket) {
    try {
      const signedData = await createSignedUploadUrl(config, bucket, generatedFileName);
      uploadUrl = signedData.signedUrl;
      proofStorage = 'storage_ready';
    } catch (error) {
      console.error('Failed to generate signed upload URL:', error);
    }
  }

  return res.status(200).json({
    ok: true,
    requestId,
    paymentRequestId: manualRequest.id,
    status: manualRequest.status,
    proof: manualRequest.proof,
    proofStorage,
    deliveryMode: uploadUrl ? 'direct_upload' : 'manual_support',
    uploadUrl: uploadUrl || undefined,
    supportLinks: supportLinksFor(manualRequest),
    paymentActionRequired: true,
    entitlement: 'pending_admin_review',
    message: uploadUrl
      ? 'Proof registered. Please upload the file using the uploadUrl.'
      : 'Proof metadata is registered for admin review. Send the receipt file to support with this invoice ID if automatic upload is unavailable.',
  });
}
