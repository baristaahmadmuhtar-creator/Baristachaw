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
const AEROPRESS_STYLE_CASES = [
  {
    style: 'standard',
    en: /upright|25-35|short steep/i,
    id: /tegak|25-35|rendaman singkat/i,
  },
  {
    style: 'inverted',
    en: /inverted|flip|30-40/i,
    id: /terbalik|balikkan|30-40/i,
  },
  {
    style: 'bypass',
    en: /bypass water|after pressing/i,
    id: /air bypass|setelah tekan|fase tekan selesai/i,
  },
  {
    style: 'no_bypass',
    en: /all recipe water|without extra water|full chamber/i,
    id: /seluruh air resep|tanpa air tambahan|ruang seduh/i,
  },
  {
    style: 'bright_clean',
    en: /clarity|20-30|clear/i,
    id: /kejernihan|20-30|jernih/i,
  },
  {
    style: 'sweet_body',
    en: /five|35-45|sweetness and body/i,
    id: /lima|35-45|manis dan body/i,
  },
] as const;
const AEROPRESS_ACTIONS: WorkflowGuideActionType[] = ['setup', 'charge', 'steep', 'press', 'serve'];
const AEROPRESS_ID_RAW_ENGLISH = /\b(paper filter|slurry|cup|full-saturation|heavy-bodied|puck|filter cap|chamber)\b/i;
const AEROPRESS_POUROVER_LEAK = /\b(bloom|final pour|spiral|drawdown|center-to-mid|filter wall|tuang akhir|air turun)\b/i;
const AEROPRESS_BYPASS_COMMAND = /\b(Add the measured bypass water|measured bypass water after pressing|Tambahkan air bypass terukur|air bypass terukur hanya setelah tekan)\b/i;
const STYLE_TUTORIAL_RAW_ID_LEAK =
  /\b(paper|bed|dripper|server|drawdown|carafe|load|sec|slurry|flutes|rib|flat-bottom|wave|cone|puck|chamber|hiss|dry pocket|spray head|room temp|pre-wet)\b/i;
