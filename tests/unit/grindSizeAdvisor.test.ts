import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import {
  buildGrindSizeAdvice,
  getGrindSizeCompatibility,
  sortGrindersForMethod,
} from '../../apps/web/src/features/barista-tools/grindSizeAdvisor.ts';
import { BREW_METHOD_PROFILES } from '../../apps/web/src/features/barista-tools/brewProfiles.ts';
import type { RoastLevel } from '../../apps/web/src/features/barista-tools/types.ts';

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

test('Grind Size keeps 600N platform roast-aware instead of hardcoding one setting', async () => {
  const catalog = await loadCatalogForTest();
  const grinder = catalog.grinders.find((entry) => entry.id === 'feima-600n');
  assert.ok(grinder, 'Feima / Murane / 600N platform grinder must exist');

  const light = buildGrindSizeAdvice({
    catalog,
    methodId: 'v60',
    grinderId: grinder.id,
    roastLevel: 'light',
    targetProfileId: 'balance_clean',
  });
  const dark = buildGrindSizeAdvice({
    catalog,
    methodId: 'v60',
    grinderId: grinder.id,
    roastLevel: 'dark',
    targetProfileId: 'balance_clean',
  });

  assert.notEqual(light.primarySetting, dark.primarySetting);
  assert.match(light.primarySetting, /setting/i);
  assert.match(dark.primarySetting, /setting/i);
});

test('Grind Size target profile changes grind bias and visible recommendation', async () => {
  const catalog = await loadCatalogForTest();
  const grinder = catalog.grinders.find((entry) => /K-Ultra/i.test(entry.name));
  assert.ok(grinder, 'K-Ultra grinder must exist');

  const sweetness = buildGrindSizeAdvice({
    catalog,
    methodId: 'v60',
    grinderId: grinder.id,
    roastLevel: 'medium',
    targetProfileId: 'more_sweetness',
  });
  const floral = buildGrindSizeAdvice({
    catalog,
    methodId: 'v60',
    grinderId: grinder.id,
    roastLevel: 'medium',
    targetProfileId: 'floral_transparent',
  });

  assert.notEqual(sweetness.primarySetting, floral.primarySetting);
  assert.equal(sweetness.targetBiasKind, 'finer');
  assert.equal(floral.targetBiasKind, 'coarser');
});

test('Grind Size blocks espresso for filter-only grinders and prioritizes selectable espresso grinders', async () => {
  const catalog = await loadCatalogForTest();
  const timemoreC2 = catalog.grinders.find((entry) => entry.id === 'timemore-c2');
  const encoreEsp = catalog.grinders.find((entry) => entry.id === 'baratza-encore-esp');
  assert.ok(timemoreC2, 'Timemore C2 fixture must exist');
  assert.ok(encoreEsp, 'Baratza Encore ESP fixture must exist');

  const c2Compatibility = getGrindSizeCompatibility(catalog, 'espresso', timemoreC2);
  const espCompatibility = getGrindSizeCompatibility(catalog, 'espresso', encoreEsp);

  assert.equal(c2Compatibility.state, 'not_recommended');
  assert.equal(c2Compatibility.selectable, false);
  assert.match(c2Compatibility.reason, /espresso|fine|halus/i);
  assert.notEqual(espCompatibility.state, 'not_recommended');
  assert.equal(espCompatibility.selectable, true);

  const sorted = sortGrindersForMethod(catalog, 'espresso');
  const c2Index = sorted.findIndex((entry) => entry.id === timemoreC2.id);
  const espIndex = sorted.findIndex((entry) => entry.id === encoreEsp.id);
  assert.ok(espIndex >= 0 && c2Index >= 0);
  assert.ok(espIndex < c2Index, 'espresso-capable grinders should appear before filter-only grinders');
});

test('Grind Size matrix keeps all visible grinders method-safe and finite', async () => {
  const catalog = await loadCatalogForTest();
  const roastLevels: RoastLevel[] = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
  const targetIds = catalog.targetProfiles.map((entry) => entry.id);
  let checked = 0;
  let blockedEspresso = 0;

  for (const method of BREW_METHOD_PROFILES) {
    for (const grinder of catalog.grinders.filter((entry) => !entry.hidden && !entry.deprecated)) {
      const compatibility = getGrindSizeCompatibility(catalog, method.id, grinder);
      if (method.id === 'espresso' && !compatibility.selectable) {
        blockedEspresso += 1;
        assert.equal(compatibility.state, 'not_recommended');
        continue;
      }
      if (!compatibility.selectable) continue;

      for (const roastLevel of roastLevels) {
        for (const targetProfileId of targetIds) {
          const advice = buildGrindSizeAdvice({
            catalog,
            methodId: method.id,
            grinderId: grinder.id,
            roastLevel,
            targetProfileId,
          });
          checked += 1;
          assert.ok(advice.primarySetting.trim(), `${method.id}/${grinder.id}/${roastLevel}/${targetProfileId} needs a setting`);
          assert.doesNotMatch(advice.primarySetting, /NaN|undefined|null/i);
          assert.doesNotMatch(advice.correctionRange, /NaN|undefined|null/i);
          assert.notEqual(advice.compatibilityState, 'unsupported');
          if (advice.confidenceKind === 'official' || advice.confidenceKind === 'community_verified') {
            assert.notEqual(advice.sourceKind, 'baseline_method');
          }
        }
      }
    }
  }

  assert.ok(checked > 20_000, `expected broad grind-size matrix coverage, got ${checked}`);
  assert.ok(blockedEspresso > 0, 'espresso should block at least one filter-only grinder');
});
