import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicNarrative,
  composeHybridNarrative,
  extractSequenceOverlayFromMarkdown,
  validateAiNarrative,
} from '../../apps/web/src/features/ai-brew/aiComposer.ts';
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
      summary: '1850 masl / low solubility',
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
    finalBeverageRatio: 15.5,
    hotExtractionRatio: 15.5,
    hotWaterSharePercent: 100,
    iceSharePercent: 0,
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
    steps: [
      {
        id: 'bloom',
        label: 'Bloom',
        startSeconds: 0,
        pourVolumeMl: 60,
        targetVolumeMl: 60,
        note: 'Wet all grounds quickly.',
      },
      {
        id: 'pulse_1',
        label: 'Pulse 1',
        startSeconds: 40,
        pourVolumeMl: 90,
        targetVolumeMl: 150,
        note: 'Center-out circles.',
      },
      {
        id: 'pulse_2',
        label: 'Pulse 2',
        startSeconds: 90,
        pourVolumeMl: 120,
        targetVolumeMl: 270,
        note: 'Finish gently and level bed.',
      },
    ],
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

const icedFixtureSteps: BrewPlan['steps'] = [
  {
    id: 'bloom',
    label: 'Bloom',
    startSeconds: 0,
    pourVolumeMl: 50,
    targetVolumeMl: 50,
    note: 'Wet all grounds quickly.',
  },
  {
    id: 'pulse_1',
    label: 'Pulse 1',
    startSeconds: 40,
    pourVolumeMl: 60,
    targetVolumeMl: 110,
    note: 'Center-out circles.',
  },
  {
    id: 'pulse_2',
    label: 'Pulse 2',
    startSeconds: 90,
    pourVolumeMl: 60,
    targetVolumeMl: 170,
    note: 'Finish gently and level bed.',
  },
];

test('deterministic sequence changes by context (iced vs hot)', () => {
  const hot = buildDeterministicNarrative(createPlan(), 'sequence');
  const iced = buildDeterministicNarrative(createPlan({
    brewMode: 'iced',
    steps: icedFixtureSteps,
    hotWaterMl: 170,
    iceMl: 100,
    finalBeverageRatio: 15.5,
    hotExtractionRatio: 9.7,
    hotWaterSharePercent: 63,
    iceSharePercent: 37,
  }), 'sequence');

  assert.notEqual(hot, iced);
  assert.match(iced, /## Service Pattern/);
  assert.match(iced, /Iced mode active/i);
});

test('sequence overlay accepts Indonesian section headings without losing step instructions', () => {
  const plan = createPlan();
  const translatedMarkdown = [
    '## Pola Layanan',
    '- Pola seduh tetap stabil untuk barista.',
    '- Jaga semua angka dari planner.',
    '## Urutan Seduh',
    '1. Bloom at 00:00: pour 60 ml to 60 ml. Basahi semua bubuk dengan tenang.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml. Pertahankan aliran tengah ke luar.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml. Selesaikan pelan dan ratakan bed.',
    '## Pantau',
    '- Bed kopi harus rata sampai drawdown.',
  ].join('\n');

  const overlay = extractSequenceOverlayFromMarkdown(plan, translatedMarkdown);

  assert.equal(overlay.servicePattern.length, 2);
  assert.equal(overlay.watch.length, 1);
  assert.equal(overlay.steps[0].instruction, 'Basahi semua bubuk dengan tenang.');
  assert.equal(overlay.steps[2].instruction, 'Selesaikan pelan dan ratakan bed.');
});

test('validator accepts iced final ratio and hot concentrate ratio in the deterministic envelope', () => {
  const plan = createPlan({
    brewMode: 'iced',
    totalWaterMl: 270,
    hotWaterMl: 170,
    iceMl: 100,
    steps: icedFixtureSteps,
    finalBeverageRatio: 15.5,
    hotExtractionRatio: 9.7,
    hotWaterSharePercent: 63,
    iceSharePercent: 37,
  });
  const valid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Iced mode active; keep final ratio and hot concentrate locked.',
    '## Sequence',
    '1. Bloom at 00:00: pour 50 ml to 50 ml for Hario V60 balance profile and Volvic water bloom.',
    '2. Pulse 1 at 00:40: pour 60 ml to 110 ml for Hario V60 balance profile while keeping Volvic hot concentrate ratio 1:9.7 stable.',
    '3. Pulse 2 at 01:30: pour 60 ml to 170 ml and finish Hario V60 balance extraction with steady water flow.',
    '## Watch',
    '- Keep final beverage ratio 1:15.5 and split fixed at 170 ml hot / 100 ml ice.',
    '- Water and bean constraints remain fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', valid);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('deterministic sequence changes by method family, not only numbers', () => {
  const cone = buildDeterministicNarrative(createPlan({ methodFamily: 'v60' }), 'sequence');
  const flat = buildDeterministicNarrative(createPlan({ methodFamily: 'kalita_wave' }), 'sequence');

  assert.notEqual(cone, flat);
  assert.match(cone, /Cone Clarity Arc/i);
  assert.match(flat, /Flat-Bed Ladder/i);
});

test('validator rejects placeholders and envelope violations', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Pulse Ladder',
    '- Hot mode active',
    '## Sequence',
    '1. Bloom at 00:00 pour 60 ml to 60 ml for V60 balance profile.',
    '2. Main pour at 01:00 pour 400 ml to 460 ml and adjust as needed...',
    '3. Pulse 2 at 01:30 pour 120 ml to 270 ml with Volvic water.',
    '## Watch',
    '- TBD',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /placeholder|Volume 400/i.test(item)));
});

