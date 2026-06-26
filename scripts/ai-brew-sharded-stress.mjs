import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
  supportsAiBrewIcedMode,
} from '../apps/web/src/features/ai-brew/planner.ts';
import { validateBrewPlanOutput } from '../apps/web/src/features/ai-brew/antiHallucination.ts';
import { buildProductionAiBrewCatalogForStress } from '../tests/helpers/aiBrewStressMatrix.ts';
import {
  buildGrindSizeAdvice,
  getRatioMethodFamily,
} from '../apps/web/src/features/barista-tools/grindSizeAdvisor.ts';
import { getGrinderSafetyProfile } from '../apps/web/src/features/ai-brew/grinderSafetyGuardrails.ts';
import { BREW_METHOD_PROFILES } from '../apps/web/src/features/barista-tools/brewProfiles.ts';

const ROOT = process.cwd();
const INDONESIA_BEAN_FIXTURE = 'tests/fixtures/ai-brew-indonesia-real-beans.json';
const ROAST_LEVELS = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
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
const WATER_CASES = [
  {
    id: 'balanced_manual',
    input: { waterMode: 'manual', waterTdsPpm: '95', waterHardnessPpm: '55', waterAlkalinityPpm: '40' },
  },
  {
    id: 'soft_clarity_manual',
    input: { waterMode: 'manual', waterTdsPpm: '55', waterHardnessPpm: '25', waterAlkalinityPpm: '18' },
  },
  {
    id: 'upper_buffer_manual',
    input: { waterMode: 'manual', waterTdsPpm: '140', waterHardnessPpm: '70', waterAlkalinityPpm: '65' },
  },
];
const METHOD_STYLE_FIELDS = {
  hario_switch: ['switchPresetId', ['', 'immersion_heavy_body', 'immersion_sweet', 'hybrid_balanced', 'v60_mode']],
  aeropress: ['aeropressStyle', ['auto', 'standard', 'inverted', 'bypass', 'sweet_body']],
  french_press: ['frenchPressStyle', ['auto', 'traditional', 'clean_decant', 'double_filter', 'sweet_immersion']],
  kalita_wave: ['kalitaWaveStyle', ['auto', 'traditional_flat_three', 'competition_fast_four', 'continuous_slow_stream']],
  clever_dripper: ['cleverDripperStyle', ['auto', 'classic_closed', 'reverse_water_first', 'double_stage_hybrid']],
  chemex: ['chemexStyle', ['auto', 'traditional_three_pour', 'competition_multi_pulse', 'continuous_center_pour']],
  moka_pot: ['mokaPotStyle', ['auto', 'traditional_stovetop', 'preheated_boiler', 'low_temp_controlled']],
  cold_brew: ['coldBrewStyle', ['auto', 'classic_toddy_immersion', 'cold_drip_tower', 'double_extraction_concentrate']],
  batch_brew: ['batchBrewStyle', ['auto', 'sca_gold_cup', 'heavy_batch_catering', 'bright_light_roast_batch']],
  siphon: ['siphonStyle', ['auto', 'traditional_vacuum_siphon', 'competition_triple_agitation', 'low_temp_delicate']],
  origami: ['origamiStyle', ['auto', 'cone_dripper_style', 'wave_dripper_style', 'competition_hybrid_flow']],
  april: ['aprilStyle', ['auto', 'april_flat_bottom_standard', 'april_continuous_slow', 'competition_two_pour']],
  melitta: ['melittaStyle', ['auto', 'traditional_melitta_one_pour', 'three_pour_melitta', 'dense_classic_extraction']],
  kono: ['konoStyle', ['auto', 'kono_meimon_traditional', 'kono_dripper_standard', 'kono_slow_drip_body']],
};

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function parseShardedOptions() {
  const mode = (argValue('mode') || process.env.AI_BREW_STRESS_MODE || 'brew10m').toLowerCase();
  const defaultTotal = mode === 'grinder1m' ? 1_000_000 : 10_000_000;
  const defaultShards = mode === 'grinder1m' ? 50 : 100;
  const total = parsePositiveInt(argValue('total') || process.env.AI_BREW_STRESS_TOTAL, defaultTotal);
  const shards = parsePositiveInt(argValue('shards') || process.env.AI_BREW_STRESS_SHARDS, defaultShards);
  const shard = parseNonNegativeInt(argValue('shard') || process.env.AI_BREW_STRESS_SHARD, 0);
  if (!['brew10m', 'grinder1m'].includes(mode)) {
    throw new Error(`Unknown mode "${mode}". Use brew10m or grinder1m.`);
  }
  if (shard >= shards) {
    throw new Error(`Shard index ${shard} must be lower than shard count ${shards}.`);
  }
  return { mode, total, shards, shard };
}

