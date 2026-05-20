import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicNarrative,
  composeHybridNarrative,
  validateAiNarrative,
} from '../../apps/web/src/features/ai-brew/aiComposer.ts';
import type { BrewPlan } from '../../apps/web/src/features/ai-brew/types.ts';

function createPlan(overrides: Partial<BrewPlan> = {}): BrewPlan {
  return {
    id: 'plan_hybrid',
    fingerprint: 'plan_hybrid',
    createdAt: Date.now(),
    catalogVersion: 'test-hybrid-v1',
    formState: {} as BrewPlan['formState'],
    brewMode: 'hot',
    methodFamily: 'v60',
    methodId: 'v60',
    ratioToolMethodId: 'v60',
    coffeeName: 'Hybrid QA',
    process: 'Natural',
    variety: 'Geisha',
    roastLevel: 'medium_light',
    beanProfile: {
      active: false,
      summary: 'No bean profile',
      notes: [],
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
    totalWaterMl: 272,
    hotWaterMl: 272,
    iceMl: 0,
    recommendedRatio: 15.1,
    doseG: 18,
    waterTempC: 93,
    totalTimeSeconds: 170,
    estimatedCupOutputMl: 230,
    estimatedBrewOutputMl: 230,
    estimatedBeverageOutputMl: 230,
    grindBias: 'same',
    grindRecommendation: '8.3 clicks',
    grindBandLabel: '8.0 - 9.0 clicks',
    summary: 'Hybrid QA summary',
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 60, targetVolumeMl: 60, note: 'Wet all grounds.' },
      { id: 'mid', label: 'Middle Pour', startSeconds: 45, pourVolumeMl: 90, targetVolumeMl: 150, note: 'Center-focused circles.' },
      { id: 'finish', label: 'Finish', startSeconds: 95, pourVolumeMl: 122, targetVolumeMl: 272, note: 'Finish gently and level the bed.' },
    ],
    notes: [],
    warnings: [],
    guardrails: { errors: [], warnings: [] },
    conformance: { warnings: [], standardsHits: [], standardsMisses: [] },
    deviceProfileId: 'profile_v60_hot',
    deviceProfileLabel: 'V60 Hot',
    deviceProfileMode: 'exact',
    grindSettingReference: '8.0 - 9.0 clicks',
    grindSettingMode: 'catalog_reference',
    grindSettingVerification: 'official',
    fallbackUsed: false,
    provenanceAttentionNeeded: false,
    confidenceNotes: [],
    ...overrides,
  } as BrewPlan;
}

test('deterministic narrative changes structure for target context, not only numbers', () => {
  const acidityPlan = createPlan({ targetProfileLabel: 'More Acidity' });
  const bodyPlan = createPlan({ targetProfileLabel: 'More Body' });

  const acidity = buildDeterministicNarrative(acidityPlan, 'sop');
  const body = buildDeterministicNarrative(bodyPlan, 'sop');

  assert.notEqual(acidity, body);
  assert.match(acidity, /Clarity/i);
  assert.match(body, /Depth/i);
});

test('deterministic narrative changes structure for method context', () => {
  const cone = buildDeterministicNarrative(createPlan({ methodFamily: 'v60' }), 'sop');
  const immersion = buildDeterministicNarrative(createPlan({ methodFamily: 'clever_dripper' }), 'sop');

  assert.notEqual(cone, immersion);
  assert.match(cone, /Cone Clarity Arc/i);
  assert.match(immersion, /Immersion Release Control/i);
});

