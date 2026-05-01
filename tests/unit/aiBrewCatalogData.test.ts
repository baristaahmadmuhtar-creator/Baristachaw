import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BREW_METHOD_PROFILES } from '../../apps/web/src/features/barista-tools/brewProfiles.ts';

function readJson<T>(relativePath: string): T {
  const fullPath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

test('ai brew catalog data maintains cross-file integrity and expanded coverage', () => {
  const drippers = readJson<{ items: Array<{ name: string }> }>('apps/web/public/data/ai-brew/drippers.v2026-03.json').items;
  const grinders = readJson<{ items: Array<{ name: string }> }>('apps/web/public/data/ai-brew/grinders.v2026-03.json').items;
  const grinderSearch = readJson<{ items: Array<{ id: string; search_text: string }> }>('apps/web/public/data/catalog/phase1/grinders.search.json').items;
  const profiles = readJson<{
    items: Array<{
      id: string;
      exactMatch: boolean;
      brewMode: string;
      dripperIds: string[];
      methodFamily: string;
      brewMethodId: string;
      steps?: Array<{ id: string; label: string; share: number; note: string }>;
    }>;
  }>('apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json').items;
  const grinderSettings = readJson<{ items: Array<{ id: string; grinderId: string; profileIds: string[]; rangeLabel: string }> }>('apps/web/public/data/ai-brew/grinder-settings.v2026-06.json').items;
  const processes = readJson<{ items: Array<{ id: string; origins?: string[] }> }>('apps/web/public/data/ai-brew/processes.v2026-06.json').items;
  const varieties = readJson<{ items: Array<{ id: string; origins?: string[] }> }>('apps/web/public/data/ai-brew/varieties.v2026-06.json').items;
  const waters = readJson<{
    items: Array<{
      id: string;
      country_origin: string;
      market_code: string;
      publish_state: string;
      tds_ppm: number | null;
      coffee_parameters: {
        hardness_ppm_as_caco3: number | null;
        alkalinity_ppm_as_caco3: number | null;
      };
    }>;
  }>('data/catalog/normalized/phase1/waters.json').items;

  const dripperIds = new Set(drippers.map((entry) => slugify(entry.name)));
  const grinderIds = new Set(grinders.map((entry) => slugify(entry.name)));
  const profileIds = new Set(profiles.map((entry) => entry.id));

  const exactHotCoverage = new Set(
    profiles
      .filter((entry) => entry.exactMatch && entry.brewMode === 'hot')
      .flatMap((entry) => entry.dripperIds),
  );

  for (const dripperId of dripperIds) {
    assert.ok(exactHotCoverage.has(dripperId), `Missing exact hot profile for dripper ${dripperId}`);
  }
  const exactIcedCoverage = new Set(
    profiles
      .filter((entry) => entry.exactMatch && entry.brewMode === 'iced')
      .flatMap((entry) => entry.dripperIds),
  );
  assert.ok(
    exactIcedCoverage.size >= Math.floor(dripperIds.size * 0.8),
    'Iced exact profile coverage should include at least 80% of drippers',
  );

  assert.ok(
    profiles.some((entry) => entry.id === 'profile_tricolate-brewer_hot' && entry.exactMatch),
    'Tricolate Brewer should have an exact hot profile',
  );

  for (const icedId of [
    'profile_blue_bottle_iced',
    'profile_cafec_flower_iced',
    'profile_hario_mugen_iced',
    'profile_kalita-102_iced',
    'profile_melitta_iced',
    'profile_timemore_crystal_eye_iced',
    'profile_stagg_x_iced',
    'profile_torch-mountain_iced',
  ]) {
    assert.ok(profiles.some((entry) => entry.id === icedId && entry.exactMatch && entry.brewMode === 'iced'), `Expected iced exact profile missing: ${icedId}`);
  }

  const harioV60Iced = profiles.find((entry) => entry.id === 'profile_hario_v60_iced');
  assert.ok(harioV60Iced, 'Hario V60 iced profile should exist');
  assert.equal(harioV60Iced?.brewMethodId, 'v60_japanese_iced');
  assert.equal(harioV60Iced?.steps?.length, 4, 'Hario V60 iced should expose bloom, two build pours, and final pour');
  assert.deepEqual(
    harioV60Iced?.steps?.map((step) => step.label),
    ['Bloom', 'Center Pour', 'Second Pulse', 'Final Pour'],
  );
  assert.ok(harioV60Iced?.steps?.every((step) => step.share > 0), 'Hario V60 iced service/stir should not be encoded as a zero-share brew step');
  assert.doesNotMatch(
    harioV60Iced?.steps?.map((step) => `${step.label} ${step.note}`).join('\n') || '',
    /\bserve\b/i,
    'Hario V60 iced brew steps should avoid serve wording inside the operational pour sequence',
  );

  for (const [profileId, expectedMethodId] of [
    ['profile_kono_meimon_hot', 'kono'],
    ['profile_kono_meimon_iced', 'kono_iced'],
    ['profile_melitta_hot', 'melitta'],
    ['profile_melitta_iced', 'melitta_iced'],
    ['profile_hario_pegasus_hot', 'melitta'],
    ['profile_hario_pegasus_iced', 'melitta_iced'],
  ] as const) {
    const profile = profiles.find((entry) => entry.id === profileId);
    assert.equal(profile?.brewMethodId, expectedMethodId, `${profileId} should hand off to ${expectedMethodId}`);
  }

  const aiBrewMethodIds = new Set(profiles.map((entry) => entry.brewMethodId));
  for (const method of BREW_METHOD_PROFILES) {
    assert.ok(aiBrewMethodIds.has(method.id), `AI Brew device profiles should cover Barista Tools method ${method.id}`);
  }

  for (const [profileId, methodFamily, brewMethodId] of [
    ['profile_espresso_machine_hot', 'espresso', 'espresso'],
    ['profile_french_press_hot', 'french_press', 'french_press'],
    ['profile_aeropress_hot', 'aeropress', 'aeropress'],
    ['profile_hario_siphon_hot', 'siphon', 'siphon'],
    ['profile_bialetti_moka_pot_hot', 'moka_pot', 'moka_pot'],
    ['profile_toddy_cold_brew_hot', 'cold_brew', 'cold_brew'],
    ['profile_batch_brewer_hot', 'batch_brew', 'batch_brew'],
  ] as const) {
    const profile = profiles.find((entry) => entry.id === profileId);
    assert.equal(profile?.methodFamily, methodFamily, `${profileId} should use ${methodFamily}`);
    assert.equal(profile?.brewMethodId, brewMethodId, `${profileId} should hand off to ${brewMethodId}`);
    assert.equal(profile?.exactMatch, true, `${profileId} should be an exact AI Brew profile`);
  }

  const settingsByGrinder = new Map<string, number>();
  for (const setting of grinderSettings) {
    assert.ok(grinderIds.has(setting.grinderId), `Unknown grinderId in settings: ${setting.grinderId}`);
    assert.match(setting.rangeLabel, /\d/, `Grinder setting has no numeric range: ${setting.grinderId}`);
    for (const profileId of setting.profileIds) {
      assert.ok(profileIds.has(profileId), `Unknown profileId ${profileId} in grinder settings`);
    }
    settingsByGrinder.set(setting.grinderId, (settingsByGrinder.get(setting.grinderId) || 0) + 1);
  }

  assert.ok(settingsByGrinder.size >= Math.floor(grinderIds.size * 0.9), 'Grinder coverage for settings should be at least 90%');
  const missingGrinderCoverage = [...grinderIds].filter((id) => !settingsByGrinder.has(id));
  assert.deepEqual(missingGrinderCoverage, [], 'Every grinder should have at least one grinder-setting reference');

  const processIds = new Set(processes.map((entry) => entry.id));
  for (const required of ['wet_hulled', 'black_honey', 'white_honey', 'anaerobic_washed', 'monsooned', 'red_honey', 'yellow_honey', 'anaerobic_natural', 'anaerobic_honey', 'double_fermentation', 'wine_yeast_fermentation', 'aerobic_fermentation', 'coferment', 'sequential_fermentation', 'anaerobic_thermal_shock', 'semi_washed', 'lactic_anaerobic', 'enzyme_fermentation']) {
    assert.ok(processIds.has(required), `Expected process missing: ${required}`);
  }

  const processOriginCoverage = new Set(processes.flatMap((entry) => entry.origins || []));
  for (const requiredOrigin of ['Indonesia', 'India', 'Japan', 'China', 'Costa Rica', 'Colombia', 'Ethiopia']) {
    assert.ok(processOriginCoverage.has(requiredOrigin), `Expected process origin coverage missing: ${requiredOrigin}`);
  }
  for (const requiredSeaOrigin of ['Vietnam', 'Thailand', 'Taiwan', 'Myanmar']) {
    assert.ok(processOriginCoverage.has(requiredSeaOrigin), `Expected SEA process origin coverage missing: ${requiredSeaOrigin}`);
  }
  for (const entry of processes) {
    assert.ok(Array.isArray(entry.origins) && entry.origins.length > 0, `Process ${entry.id} should include origins`);
  }

  const varietyIds = new Set(varieties.map((entry) => entry.id));
  for (const required of ['sigararutang', 'andungsari', 'lini_s', 'timtim', 'yunnan_catimor', 'java', 'ateng_super', 'borbor', 'usda_762', 'kartika_1', 'kartika_2', 'gayo_1', 'sln9', 'sarchimor', 'pacas', 'kent', 'sln6', 'sln5b', 's288', 'cauvery', 'chandragiri']) {
    assert.ok(varietyIds.has(required), `Expected variety missing: ${required}`);
  }

  for (const expanded of ['sln7', 'liberica']) {
    assert.ok(varietyIds.has(expanded), `Expected expanded variety missing: ${expanded}`);
  }

  const varietyOriginCoverage = new Set(varieties.flatMap((entry) => entry.origins || []));
  for (const requiredOrigin of ['Indonesia', 'India', 'Timor-Leste', 'China', 'Ethiopia', 'Kenya', 'Colombia', 'Brazil', 'Philippines']) {
    assert.ok(varietyOriginCoverage.has(requiredOrigin), `Expected variety origin coverage missing: ${requiredOrigin}`);
  }
  for (const entry of varieties) {
    assert.ok(Array.isArray(entry.origins) && entry.origins.length > 0, `Variety ${entry.id} should include origins`);
  }

  const origins = new Set(waters.map((entry) => entry.country_origin));
  for (const origin of ['China', 'Hong Kong', 'Germany', 'Iceland', 'Japan', 'South Korea', 'Taiwan', 'Thailand', 'Vietnam', 'Philippines', 'UK', 'USA']) {
    assert.ok(origins.has(origin), `Expected water origin missing: ${origin}`);
  }

  const sgWaters = waters.filter((entry) => entry.market_code === 'sg').length;
  assert.ok(sgWaters >= 18, 'Singapore water market coverage should include at least 18 entries');

  const bnWaters = waters.filter((entry) => entry.market_code === 'bn').length;
  assert.ok(bnWaters >= 4, 'Brunei water market coverage should include at least 4 entries');

  const globalWaters = waters.filter((entry) => entry.market_code === 'global').length;
  assert.ok(globalWaters >= 12, 'Global water fallback catalog should include at least 12 entries');

  for (const bruneiId of ['evian-bn', 'volvic-bn', 'spritzer-bn']) {
    const record = waters.find((entry) => entry.id === bruneiId);
    assert.ok(record, `${bruneiId} should exist`);
    assert.equal(record.publish_state, 'review_only', `${bruneiId} should stay review_only until market verification`);
  }

  const icelandic = waters.find((entry) => entry.id === 'icelandic-glacial-sg');
  assert.ok(icelandic, 'Icelandic Glacial SG should exist');
  assert.equal(icelandic.publish_state, 'published', 'Icelandic Glacial SG should be published after chemistry enrichment');
  assert.equal(icelandic.coffee_parameters.hardness_ppm_as_caco3, 23.2);
  assert.equal(icelandic.coffee_parameters.alkalinity_ppm_as_caco3, 34.2);

  const sanPellegrino = waters.find((entry) => entry.id === 'san-pellegrino-sg');
  assert.ok(sanPellegrino, 'San Pellegrino SG should exist');
  assert.equal(sanPellegrino.publish_state, 'review_only', 'San Pellegrino SG should remain review-only due extreme chemistry');
  assert.equal(sanPellegrino.tds_ppm, 1100);
  assert.equal(sanPellegrino.coffee_parameters.hardness_ppm_as_caco3, 616.3);

  const timemoreC2Cone = grinderSettings.find((entry) => entry.id === 'gs_timemore_c2_cone');
  const timemoreC2Flat = grinderSettings.find((entry) => entry.id === 'gs_timemore_c2_flat');
  const kinuM47Cone = grinderSettings.find((entry) => entry.id === 'gs_kinu_m47_cone');
  const harioMiniSlimCone = grinderSettings.find((entry) => entry.id === 'gs_hario_mini_slim_cone');
  const c3EspFlat = grinderSettings.find((entry) => entry.id === 'gs_timemore_c3_esp_flat');
  const feima600nCone = grinderSettings.find((entry) => entry.id === 'gs_feima_600n_cone');
  const feima600nFlat = grinderSettings.find((entry) => entry.id === 'gs_feima_600n_flat');
  assert.ok(timemoreC2Cone && timemoreC2Flat, 'Timemore C2 should have cone and flat grinder-setting references');
  assert.ok(kinuM47Cone, 'Kinu M47 should include cone grinder-setting reference');
  assert.ok(harioMiniSlimCone, 'Hario Mini Slim should include cone grinder-setting reference');
  assert.ok(c3EspFlat, 'Timemore C3 ESP should include flat grinder-setting reference');
  assert.ok(feima600nCone && feima600nFlat, 'Feima 600N should include cone and flat grinder-setting references');

  for (const id of [
    'gs_1zpresso_k_max_flat',
    'gs_1zpresso_q_air_q2_cone',
    'gs_1zpresso_x_pro_x_ultra_flat',
    'gs_comandante_c60_baracuda_cone',
    'gs_feima_600n_cone',
    'gs_feima_600n_flat',
    'gs_hario_smart_g_flat',
    'gs_timemore_c3_max_cone',
    'gs_kingrinder_k0_k1_cone',
    'gs_1zpresso_k_plus_flat',
    'gs_timemore_sculptor_078s_filter',
  ]) {
    assert.ok(grinderSettings.some((entry) => entry.id === id), `Expected grinder setting missing: ${id}`);
  }

  assert.ok(grinders.some((entry) => slugify(entry.name) === 'feima-600n'), 'Feima 600N should exist as a canonical grinder entry');
  const feimaSearch = grinderSearch.find((entry) => entry.id === 'feima-600n');
  assert.ok(feimaSearch, 'Feima 600N should exist in grinder search export');
  assert.match(feimaSearch?.search_text || '', /latina 600n|flying eagle 600n/i, 'Feima 600N search export should include regional rebrand aliases');

  for (const id of ['evian-global', 'volvic-global', 'acqua-panna-global', 'fiji-global']) {
    const entry = waters.find((item) => item.id === id);
    assert.ok(entry, id + ' should exist in global market coverage');
    assert.equal(entry?.market_code, 'global');
    assert.equal(entry?.publish_state, 'published');
  }
});
