import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildAiBrewPlan,
  buildWorkflowAwareGuideSteps,
  createDefaultAiBrewFormState,
  supportsAiBrewIcedMode,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import {
  AI_BREW_WORKFLOW_TUTORIAL_METHODS,
  resolveWorkflowTutorialDetail,
} from '../../apps/web/src/features/ai-brew/workflowTutorials.ts';
import type {
  AiBrewMethodFamily,
  WorkflowGuideActionType,
} from '../../apps/web/src/features/ai-brew/types.ts';
import { buildProductionAiBrewCatalogForStress } from '../helpers/aiBrewStressMatrix.ts';

const REQUIRED_METHODS: AiBrewMethodFamily[] = [
  'v60',
  'chemex',
  'kalita_wave',
  'origami',
  'april',
  'melitta',
  'kono',
  'hario_switch',
  'clever_dripper',
  'aeropress',
  'french_press',
  'espresso',
  'moka_pot',
  'siphon',
  'cold_brew',
  'batch_brew',
];

const METHOD_ACTIONS: Record<AiBrewMethodFamily, WorkflowGuideActionType[]> = {
  v60: ['setup', 'bloom', 'pour', 'drawdown', 'serve'],
  chemex: ['setup', 'bloom', 'pour', 'drawdown', 'serve'],
  kalita_wave: ['setup', 'bloom', 'pour', 'drawdown', 'serve'],
  origami: ['setup', 'bloom', 'pour', 'drawdown', 'serve'],
  april: ['setup', 'bloom', 'pour', 'drawdown', 'serve'],
  melitta: ['setup', 'bloom', 'pour', 'drawdown', 'serve'],
  kono: ['setup', 'bloom', 'pour', 'drawdown', 'serve'],
  hario_switch: ['setup', 'charge', 'steep', 'release', 'drawdown', 'serve'],
  clever_dripper: ['setup', 'charge', 'steep', 'release', 'serve'],
  aeropress: ['setup', 'charge', 'steep', 'press', 'serve'],
  french_press: ['setup', 'charge', 'steep', 'settle', 'press', 'decant', 'serve'],
  espresso: ['setup', 'puck_prep', 'extract', 'stop', 'serve'],
  moka_pot: ['setup', 'heat', 'monitor_flow', 'stop', 'serve'],
  siphon: ['setup', 'heat', 'charge', 'stir', 'drawdown', 'serve'],
  cold_brew: ['setup', 'charge', 'steep', 'filter', 'dilute', 'serve'],
  batch_brew: ['setup', 'dose', 'monitor_flow', 'mix', 'serve'],
};

const ENGLISH_LEAKS = /\b(tuang|seduh|sajikan|katup|ruang|bubuk|air panas|jangan|aduk|tetesan|bilas)\b/i;
const CRITICAL_INDONESIAN_LEAKS = /\b(rinse|preheat|kettle|serve|drawdown|pour path|press slowly|release|dose evenly)\b/i;
const CORRECTION_LOOP = /kalau asam|kalau pahit|jika asam|jika pahit|if sour|if bitter|correction|koreksi rasa|next cup|dial-in/i;

test('workflow tutorial database covers every AI Brew method family', () => {
  assert.deepEqual([...AI_BREW_WORKFLOW_TUTORIAL_METHODS].sort(), [...REQUIRED_METHODS].sort());
});

