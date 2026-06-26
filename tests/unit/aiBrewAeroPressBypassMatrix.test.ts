import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validateBrewPlanOutput } from '../../apps/web/src/features/ai-brew/antiHallucination.ts';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import {
  AEROPRESS_TARGET_INTENTS,
  resolveAeroPressTargetIntent,
  resolveAeroPressProductionTarget,
} from '../../apps/web/src/features/ai-brew/aeropressCalibration.ts';
import {
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import {
  localizeAiBrewDynamicText,
  localizeAiBrewStepLabel,
} from '../../apps/web/src/features/ai-brew/localization.ts';
import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewPlan,
  RoastLevel,
} from '../../apps/web/src/features/ai-brew/types.ts';

const ROOT = process.cwd();

function installCatalogFetch() {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const filePath = url.startsWith('/data/')
      ? path.join(ROOT, 'apps/web/public', url)
      : path.join(ROOT, url);
    const body = await fs.promises.readFile(filePath, 'utf8');
    return {
      ok: true,
      json: async () => JSON.parse(body),
    } as Response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = previousFetch;
  };
}

async function loadCatalogForTest(): Promise<AiBrewCatalog> {
  const restore = installCatalogFetch();
  try {
    return await loadAiBrewCatalog();
  } finally {
    restore();
  }
}

const TARGET_EXPECTATIONS: Record<string, { bypass: [number, number]; finish: [number, number]; finalRatio: [number, number]; stir: RegExp }> = {
  balance_clean: { bypass: [25, 40], finish: [115, 150], finalRatio: [12.7, 13.3], stir: /3x|3 kali|3 times/i },
  more_sweetness: { bypass: [20, 35], finish: [125, 160], finalRatio: [12.5, 13.1], stir: /3-4x|3-4 kali|3-4 times/i },
  more_acidity: { bypass: [30, 45], finish: [95, 125], finalRatio: [13.7, 14.3], stir: /2-3x|2-3 kali|2-3 times/i },
  fruit_forward: { bypass: [25, 40], finish: [105, 140], finalRatio: [13.2, 13.8], stir: /2-3x|2-3 kali|2-3 times/i },
  floral_transparent: { bypass: [35, 50], finish: [90, 125], finalRatio: [14.7, 15.3], stir: /2x|2 kali|2 times/i },
  more_body: { bypass: [10, 25], finish: [140, 180], finalRatio: [12.2, 12.8], stir: /4x|4 kali|4 times/i },
  soft_round: { bypass: [20, 35], finish: [120, 150], finalRatio: [12.5, 13.1], stir: /3x|3 kali|3 times/i },
  dense_comforting: { bypass: [10, 20], finish: [145, 185], finalRatio: [11.7, 12.3], stir: /4x|4 kali|4 times/i },
};

const BEAN_ARCHETYPES = [
  { name: 'Panama Washed Geisha', process: 'washed', variety: 'Geisha', origin: 'Panama' },
  { name: 'Panama Natural Geisha', process: 'natural', variety: 'Geisha', origin: 'Panama' },
  { name: 'Ethiopia Washed Landrace', process: 'washed', variety: 'Ethiopian Landrace', origin: 'Ethiopia' },
  { name: 'Kenya Washed SL28 SL34', process: 'washed', variety: 'SL28 SL34', origin: 'Kenya' },
  { name: 'Colombia Pink Bourbon Washed', process: 'washed', variety: 'Pink Bourbon', origin: 'Colombia' },
  { name: 'Colombia Anaerobic Caturra', process: 'anaerobic', variety: 'Caturra', origin: 'Colombia' },
  { name: 'Brazil Natural Yellow Bourbon', process: 'natural', variety: 'Yellow Bourbon', origin: 'Brazil' },
  { name: 'Costa Rica Honey Catuai', process: 'honey', variety: 'Catuai', origin: 'Costa Rica' },
  { name: 'Indonesia Gayo Washed Ateng', process: 'washed', variety: 'Ateng', origin: 'Indonesia Gayo' },
  { name: 'Indonesia Toraja Wet Hulled', process: 'wet_hulled', variety: 'Typica', origin: 'Indonesia Toraja' },
  { name: 'Mexico Washed Bourbon', process: 'washed', variety: 'Bourbon', origin: 'Mexico' },
  { name: 'Specialty Robusta Natural', process: 'natural', variety: 'Canephora', origin: 'Uganda' },
] as const;

const ROAST_LEVELS: RoastLevel[] = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
const AEROPRESS_STYLE_MATRIX = ['auto', 'standard', 'inverted', 'bypass', 'no_bypass', 'bright_clean', 'sweet_body'] as const;
const AEROPRESS_TARGET_PROFILE_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'fruit_forward',
  'floral_transparent',
  'more_body',
  'soft_round',
  'dense_comforting',
] as const;

