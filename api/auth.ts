import type { VercelRequest, VercelResponse } from '@vercel/node';
import authCallbackHandler from '../server-api/auth/callback.js';
import authEmailHandler from '../server-api/auth/email.js';
import authGuestHandler from '../server-api/auth/guest.js';
import authLogoutHandler from '../server-api/auth/logout.js';
import authMeHandler from '../server-api/auth/me.js';
import authUrlHandler from '../server-api/auth/url.js';
import mobileAuthHandler from '../server-api/auth/mobile/[...route].js';
import accountRecoveryHandler from '../server-api/auth/account-recovery.js';
import { applyPrivateApiNoStoreHeaders } from '../server-api/_shared.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

function getPath(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join('/').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyPrivateApiNoStoreHeaders('/api/auth', res);
  const path = getPath(req);
  let target: Handler | null = null;

  if (path === 'url') target = authUrlHandler as Handler;
  else if (path === 'callback') target = authCallbackHandler as Handler;
  else if (
    path === 'email/signin'
    || path === 'email/signup'
    || path === 'email/reset'
    || path === 'email/update-password'
    || path === 'email/otp/send'
    || path === 'email/otp/verify'
    || path === 'email/password/reset/start'
    || path === 'email/password/reset/verify'
    || path === 'email/password/reset/update'
  ) target = authEmailHandler as Handler;
  else if (path === 'guest') target = authGuestHandler as Handler;
  else if (path === 'me') target = authMeHandler as Handler;
  else if (path === 'logout') target = authLogoutHandler as Handler;
  else if (
    path === 'mobile/start'
    || path === 'mobile/callback'
    || path === 'mobile/exchange'
    || path === 'mobile/apple/exchange'
    || path === 'mobile/supabase/exchange'
  ) target = mobileAuthHandler as Handler;
  else if (path === 'account-recovery') target = accountRecoveryHandler as Handler;

  if (!target) {
    return res.status(404).json({ error: 'Not found' });
  }

  return target(req, res);
}
