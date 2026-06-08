import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { validateBrewPlanOutput } from '../apps/web/src/features/ai-brew/antiHallucination.ts';
import { loadAiBrewCatalog } from '../apps/web/src/features/ai-brew/catalog.ts';
import {
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../apps/web/src/features/ai-brew/planner.ts';
import {
  localizeAiBrewDynamicText,
  localizeAiBrewStepLabel,
} from '../apps/web/src/features/ai-brew/localization.ts';
import { resolveWorkflowTutorialDetail } from '../apps/web/src/features/ai-brew/workflowTutorials.ts';

const ROOT = process.cwd();
const SOURCE_BACKED_FILTER_BEAN_FIXTURE = 'tests/fixtures/ai-brew-source-backed-filter-beans.json';
const CASES_PER_STYLE = 1000;
const AEROPRESS_STYLES = ['auto', 'standard', 'inverted', 'bypass', 'no_bypass', 'bright_clean', 'sweet_body'];
const TARGET_PROFILE_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'fruit_forward',
  'floral_transparent',
  'more_body',
  'soft_round',
  'dense_comforting',
];
const ROAST_LEVELS = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
const DOSE_OPTIONS = ['12', '15', '18', '20'];
const TARGET_WATER_KIND_OPTIONS = ['planner-default', 'planner-default', 'low-edge', 'light-normal', 'standard-normal', 'upper-normal', 'high-edge'];

const FALLBACK_BEANS = [
  { id: 'panama-washed-geisha', label: 'Panama Washed Geisha', origin: 'Panama', process: 'washed', variety: 'geisha', expected: 'floral, transparent, citrus', sourceBacked: false },
  { id: 'panama-natural-geisha', label: 'Panama Natural Geisha', origin: 'Panama', process: 'natural', variety: 'geisha', expected: 'high aroma, fruit, floral risk', sourceBacked: false },
  { id: 'ethiopia-washed-landrace', label: 'Ethiopia Washed Landrace', origin: 'Ethiopia', process: 'washed', variety: 'ethiopian_landrace', expected: 'citrus, tea, floral clarity', sourceBacked: false },
  { id: 'kenya-washed-sl', label: 'Kenya Washed SL28 SL34', origin: 'Kenya', process: 'washed', variety: 'sl28_sl34', expected: 'blackcurrant, acidity, structure', sourceBacked: false },
  { id: 'colombia-pink-bourbon', label: 'Colombia Pink Bourbon Washed', origin: 'Colombia', process: 'washed', variety: 'pink_bourbon', expected: 'sweet citrus and floral balance', sourceBacked: false },
  { id: 'colombia-thermal-shock', label: 'Colombia Anaerobic Caturra', origin: 'Colombia', process: 'anaerobic', variety: 'caturra', expected: 'fruit intensity and ferment risk', sourceBacked: false },
  { id: 'brazil-natural-yellow-bourbon', label: 'Brazil Natural Yellow Bourbon', origin: 'Brazil', process: 'natural', variety: 'yellow_bourbon', expected: 'nutty sweetness and body', sourceBacked: false },
  { id: 'costa-rica-honey-catuai', label: 'Costa Rica Honey Catuai', origin: 'Costa Rica', process: 'honey', variety: 'catuai', expected: 'sweetness and soft fruit', sourceBacked: false },
  { id: 'indonesia-gayo-washed-ateng', label: 'Indonesia Gayo Washed Ateng', origin: 'Indonesia', process: 'washed', variety: 'ateng', expected: 'spice, herbal sweetness, body', sourceBacked: false },
  { id: 'indonesia-toraja-wet-hulled', label: 'Indonesia Toraja Wet Hulled', origin: 'Indonesia', process: 'wet_hulled', variety: 'typica', expected: 'earthy body and rustic depth', sourceBacked: false },
  { id: 'mexico-washed-bourbon', label: 'Mexico Washed Bourbon', origin: 'Mexico', process: 'washed', variety: 'bourbon', expected: 'balanced sweetness', sourceBacked: false },
  { id: 'specialty-robusta-natural', label: 'Specialty Robusta Natural', origin: 'Uganda', process: 'natural', variety: 'robusta', expected: 'heavy body and bitterness risk', sourceBacked: false },
];

