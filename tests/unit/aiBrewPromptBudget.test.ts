import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSequenceRepairPrompt } from '../../apps/web/src/features/ai-brew/prompts.ts';
import type { BrewPlan } from '../../apps/web/src/features/ai-brew/types.ts';

function createPlan(stepCount = 8): BrewPlan {
  const steps = Array.from({ length: stepCount }, (_, index) => {
    const isFirst = index === 0;
    const isLast = index === stepCount - 1;
    const pourVolumeMl = isFirst ? 45 : isLast ? 47 : 36;
    return {
      id: isFirst ? 'bloom' : isLast ? 'finish' : `pulse_${index}`,
      label: isFirst ? 'Bloom' : isLast ? 'Finish' : `Pulse ${index}`,
      startSeconds: isFirst ? 0 : 30 + index * 22,
      pourVolumeMl,
      targetVolumeMl: Math.min(280, 45 + index * 34),
      note: isFirst ? 'Wet all grounds.' : isLast ? 'Settle the bed.' : 'Keep cadence stable.',
    };
  });

  return {
    id: 'plan_prompt_budget',
    fingerprint: 'plan_prompt_budget',
    createdAt: Date.now(),
    catalogVersion: 'test',
    formState: {} as BrewPlan['formState'],
    brewMode: 'iced',
    methodFamily: 'v60',
    methodId: 'v60',
    ratioToolMethodId: 'v60',
    coffeeName: 'Prompt Budget Gesha Natural With Extended Farm Lot Context',
    process: 'Natural anaerobic long fermentation',
    variety: 'Geisha',
    roastLevel: 'medium_light',
    beanProfile: {
      active: true,
      summary: '1900 masl / low solubility / underdeveloped tendency',
      notes: [],
      roastDevelopment: 'underdeveloped',
      solubility: 'low',
    },
    targetProfileId: 'balance_clean',
    targetProfileLabel: 'Balance & Clean',
    dripper: { id: 'v60', name: 'Hario V60' } as BrewPlan['dripper'],
    grinder: { id: 'k-ultra', name: '1Zpresso K-Ultra' } as BrewPlan['grinder'],
    waterMode: 'brand',
    waterRegion: 'id',
    waterBrandId: 'volvic-id',
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
      tdsPpm: 95,
      hardnessPpm: 50,
      alkalinityPpm: 35,
      styleLabel: 'Balanced mineral input',
    },
    waterGuidance: {} as BrewPlan['waterGuidance'],
    totalWaterMl: 280,
    hotWaterMl: 180,
    iceMl: 100,
    recommendedRatio: 15.6,
    finalBeverageRatio: 15.6,
    hotExtractionRatio: 10,
    doseG: 18,
    waterTempC: 92,
    totalTimeSeconds: 180,
    estimatedCupOutputMl: 236,
    estimatedBrewOutputMl: 154,
    estimatedBeverageOutputMl: 236,
    grindBias: 'same',
    grindRecommendation: '8.3 clicks',
    grindBandLabel: '8.0 - 9.0 clicks',
    summary: 'Prompt budget QA summary',
    steps,
    notes: [],
    warnings: [],
    guardrails: { errors: [], warnings: [] },
    conformance: { warnings: [], standardsHits: [], standardsMisses: [] },
    deviceProfileId: 'profile_v60_iced',
    deviceProfileLabel: 'V60 Iced',
    deviceProfileMode: 'exact',
    grindSettingReference: '8.0 - 9.0 clicks',
    grindSettingMode: 'catalog_reference',
    grindSettingVerification: 'official',
    fallbackUsed: false,
    provenanceAttentionNeeded: false,
    confidenceNotes: [],
  } as BrewPlan;
}

test('AI Brew sequence repair prompt stays under structured AI server budget', () => {
  const prompt = buildSequenceRepairPrompt(createPlan(), [
    'Response is too short for operational use.',
    'Missing required heading: ## Service Pattern.',
    'Missing required heading: ## Sequence.',
    'Missing required heading: ## Watch.',
  ]).body;

  assert.ok(prompt.length < 12000);
  assert.match(prompt, /## Service Pattern/);
  assert.match(prompt, /Use exactly 8 numbered steps/);
  assert.match(prompt, /Hario V60/);
  assert.match(prompt, /TDS 95 ppm/);
});
