import type { VercelRequest, VercelResponse } from '@vercel/node';

type Region = 'id' | 'bn' | 'my' | 'sg' | 'us' | 'eu' | 'au' | 'global';
type MarketingLanguage = 'id' | 'en' | 'bn';
type AppLanguage = 'en' | 'id' | 'ar' | 'zh' | 'ja' | 'ko' | 'th' | 'vi' | 'ms';

type CountryProfile = {
  countryCode: string;
  countryName: string;
  region: Region;
  marketingLanguage: MarketingLanguage;
  appLanguage: AppLanguage;
};

const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  BN: { countryCode: 'BN', countryName: 'Brunei', region: 'bn', marketingLanguage: 'bn', appLanguage: 'ms' },
  ID: { countryCode: 'ID', countryName: 'Indonesia', region: 'id', marketingLanguage: 'id', appLanguage: 'id' },
  MY: { countryCode: 'MY', countryName: 'Malaysia', region: 'my', marketingLanguage: 'bn', appLanguage: 'ms' },
  SG: { countryCode: 'SG', countryName: 'Singapore', region: 'sg', marketingLanguage: 'en', appLanguage: 'en' },
  US: { countryCode: 'US', countryName: 'United States', region: 'us', marketingLanguage: 'en', appLanguage: 'en' },
  AU: { countryCode: 'AU', countryName: 'Australia', region: 'au', marketingLanguage: 'en', appLanguage: 'en' },
  GB: { countryCode: 'GB', countryName: 'United Kingdom', region: 'global', marketingLanguage: 'en', appLanguage: 'en' },
  DE: { countryCode: 'DE', countryName: 'Germany', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' },
  FR: { countryCode: 'FR', countryName: 'France', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' },
  ES: { countryCode: 'ES', countryName: 'Spain', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' },
  IT: { countryCode: 'IT', countryName: 'Italy', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' },
  NL: { countryCode: 'NL', countryName: 'Netherlands', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' },
};

const EUROPEAN_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HU', 'IE', 'LV', 'LT',
  'LU', 'MT', 'PL', 'PT', 'RO', 'SK', 'SI', 'SE',
]);

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function normalizeCountryCode(value: unknown): string {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

function inferCountryProfile(countryCode: string): CountryProfile {
  const code = normalizeCountryCode(countryCode);
  if (!code) {
    return { countryCode: '', countryName: 'Global', region: 'global', marketingLanguage: 'en', appLanguage: 'en' };
  }
  if (COUNTRY_PROFILES[code]) return COUNTRY_PROFILES[code];
  if (EUROPEAN_COUNTRIES.has(code)) {
    return { countryCode: code, countryName: 'Europe', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' };
  }
  return { countryCode: code, countryName: 'Global', region: 'global', marketingLanguage: 'en', appLanguage: 'en' };
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
  const profile = inferCountryProfile(countryCode);

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