const WATER_CASES = [
  { id: 'manual-balanced', label: 'manual balanced 95/55/40', risk: 'balanced', input: { waterMode: 'manual', waterBrandId: '', waterCustomized: true, waterTdsPpm: '95', waterHardnessPpm: '55', waterAlkalinityPpm: '40', waterNotes: 'balanced AeroPress stress water' } },
  { id: 'manual-soft', label: 'manual soft clarity 65/35/25', risk: 'soft_clarity', input: { waterMode: 'manual', waterBrandId: '', waterCustomized: true, waterTdsPpm: '65', waterHardnessPpm: '35', waterAlkalinityPpm: '25', waterNotes: 'soft clarity AeroPress stress water' } },
  { id: 'manual-low-mineral', label: 'manual low mineral 45/18/12', risk: 'low_mineral', input: { waterMode: 'manual', waterBrandId: '', waterCustomized: true, waterTdsPpm: '45', waterHardnessPpm: '18', waterAlkalinityPpm: '12', waterNotes: 'low mineral clarity AeroPress stress water' } },
  { id: 'manual-volvic-like', label: 'manual Volvic-like 130/63/61', risk: 'moderate_upper_buffer', input: { waterMode: 'manual', waterBrandId: '', waterCustomized: true, waterTdsPpm: '130', waterHardnessPpm: '63', waterAlkalinityPpm: '61', waterNotes: 'Volvic-like moderate mineral upper-buffered water' } },
  { id: 'manual-buffered', label: 'manual buffered 170/80/110', risk: 'high_buffer', input: { waterMode: 'manual', waterBrandId: '', waterCustomized: true, waterTdsPpm: '170', waterHardnessPpm: '80', waterAlkalinityPpm: '110', waterNotes: 'upper-buffer AeroPress stress water' } },
  { id: 'manual-hard', label: 'manual hard 220/115/85', risk: 'hard', input: { waterMode: 'manual', waterBrandId: '', waterCustomized: true, waterTdsPpm: '220', waterHardnessPpm: '115', waterAlkalinityPpm: '85', waterNotes: 'harder AeroPress stress water' } },
];

const GRINDER_CASES = [
  { id: '1zpresso-k-ultra', label: '1Zpresso K-Ultra', patterns: [/1zpresso.*k-ultra/i, /k-ultra/i], confidence: 'trusted' },
  { id: 'kingrinder-k6', label: 'KINGrinder K6', patterns: [/kingrinder.*k6/i, /\bk6\b/i], confidence: 'trusted' },
  { id: 'comandante-c40', label: 'Comandante C40', patterns: [/comandante.*c40/i, /\bc40\b/i], confidence: 'trusted' },
  { id: 'timemore-c2', label: 'Timemore C2', patterns: [/timemore.*c2/i], confidence: 'entry_filter' },
  { id: 'baratza-encore', label: 'Baratza Encore', patterns: [/baratza.*encore/i], confidence: 'entry_filter' },
  { id: 'feima-600n', label: 'Feima 600N', patterns: [/feima|600n|murane/i], confidence: 'low_confidence' },
];

const BROKEN_COPY_PATTERN = /\$(?:\d+|\{)|\b(?:undefined|null|NaN|\[object Object\]|ActionAction|Action\s+Action|Aksi\s+Aksi|Pressgentle|Stophiss|Programbloom|Valveset|Press\s+\$1\s+seconds)\b|(?:2:0|1:5|3:0)\b/i;
const AEROPRESS_METHOD_LEAK_PATTERN = /\b(drawdown|air turun|final pour|tuang akhir|bloom pour|blooming|v60|center-to-mid|filter wall|bed drawdown|wall chasing|flat bed)\b/i;
const ENGLISH_LEAK_IN_ID = /\b(?:Starting grind|Total Water|Final Ratio|Temperature|Brew Guide|Additional details|Edit inputs|Guide complete|community\/profile autofill|Verify by rasa or meter|Water hardness is rendah|low-mineral clarity water|Bean Data Accuracy|Risk bean|Fully Washed|Moderate mineral|upper-buffered water|flow rate|contact time)\b/i;
const INDONESIAN_LEAK_IN_EN = /\b(?:Seduh|Gilingan|Air turun|Tambah|Simpan|Rasa|Suhu|Keyakinan|Panduan|Catatan|Koleksi|Tuang|Aduk|Rendam|Tekan|Sajikan)\b/i;

function git(command, fallback = 'unknown') {
  try {
    return execSync(command, { cwd: ROOT, encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function installCatalogFetch() {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    const filePath = url.startsWith('/data/')
      ? path.join(ROOT, 'apps/web/public', url)
      : path.join(ROOT, url);
    const body = await fs.promises.readFile(filePath, 'utf8');
    return { ok: true, json: async () => JSON.parse(body) };
  });
  return () => {
    globalThis.fetch = previousFetch;
  };
}

async function loadCatalog() {
  const restore = installCatalogFetch();
  try {
    return await loadAiBrewCatalog();
  } finally {
    restore();
  }
}

function readSourceBackedBeans() {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, SOURCE_BACKED_FILTER_BEAN_FIXTURE), 'utf8'));
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items.map((item) => ({
      id: item.id,
      label: `${item.roaster || 'Source'} ${item.lotName || item.id}`,
      origin: item.origin || item.region || '',
      process: item.process || '',
      variety: item.variety || '',
      expected: item.expectedCharacter || 'source-backed coffee fixture',
      sourceBacked: true,
      sourceUrl: item.sourceUrl || '',
      missingFields: item.missingFields || [],
    }));
  } catch {
    return [];
  }
}

function normalizeCatalogValue(catalogItems, value) {
  const raw = String(value || '').trim();
  if (!raw) return { id: '', custom: '' };
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const aliases = {
    anaerobic_natural: 'anaerobic_natural',
    black_honey: 'black_honey',
    canephora: 'robusta',
    catimor: 'catimor',
    catuai: 'catuai',
    caturra: 'caturra',
    extended_natural: 'natural_extended_fermentation',
    geisha: 'geisha',
    gesha: 'geisha',
    honey_process: 'honey',
    landrace: 'ethiopian_landrace',
    mixed_variety: 'custom',
    natural_process: 'natural',
    p88: 'custom',
    pink_bourbon: 'pink_bourbon',
    sl28_sl34: 'sl28_sl34',
    wet_hulled: 'wet_hulled',
    yellow_bourbon: 'yellow_bourbon',
  };
  const candidate = aliases[slug] || slug;
  if (candidate !== 'custom' && catalogItems.some((item) => item.id === candidate)) {
    return { id: candidate, custom: '' };
  }
  return { id: 'custom', custom: raw };
}

