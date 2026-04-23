import type { VercelRequest, VercelResponse } from '@vercel/node';
import testAuthLoginHandler from '../server-api/test-auth/login.js';
import testAuthLogoutHandler from '../server-api/test-auth/logout.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.path;
  const path = Array.isArray(raw) ? raw.join('/').trim() : String(raw || '').trim();
  if (path === 'login') {
    return (testAuthLoginHandler as Handler)(req, res);
  }
  if (path === 'logout') {
    return (testAuthLogoutHandler as Handler)(req, res);
  }
  return res.status(404).json({ error: 'Not found' });
}