test('deterministic narrative changes structure for water and bean context', () => {
  const softFragile = buildDeterministicNarrative(createPlan({
    waterMinerals: {
      tdsPpm: 75,
      hardnessPpm: 20,
      alkalinityPpm: 15,
      styleLabel: 'Soft low buffer water',
    },
    beanProfile: {
      active: true,
      summary: '1900 masl / low solubility',
      notes: [],
      solubility: 'low',
      roastDevelopment: 'underdeveloped',
    },
  }), 'sequence');
  const hardDense = buildDeterministicNarrative(createPlan({
    waterMinerals: {
      tdsPpm: 150,
      hardnessPpm: 95,
      alkalinityPpm: 80,
      styleLabel: 'Hard buffered water',
    },
    beanProfile: {
      active: true,
      summary: '1500 masl / high solubility',
      notes: [],
      solubility: 'high',
      roastDevelopment: 'developed',
    },
  }), 'sequence');

  assert.notEqual(softFragile, hardDense);
  assert.match(softFragile, /narrower stream width/i);
  assert.match(hardDense, /center-lock longer/i);
});

test('validator blocks generic non-operational language', () => {
  const plan = createPlan();
  const generic = [
    '## Service Pattern',
    '- Flexible style',
    '- Hot mode active',
    '## Sequence',
    '1. Bloom at 00:00 and adjust to taste.',
    '2. Middle Pour at 00:45 and do what feels right.',
    '3. Finish at 01:35 and optional step if needed.',
    '## Watch',
    '- Keep it flexible.',
    '- Change ratio as needed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', generic);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /placeholder|non-executable/i.test(item)));
});

test('validator rejects sequence without context anchors', () => {
  const plan = createPlan();
  const generic = [
    '## Service Pattern',
    '- Balanced pattern.',
    '- Keep timing stable.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml.',
    '3. Finish at 01:35: pour 122 ml to 272 ml.',
    '## Watch',
    '- Keep cumulative flow stable.',
    '- Keep cup quality stable.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', generic);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /context anchor/i.test(item)));
});

test('validator rejects hot workflow that includes ice dosing', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml and prepare bed.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml and add 20 ml ice.',
    '3. Finish at 01:35: pour 122 ml to 272 ml and level bed.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /must not add ice split/i.test(item)));
});

test('validator rejects sop with insufficient control points', () => {
  const plan = createPlan();
  const invalid = [
    '## Quick Dial',
    '- dose: 18 g',
    '- total water: 272 ml',
    '- temperature: 93 C',
    '- grind: 8.3 clicks',
    '- drawdown finish: 02:50',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Steps',
    '1. Bloom at 00:00: pour 60 ml to 60 ml and stabilize bed.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml with centered circles.',
    '3. Finish at 01:35: pour 122 ml to 272 ml and level quietly.',
    '## Control Points',
    '- Keep V60 flow stable for balance target and Volvic water.',
    '- If sour: tighten grind by 0.5 step.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sop', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /control points section must include at least four operational bullets/i.test(item)));
});



test('deterministic sequence keeps step-level variation on multi-step plans', () => {
  const fiveStepPlan = createPlan({
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 45, targetVolumeMl: 45, note: 'Wet all grounds.' },
      { id: 'pulse_1', label: 'Pulse 1', startSeconds: 35, pourVolumeMl: 55, targetVolumeMl: 100, note: 'Keep center line.' },
      { id: 'pulse_2', label: 'Pulse 2', startSeconds: 65, pourVolumeMl: 60, targetVolumeMl: 160, note: 'Open mid ring.' },
      { id: 'pulse_3', label: 'Pulse 3', startSeconds: 95, pourVolumeMl: 56, targetVolumeMl: 216, note: 'Tighten stream.' },
      { id: 'finish', label: 'Finish', startSeconds: 125, pourVolumeMl: 56, targetVolumeMl: 272, note: 'Settle bed.' },
    ],
  });

  const narrative = buildDeterministicNarrative(fiveStepPlan, 'sequence');
  const stepLines = narrative
    .split('\n')
    .filter((line) => /^\d+\.\s+/.test(line));

  assert.equal(stepLines.length, 5);
  assert.equal(new Set(stepLines).size, 5);
  assert.ok(stepLines.some((line) => /build full bloom saturation/i.test(line)));
  assert.ok(stepLines.some((line) => /close with calm turbulence/i.test(line)));
});