function findByPattern(collection, patterns) {
  return collection.find((item) => patterns.some((pattern) => pattern.test(`${item.id} ${item.name || ''}`)));
}

function resolveGrinder(catalog, grinderCase) {
  return findByPattern(catalog.grinders, grinderCase.patterns) || catalog.grinders[0];
}

function buildBeanPool() {
  const sourceBeans = readSourceBackedBeans();
  return [...sourceBeans, ...FALLBACK_BEANS];
}

function resolveTargetWaterMl(doseG, style, caseIndex, styleIndex) {
  const kind = TARGET_WATER_KIND_OPTIONS[(caseIndex * 11 + styleIndex * 3) % TARGET_WATER_KIND_OPTIONS.length];
  if (kind === 'planner-default') return '';
  const dose = Number(doseG);
  const min = Math.ceil(Math.max(60, dose * 10.25));
  const max = Math.floor(Math.min(320, dose * 17.75));
  const chamberCap = style === 'inverted' ? 220 : 240;
  const normalHigh = style === 'bypass' || style === 'auto'
    ? Math.min(max, 300)
    : Math.min(max, chamberCap);
  const options = {
    'low-edge': min,
    'light-normal': Math.round(Math.min(normalHigh, Math.max(min, dose * 13))),
    'standard-normal': Math.round(Math.min(normalHigh, Math.max(min, dose * 14))),
    'upper-normal': Math.round(Math.min(normalHigh, Math.max(min, dose * 15))),
    'high-edge': normalHigh,
  };
  return String(options[kind] || options['standard-normal']);
}

function scenarioFor(catalog, beanPool, style, styleIndex, caseIndex) {
  const dripper = findByPattern(catalog.drippers, [/^aeropress$/i, /aeropress/i]);
  const bean = beanPool[(caseIndex * 17 + styleIndex * 19) % beanPool.length];
  const targetProfileId = TARGET_PROFILE_IDS[(caseIndex + styleIndex) % TARGET_PROFILE_IDS.length];
  const roastLevel = ROAST_LEVELS[(Math.floor(caseIndex / TARGET_PROFILE_IDS.length) + styleIndex) % ROAST_LEVELS.length];
  const water = WATER_CASES[(Math.floor(caseIndex / (TARGET_PROFILE_IDS.length * ROAST_LEVELS.length)) + styleIndex) % WATER_CASES.length];
  const doseG = DOSE_OPTIONS[(Math.floor(caseIndex / 11) + styleIndex) % DOSE_OPTIONS.length];
  const targetWaterMl = resolveTargetWaterMl(doseG, style, caseIndex, styleIndex);
  const grinderCase = GRINDER_CASES[(caseIndex * 7 + styleIndex) % GRINDER_CASES.length];
  const grinder = resolveGrinder(catalog, grinderCase);
  const processValue = normalizeCatalogValue(catalog.processes, bean.process);
  const varietyValue = normalizeCatalogValue(catalog.varieties, bean.variety);
  return {
    id: `${style}-${String(caseIndex + 1).padStart(4, '0')}`,
    style,
    styleIndex,
    caseIndex,
    bean,
    targetProfileId,
    roastLevel,
    water,
    doseG,
    targetWaterMl,
    grinderCase,
    grinder,
    input: {
      ...createDefaultAiBrewFormState(catalog),
      ...water.input,
      brewMode: 'hot',
      dripperId: dripper.id,
      grinderId: grinder.id,
      coffeeName: `${bean.label} | AeroPress ${style} ${targetProfileId} ${roastLevel}`,
      process: processValue.id,
      customProcess: processValue.id === 'custom' ? processValue.custom || bean.process || bean.label : '',
      variety: varietyValue.id,
      customVariety: varietyValue.id === 'custom' ? varietyValue.custom || bean.variety || bean.label : '',
      roastLevel,
      targetProfileId,
      doseG,
      targetWaterMl,
      targetRatio: '',
      targetTempC: '',
      aeropressStyle: style,
    },
  };
}

function addReason(reasons, code, message) {
  reasons.push({ code, message });
}

function resolveGuideTutorials(plan, guide) {
  return (guide || []).map((step) => {
    const context = {
      methodFamily: plan.methodFamily,
      recipeStyle: plan.recipeStyle,
      actionType: step.actionType,
      brewMode: plan.brewMode,
      hasWarning: (step.warnings || []).length > 0,
      targetProfileId: plan.targetProfileId,
      roastLevel: plan.roastLevel,
    };
    return {
      actionType: step.actionType,
      label: step.label,
      startSeconds: step.startSeconds,
      en: resolveWorkflowTutorialDetail({ ...context, language: 'en' }),
      id: resolveWorkflowTutorialDetail({ ...context, language: 'id' }),
    };
  });
}

