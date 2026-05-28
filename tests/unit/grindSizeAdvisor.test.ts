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

test('shared grind engine keeps target profile bias available for AI Brew without exposing it in calculator UI', async () => {
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

test('numbered dial grinders preserve decimal roast shifts in Grind Size output', async () => {
  const catalog = await loadCatalogForTest();
  const grinder = catalog.grinders.find((entry) => /K-Ultra/i.test(entry.name));
  assert.ok(grinder, 'K-Ultra grinder must exist');

  const outputs = (['light', 'medium_light', 'medium', 'medium_dark', 'dark'] as RoastLevel[]).map((roastLevel) =>
    buildGrindSizeAdvice({
      catalog,
      methodId: 'v60',
      grinderId: grinder.id,
      roastLevel,
      targetProfileId: 'balance_clean',
    }).primarySetting
  );

  assert.ok(
    outputs.every((value) => /\d+\.\d\s+numbers/i.test(value)),
    `expected decimal numbered-dial settings, got ${outputs.join(', ')}`,
  );
  assert.ok(new Set(outputs).size >= 4, `expected visible roast movement, got ${outputs.join(', ')}`);
});

test('Grind Size blocks espresso for filter-only grinders and prioritizes selectable espresso grinders', async () => {
  const catalog = await loadCatalogForTest();
  const timemoreC2 = catalog.grinders.find((entry) => entry.id === 'timemore-c2');
  const timemoreS3 = catalog.grinders.find((entry) => entry.id === 'timemore-s3');
  const baratzaEncore = catalog.grinders.find((entry) => entry.id === 'baratza-encore');
  const fellowOde = catalog.grinders.find((entry) => entry.id === 'fellow-ode-gen-2');
  const encoreEsp = catalog.grinders.find((entry) => entry.id === 'baratza-encore-esp');
  assert.ok(timemoreC2, 'Timemore C2 fixture must exist');
  assert.ok(timemoreS3, 'Timemore S3 fixture must exist');
  assert.ok(baratzaEncore, 'Baratza Encore non-ESP fixture must exist');
  assert.ok(fellowOde, 'Fellow Ode Gen 2 fixture must exist');
  assert.ok(encoreEsp, 'Baratza Encore ESP fixture must exist');

  for (const grinder of [timemoreC2, timemoreS3, baratzaEncore, fellowOde]) {
    const compatibility = getGrindSizeCompatibility(catalog, 'espresso', grinder);
    assert.equal(compatibility.state, 'not_recommended', `${grinder.id} should be blocked for espresso`);
    assert.equal(compatibility.selectable, false, `${grinder.id} should not be selectable for espresso`);
    assert.match(compatibility.reason, /espresso|fine|halus/i);
  }

  const espCompatibility = getGrindSizeCompatibility(catalog, 'espresso', encoreEsp);

  assert.notEqual(espCompatibility.state, 'not_recommended');
  assert.equal(espCompatibility.selectable, true);

  const sorted = sortGrindersForMethod(catalog, 'espresso');
  const c2Index = sorted.findIndex((entry) => entry.id === timemoreC2.id);
  const espIndex = sorted.findIndex((entry) => entry.id === encoreEsp.id);
  assert.ok(espIndex >= 0 && c2Index >= 0);
  assert.ok(espIndex < c2Index, 'espresso-capable grinders should appear before filter-only grinders');
});

test('Grind Size advice hard-gates espresso output for blocked grinders even on direct calls', async () => {
  const catalog = await loadCatalogForTest();
  const blockedIds = ['baratza-encore', 'timemore-c2', 'timemore-s3', 'fellow-ode-gen-2'];

  for (const grinderId of blockedIds) {
    const advice = buildGrindSizeAdvice({
      catalog,
      methodId: 'espresso',
      grinderId,
      roastLevel: 'medium',
      targetProfileId: 'balance_clean',
      espressoContext: {
        doseG: 18,
        yieldG: 36,
        shotTimeSec: 28,
        pressureBar: 9,
        zeroPointKnown: false,
      },
    });

    assert.equal(advice.compatibilityState, 'not_recommended', `${grinderId} should remain hard-gated`);
    assert.equal(advice.compatibilitySelectable, false, `${grinderId} should not be selectable`);
    assert.match(advice.primarySetting, /tidak direkomendasikan/i, `${grinderId} must not show a numeric espresso setting`);
    assert.doesNotMatch(advice.primarySetting, /\d/, `${grinderId} must not expose espresso dial numbers`);
    assert.equal(advice.grindBandLabel, 'Tidak direkomendasikan');
    assert.notEqual(advice.capabilityKind, 'espresso_capable');
    assert.notEqual(advice.capabilityKind, 'espresso_baseline');
    assert.equal(advice.espressoInsight, undefined);
  }
});

test('Grind Size catalog treats DF64 Gen 2 as calibration-required espresso/filter hybrid', async () => {
  const catalog = await loadCatalogForTest();
  const grinder = catalog.grinders.find((entry) => entry.id === 'df64-gen2');
  assert.ok(grinder, 'DF64 Gen 2 fixture must exist in the production grinder catalog');
  assert.match(`${grinder.name} ${grinder.searchText}`, /df64/i);
  assert.match(`${grinder.typeLabel} ${grinder.searchText}`, /zero|burr|alignment|calibration/i);

  const espressoCompatibility = getGrindSizeCompatibility(catalog, 'espresso', grinder);
  assert.equal(espressoCompatibility.selectable, true);
  assert.equal(espressoCompatibility.state, 'caution');
  assert.match(espressoCompatibility.reason, /kalibrasi|calibr/i);

  const advice = buildGrindSizeAdvice({
    catalog,
    methodId: 'espresso',
    grinderId: grinder.id,
    roastLevel: 'medium',
    targetProfileId: 'balance_clean',
    espressoContext: {
      doseG: 18,
      yieldG: 36,
      shotTimeSec: 28,
      pressureBar: 9,
      zeroPointKnown: false,
    },
  });

  assert.equal(advice.compatibilitySelectable, true);
  assert.equal(advice.compatibilityState, 'caution');
  assert.equal(advice.warningKind, 'espresso_calibration');
  assert.match(`${advice.warning} ${advice.setting?.note}`, /kalibrasi|zero|burr|dial-in|exact/i);
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

test('Grind Size uses the 2026 master grinder calibration table across pressure, cone, flat, immersion, and ice profiles', async () => {
  const catalog = await loadCatalogForTest();
  const grinderIds = new Set(catalog.grinders.map((entry) => entry.id));
  const settingById = new Map(catalog.grinderSettings.map((entry) => [entry.id, entry]));

  for (const requiredId of [
    'pietro-m-modal-burrs',
    'pietro-b-modal-burrs',
    'timemore-s3-esp',
    'baratza-encore-esp-pro',
    'kingrinder-p2',
    'kingrinder-p1-p0',
  ]) {
    assert.ok(grinderIds.has(requiredId), `Expected master grinder entry missing: ${requiredId}`);
  }
  assert.equal(grinderIds.has('pietro-flat-burr'), false, 'Pietro should be split by M-Modal and B-Modal burrs');
  assert.equal(grinderIds.has('kingrinder-p0-p1-p2'), false, 'KINGrinder P-series should split P2 from P1/P0');

  for (const [settingId, expectedRange] of [
    ['gs_master_1zpresso-k-ultra_cone_hot', '6.0 - 7.0 numbers'],
    ['gs_master_1zpresso-k-ultra_cone_iced', '5.0 - 5.8 numbers'],
    ['gs_master_1zpresso-k-ultra_moka_pot', '4.0 - 5.0 numbers'],
    ['gs_master_comandante-c40-mk4_flat_hot', '26 - 30 clicks'],
    ['gs_master_comandante-c40-mk4_chemex_hot', '28 - 32 clicks'],
    ['gs_master_comandante-c40-mk4_french_press', '30 - 35 clicks'],
    ['gs_master_pietro-m-modal-burrs_cone_hot', '4.0 - 6.2 numbers'],
    ['gs_master_pietro-b-modal-burrs_cone_hot', '4.5 - 7.0 numbers'],
    ['gs_master_timemore-s3-esp_espresso', '20 - 30 clicks'],
    ['gs_master_baratza-encore-esp-pro_flat_hot', '50 - 55 settings'],
  ] as const) {
    assert.equal(settingById.get(settingId)?.rangeLabel, expectedRange, `${settingId} should use the master table range`);
    assert.equal(settingById.get(settingId)?.referenceType, 'method_specific_master_table');
    assert.equal(settingById.get(settingId)?.calibrationRequired, true);
  }

  const methodSuffixes = [
    'moka_pot',
    'aeropress',
    'siphon',
    'cone_hot',
    'cone_iced',
    'clever_hot',
    'clever_iced',
    'flat_hot',
    'flat_iced',
    'chemex_hot',
    'chemex_iced',
    'french_press',
    'cold_brew',
    'batch_brew',
  ];
  for (const grinderId of grinderIds) {
    if (grinderId.startsWith('unknown-')) continue;
    for (const suffix of methodSuffixes) {
      assert.ok(settingById.has(`gs_master_${grinderId}_${suffix}`), `${grinderId} is missing ${suffix} master setting`);
    }
  }
});
