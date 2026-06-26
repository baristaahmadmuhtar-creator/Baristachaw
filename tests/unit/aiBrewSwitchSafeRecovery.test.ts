import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { validateBrewPlanOutput } from '../../apps/web/src/features/ai-brew/antiHallucination.ts';
import { buildProductionAiBrewCatalogForStress } from '../helpers/aiBrewStressMatrix.ts';

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