test('AeroPress target intent and guardrails are explicit for every target rasa', () => {
  assert.equal(Object.keys(AEROPRESS_TARGET_INTENTS).length, AEROPRESS_TARGET_PROFILE_IDS.length);
  for (const targetProfileId of AEROPRESS_TARGET_PROFILE_IDS) {
    const intent = resolveAeroPressTargetIntent(targetProfileId);
    const calibration = resolveAeroPressProductionTarget('bypass', targetProfileId, 'medium');
    assert.equal(intent.targetProfileId, targetProfileId);
    assert.match(intent.sensoryIntent, /clean|sweet|acid|body|floral|fruit|round|comfort/i);
    assert.match(intent.extractionMove, /contact|stir|press|ratio|bypass|agitation/i);
    assert.ok(intent.guardrails.length >= 6, `${targetProfileId} must expose core guardrails`);
    assert.ok(intent.guardrails.some((item) => /240 ml/.test(item)), `${targetProfileId} must mention upright chamber cap`);
    assert.ok(intent.guardrails.some((item) => /220 ml/.test(item)), `${targetProfileId} must mention inverted chamber cap`);
    assert.ok(intent.guardrails.some((item) => /bypass water only after pressing/i.test(item)), `${targetProfileId} must guard bypass order`);
    assert.ok(intent.guardrails.some((item) => /dry hiss/i.test(item)), `${targetProfileId} must guard hiss stop`);
    assert.ok(calibration.targetCue.en.length > 20, `${targetProfileId} must feed target cue into calibration`);
  }
});

function findIdByName(catalog: AiBrewCatalog, kind: 'processes' | 'varieties', text: string) {
  const normalized = text.toLowerCase();
  const collection = catalog[kind] as Array<{ id: string; label: string; aliases?: string[]; searchText?: string }>;
  return collection.find((item) => (
    item.id.toLowerCase() === normalized
    || item.label.toLowerCase().includes(normalized)
    || (item.searchText || '').toLowerCase().includes(normalized)
    || (item.aliases || []).some((alias) => alias.toLowerCase().includes(normalized))
  ))?.id || 'custom';
}

function buildBypassPlan(catalog: AiBrewCatalog, params: {
  bean: typeof BEAN_ARCHETYPES[number];
  roastLevel: RoastLevel;
  targetProfileId: string;
  waterCaseIndex: number;
  grinderCaseIndex: number;
}) {
  const dripper = catalog.drippers.find((item) => item.id === 'aeropress')
    || catalog.drippers.find((item) => /aeropress/i.test(item.name));
  const grinderCandidates = [
    /k-ultra/i,
    /kingrinder.*k6/i,
    /timemore.*c2/i,
    /feima|600n|murane/i,
  ];
  const grinder = catalog.grinders.find((item) => grinderCandidates[params.grinderCaseIndex % grinderCandidates.length].test(`${item.name} ${item.id}`))
    || catalog.grinders[0];
  assert.ok(dripper, 'AeroPress dripper should exist');
  assert.ok(grinder, 'At least one grinder should exist');

  const processId = findIdByName(catalog, 'processes', params.bean.process);
  const varietyId = findIdByName(catalog, 'varieties', params.bean.variety);
  const waterCases = [
    { tds: '130', gh: '63', kh: '61', notes: 'Volvic-like moderate mineral upper-buffered water' },
    { tds: '45', gh: '18', kh: '12', notes: 'low-mineral clarity water' },
    { tds: '85', gh: '45', kh: '30', notes: 'balanced low-buffer filter water' },
    { tds: '180', gh: '72', kh: '92', notes: 'upper-buffered water caution' },
  ];
  const water = waterCases[params.waterCaseIndex % waterCases.length];
  const form: AiBrewFormState = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: `${params.bean.name} bypass QA`,
    process: processId === 'custom' ? 'custom' : processId,
    customProcess: processId === 'custom' ? params.bean.process : '',
    variety: varietyId === 'custom' ? 'custom' : varietyId,
    customVariety: varietyId === 'custom' ? params.bean.variety : '',
    roastLevel: params.roastLevel,
    dripperId: dripper.id,
    grinderId: grinder.id,
    targetProfileId: params.targetProfileId,
    doseG: '15',
    targetWaterMl: '',
    targetRatio: '',
    targetTempC: '',
    aeropressStyle: 'bypass',
    waterMode: 'manual',
    waterCustomized: true,
    waterTdsPpm: water.tds,
    waterHardnessPpm: water.gh,
    waterAlkalinityPpm: water.kh,
    waterNotes: water.notes,
  };
  return buildAiBrewPlan(form, catalog);
}