test('validator rejects chemistry claims outside planner envelope', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active and keep timing stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml and keep TDS 180 stable.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml with hardness 40.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml and finish calmly.',
    '## Watch',
    '- Keep V60 flow stable for balance profile and Volvic water.',
    '- Bean roast and chemistry constraints stay fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /TDS value 180/i.test(item)));
});

test('validator rejects cumulative target drift from deterministic envelope', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active and Volvic context is fixed.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml and settle the bed.',
    '2. Pulse 1 at 00:40: pour 90 ml to 170 ml with centered circles.',
    '3. Pulse 2 at 01:30: pour 120 ml to 280 ml and finish level.',
    '## Watch',
    '- Keep V60 flow stable for balance profile target.',
    '- Water and bean constraints remain fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /cumulative volume .*drifts/i.test(item)));
});

test('hybrid composer falls back to deterministic sequence on invalid ai output', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sequence', '## Sequence\n1. ...\n## Watch\n- ...');
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.match(result.markdown, /## Sequence/);
  assert.match(result.markdown, /Bloom/);
});

test('hybrid composer maps service failure text to ai_unavailable fallback', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sop', 'Sorry, I could not process your request. Please try again.');

  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'ai_unavailable');
  assert.ok(result.validation.errors.some((item) => /unavailability/i.test(item)));
});

test('hybrid composer accepts valid structured ai output inside envelope', () => {
  const plan = createPlan();
  const valid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active; keep balance target and Volvic water behavior stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target while keeping Volvic mineral behavior stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast consistency and gentle leveling.',
    '## Watch',
    '- Keep V60 flow stable for the balance target profile.',
    '- Water remains Volvic-style mineral input and bean roast is light.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', valid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /Pulse 2/);
});

test('validator rejects sequence that conflicts with easy extraction pressure profile cues', () => {
  const plan = createPlan({
    beanProfile: {
      active: true,
      summary: 'Developed / high solubility',
      notes: [],
      roastDevelopment: 'developed',
      solubility: 'high',
    },
    waterMinerals: {
      tdsPpm: 75,
      hardnessPpm: 35,
      alkalinityPpm: 20,
      styleLabel: 'Soft low-buffer water',
    },
  });
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active; keep balance target and Volvic water behavior stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and extend contact time before the next pulse.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target while keeping Volvic mineral behavior stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast consistency and gentle leveling.',
    '## Watch',
    '- Keep V60 flow stable for the balance target profile.',
    '- Water remains Volvic-style mineral input and bean roast is light.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /extraction pressure profile/i.test(item)));
});