test('deterministic sequence carries phase-specific method directives across middle steps', () => {
  const sixStepPlan = createPlan({
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 40, targetVolumeMl: 40, note: 'Open wetting.' },
      { id: 'pulse_1', label: 'Pulse 1', startSeconds: 25, pourVolumeMl: 45, targetVolumeMl: 85, note: 'Center pulse.' },
      { id: 'pulse_2', label: 'Pulse 2', startSeconds: 50, pourVolumeMl: 45, targetVolumeMl: 130, note: 'Keep cadence.' },
      { id: 'pulse_3', label: 'Pulse 3', startSeconds: 75, pourVolumeMl: 45, targetVolumeMl: 175, note: 'Maintain flow.' },
      { id: 'pulse_4', label: 'Pulse 4', startSeconds: 100, pourVolumeMl: 45, targetVolumeMl: 220, note: 'Tighten stream.' },
      { id: 'finish', label: 'Finish', startSeconds: 130, pourVolumeMl: 52, targetVolumeMl: 272, note: 'Settle bed.' },
    ],
  });

  const narrative = buildDeterministicNarrative(sixStepPlan, 'sequence');
  const stepLines = narrative
    .split('\n')
    .filter((line) => /^\d+\.\s+/.test(line));

  assert.equal(stepLines.length, 6);
  assert.ok(stepLines[0].includes('build full bloom saturation'));
  assert.ok(stepLines[5].includes('close with calm turbulence'));
  const middleTails = stepLines.slice(1, -1).map((line) => line.split('then ')[1] || line);
  assert.ok(new Set(middleTails).size >= 3);
});
test('hybrid fallback preserves deterministic operational headings for SOP', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sop', 'invalid text');

  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.match(result.markdown, /## Quick Dial/);
  assert.match(result.markdown, /## Service Pattern/);
  assert.match(result.markdown, /## Steps/);
  assert.match(result.markdown, /## Control Points/);
});

test('hybrid composer falls back when non-immersion method receives immersion-only workflow', () => {
  const plan = createPlan({ methodFamily: 'v60', dripper: { id: 'v60', name: 'Hario V60' } as BrewPlan['dripper'] });
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and hold for 2 minutes immersion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and release valve slowly.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /must not include immersion\/release-only instructions/i.test(item)));
});



test('hybrid composer falls back when sequence references unsupported hardware cues', () => {
  const plan = createPlan({ methodFamily: 'v60', dripper: { id: 'v60', name: 'Hario V60' } as BrewPlan['dripper'] });
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and use AeroPress plunger pressure to push flow.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /unsupported hardware|release hardware cues/i.test(item)));
});
test('hybrid composer tags timeout-like sequence response as ai_timeout before deterministic fallback', () => {
  const plan = createPlan();
  const result = composeHybridNarrative(plan, 'sequence', 'The upstream model request timed out after 25 seconds.');

  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'ai_timeout');
  assert.match(result.markdown, /## Sequence/);
  assert.ok(result.validation.errors.some((item) => /timed out/i.test(item)));
});

test('hybrid composer repairs conflicting method cues in support sections while preserving valid steps', () => {
  const plan = createPlan({ methodFamily: 'v60', dripper: { id: 'v60', name: 'Hario V60' } as BrewPlan['dripper'] });
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60 and Chemex profile.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 and balance profile anchors active while avoiding Chemex bypass.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /Middle Pour at 00:45: pour 90 ml to 150 ml/i);
  assert.ok(result.validation.warnings.some((item) => /deterministic Service Pattern \+ Watch/i.test(item)));
});

test('validator rejects context anchors concentrated in a single operational step', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60 with Volvic water.',
    '- Hot mode active for balance target.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml and hold stream calm before leveling the bed.',
    '3. Finish at 01:35: pour 122 ml to 272 ml and swirl gently while waiting for drawdown.',
    '## Watch',
    '- Keep V60 flow stable for balance target with Volvic water.',
    '- Bean roast and water constraints remain fixed.',
  ].join('\n');

  const result = validateAiNarrative(plan, 'sequence', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((item) => /too concentrated/i.test(item)));
});