function collectPlanText(plan: BrewPlan, language: 'id' | 'en') {
  const stepText = (plan.workflowGuideSteps || []).map((step) => [
    localizeAiBrewStepLabel(step.label, language),
    localizeAiBrewDynamicText(step.primaryText || '', language),
    localizeAiBrewDynamicText(step.secondaryText || '', language),
    ...(step.techniqueChips || []).map((chip) => `${localizeAiBrewDynamicText(chip.label, language)} ${localizeAiBrewDynamicText(chip.value, language)}`),
  ].join(' '));
  return [
    ...stepText,
  ].join('\n').replace(/\s+/g, ' ');
}

function collectPlanSafetyText(plan: BrewPlan) {
  return [
    plan.summary,
    ...plan.notes,
    ...plan.warnings,
    ...plan.steps.map((step) => `${step.label} ${step.note || ''} ${step.hybridInstruction || ''}`),
    ...(plan.workflowGuideSteps || []).map((step) => `${step.label} ${step.primaryText || ''} ${step.secondaryText || ''}`),
  ].join('\n').replace(/\s+/g, ' ');
}

function assertBypassPlan(plan: BrewPlan, targetProfileId: string) {
  const expected = TARGET_EXPECTATIONS[targetProfileId];
  assert.ok(expected, `target expectation should exist for ${targetProfileId}`);
  assert.equal(plan.methodFamily, 'aeropress');
  assert.equal(plan.recipeStyle, 'bypass');
  assert.ok(plan.hotWaterMl < plan.totalWaterMl, 'bypass plan must brew concentrate before dilution');
  assert.equal(Math.round((plan.totalWaterMl / plan.doseG) * 10) / 10, Math.round(plan.finalBeverageRatio * 10) / 10);
  assert.equal(Math.round((plan.hotWaterMl / plan.doseG) * 10) / 10, Math.round(plan.hotExtractionRatio * 10) / 10);
  assert.ok(plan.hotExtractionRatio >= 8 && plan.hotExtractionRatio <= 10.1, `concentrate ratio should stay 1:8-1:10, got 1:${plan.hotExtractionRatio}`);
  assert.ok(plan.finalBeverageRatio >= expected.finalRatio[0] && plan.finalBeverageRatio <= expected.finalRatio[1], `${targetProfileId} final ratio got 1:${plan.finalBeverageRatio}`);
  const bypassPercent = ((plan.totalWaterMl - plan.hotWaterMl) / plan.totalWaterMl) * 100;
  assert.ok(bypassPercent >= expected.bypass[0] && bypassPercent <= expected.bypass[1], `${targetProfileId} bypass ${bypassPercent.toFixed(1)}% outside ${expected.bypass.join('-')}%`);
  assert.ok(plan.totalTimeSeconds >= expected.finish[0] && plan.totalTimeSeconds <= expected.finish[1], `${targetProfileId} finish ${plan.totalTimeSeconds}s outside ${expected.finish.join('-')}s`);
  const idGuideText = collectPlanText(plan, 'id');
  assert.match(idGuideText, expected.stir, `${targetProfileId} should expose target-specific stir count`);
  assert.match(idGuideText, /air bypass|setelah tekan|tidak melewati lapisan kopi/i);
  assert.doesNotMatch(idGuideText, /\b(drawdown|final pour|flat bed|filter wall|center-to-mid|V60|bloom pour)\b/i);
  const safetyText = collectPlanSafetyText(plan);
  assert.doesNotMatch(safetyText, /\b(drawdown|final pour|flat bed|filter wall|center-to-mid|V60|bloom pour)\b/i);
  assert.doesNotMatch(safetyText, /\$1 seconds|\$|\bundefined\b|\bNaN\b|ActionAction|Action Action|Pressgentle|Stophiss|stir dua times|pour air/i);
}

