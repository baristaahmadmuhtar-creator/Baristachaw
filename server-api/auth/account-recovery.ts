import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
} from '../_shared.js';
import { resolveSupabaseAuthConfig } from './mobile/shared.js';

const RECOVERY_RATE_LIMIT = {
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  burstMaxRequests: 1,
  burstWindowMs: 5 * 60 * 1000, // 5 min
};

function readString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  return '';
}

function normalizeEmail(value: unknown): string {
  const str = readString(value);
  return str.toLowerCase().replace(/\s+/g, '');
}

function normalizeString(value: unknown, maxLength: number): string {
  const str = readString(value);
  return str.substring(0, maxLength);
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const fromForwarded = Array.isArray(forwarded) ? forwarded[0] : (forwarded || '').split(',')[0]?.trim();
  const realIp = req.headers['x-real-ip'];
  const fromRealIp = Array.isArray(realIp) ? realIp[0] : (realIp || '').trim();
  const candidate = fromForwarded || fromRealIp || (req.socket?.remoteAddress || '').trim() || 'unknown';
  return candidate.replace(/^::ffff:/, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const contactEmail = normalizeEmail(req.body?.contactEmail);
  const displayNameHint = normalizeString(req.body?.displayNameHint, 100);
  const providerHint = normalizeString(req.body?.providerHint, 50) || 'unknown';
  const country = normalizeString(req.body?.country, 50);
  const evidence = normalizeString(req.body?.evidence, 1000);

  if (!contactEmail) {
    return res.status(400).json({ ok: false, requestId, error: 'Masukkan email kontak yang valid.' });
  }

  const clientIp = getClientIp(req);
  const requestIpHash = createHash('sha256').update(clientIp).digest('hex').slice(0, 32);
  const userAgentHash = createHash('sha256').update(readString(req.headers['user-agent'])).digest('hex').slice(0, 32);

  const rateLimitIdentity = `${contactEmail}:${requestIpHash}`;
  const limit = checkRateLimit(req, `/api/auth/account-recovery`, rateLimitIdentity, RECOVERY_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      error: 'Terlalu banyak permintaan. Coba lagi nanti.',
      errorCode: 'account_recovery_rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!serviceRoleKey) {
    console.error('[AccountRecovery] SUPABASE_SERVICE_ROLE_KEY is not set');
    return res.status(200).json({
      ok: true,
      requestId,
      message: 'Permintaan bantuan akun diterima. Tim Baristachaw akan menghubungi jika data cocok.'
    });
  }

  const config = resolveSupabaseAuthConfig();
  
  try {
    const response = await fetch(`${config.url}/rest/v1/account_recovery_requests`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        contact_email: contactEmail,
        normalized_contact_email: contactEmail,
        display_name_hint: displayNameHint,
        provider_hint: providerHint,
        country: country,
        evidence: evidence,
        request_ip_hash: requestIpHash,
        user_agent_hash: userAgentHash,
        status: 'pending',
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AccountRecovery] Failed to insert recovery request', errorText);
    }
  } catch (err) {
    console.error('[AccountRecovery] Error inserting recovery request', err);
  }

  // Always return generic success to avoid leaking
  return res.status(200).json({
    ok: true,
    requestId,
    message: 'Permintaan bantuan akun diterima. Tim Baristachaw akan menghubungi jika data cocok.'
  });
}