test('hybrid composer repairs sop quick dial drift with deterministic envelope while preserving valid steps', () => {
  const plan = createPlan();
  const invalid = [
    '## Quick Dial',
    '- dose: 20 g',
    '- total water: 300 ml',
    '- temperature: 95 C',
    '- grind: 10 clicks',
    '- drawdown finish: 03:20',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Steps',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Control Points',
    '- Keep V60 and balance profile anchors active.',
    '- Keep cumulative water aligned to deterministic checkpoints.',
    '- If sour: tighten grind by 0.5 step while keeping water fixed.',
    '- If bitter: lower temperature by 1 C and keep timing stable.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sop', invalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /- dose: 18 g/i);
  assert.match(result.markdown, /Middle Pour at 00:45: pour 90 ml to 150 ml/i);
  assert.ok(result.validation.warnings.some((item) => /deterministic Quick Dial/i.test(item)));
});

test('hybrid composer falls back when iced sequence omits explicit deterministic split pairing', () => {
  const plan = createPlan({
    brewMode: 'iced',
    totalWaterMl: 272,
    hotWaterMl: 172,
    iceMl: 100,
    totalTimeSeconds: 170,
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 60, targetVolumeMl: 60, note: 'Wet all grounds.' },
      { id: 'mid', label: 'Middle Pour', startSeconds: 45, pourVolumeMl: 62, targetVolumeMl: 122, note: 'Center-focused circles.' },
      { id: 'finish', label: 'Finish', startSeconds: 95, pourVolumeMl: 50, targetVolumeMl: 172, note: 'Finish gently and level the bed.' },
    ],
  });

  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Iced mode active with Volvic constraints and balance target.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 62 ml to 122 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 50 ml to 172 ml for Hario V60 balance profile with Volvic water and settle bed before adding 100 ml ice.',
    '## Watch',
    '- Keep V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /deterministic split/i.test(item)));
});



test('hybrid composer falls back when AI injects post-brew dilution top-up instruction', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and add 25 ml water as bypass top-up before serving.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /dilution\/top-up instruction|manual-brew workflow/i.test(item)));
});
test('hybrid composer falls back when wait duration exceeds deterministic cadence', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for 95 seconds before next step.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /wait\/hold duration .* exceeds deterministic cadence gap/i.test(item)));
});

test('hybrid composer falls back when sequence keeps one template shell across all phases', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /too templated across steps/i.test(item)));
});

test('hybrid composer falls back when sequence applies mid-brew parameter shift', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and coarsen grind by 2 clicks before next pulse.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /mid-brew parameter shift instruction/i.test(item)));
});

test('hybrid composer falls back when sequence step contains chained second pour checkpoint', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water, then pour 15 ml to 165 ml before leveling.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /multiple pour checkpoints/i.test(item)));
});
test('hybrid composer falls back when final step reintroduces entry-phase wording', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and restart bloom saturation before serving.',
    '## Watch',
    '- Keep V60 and balance profile anchors active.',
    '- Water chemistry and bean constraints remain fixed.',
  ].join('\n');
  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /entry-phase wording/i.test(item)));
});



test('hybrid composer preserves valid AI sequence steps while repairing weak watch section', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and spiral-lock settling.',
    '## Watch',
    '- Keep V60 flow stable.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /spiral-lock settling/i);
  assert.match(result.markdown, /Keep final envelope locked/i);
  assert.ok(result.validation.warnings.some((item) => /deterministic Service Pattern \+ Watch/i.test(item)));
});

test('hybrid composer falls back when AI sequence uses hedging language in operational steps', () => {
  const plan = createPlan();
  const hedged = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm if required by drawdown feel.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', hedged);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.match(result.markdown, /Keep final envelope locked/i);
  assert.ok(result.validation.errors.some((item) => /non-deterministic wording/i.test(item)));
});

