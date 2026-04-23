import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWebSearchPrompt,
  evaluateSearchGrounding,
  getDefaultSearchResponseProfile,
  normalizeSearchSources,
  rankSearchSources,
  scoreSearchSourceAuthority,
} from '../../server-api/ai.ts';

test('normalizeSearchSources keeps valid http(s) sources and deduplicates uri', () => {
  const normalized = normalizeSearchSources([
    { web: { uri: 'https://example.com/a#frag', title: 'Example A' } },
    { web: { uri: 'https://example.com/a', title: 'Duplicate A' } },
    { web: { uri: 'http://example.org/b', title: 'Example B' } },
    { web: { uri: 'ftp://example.net/c', title: 'Invalid protocol' } },
    { web: { uri: 'not-a-url', title: 'Invalid url' } },
    {},
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0]?.uri, 'https://example.com/a');
  assert.equal(normalized[0]?.domain, 'example.com');
  assert.equal(normalized[1]?.uri, 'http://example.org/b');
});

test('evaluateSearchGrounding fails when live sources are below minimum', () => {
  const pass = evaluateSearchGrounding('Valid result text', [
    { uri: 'https://example.com/article', domain: 'example.com' },
    { uri: 'https://example.org/guide', domain: 'example.org' },
  ]);
  assert.equal(pass.ok, true);

  const failSources = evaluateSearchGrounding('Valid result text', [{ uri: 'https://example.com' }]);
  assert.equal(failSources.ok, false);
  assert.equal(failSources.reason, 'insufficient_sources');

  const failText = evaluateSearchGrounding('   ', [{ uri: 'https://example.com' }, { uri: 'https://example.org' }]);
  assert.equal(failText.ok, false);
  assert.equal(failText.reason, 'empty_text');
});

test('scoreSearchSourceAuthority prefers primary and reputable sources over user-generated domains', () => {
  const officialDoc = scoreSearchSourceAuthority({
    uri: 'https://docs.example.gov/releases/espresso',
    title: 'Official release notes',
    domain: 'docs.example.gov',
  });
  const socialPost = scoreSearchSourceAuthority({
    uri: 'https://reddit.com/r/coffee/comments/example',
    title: 'Someone said this grinder is good',
    domain: 'reddit.com',
  });

  assert.ok(officialDoc > socialPost);
  assert.ok(officialDoc >= 2);
  assert.ok(socialPost <= 0);
});

test('rankSearchSources sorts stronger sources first', () => {
  const ranked = rankSearchSources([
    { uri: 'https://reddit.com/r/coffee/comments/example', title: 'Forum thread', domain: 'reddit.com' },
    { uri: 'https://docs.example.gov/releases/espresso', title: 'Official release notes', domain: 'docs.example.gov' },
    { uri: 'https://example.com/blog/espresso', title: 'Blog post', domain: 'example.com' },
  ]);

  assert.equal(ranked[0]?.domain, 'docs.example.gov');
  assert.equal(ranked[ranked.length - 1]?.domain, 'reddit.com');
});

test('evaluateSearchGrounding rejects duplicate-domain grounding for live search', () => {
  const duplicateDomains = evaluateSearchGrounding('Valid result text', [
    { uri: 'https://example.com/a', domain: 'example.com' },
    { uri: 'https://example.com/b', domain: 'example.com' },
  ]);

  assert.equal(duplicateDomains.ok, false);
  assert.equal(duplicateDomains.reason, 'insufficient_sources');
  assert.equal(duplicateDomains.details, 'insufficient_domain_diversity');
});

test('evaluateSearchGrounding requires a stronger source for freshness-sensitive prompts', () => {
  const weakTemporal = evaluateSearchGrounding(
    'Valid result text',
    [
      { uri: 'https://example.com/releases/item', title: 'Release post', domain: 'example.com' },
      { uri: 'https://another-example.com/news/item', title: 'News post', domain: 'another-example.com' },
    ],
    { prompt: 'latest grinder release notes' },
  );

  assert.equal(weakTemporal.ok, false);
  assert.equal(weakTemporal.reason, 'insufficient_sources');
  assert.equal(weakTemporal.details, 'missing_high_authority_source');

  const strongTemporal = evaluateSearchGrounding(
    'Valid result text',
    [
      { uri: 'https://docs.example.com/releases/item', title: 'Official release notes', domain: 'docs.example.com' },
      { uri: 'https://reuters.com/world/item', title: 'Reuters coverage', domain: 'reuters.com' },
    ],
    { prompt: 'latest grinder release notes' },
  );

  assert.equal(strongTemporal.ok, true);
});

test('default search response profile enforces deep balanced format without ask-first', () => {
  const profile = getDefaultSearchResponseProfile();
  assert.equal(profile.verbosity, 'comprehensive');
  assert.equal(profile.format, 'steps');
  assert.equal(profile.tone, 'professional');
  assert.equal(profile.ambiguityPolicy, 'assume');
});

test('buildWebSearchPrompt includes freshness and no-clarifying policy', () => {
  const prompt = buildWebSearchPrompt('latest grinder releases');
  assert.match(prompt, /last 12 months/i);
  assert.match(prompt, /2 unique domains/i);
  assert.match(prompt, /Do not ask clarifying questions/i);
  assert.match(prompt, /User request:/i);
});
