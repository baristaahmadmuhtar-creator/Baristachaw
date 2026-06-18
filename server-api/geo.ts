import type { VercelRequest, VercelResponse } from '@vercel/node';
import { inferCountryProfile, normalizeCountryCode } from '@baristachaw/shared/locale';

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function readCountryCode(req: VercelRequest): string {
  return normalizeCountryCode(
    firstHeader(req.headers['x-vercel-ip-country'])
    || firstHeader(req.headers['cf-ipcountry'])
    || firstHeader(req.headers['x-country-code'])
  );
}

function readOrigin(req: VercelRequest): string {
  return firstHeader(req.headers.origin).replace(/\/+$/, '');
}

function setCors(req: VercelRequest, res: VercelResponse): void {
  const origin = readOrigin(req);
  const allowed = new Set([
    'https://baristachaw.com',
    'https://www.baristachaw.com',
    'https://app.baristachaw.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ]);
  if (allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const acceptLanguage = firstHeader(req.headers['accept-language']).slice(0, 200);
  const countryCode = readCountryCode(req);
  const profile = inferCountryProfile({ countryCode });

  return res.status(200).json({
    countryCode: profile.countryCode || countryCode,
    countryName: profile.countryName,
    region: profile.region,
    marketingLanguage: profile.marketingLanguage,
    appLanguage: profile.appLanguage,
    source: countryCode ? 'edge-country' : 'unknown',
    acceptLanguage,
  });
}