test('hybrid composer falls back when Chemex AI sequence concentrates thick-filter cues in one step', () => {
  const plan = createPlan({
    methodFamily: 'chemex',
    dripper: { id: 'chemex-three-cup', name: 'Chemex' } as BrewPlan['dripper'],
  });
  const concentrated = [
    '## Service Pattern',
    '- Balanced Thick-Filter Thermal Glide for Chemex.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Chemex balance profile with Volvic water and keep filter wall flow steady while waiting for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Chemex balance profile with Volvic water and hold center pulse cadence.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Chemex balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep Chemex flow stable for balance target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', concentrated);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.match(result.markdown, /Keep final envelope locked/i);
  assert.ok(result.validation.errors.some((item) => /thick-filter cues are too concentrated/i.test(item)));
});

test('hybrid sequence repairs safe free-form steps into deterministic checkpoints instead of full fallback', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Start pour and wait for bloom expansion while keeping flow calm.',
    '2. Continue pour with centered cadence and hold stream steady for target profile.',
    '3. Finish pour calmly and settle bed for clean drawdown.',
    '## Watch',
    '- Keep V60 flow stable.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /Bloom at 00:00: pour 60 ml to 60 ml/i);
  assert.match(result.markdown, /Middle Pour at 00:45: pour 90 ml to 150 ml/i);
  assert.match(result.markdown, /Finish at 01:35: pour 122 ml to 272 ml/i);
  assert.ok(result.validation.warnings.some((item) => /normalized to deterministic checkpoints/i.test(item)));
});

test('hybrid sequence repairs non-canonical deterministic prefix formatting without full fallback', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom: pour 60 ml to 60 ml at 00:00 for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour: pour 90 ml to 150 ml at 00:45 for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Finish: pour 122 ml to 272 ml at 01:35 for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /1\. Bloom at 00:00: pour 60 ml to 60 ml/i);
  assert.match(result.markdown, /2\. Middle Pour at 00:45: pour 90 ml to 150 ml/i);
  assert.match(result.markdown, /3\. Finish at 01:35: pour 122 ml to 272 ml/i);
  assert.ok(result.validation.warnings.some((item) => /normalized to deterministic checkpoints/i.test(item)));
});
test('hybrid sequence repairs shifted timestamps back to deterministic checkpoints without full fallback', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:08: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:53: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
    '3. Finish at 01:43: pour 122 ml to 272 ml for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep V60 flow stable for balance target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /1\. Bloom at 00:00: pour 60 ml to 60 ml/i);
  assert.match(result.markdown, /2\. Middle Pour at 00:45: pour 90 ml to 150 ml/i);
  assert.match(result.markdown, /3\. Finish at 01:35: pour 122 ml to 272 ml/i);
  assert.ok(result.validation.warnings.some((item) => /normalized to deterministic checkpoints/i.test(item)));
});

test('hybrid composer falls back when a step injects extra absolute clock timestamp in tail', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion until 00:25.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm until 01:20.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance profile with bean roast context and settle bed by 02:20.',
    '## Watch',
    '- Keep V60 flow stable for balance target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /extra absolute clock time/i.test(item)));
  assert.match(result.markdown, /Keep final envelope locked/i);
});
test('hybrid composer falls back when body target sequence drifts to acidity-dominant cues', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const conflicting = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep bright clarity high during entry.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and preserve crisp acidity through the middle cadence.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 body profile with bean roast context and close with bright finish clarity.',
    '## Watch',
    '- Keep V60 flow stable for body target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', conflicting);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.match(result.markdown, /Keep final envelope locked/i);
  assert.ok(result.validation.errors.some((item) => /under-specified in operational steps/i.test(item)));
});




test('hybrid composer falls back when body target mixes opposing acidity cues across operational steps', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const conflicting = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep body depth while preserving bright clarity.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and hold syrupy texture while pushing crisp acidity.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 body profile with bean roast context and close with heavier body plus bright finish.',
    '## Watch',
    '- Keep V60 flow stable for body target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', conflicting);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /conflict with target profile intent/i.test(item)));
});