const STYLE_TUTORIAL_METHOD_LEAKS: Partial<Record<AiBrewMethodFamily, RegExp>> = {
  french_press: /\b(bloom|final pour|tuang akhir|drawdown bed|center-to-mid|filter wall)\b/i,
  clever_dripper: /\b(final pour|tuang akhir|center-to-mid|v60)\b/i,
  aeropress: AEROPRESS_POUROVER_LEAK,
  moka_pot: /\b(bloom|final pour|tuang akhir|spiral|v60|drawdown bed|filter wall|valve release|buka katup)\b/i,
  siphon: /\b(final pour|tuang akhir|center-to-mid|v60|moka|boiler sputter)\b/i,
  cold_brew: /\b(hot bloom|bloom panas|kettle|ceret|final pour|tuang akhir|drawdown|air turun|hot pour|tuang panas)\b/i,
  batch_brew: /\b(manual pour|bloom pour|center-to-mid|spiral manual|tuang spiral manual)\b/i,
};
const ALL_STYLE_TUTORIAL_CASES: Array<{
  methodFamily: AiBrewMethodFamily;
  styles: readonly string[];
  actions: readonly WorkflowGuideActionType[];
}> = [
  { methodFamily: 'french_press', styles: ['traditional', 'clean_decant', 'double_filter', 'heavy_concentrate', 'sweet_immersion'], actions: METHOD_ACTIONS.french_press },
  { methodFamily: 'kalita_wave', styles: ['traditional_flat_three', 'competition_fast_four', 'continuous_slow_stream', 'iced_wave', 'high_dose_concentrate'], actions: METHOD_ACTIONS.kalita_wave },
  { methodFamily: 'clever_dripper', styles: ['classic_closed', 'reverse_water_first', 'double_stage_hybrid', 'iced_clever', 'high_dose_concentrate'], actions: METHOD_ACTIONS.clever_dripper },
  { methodFamily: 'chemex', styles: ['traditional_three_pour', 'competition_multi_pulse', 'continuous_center_pour', 'iced_chemex', 'high_dose_heavy_body'], actions: METHOD_ACTIONS.chemex },
  { methodFamily: 'moka_pot', styles: ['traditional_stovetop', 'preheated_boiler', 'low_temp_controlled', 'iced_moka_concentrate', 'high_yield_robust'], actions: METHOD_ACTIONS.moka_pot },
  { methodFamily: 'cold_brew', styles: ['classic_toddy_immersion', 'cold_drip_tower', 'double_extraction_concentrate', 'accelerated_room_temp', 'japanese_slow_drip'], actions: METHOD_ACTIONS.cold_brew },
  { methodFamily: 'batch_brew', styles: ['sca_gold_cup', 'heavy_batch_catering', 'bright_light_roast_batch', 'pre_wet_hybrid_batch', 'high_extraction_thermos'], actions: METHOD_ACTIONS.batch_brew },
  { methodFamily: 'siphon', styles: ['traditional_vacuum_siphon', 'competition_triple_agitation', 'low_temp_delicate', 'high_body_fast_drawdown', 'spirit_infusion_style'], actions: METHOD_ACTIONS.siphon },
  { methodFamily: 'origami', styles: ['cone_dripper_style', 'wave_dripper_style', 'mugen_one_pour', 'iced_origami', 'competition_hybrid_flow'], actions: METHOD_ACTIONS.origami },
  { methodFamily: 'april', styles: ['april_flat_bottom_standard', 'april_continuous_slow', 'competition_two_pour', 'iced_april_style', 'high_body_heavy_dose'], actions: METHOD_ACTIONS.april },
  { methodFamily: 'melitta', styles: ['traditional_melitta_one_pour', 'aromaboy_style', 'three_pour_melitta', 'iced_melitta_brew', 'dense_classic_extraction'], actions: METHOD_ACTIONS.melitta },
  { methodFamily: 'kono', styles: ['kono_meimon_traditional', 'kono_dripper_standard', 'kono_slow_drip_body', 'iced_kono_meimon', 'kono_agitation_sweet'], actions: METHOD_ACTIONS.kono },
  { methodFamily: 'aeropress', styles: AEROPRESS_STYLE_CASES.map((item) => item.style), actions: AEROPRESS_ACTIONS },
  { methodFamily: 'hario_switch', styles: ['hybrid_balanced', 'hybrid_bright_clean', 'immersion_sweet', 'immersion_heavy_body', 'v60_mode', 'iced_hybrid', 'mugen_everyday_hybrid'], actions: METHOD_ACTIONS.hario_switch },
];

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

test('AeroPress style tutorials are bilingual, style-specific, and free from leakage', () => {
  for (const styleCase of AEROPRESS_STYLE_CASES) {
    const enTexts: string[] = [];
    const idTexts: string[] = [];

    for (const actionType of AEROPRESS_ACTIONS) {
      const en = resolveWorkflowTutorialDetail({
        methodFamily: 'aeropress',
        recipeStyle: styleCase.style,
        actionType,
        brewMode: 'hot',
        language: 'en',
      });
      const id = resolveWorkflowTutorialDetail({
        methodFamily: 'aeropress',
        recipeStyle: styleCase.style,
        actionType,
        brewMode: 'hot',
        language: 'id',
      });

      assert.ok(en.length > 20 && en.length <= 220, `${styleCase.style}/${actionType} EN should be compact: ${en}`);
      assert.ok(id.length > 20 && id.length <= 240, `${styleCase.style}/${actionType} ID should be compact: ${id}`);
      assert.doesNotMatch(en, ENGLISH_LEAKS, `${styleCase.style}/${actionType} EN leaks Indonesian: ${en}`);
      assert.doesNotMatch(id, CRITICAL_INDONESIAN_LEAKS, `${styleCase.style}/${actionType} ID leaks raw English: ${id}`);
      assert.doesNotMatch(id, AEROPRESS_ID_RAW_ENGLISH, `${styleCase.style}/${actionType} ID uses avoidable raw English: ${id}`);
      assert.doesNotMatch(`${en} ${id}`, CORRECTION_LOOP, `${styleCase.style}/${actionType} should not be taste correction`);
      assert.doesNotMatch(`${en} ${id}`, AEROPRESS_POUROVER_LEAK, `${styleCase.style}/${actionType} leaks pour-over language: ${en} ${id}`);

      enTexts.push(en);
      idTexts.push(id);
    }

    const combinedEn = enTexts.join(' ');
    const combinedId = idTexts.join(' ');
    assert.match(combinedEn, styleCase.en, `${styleCase.style} EN should expose its style cue`);
    assert.match(combinedId, styleCase.id, `${styleCase.style} ID should expose its style cue`);

    if (styleCase.style !== 'bypass') {
      assert.doesNotMatch(`${combinedEn} ${combinedId}`, AEROPRESS_BYPASS_COMMAND, `${styleCase.style} must not instruct bypass dilution`);
    }
  }
});

