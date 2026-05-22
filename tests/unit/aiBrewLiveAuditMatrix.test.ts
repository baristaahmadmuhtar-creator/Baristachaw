import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiBrewPlan,
  buildWorkflowAwareGuideSteps,
  buildPlanRecipeMetadata,
  createDefaultAiBrewFormState,
  supportsAiBrewIcedMode,
  validateMethodWorkflowGuide,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { validateBrewPlanOutput } from '../../apps/web/src/features/ai-brew/antiHallucination.ts';
import { buildProductionAiBrewCatalogForStress } from '../helpers/aiBrewStressMatrix.ts';
import {
  buildLiveAuditRecipeMatrix,
  buildLiveAuditUnsupportedIcedChecks,
  LIVE_AUDIT_BEANS,
  LIVE_AUDIT_EQUIPMENT_CASES,
  LIVE_AUDIT_TARGET_PROFILE_IDS,
} from '../helpers/aiBrewLiveAuditMatrix.ts';

test('AI Brew live 100-bean audit matrix covers real beans, targets, equipment, and stable save metadata', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  const base = createDefaultAiBrewFormState(catalog);
  const matrix = buildLiveAuditRecipeMatrix(180);

  assert.ok(LIVE_AUDIT_BEANS.length >= 100, `expected at least 100 live audit beans, got ${LIVE_AUDIT_BEANS.length}`);
  assert.equal(new Set(matrix.slice(0, 100).map((entry) => `${entry.bean.roastery} ${entry.bean.coffeeName}`)).size, 100);
  assert.deepEqual(new Set(matrix.map((entry) => entry.targetProfileId)), new Set(LIVE_AUDIT_TARGET_PROFILE_IDS));

  const equipmentKeys = new Set(matrix.map((entry) => `${entry.equipment.id}:${entry.equipment.aeropressStyle || 'default'}`));
  for (const equipment of LIVE_AUDIT_EQUIPMENT_CASES) {
    assert.ok(equipmentKeys.has(`${equipment.id}:${equipment.aeropressStyle || 'default'}`), `missing equipment coverage for ${equipment.name}`);
  }

  const icedKeys = new Set(matrix.filter((entry) => entry.brewMode === 'iced').map((entry) => `${entry.equipment.id}:${entry.equipment.aeropressStyle || 'default'}`));
  for (const equipment of LIVE_AUDIT_EQUIPMENT_CASES.filter((entry) => entry.supportsIced)) {
    assert.ok(icedKeys.has(`${equipment.id}:${equipment.aeropressStyle || 'default'}`), `missing iced coverage for ${equipment.name}`);
  }

  const unsupportedIcedChecks = buildLiveAuditUnsupportedIcedChecks();
  assert.ok(unsupportedIcedChecks.some((entry) => entry.id === 'aeropress'), 'AeroPress iced lock must be checked explicitly');
  assert.ok(unsupportedIcedChecks.some((entry) => entry.id === 'espresso-machine'), 'espresso iced lock must be checked explicitly');

  let hotPlans = 0;
  let icedPlans = 0;
  let v60TargetHits = 0;
  let switchTargetHits = 0;
  let aeropressTargetHits = 0;

  for (const recipe of matrix) {
    const plan = buildAiBrewPlan({
      ...base,
      coffeeName: recipe.title,
      dripperId: recipe.equipment.id,
      brewMode: recipe.brewMode,
      targetProfileId: recipe.targetProfileId,
      doseG: '15',
      waterMode: 'manual',
      waterTdsPpm: '90',
      waterHardnessPpm: '55',
      waterAlkalinityPpm: '35',
      waterCustomized: true,
      process: recipe.bean.processId,
      customProcess: recipe.bean.process,
      variety: recipe.bean.varietyId,
      customVariety: recipe.bean.variety,
      roastLevel: recipe.bean.roastLevel,
      altitudeMasl: recipe.bean.altitudeMasl || '',
      beanDensityGml: recipe.bean.beanDensityGml || '',
      roastDevelopment: recipe.bean.roastDevelopment || '',
      solubility: recipe.bean.solubility || '',
      aeropressStyle: recipe.equipment.aeropressStyle || 'auto',
    }, catalog);
    const outputValidation = validateBrewPlanOutput(plan);
    const guideValidation = validateMethodWorkflowGuide(plan, buildWorkflowAwareGuideSteps(plan));
    const metadata = buildPlanRecipeMetadata(plan);

    assert.equal(outputValidation.allowed, true, `${recipe.title}: anti-hallucination guard failed ${(outputValidation.reasons || []).join('; ')}`);
    assert.equal(guideValidation.passed, true, `${recipe.title}: workflow guide failed ${(guideValidation.blockingErrors || []).join('; ')}`);
    assert.ok(plan.extractionRationale.ratio && plan.extractionRationale.temperature && plan.extractionRationale.time, `${recipe.title}: missing rationale`);
    assert.ok(plan.extractionRationale.beanPrecision.signals.length >= 4, `${recipe.title}: missing bean precision signals`);
    assert.equal(metadata.process, plan.process, `${recipe.title}: process metadata mismatch`);
    assert.equal(metadata.variety, plan.variety, `${recipe.title}: variety metadata mismatch`);
    assert.equal(metadata.roastLevel, plan.roastLevel, `${recipe.title}: roast metadata mismatch`);
    assert.ok(metadata.extractionRationale?.warnings?.length, `${recipe.title}: rationale warnings not saved`);
    assert.ok(metadata.steps.every((step) => step.flowRateMlPerSec && step.pourPath && step.pourHeight && step.agitationLevel), `${recipe.title}: step technique metadata incomplete`);

    if (recipe.brewMode === 'iced') {
      icedPlans += 1;
      assert.equal(supportsAiBrewIcedMode(catalog, recipe.equipment.id), true, `${recipe.title}: unsupported iced recipe entered save matrix`);
      assert.ok(plan.iceMl > 0, `${recipe.title}: iced recipe must include measured ice`);
      assert.ok(plan.hotWaterSharePercent >= 50 && plan.hotWaterSharePercent <= 78, `${recipe.title}: hot water share out of range`);
      assert.ok(plan.extractionRationale.iceSplit, `${recipe.title}: iced rationale missing split`);
    } else {
      hotPlans += 1;
    }

    if (recipe.equipment.id === 'hario-v60') v60TargetHits += 1;
    if (recipe.equipment.id === 'hario-switch-03') switchTargetHits += 1;
    if (recipe.equipment.id === 'aeropress') aeropressTargetHits += 1;
  }

  assert.ok(hotPlans >= 100, `expected broad hot coverage, got ${hotPlans}`);
  assert.ok(icedPlans >= 50, `expected broad iced coverage, got ${icedPlans}`);
  assert.ok(v60TargetHits >= LIVE_AUDIT_TARGET_PROFILE_IDS.length * 2, 'V60 must cover all targets in hot and iced');
  assert.ok(switchTargetHits >= LIVE_AUDIT_TARGET_PROFILE_IDS.length * 2, 'Hario Switch must cover all targets in hot and iced');
  assert.ok(aeropressTargetHits >= LIVE_AUDIT_TARGET_PROFILE_IDS.length, 'AeroPress must cover all targets in supported hot mode');
});
