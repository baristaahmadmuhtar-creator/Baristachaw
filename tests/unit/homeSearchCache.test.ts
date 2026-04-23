import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHomeSearchCacheMaxAgeMs,
  HOME_SEARCH_CACHE_MAX_AGE_MS,
  HOME_SEARCH_CACHE_MAX_AGE_TIME_SENSITIVE_MS,
  isFreshnessSensitiveSearchQuery,
  isHomeSearchCacheFresh,
  normalizeHomeSearchCachePayload,
  shouldPersistHomeSearchCache,
} from '../../apps/web/src/services/searchCache.ts';

test('freshness-sensitive search queries get a shorter cache lifetime', () => {
  assert.equal(isFreshnessSensitiveSearchQuery('latest coffee grinder release'), true);
  assert.equal(isFreshnessSensitiveSearchQuery('best espresso workflow'), false);
  assert.equal(getHomeSearchCacheMaxAgeMs('latest coffee grinder release'), HOME_SEARCH_CACHE_MAX_AGE_TIME_SENSITIVE_MS);
  assert.equal(getHomeSearchCacheMaxAgeMs('best espresso workflow'), HOME_SEARCH_CACHE_MAX_AGE_MS);
});

test('isHomeSearchCacheFresh rejects stale time-sensitive results', () => {
  const now = Date.now();
  const freshTemporal = isHomeSearchCacheFresh(
    'latest coffee grinder release',
    now - (HOME_SEARCH_CACHE_MAX_AGE_TIME_SENSITIVE_MS - 1_000),
    now,
  );
  const staleTemporal = isHomeSearchCacheFresh(
    'latest coffee grinder release',
    now - (HOME_SEARCH_CACHE_MAX_AGE_TIME_SENSITIVE_MS + 1_000),
    now,
  );

  assert.equal(freshTemporal, true);
  assert.equal(staleTemporal, false);
});

test('shouldPersistHomeSearchCache keeps only live grounded results', () => {
  const retrievedAt = Date.now();
  assert.equal(shouldPersistHomeSearchCache({
    text: 'Valid grounded answer',
    sources: [
      { uri: 'https://example.com/a', title: 'Source A', domain: 'example.com' },
      { uri: 'https://example.org/b', title: 'Source B', domain: 'example.org' },
    ],
    sourceCount: 2,
    retrievedAt,
    degraded: false,
    fallbackMode: 'search',
    liveSearchUnavailable: false,
  }), true);

  assert.equal(shouldPersistHomeSearchCache({
    text: 'Fallback deep answer',
    sources: [
      { uri: 'https://example.com/a', title: 'Source A', domain: 'example.com' },
      { uri: 'https://example.org/b', title: 'Source B', domain: 'example.org' },
    ],
    sourceCount: 2,
    retrievedAt,
    degraded: true,
    fallbackMode: 'deep',
    liveSearchUnavailable: true,
  }), false);
});

test('normalizeHomeSearchCachePayload rejects stale or degraded cached results', () => {
  const now = Date.now();
  const fresh = normalizeHomeSearchCachePayload('brew recipe', {
    text: 'Fresh grounded answer',
    chunks: [],
    sources: [
      { uri: 'https://example.com/a', title: 'Source A', domain: 'example.com' },
      { uri: 'https://example.org/b', title: 'Source B', domain: 'example.org' },
    ],
    sourceCount: 2,
    retrievedAt: now - 30_000,
    degraded: false,
    liveSearchUnavailable: false,
  }, now);
  assert.equal(fresh?.text, 'Fresh grounded answer');

  const stale = normalizeHomeSearchCachePayload('latest coffee price', {
    text: 'Old grounded answer',
    chunks: [],
    sources: [
      { uri: 'https://example.com/a', title: 'Source A', domain: 'example.com' },
      { uri: 'https://example.org/b', title: 'Source B', domain: 'example.org' },
    ],
    sourceCount: 2,
    retrievedAt: now - (HOME_SEARCH_CACHE_MAX_AGE_TIME_SENSITIVE_MS + 1_000),
    degraded: false,
    liveSearchUnavailable: false,
  }, now);
  assert.equal(stale, null);

  const degraded = normalizeHomeSearchCachePayload('brew recipe', {
    text: 'Fallback answer',
    chunks: [],
    sources: [
      { uri: 'https://example.com/a', title: 'Source A', domain: 'example.com' },
      { uri: 'https://example.org/b', title: 'Source B', domain: 'example.org' },
    ],
    sourceCount: 2,
    retrievedAt: now - 30_000,
    degraded: true,
    liveSearchUnavailable: true,
    fallbackMode: 'deep',
  }, now);
  assert.equal(degraded, null);
});