test('hybrid composer falls back when one body-target step mixes opposing acidity cue', () => {
  const plan = createPlan({ targetProfileLabel: 'More Body' });
  const conflicting = [
    '## Service Pattern',
    '- Depth Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep syrupy body while preserving bright clarity.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and hold deeper texture through the middle cadence.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 body profile with bean roast context and close with fuller mouthfeel.',
    '## Watch',
    '- Keep V60 flow stable for body target with Volvic water.',
    '- Keep bean and water constraints stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', conflicting);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /mixes opposing taste-direction cues in one line/i.test(item)));
});

















test('hybrid composer falls back when sequence conflicts with easy extraction pressure profile', () => {
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
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and extend contact time before the next pulse.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and keep cadence stable.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /extraction pressure profile/i.test(item)));
});

test('hybrid composer falls back when hold distribution conflicts with deterministic cadence profile', () => {
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
      tdsPpm: 122,
      hardnessPpm: 132,
      alkalinityPpm: 86,
      styleLabel: 'Hard buffered water',
    },
  });

  const invalid = [
    '## Service Pattern',
    '- Bright Cone Clarity Arc for Hario V60 and acidity target.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 acidity target with hard water context and wait for 55 seconds before next pulse.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 acidity target with bean roast context and hold for 5 seconds to keep flow calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 acidity target with Volvic water context and wait for 5 seconds before serving.',
    '## Watch',
    '- Keep Hario V60 flow stable for acidity target with hard water context.',
    '- Keep ratio 1:15.1 and drawdown finish 02:50 aligned with deterministic envelope.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /cadence profile/i.test(item)));
});

test('deterministic sop steps use canonical checkpoint prefix format', () => {
  const plan = createPlan();
  const narrative = buildDeterministicNarrative(plan, 'sop');
  const inSteps = narrative
    .split('\n')
    .filter((line) => /^\d+\.\s+/.test(line));

  assert.equal(inSteps.length, plan.steps.length);
  assert.match(inSteps[0], /^1\.\s+Bloom\s+at\s+00:00:\s+pour\s+60\s*ml\s+to\s+60\s*ml\b/i);
  assert.match(inSteps[inSteps.length - 1], /^3\.\s+Finish\s+at\s+01:35:\s+pour\s+122\s*ml\s+to\s+272\s*ml\b/i);
});


test('hybrid composer falls back when sequence steps include next-cup troubleshooting guidance', () => {
  const plan = createPlan();
  const invalid = [
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and if bitter on the next cup lower temperature by 1 C.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance profile with bean roast context and settle bed.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', invalid);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, 'invalid_narrative');
  assert.ok(result.validation.errors.some((item) => /next-cup troubleshooting guidance/i.test(item)));
});

test('deterministic sequence reflects checkpoint timeline shifts, not just ratio or temperature math', () => {
  const faster = buildDeterministicNarrative(createPlan({
    totalTimeSeconds: 150,
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 60, targetVolumeMl: 60, note: 'Wet all grounds.' },
      { id: 'mid', label: 'Middle Pour', startSeconds: 35, pourVolumeMl: 90, targetVolumeMl: 150, note: 'Center-focused circles.' },
      { id: 'finish', label: 'Finish', startSeconds: 82, pourVolumeMl: 122, targetVolumeMl: 272, note: 'Finish gently and level the bed.' },
    ],
  }), 'sequence');

  const slower = buildDeterministicNarrative(createPlan({
    totalTimeSeconds: 195,
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 60, targetVolumeMl: 60, note: 'Wet all grounds.' },
      { id: 'mid', label: 'Middle Pour', startSeconds: 55, pourVolumeMl: 90, targetVolumeMl: 150, note: 'Center-focused circles.' },
      { id: 'finish', label: 'Finish', startSeconds: 118, pourVolumeMl: 122, targetVolumeMl: 272, note: 'Finish gently and level the bed.' },
    ],
  }), 'sequence');

  assert.match(faster, /2\. Middle Pour at 00:35:/i);
  assert.match(slower, /2\. Middle Pour at 00:55:/i);
  assert.match(faster, /3\. Finish at 01:22:/i);
  assert.match(slower, /3\. Finish at 01:58:/i);
  assert.notEqual(faster, slower);
});