function buildAeroPressStylePlan(catalog: AiBrewCatalog, params: {
  style: typeof AEROPRESS_STYLE_MATRIX[number];
  targetProfileId: typeof AEROPRESS_TARGET_PROFILE_IDS[number];
  roastLevel: RoastLevel;
}) {
  const dripper = catalog.drippers.find((item) => item.id === 'aeropress')
    || catalog.drippers.find((item) => /aeropress/i.test(item.name));
  const grinder = catalog.grinders.find((item) => /k-ultra/i.test(`${item.name} ${item.id}`))
    || catalog.grinders[0];
  assert.ok(dripper, 'AeroPress dripper should exist');
  assert.ok(grinder, 'At least one grinder should exist');

  const form: AiBrewFormState = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: `AeroPress ${params.style} ${params.targetProfileId} ${params.roastLevel}`,
    process: params.targetProfileId === 'fruit_forward' ? 'natural' : 'washed',
    variety: params.targetProfileId === 'floral_transparent' ? 'gesha' : 'bourbon',
    roastLevel: params.roastLevel,
    dripperId: dripper.id,
    grinderId: grinder.id,
    targetProfileId: params.targetProfileId,
    doseG: '15',
    targetWaterMl: '',
    targetRatio: '',
    targetTempC: '',
    aeropressStyle: params.style,
    waterMode: 'manual',
    waterCustomized: true,
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '35',
    waterNotes: 'balanced low-buffer filter water',
  };
  return buildAiBrewPlan(form, catalog);
}

function collectAeroPressGuideText(plan: BrewPlan) {
  const idText = collectPlanText(plan, 'id');
  const enText = collectPlanText(plan, 'en');
  return `${idText}\n${enText}`;
}

function assertRoastAwareAeroPressTemperature(plan: BrewPlan, roastLevel: RoastLevel) {
  const brightStyle = plan.recipeStyle === 'bright_clean';
  if (roastLevel === 'light' || roastLevel === 'medium_light') {
    assert.ok(
      plan.waterTempC >= (brightStyle ? 91 : 90),
      `${plan.recipeStyle}/${plan.targetProfileId}/${roastLevel} should keep light-roast AeroPress hot enough, got ${plan.waterTempC}C`,
    );
  }
  if (roastLevel === 'medium_dark') {
    assert.ok(
      plan.waterTempC <= (brightStyle ? 90 : 89),
      `${plan.recipeStyle}/${plan.targetProfileId}/${roastLevel} should lower temperature for medium-dark roast, got ${plan.waterTempC}C`,
    );
  }
  if (roastLevel === 'dark') {
    assert.ok(
      plan.waterTempC <= (brightStyle ? 89 : 88),
      `${plan.recipeStyle}/${plan.targetProfileId}/${roastLevel} should protect dark roast with lower temperature, got ${plan.waterTempC}C`,
    );
  }
}

function assertAeroPressTargetCue(plan: BrewPlan, targetProfileId: string) {
  const text = collectAeroPressGuideText(plan);
  if (targetProfileId === 'more_acidity') {
    assert.match(text, /acidity|keasaman|cerah|bright/i, `${plan.recipeStyle}/${targetProfileId} should expose bright acidity cues`);
    assert.match(text, /2-3x|2-3 kali|2-3 times/i, `${plan.recipeStyle}/${targetProfileId} should keep stir count light`);
  }
  if (targetProfileId === 'floral_transparent') {
    assert.match(text, /floral|transparan|transparent|clarity|kejernihan/i, `${plan.recipeStyle}/${targetProfileId} should expose floral clarity cues`);
    assert.match(text, /2x|2 kali|2 times|2-3x|2-3 kali|2-3 times/i, `${plan.recipeStyle}/${targetProfileId} should use very low agitation`);
  }
  if (targetProfileId === 'fruit_forward') {
    assert.match(text, /fruit|buah|aroma|aromatics/i, `${plan.recipeStyle}/${targetProfileId} should protect fruit aromatics`);
  }
  if (targetProfileId === 'more_sweetness' || targetProfileId === 'soft_round') {
    assert.match(text, /sweet|manis|round|bulat|lembut/i, `${plan.recipeStyle}/${targetProfileId} should expose sweetness/roundness cues`);
  }
  if (targetProfileId === 'more_body' || targetProfileId === 'dense_comforting') {
    assert.match(text, /body|tekstur|dense|padat|comfort|berisi/i, `${plan.recipeStyle}/${targetProfileId} should expose body cues`);
    assert.match(text, /4x|4 kali|4 times|5x|5 kali|5 times|25-35/i, `${plan.recipeStyle}/${targetProfileId} should use stronger body handling`);
  }
  assert.doesNotMatch(text, /\b(drawdown|final pour|flat bed|filter wall|center-to-mid|V60|bloom pour)\b/i);
  assert.doesNotMatch(text, /\$1 seconds|\$|\bundefined\b|\bNaN\b|ActionAction|Action Action|Pressgentle|Stophiss|stir dua times|pour air/i);
}

