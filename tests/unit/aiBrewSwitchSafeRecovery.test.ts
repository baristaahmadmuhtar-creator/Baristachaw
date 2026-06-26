import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { validateBrewPlanOutput } from '../../apps/web/src/features/ai-brew/antiHallucination.ts';
import { buildProductionAiBrewCatalogForStress } from '../helpers/aiBrewStressMatrix.ts';

const SWITCH_TARGET_PROFILE_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'fruit_forward',
  'floral_transparent',
  'more_body',
  'soft_round',
  'dense_comforting',
] as const;

const SWITCH_EXACT_DEVICES = [
  { dripperId: 'hario-switch-02', label: /Switch 02/i, maxClosedMl: 220 },
  { dripperId: 'hario-switch-03', label: /Switch 03/i, maxClosedMl: 320 },
  { dripperId: 'mugen-x-switch', label: /MUGEN x SWITCH/i, maxClosedMl: 200 },
] as const;

test('Hario Switch manual over-capacity preset is adapted to a safe final recipe without user-facing blocked copy', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Gayo wet hulled Switch recovery',
    doseG: '20',
    process: 'wet_hulled',
    roastLevel: 'medium',
    dripperId: 'hario-switch-02',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_body',
    targetWaterMl: '300',
    switchPresetId: 'immersion_heavy_body',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  const programme = plan.switchTasteProgramme;
  assert.ok(programme, 'Switch plan should carry taste programme metadata');
  assert.equal(programme.originalPresetId, 'immersion_heavy_body');
  assert.equal(programme.originalPresetStatus, 'blocked');
  assert.equal(programme.recoveryApplied, true);
  assert.notEqual(programme.finalPresetId, 'immersion_heavy_body');
  assert.notEqual(programme.finalPresetStatus, 'blocked');
  assert.equal(plan.switchPresetId, programme.finalPresetId);
  assert.notEqual(plan.switchCompatibility?.status, 'blocked');
  assert.notEqual(plan.switchStepValidation?.status, 'blocked');
  assert.notEqual(plan.workflowValidation?.status, 'blocked');
  assert.ok(
    (programme.peakClosedLoadMl || 0) <= (programme.safeClosedPhaseMaxMl || 0),
    'final closed chamber load must be within the safe Switch 02 limit',
  );
  assert.match(programme.recoveryReason || '', /adapted|disesuaikan|safe hybrid/i);

  const userFacingText = [
    plan.summary,
    plan.switchWhy,
    plan.switchWatch,
    ...(plan.notes || []),
    ...(plan.warnings || []),
    ...(plan.workflowValidation?.blockingErrors || []),
    ...(plan.workflowGuideSteps || []).flatMap((step) => [
      step.primaryText,
      step.secondaryText,
      ...step.techniqueChips.map((chip) => chip.value),
    ]),
    ...plan.steps.flatMap((step) => [
      step.label,
      step.note,
      step.hybridInstruction || '',
    ]),
  ].filter(Boolean).join(' ');

  assert.doesNotMatch(userFacingText, /\bblocked\b|diblokir|memblokir/i);
  assert.equal(validateBrewPlanOutput(plan).allowed, true);
});

test('Hario Switch 02, Switch 03, and MUGEN x SWITCH keep exact-device recipe style and safe guide copy', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  for (const device of SWITCH_EXACT_DEVICES) {
    for (const targetProfileId of SWITCH_TARGET_PROFILE_IDS) {
      const plan = buildAiBrewPlan({
        ...createDefaultAiBrewFormState(catalog),
        brewMode: targetProfileId === 'fruit_forward' ? 'iced' : 'hot',
        coffeeName: `${device.dripperId} ${targetProfileId}`,
        doseG: device.dripperId === 'hario-switch-03' ? '20' : '15',
        process: 'washed',
        roastLevel: 'medium',
        dripperId: device.dripperId,
        grinderId: '1zpresso-k-ultra',
        targetProfileId,
        switchPresetId: '',
        waterMode: 'manual',
        waterTdsPpm: '95',
        waterHardnessPpm: '55',
        waterAlkalinityPpm: '40',
      }, catalog);

      assert.equal(plan.methodFamily, 'hario_switch');
      assert.equal(plan.dripper.id, device.dripperId);
      assert.ok(plan.recipeStyle, `${device.dripperId}/${targetProfileId} must expose recipeStyle`);
      assert.ok(plan.switchTasteProgramme, `${device.dripperId}/${targetProfileId} must expose taste programme`);
      assert.notEqual(plan.workflowValidation?.status, 'blocked', `${device.dripperId}/${targetProfileId} guide must not be blocked`);
      assert.notEqual(plan.switchStepValidation?.status, 'blocked', `${device.dripperId}/${targetProfileId} switch step validation must not be blocked`);
      assert.ok(
        (plan.switchTasteProgramme?.peakClosedLoadMl || 0) <= device.maxClosedMl,
        `${device.dripperId}/${targetProfileId} peak closed load must stay within exact-device limit`,
      );

      const guideText = (plan.workflowGuideSteps || []).flatMap((step) => [
        step.primaryText,
        step.secondaryText,
        ...step.techniqueChips.map((chip) => chip.value),
      ]).filter(Boolean).join(' ');
      assert.match(guideText, device.label, `${device.dripperId}/${targetProfileId} guide must name exact device`);
      assert.doesNotMatch(guideText, /generic clever only|single charge only/i);
      assert.equal(validateBrewPlanOutput(plan).allowed, true);
    }
  }
});