function currentSha() {
  if (process.env.RELEASE_PROOF_SHA) return process.env.RELEASE_PROOF_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
  try {
    return execSync('git rev-parse --short=12 HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf8'));
}

function visibleItems(items) {
  return items.filter((item) => !item.hidden && !item.deprecated);
}

function shardCaseCount(total, shards, shard) {
  if (shard >= total) return 0;
  return Math.floor((total - 1 - shard) / shards) + 1;
}

function pick(items, index) {
  return items[index % items.length];
}

function csvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, headers, rows) {
  fs.writeFileSync(filePath, [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n'));
}

function artifactDir(kind, options) {
  const sha = currentSha();
  const dir = path.join(
    ROOT,
    'artifacts',
    'ai-brew-audit',
    kind,
    sha,
    `shard-${String(options.shard).padStart(3, '0')}-of-${String(options.shards).padStart(3, '0')}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function collectUserFacingPlanText(plan) {
  return [
    plan.summary,
    plan.switchWhy,
    plan.switchWatch,
    ...(plan.notes || []),
    ...(plan.warnings || []),
    ...(plan.workflowValidation?.blockingErrors || []),
    ...(plan.workflowValidation?.warnings || []),
    ...(plan.workflowGuideSteps || []).flatMap((step) => [
      step.primaryText,
      step.secondaryText,
      ...step.techniqueChips.map((chip) => chip.value),
    ]),
    ...plan.steps.flatMap((step) => [step.label, step.note, step.hybridInstruction || '']),
  ].filter(Boolean).join(' ');
}

function methodStylePatch(methodFamily, brewMode, index) {
  const entry = METHOD_STYLE_FIELDS[methodFamily];
  if (!entry) return {};
  const [field, values] = entry;
  const value = pick(values, Math.floor(index / 7));
  if (field === 'switchPresetId' && brewMode === 'iced' && value && value !== 'iced_hybrid') return { switchPresetId: 'iced_hybrid' };
  return { [field]: value };
}

function buildBrewInput(index, catalog, dimensions) {
  const { drippers, grinders, beans } = dimensions;
  const dripper = pick(drippers, index);
  const methodFamily = dripper.methodFamily || 'v60';
  const supportsIced = supportsAiBrewIcedMode(catalog, dripper.id);
  const brewMode = supportsIced && Math.floor(index / drippers.length) % 2 === 1 ? 'iced' : 'hot';
  const targetProfileId = pick(TARGET_PROFILE_IDS, Math.floor(index / drippers.length));
  const roastLevel = pick(ROAST_LEVELS, Math.floor(index / (drippers.length * TARGET_PROFILE_IDS.length)));
  const bean = pick(beans, Math.floor(index / 11));
  const waterCase = pick(WATER_CASES, Math.floor(index / 17));
  const grinder = pick(grinders, Math.floor(index / 23));
  const switchRecoveryProbe = dripper.id === 'hario-switch-02' && index % 19 === 0;

  const doseG = methodFamily === 'espresso'
    ? '18'
    : methodFamily === 'cold_brew'
      ? '60'
      : methodFamily === 'batch_brew'
        ? '55'
        : switchRecoveryProbe
          ? '20'
          : String(pick([12, 15, 18, 20], Math.floor(index / 31)));
  const targetWaterMl = methodFamily === 'espresso'
    ? '40'
    : methodFamily === 'cold_brew'
      ? '600'
      : methodFamily === 'batch_brew'
        ? '700'
        : switchRecoveryProbe
          ? '300'
          : '';

  return {
    ...createDefaultAiBrewFormState(catalog),
    ...waterCase.input,
    ...methodStylePatch(methodFamily, brewMode, index),
    brewMode,
    coffeeName: `${bean.region} ${bean.lotName} ${brewMode} shard ${index}`,
    doseG,
    targetWaterMl,
    process: bean.process || '',
    variety: bean.variety || '',
    roastLevel: bean.roastLevel || roastLevel,
    dripperId: dripper.id,
    grinderId: grinder.id,
    targetProfileId: switchRecoveryProbe ? 'more_body' : targetProfileId,
    switchPresetId: switchRecoveryProbe ? 'immersion_heavy_body' : methodStylePatch(methodFamily, brewMode, index).switchPresetId || '',
  };
}

function validateBrewPlan(plan, requestedInput, reasons) {
  const guard = validateBrewPlanOutput(plan);
  if (!guard.allowed) reasons.push(`anti-hallucination guard failed: ${guard.reason || 'unknown'}`);
  if (plan.workflowValidation?.status === 'blocked') {
    reasons.push(`workflow validation blocked: ${(plan.workflowValidation.blockingErrors || []).join('; ')}`);
  }
  if (/\b(?:NaN|undefined|null)\b/.test(collectUserFacingPlanText(plan))) {
    reasons.push('user-facing recipe text contains NaN, undefined, or null');
  }
  if (plan.brewMode === 'iced' && Math.abs((plan.hotWaterMl + plan.iceMl) - plan.totalWaterMl) > 1) {
    reasons.push(`iced split mismatch: hot ${plan.hotWaterMl} + ice ${plan.iceMl} != total ${plan.totalWaterMl}`);
  }
  if (plan.methodFamily === 'hario_switch') {
    if (plan.switchStepValidation?.status === 'blocked') {
      reasons.push(`Switch final validation blocked: ${plan.switchStepValidation.message}`);
    }
    if (plan.switchTasteProgramme?.recoveryApplied) {
      if (plan.switchTasteProgramme.finalPresetStatus === 'blocked') {
        reasons.push('Switch recovery applied but final preset is still blocked');
      }
      if (/\bblocked\b|diblokir|memblokir/i.test(collectUserFacingPlanText(plan))) {
        reasons.push('Switch recoverable recipe leaked blocked copy to user-facing text');
      }
    }
  }
  if (requestedInput.brewMode === 'iced' && plan.brewMode === 'hot' && supportsAiBrewIcedMode(undefined, requestedInput.dripperId)) {
    reasons.push('requested iced mode fell back to hot despite iced support');
  }
}

function runBrew10m(options) {
  const catalog = buildProductionAiBrewCatalogForStress();
  const beans = readJson(INDONESIA_BEAN_FIXTURE).items;
  const dimensions = {
    drippers: visibleItems(catalog.drippers).filter((dripper) => dripper.id !== 'hario-switch'),
    grinders: visibleItems(catalog.grinders),
    beans,
  };
  const failures = [];
  const samples = [];
  const methodCounts = {};
  const targetCounts = {};
  const totalShardCases = shardCaseCount(options.total, options.shards, options.shard);
  let checked = 0;
  let recoveryCount = 0;

  for (let index = options.shard; index < options.total; index += options.shards) {
    checked += 1;
    const input = buildBrewInput(index, catalog, dimensions);
    const reasons = [];
    let plan = null;
    try {
      plan = buildAiBrewPlan(input, catalog);
      validateBrewPlan(plan, input, reasons);
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : String(error));
    }

    if (plan) {
      methodCounts[plan.methodFamily] = (methodCounts[plan.methodFamily] || 0) + 1;
      targetCounts[plan.targetProfileId] = (targetCounts[plan.targetProfileId] || 0) + 1;
      if (plan.switchTasteProgramme?.recoveryApplied) recoveryCount += 1;
      if (samples.length < 80 && (checked === 1 || checked % 257 === 0 || plan.switchTasteProgramme?.recoveryApplied)) {
        samples.push({
          index,
          brewMode: plan.brewMode,
          methodFamily: plan.methodFamily,
          dripperId: plan.dripper.id,
          grinderId: plan.grinder.id,
          targetProfileId: plan.targetProfileId,
          recoveryApplied: Boolean(plan.switchTasteProgramme?.recoveryApplied),
          switchPresetId: plan.switchPresetId,
          workflowStatus: plan.workflowValidation?.status,
        });
      }
    }

    if (reasons.length > 0) {
      failures.push({
        index,
        dripperId: input.dripperId,
        grinderId: input.grinderId,
        targetProfileId: input.targetProfileId,
        brewMode: input.brewMode,
        reasons,
      });
      if (failures.length > 250) break;
    }
  }

  const summary = {
    mode: 'brew10m',
    fullTotal: options.total,
    shards: options.shards,
    shard: options.shard,
    expectedShardCases: totalShardCases,
    checked,
    passed: checked - failures.length,
    failures: failures.length,
    recoveryCount,
    methodCounts,
    targetCounts,
    claim: 'Software stress validates recipe envelopes and guardrails; physical sensory certainty still requires real brew logs.',
  };
  writeArtifacts('brew-10m-sharded', options, summary, samples, failures);
  return { summary, failures };
}

function validateGrinderAdvice({ catalog, method, grinder, roastLevel, targetProfileId }, reasons) {
  const methodFamily = getRatioMethodFamily(method.id);
  const compatibility = getGrinderSafetyProfile(catalog, methodFamily, grinder);
  const advice = buildGrindSizeAdvice({
    catalog,
    methodId: method.id,
    grinderId: grinder.id,
    roastLevel,
    targetProfileId,
  });
  const text = [
    advice.primarySetting,
    advice.correctionRange,
    advice.correctionTip,
    advice.confidenceLabel,
    advice.sourceLabel,
    advice.compatibilityReason,
  ].join(' ');
  if (/\b(?:NaN|undefined|null)\b/.test(text)) reasons.push('grinder advice contains NaN, undefined, or null');
  if (!advice.primarySetting.trim()) reasons.push('grinder advice returned empty primary setting');
  if (advice.compatibilityState === 'unsupported') reasons.push('selectable grinder advice returned unsupported state');
  if (
    methodFamily === 'espresso'
    && !compatibility.selectable
    && (advice.compatibilitySelectable !== false || /\d/.test(advice.primarySetting))
  ) {
    reasons.push('filter-only grinder exposed numeric espresso setting or selectable state');
  }
  if (
    (grinder.verificationLevel === 'dataset_unverified' || advice.sourceKind === 'baseline_method')
    && ['official', 'community_verified'].includes(advice.confidenceKind)
  ) {
    reasons.push('fallback or dataset-unverified grinder overclaimed high confidence');
  }
  return { advice, compatibility, methodFamily };
}

function runGrinder1m(options) {
  const catalog = buildProductionAiBrewCatalogForStress();
  const grinders = visibleItems(catalog.grinders);
  const espressoMethod = BREW_METHOD_PROFILES.find((method) => method.id === 'espresso') || BREW_METHOD_PROFILES[0];
  const blockedEspressoGrinders = grinders.filter((grinder) => !getGrinderSafetyProfile(catalog, 'espresso', grinder).selectable);
  const selectableEspressoGrinders = grinders.filter((grinder) => getGrinderSafetyProfile(catalog, 'espresso', grinder).selectable);
  const targetProfileIds = catalog.targetProfiles.map((target) => target.id);
  const failures = [];
  const samples = [];
  const methodCounts = {};
  let checked = 0;
  let blockedEspresso = 0;
  let selectableEspresso = 0;
  let espressoBlockedCandidates = 0;
  let espressoSelectableCandidates = 0;

  for (let index = options.shard; index < options.total; index += options.shards) {
    checked += 1;
    const forceBlockedEspresso = checked % 19 === 1 && blockedEspressoGrinders.length > 0;
    const forceSelectableEspresso = checked % 19 === 2 && selectableEspressoGrinders.length > 0;
    const method = forceBlockedEspresso || forceSelectableEspresso ? espressoMethod : pick(BREW_METHOD_PROFILES, index);
    const grinder = forceBlockedEspresso
      ? pick(blockedEspressoGrinders, Math.floor(index / BREW_METHOD_PROFILES.length))
      : forceSelectableEspresso
        ? pick(selectableEspressoGrinders, Math.floor(index / BREW_METHOD_PROFILES.length))
        : pick(grinders, Math.floor(index / BREW_METHOD_PROFILES.length));
    const roastLevel = pick(ROAST_LEVELS, Math.floor(index / (BREW_METHOD_PROFILES.length * grinders.length)));
    const targetProfileId = pick(targetProfileIds, Math.floor(index / (BREW_METHOD_PROFILES.length * grinders.length * ROAST_LEVELS.length)));
    const reasons = [];
    let result = null;
    try {
      result = validateGrinderAdvice({ catalog, method, grinder, roastLevel, targetProfileId }, reasons);
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : String(error));
    }
    if (result?.methodFamily === 'espresso') {
      if (result.compatibility.selectable) espressoSelectableCandidates += 1;
      else espressoBlockedCandidates += 1;
      if (result.compatibility.selectable) selectableEspresso += 1;
      else blockedEspresso += 1;
    }
    methodCounts[method.id] = (methodCounts[method.id] || 0) + 1;
    if (samples.length < 80 && (checked === 1 || checked % 257 === 0 || reasons.length > 0)) {
      samples.push({
        index,
        methodId: method.id,
        grinderId: grinder.id,
        roastLevel,
        targetProfileId,
        compatibilityState: result?.advice?.compatibilityState,
        compatibilitySelectable: result?.advice?.compatibilitySelectable,
        sourceKind: result?.advice?.sourceKind,
        confidenceKind: result?.advice?.confidenceKind,
      });
    }
    if (reasons.length > 0) {
      failures.push({ index, methodId: method.id, grinderId: grinder.id, roastLevel, targetProfileId, reasons });
      if (failures.length > 250) break;
    }
  }

  if (checked > 0 && espressoBlockedCandidates > 0 && blockedEspresso === 0) {
    failures.push({ index: -1, methodId: 'espresso', grinderId: 'matrix', reasons: ['espresso matrix did not encounter a blocked grinder'] });
  }
  if (checked > 0 && espressoSelectableCandidates > 0 && selectableEspresso === 0) {
    failures.push({ index: -1, methodId: 'espresso', grinderId: 'matrix', reasons: ['espresso matrix did not encounter a selectable grinder'] });
  }

  const summary = {
    mode: 'grinder1m',
    fullTotal: options.total,
    shards: options.shards,
    shard: options.shard,
    expectedShardCases: shardCaseCount(options.total, options.shards, options.shard),
    checked,
    passed: checked - failures.length,
    failures: failures.length,
    blockedEspresso,
    selectableEspresso,
    espressoBlockedCandidates,
    espressoSelectableCandidates,
    methodCounts,
    claim: 'Grinder settings are starting references; real calibration depends on burr zero, retention, roast, water, and drawdown.',
  };
  writeArtifacts('grinder-1m-sharded', options, summary, samples, failures);
  return { summary, failures };
}

function writeArtifacts(kind, options, summary, samples, failures) {
  const dir = artifactDir(kind, options);
  fs.writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'samples.json'), `${JSON.stringify(samples, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'failures.json'), `${JSON.stringify(failures, null, 2)}\n`);
  writeCsv(
    path.join(dir, 'failures.csv'),
    ['index', 'subject', 'reason'],
    failures.map((failure) => [
      failure.index,
      failure.dripperId || failure.methodId || 'unknown',
      (failure.reasons || []).join('; '),
    ]),
  );
  fs.writeFileSync(path.join(dir, 'README.md'), [
    `# ${kind}`,
    '',
    `- Mode: ${summary.mode}`,
    `- Full total: ${summary.fullTotal}`,
    `- Shard: ${options.shard}/${options.shards}`,
    `- Checked: ${summary.checked}`,
    `- Failures: ${summary.failures}`,
    '',
    summary.claim,
    '',
  ].join('\n'));
  console.log(`Artifact directory: ${path.relative(ROOT, dir)}`);
}

try {
  const options = parseShardedOptions();
  const result = options.mode === 'grinder1m' ? runGrinder1m(options) : runBrew10m(options);
  console.log(JSON.stringify(result.summary, null, 2));
  if (result.failures.length > 0) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