test('validator rejects sequence when hold distribution conflicts with deterministic cadence profile', () => {
  const plan = createPlan({
    targetProfileLabel: 'More Acidity',
    beanProfile: {
      active: true,
      summary: 'Underdeveloped / low solubility',
      notes: [],
      roastDevelopment: 'underdeveloped',
      solubility: 'low',
    },
    waterMinerals: {
      tdsPpm: 120,
      hardnessPpm: 130,
      alkalinityPpm: 85,
      styleLabel: 'Hard buffered water',
    },
  });

  const invalid = [
    '## Service Pattern',
    '- Bright Cone Clarity Arc for Hario V60 and more acidity profile.',
    '- Hot mode active; keep acidity target and Volvic water behavior stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 acidity target with hard water context and wait for 55 seconds before the next pulse.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 acidity target with bean roast context and hold for 5 seconds to keep flow calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 acidity target with Volvic water context and wait for 5 seconds before serving.',
    '## Watch',
    '- Keep Hario V60 flow stable for acidity target with hard water context.',
    '- Keep ratio 1:15.5 and total time 02:45 locked with bean roast constraints.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /cadence profile/i.test(item)));
});

test('validator rejects sequence step without post-pour control action', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic water and balance target.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with Volvic water.',
    '## Watch',
    '- Keep V60 and balance profile fixed for Volvic water behavior.',
    '- Keep bean and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /post-pour control action/i.test(item)));
});

test('validator rejects sequence line that misses deterministic volume reference', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for V60.',
    '- Hot mode active with Volvic water.',
    '## Sequence',
    '1. Bloom at 00:00 and prepare the bed.',
    '2. Pulse 1 at 00:40 keep circles tight.',
    '3. Pulse 2 at 01:30 and finish cleanly.',
    '## Watch',
    '- Keep V60 and balance profile fixed.',
    '- Water and roast constraints stay fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /must include deterministic pour volume and cumulative target volume/i.test(item)));
});

test('validator rejects non-canonical deterministic prefix order even when values are present', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic water and balance target.',
    '## Sequence',
    '1. Bloom: pour 60 ml to 60 ml at 00:00 for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1: pour 90 ml to 150 ml at 00:40 for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2: pour 120 ml to 270 ml at 01:30 for Hario V60 balance profile with bean roast context and level gently.',
    '## Watch',
    '- Keep V60 and balance profile fixed for Volvic water behavior.',
    '- Keep bean and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /canonical prefix/i.test(item)));
});
test('validator rejects sequence when deterministic step times are shifted even with matching cadence gaps', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic water and balance target.',
    '## Sequence',
    '1. Bloom at 00:10: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:50: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:40: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and level gently.',
    '## Watch',
    '- Keep V60 and balance profile fixed for Volvic water behavior.',
    '- Keep bean and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /canonical prefix/i.test(item)));
  assert.ok(result.errors.some((item) => /Bloom at 00:00/i.test(item)));
});


test('validator rejects post-brew dilution top-up instructions inside sequence steps', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic water and balance target.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and add 20 ml hot water as bypass top-up before serving.',
    '## Watch',
    '- Keep V60 and balance profile fixed for Volvic water behavior.',
    '- Keep bean and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /dilution\/top-up instruction|manual-brew workflow/i.test(item)));
});
test('validator rejects extra absolute clock timestamps inside one step line', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic water and balance target.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion until 00:25.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm until 01:10.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed by 02:10.',
    '## Watch',
    '- Keep V60 and balance profile fixed for Volvic water behavior.',
    '- Keep bean and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /extra absolute clock time/i.test(item)));
});
test('validator rejects extra steps outside deterministic sequence envelope', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for V60.',
    '- Hot mode active with Volvic water.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml.',
    '4. Extra rinse at 02:10: pour 10 ml to 280 ml.',
    '## Watch',
    '- Keep V60 and balance profile fixed.',
    '- Water and roast constraints stay fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /exceed deterministic sequence/i.test(item)));
});

test('validator rejects sequence heading order mismatch', () => {
  const plan = createPlan();
  const invalid = [
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml with V60 method anchor and balance target.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml with Volvic context and stable circles.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml while maintaining bean roast consistency.',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic water and balance target anchor.',
    '## Watch',
    '- Keep V60 flow and target profile stable through all pulses.',
    '- Keep water and bean context locked during extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /heading order is invalid/i.test(item)));
});



test('validator rejects sequence when context anchors exist only outside step lines', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60 with Volvic water.',
    '- Hot mode active for balance target.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml and keep circles tight.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml and level gently.',
    '## Watch',
    '- Keep V60 flow stable for balance target with Volvic water.',
    '- Bean roast and water constraints remain fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /inside operational lines/i.test(item)));
});

test('validator rejects monotonous sequence actions', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with Volvic water.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /too monotonous/i.test(item)));
});

