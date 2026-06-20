import type { Region } from '@baristachaw/shared/planCatalog';
import type { Language } from './i18n';

type LocaleSignal = {
  languages?: readonly string[];
  timeZone?: string;
};

type LocaleProfile = {
  region: Region;
  marketingLanguage: Language;
};

function profileFromTimeZone(timeZone: string): LocaleProfile | null {
  const normalized = String(timeZone || '').trim().toLowerCase();
  if (!normalized) return null;
  if (/brunei/.test(normalized)) return { region: 'bn', marketingLanguage: 'bn' };
  if (/jakarta|makassar|jayapura|pontianak/.test(normalized)) return { region: 'id', marketingLanguage: 'id' };
  if (/kuala_lumpur|kuching/.test(normalized)) return { region: 'my', marketingLanguage: 'bn' };
  if (/singapore/.test(normalized)) return { region: 'sg', marketingLanguage: 'en' };
  if (/sydney|melbourne|perth|brisbane|adelaide|hobart|darwin/.test(normalized)) return { region: 'au', marketingLanguage: 'en' };
  if (/new_york|los_angeles|chicago|denver|phoenix|anchorage|honolulu/.test(normalized)) return { region: 'us', marketingLanguage: 'en' };
  if (/europe\//.test(normalized)) return { region: 'eu', marketingLanguage: 'en' };
  return null;
}

function profileFromLanguage(languages: readonly string[]): LocaleProfile | null {
  const normalized = languages.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  if (normalized.some((item) => item === 'id' || item.startsWith('id-'))) return { region: 'id', marketingLanguage: 'id' };
  if (normalized.some((item) => item === 'ms-bn' || item.endsWith('-bn'))) return { region: 'bn', marketingLanguage: 'bn' };
  if (normalized.some((item) => item === 'ms' || item === 'ms-my' || item.endsWith('-my'))) return { region: 'my', marketingLanguage: 'bn' };
  if (normalized.some((item) => item.endsWith('-sg'))) return { region: 'sg', marketingLanguage: 'en' };
  if (normalized.some((item) => item.endsWith('-au'))) return { region: 'au', marketingLanguage: 'en' };
  if (normalized.some((item) => item.endsWith('-us') || item.startsWith('en-'))) return { region: 'us', marketingLanguage: 'en' };
  return null;
}

export function inferLandingLocale(signals: LocaleSignal): LocaleProfile {
  return profileFromTimeZone(String(signals.timeZone || ''))
    || profileFromLanguage(Array.isArray(signals.languages) ? signals.languages : [])
    || { region: 'global', marketingLanguage: 'en' };
}