function collectLocalizedText(plan, guide, language, tutorialEntries) {
  const parts = [
    plan.summary,
    plan.grindRecommendation,
    plan.waterMinerals?.styleLabel,
    plan.extractionRationale?.ratio,
    plan.extractionRationale?.temperature,
    plan.extractionRationale?.time,
    plan.extractionRationale?.grind,
    plan.extractionRationale?.pour,
    ...(plan.extractionRationale?.warnings || []),
    ...plan.notes,
    ...plan.warnings,
    ...(plan.confidenceNotes || []),
    ...(guide || []).flatMap((step) => [
      localizeAiBrewStepLabel(step.label, language),
      step.primaryText,
      step.secondaryText || '',
      step.note || '',
      step.hybridInstruction || '',
      ...(step.techniqueChips || []).flatMap((chip) => [chip.label, chip.value]),
      ...(step.warnings || []),
    ]),
    ...tutorialEntries.map((entry) => language === 'id' ? entry.id : entry.en),
    plan.targetProfileLabel,
  ].filter(Boolean);
  return parts.map((part) => localizeAiBrewDynamicText(String(part), language)).join('\n');
}

function collectRawText(plan, guide, tutorialEntries) {
  return [
    plan.summary,
    plan.grindRecommendation,
    plan.waterMinerals?.styleLabel,
    plan.extractionRationale?.ratio,
    plan.extractionRationale?.temperature,
    plan.extractionRationale?.time,
    plan.extractionRationale?.grind,
    plan.extractionRationale?.pour,
    ...(plan.extractionRationale?.warnings || []),
    ...plan.notes,
    ...plan.warnings,
    ...(plan.confidenceNotes || []),
    ...(guide || []).flatMap((step) => [
      step.label,
      step.primaryText,
      step.secondaryText || '',
      step.note || '',
      step.hybridInstruction || '',
      ...(step.techniqueChips || []).flatMap((chip) => [chip.label, chip.value]),
      ...(step.warnings || []),
    ]),
    ...tutorialEntries.flatMap((entry) => [entry.en, entry.id]),
  ].filter(Boolean).join('\n');
}

function validateCopyAndTutorial(plan, guide, tutorialEntries, reasons) {
  const textId = collectLocalizedText(plan, guide, 'id', tutorialEntries);
  const textEn = collectLocalizedText(plan, guide, 'en', tutorialEntries);
  const rawText = collectRawText(plan, guide, tutorialEntries);
  if (BROKEN_COPY_PATTERN.test(rawText) || BROKEN_COPY_PATTERN.test(textId) || BROKEN_COPY_PATTERN.test(textEn)) {
    addReason(reasons, 'broken_copy', 'placeholder, undefined, NaN, or broken generated copy found');
  }
  if (AEROPRESS_METHOD_LEAK_PATTERN.test(rawText)) {
    addReason(reasons, 'aeropress_method_vocabulary_leak', 'AeroPress output leaked pour-over vocabulary');
  }
  if (ENGLISH_LEAK_IN_ID.test(textId)) {
    addReason(reasons, 'id_language_leak', 'Indonesian localized output leaked critical English fragments');
  }
  if (INDONESIAN_LEAK_IN_EN.test(textEn)) {
    addReason(reasons, 'en_language_leak', 'English localized output leaked Indonesian action fragments');
  }
  for (const step of guide) {
    if (!step.primaryText || step.primaryText.length < 8 || step.primaryText.length > 220) {
      addReason(reasons, 'guide_primary_compactness', `${step.actionType} primary text length ${step.primaryText?.length || 0} outside compact range`);
    }
    if (step.secondaryText && step.secondaryText.length > 260) {
      addReason(reasons, 'guide_secondary_compactness', `${step.actionType} secondary text length ${step.secondaryText.length} outside compact range`);
    }
  }
  for (const entry of tutorialEntries) {
    const combined = `${entry.en} ${entry.id}`;
    if (!entry.en || entry.en.length < 20 || entry.en.length > 220) {
      addReason(reasons, 'tutorial_length_en', `${entry.actionType} English tutorial length invalid`);
    }
    if (!entry.id || entry.id.length < 20 || entry.id.length > 240) {
      addReason(reasons, 'tutorial_length_id', `${entry.actionType} Indonesian tutorial length invalid`);
    }
    if (BROKEN_COPY_PATTERN.test(combined)) {
      addReason(reasons, 'tutorial_broken_copy', `${entry.actionType} tutorial has broken copy`);
    }
    if (entry.actionType === 'stir') {
      if (!/\b(stir|swirl|aduk|putar)\b/i.test(combined)) addReason(reasons, 'tutorial_stir_collision', 'stir tutorial does not discuss stirring');
      if (/\b(pour water|tuang air|fill water|isi air)\b/i.test(combined)) addReason(reasons, 'tutorial_stir_charge_collision', 'stir tutorial reuses charge language');
    }
    if (entry.actionType === 'stop') {
      if (!/\b(stop|hiss|berhenti|desis|pressure|tekanan)\b/i.test(combined)) addReason(reasons, 'tutorial_stop_missing_stop', 'stop tutorial missing stop-before-hiss pressure cue');
      if (/\b(add measured bypass|serve|sajikan|bypass terukur|aduk cangkir)\b/i.test(combined)) addReason(reasons, 'tutorial_stop_collision', 'stop tutorial collided with dilute/serve copy');
    }
    if (entry.actionType === 'wait') {
      if (plan.recipeStyle !== 'inverted') addReason(reasons, 'tutorial_wait_non_inverted', `wait tutorial generated for non-inverted style ${plan.recipeStyle}`);
      if (!/\b(flip|inverted|cap|balik|terbalik|tutup)\b/i.test(combined)) addReason(reasons, 'tutorial_wait_missing_flip', 'wait tutorial missing safe flip cue');
    }
    if (entry.actionType === 'dilute') {
      if (plan.recipeStyle !== 'bypass') addReason(reasons, 'tutorial_dilute_non_bypass', `dilute tutorial generated for non-bypass style ${plan.recipeStyle}`);
      if (!/\b(after pressing|setelah tekan|post-press|bypass)\b/i.test(combined)) addReason(reasons, 'tutorial_dilute_missing_post_press', 'dilute tutorial missing post-press bypass cue');
    }
  }
  return { textId, textEn, rawText };
}