test('workflow tutorials return concise bilingual detail for setup, main, and finish actions', () => {
  for (const methodFamily of REQUIRED_METHODS) {
    for (const actionType of METHOD_ACTIONS[methodFamily]) {
      const en = resolveWorkflowTutorialDetail({ methodFamily, actionType, brewMode: 'hot', language: 'en' });
      const id = resolveWorkflowTutorialDetail({ methodFamily, actionType, brewMode: 'iced', language: 'id' });

      assert.equal(typeof en, 'string', `${methodFamily}/${actionType} EN must resolve`);
      assert.equal(typeof id, 'string', `${methodFamily}/${actionType} ID must resolve`);
      assert.ok(en.length > 20, `${methodFamily}/${actionType} EN should be useful`);
      assert.ok(id.length > 20, `${methodFamily}/${actionType} ID should be useful`);
      assert.ok(en.length <= 220, `${methodFamily}/${actionType} EN should stay compact: ${en}`);
      assert.ok(id.length <= 240, `${methodFamily}/${actionType} ID should stay compact: ${id}`);
      assert.doesNotMatch(en, ENGLISH_LEAKS, `${methodFamily}/${actionType} EN leaks Indonesian: ${en}`);
      assert.doesNotMatch(id, CRITICAL_INDONESIAN_LEAKS, `${methodFamily}/${actionType} ID leaks raw English: ${id}`);
      assert.doesNotMatch(`${en} ${id}`, CORRECTION_LOOP, `${methodFamily}/${actionType} must not be a taste-correction loop`);
    }
  }
});

test('workflow tutorials keep method-language safety strict', () => {
  const espresso = METHOD_ACTIONS.espresso
    .map((actionType) => resolveWorkflowTutorialDetail({ methodFamily: 'espresso', actionType, brewMode: 'hot', language: 'en' }))
    .join(' ');
  assert.doesNotMatch(espresso, /\b(bloom|pour|spiral|drawdown|bed|filter wall|slurry|bypass|server|valve|immersion release)\b/i);

  const moka = METHOD_ACTIONS.moka_pot
    .map((actionType) => resolveWorkflowTutorialDetail({ methodFamily: 'moka_pot', actionType, brewMode: 'hot', language: 'en' }))
    .join(' ');
  assert.doesNotMatch(moka, /\b(bloom|spiral|drawdown|v60|valve|filter wall)\b/i);
  assert.match(moka, /no tamp|sputter/i);

  const frenchPress = METHOD_ACTIONS.french_press
    .map((actionType) => resolveWorkflowTutorialDetail({ methodFamily: 'french_press', actionType, brewMode: 'hot', language: 'en' }))
    .join(' ');
  assert.doesNotMatch(frenchPress, /\b(drawdown|spiral|final pour|filter wall)\b/i);
  assert.match(frenchPress, /decant|settle|plunge/i);

  const coldBrew = METHOD_ACTIONS.cold_brew
    .map((actionType) => resolveWorkflowTutorialDetail({ methodFamily: 'cold_brew', actionType, brewMode: 'iced', language: 'en' }))
    .join(' ');
  assert.doesNotMatch(coldBrew, /\b(hot bloom|kettle|spiral|drawdown|hot pour)\b/i);

  const batch = METHOD_ACTIONS.batch_brew
    .map((actionType) => resolveWorkflowTutorialDetail({ methodFamily: 'batch_brew', actionType, brewMode: 'hot', language: 'en' }))
    .join(' ');
  assert.doesNotMatch(batch, /\b(spiral|manual pour|bloom pour|center-to-mid)\b/i);

  const paperFilter = resolveWorkflowTutorialDetail({ methodFamily: 'v60', actionType: 'bloom', brewMode: 'hot', language: 'en' });
  assert.match(paperFilter, /\b(bloom|bed|pour)\b/i);
});

