import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllEvidenceProfiles,
  getCategoryRoastAdjustments,
  getEvidenceSources,
  getEvidenceSourcesForMethod,
  STANDARDS_PACK_VERSION,
} from '../../apps/web/src/features/barista-tools/evidence/pack.ts';

test('evidence pack has valid version metadata', () => {
  assert.ok(STANDARDS_PACK_VERSION.packVersion.length > 0);
  assert.ok(STANDARDS_PACK_VERSION.generatedAt.length > 0);
  assert.ok(STANDARDS_PACK_VERSION.sourceDigest.length > 0);
});

test('all method profiles include source references and confidence', () => {
  const profiles = getAllEvidenceProfiles();
  assert.ok(profiles.length > 0);

  for (const profile of profiles) {
    assert.ok(profile.sources.length > 0);
    assert.ok(['high', 'medium', 'experimental'].includes(profile.confidence));
    const sources = getEvidenceSourcesForMethod(profile.methodId);
    assert.ok(sources.length > 0);
  }
});

test('category roast adjustments include all roast levels', () => {
  const categories: Array<'espresso' | 'filter' | 'batch'> = ['espresso', 'filter', 'batch'];
  const roastLevels = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];

  for (const category of categories) {
    const adjustments = getCategoryRoastAdjustments(category);
    for (const roastLevel of roastLevels) {
      assert.ok(adjustments[roastLevel as keyof typeof adjustments]);
    }
  }
});

test('source ids are unique', () => {
  const sourceIds = getEvidenceSources().map((source) => source.id);
  const dedup = new Set(sourceIds);
  assert.equal(dedup.size, sourceIds.length);
});

test('sources include valid classification tags', () => {
  const sources = getEvidenceSources();
  const validTags = new Set([
    'core_standard',
    'competition_rule',
    'peer_review',
    'regional_context',
    'manufacturer_guidance',
  ]);

  for (const source of sources) {
    assert.ok(source.tags.length > 0);
    for (const tag of source.tags) {
      assert.ok(validTags.has(tag));
    }
  }
});

test('evidence pack covers every brew method exposed by Barista Tools', async () => {
  const { BREW_METHOD_PROFILES } = await import('../../apps/web/src/features/barista-tools/brewProfiles.ts');
  const evidenceMethodIds = new Set(getAllEvidenceProfiles().map((profile) => profile.methodId));

  for (const method of BREW_METHOD_PROFILES) {
    assert.ok(evidenceMethodIds.has(method.id), `${method.id} is missing from the evidence pack`);
  }
});
