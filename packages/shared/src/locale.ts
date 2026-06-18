import type { Region } from './planCatalog.ts';

export type LocaleSignal = {
  countryCode?: string | null;
  languages?: readonly string[] | null;
  timeZone?: string | null;
};

export type MarketingLanguage = 'id' | 'en' | 'bn';
export type AppLanguage = 'en' | 'id' | 'ar' | 'zh' | 'ja' | 'ko' | 'th' | 'vi' | 'ms';

export type CountryProfile = {
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

export function normalizeCountryCode(value: unknown): string {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

export function getCountryProfile(countryCode: unknown): CountryProfile | null {
  const code = normalizeCountryCode(countryCode);
  if (!code) return null;
  if (COUNTRY_PROFILES[code]) return COUNTRY_PROFILES[code];
  if (EUROPEAN_COUNTRIES.has(code)) {
    return { countryCode: code, countryName: 'Europe', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' };
  }
  return { countryCode: code, countryName: 'Global', region: 'global', marketingLanguage: 'en', appLanguage: 'en' };
}

function normalizeLanguages(languages: LocaleSignal['languages']): string[] {
  return (Array.isArray(languages) ? languages : [])
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
}

function inferProfileFromLanguage(languages: readonly string[]): CountryProfile | null {
  if (languages.some((item) => item === 'id' || item.startsWith('id-'))) return COUNTRY_PROFILES.ID;
  if (languages.some((item) => item === 'ms-bn' || item.endsWith('-bn'))) return COUNTRY_PROFILES.BN;
  if (languages.some((item) => item === 'ms' || item === 'ms-my' || item.endsWith('-my'))) return COUNTRY_PROFILES.MY;
  if (languages.some((item) => item.endsWith('-sg'))) return COUNTRY_PROFILES.SG;
  if (languages.some((item) => item.endsWith('-au'))) return COUNTRY_PROFILES.AU;
  if (languages.some((item) => item.endsWith('-us'))) return COUNTRY_PROFILES.US;
  if (languages.some((item) => item.startsWith('en-'))) return COUNTRY_PROFILES.US;
  return null;
}

function inferProfileFromTimeZone(timeZone: string): CountryProfile | null {
  const normalized = String(timeZone || '').trim().toLowerCase();
  if (!normalized) return null;
  if (/brunei/.test(normalized)) return COUNTRY_PROFILES.BN;
  if (/jakarta|makassar|jayapura|pontianak/.test(normalized)) return COUNTRY_PROFILES.ID;
  if (/kuala_lumpur|kuching/.test(normalized)) return COUNTRY_PROFILES.MY;
  if (/singapore/.test(normalized)) return COUNTRY_PROFILES.SG;
  if (/sydney|melbourne|perth|brisbane|adelaide|hobart|darwin/.test(normalized)) return COUNTRY_PROFILES.AU;
  if (/new_york|los_angeles|chicago|denver|phoenix|anchorage|honolulu/.test(normalized)) return COUNTRY_PROFILES.US;
  if (/europe\//.test(normalized)) return { countryCode: 'EU', countryName: 'Europe', region: 'eu', marketingLanguage: 'en', appLanguage: 'en' };
  return null;
}

export function inferCountryProfile(signals: LocaleSignal): CountryProfile {
  return getCountryProfile(signals.countryCode)
    || inferProfileFromTimeZone(String(signals.timeZone || ''))
    || inferProfileFromLanguage(normalizeLanguages(signals.languages))
    || { countryCode: '', countryName: 'Global', region: 'global', marketingLanguage: 'en', appLanguage: 'en' };
}

export function inferRegion(signals: LocaleSignal): Region {
  return inferCountryProfile(signals).region;
}

export function inferMarketingLanguage(signals: LocaleSignal): MarketingLanguage {
  return inferCountryProfile(signals).marketingLanguage;
}

export function inferAppLanguage(signals: LocaleSignal): AppLanguage {
  return inferCountryProfile(signals).appLanguage;
}