function validateNumericEnvelope(plan, scenario, reasons) {
  const numericFields = [
    ['doseG', plan.doseG],
    ['totalWaterMl', plan.totalWaterMl],
    ['hotWaterMl', plan.hotWaterMl],
    ['waterTempC', plan.waterTempC],
    ['totalTimeSeconds', plan.totalTimeSeconds],
    ['finalBeverageRatio', plan.finalBeverageRatio],
    ['hotExtractionRatio', plan.hotExtractionRatio],
  ];
  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value)) addReason(reasons, 'numeric_not_finite', `${field} is not finite`);
  }
  if (plan.methodFamily !== 'aeropress') addReason(reasons, 'wrong_method', `expected aeropress, got ${plan.methodFamily}`);
  if (plan.targetProfileId !== scenario.targetProfileId) addReason(reasons, 'target_not_preserved', `expected target ${scenario.targetProfileId}, got ${plan.targetProfileId}`);
  if (plan.roastLevel !== scenario.roastLevel) addReason(reasons, 'roast_not_preserved', `expected roast ${scenario.roastLevel}, got ${plan.roastLevel}`);
  if (plan.finalBeverageRatio < 8 || plan.finalBeverageRatio > 20) addReason(reasons, 'ratio_outside_aeropress_bounds', `final ratio 1:${plan.finalBeverageRatio} outside AeroPress stress bounds`);
  if (plan.hotExtractionRatio < 8 || plan.hotExtractionRatio > 20) addReason(reasons, 'hot_ratio_outside_aeropress_bounds', `hot ratio 1:${plan.hotExtractionRatio} outside AeroPress stress bounds`);
  if (plan.waterTempC < 80 || plan.waterTempC > 96) addReason(reasons, 'temperature_outside_aeropress_bounds', `temperature ${plan.waterTempC}C outside AeroPress stress bounds`);
  if (plan.totalTimeSeconds < 70 || plan.totalTimeSeconds > 230) addReason(reasons, 'time_outside_aeropress_bounds', `finish ${plan.totalTimeSeconds}s outside AeroPress stress bounds`);
  const finalRatio = Math.round((plan.totalWaterMl / plan.doseG) * 100) / 100;
  const hotRatio = Math.round((plan.hotWaterMl / plan.doseG) * 100) / 100;
  if (Math.abs(finalRatio - plan.finalBeverageRatio) > 0.06) addReason(reasons, 'final_ratio_invariant', `final ratio invariant mismatch ${finalRatio} vs ${plan.finalBeverageRatio}`);
  if (Math.abs(hotRatio - plan.hotExtractionRatio) > 0.06) addReason(reasons, 'hot_ratio_invariant', `hot ratio invariant mismatch ${hotRatio} vs ${plan.hotExtractionRatio}`);
}

function validateCapacityAndBypass(plan, guide, reasons) {
  const actionOrder = new Map(guide.map((step, index) => [step.actionType, { index, startSeconds: step.startSeconds }]));
  const dilute = actionOrder.get('dilute');
  const press = actionOrder.get('press');
  if (plan.recipeStyle === 'bypass') {
    if (plan.hotWaterMl >= plan.totalWaterMl) addReason(reasons, 'bypass_missing_split', 'bypass style did not split chamber water and bypass water');
    if (plan.hotWaterMl > 240) addReason(reasons, 'bypass_chamber_over_capacity', `bypass chamber ${plan.hotWaterMl} ml exceeds 240 ml`);
    if (!dilute) addReason(reasons, 'bypass_missing_dilute_action', 'bypass style missing dilute action');
    if (dilute && press && dilute.startSeconds <= press.startSeconds) addReason(reasons, 'bypass_before_press', 'bypass dilution appears before press');
  } else {
    if (Math.abs(plan.totalWaterMl - plan.hotWaterMl) > 0.01) addReason(reasons, 'non_bypass_has_dilution', `${plan.recipeStyle} added bypass/dilution water`);
    if (dilute) addReason(reasons, 'non_bypass_dilute_action', `${plan.recipeStyle} generated dilute action`);
  }
  const chamberCap = plan.recipeStyle === 'inverted' ? 220 : 240;
  if (plan.hotWaterMl > chamberCap) addReason(reasons, 'chamber_over_capacity', `${plan.recipeStyle} chamber ${plan.hotWaterMl} ml exceeds ${chamberCap} ml`);
}