test('hybrid composer maps overloaded model text to ai_unavailable fallback', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sequence', 'The model is currently overloaded. Please try again in a minute.');

  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'ai_unavailable');
});

test('hybrid composer marks unavailable ai output with explicit fallback reason', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sop', '');
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'ai_unavailable');
  assert.match(result.markdown, /## Quick Dial/);
  assert.match(result.markdown, /## Service Pattern/);
});

test('validator does not treat sequence timestamp as brew ratio', () => {
  const plan = createPlan();
  const valid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic water and balance target anchor.',
    '## Sequence',
    '1. Bloom at 0:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 0:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Pulse 2 at 1:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and level gently.',
    '## Watch',
    '- Keep V60 flow stable for the balance target profile and Volvic water behavior.',
    '- Keep bean roast and mineral context fixed while drawdown settles.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', valid);
  assert.equal(result.valid, true);
  assert.ok(result.errors.every((item) => !/Ratio\s+\d+/i.test(item)));
});

test('validator rejects immersion-only workflow terms for non-immersion drippers', () => {
  const plan = createPlan({ methodFamily: 'v60' });
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and hold for 2 minutes immersion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and release valve slowly.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /must not include immersion\/release-only instructions/i.test(item)));
});


test('validator rejects unsupported hardware/tool instructions inside sequence steps', () => {
  const plan = createPlan({ methodFamily: 'v60' });
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and use AeroPress plunger pressure to push flow.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and level gently.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /unsupported hardware|release hardware cues/i.test(item)));
});
test('hybrid composer normalizes code-fenced AI output before validation', () => {
  const plan = createPlan();
  const wrapped = [
    'Here is your SOP.',
    '```markdown',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active; keep balance target and Volvic water behavior stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target while keeping Volvic mineral behavior stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast consistency and gentle leveling.',
    '## Watch',
    '- Keep V60 flow stable for the balance target profile.',
    '- Water remains Volvic-style mineral input and bean roast is light.',
    '```',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', wrapped);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /^## Service Pattern/m);
});

test('validator rejects sequence when context anchors are concentrated in one step only', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml and hold stream calm before leveling the bed.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml and swirl gently while waiting for drawdown.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /too concentrated/i.test(item)));
});

test('validator rejects sequence cadence drift even when per-step timestamp deltas still pass', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 01:00: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:10: pour 120 ml to 270 ml for Hario V60 balance profile with Volvic water and level gently.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /cadence gap/i.test(item)));
});

test('validator rejects sequence step labels that do not follow deterministic checkpoint labels', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Finish at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Bloom at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with Volvic water and level gently.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /must follow deterministic label|must reference deterministic step label/i.test(item)));
});

test('validator rejects sequence that references conflicting dripper method cues', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60 and Chemex profile.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with Volvic water and level gently.',
    '## Watch',
    '- Keep V60 flow stable for balance target while avoiding Chemex bypass.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /conflicting method\/device cues/i.test(item)));
});

test('hybrid composer classifies timeout-like model responses as ai_timeout fallback', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sequence', 'Request timed out after 30s. Please retry.');

  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'ai_timeout');
  assert.ok(result.validation.errors.some((item) => /timed out/i.test(item)));
});




test('validator rejects sop quick dial values that drift from deterministic envelope', () => {
  const plan = createPlan();
  const invalid = [
    '## Quick Dial',
    '- dose: 19 g',
    '- total water: 285 ml',
    '- temperature: 95 C',
    '- grind: 10 clicks',
    '- total time: 03:20',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Steps',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and level gently.',
    '## Control Points',
    '- Keep V60 flow stable for the balance target profile.',
    '- Keep cumulative water aligned to deterministic checkpoints.',
    '- If sour: tighten grind by 0.5 step while keeping water fixed.',
    '- If bitter: lower temperature by 1 C and keep timing stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sop', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /quick dial/i.test(item)));
});

test('hybrid composer does not treat structured narrative with operational try-again wording as ai_unavailable', () => {
  const plan = createPlan();
  const valid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active; keep balance target and Volvic water behavior stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target while keeping Volvic mineral behavior stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast consistency and gentle leveling.',
    '## Watch',
    '- Keep V60 flow stable for the balance target profile and maintain Volvic-style mineral behavior.',
    '- If bitterness appears, try again with 1 C lower temperature while preserving the same pour map.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', valid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
});

