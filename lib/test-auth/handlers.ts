import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyTestAuthCors,
  getTestAuthCookieAttributes,
  guardTestAuthRequest,
  logTestAuthAudit,
  resolveTestUser,
} from './shared.js';

type TestAuthRequestLike = Pick<VercelRequest, 'method' | 'body' | 'headers' | 'socket'>;
type TestAuthResponseLike = Pick<VercelResponse, 'setHeader' | 'status' | 'json' | 'end'>;

function readHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return value[0].trim();
  return '';
}

export function handleTestAuthLogin(req: TestAuthRequestLike, res: TestAuthResponseLike) {
  applyTestAuthCors(req as VercelRequest, res as VercelResponse);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const guarded = guardTestAuthRequest(req as VercelRequest);
  if (guarded.ok === false) return res.status(guarded.status).json({ error: guarded.error });

  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) return res.status(500).json({ error: 'JWT secret missing' });

  const user = resolveTestUser(req.body || {});
  const token = jwt.sign({ user }, jwtSecret, { expiresIn: '7d' });

  res.setHeader('Set-Cookie', [
    `auth_token=${token}; ${getTestAuthCookieAttributes()}; Max-Age=${7 * 24 * 60 * 60}`,
  ]);

  logTestAuthAudit('login', {
    requestId: guarded.requestId,
    ipHash: guarded.ipHash,
    origin: readHeaderValue(req.headers.origin),
    userId: user.id,
  });

  return res.status(200).json({ ok: true, user, requestId: guarded.requestId });
}

export function handleTestAuthLogout(req: TestAuthRequestLike, res: TestAuthResponseLike) {
  applyTestAuthCors(req as VercelRequest, res as VercelResponse);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const guarded = guardTestAuthRequest(req as VercelRequest);
  if (guarded.ok === false) return res.status(guarded.status).json({ error: guarded.error });

  res.setHeader('Set-Cookie', [`auth_token=; ${getTestAuthCookieAttributes()}; Max-Age=0`]);

  logTestAuthAudit('logout', {
    requestId: guarded.requestId,
    ipHash: guarded.ipHash,
    origin: readHeaderValue(req.headers.origin),
  });

  return res.status(200).json({ ok: true, requestId: guarded.requestId });
}