function validateRoastDirection(plan, reasons) {
  const brightStyle = plan.recipeStyle === 'bright_clean';
  if (plan.roastLevel === 'light' || plan.roastLevel === 'medium_light') {
    const floor = brightStyle ? 91 : 90;
    if (plan.waterTempC < floor) addReason(reasons, 'light_roast_temperature_floor', `${plan.recipeStyle}/${plan.roastLevel} temperature ${plan.waterTempC}C below ${floor}C`);
  }
  if (plan.roastLevel === 'medium_dark') {
    const cap = brightStyle ? 90 : 89;
    if (plan.waterTempC > cap) addReason(reasons, 'medium_dark_temperature_cap', `${plan.recipeStyle}/${plan.roastLevel} temperature ${plan.waterTempC}C above ${cap}C`);
  }
  if (plan.roastLevel === 'dark') {
    const cap = brightStyle ? 89 : 88;
    if (plan.waterTempC > cap) addReason(reasons, 'dark_temperature_cap', `${plan.recipeStyle}/${plan.roastLevel} temperature ${plan.waterTempC}C above ${cap}C`);
  }
}

function aeropressChamberCapFor(style) {
  return style === 'inverted' ? 220 : 240;
}

function canAssertRelativeRatio(plan, balancePlan, direction) {
  if (plan.recipeStyle === 'bypass' || balancePlan.recipeStyle === 'bypass') return true;
  const planCap = aeropressChamberCapFor(plan.recipeStyle);
  const balanceCap = aeropressChamberCapFor(balancePlan.recipeStyle);
  const balanceAtCap = balancePlan.totalWaterMl >= balanceCap - 0.01;
  const planAtCap = plan.totalWaterMl >= planCap - 0.01;
  if (direction === 'open' && balanceAtCap && planAtCap) return false;
  if (direction === 'tight' && balanceAtCap && planAtCap) return false;
  return true;
}

function validateTargetDirection(plan, balancePlan, scenario, text, reasons) {
  const target = scenario.targetProfileId;
  if (target === 'balance_clean') return;
  const openRatioCheckAllowed = !scenario.targetWaterMl && canAssertRelativeRatio(plan, balancePlan, 'open');
  const tightRatioCheckAllowed = !scenario.targetWaterMl && canAssertRelativeRatio(plan, balancePlan, 'tight');
  if (target === 'more_acidity') {
    if (openRatioCheckAllowed && plan.finalBeverageRatio < balancePlan.finalBeverageRatio + 0.25) addReason(reasons, 'target_acidity_ratio_direction', 'acidity target did not open ratio vs balance');
    if (plan.totalTimeSeconds > balancePlan.totalTimeSeconds - 5) addReason(reasons, 'target_acidity_time_direction', 'acidity target did not shorten contact vs balance');
    if (!/\b(acidity|keasaman|bright|cerah|2-3x|2-3 kali|2-3 times)\b/i.test(text)) addReason(reasons, 'target_acidity_copy_missing', 'acidity target copy/stir cue missing');
  }
  if (target === 'floral_transparent') {
    if (openRatioCheckAllowed && plan.finalBeverageRatio < balancePlan.finalBeverageRatio + 0.35) addReason(reasons, 'target_floral_ratio_direction', 'floral target did not open ratio vs balance');
    if (plan.totalTimeSeconds > balancePlan.totalTimeSeconds - 10) addReason(reasons, 'target_floral_time_direction', 'floral target did not shorten contact vs balance');
    if (!/\b(floral|transparent|transparan|clarity|kejernihan|2x|2 kali|2 times)\b/i.test(text)) addReason(reasons, 'target_floral_copy_missing', 'floral target copy/agitation cue missing');
  }
  if (target === 'fruit_forward') {
    if (openRatioCheckAllowed && plan.finalBeverageRatio < balancePlan.finalBeverageRatio + 0.1) addReason(reasons, 'target_fruit_ratio_direction', 'fruit target did not open ratio vs balance');
    if (plan.totalTimeSeconds > balancePlan.totalTimeSeconds) addReason(reasons, 'target_fruit_time_direction', 'fruit target did not stay faster/equal vs balance');
    if (!/\b(fruit|buah|aroma|aromatics)\b/i.test(text)) addReason(reasons, 'target_fruit_copy_missing', 'fruit target copy missing');
  }
  if (target === 'more_sweetness' || target === 'soft_round') {
    if (tightRatioCheckAllowed && plan.finalBeverageRatio > balancePlan.finalBeverageRatio + 0.05) addReason(reasons, 'target_sweet_ratio_direction', `${target} target ran thinner than balance`);
    if (plan.totalTimeSeconds < balancePlan.totalTimeSeconds) addReason(reasons, 'target_sweet_time_direction', `${target} target ran faster than balance`);
    if (!/\b(sweet|manis|round|bulat|lembut)\b/i.test(text)) addReason(reasons, 'target_sweet_copy_missing', `${target} sweetness/round copy missing`);
  }
  if (target === 'more_body' || target === 'dense_comforting') {
    if (tightRatioCheckAllowed && plan.finalBeverageRatio > balancePlan.finalBeverageRatio - 0.2) addReason(reasons, 'target_body_ratio_direction', `${target} target did not tighten ratio vs balance`);
    if (plan.totalTimeSeconds < balancePlan.totalTimeSeconds + 10) addReason(reasons, 'target_body_time_direction', `${target} target did not extend contact vs balance`);
    if (!/\b(body|tekstur|dense|padat|comfort|berisi|4x|4 kali|4 times|5x|5 kali|5 times|25-35)\b/i.test(text)) addReason(reasons, 'target_body_copy_missing', `${target} body copy/agitation cue missing`);
  }
}