test('hybrid composer classifies generic timeout wording as ai_timeout fallback', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sequence', 'Upstream timeout while generating sequence. Please retry shortly.');

  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'ai_timeout');
  assert.ok(result.validation.errors.some((item) => /timed out/i.test(item)));
});

test('validator rejects iced sequence without explicit deterministic hot-ice split pairing', () => {
  const plan = createPlan({
    brewMode: 'iced',
    totalWaterMl: 270,
    hotWaterMl: 170,
    iceMl: 100,
    totalTimeSeconds: 160,
    steps: [
      {
        id: 'bloom',
        label: 'Bloom',
        startSeconds: 0,
        pourVolumeMl: 60,
        targetVolumeMl: 60,
        note: 'Wet all grounds quickly.',
      },
      {
        id: 'pulse_1',
        label: 'Pulse 1',
        startSeconds: 40,
        pourVolumeMl: 60,
        targetVolumeMl: 120,
        note: 'Center-out circles.',
      },
      {
        id: 'pulse_2',
        label: 'Pulse 2',
        startSeconds: 90,
        pourVolumeMl: 50,
        targetVolumeMl: 170,
        note: 'Finish gently and level bed.',
      },
    ],
  });

  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Iced mode active for balance target with Volvic water constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 60 ml to 120 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 50 ml to 170 ml for Hario V60 balance profile with Volvic water and level gently before adding 100 ml ice in the server.',
    '## Watch',
    '- Keep V60 flow stable for the balance target profile and preserve Volvic mineral behavior.',
    '- Keep bean roast and water constraints stable while drawdown settles.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /deterministic split/i.test(item)));
});


test('validator rejects sequence wait duration that exceeds deterministic cadence gap', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for 90 seconds before next pulse.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and level gently.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /wait\/hold duration .* exceeds deterministic cadence gap/i.test(item)));
});

test('validator rejects clever sequence missing immersion and release cues', () => {
  const plan = createPlan({
    methodFamily: 'clever_dripper',
    dripper: { id: 'clever', name: 'Clever Dripper' } as BrewPlan['dripper'],
  });

  const invalid = [
    '## Service Pattern',
    '- Immersion Release Control for Clever Dripper.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Clever Dripper balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Clever Dripper balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Clever Dripper balance profile with bean roast context and level gently.',
    '## Watch',
    '- Keep Clever Dripper flow stable for balance target with Volvic water.',
    '- Keep bean and mineral context stable during extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /immersion-contact cue and release cue/i.test(item)));
});

test('deterministic clever sequence uses hold and release checkpoints without zero-pour wording', () => {
  const plan = createPlan({
    methodFamily: 'clever_dripper',
    methodId: 'clever_dripper',
    ratioToolMethodId: 'clever_dripper',
    dripper: { id: 'clever', name: 'Clever Dripper' } as BrewPlan['dripper'],
    hotWaterMl: 250,
    totalWaterMl: 250,
    totalTimeSeconds: 165,
    steps: [
      {
        id: 'charge',
        label: 'Charge',
        kind: 'pour',
        startSeconds: 0,
        pourVolumeMl: 250,
        targetVolumeMl: 250,
        note: 'Start full immersion contact.',
      },
      {
        id: 'hold',
        label: 'Hold',
        kind: 'wait',
        startSeconds: 55,
        pourVolumeMl: 0,
        targetVolumeMl: 250,
        note: 'Keep immersion calm.',
      },
      {
        id: 'release',
        label: 'Release',
        kind: 'release',
        startSeconds: 115,
        pourVolumeMl: 0,
        targetVolumeMl: 250,
        note: 'Release to cup.',
      },
    ],
  });

  const narrative = buildDeterministicNarrative(plan, 'sequence');
  assert.doesNotMatch(narrative, /\bpour\s+0\b/i);
  assert.match(narrative, /Hold at 00:55: hold contact at target 250 ml/i);
  assert.match(narrative, /Release at 01:55: open release at target 250 ml/i);

  const result = validateAiNarrative(plan, 'sequence', narrative);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('validator rejects sequence that only changes numbers but keeps one template shell', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /too templated across steps/i.test(item)));
});

test('validator rejects mid-brew parameter shift instructions inside sequence steps', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and increase temperature to 95 C before next pulse.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /mid-brew parameter shift instruction/i.test(item)));
});

test('validator rejects final-step hold duration that exceeds deterministic remaining window', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with bean roast context and wait for 120 seconds before serving.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /wait\/hold duration .* exceeds deterministic cadence gap/i.test(item)));
});