test('AI Brew result guide labels use Summary/Detail without renaming Quick/Precision entry cards', () => {
  const source = readFileSync(resolve(process.cwd(), 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');

  assert.match(source, /quickMode:\s*'Quick'/);
  assert.match(source, /proMode:\s*'Precision'/);
  assert.match(source, /quickMode:\s*'Cepat'/);
  assert.match(source, /proMode:\s*'Presisi'/);

  assert.match(source, /guideDensitySimple:\s*'Summary'/);
  assert.match(source, /guideDensityPro:\s*'Detail'/);
  assert.match(source, /guideDensitySimpleHint:\s*'Core steps only\.'/);
  assert.match(source, /guideDensityProHint:\s*'Step-by-step barista tutorial\.'/);

  assert.match(source, /guideDensitySimple:\s*'Ringkas'/);
  assert.match(source, /guideDensitySimpleHint:\s*'Langkah inti saja\.'/);
  assert.match(source, /guideDensityProHint:\s*'Tutorial barista di setiap tahap\.'/);
});

test('every visible AI Brew dripper resolves tutorial detail for each generated workflow step', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  const visibleDrippers = catalog.drippers.filter((dripper) => !dripper.hidden && !dripper.deprecated);
  const espressoGrinder = catalog.grinders.find((grinder) => /encore esp|df64|niche/i.test(`${grinder.name} ${grinder.searchText}`));
  const filterGrinder = catalog.grinders.find((grinder) => /k-ultra|comandante|kingrinder k6/i.test(`${grinder.name} ${grinder.searchText}`));
  assert.ok(visibleDrippers.length > REQUIRED_METHODS.length, 'catalog should expose concrete drippers, not only method families');
  assert.ok(espressoGrinder, 'espresso-capable grinder must exist for workflow tutorial integration');
  assert.ok(filterGrinder, 'filter grinder must exist for workflow tutorial integration');

  const coveredFamilies = new Set<AiBrewMethodFamily>();
  for (const dripper of visibleDrippers) {
    const methodFamily = dripper.methodFamily || 'v60';
    coveredFamilies.add(methodFamily);
    const modes: Array<'hot' | 'iced'> = supportsAiBrewIcedMode(catalog, dripper.id) ? ['hot', 'iced'] : ['hot'];
    for (const brewMode of modes) {
      const doseG = methodFamily === 'espresso' ? '18' : methodFamily === 'cold_brew' ? '60' : methodFamily === 'batch_brew' ? '60' : '15';
      const plan = buildAiBrewPlan({
        ...createDefaultAiBrewFormState(catalog),
        coffeeName: `Tutorial QA ${dripper.name}`,
        process: methodFamily === 'espresso' ? 'washed' : 'natural',
        variety: methodFamily === 'espresso' ? 'bourbon' : 'gesha',
        roastLevel: methodFamily === 'espresso' ? 'medium_dark' : 'medium_light',
        dripperId: dripper.id,
        grinderId: methodFamily === 'espresso' ? espressoGrinder.id : filterGrinder.id,
        brewMode,
        doseG,
        targetWaterMl: '',
        targetProfileId: methodFamily === 'espresso' ? 'soft_round' : 'balance_clean',
        waterMode: 'manual',
        waterBrandId: '',
        waterTdsPpm: '90',
        waterHardnessPpm: '45',
        waterAlkalinityPpm: '35',
      }, catalog);
      const guideSteps = buildWorkflowAwareGuideSteps(plan);
      assert.ok(guideSteps.length >= 3, `${dripper.name} ${brewMode} should generate a real workflow guide`);

      for (const step of guideSteps) {
        const en = resolveWorkflowTutorialDetail({
          methodFamily: plan.methodFamily,
          actionType: step.actionType,
          brewMode: plan.brewMode,
          language: 'en',
          hasWarning: step.warnings.length > 0,
        });
        const id = resolveWorkflowTutorialDetail({
          methodFamily: plan.methodFamily,
          actionType: step.actionType,
          brewMode: plan.brewMode,
          language: 'id',
          hasWarning: step.warnings.length > 0,
        });
        assert.ok(en.length > 20 && en.length <= 220, `${dripper.name}/${brewMode}/${step.actionType} EN tutorial should be one compact point`);
        assert.ok(id.length > 20 && id.length <= 240, `${dripper.name}/${brewMode}/${step.actionType} ID tutorial should be one compact point`);
        assert.doesNotMatch(`${en} ${id}`, CORRECTION_LOOP, `${dripper.name}/${brewMode}/${step.actionType} should not be taste correction`);
      }
    }
  }

  for (const family of REQUIRED_METHODS) {
    assert.ok(coveredFamilies.has(family), `${family} should be covered by visible dripper integration`);
  }
});