test('AeroPress every style is target-aware, roast-aware, and copy-safe', async () => {
  const catalog = await loadCatalogForTest();
  let cases = 0;

  for (const style of AEROPRESS_STYLE_MATRIX) {
    for (const roastLevel of ROAST_LEVELS) {
      const balance = buildAeroPressStylePlan(catalog, { style, roastLevel, targetProfileId: 'balance_clean' });
      assertRoastAwareAeroPressTemperature(balance, roastLevel);
      assertAeroPressTargetCue(balance, 'balance_clean');

      for (const targetProfileId of AEROPRESS_TARGET_PROFILE_IDS) {
        const plan = targetProfileId === 'balance_clean'
          ? balance
          : buildAeroPressStylePlan(catalog, { style, roastLevel, targetProfileId });

        assert.equal(plan.methodFamily, 'aeropress');
        assert.equal(plan.roastLevel, roastLevel);
        assertRoastAwareAeroPressTemperature(plan, roastLevel);
        assertAeroPressTargetCue(plan, targetProfileId);
        assert.equal(validateBrewPlanOutput(plan).allowed, true, `${style}/${targetProfileId}/${roastLevel} output guard`);

        if (plan.recipeStyle === 'bypass') {
          assert.ok(plan.totalWaterMl > plan.hotWaterMl, `${style}/${targetProfileId}/${roastLevel} bypass must split chamber and bypass water`);
          assert.ok(plan.hotWaterMl <= 240, `${style}/${targetProfileId}/${roastLevel} bypass chamber must stay <= 240 ml`);
        } else {
          assert.equal(plan.totalWaterMl, plan.hotWaterMl, `${style}/${targetProfileId}/${roastLevel} non-bypass must not add bypass`);
          assert.ok(plan.totalWaterMl <= (plan.recipeStyle === 'inverted' ? 220 : 240), `${style}/${targetProfileId}/${roastLevel} chamber cap`);
        }

        if (targetProfileId === 'more_acidity') {
          assert.ok(plan.finalBeverageRatio >= balance.finalBeverageRatio + 0.25, `${style}/${roastLevel} acidity ratio should open vs balance`);
          assert.ok(plan.totalTimeSeconds <= balance.totalTimeSeconds - 5, `${style}/${roastLevel} acidity should finish faster than balance`);
        }
        if (targetProfileId === 'floral_transparent') {
          assert.ok(plan.finalBeverageRatio >= balance.finalBeverageRatio + 0.35, `${style}/${roastLevel} floral ratio should open vs balance`);
          assert.ok(plan.totalTimeSeconds <= balance.totalTimeSeconds - 10, `${style}/${roastLevel} floral should finish faster than balance`);
        }
        if (targetProfileId === 'more_body') {
          assert.ok(plan.finalBeverageRatio <= balance.finalBeverageRatio - 0.25, `${style}/${roastLevel} body ratio should tighten vs balance`);
          assert.ok(plan.totalTimeSeconds >= balance.totalTimeSeconds + 10, `${style}/${roastLevel} body should finish slower than balance`);
        }
        if (targetProfileId === 'dense_comforting') {
          assert.ok(plan.finalBeverageRatio <= balance.finalBeverageRatio - 0.35, `${style}/${roastLevel} dense ratio should tighten vs balance`);
          assert.ok(plan.totalTimeSeconds >= balance.totalTimeSeconds + 15, `${style}/${roastLevel} dense should finish slower than balance`);
        }
        if (targetProfileId === 'more_sweetness' || targetProfileId === 'soft_round') {
          assert.ok(plan.finalBeverageRatio <= balance.finalBeverageRatio, `${style}/${roastLevel} ${targetProfileId} should not run thinner than balance`);
          assert.ok(plan.totalTimeSeconds >= balance.totalTimeSeconds, `${style}/${roastLevel} ${targetProfileId} should not run faster than balance`);
        }
        cases += 1;
      }
    }
  }

  assert.equal(cases, AEROPRESS_STYLE_MATRIX.length * AEROPRESS_TARGET_PROFILE_IDS.length * ROAST_LEVELS.length);
});

test('AeroPress measured bypass matrix is target-aware, realistic, and leak-free', async () => {
  const catalog = await loadCatalogForTest();
  let cases = 0;
  for (const [beanIndex, bean] of BEAN_ARCHETYPES.entries()) {
    for (const roastLevel of ROAST_LEVELS) {
      for (const targetProfileId of Object.keys(TARGET_EXPECTATIONS)) {
        const plan = buildBypassPlan(catalog, {
          bean,
          roastLevel,
          targetProfileId,
          waterCaseIndex: beanIndex,
          grinderCaseIndex: beanIndex,
        });
        assertBypassPlan(plan, targetProfileId);
        cases += 1;
      }
    }
  }
  assert.ok(cases >= 240, `expected at least 240 bypass cases, got ${cases}`);
});
