import type { SearchResultPayload } from './gemini';

const FRESHNESS_SENSITIVE_QUERY_KEYWORDS = [
  'latest',
  'today',
  'yesterday',
  'tomorrow',
  'current',
  'now',
  'update',
  'news',
  'price',
  'pricing',
  'release',
  'version',
  'realtime',
  'real-time',
  'breaking',
  'terbaru',
  'hari ini',
  'kemarin',
  'besok',
  'terkini',
  'pembaruan',
  'berita',
  'harga',
  'rilis',
  'versi',
];

const SOURCE_INTENT_KEYWORDS = [
  'source',
  'sources',
  'reference',
  'references',
  'citation',
  'citations',
  'link',
  'links',
  'url',
  'sumber',
  'referensi',
  'tautan',
];

export const HOME_SEARCH_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export const HOME_SEARCH_CACHE_MAX_AGE_TIME_SENSITIVE_MS = 20 * 60 * 1000;

export type HomeSearchCachePayload = Partial<SearchResultPayload> & {
  text?: string;
  chunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
};

type CachedSearchSource = NonNullable<SearchResultPayload['sources']>[number];

function normalizeSources(
  cachedSources: HomeSearchCachePayload['sources'],
  cachedChunks: HomeSearchCachePayload['chunks'],
): NonNullable<SearchResultPayload['sources']> {
  if (Array.isArray(cachedSources)) {
    return cachedSources.filter(
      (item): item is CachedSearchSource =>
        typeof item?.uri === 'string' && item.uri.trim().length > 0,
    );
  }

  if (Array.isArray(cachedChunks)) {
    return cachedChunks
      .map((chunk): CachedSearchSource => ({ uri: String(chunk?.web?.uri || ''), title: chunk?.web?.title }))
      .filter(
        (item): item is CachedSearchSource =>
          typeof item.uri === 'string' && item.uri.trim().length > 0,
      );
  }

  return [];
}

export function isFreshnessSensitiveSearchQuery(query: string): boolean {
  const value = String(query || '').trim().toLowerCase();
  if (!value) return false;
  return [...FRESHNESS_SENSITIVE_QUERY_KEYWORDS, ...SOURCE_INTENT_KEYWORDS].some(keyword => value.includes(keyword));
}

export function getHomeSearchCacheMaxAgeMs(query: string): number {
  return isFreshnessSensitiveSearchQuery(query)
    ? HOME_SEARCH_CACHE_MAX_AGE_TIME_SENSITIVE_MS
    : HOME_SEARCH_CACHE_MAX_AGE_MS;
}

export function isHomeSearchCacheFresh(query: string, retrievedAt: unknown, now = Date.now()): boolean {
  if (!Number.isFinite(retrievedAt)) return false;
  const ageMs = now - Number(retrievedAt);
  if (ageMs < 0) return false;
  return ageMs <= getHomeSearchCacheMaxAgeMs(query);
}

export function shouldPersistHomeSearchCache(
  result: Pick<SearchResultPayload, 'text' | 'sources' | 'sourceCount' | 'retrievedAt' | 'degraded' | 'fallbackMode' | 'liveSearchUnavailable'>,
): boolean {
  const text = String(result.text || '').trim();
  const sources = normalizeSources(result.sources, undefined);
  const sourceCount = Number.isFinite(result.sourceCount) ? Number(result.sourceCount) : sources.length;
  const retrievedAt = typeof result.retrievedAt === 'number' ? result.retrievedAt : NaN;

  if (!text) return false;
  if (!Number.isFinite(retrievedAt)) return false;
  if (result.degraded) return false;
  if (result.liveSearchUnavailable) return false;
  if (result.fallbackMode && result.fallbackMode !== 'search') return false;
  if (sources.length < 2 || sourceCount < 2) return false;
  return true;
}

export function normalizeHomeSearchCachePayload(
  searchQuery: string,
  cached: HomeSearchCachePayload | null | undefined,
  now = Date.now(),
): SearchResultPayload | null {
  const text = String(cached?.text || '').trim();
  if (!text) return null;
  if (cached?.degraded || cached?.liveSearchUnavailable || cached?.fallbackMode === 'deep') return null;

  const chunks = Array.isArray(cached?.chunks) ? cached.chunks : [];
  const sources = normalizeSources(cached?.sources, chunks);
  const sourceCount = Number.isFinite(cached?.sourceCount) ? Number(cached?.sourceCount) : sources.length;
  const retrievedAt = typeof cached?.retrievedAt === 'number' ? cached.retrievedAt : NaN;

  if (sources.length < 2 || sourceCount < 2) return null;
  if (!isHomeSearchCacheFresh(searchQuery, retrievedAt, now)) return null;

  return {
    text,
    chunks,
    sources,
    sourceCount,
    retrievedAt,
    provider: cached?.provider,
    degraded: false,
    details: cached?.details,
    deepMeta: cached?.deepMeta,
    fallbackMode: 'search',
    liveSearchUnavailable: false,
  };
}