function validateAntiHallucination(plan, reasons) {
  const guard = validateBrewPlanOutput(plan);
  if (!guard.allowed) addReason(reasons, 'anti_hallucination_guard_blocked', guard.reason || 'anti-hallucination guard blocked output');
}

function runScenario(catalog, scenario) {
  const reasons = [];
  let plan = null;
  let balancePlan = null;
  let guide = [];
  let tutorialEntries = [];
  let text = '';
  try {
    plan = buildAiBrewPlan(scenario.input, catalog);
    const balanceInput = { ...scenario.input, targetProfileId: 'balance_clean' };
    balancePlan = scenario.targetProfileId === 'balance_clean' ? plan : buildAiBrewPlan(balanceInput, catalog);
    guide = plan.workflowGuideSteps || [];
    tutorialEntries = resolveGuideTutorials(plan, guide);
    const copy = validateCopyAndTutorial(plan, guide, tutorialEntries, reasons);
    text = `${copy.rawText}\n${copy.textId}\n${copy.textEn}`;
    validateNumericEnvelope(plan, scenario, reasons);
    validateCapacityAndBypass(plan, guide, reasons);
    validateRoastDirection(plan, reasons);
    validateTargetDirection(plan, balancePlan, scenario, text, reasons);
    validateAntiHallucination(plan, reasons);
  } catch (error) {
    addReason(reasons, 'planner_crash', error instanceof Error ? error.stack || error.message : String(error));
  }
  const passed = reasons.length === 0;
  return {
    id: scenario.id,
    selectedStyle: scenario.style,
    effectiveStyle: plan?.recipeStyle || null,
    passed,
    score: passed ? 100 : Math.max(0, 100 - reasons.length * 12),
    reasons,
    input: {
      bean: scenario.bean.label,
      sourceBacked: scenario.bean.sourceBacked,
      sourceUrl: scenario.bean.sourceUrl || null,
      targetProfileId: scenario.targetProfileId,
      roastLevel: scenario.roastLevel,
      water: scenario.water.label,
      waterRisk: scenario.water.risk,
      grinder: scenario.grinderCase.label,
      grinderConfidence: scenario.grinderCase.confidence,
      doseG: scenario.doseG,
      targetWaterMl: scenario.targetWaterMl || null,
    },
    output: plan ? {
      methodFamily: plan.methodFamily,
      recipeStyle: plan.recipeStyle,
      doseG: plan.doseG,
      hotWaterMl: plan.hotWaterMl,
      totalWaterMl: plan.totalWaterMl,
      bypassMl: Number((plan.totalWaterMl - plan.hotWaterMl).toFixed(1)),
      finalRatio: Number(plan.finalBeverageRatio.toFixed(2)),
      hotRatio: Number(plan.hotExtractionRatio.toFixed(2)),
      waterTempC: plan.waterTempC,
      finishSeconds: plan.totalTimeSeconds,
      targetProfileId: plan.targetProfileId,
      roastLevel: plan.roastLevel,
      waterClassification: plan.waterClassification,
      guideStepCount: guide.length,
      tutorialActionCount: tutorialEntries.length,
      guideSnapshot: guide.slice(0, 9).map((step) => `${step.label}: ${step.primaryText || step.note || ''}`).join(' | '),
    } : null,
  };
}

function increment(map, key) {
  map[key || 'unknown'] = (map[key || 'unknown'] || 0) + 1;
}