test('deterministic sequence reflects checkpoint pour-map shifts for resistant vs easy extraction contexts', () => {
  const resistant = buildDeterministicNarrative(createPlan({
    beanProfile: {
      active: true,
      summary: 'Underdeveloped / low solubility',
      notes: [],
      roastDevelopment: 'underdeveloped',
      solubility: 'low',
    },
    waterMinerals: {
      tdsPpm: 150,
      hardnessPpm: 130,
      alkalinityPpm: 90,
      styleLabel: 'Hard high-buffer water',
    },
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 52, targetVolumeMl: 52, note: 'Wet all grounds.' },
      { id: 'mid', label: 'Middle Pour', startSeconds: 45, pourVolumeMl: 88, targetVolumeMl: 140, note: 'Center-focused circles.' },
      { id: 'finish', label: 'Finish', startSeconds: 95, pourVolumeMl: 132, targetVolumeMl: 272, note: 'Finish gently and level the bed.' },
    ],
  }), 'sequence');

  const easy = buildDeterministicNarrative(createPlan({
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
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 70, targetVolumeMl: 70, note: 'Wet all grounds.' },
      { id: 'mid', label: 'Middle Pour', startSeconds: 45, pourVolumeMl: 94, targetVolumeMl: 164, note: 'Center-focused circles.' },
      { id: 'finish', label: 'Finish', startSeconds: 95, pourVolumeMl: 108, targetVolumeMl: 272, note: 'Finish gently and level the bed.' },
    ],
  }), 'sequence');

  assert.match(resistant, /1\. Bloom at 00:00: pour 52 ml to 52 ml/i);
  assert.match(resistant, /3\. Finish at 01:35: pour 132 ml to 272 ml/i);
  assert.match(easy, /1\. Bloom at 00:00: pour 70 ml to 70 ml/i);
  assert.match(easy, /3\. Finish at 01:35: pour 108 ml to 272 ml/i);
  assert.notEqual(resistant, easy);
});


test('hybrid sequence repairs generic service pattern line and keeps AI operational steps', () => {
  const plan = createPlan();
  const partiallyInvalid = [
    '## Service Pattern',
    '- Default pattern for this brew.',
    '- Do the run as usual.',
    '## Sequence',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bloom expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream cadence stable.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and spiral-lock settling.',
    '## Watch',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep bean roast and mineral context stable through extraction.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sequence', partiallyInvalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /Balanced Cone Clarity Arc/i);
  assert.match(result.markdown, /spiral-lock settling/i);
  assert.ok(result.validation.warnings.some((item) => /deterministic Service Pattern/i.test(item)));
});



test('hybrid sop repairs missing bitter corrective control point with deterministic section while preserving valid steps', () => {
  const plan = createPlan();
  const invalid = [
    '## Quick Dial',
    '- dose: 18 g',
    '- total water: 272 ml',
    '- temperature: 93 C',
    '- grind: 8.3 clicks',
    '- drawdown finish: 02:50',
    '## Service Pattern',
    '- Balanced Cone Clarity Arc for Hario V60.',
    '- Hot mode active with Volvic constraints.',
    '## Steps',
    '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
    '2. Middle Pour at 00:45: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
    '3. Finish at 01:35: pour 122 ml to 272 ml for Hario V60 balance target with bean roast context and settle bed.',
    '## Control Points',
    '- Keep Hario V60 flow stable for balance target with Volvic water.',
    '- Keep cumulative water aligned to deterministic checkpoints.',
    '- If cup is sour: tighten grind by 0.5 step and keep total water fixed.',
    '- Keep bean roast and water behavior stable in service.',
  ].join('\n');

  const result = composeHybridNarrative(plan, 'sop', invalid);
  assert.equal(result.usedFallback, false);
  assert.equal(result.validation.valid, true);
  assert.match(result.markdown, /Middle Pour at 00:45: pour 90 ml to 150 ml/i);
  assert.match(result.markdown, /If cup is bitter:/i);
  assert.ok(result.validation.warnings.some((item) => /deterministic Control Points/i.test(item)));
});