test('validator rejects sequence when combined wait and hold durations exceed deterministic cadence gap', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for 25 seconds then hold for 25 seconds before next pulse.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /combined wait\/hold duration .* exceeds deterministic cadence gap/i.test(item)));
});

test('validator rejects sequence step with chained second pour checkpoint', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water, then pour 15 ml to 165 ml before leveling.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /multiple pour checkpoints/i.test(item)));
});
test('validator rejects sequence when step 1 uses closure-phase wording', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and finish drawdown quickly before pulse start.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target.',
    '- Keep Volvic mineral behavior and bean context stable.',
  ].join('\n');
  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /closure-phase wording/i.test(item)));
});



test('hybrid composer repairs invalid watch section while preserving valid AI sequence steps', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active; keep balance target and Volvic water behavior stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target while keeping Volvic mineral behavior stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast consistency and spiral-lock leveling before drawdown.',
    '## Watch',
    '- Keep V60 flow stable.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /spiral-lock leveling before drawdown/i);
  assert.match(result.markdown, /Keep final envelope locked/i);
  assert.ok(result.validation.warnings.some((item) => /repaired with deterministic Service Pattern \+ Watch/i.test(item)));
});

test('hybrid composer repairs SOP quick dial and control points while preserving valid AI steps', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Quick Dial',
    '- dose: 20 g',
    '- total water: 300 ml',
    '- temperature: 96 C',
    '- grind: 10 clicks',
    '- total time: 03:30',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active; keep balance target and Volvic water behavior stable.',
    '## Steps',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target while keeping Volvic mineral behavior stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast consistency and settle bed quietly.',
    '## Control Points',
    '- Keep V60 flow stable.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sop', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /## Quick Dial/);
  assert.match(result.markdown, /- dose: 17.5 g/i);
  assert.match(result.markdown, /settle bed quietly/i);
  assert.match(result.markdown, /If cup is sour:/i);
  assert.ok(result.validation.warnings.some((item) => /repaired with deterministic Quick Dial/i.test(item)));
});

test('validator rejects sequence step with ambiguous hedging wording', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm if required by flow feel.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target and Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /non-deterministic wording/i.test(item)));
});


test('validator rejects sequence step with simulated execution wording', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and simulate a cleaner extraction result before continuing.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target and Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /non-deterministic wording|manual-brew workflow/i.test(item)));
});
test('validator rejects chemex sequence when thick-filter cues are concentrated in only one step', () => {
  const plan = createPlan({
    methodFamily: 'chemex',
    dripper: { id: 'chemex-three-cup', name: 'Chemex' } as BrewPlan['dripper'],
  });

  const invalid = [
    '## Service Pattern',
    '- Balanced Thick-Filter Thermal Glide for Chemex.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Chemex balance profile with Volvic water while keeping filter wall flow steady and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Chemex balance profile with Volvic water and keep center pulse cadence stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Chemex balance profile with bean roast context and settle bed after drawdown.',
    '## Watch',
    '- Keep Chemex flow stable for balance target and Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /thick-filter cues are too concentrated/i.test(item)));
});

test('hybrid composer normalizes safe AI step lines to deterministic checkpoints before final validation', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and balance context.',
    '## Sequence',
    '1. Start pour for opening contact and hold stream calm before next pulse.',
    '2. Keep pouring with center cadence and maintain steady flow for sweetness.',
    '3. Close pour gently and settle bed for clean finish.',
    '## Watch',
    '- Keep flow stable.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /1\. Bloom at 00:00: pour 60 ml to 60 ml/i);
  assert.match(result.markdown, /2\. Pulse 1 at 00:40: pour 90 ml to 150 ml/i);
  assert.match(result.markdown, /3\. Pulse 2 at 01:30: pour 120 ml to 270 ml/i);
  assert.ok(result.validation.warnings.some((item) => /normalized to deterministic checkpoints/i.test(item)));
});

test('validator rejects body target sequence that lacks body-depth intent cues in operational lines', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const invalid = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and body context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep bright clarity high during entry.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and preserve crisp acidity through the middle cadence.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 body profile with bean roast context and keep the finish bright and clean.',
    '## Watch',
    '- Keep V60 flow stable for body target and Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /under-specified in operational steps/i.test(item)));
});

test('validator does not treat "body profile" label text as a valid body-intent operational cue', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const invalid = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and body context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 body profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for body target and Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /under-specified in operational steps/i.test(item)));
});