function summarize(cases, sha) {
  const styleCounts = {};
  const effectiveStyleCounts = {};
  const targetCounts = {};
  const roastCounts = {};
  const waterCounts = {};
  const doseCounts = {};
  const targetWaterCounts = {};
  const beanCounts = {};
  const reasonCounts = {};
  for (const item of cases) {
    increment(styleCounts, item.selectedStyle);
    increment(effectiveStyleCounts, item.effectiveStyle);
    increment(targetCounts, item.input.targetProfileId);
    increment(roastCounts, item.input.roastLevel);
    increment(waterCounts, item.input.water);
    increment(doseCounts, String(item.input.doseG));
    increment(targetWaterCounts, item.input.targetWaterMl || 'planner-default');
    increment(beanCounts, item.input.bean);
    for (const reason of item.reasons) increment(reasonCounts, reason.code);
  }
  const passCount = cases.filter((item) => item.passed).length;
  const failCount = cases.length - passCount;
  const coverageFailures = [];
  for (const style of AEROPRESS_STYLES) {
    if (styleCounts[style] !== CASES_PER_STYLE) coverageFailures.push(`${style} expected ${CASES_PER_STYLE}, got ${styleCounts[style] || 0}`);
  }
  for (const target of TARGET_PROFILE_IDS) {
    if (!targetCounts[target]) coverageFailures.push(`missing target ${target}`);
  }
  for (const roast of ROAST_LEVELS) {
    if (!roastCounts[roast]) coverageFailures.push(`missing roast ${roast}`);
  }
  return {
    generatedAt: new Date().toISOString(),
    branch: git('git branch --show-current'),
    sha,
    shortSha: git('git rev-parse --short=12 HEAD', 'local'),
    remoteMainSha: git('git rev-parse origin/main', 'unknown'),
    caseCount: cases.length,
    expectedCaseCount: AEROPRESS_STYLES.length * CASES_PER_STYLE,
    casesPerStyle: CASES_PER_STYLE,
    passCount,
    failCount,
    averageScore: Number((cases.reduce((sum, item) => sum + item.score, 0) / Math.max(cases.length, 1)).toFixed(1)),
    styleCounts,
    effectiveStyleCounts,
    targetCounts,
    roastCounts,
    waterCounts,
    doseCounts,
    targetWaterCounts,
    beanCount: Object.keys(beanCounts).length,
    sourceBackedCaseCount: cases.filter((item) => item.input.sourceBacked).length,
    reasonCounts,
    coverageFailures,
    verdict: failCount === 0 && coverageFailures.length === 0
      ? 'AEROPRESS STYLE STRESS STRONG / REAL BREW VALIDATION REQUIRED'
      : 'AEROPRESS STYLE STRESS FAILED',
    honestyBoundary: 'This 7000-case gate is deterministic software/barista validation, not 7000 physical brews.',
  };
}

function writeArtifacts(summary, cases) {
  const artifactDir = path.join(ROOT, 'artifacts', 'ai-brew-audit', 'aeropress-style-stress', summary.shortSha);
  fs.mkdirSync(artifactDir, { recursive: true });
  const failures = cases.filter((item) => !item.passed);
  fs.writeFileSync(path.join(artifactDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(artifactDir, 'cases.json'), `${JSON.stringify(cases, null, 2)}\n`);
  fs.writeFileSync(path.join(artifactDir, 'failures.json'), `${JSON.stringify(failures, null, 2)}\n`);
  fs.writeFileSync(
    path.join(artifactDir, 'failures.md'),
    failures.length
      ? `# AeroPress Style Stress Failures\n\n${failures.slice(0, 200).map((item) => `- ${item.id}: ${item.reasons.map((reason) => reason.code).join(', ')}`).join('\n')}\n`
      : '# AeroPress Style Stress Failures\n\nNo software-blocking failures found.\n',
  );
  fs.writeFileSync(
    path.join(artifactDir, 'style-summary.csv'),
    [
      'style,count,pass,fail,averageScore',
      ...AEROPRESS_STYLES.map((style) => {
        const styleCases = cases.filter((item) => item.selectedStyle === style);
        const pass = styleCases.filter((item) => item.passed).length;
        const average = Number((styleCases.reduce((sum, item) => sum + item.score, 0) / Math.max(styleCases.length, 1)).toFixed(1));
        return [style, styleCases.length, pass, styleCases.length - pass, average].join(',');
      }),
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(artifactDir, 'guide-snapshots.md'),
    [
      '# AeroPress Style Stress Guide Snapshots',
      '',
      ...cases.filter((_, index) => index % 137 === 0).slice(0, 60).map((item) => [
        `## ${item.id}`,
        '',
        `- Bean: ${item.input.bean}`,
        `- Target: ${item.input.targetProfileId}`,
        `- Roast: ${item.input.roastLevel}`,
        `- Water: ${item.input.water}`,
        `- Output: ${item.output ? `${item.output.hotWaterMl} ml hot / ${item.output.totalWaterMl} ml total / 1:${item.output.finalRatio}` : 'no plan'}`,
        `- Guide: ${item.output?.guideSnapshot || 'no guide'}`,
        '',
      ].join('\n')),
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(artifactDir, 'improvement-prompt.md'),
    [
      '# AeroPress Style Stress Improvement Prompt',
      '',
      summary.failCount === 0
        ? 'No blocking software failures. Keep this gate focused on AeroPress capacity, target/roast direction, bilingual copy, and tutorial/action synchronization.'
        : 'Fix blocking failures by touching only AeroPress calibration, guide, tutorial, localization, or planner AeroPress branches. Do not change other method recipe math.',
      '',
      `Verdict: ${summary.verdict}`,
      `Cases: ${summary.passCount}/${summary.caseCount} passed`,
    ].join('\n'),
  );
  return artifactDir;
}

const catalog = await loadCatalog();
const beanPool = buildBeanPool();
const sha = git('git rev-parse HEAD', 'local');
const cases = [];

for (const [styleIndex, style] of AEROPRESS_STYLES.entries()) {
  for (let caseIndex = 0; caseIndex < CASES_PER_STYLE; caseIndex += 1) {
    const scenario = scenarioFor(catalog, beanPool, style, styleIndex, caseIndex);
    cases.push(runScenario(catalog, scenario));
  }
}

const summary = summarize(cases, sha);
const artifactDir = writeArtifacts(summary, cases);
summary.artifactDir = path.relative(ROOT, artifactDir).replace(/\\/g, '/');
fs.writeFileSync(path.join(artifactDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify(summary));

if (summary.failCount > 0 || summary.coverageFailures.length > 0) {
  process.exit(1);
}
