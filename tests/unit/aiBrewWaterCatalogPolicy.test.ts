import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import { canUseWaterBrandAutofill } from '../../apps/web/src/features/ai-brew/waterPlanner.ts';

const ROOT = process.cwd();

function installCatalogFetch() {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const filePath = url.startsWith('/data/')
      ? path.join(ROOT, 'apps/web/public', url)
      : path.join(ROOT, url);
    const body = await fs.promises.readFile(filePath, 'utf8');
    return {
      ok: true,
      json: async () => JSON.parse(body),
    } as Response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = previousFetch;
  };
}

async function loadCatalogForTest() {
  const restore = installCatalogFetch();
  try {
    return await loadAiBrewCatalog();
  } finally {
    restore();
  }
}

test('AI Brew water presets allow trusted curated water but keep source gaps manual', async () => {
  const catalog = await loadCatalogForTest();
  const trustedCommunityWater = catalog.waterBrands.find((entry) => entry.id === '2tang-id');
  const localOnlyWater = catalog.waterBrands.find((entry) => entry.id === 'alfa-spring-id');
  const curatedBrandSiteWater = catalog.waterBrands.find((entry) => entry.id === 'aqua-id');
  const curatedHighBufferWater = catalog.waterBrands.find((entry) => entry.id === 'le-minerale-id');
  const sourceBackedWater = catalog.waterBrands.find((entry) => entry.id === 'volvic-global');

  assert.ok(trustedCommunityWater, '2Tang curated water fixture should exist');
  assert.ok(localOnlyWater, 'local-only curated water fixture should exist');
  assert.ok(curatedBrandSiteWater, 'Aqua curated water fixture should exist');
  assert.ok(curatedHighBufferWater, 'Le Minerale curated water fixture should exist');
  assert.ok(sourceBackedWater, 'Volvic source-backed water fixture should exist');

  assert.equal(trustedCommunityWater.presetStatus, 'autofill');
  assert.equal(trustedCommunityWater.isBrewReady, true);
  assert.equal(trustedCommunityWater.recommendedForFilter, true);
  assert.equal(trustedCommunityWater.verificationLevel, 'curated');
  assert.equal(trustedCommunityWater.confidence, 'medium');
  assert.equal(canUseWaterBrandAutofill(trustedCommunityWater), true);
  assert.match(
    [
      trustedCommunityWater.description || '',
      ...trustedCommunityWater.notes,
      ...trustedCommunityWater.brewBlockReason,
    ].join(' '),
    /curated|community|verify/i,
  );

  assert.equal(localOnlyWater.presetStatus, 'manual_required');
  assert.equal(localOnlyWater.isBrewReady, false);
  assert.equal(localOnlyWater.recommendedForFilter, false);
  assert.equal(localOnlyWater.confidence, 'medium');
  assert.equal(canUseWaterBrandAutofill(localOnlyWater), false);
  assert.match(
    [
      localOnlyWater.description || '',
      ...localOnlyWater.notes,
      ...localOnlyWater.brewBlockReason,
    ].join(' '),
    /trusted public|manual mineral|manual review/i,
  );

  assert.equal(curatedBrandSiteWater.presetStatus, 'autofill');
  assert.equal(curatedBrandSiteWater.isBrewReady, true);
  assert.equal(curatedBrandSiteWater.recommendedForFilter, true);
  assert.equal(curatedBrandSiteWater.verificationLevel, 'curated');
  assert.equal(curatedBrandSiteWater.confidence, 'medium');
  assert.equal(canUseWaterBrandAutofill(curatedBrandSiteWater), true);
  assert.match(
    [
      curatedBrandSiteWater.description || '',
      ...curatedBrandSiteWater.notes,
      ...curatedBrandSiteWater.brewBlockReason,
    ].join(' '),
    /curated|community|verify/i,
  );

  assert.equal(curatedHighBufferWater.presetStatus, 'autofill');
  assert.equal(curatedHighBufferWater.isBrewReady, true);
  assert.equal(curatedHighBufferWater.recommendedForFilter, false);
  assert.equal(curatedHighBufferWater.verificationLevel, 'curated');
  assert.equal(curatedHighBufferWater.confidence, 'medium');
  assert.equal(canUseWaterBrandAutofill(curatedHighBufferWater), true);
  assert.match(
    [
      curatedHighBufferWater.description || '',
      ...curatedHighBufferWater.notes,
    ].join(' '),
    /curated|community|buffer|mute acidity/i,
  );

  assert.equal(sourceBackedWater.presetStatus, 'autofill');
  assert.equal(sourceBackedWater.isBrewReady, true);
  assert.equal(sourceBackedWater.verificationLevel, 'official');
  assert.equal(sourceBackedWater.confidence, 'high');
  assert.equal(canUseWaterBrandAutofill(sourceBackedWater), true);
  assert.ok((sourceBackedWater.sourceUrls || []).some((sourceUrl) => /^https?:\/\//i.test(sourceUrl)));
});
