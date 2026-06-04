import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExtractionFinisher } from '../../apps/web/src/features/ai-brew/extractionFinisher.ts';
import type { BrewPlan } from '../../apps/web/src/features/ai-brew/types.ts';

function createPlan(overrides: Partial<BrewPlan> = {}) {
  return {
    id: 'plan_test',
    fingerprint: 'plan_test',
    createdAt: Date.now(),
    catalogVersion: 'test-v1',
    formState: {} as BrewPlan['formState'],
    brewMode: 'hot',
    methodFamily: 'v60',
    methodId: 'v60',
    ratioToolMethodId: 'v60',
    coffeeName: 'QA Brew',
    process: 'Washed',
    variety: 'Bourbon',
    roastLevel: 'light',
    beanProfile: {
      active: true,
      summary: '1850 masl · low solubility',
      notes: [],
      altitudeMasl: 1850,
      roastDevelopment: 'underdeveloped',
      solubility: 'low',
    },
    targetProfileId: 'balance_clean',
    targetProfileLabel: 'Balance & Clean',
    dripper: { id: 'hario-v60', name: 'Hario V60' } as BrewPlan['dripper'],
    grinder: { id: 'k-ultra', name: '1Zpresso K-Ultra' } as BrewPlan['grinder'],
    waterMode: 'brand',
    waterRegion: 'id',
    waterBrandId: 'volvic-sg',
    waterBrandLabel: 'Volvic',
    waterPresetStatus: 'autofill',
    waterPublishState: 'published',
    waterIsBrewReady: true,
    waterBrewBlockReason: [],
    waterBrandMarkets: ['id'],
    waterBrandVerification: 'official',
    waterBrandSourceUrls: [],
    waterCustomized: false,
    waterMinerals: {
      tdsPpm: 96,
      hardnessPpm: 40,
      alkalinityPpm: 24,
      styleLabel: 'Balanced brew water',
    },
    waterGuidance: {} as BrewPlan['waterGuidance'],
    totalWaterMl: 270,
    hotWaterMl: 270,
    iceMl: 0,
    recommendedRatio: 15.5,
    doseG: 17.5,
    waterTempC: 90,
    totalTimeSeconds: 165,
    estimatedCupOutputMl: 230,
    estimatedBrewOutputMl: 230,
    estimatedBeverageOutputMl: 230,
    grindBias: 'same',
    grindRecommendation: '8.5 clicks',
    grindBandLabel: '8 - 9 clicks',
    summary: 'QA summary',
    steps: [],
    notes: [],
    warnings: [],
    guardrails: { errors: [], warnings: [] },
    conformance: { warnings: [], standardsHits: [], standardsMisses: [] },
    deviceProfileId: 'profile_hario_v60_hot',
    deviceProfileLabel: 'Hario V60 Hot',
    deviceProfileMode: 'exact',
    grindSettingReference: '8.5 clicks',
    grindSettingMode: 'catalog_reference',
    grindSettingVerification: 'official',
    fallbackUsed: false,
    provenanceAttentionNeeded: false,
    confidenceNotes: [],
    ...overrides,
  } as BrewPlan;
}

test('extraction finisher pushes sour cups toward deeper extraction on hard-to-open brews', () => {
  const finisher = buildExtractionFinisher(createPlan());

  assert.match(finisher.finalRead, /harder-to-dissolve coffee/i);
  assert.match(finisher.adjustments[0].action, /grinder 0\.5 step finer first|\+1 C only/i);
  assert.match(finisher.adjustments[0].why, /under-extraction|did not extract deeply enough/i);
});

test('extraction finisher moves bitter dark-roast brews through grind and agitation before temperature', () => {
  const finisher = buildExtractionFinisher(createPlan({
    roastLevel: 'dark',
    waterTempC: 94,
    beanProfile: {
      active: true,
      summary: 'developed',
      notes: [],
      roastDevelopment: 'developed',
      solubility: 'high',
    },
  }));

  const bitter = finisher.adjustments.find((item) => item.taste === 'bitter');
  assert.ok(bitter);
  assert.match(bitter.action, /grinder 0\.5 step coarser|reduce agitation|-1 C only/i);
});

test('extraction finisher fixes bypass and contact before ratio when an iced brew tastes thin', () => {
  const finisher = buildExtractionFinisher(createPlan({
    brewMode: 'iced',
    hotWaterMl: 150,
    iceMl: 90,
    recommendedRatio: 16.6,
  }));

  const thin = finisher.adjustments.find((item) => item.taste === 'thin');
  assert.ok(thin);
  assert.match(thin.action, /same ratio|middle pour|contact|bypass/i);
  assert.doesNotMatch(thin.action, /tighten the brew ratio|change dose|increase dose/i);
  assert.match(finisher.recipeReasoning[0], /150 ml hot \/ 90 ml ice|hot \/ 90 ml ice/i);
});

test('extraction finisher reflects target tone and water behavior for contrasting cups', () => {
  const brightSoft = buildExtractionFinisher(createPlan({
    targetProfileId: 'more_acidity',
    targetProfileLabel: 'More Acidity',
    waterMinerals: {
      tdsPpm: 75,
      hardnessPpm: 35,
      alkalinityPpm: 22,
      styleLabel: 'Soft bright water',
    },
  }));
  const bodyBuffered = buildExtractionFinisher(createPlan({
    targetProfileId: 'more_body',
    targetProfileLabel: 'More Body',
    roastLevel: 'medium_dark',
    beanProfile: {
      active: true,
      summary: 'developed',
      notes: [],
      roastDevelopment: 'developed',
      solubility: 'high',
    },
    waterMinerals: {
      tdsPpm: 180,
      hardnessPpm: 120,
      alkalinityPpm: 85,
      styleLabel: 'Buffered body water',
    },
  }));

  assert.match(brightSoft.finalRead, /brighter, cleaner cup/i);
  assert.match(brightSoft.recipeReasoning.join(' '), /clarity comes fast/i);

  assert.match(bodyBuffered.finalRead, /denser, more tactile cup/i);
  assert.match(bodyBuffered.finalRead, /easier-to-extract roast|execution must stay tidy/i);
  assert.match(bodyBuffered.recipeReasoning.join(' '), /cushion acidity|avoiding excess contact time/i);
});