test('validator rejects body target sequence when opposing acidity cues are distributed across steps', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const invalid = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and body context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep body depth while preserving bright clarity.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and hold syrupy texture while pushing crisp acidity.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 body profile with bean roast context and close with heavier body plus bright finish.',
    '## Watch',
    '- Keep V60 flow stable for body target and Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /conflict with target profile intent/i.test(item)));
});

test('validator rejects body target sequence when a single step mixes body and acidity cues', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const invalid = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and body context.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep syrupy body while preserving bright clarity.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and hold deeper texture for mid extraction.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 body profile with bean roast context and finish with fuller mouthfeel.',
    '## Watch',
    '- Keep V60 flow stable for body target and Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /mixes opposing taste-direction cues in one line/i.test(item)));
});

test('hybrid composer repairs body-target free-form steps and injects deterministic body-intent cues', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const partiallyInvalid = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic and body context.',
    '## Sequence',
    '1. Start pour for Hario V60 body profile with Volvic water and wait for bed expansion.',
    '2. Continue pour for Hario V60 body profile with Volvic water and hold stream calm.',
    '3. Close pour for Hario V60 body profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep flow stable.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /Bloom at 00:00: pour 60 ml to 60 ml/i);
  assert.match(result.markdown, /body depth|syrupy body|texture and depth/i);
  assert.ok(result.validation.warnings.some((item) => /deterministic Service Pattern \+ Watch/i.test(item)));
});













test('deterministic sequence uses canonical checkpoint prefix format', () => {
  const plan = createPlan();
  const narrative = buildDeterministicNarrative(plan, 'sequence');
  const stepLines = narrative.split('\n').filter((line) => /^\d+\.\s+/.test(line));

  assert.equal(stepLines.length, plan.steps.length);
  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];
    const expected = new RegExp(
      '^' + (index + 1)
        + '\\.\\s+' + step.label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
        + '\\s+at\\s+' + String(Math.floor(step.startSeconds / 60)).padStart(2, '0') + ':' + String(step.startSeconds % 60).padStart(2, '0')
        + ':\\s+pour\\s+' + step.pourVolumeMl + '\\s*ml\\s+to\\s+' + step.targetVolumeMl + '\\s*ml\\b',
      'i',
    );
    assert.match(stepLines[index], expected);
  }
});


test('validator rejects next-cup troubleshooting instructions inside operational sequence steps', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and if sour on the next cup tighten grind by 0.5 step.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /next-cup troubleshooting guidance/i.test(item)));
});

test('validator rejects generic service pattern lines even when sequence steps are valid', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Default pattern for this brew.',
    '- Do the run as usual.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bloom expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream cadence stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed gently.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /Service Pattern style line|Service Pattern mode line/i.test(item)));
});

test('hybrid composer repairs generic service pattern with deterministic section while preserving valid AI steps', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Service Pattern',
    '- Default pattern for this brew.',
    '- Do the run as usual.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bloom expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream cadence stable.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and spiral-lock settling for clean drawdown.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /Balanced Cone Clarity Arc/i);
  assert.match(result.markdown, /spiral-lock settling for clean drawdown/i);
  assert.ok(result.validation.warnings.some((item) => /deterministic Service Pattern/i.test(item)));
});




test('validator rejects sequence watch section that lacks deterministic envelope checkpoint anchors', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60 balance profile.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and level gently.',
    '## Watch',
    '- Monitor Hario V60 flow against the balance target profile through each pulse.',
    '- Track drawdown behavior and keep extraction calm for this target.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /deterministic envelope checkpoint/i.test(item)));
});

test('validator rejects sop control points without actionable sour and bitter corrections', () => {
  const plan = createPlan();
  const invalid = [
    '## Quick Dial',
    '- dose: 17.5 g',
    '- total water: 270 ml',
    '- temperature: 90 C',
    '- grind: 8.5 clicks',
    '- total time: 02:45',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60 balance profile.',
    '- Hot mode active with Volvic constraints.',
    '## Steps',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and level gently.',
    '## Control Points',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep cumulative water aligned to deterministic checkpoints.',
    '- If cup is sour: keep cup quality stable and stay calm.',
    '- Keep bean roast and water behavior stable in service.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sop', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /sour and bitter corrective bullets|Sour corrective bullet/i.test(item)));
});