test('every selectable AI Brew style resolves bilingual tutorials without raw language or method leakage', () => {
  for (const styleFamily of ALL_STYLE_TUTORIAL_CASES) {
    const fingerprints = new Map<string, string>();

    for (const recipeStyle of styleFamily.styles) {
      const enTexts: string[] = [];
      const idTexts: string[] = [];

      for (const actionType of styleFamily.actions) {
        const en = resolveWorkflowTutorialDetail({
          methodFamily: styleFamily.methodFamily,
          recipeStyle,
          actionType,
          brewMode: recipeStyle.includes('iced') ? 'iced' : 'hot',
          language: 'en',
        });
        const id = resolveWorkflowTutorialDetail({
          methodFamily: styleFamily.methodFamily,
          recipeStyle,
          actionType,
          brewMode: recipeStyle.includes('iced') ? 'iced' : 'hot',
          language: 'id',
        });

        assert.ok(en.length > 20 && en.length <= 220, `${styleFamily.methodFamily}/${recipeStyle}/${actionType} EN should be compact: ${en}`);
        assert.ok(id.length > 20 && id.length <= 240, `${styleFamily.methodFamily}/${recipeStyle}/${actionType} ID should be compact: ${id}`);
        assert.doesNotMatch(en, ENGLISH_LEAKS, `${styleFamily.methodFamily}/${recipeStyle}/${actionType} EN leaks Indonesian: ${en}`);
        assert.doesNotMatch(id, CRITICAL_INDONESIAN_LEAKS, `${styleFamily.methodFamily}/${recipeStyle}/${actionType} ID leaks critical English: ${id}`);
        assert.doesNotMatch(id, STYLE_TUTORIAL_RAW_ID_LEAK, `${styleFamily.methodFamily}/${recipeStyle}/${actionType} ID keeps avoidable raw English: ${id}`);
        assert.doesNotMatch(`${en} ${id}`, CORRECTION_LOOP, `${styleFamily.methodFamily}/${recipeStyle}/${actionType} should not be taste correction`);
        if (STYLE_TUTORIAL_METHOD_LEAKS[styleFamily.methodFamily]) {
          assert.doesNotMatch(`${en} ${id}`, STYLE_TUTORIAL_METHOD_LEAKS[styleFamily.methodFamily]!, `${styleFamily.methodFamily}/${recipeStyle}/${actionType} leaks wrong-method language: ${en} ${id}`);
        }

        enTexts.push(en);
        idTexts.push(id);
      }

      const fingerprint = `${enTexts.join(' ')} ${idTexts.join(' ')}`.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
      assert.ok(!fingerprints.has(fingerprint), `${styleFamily.methodFamily}/${recipeStyle} duplicates ${fingerprints.get(fingerprint)} tutorial copy`);
      fingerprints.set(fingerprint, recipeStyle);
    }
  }
});

