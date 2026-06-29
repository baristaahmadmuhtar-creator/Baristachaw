import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  AI_BREW_METHOD_FAMILIES,
  AI_BREW_TARGET_PROFILE_IDS,
  METHOD_STYLE_CONTRACTS,
  getMethodStyle,
  getMethodStyleAuditConfig,
  listAllMethodStyleCases,
  resolveDefaultStyleForTarget,
  validatePlanAgainstMethodStyleContract,
} from '../../apps/web/src/features/ai-brew/methodStyleContracts.ts';
import {
  buildAiBrewPlan,
  buildPlanRecipeMetadata,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { buildProductionAiBrewCatalogForStress } from '../helpers/aiBrewStressMatrix.ts';

const ROOT = process.cwd();

test('AI Brew method-style contracts cover every method family and target rasa', () => {
  assert.equal(AI_BREW_METHOD_FAMILIES.length, 16, 'contract must cover the 16 production method families');
  assert.equal(AI_BREW_TARGET_PROFILE_IDS.length, 8, 'contract must cover all 8 target rasa profiles');

  for (const methodFamily of AI_BREW_METHOD_FAMILIES) {
    const contract = METHOD_STYLE_CONTRACTS[methodFamily];
    assert.equal(contract.methodFamily, methodFamily);
    assert.ok(contract.formField, `${methodFamily} must expose a UI/form field`);
    assert.ok(contract.styleSource, `${methodFamily} must expose a style source`);
    assert.ok(contract.labels.en && contract.labels.id, `${methodFamily} must expose EN and ID labels`);
    assert.ok(contract.styles.length >= 5, `${methodFamily} must expose enough style options`);
    assert.ok(contract.compatibleDripperIds.length >= 1, `${methodFamily} must list compatible dripper ids`);
    assert.ok(contract.requiredWorkflowPhases.length >= 5, `${methodFamily} must list workflow phases`);
    assert.ok(contract.forbiddenVocabulary.length >= 3, `${methodFamily} must list cross-method leakage guardrails`);
    assert.ok(contract.outputFields.includes('methodFamily'), `${methodFamily} must require methodFamily output`);
    assert.ok(contract.outputFields.includes('recipeStyle'), `${methodFamily} must require recipeStyle output`);
    if (methodFamily === 'espresso') {
      assert.equal(
        contract.outputFields.includes('espressoStyle'),
        false,
        'espresso style output must use BrewPlan.recipeStyle, not a nonexistent espressoStyle field',
      );
    }
    assert.match(contract.honestyBoundary, /physical cup validation/i, `${methodFamily} must keep sensory validation honest`);

    for (const targetProfileId of AI_BREW_TARGET_PROFILE_IDS) {
      const styleId = contract.defaultStyleByTarget[targetProfileId];
      assert.ok(styleId, `${methodFamily}:${targetProfileId} must resolve a default style`);
      assert.ok(
        getMethodStyle(methodFamily, styleId),
        `${methodFamily}:${targetProfileId} default style ${styleId} must exist in styles`,
      );
      assert.equal(
        resolveDefaultStyleForTarget(methodFamily, targetProfileId),
        styleId,
        `${methodFamily}:${targetProfileId} helper must match contract mapping`,
      );
    }
  }
});

test('AI Brew method-style audit config is generated from the typed contract', () => {
  const auditConfig = getMethodStyleAuditConfig();
  const cases = listAllMethodStyleCases();

  assert.ok(cases.length >= 99, 'audit must preserve the current broad method/style matrix');
  assert.equal(new Set(cases.map((item) => item.methodFamily)).size, 16, 'audit cases must include every method family');

  for (const methodFamily of AI_BREW_METHOD_FAMILIES) {
    const contract = METHOD_STYLE_CONTRACTS[methodFamily];
    const auditEntry = auditConfig[methodFamily];
    assert.equal(auditEntry.field, contract.formField, `${methodFamily} audit field must come from contract`);
    assert.equal(auditEntry.styleSource, contract.styleSource, `${methodFamily} audit style source must come from contract`);
    assert.deepEqual(
      auditEntry.styles,
      contract.styles.map((style) => [style.id, style.label]),
      `${methodFamily} audit styles must come from contract`,
    );
  }
});

test('AI Brew method-style contract validation catches missing workflow and unsupported styles', () => {
  const valid = validatePlanAgainstMethodStyleContract({
    methodFamily: 'aeropress',
    recipeStyle: 'bypass',
    targetProfileId: 'floral_transparent',
    workflowGuideSteps: [{ kind: 'press', label: 'Press', note: 'Stop before hiss' }],
    workflowValidation: { status: 'ready', readinessScore: 100 },
    guardrails: { errors: [], warnings: [] },
  });
  assert.equal(valid.passed, true);
  assert.equal(valid.styleId, 'bypass');

  const invalid = validatePlanAgainstMethodStyleContract({
    methodFamily: 'chemex',
    recipeStyle: 'press_plunger',
    targetProfileId: 'balance_clean',
    workflowGuideSteps: [],
  });
  assert.equal(invalid.passed, false);
  assert.match(invalid.errors.join('\n'), /Unsupported chemex style/);
  assert.match(invalid.errors.join('\n'), /Missing workflow guide steps/);
});

test('AI Brew device brew profiles expose explicit recipeStyle values backed by contracts', () => {
  const catalogPath = path.join(ROOT, 'apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json');
  const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const profiles = data.items || data.deviceProfiles || [];
  assert.ok(profiles.length >= 100, 'device brew profile catalog must be populated');

  for (const profile of profiles) {
    assert.ok(profile.recipeStyle, `${profile.id} must expose explicit recipeStyle`);
    assert.ok(
      getMethodStyle(profile.methodFamily, profile.recipeStyle),
      `${profile.id} recipeStyle ${profile.recipeStyle} must be supported by ${profile.methodFamily} contract`,
    );
  }
});

test('AI Brew plans expose method-style recipe metadata for every catalog dripper', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  for (const dripper of catalog.drippers) {
    const plan = buildAiBrewPlan({
      ...createDefaultAiBrewFormState(catalog),
      brewMode: 'hot',
      coffeeName: `${dripper.name} contract smoke`,
      dripperId: dripper.id,
      grinderId: '1zpresso-k-ultra',
      process: 'washed',
      variety: 'Geisha',
      roastLevel: 'medium',
      targetProfileId: 'balance_clean',
      waterMode: 'manual',
      waterTdsPpm: '95',
      waterHardnessPpm: '55',
      waterAlkalinityPpm: '40',
    }, catalog);
    const metadata = buildPlanRecipeMetadata(plan);
    assert.ok(plan.recipeStyle, `${dripper.id} plan must expose recipeStyle`);
    assert.ok(
      getMethodStyle(plan.methodFamily, plan.recipeStyle),
      `${dripper.id} plan style ${plan.recipeStyle} must be supported by ${plan.methodFamily} contract`,
    );
    assert.equal(metadata.methodFamily, plan.methodFamily);
    assert.equal(metadata.recipeStyle, plan.recipeStyle);
    assert.ok(metadata.recipeStyleLabel, `${dripper.id} metadata must expose recipeStyleLabel`);
  }
});