test('AI Brew entry cards expose Basic/Advanced while keeping guide density Lite/Pro', () => {
  const source = readFileSync(resolve(process.cwd(), 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');

  assert.match(source, /liteMode:\s*'Espresso Brew'/);
  assert.match(source, /quickMode:\s*'Basic Brew'/);
  assert.match(source, /proMode:\s*'Advanced Brew'/);
  assert.match(source, /espressoComingSoon:\s*'Espresso Brew/);

  assert.match(source, /guideDensitySimple:\s*'Lite'/);
  assert.match(source, /guideDensityPro:\s*'Pro'/);
  assert.match(source, /guideDensitySimpleHint:\s*'Timer and current step stay in view\.'/);
  assert.match(source, /guideDensityProHint:\s*'Full guide with practical barista detail\.'/);

  assert.match(source, /guideDensitySimple:\s*'Lite'/);
  assert.match(source, /guideDensityPro:\s*'Pro'/);
  assert.match(source, /guideDensitySimpleHint:\s*'Timer dan langkah aktif tetap di atas\.'/);
  assert.match(source, /guideDensityProHint:\s*'Panduan lengkap dengan detail teknik barista\.'/);
});

test('Indonesian AI Brew style chip labels use natural operational copy', () => {
  const source = readFileSync(resolve(process.cwd(), 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');
  const idCopyStart = source.indexOf('  id: {');
  const idCopyEnd = source.indexOf('    precisionControlTitle:', idCopyStart);
  assert.ok(idCopyStart > 0 && idCopyEnd > idCopyStart, 'Indonesian AI Brew copy block should be discoverable');
  const idCopy = source.slice(idCopyStart, idCopyEnd);
  const forbiddenRawIdLabels = [
    /frenchPressStyleCleanDecant:\s*'Clean decant'/,
    /frenchPressStyleDoubleFilter:\s*'Double filter'/,
    /frenchPressStyleHeavyConcentrate:\s*'Heavy concentrate'/,
    /frenchPressStyleSweetImmersion:\s*'Sweet immersion'/,
    /kalitaWaveStyleTraditionalFlatThree:\s*'Traditional Flat Three-Pour'/,
    /kalitaWaveStyleCompetitionFastFour:\s*'Competition Fast Four-Pour'/,
    /kalitaWaveStyleContinuousSlowStream:\s*'Continuous Slow Stream'/,
    /cleverDripperStyleClassicClosed:\s*'Classic Immersion Bloom'/,
    /chemexStyleContinuousCenterPour:\s*'Continuous Center Pour Clarity'/,
    /batchBrewStyleIcedBatchBrew:\s*'Batch Hybrid Pre-Wet'/,
    /siphonStyleHighDoseIntense:\s*'Body Tinggi Drawdown Cepat'/,
  ];

  for (const pattern of forbiddenRawIdLabels) {
    assert.doesNotMatch(idCopy, pattern);
  }

  assert.match(idCopy, /frenchPressStyleCleanDecant:\s*'Tuang pisah bersih'/);
  assert.match(idCopy, /origamiFilterCone:\s*'Filter kerucut'/);
  assert.match(idCopy, /origamiFilterWave:\s*'Filter berlipat'/);
  assert.match(idCopy, /kalitaWaveStyleTraditionalFlatThree:\s*'Tiga tuang alas datar'/);
  assert.match(idCopy, /cleverDripperStyleClassicClosed:\s*'Rendam klasik tertutup'/);
  assert.match(idCopy, /chemexStyleContinuousCenterPour:\s*'Aliran tengah kontinu'/);
  assert.match(idCopy, /batchBrewStyleIcedBatchBrew:\s*'Batch hybrid basah awal'/);
  assert.match(idCopy, /siphonStyleHighDoseIntense:\s*'Body tinggi air turun cepat'/);
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
          recipeStyle: plan.recipeStyle,
          actionType: step.actionType,
          brewMode: plan.brewMode,
          language: 'en',
          hasWarning: step.warnings.length > 0,
        });
        const id = resolveWorkflowTutorialDetail({
          methodFamily: plan.methodFamily,
          recipeStyle: plan.recipeStyle,
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
