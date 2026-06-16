import { BREW_METHOD_MAP } from '../barista-tools/brewProfiles.ts';
import {
  buildBrewOutputs,
  buildRoastAdjustedTargets,
  calcWaterFromDoseRatio,
  roundTo,
} from '../barista-tools/calculations.ts';
import { evaluateConformance, validateBrewInputs } from '../barista-tools/standards.ts';
import type { BrewMethodId, GrindBias, RoastLevel } from '../barista-tools/types.ts';
import {
  findDripper,
  findGrinder,
  findManualBrewPreset,
  findProcessEntry,
  findTargetProfile,
  findVarietyEntry,
  findWaterBrand,
} from './catalog.ts';
import {
  resolveAeroPressAutoStyle,
  resolveAeroPressProductionTarget,
  resolveEffectiveAeroPressStyle,
} from './aeropressCalibration.ts';
import {
  formatAiBrewTime,
  formatAiBrewTimeForLanguage,
  isIndonesianAiBrewLanguage,
  localizeAiBrewDynamicText,
  localizeAiBrewStepLabel,
  localizeAiBrewSummary,
  localizeAiBrewTargetProfile,
} from './localization.ts';
import { resolveAiBrewKnowledgeNotes } from './knowledge.ts';
import {
  deriveBeanProfileAdjustment,
  mergeProcessModifiers,
  mergeVarietyModifiers,
} from './beanPlanner.ts';
import {
  buildGrindRecommendation,
  resolveGrinderSettingReference,
} from './grindPlanner.ts';
export { resolveGrinderSettingReference } from './grindPlanner.ts';
import { deriveWaterMineralProfile } from './waterPlanner.ts';
import {
  buildWorkflowAwareGuideSteps,
  validateMethodWorkflowGuide,
} from './workflowGuide.ts';
import {
  buildAiBrewReadinessScores,
  buildExpectedCupProfile,
} from './cupProfile.ts';
import { resolveSwitchPlanSelection, validateSwitchStepSafety } from './switchPlanner.ts';
import { resolveKalitaPlanSelection, isKalitaWaveDripperId } from './kalitaPlanner.ts';
import { resolveCleverPlanSelection, isCleverDripperId } from './cleverPlanner.ts';
import { resolveChemexPlanSelection, isChemexDripperId } from './chemexPlanner.ts';
import { resolveMokaPlanSelection, isMokaPotDripperId } from './mokaPlanner.ts';
import { resolveColdBrewPlanSelection, isColdBrewDripperId } from './coldBrewPlanner.ts';
import { resolveBatchPlanSelection, isBatchBrewDripperId } from './batchPlanner.ts';
import { resolveSiphonPlanSelection, isSiphonDripperId } from './siphonPlanner.ts';
import { resolveOrigamiPlanSelection, isOrigamiDripperId } from './origamiPlanner.ts';
import { resolveAprilPlanSelection, isAprilDripperId } from './aprilPlanner.ts';
import { resolveMelittaPlanSelection, isMelittaDripperId } from './melittaPlanner.ts';
import { resolveKonoPlanSelection, isKonoDripperId } from './konoPlanner.ts';
export {
  buildWorkflowAwareGuideSteps,
  validateMethodWorkflowGuide,
} from './workflowGuide.ts';
import {
  clampRoundedToIncrement,
  estimateCoffeeRetentionMl,
  estimateCupOutputMl,
  resolveBaristaTimeIncrementSeconds,
  resolveBaristaVolumeIncrementMl,
  roundBaristaTimeSeconds,
  roundBaristaVolumeMl,
  roundEstimatedCupOutputMl,
  roundToIncrement,
} from './stepPlanner.ts';
import {
  buildStyleHintStepPatches,
  clampPatchValue,
  finitePatchNumber,
  resolveOptimizationDeltaBounds,
  resolveOptimizationTimeBounds,
  resolveStepPatch,
  sanitizeOptimizationControl,
  sanitizeOptimizationGrindGuidance,
  sanitizeOptimizationPourStyleHint,
} from './optimizerGuard.ts';
import { ORIGIN_PROFILE_RULES_V2026_05 } from './plannerCalibration.v2026-05.ts';
import type {
  AiBrewCatalog,
  AiBrewFormState,
  AiBrewMethodFamily,
  AiBrewMode,
  AeroPressRecipeStyle,
  BeanCoverageState,
  BeanProfileState,
  BeanTaxonomySignal,
  BeanRoastDevelopment,
  BeanSolubility,
  BrewExtractionRationale,
  BrewJournalEntry,
  BrewPlan,
  BrewPlanStep,
  BrewTemplateStepKind,
  DeviceProfileMode,
  DeviceBrewProfile,
  DevicePhysicalConstraints,
  EquipmentCatalogEntry,
  FlatBottomProfileFamily,
  GrinderSettingReference,
  GrindSettingMode,
  ManualBrewPreset,
  ManualBrewTechniquePattern,
  MethodWorkflowValidationResult,
  OrigamiFilterStyle,
  ParsedNumericRange,
  ProcessRiskModel,
  ProcessCatalogEntry,
  TargetProfile,
  VarietyCatalogEntry,
  VerificationLevel,
  WaterMode,
  WaterBrandProfile,
  WaterGuidance,
  WaterMineralInput,
  SwitchBrewProgramme,
  SwitchStepValidation,
  WorkflowGuideActionType,
  WorkflowGuideStep,
  KalitaWaveRecipeStyle,
  CleverDripperRecipeStyle,
  ChemexRecipeStyle,
  MokaPotRecipeStyle,
  ColdBrewRecipeStyle,
  BatchBrewRecipeStyle,
  SiphonRecipeStyle,
  OrigamiRecipeStyle,
  AprilRecipeStyle,
  MelittaRecipeStyle,
  KonoRecipeStyle,
  FrenchPressRecipeStyle,
  SwitchPublicPresetId,
} from './types.ts';

export type AiBrewGenerationStageId =
  | 'validate_input'
  | 'match_device_profile'
  | 'resolve_grinder_settings'
  | 'compute_brew_variables'
  | 'build_sequence'
  | 'hybrid_ai_sequence'
  | 'run_standards_checks';

export const AI_BREW_GENERATION_STAGES: Array<{
  id: AiBrewGenerationStageId;
  label: string;
}> = [
  { id: 'validate_input', label: 'Validate input' },
  { id: 'match_device_profile', label: 'Match device profile' },
  { id: 'resolve_grinder_settings', label: 'Resolve grinder settings' },
  { id: 'compute_brew_variables', label: 'Compute brew variables' },
  { id: 'build_sequence', label: 'Build sequence' },
  { id: 'hybrid_ai_sequence', label: 'Hybrid AI sequence' },
  { id: 'run_standards_checks', label: 'Run standards checks' },
];

export type AiBrewGenerationConfidenceBand = 'high' | 'medium' | 'baseline';

export interface AiBrewGenerationProgress {
  id: AiBrewGenerationStageId;
  progressRatio: number;
  currentAccuracyScore: number;
  confidenceBand: AiBrewGenerationConfidenceBand;
  inputFitScore: number;
  referenceStrengthScore: number;
  standardsScore?: number;
  metrics: {
    catalogVersion: string;
    normalizedInputCount: number;
    totalCoreInputs: number;
    optionalSignalCount: number;
    totalOptionalSignals: number;
    resolvedReferenceCount: number;
    totalReferenceSignals: number;
    waterReady: boolean;
    targetProfileId: string;
    targetProfileLabel: string;
    waterBrandLabel?: string;
    deviceProfileMode?: DeviceProfileMode;
    deviceProfileLabel?: string;
    grinderVerification?: VerificationLevel;
    grinderRangeLabel?: string;
    ratio?: number;
    totalWaterMl?: number;
    waterTempC?: number;
    totalTimeSeconds?: number;
    stepCount?: number;
    standardsHits?: number;
    standardsMisses?: number;
    warningCount?: number;
  };
}

const CUSTOM_ENTRY_ID = 'custom';
const FORCE_FAMILY_FALLBACK_DRIPPER_IDS = new Set<string>();
const DEFAULT_DRIPPER_PRIORITY = ['hario-v60'];
const DEFAULT_GRINDER_PRIORITY = ['feima-600n', '1zpresso-k-ultra'];
const DEFAULT_TARGET_PROFILE_PRIORITY = ['balance_clean'];
const AI_BREW_CORE_INPUT_TOTAL = 7;
const AI_BREW_OPTIONAL_SIGNAL_TOTAL = 7;
const AI_BREW_REFERENCE_SIGNAL_TOTAL = 3;

const ICED_METHOD_FAMILIES = new Set<AiBrewMethodFamily>([
  'v60',
  'origami',
  'kono',
  'kalita_wave',
  'melitta',
  'april',
  'chemex',
  'clever_dripper',
  'hario_switch',
  'aeropress',
  'cold_brew',
]);

const ICED_MANUAL_POUR_OVER_FAMILIES = new Set<AiBrewMethodFamily>([
  'v60',
  'origami',
  'kono',
  'kalita_wave',
  'melitta',
  'april',
  'chemex',
]);

const POUR_CONTROL_METHOD_FAMILIES = new Set<AiBrewMethodFamily>([
  'v60',
  'origami',
  'kono',
  'kalita_wave',
  'melitta',
  'april',
  'chemex',
]);

const ICED_HOT_EXTRACTION_RATIO_BOUNDS: Record<AiBrewMethodFamily, { min: number; max: number }> = {
  v60: { min: 8.8, max: 10.6 },
  origami: { min: 8.7, max: 10.5 },
  kono: { min: 8.9, max: 10.7 },
  kalita_wave: { min: 8.8, max: 10.6 },
  melitta: { min: 8.8, max: 10.6 },
  april: { min: 8.8, max: 10.4 },
  chemex: { min: 9.0, max: 10.8 },
  clever_dripper: { min: 9.2, max: 10.8 },
  hario_switch: { min: 9.2, max: 10.8 },
  french_press: { min: 9.2, max: 10.8 },
  aeropress: { min: 8.8, max: 10.5 },
  siphon: { min: 9.0, max: 10.8 },
  moka_pot: { min: 7.0, max: 8.8 },
  cold_brew: { min: 8.0, max: 12.0 },
  batch_brew: { min: 9.4, max: 11.0 },
  espresso: { min: 1.6, max: 2.5 },
};

const TARGET_WATER_METHOD_LIMITS: Record<AiBrewMethodFamily, { min: number; max: number }> = {
  v60: { min: 80, max: 900 },
  chemex: { min: 120, max: 1200 },
  kalita_wave: { min: 80, max: 850 },
  clever_dripper: { min: 100, max: 750 },
  hario_switch: { min: 100, max: 750 },
  origami: { min: 80, max: 850 },
  april: { min: 80, max: 850 },
  melitta: { min: 80, max: 850 },
  kono: { min: 80, max: 850 },
  french_press: { min: 150, max: 1200 },
  aeropress: { min: 60, max: 320 },
  siphon: { min: 180, max: 800 },
  moka_pot: { min: 80, max: 450 },
  cold_brew: { min: 160, max: 2000 },
  batch_brew: { min: 300, max: 2500 },
  espresso: { min: 15, max: 90 },
};

const GRIND_BIAS_SCORE: Record<GrindBias, number> = {
  finer: -1,
  same: 0,
  coarser: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function midpoint(range: [number, number], digits = 1) {
  return roundTo((range[0] + range[1]) / 2, digits);
}

function supportsAiBrewPourControls(methodFamily: AiBrewMethodFamily) {
  return POUR_CONTROL_METHOD_FAMILIES.has(methodFamily);
}

function normalizePourShares(shares: number[]) {
  const total = shares.reduce((sum, share) => sum + Math.max(0, share), 0);
  if (total <= 0) return shares.map(() => roundTo(1 / Math.max(1, shares.length), 3));
  const normalized = shares.map((share) => roundTo(Math.max(0, share) / total, 3));
  const normalizedTotal = normalized.reduce((sum, share) => sum + share, 0);
  const lastIndex = normalized.length - 1;
  normalized[lastIndex] = roundTo(Math.max(0, normalized[lastIndex] + 1 - normalizedTotal), 3);
  return normalized;
}

type TargetProfilePourBehavior = NonNullable<TargetProfile['pourBehavior']>;

const DEFAULT_TARGET_POUR_BEHAVIORS: Record<string, TargetProfilePourBehavior> = {
  balance_clean: {
    bloomMultiplier: 2,
    bloomTimeSec: 42,
    middleLoadBias: 'balanced',
    finalLoadBias: 'balanced',
    agitation: 'low',
    pourHeight: 'low',
    drawdownBias: 'normal',
  },
  more_acidity: {
    bloomMultiplier: 2,
    bloomTimeSec: 35,
    middleLoadBias: 'light',
    finalLoadBias: 'gentle',
    agitation: 'minimal',
    pourHeight: 'low',
    drawdownBias: 'faster',
  },
  more_sweetness: {
    bloomMultiplier: 2,
    bloomTimeSec: 45,
    middleLoadBias: 'full',
    finalLoadBias: 'light',
    agitation: 'low',
    pourHeight: 'medium',
    drawdownBias: 'normal',
  },
  more_body: {
    bloomMultiplier: 2.3,
    bloomTimeSec: 58,
    middleLoadBias: 'balanced',
    finalLoadBias: 'balanced',
    agitation: 'controlled',
    pourHeight: 'low',
    drawdownBias: 'slower',
  },
  floral_transparent: {
    bloomMultiplier: 2,
    bloomTimeSec: 35,
    middleLoadBias: 'light',
    finalLoadBias: 'gentle',
    agitation: 'minimal',
    pourHeight: 'low',
    drawdownBias: 'faster',
  },
  fruit_forward: {
    bloomMultiplier: 2,
    bloomTimeSec: 45,
    middleLoadBias: 'full',
    finalLoadBias: 'gentle',
    agitation: 'low',
    pourHeight: 'low',
    drawdownBias: 'normal',
  },
  soft_round: {
    bloomMultiplier: 2.2,
    bloomTimeSec: 50,
    middleLoadBias: 'balanced',
    finalLoadBias: 'gentle',
    agitation: 'low',
    pourHeight: 'low',
    drawdownBias: 'normal',
  },
  dense_comforting: {
    bloomMultiplier: 2.3,
    bloomTimeSec: 58,
    middleLoadBias: 'balanced',
    finalLoadBias: 'balanced',
    agitation: 'controlled',
    pourHeight: 'low',
    drawdownBias: 'slower',
  },
};

function resolveTargetPourBehavior(targetProfileId?: string, profile?: Pick<TargetProfile, 'pourBehavior'> | null) {
  return profile?.pourBehavior || DEFAULT_TARGET_POUR_BEHAVIORS[String(targetProfileId || '').toLowerCase()];
}

function resolveV60IcedThreePourShares(targetProfileId?: string) {
  switch (String(targetProfileId || '').toLowerCase()) {
    case 'more_acidity':
    case 'floral_transparent':
    case 'balance_clean':
      return normalizePourShares([30, 60, 45]);
    case 'more_sweetness':
    case 'fruit_forward':
      return normalizePourShares([30, 70, 35]);
    case 'more_body':
    case 'dense_comforting':
    case 'soft_round':
      return normalizePourShares([35, 60, 40]);
    default:
      return null;
  }
}

function hasStructuredBodyCoffeeCue(input: AiBrewFormState) {
  return /\b(?:sumatra|lintong|lake\s*toba|toba|mandheling|gayo|java|sulawesi|toraja|bali|flores|papua|timor|indonesia|brazil|cerrado|minas|mogiana|vietnam|india|monsooned|wet[-\s_]?hulled|giling\s+basah|natural|honey|pulped\s+natural|anaerobic|carbonic|lactic|bourbon|catuai|caturra|mundo\s+novo|catimor|sarchimor|robusta|liberica|excelsa|body|full[-\s]?body|chocolate|cocoa|molasses|spice|earthy|low[-\s]?acid)\b/i.test([
    input.coffeeName,
    input.process,
    input.customProcess,
    input.variety,
    input.customVariety,
  ].filter(Boolean).join(' '));
}

function shouldUseFrontLoadedHotV60PourMap(input: AiBrewFormState) {
  return input.brewMode === 'hot'
    && (
      (input.targetProfileId === 'more_sweetness' && input.roastLevel === 'medium')
      || (input.targetProfileId === 'balance_clean' && hasStructuredBodyCoffeeCue(input))
    );
}

function resolveRequestedPourCount(input: AiBrewFormState, profile: DeviceBrewProfile) {
  const explicitCount = Number.parseInt(input.pourCount, 10);
  if (Number.isFinite(explicitCount)) return clamp(Math.round(explicitCount), 3, 5);
  const doseG = parseDose(input.doseG);
  if (
    profile.methodFamily === 'v60'
    && profile.exactMatch
    && profile.dripperIds.includes('hario-v60')
    && input.brewMode === 'iced'
  ) {
    if (doseG <= 18) return 3;
    if (doseG <= 26) return 4;
    return 5;
  }
  if (
    profile.methodFamily === 'v60'
    && input.targetProfileId === 'more_sweetness'
    && input.brewMode === 'iced'
    && isLightOrMediumLightRoast(input.roastLevel)
  ) {
    if (doseG <= 18) return 3;
  }
  if (input.pourStyle === 'auto' && input.pourCount === 'auto' && input.brewMode === 'hot') {
    const methodFamily = profile.methodFamily || 'v60';
    const isCone = methodFamily === 'v60' || methodFamily === 'origami' || methodFamily === 'kono';
    const isFlatBottom = methodFamily === 'kalita_wave' || methodFamily === 'april' || methodFamily === 'melitta';
    const isFastFlatBottom = methodFamily === 'april'
      || profile.dripperIds.some((id) => /orea|april|flat/i.test(id))
      || /orea|april|flat[-\s]?bottom/i.test(`${profile.id} ${profile.label} ${profile.note}`);
    const wantsStructure = input.targetProfileId === 'more_sweetness'
      || input.targetProfileId === 'more_body'
      || input.targetProfileId === 'dense_comforting'
      || input.targetProfileId === 'soft_round';

    if (isCone && doseG >= 19 && wantsStructure) return 5;
    if (isCone && doseG >= 17) return 4;
    if (methodFamily === 'chemex' && doseG >= 20) return 4;
    if ((isFlatBottom || isFastFlatBottom) && doseG >= 18) return 4;
  }
  if (
    profile.methodFamily === 'v60'
    && profile.exactMatch
    && profile.dripperIds.includes('hario-v60')
    && input.targetProfileId === 'more_sweetness'
    && input.brewMode === 'iced'
    && isLightOrMediumLightRoast(input.roastLevel)
  ) {
    return 3;
  }
  if (
    profile.methodFamily === 'v60'
    && profile.exactMatch
    && profile.dripperIds.includes('hario-v60')
    && input.targetProfileId === 'more_sweetness'
    && input.roastLevel === 'medium'
  ) {
    return input.brewMode === 'iced' ? 3 : 4;
  }
  if (input.pourStyle === 'auto') {
    if (
      profile.methodFamily === 'v60'
      && profile.exactMatch
      && profile.dripperIds.includes('hario-v60')
      && shouldUseFrontLoadedHotV60PourMap(input)
    ) {
      return 4;
    }
    const profileAlreadyOwnsFinish = profile.steps.some((step) =>
      step.share <= 0 || step.kind === 'drawdown' || step.kind === 'serve' || /\b(?:drawdown|serve)\b/i.test(`${step.id} ${step.label}`),
    );
    if (input.brewMode === 'iced' && isIcedManualPourOverFamily(profile.methodFamily || 'v60') && !profileAlreadyOwnsFinish) {
      const doseG = parseDose(input.doseG);
      if (doseG <= 18) return 3;
      if (doseG <= 26) return 4;
      return 5;
    }
    return null;
  }
  const currentPourCount = profile.steps.filter((step) => step.share > 0).length;
  return clamp(currentPourCount || (input.brewMode === 'iced' ? 4 : 3), 3, 5);
}

function buildControlledPourStarts(count: number, input: AiBrewFormState) {
  const style = input.pourStyle === 'auto' ? 'balanced' : input.pourStyle;
  if (input.brewMode === 'iced' && count === 3) {
    const behavior = resolveTargetPourBehavior(input.targetProfileId);
    const bloomTime = Math.round(behavior?.bloomTimeSec || 42);
    const middleGap = behavior?.middleLoadBias === 'full' ? 65 : behavior?.drawdownBias === 'faster' ? 55 : 60;
    return [0, bloomTime, bloomTime + middleGap];
  }
  if (input.brewMode === 'hot' && style === 'balanced' && count === 4) {
    return [0, 30, 60, 90];
  }
  const gap = style === 'pulse'
    ? input.brewMode === 'iced' ? 30 : 35
    : style === 'gentle'
      ? input.brewMode === 'iced' ? 40 : 45
      : input.brewMode === 'iced' ? 35 : 40;
  return Array.from({ length: count }, (_, index) => index === 0 ? 0 : index * gap);
}

function buildControlledPourShares(count: number, input: AiBrewFormState) {
  const style = input.pourStyle === 'auto' ? 'balanced' : input.pourStyle;
  if (input.brewMode === 'iced' && count === 3) {
    const v60IcedShares = resolveV60IcedThreePourShares(input.targetProfileId);
    if (v60IcedShares) return v60IcedShares;
  }
  if (input.brewMode === 'hot' && style === 'balanced' && count === 4 && shouldUseFrontLoadedHotV60PourMap(input)) {
    return normalizePourShares([0.14, 0.36, 0.25, 0.25]);
  }
  if (style === 'pulse') {
    return normalizePourShares(Array.from({ length: count }, () => 1 / count));
  }

  const bloomShare = input.brewMode === 'iced'
    ? style === 'gentle' ? 0.25 : 0.24
    : style === 'gentle' ? 0.22 : 0.2;
  const finalShare = input.brewMode === 'iced'
    ? style === 'gentle' ? 0.26 : 0.3
    : style === 'gentle' ? 0.28 : 0.32;
  const middleCount = Math.max(0, count - 2);
  if (middleCount === 0) return normalizePourShares([bloomShare, 1 - bloomShare]);

  const middleTotal = Math.max(0.1, 1 - bloomShare - finalShare);
  return normalizePourShares([
    bloomShare,
    ...Array.from({ length: middleCount }, () => middleTotal / middleCount),
    finalShare,
  ]);
}

function buildPourStyleLabel(input: AiBrewFormState) {
  switch (input.pourStyle) {
    case 'pulse':
      return 'pulse interval';
    case 'gentle':
      return 'gentle interval';
    case 'balanced':
      return 'balanced interval';
    default:
      return 'auto interval';
  }
}

function buildPourControlNote(input: AiBrewFormState, methodFamily: AiBrewMethodFamily) {
  if (!supportsAiBrewPourControls(methodFamily)) return null;
  if (input.pourStyle === 'auto' && input.pourCount === 'auto') return null;
  const countLabel = input.pourCount === 'auto' ? 'planner-selected pour count' : `${input.pourCount} pours`;
  const modeLabel = input.brewMode === 'iced'
    ? 'Japanese-style iced flash brew'
    : 'hot pour-over';
  return `${modeLabel} cadence: ${countLabel}, ${buildPourStyleLabel(input)}. Targets stay rounded and cumulative for service use.`;
}

function resolveManualPresetPourPattern(
  pattern: ManualBrewTechniquePattern,
  input: AiBrewFormState,
  methodFamily: AiBrewMethodFamily,
) {
  const icedOffset = input.brewMode === 'iced' ? 8 : 0;
  switch (pattern) {
    case 'two_pour':
      return {
        starts: [0, 45 + icedOffset],
        shares: normalizePourShares([0.32, 0.68]),
        note: 'Manual preset technique: two-pour style with a long bloom and one main extraction pour.',
      };
    case 'four_six':
      return {
        starts: [0, 45 + icedOffset, 75 + icedOffset, 105 + icedOffset, 135 + icedOffset],
        shares: normalizePourShares([0.16, 0.24, 0.2, 0.2, 0.2]),
        note: 'Manual preset technique: Tetsu Kasuya 4:6-inspired cadence; first two pours steer acidity/sweetness, last three manage body.',
      };
    case 'equal_five_pour':
      return {
        starts: [0, 40 + icedOffset, 70 + icedOffset, 100 + icedOffset, 130 + icedOffset],
        shares: normalizePourShares([0.2, 0.2, 0.2, 0.2, 0.2]),
        note: 'Manual preset technique: five near-equal pours for repeatable competition-style cumulative targets.',
      };
    case 'flat_bottom_fast_four':
      return {
        starts: [0, 35 + icedOffset, 65 + icedOffset, 95 + icedOffset],
        shares: normalizePourShares([0.22, 0.28, 0.25, 0.25]),
        note: 'Manual preset technique: fast flat-bottom OREA-style four pours with centered, low-agitation pulses.',
      };
    case 'front_loaded_four':
      return {
        starts: [0, 35 + icedOffset, 70 + icedOffset, 105 + icedOffset],
        shares: normalizePourShares([0.18, 0.34, 0.24, 0.24]),
        note: 'Manual preset technique: front-loaded four-pour pattern for sweetness, then a calmer finish.',
      };
    case 'continuous_high_extraction':
      return {
        starts: [0, 35 + icedOffset, 70 + icedOffset, 110 + icedOffset],
        shares: normalizePourShares([0.18, 0.32, 0.3, 0.2]),
        note: 'Manual preset technique: high-evenness pour-over pattern focused on saturation and flow health.',
      };
    case 'temperature_decline_finish':
      return {
        starts: [0, 45 + icedOffset, 90 + icedOffset],
        shares: normalizePourShares([0.25, 0.4, 0.35]),
        note: 'Manual preset technique: temperature-decline inspired finish; use early extraction pressure, then calmer late water.',
      };
    case 'ten_pour_multi':
      return {
        starts: [0, 30, 45, 60, 75, 90, 105, 120, 135, 150].map((seconds) => seconds + icedOffset),
        shares: normalizePourShares(Array.from({ length: 10 }, () => 0.1)),
        note: 'Manual preset technique: reported 2026 Tetsu Kasuya multi-pour cadence with ten small V60 pours, very coarse grind, high temperature, and a slower body-focused finish.',
      };
    case 'chemex_clean':
      return {
        starts: [0, 50 + icedOffset, 100 + icedOffset, 150 + icedOffset],
        shares: normalizePourShares([0.18, 0.32, 0.25, 0.25]),
        note: 'Manual preset technique: Chemex clean-cup cadence with thick-paper rinse, vent awareness, and gentle center-to-mid pours.',
      };
    case 'aeropress_clean':
      return {
        starts: methodFamily === 'aeropress' ? [0] : [0, 45 + icedOffset, 90 + icedOffset],
        shares: methodFamily === 'aeropress' ? normalizePourShares([1]) : normalizePourShares([0.25, 0.4, 0.35]),
        note: 'Manual preset technique: AeroPress clean immersion guidance; use steep and press rate as primary controls.',
      };
    case 'generic_fast':
    default:
      return {
        starts: [0, 30 + icedOffset, 60 + icedOffset],
        shares: normalizePourShares([0.22, 0.43, 0.35]),
        note: 'Manual preset technique: fast manual-filter cadence that shortens service while keeping safe extraction windows.',
      };
  }
}

function resolveManualPresetTimeAdjustmentSeconds(preset: ManualBrewPreset | undefined) {
  if (!preset) return 0;
  switch (preset.techniquePattern) {
    case 'generic_fast':
      return -35;
    case 'flat_bottom_fast_four':
      return -12;
    case 'two_pour':
      return -8;
    case 'chemex_clean':
      return 15;
    default:
      return 0;
  }
}

function resolveManualPresetMinimumTimeSeconds(
  preset: ManualBrewPreset | undefined,
  methodFamily: AiBrewMethodFamily,
  brewMode: AiBrewFormState['brewMode'],
) {
  if (!preset || brewMode !== 'hot') return 0;
  if (preset.techniquePattern === 'generic_fast') return 120;
  if (preset.techniquePattern === 'two_pour') return 130;
  if (preset.techniquePattern === 'ten_pour_multi') return 210;
  if (preset.techniquePattern === 'chemex_clean' || methodFamily === 'chemex') return 235;
  if (preset.techniquePattern === 'flat_bottom_fast_four') return 145;
  return 0;
}

function buildManualPresetAdaptationNote(
  preset: ManualBrewPreset | undefined,
  doseG: number,
  totalWaterMl: number,
  waterTempC: number,
) {
  if (!preset) return undefined;
  const defaults = preset.targetDefaults;
  const ratio = defaults.targetRatio || defaults.targetWaterMl / defaults.doseG;
  const defaultWaterForDose = roundBaristaVolumeMl(doseG * ratio, 'v60');
  const adapted = Math.abs(doseG - defaults.doseG) >= 0.1
    || Math.abs(totalWaterMl - defaults.targetWaterMl) >= 1
    || Math.abs(totalWaterMl - defaultWaterForDose) >= 1
    || Math.abs(waterTempC - defaults.targetTempC) >= 0.5;
  if (!adapted) return undefined;
  return 'Manual brew preset adapted from the selected dose, water target, or temperature. The planner kept the preset direction but recalculated ratio, timing, and method guardrails from the current inputs.';
}

function resolveMinimumIcedManualPourOverTimeSeconds(profile: DeviceBrewProfile, methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  if (brewMode !== 'iced' || !isIcedManualPourOverFamily(methodFamily)) return 0;
  const lastPositivePourIndex = profile.steps.reduce(
    (lastIndex, step, index) => (step.share > 0 && (step.kind === undefined || isVolumeTargetStepKind(step.kind)) ? index : lastIndex),
    -1,
  );
  if (lastPositivePourIndex <= 0) return 0;

  const minPourGapSeconds = 30;
  const finalWindowBounds = resolveMethodFamilyFinalWindowBounds(methodFamily, brewMode);
  return (lastPositivePourIndex * minPourGapSeconds) + finalWindowBounds.min;
}

function resolveMinimumMethodServiceTimeSeconds(methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  if (methodFamily === 'chemex') return brewMode === 'iced' ? 190 : 235;
  if (methodFamily === 'kalita_wave') return brewMode === 'iced' ? 165 : 175;
  if (brewMode === 'iced') {
    if (methodFamily === 'v60') return 145;
    if (methodFamily === 'april') return 145;
    if (methodFamily === 'origami') return 145;
    if (methodFamily === 'melitta') return 145;
    if (methodFamily === 'kono') return 145;
  }
  return 0;
}

function applyPourControlsToProfile(
  profile: DeviceBrewProfile,
  input: AiBrewFormState,
  methodFamily: AiBrewMethodFamily,
  manualPreset?: ManualBrewPreset,
): DeviceBrewProfile {
  if (!supportsAiBrewPourControls(methodFamily)) {
    return manualPreset
      ? {
          ...profile,
          note: `${profile.note} Manual brew preset guidance active: ${manualPreset.safeLabel}. ${manualPreset.visibleSummary}`,
        }
      : profile;
  }
  const manualPattern = manualPreset
    ? resolveManualPresetPourPattern(manualPreset.techniquePattern, input, methodFamily)
    : null;
  const pourCount = manualPattern?.shares.length || resolveRequestedPourCount(input, profile);
  if (!pourCount) return profile;

  const starts = manualPattern?.starts || buildControlledPourStarts(pourCount, input);
  const shares = manualPattern?.shares || buildControlledPourShares(pourCount, input);
  const modePrefix = input.brewMode === 'iced' ? 'Japanese iced' : 'Hot';
  const styleLabel = buildPourStyleLabel(input);
  const familyStepNote = (isFirst: boolean, isLast: boolean, isSingleMiddlePour: boolean) => {
    if (methodFamily === 'chemex') {
      if (input.brewMode === 'iced') {
        return isFirst
          ? 'Rinse the Chemex paper hard, preheat the glass, tare the scale, keep measured ice in the server, then bloom as hot concentrate.'
          : 'Keep the Chemex iced brew as hot concentrate over measured ice only; no late bypass water and no wall chasing.';
      }
      return isFirst
        ? 'Rinse the thick paper hard, preheat the glass, tare the scale, keep the three-layer side at the spout, and bloom fully.'
        : 'Use stable center-to-mid Chemex flow; avoid pouring down the paper wall or blocking the vent.';
    }
    if (methodFamily === 'kalita_wave' || methodFamily === 'melitta' || (methodFamily === 'origami' && profile.filterStyle === 'flat')) {
      return isFirst
        ? 'Saturate the flat bed evenly and let it settle level before the next pour.'
        : isSingleMiddlePour
          ? 'Use a centered flat-bed pour; keep the bed level and avoid flooding one side.'
          : isLast
            ? 'Land the final water evenly and let drawdown finish without a last-second swirl.'
            : 'Keep each pulse centered and low so the bed stays level.';
    }
    if (methodFamily === 'april') {
      return isFirst
        ? 'Use a short, even bloom and keep agitation low.'
        : 'Use short centered pulses with quick kettle resets; avoid stretching the last phase.';
    }
    if (input.brewMode === 'iced') {
      return isFirst
        ? 'Japanese-style iced: bloom over ice with compact hot water, then keep every next pour as hot concentrate only.'
        : 'Keep the iced brew as Japanese-style flash brew: pour hot concentrate over measured ice, no late bypass.';
    }
    return isFirst
      ? 'Bloom evenly, then keep the next pours calm and centered.'
      : 'Keep the pour controlled, even, and aligned to the selected interval.';
  };
  return {
    ...profile,
    id: `${profile.id}_${input.brewMode}_${input.pourStyle}_${manualPreset?.techniquePattern || `${pourCount}p`}`,
    label: `${profile.label} ${pourCount}-pour`,
    note: `${profile.note} ${modePrefix} cadence is controlled as ${pourCount} pours with ${styleLabel}. ${
      manualPreset ? `Manual brew preset guidance active: ${manualPreset.safeLabel}. ${manualPreset.visibleSummary} ${manualPattern?.note || ''}` : ''
    }`.replace(/\s+/g, ' ').trim(),
    steps: shares.map((share, index) => {
      const isFirst = index === 0;
      const isLast = index === pourCount - 1;
      const isSingleMiddlePour = pourCount === 3 && index === 1;
      const patternNote = manualPreset && manualPattern
        ? `${manualPattern.note} `
        : '';
      return {
        id: isFirst ? 'bloom' : isLast ? 'final_pour' : isSingleMiddlePour ? 'center_pour' : `pulse_${index}`,
        label: isFirst ? 'Bloom' : isLast ? 'Final Pour' : isSingleMiddlePour ? 'Center Pour' : `Pulse ${index}`,
        kind: 'pour',
        share,
        startSeconds: starts[index] ?? index * 40,
        note: `${patternNote}${familyStepNote(isFirst, isLast, isSingleMiddlePour)}`.replace(/\s+/g, ' ').trim(),
      };
    }),
  };
}

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickDefaultCatalogId<T extends { id: string }>(items: T[] | undefined, preferredIds: string[]) {
  if (!Array.isArray(items) || items.length === 0) return '';
  for (const id of preferredIds) {
    const match = items.find((item) => item.id === id);
    if (match) return match.id;
  }
  return items[0]?.id || '';
}

function resolvePresetDripperId(preset: ManualBrewPreset, catalog: AiBrewCatalog, currentDripperId?: string) {
  const dripperIds = new Set((catalog.drippers || []).map((item) => item.id));
  if (currentDripperId && preset.supportedDripperIds.includes(currentDripperId) && dripperIds.has(currentDripperId)) {
    return currentDripperId;
  }
  if (preset.originalBrewerId && !dripperIds.has(preset.originalBrewerId) && preset.fallbackDripperId && dripperIds.has(preset.fallbackDripperId)) {
    return preset.fallbackDripperId;
  }
  const supported = preset.supportedDripperIds.find((id) => dripperIds.has(id));
  if (supported) return supported;
  if (preset.fallbackDripperId && dripperIds.has(preset.fallbackDripperId)) return preset.fallbackDripperId;
  return currentDripperId || pickDefaultCatalogId(catalog.drippers, DEFAULT_DRIPPER_PRIORITY);
}

export function applyManualBrewPresetToFormState(
  input: AiBrewFormState,
  catalog: AiBrewCatalog,
  presetId: string,
): AiBrewFormState {
  const preset = findManualBrewPreset(catalog, presetId);
  if (!preset) return sanitizeAiBrewFormState(input, catalog);
  const defaults = preset.targetDefaults;
  const next: Partial<AiBrewFormState> = {
    ...input,
    manualPresetId: preset.id,
    brewMode: defaults.brewMode,
    dripperId: resolvePresetDripperId(preset, catalog, input.dripperId),
    targetProfileId: defaults.targetProfileId,
    doseG: String(defaults.doseG),
    targetWaterMl: String(defaults.targetWaterMl),
    targetTempC: String(defaults.targetTempC),
    targetRatio: defaults.targetRatio ? String(defaults.targetRatio) : input.targetRatio,
    pourCount: defaults.pourCount,
    pourStyle: defaults.pourStyle,
    waterMode: 'manual',
    waterCustomized: true,
    waterBrandId: '',
    waterTdsPpm: String(defaults.waterTdsPpm),
    waterHardnessPpm: String(defaults.waterHardnessPpm),
    waterAlkalinityPpm: String(defaults.waterAlkalinityPpm),
    origamiFilterStyle: defaults.origamiFilterStyle || input.origamiFilterStyle || 'auto',
    aeropressStyle: defaults.aeropressStyle || input.aeropressStyle || 'auto',
  };
  return sanitizeAiBrewFormState(next, catalog);
}

function applyManualBrewPresetDefaultsForPlanning(input: AiBrewFormState, catalog: AiBrewCatalog): AiBrewFormState {
  const presetId = String(input.manualPresetId || '');
  if (!Array.isArray(catalog.manualBrewPresets) || catalog.manualBrewPresets.length === 0) return input;
  const preset = findManualBrewPreset(catalog, presetId);
  if (!preset) return input;

  const presetApplied = applyManualBrewPresetToFormState(input, catalog, preset.id);
  const hasPrecisionOverrides = [
    input.targetWaterMl,
    input.targetTempC,
    input.targetRatio,
  ].some(hasValue);
  const hasWaterOverrides = [
    input.waterBrandId,
    input.waterTdsPpm,
    input.waterHardnessPpm,
    input.waterAlkalinityPpm,
    input.waterNotes,
  ].some(hasValue);

  return {
    ...presetApplied,
    coffeeName: input.coffeeName,
    process: input.process,
    customProcess: input.customProcess,
    variety: input.variety,
    customVariety: input.customVariety,
    roastLevel: input.roastLevel,
    altitudeMasl: input.altitudeMasl,
    beanDensityGml: input.beanDensityGml,
    roastDevelopment: input.roastDevelopment,
    solubility: input.solubility,
    grinderId: input.grinderId || presetApplied.grinderId,
    doseG: hasPrecisionOverrides ? String(input.doseG || presetApplied.doseG) : presetApplied.doseG,
    targetWaterMl: hasPrecisionOverrides && hasValue(input.targetWaterMl) ? String(input.targetWaterMl) : presetApplied.targetWaterMl,
    targetTempC: hasPrecisionOverrides && hasValue(input.targetTempC) ? String(input.targetTempC) : presetApplied.targetTempC,
    targetRatio: hasPrecisionOverrides && hasValue(input.targetRatio) ? String(input.targetRatio) : presetApplied.targetRatio,
    waterMode: hasWaterOverrides ? input.waterMode : presetApplied.waterMode,
    waterRegion: hasWaterOverrides ? input.waterRegion : presetApplied.waterRegion,
    waterBrandId: hasWaterOverrides ? input.waterBrandId : presetApplied.waterBrandId,
    waterCustomized: hasWaterOverrides ? input.waterCustomized : presetApplied.waterCustomized,
    waterTdsPpm: hasWaterOverrides ? String(input.waterTdsPpm || '') : presetApplied.waterTdsPpm,
    waterHardnessPpm: hasWaterOverrides ? String(input.waterHardnessPpm || '') : presetApplied.waterHardnessPpm,
    waterAlkalinityPpm: hasWaterOverrides ? String(input.waterAlkalinityPpm || '') : presetApplied.waterAlkalinityPpm,
    waterNotes: hasWaterOverrides ? String(input.waterNotes || '') : presetApplied.waterNotes,
  };
}

function createFingerprint(input: string) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(index);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function combineBias(...biases: GrindBias[]): GrindBias {
  const score = biases.reduce((total, bias) => total + GRIND_BIAS_SCORE[bias], 0);
  if (score < 0) return 'finer';
  if (score > 0) return 'coarser';
  return 'same';
}

function countNormalizedInputs(input: AiBrewFormState) {
  const checks = [
    Boolean(String(input.doseG || '').trim()),
    Boolean(String(input.dripperId || '').trim()),
    Boolean(String(input.grinderId || '').trim()),
    Boolean(String(input.targetProfileId || '').trim()),
    Boolean(String(input.waterTdsPpm || '').trim()),
    Boolean(String(input.waterHardnessPpm || '').trim()),
    Boolean(String(input.waterAlkalinityPpm || '').trim()),
  ];
  return checks.filter(Boolean).length;
}

function countOptionalSignals(input: AiBrewFormState) {
  const checks = [
    Boolean(String(input.coffeeName || '').trim()),
    Boolean(String(input.process || '').trim() || String(input.customProcess || '').trim()),
    Boolean(String(input.variety || '').trim() || String(input.customVariety || '').trim()),
    Boolean(String(input.altitudeMasl || '').trim()),
    Boolean(String(input.beanDensityGml || '').trim()),
    Boolean(String(input.roastDevelopment || '').trim()),
    Boolean(String(input.solubility || '').trim()),
  ];
  return checks.filter(Boolean).length;
}

function scoreInputFit(input: AiBrewFormState) {
  const normalizedCore = countNormalizedInputs(input);
  const optionalSignals = countOptionalSignals(input);
  const coreScore = (normalizedCore / AI_BREW_CORE_INPUT_TOTAL) * 76;
  const optionalScore = (optionalSignals / AI_BREW_OPTIONAL_SIGNAL_TOTAL) * 24;
  return roundPercent(coreScore + optionalScore);
}

function scoreDeviceReference(mode: DeviceProfileMode) {
  switch (mode) {
    case 'exact':
      return 100;
    case 'derived_template':
      return 88;
    case 'family_fallback':
    default:
      return 74;
  }
}

function scoreVerificationStrength(level?: VerificationLevel) {
  switch (level) {
    case 'official':
      return 100;
    case 'community_verified':
      return 94;
    case 'curated':
      return 90;
    case 'dataset_unverified':
      return 78;
    case 'fallback':
    default:
      return 70;
  }
}

function scoreWaterReference(input: AiBrewFormState, waterBrand?: WaterBrandProfile) {
  if (input.waterMode === 'manual') return 84;
  if (!waterBrand) return 62;
  if (waterBrand.presetStatus === 'autofill' && !input.waterCustomized) return 100;
  if (input.waterCustomized) return 88;
  if (waterBrand.presetStatus === 'manual_required') return 74;
  if (waterBrand.presetStatus === 'info_only') return 70;
  return 82;
}

function averageScores(scores: number[]) {
  if (scores.length === 0) return 0;
  return roundPercent(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function combineAccuracyScores(parts: Array<{ score: number; weight: number }>) {
  const filtered = parts.filter((part) => Number.isFinite(part.score) && part.weight > 0);
  const weightTotal = filtered.reduce((total, part) => total + part.weight, 0);
  if (weightTotal <= 0) return 0;
  const weighted = filtered.reduce((total, part) => total + (part.score * part.weight), 0);
  return roundPercent(weighted / weightTotal);
}

function confidenceBandForScore(score: number): AiBrewGenerationConfidenceBand {
  if (score >= 90) return 'high';
  if (score >= 80) return 'medium';
  return 'baseline';
}

function scoreStandardsQuality(plan: BrewPlan) {
  const hitCount = plan.conformance.standardsHits.length;
  const missCount = plan.conformance.standardsMisses.length;
  const warningCount = plan.conformance.warnings.length;
  const total = hitCount + missCount;
  const passScore = total > 0 ? (hitCount / total) * 100 : 92;
  const warningPenalty = Math.min(18, warningCount * 4);
  return roundPercent(passScore - warningPenalty);
}

function buildGenerationProgressEvent(params: {
  id: AiBrewGenerationStageId;
  catalogVersion: string;
  sanitized: AiBrewFormState;
  targetProfileId: string;
  targetProfileLabel: string;
  waterBrand?: WaterBrandProfile;
  deviceSelection?: ReturnType<typeof resolveDeviceProfileSelection>;
  grinderSetting?: GrinderSettingReference;
  plan?: BrewPlan;
  inputFitScore: number;
  referenceStrengthScore: number;
  standardsScore?: number;
  resolvedReferenceCount: number;
}) {
  const stageIndex = AI_BREW_GENERATION_STAGES.findIndex((stage) => stage.id === params.id);
  const currentAccuracyScore = combineAccuracyScores([
    { score: params.inputFitScore, weight: 0.42 },
    { score: params.referenceStrengthScore, weight: 0.38 },
    ...(typeof params.standardsScore === 'number'
      ? [{ score: params.standardsScore, weight: 0.20 }]
      : []),
  ]);

  return {
    id: params.id,
    progressRatio: clamp((stageIndex + 1) / AI_BREW_GENERATION_STAGES.length, 0, 1),
    currentAccuracyScore,
    confidenceBand: confidenceBandForScore(currentAccuracyScore),
    inputFitScore: params.inputFitScore,
    referenceStrengthScore: params.referenceStrengthScore,
    standardsScore: params.standardsScore,
    metrics: {
      catalogVersion: params.catalogVersion,
      normalizedInputCount: countNormalizedInputs(params.sanitized),
      totalCoreInputs: AI_BREW_CORE_INPUT_TOTAL,
      optionalSignalCount: countOptionalSignals(params.sanitized),
      totalOptionalSignals: AI_BREW_OPTIONAL_SIGNAL_TOTAL,
      resolvedReferenceCount: params.resolvedReferenceCount,
      totalReferenceSignals: AI_BREW_REFERENCE_SIGNAL_TOTAL,
      waterReady: Boolean(
        String(params.sanitized.waterTdsPpm || '').trim()
        && String(params.sanitized.waterHardnessPpm || '').trim()
        && String(params.sanitized.waterAlkalinityPpm || '').trim()
      ),
      targetProfileId: params.targetProfileId,
      targetProfileLabel: params.targetProfileLabel,
      waterBrandLabel: params.waterBrand?.shortLabel,
      deviceProfileMode: params.deviceSelection?.mode,
      deviceProfileLabel: params.deviceSelection?.profile.label,
      grinderVerification: params.grinderSetting?.verificationLevel,
      grinderRangeLabel: params.grinderSetting?.rangeLabel,
      ratio: params.plan?.recommendedRatio,
      totalWaterMl: params.plan?.totalWaterMl,
      waterTempC: params.plan?.waterTempC,
      totalTimeSeconds: params.plan?.totalTimeSeconds,
      stepCount: params.plan?.steps.length,
      standardsHits: params.plan?.conformance.standardsHits.length,
      standardsMisses: params.plan?.conformance.standardsMisses.length,
      warningCount: params.plan?.conformance.warnings.length,
    },
  } satisfies AiBrewGenerationProgress;
}

function parseDose(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 15;
  return clamp(parsed, 8, 40);
}

function parseDoseForMethod(value: string, methodFamily: AiBrewMethodFamily) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return methodFamily === 'french_press' ? 20 : 15;
  if (methodFamily === 'french_press') return clamp(parsed, 5, 80);
  return clamp(parsed, 8, 40);
}

type EffectiveFrenchPressStyle = Exclude<FrenchPressRecipeStyle, 'auto'>;

function resolveFrenchPressProductionEnvelope(style: EffectiveFrenchPressStyle, doseG: number) {
  switch (style) {
    case 'clean_decant':
      return {
        ratio: { min: 15, max: 16 },
        finishSeconds: { min: 420, max: 540 },
      };
    case 'double_filter':
      return {
        ratio: { min: 14.5, max: 15.5 },
        finishSeconds: { min: 300, max: 420 },
      };
    case 'heavy_concentrate':
      return {
        ratio: doseG >= 60
          ? { min: 8, max: 12 }
          : doseG >= 45
            ? { min: 9, max: 12 }
            : { min: 11, max: 12 },
        finishSeconds: { min: 390, max: 510 },
      };
    case 'sweet_immersion':
      return {
        ratio: { min: 14, max: 15 },
        finishSeconds: { min: 390, max: 510 },
      };
    case 'traditional':
    default:
      return {
        ratio: { min: 14, max: 15 },
        finishSeconds: { min: 330, max: 390 },
      };
  }
}

function resolveManualPresetScalingRatio(preset: ManualBrewPreset) {
  const explicitRatio = preset.targetDefaults.targetRatio;
  if (typeof explicitRatio === 'number' && Number.isFinite(explicitRatio) && explicitRatio > 0) return explicitRatio;
  return preset.targetDefaults.targetWaterMl / preset.targetDefaults.doseG;
}

function roundManualPresetWaterMl(
  value: number,
  methodFamily: AiBrewMethodFamily,
  preset: ManualBrewPreset | null | undefined,
) {
  if (preset && methodFamily === 'aeropress') {
    return Math.max(0, Math.round(value));
  }
  return roundBaristaVolumeMl(value, methodFamily);
}

export function resolveManualPresetScaledWaterMl(
  preset: ManualBrewPreset | null | undefined,
  nextDoseG: number,
  currentTargetWaterMl: string,
  methodFamily: AiBrewMethodFamily = 'v60',
  previousDoseG?: number,
) {
  if (!preset || !Number.isFinite(nextDoseG) || nextDoseG <= 0) return null;
  const currentTargetWater = Number.parseFloat(currentTargetWaterMl || '');
  if (!Number.isFinite(currentTargetWater) || currentTargetWater <= 0) return null;

  const ratio = resolveManualPresetScalingRatio(preset);
  if (!Number.isFinite(ratio) || ratio <= 0) return null;

  const previousDose = typeof previousDoseG === 'number' && Number.isFinite(previousDoseG)
    ? previousDoseG
    : preset.targetDefaults.doseG;
  const expectedPreviousWater = roundManualPresetWaterMl(calcWaterFromDoseRatio(previousDose, ratio), methodFamily, preset);
  const presetDefaultWater = roundManualPresetWaterMl(preset.targetDefaults.targetWaterMl, methodFamily, preset);
  const followsPresetWater = Math.abs(currentTargetWater - presetDefaultWater) <= 0.51
    || Math.abs(currentTargetWater - expectedPreviousWater) <= 0.51;
  if (!followsPresetWater) return null;

  const nextWater = Math.abs(nextDoseG - preset.targetDefaults.doseG) <= 0.01
    ? roundManualPresetWaterMl(preset.targetDefaults.targetWaterMl, methodFamily, preset)
    : roundManualPresetWaterMl(calcWaterFromDoseRatio(nextDoseG, ratio), methodFamily, preset);
  if (!Number.isFinite(nextWater) || nextWater <= 0) return null;

  const hardLimits = TARGET_WATER_METHOD_LIMITS[methodFamily];
  const clampedWater = hardLimits
    ? clamp(nextWater, hardLimits.min, hardLimits.max)
    : nextWater;
  const roundedClampedWater = roundManualPresetWaterMl(clampedWater, methodFamily, preset);
  return hardLimits
    ? clamp(roundedClampedWater, hardLimits.min, hardLimits.max)
    : roundedClampedWater;
}

function resolveManualPresetBrewWaterOverrideMl(
  preset: ManualBrewPreset | null | undefined,
  nextDoseG: number,
  totalWaterMl: number,
  methodFamily: AiBrewMethodFamily,
  brewMode: AiBrewMode,
) {
  if (!preset || brewMode !== 'hot' || methodFamily !== 'aeropress') return null;
  const officialSplit = {
    'inspired-wac-championship-style': { doseG: 18, brewWaterMl: 100 },
    'inspired-wac-2025-jan-ahrend': { doseG: 18, brewWaterMl: 100 },
    'inspired-wac-2025-dharun-vyas': { doseG: 16, brewWaterMl: 208 },
  }[preset.id];
  if (!officialSplit) return null;

  const officialDoseG = officialSplit.doseG;
  const officialBrewWaterMl = officialSplit.brewWaterMl;
  const brewWaterRatio = officialBrewWaterMl / officialDoseG;
  const scaledBrewWaterMl = Math.round(calcWaterFromDoseRatio(nextDoseG, brewWaterRatio));
  if (!Number.isFinite(scaledBrewWaterMl) || scaledBrewWaterMl <= 0) return null;

  return clamp(
    scaledBrewWaterMl,
    1,
    Math.max(1, totalWaterMl - 1),
  );
}

function parseRequiredNumber(label: string, value: string, min: number, max: number) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} is required.`);
  if (parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return parsed;
}

function parseOptionalNumber(label: string, value: string, min: number, max: number) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid number.`);
  if (parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return parsed;
}

function resolveTargetWaterOverrideBounds(methodFamily: AiBrewMethodFamily, doseG: number, ratioLowerBound: number, ratioUpperBound: number, brewMode: 'hot' | 'iced' = 'hot') {
  const hardLimits = TARGET_WATER_METHOD_LIMITS[methodFamily];
  if (methodFamily === 'french_press') {
    const min = Math.ceil(Math.max(hardLimits.min, doseG * 12));
    const max = Math.floor(Math.min(hardLimits.max, doseG * 17));
    return { min, max: Math.max(min, max) };
  }
  if (brewMode === 'iced') {
    const finalRatioMin = methodFamily === 'espresso' ? ratioLowerBound : 12;
    const finalRatioMax = methodFamily === 'espresso' ? ratioUpperBound : 18;
    const min = Math.ceil(Math.max(hardLimits.min, doseG * finalRatioMin));
    const max = Math.floor(Math.min(hardLimits.max, doseG * finalRatioMax));
    return { min, max: Math.max(min, max) };
  }
  const min = Math.ceil(Math.max(hardLimits.min, doseG * ratioLowerBound));
  const max = Math.floor(Math.min(hardLimits.max, doseG * ratioUpperBound));
  return { min, max: Math.max(min, max) };
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds >= 3600) {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return formatAiBrewTime(totalSeconds);
}

function formatBaristaRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1);
}

function formatBaristaTemperature(value: number) {
  if (!Number.isFinite(value)) return '--';
  return String(Math.round(value));
}

function methodFamilySupportsIced(methodFamily: AiBrewMethodFamily) {
  return ICED_METHOD_FAMILIES.has(methodFamily);
}

export function supportsAiBrewIcedMode(catalog: AiBrewCatalog | undefined, dripperId: string) {
  const dripper = catalog?.drippers.find((item) => item.id === dripperId);
  if (!dripper?.methodFamily) return true;
  if (dripperId === 'matrix-cold-brew') return false;
  return methodFamilySupportsIced(dripper.methodFamily);
}

function resolveMethodId(methodFamily: AiBrewMethodFamily): BrewMethodId {
  switch (methodFamily) {
    case 'espresso':
      return 'espresso';
    case 'chemex':
      return 'chemex';
    case 'kalita_wave':
      return 'kalita_wave';
    case 'melitta':
      return 'melitta';
    case 'french_press':
      return 'french_press';
    case 'aeropress':
      return 'aeropress';
    case 'clever_dripper':
    case 'hario_switch':
      return 'clever_dripper';
    case 'origami':
      return 'origami';
    case 'april':
      return 'april';
    case 'kono':
      return 'kono';
    case 'siphon':
      return 'siphon';
    case 'moka_pot':
      return 'moka_pot';
    case 'cold_brew':
      return 'cold_brew';
    case 'batch_brew':
      return 'batch_brew';
    case 'v60':
    default:
      return 'v60';
  }
}

function resolveIcedMethodId(methodFamily: AiBrewMethodFamily): BrewMethodId {
  if (!methodFamilySupportsIced(methodFamily)) return resolveMethodId(methodFamily);
  switch (methodFamily) {
    case 'chemex':
      return 'chemex_iced';
    case 'kalita_wave':
      return 'kalita_wave_iced';
    case 'melitta':
      return 'melitta_iced';
    case 'clever_dripper':
    case 'hario_switch':
      return 'clever_dripper_iced';
    case 'origami':
      return 'origami_iced';
    case 'april':
      return 'april_iced';
    case 'kono':
      return 'kono_iced';
    case 'v60':
    default:
      return 'v60_japanese_iced';
  }
}

function resolvePlannerMethodId(methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced'): BrewMethodId {
  return brewMode === 'iced' ? resolveIcedMethodId(methodFamily) : resolveMethodId(methodFamily);
}

function resolveRatioToolMethodId(methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced'): BrewMethodId {
  if (brewMode === 'iced') return resolveIcedMethodId(methodFamily);
  return resolveMethodId(methodFamily);
}

function resolveProfileBrewMethodId(profile: DeviceBrewProfile, methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  const fallback = resolvePlannerMethodId(methodFamily, brewMode);
  const candidate = profile.brewMethodId;
  const profileMethod = BREW_METHOD_MAP[candidate];
  if (!profileMethod) return fallback;
  if (brewMode === 'iced') return profileMethod.japaneseSplit ? candidate : fallback;
  return profileMethod.japaneseSplit ? fallback : candidate;
}

function adjustRange(parsed: ParsedNumericRange, bias: GrindBias, roastLevel: RoastLevel, brewMode: 'hot' | 'iced') {
  const center = (parsed.min + parsed.max) / 2;
  const span = Math.max(0.25, parsed.max - parsed.min);
  const roastShift = roastLevel === 'light' ? -0.08 : roastLevel === 'dark' ? 0.08 : 0;
  const brewShift = brewMode === 'iced' ? -0.05 : 0;
  const biasShift = bias === 'finer' ? -0.12 : bias === 'coarser' ? 0.12 : 0;
  const nextCenter = center + span * (roastShift + brewShift + biasShift);
  const halfSpan = Math.max(parsed.precision > 0 ? 0.12 : 1.5, span * 0.2);
  return {
    min: roundTo(nextCenter - halfSpan, parsed.precision),
    max: roundTo(nextCenter + halfSpan, parsed.precision),
  };
}

function resolveCatalogLabel(
  entry: ProcessCatalogEntry | VarietyCatalogEntry | undefined,
  customId: string,
  customValue: string,
  fallbackLabel: string,
) {
  if (!customId.trim()) return fallbackLabel;
  if (customId === CUSTOM_ENTRY_ID) return customValue.trim() || fallbackLabel;
  return entry?.label || fallbackLabel;
}

function normalizeNoteList(...groups: Array<Array<string | undefined>>) {
  return Array.from(
    new Set(
      groups
        .flat()
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function resolveAeroPressLowTempWarningFloor(roastLevel: RoastLevel) {
  if (roastLevel === 'light' || roastLevel === 'medium_light') return 91;
  if (roastLevel === 'medium') return 90;
  if (roastLevel === 'medium_dark') return 88;
  return 86;
}

function isStaleAeroPressLowTempWarning(note: string, methodFamily: AiBrewMethodFamily, roastLevel: RoastLevel, waterTempC: number) {
  if (methodFamily !== 'aeropress') return false;
  if (!/temp may be too low|too low for .* roast|consider raising/i.test(note)) return false;
  return waterTempC >= resolveAeroPressLowTempWarningFloor(roastLevel);
}

function filterContextualConformanceWarnings(
  notes: string[],
  params: { methodFamily: AiBrewMethodFamily; roastLevel: RoastLevel; waterTempC: number },
) {
  return notes.filter((note) => !isStaleAeroPressLowTempWarning(
    note,
    params.methodFamily,
    params.roastLevel,
    params.waterTempC,
  ));
}

function joinInstructionText(...parts: Array<string | undefined>) {
  return Array.from(
    new Set(
      parts
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).join(' ');
}

function hasValue(value: unknown) {
  return String(value || '').trim().length > 0;
}

function entryRiskTags(entry?: ProcessCatalogEntry | VarietyCatalogEntry) {
  return new Set((entry?.riskTags || []).map((tag) => String(tag).trim()).filter(Boolean));
}

function hasAnyRiskTag(entry: ProcessCatalogEntry | VarietyCatalogEntry | undefined, tags: string[]) {
  const riskTags = entryRiskTags(entry);
  return tags.some((tag) => riskTags.has(tag));
}

function buildBeanCoverageState(params: {
  input: AiBrewFormState;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
  processLabel: string;
  varietyLabel: string;
  methodFamily: AiBrewMethodFamily;
  deviceProfileMode: DeviceProfileMode;
  grindVerification: VerificationLevel;
  grindSettingMode: GrindSettingMode;
  grindCalibrationRequired?: boolean;
  waterMode: WaterMode;
  waterBrand?: WaterBrandProfile;
  waterMinerals: WaterMineralInput;
  waterMineralDerivation?: BrewPlan['waterMineralDerivation'];
  processRisk?: ProcessRiskModel;
  beanProfile: BeanProfileState;
  guardrailErrors: string[];
  workflowStatus?: MethodWorkflowValidationResult['status'];
  switchValidation?: SwitchStepValidation;
}): BeanCoverageState {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const beanText = [
    params.input.coffeeName,
    params.input.process,
    params.input.customProcess,
    params.input.variety,
    params.input.customVariety,
    params.processLabel,
    params.varietyLabel,
  ].join(' ').toLowerCase();

  const hasProcess = hasValue(params.input.process) || hasValue(params.input.customProcess);
  const hasVariety = hasValue(params.input.variety) || hasValue(params.input.customVariety);
  const hasCoffeeName = hasValue(params.input.coffeeName) && !/\b(unknown|test|qa)\b/i.test(params.input.coffeeName);
  const hasBeanDetail = hasProcess || hasVariety || hasCoffeeName || params.beanProfile.active;
  const waterKnown = params.waterMode === 'manual'
    || Boolean(params.waterBrand?.isBrewReady && params.waterBrand?.presetStatus === 'autofill');
  const grinderKnown = ['official', 'community_verified', 'curated'].includes(params.grindVerification)
    && !params.grindCalibrationRequired;
  const exactBrewer = params.deviceProfileMode === 'exact';
  const unsafe = params.guardrailErrors.length > 0
    || params.workflowStatus === 'blocked'
    || params.switchValidation?.status === 'blocked';

  if (hasProcess) reasons.push(`Process known: ${params.processLabel}.`);
  if (hasVariety) reasons.push(`Variety known: ${params.varietyLabel}.`);
  if (params.input.roastLevel) reasons.push(`Roast baseline: ${params.input.roastLevel}.`);
  if (exactBrewer) reasons.push('Exact brewer profile is available.');
  if (waterKnown) reasons.push(params.waterMode === 'manual' ? 'Manual water minerals provided.' : 'Brew-ready water profile is available.');
  if (grinderKnown) reasons.push(`Grinder reference is ${params.grindVerification}.`);

  const riskyBean = params.processRisk?.variability === 'high'
    || params.processRisk?.recommendationMode === 'taste_feedback_required'
    || hasAnyRiskTag(params.processEntry, ['decaf-sensitive', 'experimental', 'ferment-risk', 'high-ferment', 'non-arabica', 'canephora', 'liberica', 'excelsa', 'taste-feedback-required'])
    || hasAnyRiskTag(params.varietyEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa', 'unusual-species', 'bitter-risk', 'low-confidence-if-unverified'])
    || params.input.roastLevel === 'dark'
    || /\b(anaerobic|carbonic|lactic|ferment|co[-\s]?ferment|thermal|infused|decaf|robusta|canephora|liberica|excelsa|wet[-\s_]?hulled|giling\s+basah|old roast|fresh roast|45\+?\s*days|2\s*days|smoky|very dark|low[-\s]?density|high[-\s]?density)\b/i.test(beanText)
    || (typeof params.beanProfile.beanDensityGml === 'number' && (params.beanProfile.beanDensityGml < 0.65 || params.beanProfile.beanDensityGml > 0.74))
    || params.beanProfile.solubility === 'low'
    || params.beanProfile.solubility === 'high'
    || params.beanProfile.roastDevelopment === 'underdeveloped';
  const riskyWater = params.waterMinerals.tdsPpm < 30
    || params.waterMinerals.alkalinityPpm > 85
    || params.waterBrand?.classification === 'zero_mineral_ro'
    || params.waterBrand?.classification === 'low_mineral_clarity'
    || params.waterBrand?.classification === 'demineral_direct_experiment'
    || params.waterBrand?.classification === 'high_buffer'
    || params.waterBrand?.classification === 'alkaline_caution'
    || params.waterMineralDerivation === 'estimated_from_community_profile'
    || params.waterMineralDerivation === 'estimated_from_classification';

  const isBatchBrew = params.methodFamily === 'batch_brew';
  const isUnknownMachineTempFlow = isBatchBrew && !(
    params.input.dripperId.toLowerCase().includes('precision') ||
    params.input.dripperId.toLowerCase().includes('moccamaster')
  );

  const riskyReference = !exactBrewer
    || !grinderKnown
    || params.grindSettingMode === 'derived_baseline'
    || params.grindCalibrationRequired
    || !waterKnown
    || params.switchValidation?.status === 'caution'
    || isUnknownMachineTempFlow;

  if (isUnknownMachineTempFlow) {
    warnings.push('Unknown machine temperature and flow rate characteristics. Expected cup confidence capped at medium.');
  }

  if (!hasBeanDetail) warnings.push('Data beans tidak lengkap; AI Brew memakai baseline aman.');
  if (params.processRisk?.variability === 'high') warnings.push('Process high-variability: validate with taste feedback before increasing extraction.');
  if (hasAnyRiskTag(params.processEntry, ['decaf-sensitive'])) warnings.push('Decaf bisa lebih sensitif. Mulai dari baseline aman, lalu koreksi dari rasa.');
  if (hasAnyRiskTag(params.processEntry, ['experimental', 'ferment-risk', 'high-ferment', 'taste-feedback-required'])) warnings.push('Proses ini sangat bergantung pada kontrol produser. AI Brew memakai baseline konservatif dan butuh feedback rasa.');
  if (hasAnyRiskTag(params.processEntry, ['drying-only'])) reasons.push('Drying cue is treated as context, not a deterministic taste guarantee.');
  if (params.input.roastLevel === 'dark') warnings.push('Dark roast: protect bitterness with lower extraction pressure.');
  if (/\b(robusta|canephora|liberica|excelsa)\b/i.test(beanText) || hasAnyRiskTag(params.processEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa']) || hasAnyRiskTag(params.varietyEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa', 'unusual-species'])) warnings.push('Robusta/canephora/non-arabica cenderung lebih body-heavy dan mudah pahit jika ekstraksi terlalu agresif.');
  if (riskyWater) warnings.push('Water needs caution or manual verification before treating the prediction as high confidence.');
  if (!grinderKnown) warnings.push('Setelan grinder masih estimasi/fallback; kalibrasi dari waktu ekstraksi dan rasa.');
  if (params.grindCalibrationRequired) warnings.push('Setelan grinder memakai baseline metode; kalibrasi titik nol dan rasa sebelum dianggap presisi.');
  if (params.switchValidation && params.switchValidation.status !== 'safe') warnings.push(params.switchValidation.message);

  if (unsafe) {
    return {
      category: 'unsupported_unsafe',
      confidence: 'low',
      label: 'Blocked / unsafe combination',
      reasons: normalizeNoteList(reasons, ['Guardrail or workflow validation blocked this combination.']),
      warnings: normalizeNoteList(warnings, params.guardrailErrors, params.switchValidation ? [params.switchValidation.message] : []),
      nextAction: 'Adjust dose, water target, brewer size, or unsafe manual preset before brewing.',
    };
  }

  if (!hasBeanDetail) {
    return {
      category: 'unknown_fallback',
      confidence: 'low',
      label: 'Unknown bean / fallback',
      reasons: normalizeNoteList(['No process, variety, origin, or bean profile was provided.']),
      warnings: normalizeNoteList(warnings),
      nextAction: 'Use the balanced baseline, then record taste feedback after brewing.',
    };
  }

  if (riskyBean || riskyWater || riskyReference) {
    return {
      category: 'risk_caution',
      confidence: 'medium',
      label: 'Risk bean / caution',
      reasons: normalizeNoteList(reasons, ['Safe baseline used with caution flags.']),
      warnings: normalizeNoteList(warnings),
      nextAction: 'Brew the conservative baseline, then use taste feedback before changing dose or ratio.',
    };
  }

  if (hasProcess && hasVariety && exactBrewer && waterKnown && grinderKnown) {
    return {
      category: 'known_high',
      confidence: 'high',
      label: 'Known bean / high confidence',
      reasons: normalizeNoteList(reasons),
      warnings: normalizeNoteList(warnings),
      nextAction: 'Brew the plan as a strong starting point; adjust only one variable after tasting.',
    };
  }

  return {
    category: 'partial_medium',
    confidence: 'medium',
    label: 'Partial bean / medium confidence',
    reasons: normalizeNoteList(reasons, ['Some bean detail is missing, so a safe baseline remains active.']),
    warnings: normalizeNoteList(warnings),
    nextAction: 'Add process, variety, roast development, or density to improve accuracy; taste feedback remains the first correction loop.',
  };
}

function distributeGapBudget(weights: number[], totalBudget: number) {
  if (weights.length === 0) return [] as number[];
  if (totalBudget <= 0) return weights.map(() => 0);

  const safeWeights = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0));
  const totalWeight = safeWeights.reduce((sum, value) => sum + value, 0);
  if (totalWeight <= 0) {
    const uniform = Math.floor(totalBudget / safeWeights.length);
    const allocations = safeWeights.map(() => uniform);
    let remainder = totalBudget - allocations.reduce((sum, value) => sum + value, 0);
    for (let index = allocations.length - 1; index >= 0 && remainder > 0; index -= 1) {
      allocations[index] += 1;
      remainder -= 1;
    }
    return allocations;
  }

  const raw = safeWeights.map((weight) => (totalBudget * weight) / totalWeight);
  const floor = raw.map((value) => Math.floor(value));
  let remainder = totalBudget - floor.reduce((sum, value) => sum + value, 0);
  const ranked = raw
    .map((value, index) => ({ index, fraction: value - floor[index] }))
    .sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; index < ranked.length && remainder > 0; index += 1) {
    floor[ranked[index].index] += 1;
    remainder -= 1;
  }

  return floor;
}

function buildAdaptiveStepStartSeconds(
  profile: DeviceBrewProfile,
  totalTimeSeconds: number,
  context: AdaptiveShareContext,
) {
  const count = profile.steps.length;
  if (count === 0) return [] as number[];
  if (count === 1) return [0];
  if (
    context.methodFamily === 'hario_switch'
    && (
      context.recipeStyle === 'immersion_sweet'
      || context.recipeStyle === 'immersion_heavy_body'
      || context.recipeStyle === 'mugen_everyday_hybrid'
    )
  ) {
    return profile.steps.map((step, index) => Math.max(index === 0 ? 0 : 10 * index, Math.round(step.startSeconds)));
  }

  const minGapSeconds = 10;
  const intentForFinalWindow = resolveContextTargetIntent(context);
  const extractionForFinalWindow = resolveExtractionResistance(context);
  const finalWindowBounds = resolveMethodFamilyFinalWindowBounds(context.methodFamily, context.brewMode);
  if (count === 3 && context.brewMode === 'iced' && isIcedManualPourOverFamily(context.methodFamily)) {
    const behavior = context.pourBehavior || resolveTargetPourBehavior(context.targetProfileId);
    const bloomTime = roundBaristaTimeSeconds(clamp(behavior?.bloomTimeSec || 42, 30, 60), context.methodFamily);
    const middleGap = behavior?.middleLoadBias === 'full'
      ? 65
      : behavior?.drawdownBias === 'faster'
        ? 55
        : 60;
    const maxFinalStart = Math.max(105, totalTimeSeconds - finalWindowBounds.min);
    return [0, bloomTime, clamp(bloomTime + middleGap, 90, maxFinalStart)];
  }
  const adaptiveFinalWindowSeconds = Math.round(clamp(
    34
      + (intentForFinalWindow === 'acidity' ? 6 : intentForFinalWindow === 'body' ? -6 : intentForFinalWindow === 'sweetness' ? 2 : 0)
      + resolveMethodFamilyFinalWindowDelta(context.methodFamily)
      + context.targetFamilyFinalWindowDeltaSec
      + context.originTargetMethodFinalWindowDeltaSec
      + (context.flavorDirection === 'acidity'
        ? Math.round(4 * context.flavorIntensity)
        : context.flavorDirection === 'body'
          ? Math.round(-4 * context.flavorIntensity)
          : 0)
      + Math.round((-context.doseScale) * 2)
      + extractionForFinalWindow * 2,
    finalWindowBounds.min,
    finalWindowBounds.max,
  ));
  const minLastStepSeconds = (count - 1) * minGapSeconds;
  const maxLastStepSeconds = Math.max(minLastStepSeconds, totalTimeSeconds - adaptiveFinalWindowSeconds);

  const rawStarts = profile.steps.map((step, index) => {
    const parsed = Math.round(step.startSeconds);
    if (!Number.isFinite(parsed)) return index * minGapSeconds;
    return Math.max(0, parsed);
  });

  const normalizedStarts = rawStarts.map((start, index) =>
    index === 0 ? 0 : Math.max(start, rawStarts[index - 1] + 1));

  const targetLastFromEnvelope = totalTimeSeconds - adaptiveFinalWindowSeconds;
  const targetLast = clamp(targetLastFromEnvelope, minLastStepSeconds, maxLastStepSeconds);

  const gapCount = count - 1;
  const baseGaps = Array.from({ length: gapCount }, (_, index) => {
    const current = normalizedStarts[index] || 0;
    const next = normalizedStarts[index + 1] || current + minGapSeconds;
    return Math.max(minGapSeconds, next - current);
  });

  const intent = resolveContextTargetIntent(context);
  const extractionResistance = resolveExtractionResistance(context);
  const flavorDirection = context.flavorDirection === 'balanced' ? intent : context.flavorDirection;
  const flavorIntensity = clamp(context.flavorIntensity, 0, 1);
  const methodDirectionalShift = resolveMethodFamilyDirectionalShift(context.methodFamily);
  const directionalShift = clamp(
    (intent === 'acidity' ? 0.6 : intent === 'body' ? -0.6 : 0)
      + extractionResistance * 0.3
      + methodDirectionalShift
      + context.targetFamilyDirectionalShift
      + context.originTargetMethodDirectionalShift,
    -1.2,
    1.2,
  );
  const methodMiddleShift = resolveMethodFamilyMiddleShift(context.methodFamily);
  const calibratedDirectionalShift = clamp(
    directionalShift
      + (flavorDirection === 'acidity' ? 0.28 * flavorIntensity : flavorDirection === 'body' ? -0.32 * flavorIntensity : 0)
      + ((-context.doseScale) * 0.28),
    -1.35,
    1.35,
  );
  const middleShift = clamp(
    (intent === 'sweetness' ? 0.6 : 0)
      + methodMiddleShift
      + context.targetFamilyMiddleShift
      + context.originTargetMethodMiddleShift
      + (flavorDirection === 'sweetness' ? 0.34 * flavorIntensity : 0),
    0,
    1.1,
  );

  const gapWeights = baseGaps.map((baseGap, index) => {
    const position = gapCount <= 1 ? 0.5 : index / (gapCount - 1);
    const frontBias = 1 - position;
    const backBias = position;
    const middleBias = 1 - Math.min(1, Math.abs(position - 0.5) * 2);
    const directionalWeight = calibratedDirectionalShift * (backBias - frontBias) * 0.32;
    const middleWeight = middleShift * middleBias * 0.22;
    return Math.max(0.55, baseGap * (1 + directionalWeight + middleWeight));
  });

  const minimumGapBudget = minGapSeconds * gapCount;
  const extraBudget = Math.max(0, targetLast - minimumGapBudget);
  const extras = distributeGapBudget(gapWeights, extraBudget);
  const finalGaps = extras.map((extra) => minGapSeconds + extra);

  const adapted = [0];
  for (let index = 0; index < finalGaps.length; index += 1) {
    adapted.push(adapted[index] + finalGaps[index]);
  }
  adapted[adapted.length - 1] = clamp(adapted[adapted.length - 1], minLastStepSeconds, maxLastStepSeconds);
  if (context.brewMode === 'iced' && isIcedManualPourOverFamily(context.methodFamily) && adapted.length >= 3) {
    const behavior = context.pourBehavior || resolveTargetPourBehavior(context.targetProfileId);
    const increment = resolveBaristaTimeIncrementSeconds(context.methodFamily);
    const targetBloomGap = roundBaristaTimeSeconds(clamp(behavior?.bloomTimeSec || 42, 30, 60), context.methodFamily);
    const lastIndex = adapted.length - 1;
    const lastStart = adapted[lastIndex];
    const minimumGapSeconds = Math.max(30, increment);
    const maxFirstGap = Math.min(65, Math.max(minimumGapSeconds, lastStart - (minimumGapSeconds * (adapted.length - 2))));
    const firstGap = clampRoundedToIncrement(targetBloomGap, minimumGapSeconds, maxFirstGap, increment);
    const normalized = [...adapted];
    normalized[1] = firstGap;
    const remainingGapCount = lastIndex - 1;
    for (let index = 2; index < lastIndex; index += 1) {
      const position = (index - 1) / Math.max(1, remainingGapCount);
      const rawStart = firstGap + ((lastStart - firstGap) * position);
      const minStart = normalized[index - 1] + minimumGapSeconds;
      const maxStart = lastStart - (minimumGapSeconds * (lastIndex - index));
      normalized[index] = clampRoundedToIncrement(rawStart, minStart, maxStart, increment);
    }
    return normalized;
  }
  if (context.brewMode === 'hot' && supportsAiBrewPourControls(context.methodFamily) && adapted.length >= 3) {
    const behavior = context.pourBehavior || resolveTargetPourBehavior(context.targetProfileId);
    const increment = resolveBaristaTimeIncrementSeconds(context.methodFamily);
    const targetBloomGap = roundBaristaTimeSeconds(clamp(behavior?.bloomTimeSec || 42, 30, 60), context.methodFamily);
    const lastIndex = adapted.length - 1;
    const lastStart = adapted[lastIndex];
    const minimumGapSeconds = Math.max(30, increment);
    const maxFirstGap = Math.min(65, Math.max(minimumGapSeconds, lastStart - (minimumGapSeconds * (adapted.length - 2))));
    const firstGap = clampRoundedToIncrement(targetBloomGap, minimumGapSeconds, maxFirstGap, increment);
    const normalized = [...adapted];
    normalized[1] = firstGap;
    const remainingGapCount = lastIndex - 1;
    for (let index = 2; index < lastIndex; index += 1) {
      const position = (index - 1) / Math.max(1, remainingGapCount);
      const rawStart = firstGap + ((lastStart - firstGap) * position);
      const minStart = normalized[index - 1] + minimumGapSeconds;
      const maxStart = lastStart - (minimumGapSeconds * (lastIndex - index));
      normalized[index] = clampRoundedToIncrement(rawStart, minStart, maxStart, increment);
    }
    return normalized;
  }
  return adapted;
}

function resolveManualPourBloomCeilingMl(context: AdaptiveShareContext) {
  if (!supportsAiBrewPourControls(context.methodFamily)) return null;
  const practicalMultiplier = context.brewMode === 'iced' ? 3.2 : 3.7;
  return roundBaristaVolumeMl(context.doseG * practicalMultiplier, context.methodFamily);
}

function normalizeBaristaStepStartSeconds(
  starts: number[],
  totalTimeSeconds: number,
  methodFamily: AiBrewMethodFamily,
  options: { finalWindowMinSeconds?: number } = {},
) {
  if (starts.length <= 1) return starts.map((start) => Math.max(0, Math.round(start)));
  const increment = resolveBaristaTimeIncrementSeconds(methodFamily);
  const baseMinGapSeconds = methodFamily === 'espresso' ? 1 : Math.min(30, Math.max(5, increment));
  const minGapSeconds = supportsAiBrewPourControls(methodFamily)
    ? Math.max(baseMinGapSeconds, 30)
    : baseMinGapSeconds;
  const finalWindowMinSeconds = Math.max(baseMinGapSeconds, options.finalWindowMinSeconds || baseMinGapSeconds);
  const minimumLastStartSeconds = minGapSeconds * (starts.length - 1);
  const maxStartBudget = Math.max(minimumLastStartSeconds, totalTimeSeconds - finalWindowMinSeconds);
  let previous = 0;

  return starts.map((start, index) => {
    if (index === 0) {
      previous = 0;
      return 0;
    }
    const remainingSteps = starts.length - 1 - index;
    const minimumStart = previous + minGapSeconds;
    const maximumStart = Math.max(minimumStart, maxStartBudget - remainingSteps * minGapSeconds);
    const roundedStart = roundToIncrement(start, increment);
    const normalizedStart = clampRoundedToIncrement(roundedStart, minimumStart, maximumStart, increment);
    previous = normalizedStart;
    return normalizedStart;
  });
}

type TargetIntent = 'acidity' | 'body' | 'sweetness' | 'balanced';
type OriginProfileId =
  | 'east_africa_floral'
  | 'latin_america_balanced'
  | 'central_america_cocoa'
  | 'mexico_mesoamerica'
  | 'andes_balanced'
  | 'caribbean_milds'
  | 'brazil_sweet'
  | 'indonesia_structured'
  | 'middle_east_dried_fruit'
  | 'pacific_islands_complex'
  | 'south_asia_monsoon_spice'
  | 'china_yunnan_fruit'
  | 'robusta_lowland_body'
  | 'asia_highland'
  | 'unknown';

type CalibrationAdjustment = {
  ratioDelta: number;
  tempDeltaC: number;
  brewTimeDeltaSec: number;
  grindBias: GrindBias;
  notes: string[];
  confidenceNotes: string[];
};

type OriginCalibrationAdjustment = CalibrationAdjustment & {
  profileId: OriginProfileId;
  matchedOrigins: string[];
};

type DoseCalibrationAdjustment = CalibrationAdjustment & {
  nominalDoseG: number;
  normalizedOffset: number;
};

type FlavorAlignmentAdjustment = CalibrationAdjustment & {
  dominantAxis: TargetIntent;
  intensity: number;
  scores: {
    acidity: number;
    sweetness: number;
    body: number;
  };
};

type MethodFamilyAdjustment = CalibrationAdjustment & {
  sequenceSignature:
    | 'clarity_flow'
    | 'sweet_contact'
    | 'flatbed_mid'
    | 'fast_even'
    | 'thick_filter'
    | 'immersion_release'
    | 'immersion_press'
    | 'pressure_immersion'
    | 'vacuum_clear'
    | 'stovetop_concentrate'
    | 'cold_immersion'
    | 'batch_consistency'
    | 'pressure_shot'
    | 'neutral';
};

type TargetFamilyAdjustment = CalibrationAdjustment & {
  finalWindowDeltaSec: number;
  directionalShift: number;
  middleShift: number;
  firstShareDelta: number;
  middleShareDelta: number;
  lastShareDelta: number;
};

type TargetAwareProcessAdjustment = CalibrationAdjustment & {
  minTempC?: number;
  maxTempC?: number;
};

type MethodTargetBehaviorPatch = CalibrationAdjustment;

type StepTechniqueMetadata = Pick<
  BrewPlanStep,
  'flowRateMlPerSec' | 'pourPath' | 'pourHeight' | 'agitationLevel'
>;

type OriginTargetMethodAdjustment = CalibrationAdjustment & {
  finalWindowDeltaSec: number;
  directionalShift: number;
  middleShift: number;
  firstShareDelta: number;
  middleShareDelta: number;
  lastShareDelta: number;
};

type TemperatureCalibration = {
  tempDeltaC: number;
  minTempC?: number;
  maxTempC?: number;
  notes: string[];
  confidenceNotes: string[];
};

type AdaptiveShareContext = {
  targetProfileId: string;
  targetProfileLabel: string;
  pourBehavior?: TargetProfilePourBehavior;
  methodFamily: AiBrewMethodFamily;
  dripperId?: string;
  dripperName?: string;
  filterStyle: DeviceBrewProfile['filterStyle'];
  flatBottomProfile?: FlatBottomProfileFamily;
  recipeStyle?:
    | Exclude<AeroPressRecipeStyle, 'auto'>
    | Exclude<FrenchPressRecipeStyle, 'auto'>
    | Exclude<KalitaWaveRecipeStyle, 'auto'>
    | Exclude<CleverDripperRecipeStyle, 'auto'>
    | Exclude<ChemexRecipeStyle, 'auto'>
    | Exclude<MokaPotRecipeStyle, 'auto'>
    | Exclude<ColdBrewRecipeStyle, 'auto'>
    | Exclude<BatchBrewRecipeStyle, 'auto'>
    | Exclude<SiphonRecipeStyle, 'auto'>
    | Exclude<OrigamiRecipeStyle, 'auto'>
    | Exclude<AprilRecipeStyle, 'auto'>
    | Exclude<MelittaRecipeStyle, 'auto'>
    | Exclude<KonoRecipeStyle, 'auto'>
    | SwitchPublicPresetId;
  physicalConstraints?: DevicePhysicalConstraints;
  methodProgramme?: SwitchBrewProgramme | string;
  manualTechniquePattern?: ManualBrewTechniquePattern;
  kalitaWaveStyle?: KalitaWaveRecipeStyle;
  cleverDripperStyle?: CleverDripperRecipeStyle;
  chemexStyle?: ChemexRecipeStyle;
  mokaPotStyle?: MokaPotRecipeStyle;
  coldBrewStyle?: ColdBrewRecipeStyle;
  batchBrewStyle?: BatchBrewRecipeStyle;
  siphonStyle?: SiphonRecipeStyle;
  origamiStyle?: OrigamiRecipeStyle;
  aprilStyle?: AprilRecipeStyle;
  melittaStyle?: MelittaRecipeStyle;
  konoStyle?: KonoRecipeStyle;
  brewMode: 'hot' | 'iced';
  roastLevel: RoastLevel;
  roastDevelopment?: BeanRoastDevelopment;
  solubility?: BeanSolubility;
  hardnessPpm: number;
  alkalinityPpm: number;
  processId?: string;
  varietyId?: string;
  highAromaNatural?: boolean;
  doseG: number;
  doseScale: number;
  flavorDirection: TargetIntent;
  flavorIntensity: number;
  targetFamilyFinalWindowDeltaSec: number;
  targetFamilyDirectionalShift: number;
  targetFamilyMiddleShift: number;
  targetFamilyFirstShareDelta: number;
  targetFamilyMiddleShareDelta: number;
  targetFamilyLastShareDelta: number;
  originTargetMethodFinalWindowDeltaSec: number;
  originTargetMethodDirectionalShift: number;
  originTargetMethodMiddleShift: number;
  originTargetMethodFirstShareDelta: number;
  originTargetMethodMiddleShareDelta: number;
  originTargetMethodLastShareDelta: number;
};

function isHarioSwitchContext(context: Pick<AdaptiveShareContext, 'dripperId' | 'dripperName'>) {
  const haystack = `${context.dripperId || ''} ${context.dripperName || ''}`.toLowerCase();
  return /\bhario[-\s]?switch\b|\bswitch\b/.test(haystack);
}

function resolveImmersionReleaseCopy(context: AdaptiveShareContext) {
  if (isHarioSwitchContext(context)) {
    const programme = String(context.methodProgramme || '');
    if (programme === 'full_percolation_v60_mode') {
      return {
        brewerName: 'Hario Switch',
        closedCue: 'Keep the switch open',
        releaseCue: 'keep the switch open',
        setOnServerCue: 'Set the Hario Switch on the server with the valve open',
        bloomPrep: 'Rinse the V60-style paper, preheat the brewer/server, tare the scale, then leave the switch open before dosing coffee.',
        openingDetail: 'Leave the valve open from the first bloom; this is percolation mode, not immersion.',
        middleDetail: 'Keep the valve open and use a clean center-to-mid pour so the cup stays transparent.',
        lateDetail: 'Finish the hot-water target with the valve still open; do not add a fake release step.',
        finishDetail: 'Let drawdown finish naturally with the valve open, then stir the server briefly.',
      };
    }
    if (programme === 'percolation_then_immersion' || programme === 'temperature_shift_hybrid') {
      return {
        brewerName: 'Hario Switch',
        closedCue: 'Use the switch briefly closed only for capture',
        releaseCue: 'open the switch before the cup gets heavy',
        setOnServerCue: 'Set the Hario Switch on the server and start with open flow',
        bloomPrep: 'Rinse the V60-style paper, preheat the brewer/server, tare the scale, then start with the valve open for a cleaner bloom.',
        openingDetail: 'Start open and low-agitation to preserve acidity, florals, and fruit definition.',
        middleDetail: 'Build most of the hot-water target as open percolation before the short closed capture.',
        lateDetail: 'Close only briefly for sweetness; avoid turning the bright target into a heavy immersion cup.',
        finishDetail: 'Open the switch before the finish flattens, then let drawdown stay clean.',
      };
    }
    if (programme === 'iced_hybrid') {
      return {
        brewerName: 'Hario Switch',
        closedCue: 'Keep the switch closed for the hot concentrate',
        releaseCue: 'open the switch over measured ice',
        setOnServerCue: 'Set the Hario Switch over a server with measured ice',
        bloomPrep: 'Rinse the V60-style paper, preheat the brewer, tare the scale, and put measured ice in the server before brewing.',
        openingDetail: 'Bloom as hot concentrate with the valve closed; ice is already counted in the final input.',
        middleDetail: 'Add only planned hot water through the bed; do not add hidden bypass later.',
        lateDetail: 'Keep the closed phase short so the iced cup stays fresh rather than heavy.',
        finishDetail: 'Release hot concentrate over ice, then stir the server 5-8 seconds.',
      };
    }
    if (programme === 'bloom_then_immersion' || programme === 'immersion_then_percolation' || programme === 'competition_hybrid') {
      return {
        brewerName: 'Hario Switch',
        closedCue: 'Use a controlled closed phase',
        releaseCue: 'open the switch at the release checkpoint',
        setOnServerCue: 'Set the Hario Switch on the server and follow the valve checkpoints',
        bloomPrep: 'Rinse the V60-style paper, preheat the brewer/server, tare the scale, then close the switch for the first sweetness checkpoint.',
        openingDetail: 'Close for bloom to capture sweetness, but keep the chamber load within the size guardrail.',
        middleDetail: 'Use the closed phase for sweetness, then release before the bed feels stalled.',
        lateDetail: 'Finish open if the plan asks for it; this keeps the cup cleaner than a full closed hold.',
        finishDetail: 'Open the switch cleanly, finish the hot-water target, and avoid late heavy agitation.',
      };
    }
    return {
      brewerName: 'Hario Switch',
      closedCue: 'Keep the switch closed',
      releaseCue: 'open the switch',
      setOnServerCue: 'Set the Hario Switch on the server',
      bloomPrep: 'Rinse the V60-style paper, preheat the brewer/server, and tare the scale first, then close the switch before adding coffee and brew water.',
      openingDetail: 'Keep the switch closed, wet the full bed evenly, and let immersion start doing the work without rushing the opening.',
      middleDetail: 'Keep the switch closed and add water calmly; let immersion carry extraction instead of forcing turbulence.',
      lateDetail: 'Keep the switch closed through the later contact window; avoid stirring late so the release stays clean.',
      finishDetail: 'Open the switch cleanly and let the bed drain on its own; do not stir, shake, or top up during the finishing drain.',
    };
  }

  const style = context.cleverDripperStyle || 'auto';
  if (style === 'reverse_water_first') {
    return {
      brewerName: 'Clever',
      closedCue: 'Keep the Clever closed',
      releaseCue: 'open the valve',
      setOnServerCue: 'Place the Clever on the server',
      bloomPrep: 'Rinse the paper, preheat the brewer, and tare the scale first, then close the valve and pour all hot water into the chamber BEFORE adding coffee.',
      openingDetail: 'Saturate the water by scattering coffee grounds evenly on the surface; do not stir!',
      middleDetail: 'Let the grounds extract as they float and slowly sink naturally; do not agitate the chamber.',
      lateDetail: 'Hold the later immersion phase completely still; let the coffee bed settle naturally.',
      finishDetail: 'Open the valve cleanly by placing on the server and let the clean liquor drain completely.',
    };
  }
  if (style === 'double_stage_hybrid') {
    return {
      brewerName: 'Clever',
      closedCue: 'Use controlled valve checkpoints',
      releaseCue: 'place on server / lift to close valve',
      setOnServerCue: 'Follow the dual-stage valve checkpoints',
      bloomPrep: 'Rinse the paper, preheat the brewer, tare the scale, and close the valve for the sweet pre-immersion bloom.',
      openingDetail: 'Saturate the bed slowly with the valve closed to capture rich, sweet bloom compounds.',
      middleDetail: 'Place on server to release bloom, then pour the second portion in spirals with the valve open.',
      lateDetail: 'Lift the Clever dripper from the server (closing the valve) and pour the final water portion for a short immersion stage.',
      finishDetail: 'Place back on the server to release the final concentrate and let it drain flat.',
    };
  }
  if (style === 'iced_clever') {
    return {
      brewerName: 'Clever',
      closedCue: 'Keep the Clever closed',
      releaseCue: 'open the valve over ice',
      setOnServerCue: 'Place the Clever over the server loaded with ice',
      bloomPrep: 'Rinse the paper, preheat the brewer, tare the scale, close the valve, and load the server with pre-weighed ice.',
      openingDetail: 'Pour all hot water rapidly into the closed chamber to brew a hot concentrate.',
      middleDetail: 'Close the lid and steep to trap all volatile aromatics; prepare your server with ice.',
      lateDetail: 'Keep the closed immersion quiet; prepare for immediate thermal locking.',
      finishDetail: 'Place the dripper on the ice server to release the hot concentrate directly over the ice cubes.',
    };
  }
  if (style === 'high_dose_concentrate') {
    return {
      brewerName: 'Clever',
      closedCue: 'Keep the Clever closed',
      releaseCue: 'open the valve',
      setOnServerCue: 'Place the Clever on the server',
      bloomPrep: 'Rinse the paper, preheat the brewer, and tare the scale first, then close the valve before adding the high dose.',
      openingDetail: 'Pour hot water slowly in circular paths over the massive coffee bed; stir gently.',
      middleDetail: 'Close the lid and steep for an extended period to maximize solubility and body.',
      lateDetail: 'Let the heavy bed settle; do not stir or swirl late to avoid clogging the paper.',
      finishDetail: 'Place on server. The coarse grind will prevent choking; let the rich, syrupy liquor drain completely.',
    };
  }

  return {
    brewerName: 'Clever',
    closedCue: 'Keep the Clever closed',
    releaseCue: 'open the valve',
    setOnServerCue: 'Place the Clever on the server',
    bloomPrep: 'Rinse the paper, preheat the brewer, and tare the scale first, then close the valve before adding coffee and brew water.',
    openingDetail: 'Wet the entire bed evenly and let immersion start doing the work; the opening should feel full, not rushed.',
    middleDetail: 'Add the next water calmly and let immersion carry extraction; there is no need to force agitation the way you would on an open dripper.',
    lateDetail: 'Hold the later middle phase calm and avoid stirring; Clever rewards a settled bed before the release.',
    finishDetail: 'Open the valve cleanly and let the bed release on its own; do not stir or shake the brewer during the finishing drain.',
  };
}

function resolveTargetIntent(label: string, targetProfileId?: string): TargetIntent {
  const normalizedId = String(targetProfileId || '').toLowerCase();
  if (normalizedId.includes('acid') || normalizedId.includes('clarity') || normalizedId.includes('floral') || normalizedId.includes('transparent')) return 'acidity';
  if (normalizedId.includes('body') || normalizedId.includes('depth') || normalizedId.includes('dense') || normalizedId.includes('comforting')) return 'body';
  if (normalizedId.includes('sweet') || normalizedId.includes('fruit') || normalizedId.includes('round')) return 'sweetness';

  const normalized = label.toLowerCase();
  if (normalized.includes('acid')) return 'acidity';
  if (normalized.includes('body') || normalized.includes('depth')) return 'body';
  if (normalized.includes('sweet')) return 'sweetness';
  return 'balanced';
}

function resolveContextTargetIntent(context: AdaptiveShareContext) {
  return resolveTargetIntent(context.targetProfileLabel, context.targetProfileId);
}

const CLARITY_PROCESS_IDS = new Set([
  'washed',
  'carbonic_washed',
  'controlled_fermentation',
  'double_washed',
  'fully_washed',
  'anaerobic_washed',
  'aerobic_fermentation',
  'double_soak_washed',
  'kenya_double_fermentation',
  'mechanically_demucilaged',
  'eco_pulped',
  'thermal_shock_washed',
]);

const SWEETNESS_PROCESS_IDS = new Set([
  'natural',
  'natural_anaerobic',
  'honey',
  'yellow_honey',
  'red_honey',
  'black_honey',
  'white_honey',
  'pulped_natural',
  'anaerobic_honey',
  'cold_fermentation',
  'dark_room_natural',
  'lactic',
  'raisin_natural',
  'shade_dried_natural',
  'yeast_inoculated',
  'koji_fermentation',
  'co_fermented',
  'thermal_shock_natural',
]);

const BODY_PROCESS_IDS = new Set([
  'natural',
  'wet_hulled',
  'anaerobic',
  'anaerobic_natural',
  'natural_anaerobic',
  'carbonic_natural',
  'carbonic_maceration',
  'extended_fermentation',
  'fruit_maceration',
  'semi_carbonic_maceration',
  'submerged_fermentation',
  'thermal_shock',
  'decaf',
  'mountain_water_decaf',
  'sugarcane_decaf',
  'swiss_water_decaf',
  'co2_decaf',
  'robusta_natural',
  'robusta_washed',
  'liberica_natural',
  'liberica_washed',
  'excelsa_natural',
  'excelsa_washed',
  'koji_fermentation',
  'co_fermented',
  'thermal_shock_natural',
  'wet_hulled_honey',
]);

const CLARITY_VARIETY_IDS = new Set([
  'geisha',
  'abyssinia',
  'ethiopian_heirloom',
  'sl28',
  'sl34',
  'wush_wush',
  'typica',
  'anfilloo',
  'gesha_1931',
  'rume_sudan',
  'centroamericano',
  'n39',
  'caturra_chiroso',
  'bourbon_pointu',
  'sidra',
  'kudhume',
  'eugenioides',
  'stenophylla',
  'racemosa',
]);

const SWEETNESS_VARIETY_IDS = new Set([
  'bourbon',
  'acaia',
  'topazio',
  'yellow_bourbon',
  'caturra',
  'catuai',
  'arara',
  'blue_mountain',
  'gesha_1931',
  'tekisic',
  'centroamericano',
  'colombia_variety',
  'kartika',
  'catuai_99',
  'catuai_144',
  'caturra_chiroso',
  'orange_bourbon',
  'andina',
  'ombligon',
  'pink_bourbon',
  'sidra',
]);

const BODY_VARIETY_IDS = new Set([
  'pacamara',
  'maracaturra',
  'maragogipe',
  'robusta',
  'conilon',
  'excelsa',
  'bp_534',
  'bp_936',
  'bp_939',
  'brs_2314',
  'kr1',
  'roubi_1',
  'tr4',
  'tr9',
  'trs1',
  'liberica',
  's795',
  'sigararutang',
  'sigarar_utang',
  'jember',
  'gayo_2',
  'linie_s',
  'sln_9',
  'timor_hybrid',
  'arabusta',
  'eugenioides',
  'stenophylla',
  'racemosa',
]);

type VarietyIntentSignal = {
  acidity: boolean;
  sweetness: boolean;
  body: boolean;
  sourceLabel: string;
};

const VARIETY_CLARITY_PATTERN = /\b(geisha|gesha|sl\s?28|sl\s?34|ethiopian\s+heirloom|heirloom|landrace|wush\s?wush|rume\s+sudan|caturra\s+chiroso|bourbon\s+pointu|sidra|wush|yirgacheffe)\b/i;
const VARIETY_SWEETNESS_PATTERN = /\b(bourbon|yellow\s+bourbon|orange\s+bourbon|pink\s+bourbon|red\s+bourbon|caturra|catuai|catua[iy]|typica|mundo\s+novo|mokka|sidra|ombligon|acaia|arara|blue\s+mountain|tekisic|kartika|andungsari|kartika)\b/i;
const VARIETY_BODY_PATTERN = /\b(robusta|conilon|canephora|liberica|excelsa|arabusta|pacamara|maracaturra|maragogipe|maracatu|catimor|timor|tim\s?tim|s795|ateng|sigarar|jember|linie\s+s|gayo\s*2|andungsari|bp\s?534|bp\s?936|bp\s?939)\b/i;

function inferVarietyIntentSignal(params: {
  varietyId?: string;
  varietyEntry?: VarietyCatalogEntry;
  customVarietyText?: string;
}): VarietyIntentSignal {
  const varietyId = String(params.varietyId || params.varietyEntry?.id || '').toLowerCase();
  const haystack = normalizeSearchHaystack([
    varietyId,
    params.customVarietyText,
    params.varietyEntry?.label,
    params.varietyEntry?.searchText,
    ...(params.varietyEntry?.aliases || []),
  ]);
  const acidity = CLARITY_VARIETY_IDS.has(varietyId) || VARIETY_CLARITY_PATTERN.test(haystack);
  const sweetness = SWEETNESS_VARIETY_IDS.has(varietyId) || VARIETY_SWEETNESS_PATTERN.test(haystack);
  const body = BODY_VARIETY_IDS.has(varietyId) || VARIETY_BODY_PATTERN.test(haystack);
  const sourceLabel = params.varietyEntry?.label || params.customVarietyText || varietyId || 'variety context';
  return { acidity, sweetness, body, sourceLabel };
}

export interface CustomProcessDetection {
  id: string;
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

export function detectCustomProcess(
  input: Partial<AiBrewFormState>,
  catalog?: AiBrewCatalog,
): CustomProcessDetection | null {
  const haystack = normalizeSearchHaystack([
    input.customProcess,
    input.coffeeName,
    input.customVariety,
  ]);
  if (!haystack) return null;
  const hasProcess = (id: string) => !catalog || Boolean(findProcessEntry(catalog, id));
  const pick = (id: string, confidence: CustomProcessDetection['confidence'], note: string): CustomProcessDetection | null =>
    hasProcess(id) ? { id, confidence, note } : null;

  if (/\b(anaerobic\s+natural|natural\s+anaerobic)\b/.test(haystack)) {
    return pick('natural_anaerobic', 'high', 'Custom process cue mapped to anaerobic natural; numeric changes stay conservative.');
  }
  if (/\b(carbonic|cm|maceration)\b/.test(haystack) && /\b(washed|wet\s+process)\b/.test(haystack)) {
    return pick('carbonic_washed', 'medium', 'Custom process cue mapped to carbonic washed; fermentation risk is treated conservatively.');
  }
  if (/\b(carbonic|cm|maceration)\b/.test(haystack) && /\b(natural|dry\s+process)\b/.test(haystack)) {
    return pick('carbonic_natural', 'medium', 'Custom process cue mapped to carbonic natural; fermentation risk is treated conservatively.');
  }
  if (/\b(co[-\s]?ferment|coferment|infused|fruit\s+maceration|fruit[-\s]?infused|koji|enzyme)\b/.test(haystack)) {
    return pick('coferment', 'medium', 'Experimental process cue mapped to co-ferment/infused; taste feedback is required before pushing extraction.');
  }
  if (/\bnitrogen\b/.test(haystack)) {
    return pick('nitrogen_maceration', 'low', 'Custom process cue mapped to nitrogen maceration; keep the baseline conservative and verify by taste.');
  }
  if (/\b(rum\s+barrel|barrel[-\s]?aged|barrel\s+rested)\b/.test(haystack)) {
    return pick(/\brum\s+barrel\b/.test(haystack) ? 'rum_barrel_aged' : 'barrel_aged', 'low', 'Custom process cue mapped to barrel-aged experimental baseline.');
  }
  if (/\btriple\s+(stage\s+)?fermentation\b/.test(haystack)) {
    return pick('triple_fermentation', 'low', 'Custom process cue mapped to triple fermentation; taste feedback is required.');
  }
  if (/\b(giling\s+basah|wet[-\s]?hulled|semi[-\s]?washed\s+indonesia)\b/.test(haystack)) {
    if (/\bhoney\b/.test(haystack)) {
      return pick('wet_hulled_honey', 'medium', 'Custom process cue mapped to wet-hulled honey; keep the baseline conservative and verify by taste.')
        || pick('wet_hulled', 'high', 'Custom process cue mapped to wet-hulled Indonesian baseline.');
    }
    return pick('wet_hulled', 'high', 'Custom process cue mapped to wet-hulled Indonesian baseline.');
  }
  if (/\b(co2|carbon\s+dioxide|supercritical\s+co2)\b/.test(haystack) && /\b(decaf|decaffeinated)\b/.test(haystack)) {
    return pick('co2_decaf', 'medium', 'Custom process cue mapped to CO2 decaf baseline; decaf sensitivity stays active.');
  }
  if (/\b(sugarcane|ea\s+decaf|ethyl\s+acetate)\b/.test(haystack) && /\b(decaf|decaffeinated)\b/.test(haystack)) {
    return pick('sugarcane_decaf', 'high', 'Custom process cue mapped to sugarcane decaf baseline.');
  }
  if (/\bswiss\s+water\b/.test(haystack)) {
    return pick('swiss_water_decaf', 'high', 'Custom process cue mapped to Swiss Water decaf baseline.');
  }
  if (/\bmountain\s+water\b/.test(haystack)) {
    return pick('mountain_water_decaf', 'high', 'Custom process cue mapped to mountain water decaf baseline.');
  }
  if (/\b(decaf|decaffeinated)\b/.test(haystack)) {
    return pick('decaf', 'medium', 'Custom process cue mapped to decaf baseline.');
  }
  if (/\b(natural|dry\s+process)\b/.test(haystack) && /\b(robusta|canephora)\b/.test(haystack)) {
    return pick('robusta_natural', 'medium', 'Custom process cue mapped to natural robusta; non-arabica bitterness guard stays active.');
  }
  if (/\b(washed|wet\s+process)\b/.test(haystack) && /\b(robusta|canephora)\b/.test(haystack)) {
    return pick('robusta_washed', 'medium', 'Custom process cue mapped to washed robusta; non-arabica bitterness guard stays active.');
  }
  if (/\b(natural|dry\s+process)\b/.test(haystack) && /\bliberica\b/.test(haystack)) {
    return pick('liberica_natural', 'medium', 'Custom process cue mapped to natural Liberica; non-arabica guard stays active.');
  }
  if (/\b(washed|wet\s+process)\b/.test(haystack) && /\bliberica\b/.test(haystack)) {
    return pick('liberica_washed', 'medium', 'Custom process cue mapped to washed Liberica; non-arabica guard stays active.');
  }
  if (/\b(natural|dry\s+process)\b/.test(haystack) && /\bexcelsa\b/.test(haystack)) {
    return pick('excelsa_natural', 'medium', 'Custom process cue mapped to natural Excelsa; non-arabica guard stays active.');
  }
  if (/\b(washed|wet\s+process)\b/.test(haystack) && /\bexcelsa\b/.test(haystack)) {
    return pick('excelsa_washed', 'medium', 'Custom process cue mapped to washed Excelsa; non-arabica guard stays active.');
  }
  if (/\b(double\s+washed|fully\s+washed|washed|wet\s+process)\b/.test(haystack)) {
    if (/\b(kenya|kenyan|double\s+fermentation)\b/.test(haystack)) {
      return pick('kenya_double_fermentation', 'medium', 'Custom process cue mapped to Kenya double fermentation washed baseline.')
        || pick('double_washed', 'medium', 'Custom process cue mapped to double washed baseline.');
    }
    if (/\b(extended|long)\s+fermentation\b/.test(haystack)) {
      return pick('washed_extended_fermentation', 'medium', 'Custom process cue mapped to washed extended fermentation baseline.');
    }
    if (/\bfully\s+washed\b/.test(haystack)) {
      return pick('fully_washed', 'high', 'Custom process cue mapped to fully washed baseline.')
        || pick('washed', 'high', 'Custom process cue mapped to washed baseline.');
    }
    if (/\bwet\s+process\b/.test(haystack)) {
      return pick('wet_process', 'high', 'Custom process cue mapped to wet process baseline.')
        || pick('washed', 'high', 'Custom process cue mapped to washed baseline.');
    }
    return pick(/\bdouble\s+washed\b/.test(haystack) ? 'double_washed' : 'washed', 'high', 'Custom process cue mapped to washed baseline.');
  }
  if (/\b(honey|pulped\s+natural)\b/.test(haystack)) {
    if (/\b(extended|long)\s+fermentation\b/.test(haystack)) {
      return pick('honey_extended_fermentation', 'medium', 'Custom process cue mapped to honey extended fermentation baseline.');
    }
    return pick(/\bpulped\s+natural\b/.test(haystack) ? 'pulped_natural' : 'honey', 'high', 'Custom process cue mapped to honey/pulped-natural baseline.');
  }
  if (/\b(natural|dry\s+process)\b/.test(haystack)) {
    if (/\b(extended|long)\s+fermentation\b/.test(haystack)) {
      return pick('natural_extended_fermentation', 'medium', 'Custom process cue mapped to natural extended fermentation baseline.');
    }
    if (/\braised[-\s]?bed\b/.test(haystack)) {
      return pick('raised_bed_natural', 'medium', 'Custom process cue mapped to raised-bed natural baseline.');
    }
    if (/\bdry\s+process\b/.test(haystack)) {
      return pick('dry_process', 'high', 'Custom process cue mapped to dry process baseline.')
        || pick('natural', 'high', 'Custom process cue mapped to natural baseline.');
    }
    return pick('natural', 'high', 'Custom process cue mapped to natural baseline.');
  }
  if (/\banaerobic\b/.test(haystack)) {
    return pick('anaerobic', 'medium', 'Custom process cue mapped to anaerobic baseline; numeric changes stay conservative.');
  }
  return null;
}

export function deriveBeanTaxonomySignal(params: {
  input: Partial<AiBrewFormState>;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
  processLabel: string;
  varietyLabel: string;
  customProcessDetection?: CustomProcessDetection | null;
  processRisk?: ProcessRiskModel;
}): BeanTaxonomySignal {
  const processText = normalizeProcessInput([
    params.input.process,
    params.input.customProcess,
    params.processEntry?.id,
    params.processEntry?.label,
    params.processEntry?.searchText,
    ...(params.processEntry?.aliases || []),
  ].filter(Boolean).join(' '));
  const varietyText = normalizeVarietyInput([
    params.input.variety,
    params.input.customVariety,
    params.varietyEntry?.id,
    params.varietyEntry?.label,
    params.varietyEntry?.searchText,
    ...(params.varietyEntry?.aliases || []),
    params.varietyEntry?.taxonomy?.species,
    params.varietyEntry?.taxonomy?.lineageGroup,
    params.varietyEntry?.taxonomy?.cultivarType,
  ].filter(Boolean).join(' '));
  const hasProcess = hasValue(params.input.process) || hasValue(params.input.customProcess);
  const hasVariety = hasValue(params.input.variety) || hasValue(params.input.customVariety);
  const hasCatalogProcess = Boolean(params.processEntry);
  const hasCatalogVariety = Boolean(params.varietyEntry);
  const processReview = params.processEntry?.reviewStatus;
  const varietyReview = params.varietyEntry?.reviewStatus;
  const processRegional = params.processEntry?.source === 'regional-curation'
    || params.processEntry?.group === 'regional'
    || processReview === 'needs_review';
  const varietyRegional = params.varietyEntry?.source === 'regional-curation'
    || params.varietyEntry?.taxonomy?.cultivarType === 'regional_alias'
    || params.varietyEntry?.group.includes('regional')
    || varietyReview === 'needs_review';
  const risky = params.processRisk?.variability === 'high'
    || params.processRisk?.recommendationMode === 'taste_feedback_required'
    || hasAnyRiskTag(params.processEntry, ['decaf-sensitive', 'experimental', 'ferment-risk', 'high-ferment', 'non-arabica', 'canephora', 'liberica', 'excelsa', 'taste-feedback-required'])
    || hasAnyRiskTag(params.varietyEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa', 'unusual-species', 'bitter-risk', 'low-confidence-if-unverified'])
    || /\b(anaerobic|carbonic|lactic|co[-\s]?ferment|infused|thermal|koji|enzyme|experimental|decaf|robusta|canephora|liberica|excelsa|wet\s+hulled|giling\s+basah|barrel|nitrogen|triple)\b/i.test(`${processText} ${varietyText}`);
  const reasons = normalizeNoteList([
    hasCatalogProcess ? `Process catalog match: ${params.processLabel}.` : undefined,
    hasCatalogVariety ? `Variety catalog match: ${params.varietyLabel}.` : undefined,
    params.customProcessDetection ? `Custom process mapped to ${params.customProcessDetection.id}.` : undefined,
    processRegional || varietyRegional ? 'Regional alias or review-needed taxonomy is treated as curated, not official.' : undefined,
    hasAnyRiskTag(params.processEntry, ['drying-only']) ? 'Drying-only cue is treated as context, not a primary recipe driver.' : undefined,
  ]);
  const warnings = normalizeNoteList([
    !hasProcess && !hasVariety ? 'Data beans belum lengkap; AI Brew memakai acuan aman.' : undefined,
    hasProcess && !hasCatalogProcess && !params.customProcessDetection ? 'Proses yang dimasukkan belum cocok dengan katalog; gunakan evaluasi rasa untuk koreksi.' : undefined,
    hasVariety && !hasCatalogVariety ? 'Varietas manual belum cocok ke katalog; keyakinan tetap konservatif.' : undefined,
    hasAnyRiskTag(params.processEntry, ['decaf-sensitive']) ? 'Kopi decaf bisa lebih sensitif; gunakan acuan aman dan koreksi dari rasa.' : undefined,
    hasAnyRiskTag(params.processEntry, ['experimental', 'ferment-risk', 'high-ferment', 'taste-feedback-required']) ? 'Proses ini sangat bergantung pada kontrol produser; evaluasi rasa tetap diperlukan.' : undefined,
    hasAnyRiskTag(params.processEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa']) || hasAnyRiskTag(params.varietyEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa', 'unusual-species']) ? 'Robusta, canephora, dan spesies non-arabika cenderung memiliki body lebih tebal dan mudah pahit jika ekstraksi terlalu agresif.' : undefined,
    risky ? 'Bean atau proses memiliki risiko tinggi; gunakan acuan konservatif dan ubah satu variabel saja.' : undefined,
  ]);

  if (!hasProcess && !hasVariety) {
    return {
      category: 'unknown_fallback',
      confidence: 'low',
      processLabel: params.processLabel,
      varietyLabel: params.varietyLabel,
      reasons,
      warnings,
    };
  }

  if (risky) {
    return {
      category: 'risk_caution',
      confidence: 'medium',
      processId: params.processEntry?.id || params.customProcessDetection?.id,
      varietyId: params.varietyEntry?.id,
      processLabel: params.processLabel,
      varietyLabel: params.varietyLabel,
      reasons,
      warnings,
    };
  }

  if (params.customProcessDetection || (hasProcess && !hasCatalogProcess) || (hasVariety && !hasCatalogVariety)) {
    return {
      category: 'custom_detected',
      confidence: params.customProcessDetection?.confidence || 'low',
      processId: params.processEntry?.id || params.customProcessDetection?.id,
      varietyId: params.varietyEntry?.id,
      processLabel: params.processLabel,
      varietyLabel: params.varietyLabel,
      reasons,
      warnings,
    };
  }

  if (processRegional || varietyRegional) {
    return {
      category: 'regional_alias',
      confidence: 'medium',
      processId: params.processEntry?.id,
      varietyId: params.varietyEntry?.id,
      processLabel: params.processLabel,
      varietyLabel: params.varietyLabel,
      reasons,
      warnings,
    };
  }

  return {
    category: 'known_catalog',
    confidence: hasCatalogProcess && hasCatalogVariety ? 'high' : 'medium',
    processId: params.processEntry?.id,
    varietyId: params.varietyEntry?.id,
    processLabel: params.processLabel,
    varietyLabel: params.varietyLabel,
    reasons,
    warnings,
  };
}

export function resolveDefaultTargetProfileForBean(
  input: Partial<AiBrewFormState>,
  catalog?: AiBrewCatalog,
): { id?: string; reason: string } {
  const customProcessDetection = input.process === CUSTOM_ENTRY_ID ? detectCustomProcess(input, catalog) : null;
  const processEntry = input.process && input.process !== CUSTOM_ENTRY_ID && catalog
    ? findProcessEntry(catalog, String(input.process))
    : customProcessDetection && catalog
      ? findProcessEntry(catalog, customProcessDetection.id)
      : undefined;
  const varietyEntry = input.variety && input.variety !== CUSTOM_ENTRY_ID && catalog
    ? findVarietyEntry(catalog, String(input.variety))
    : undefined;
  const processId = String(processEntry?.id || customProcessDetection?.id || input.process || '').toLowerCase();
  const varietyId = String(varietyEntry?.id || input.variety || '').toLowerCase();
  const haystack = normalizeSearchHaystack([
    input.coffeeName,
    input.process === CUSTOM_ENTRY_ID || !input.process ? input.customProcess : undefined,
    processEntry?.label,
    processEntry?.searchText,
    ...(processEntry?.aliases || []),
    input.variety === CUSTOM_ENTRY_ID || !input.variety ? input.customVariety : undefined,
    varietyEntry?.label,
    varietyEntry?.searchText,
    ...(varietyEntry?.aliases || []),
    varietyEntry?.taxonomy?.species,
    varietyEntry?.taxonomy?.lineageGroup,
  ]);
  const altitude = Number.parseFloat(String(input.altitudeMasl || ''));
  const roastLevel = input.roastLevel || 'medium';
  const hasTarget = (id: string) => !catalog || catalog.targetProfiles.some((profile) => profile.id === id);
  const pickTarget = (ids: string[], reason: string) => ({
    id: ids.find(hasTarget) || (hasTarget('balance_clean') ? 'balance_clean' : undefined),
    reason,
  });
  const varietySignal = inferVarietyIntentSignal({
    varietyId,
    varietyEntry,
    customVarietyText: input.variety === CUSTOM_ENTRY_ID || !input.variety ? input.customVariety : undefined,
  });
  const lineageGroup = varietyEntry?.taxonomy?.lineageGroup;
  const species = varietyEntry?.taxonomy?.species;
  const processBias = processEntry?.sensoryBias;
  const varietyBias = varietyEntry?.sensoryBias;
  const clarityCue = (processBias?.clarity || 0) + (varietyBias?.clarity || 0);
  const sweetnessCue = (processBias?.sweetness || 0) + (varietyBias?.sweetness || 0);
  const bodyCue = (processBias?.body || 0) + (varietyBias?.body || 0);
  const washedCue = CLARITY_PROCESS_IDS.has(processId)
    || /\b(washed|fully\s+washed|double\s+washed|wet\s+process|kenya\s+double\s+fermentation)\b/i.test(haystack);
  const highAltitudeCue = Number.isFinite(altitude)
    ? altitude >= 1600
    : /\b(high[-\s]?altitude|ethiopia|yirgacheffe|guji|kenya|nyeri|kirinyaga|tarrazu|antigua|huehuetenango|boquete|colombia|huila|cauca|narino|nari|peru|bolivia|yemen|papua\s+new\s+guinea|png)\b/i.test(haystack);
  const highClarityVarietyCue = /\b(geisha|gesha|sl28|sl34|ethiopian\s+landrace|ethiopian\s+heirloom|floral)\b/i.test(haystack)
    || lineageGroup === 'ethiopian_landrace'
    || lineageGroup === 'specialty_reference'
    || lineageGroup === 'kenyan_selection'
    || varietySignal.acidity
    || clarityCue >= 2;
  const experimentalProcessCue = processEntry?.processRisk?.recommendationMode === 'taste_feedback_required'
    || /\b(co[-\s]?ferment|coferment|infused|fruit\s+maceration|koji|enzyme|thermal\s+shock)\b/i.test(haystack);
  const anaerobicFruitCue = /\b(anaerobic\s+natural|carbonic|cm\b|maceration|anaerobic|lactic|yeast|extended\s+fermentation)\b/i.test(haystack);
  const naturalCleanCue = SWEETNESS_PROCESS_IDS.has(processId)
    || /\b(natural|dry\s+process|honey|pulped\s+natural)\b/i.test(haystack)
    || sweetnessCue >= 2
    || varietySignal.sweetness;
  const brazilSoftCue = /\b(brazil|brasil|cerrado|minas|mogiana|chocolate|cocoa|cacao|nutty|almond|hazelnut|caramel)\b/i.test(haystack)
    || (roastLevel === 'medium' && (sweetnessCue >= 1 || bodyCue >= 1) && !highClarityVarietyCue);

  if (processId === 'wet_hulled' || /\b(wet[-\s]?hulled|giling\s+basah|sumatra|mandheling|gayo|lintong|toraja)\b/i.test(haystack)) {
    return pickTarget(['dense_comforting', 'more_body'], 'Wet-hulled Indonesian cue: Dense & Comforting suggested.');
  }
  if (species === 'canephora' || species === 'liberica' || species === 'excelsa' || /\b(robusta|conilon|canephora|liberica|excelsa)\b/i.test(haystack)) {
    return pickTarget(['dense_comforting', 'more_body'], 'Canephora/non-arabica body cue: Dense & Comforting suggested.');
  }
  if (experimentalProcessCue || anaerobicFruitCue) {
    return pickTarget(['fruit_forward', 'more_sweetness'], 'Experimental or anaerobic fruit-process cue: Fruit-Forward suggested.');
  }
  if (washedCue && (highAltitudeCue || highClarityVarietyCue)) {
    return pickTarget(['floral_transparent', 'more_acidity'], 'Washed high-altitude or floral cue: Floral & Transparent suggested.');
  }
  if (washedCue && (bodyCue >= 2 || varietySignal.body || /\b(indonesia|catimor|timtim|s795|body|compact)\b/i.test(haystack))) {
    return pickTarget(['dense_comforting', 'more_body'], 'Washed body or Indonesian variety cue: Dense & Comforting suggested.');
  }
  if (washedCue) {
    return pickTarget(['balance_clean'], 'Washed process cue: Balance & Clean suggested.');
  }
  if (highClarityVarietyCue) {
    return pickTarget(['floral_transparent', 'balance_clean'], 'High-clarity variety cue: Floral & Transparent suggested.');
  }
  if (brazilSoftCue) {
    return pickTarget(['soft_round', 'more_sweetness'], 'Brazil, nutty, chocolate, or medium-roast cue: Soft & Round suggested.');
  }
  if (naturalCleanCue) {
    if (roastLevel === 'medium_dark' || roastLevel === 'dark' || bodyCue >= 2 || varietySignal.body) {
      return pickTarget(['soft_round', 'more_body'], 'Sweet/body cue: Soft & Round suggested.');
    }
    return pickTarget(['more_sweetness', 'fruit_forward'], 'Natural, honey, or clean sweetness cue: More Sweetness suggested.');
  }
  if (
    (CLARITY_PROCESS_IDS.has(processId) || /\b(washed|fully\s+washed|double\s+washed|wet\s+process)\b/i.test(haystack))
    && (Number.isFinite(altitude)
      ? altitude >= 1600
      : /\b(high[-\s]?altitude|ethiopia|yirgacheffe|guji|kenya|nyeri|kirinyaga|tarrazu|antigua|huehuetenango|boquete|colombia|huila|cauca|narino|nariño|peru|bolivia|yemen|papua\s+new\s+guinea|png)\b/i.test(haystack))
  ) {
    return pickTarget(['floral_transparent', 'more_acidity'], 'Washed high-altitude cue: Floral & Transparent suggested.');
  }
  if (
    processEntry?.processRisk?.recommendationMode === 'taste_feedback_required'
    || /\b(co[-\s]?ferment|coferment|infused|fruit\s+maceration|koji|enzyme|thermal\s+shock)\b/i.test(haystack)
  ) {
    return pickTarget(['fruit_forward', 'more_sweetness'], 'Experimental high-variability process cue: Fruit-Forward suggested.');
  }
  if (
    SWEETNESS_PROCESS_IDS.has(processId)
    || /\b(natural|honey|pulped\s+natural|anaerobic|carbonic|lactic|yeast|fermentation)\b/i.test(haystack)
    || sweetnessCue >= 2
    || varietySignal.sweetness
  ) {
    if (roastLevel === 'medium_dark' || roastLevel === 'dark' || bodyCue >= 2) {
      return pickTarget(['soft_round', 'more_body'], 'Sweet/body cue: Soft & Round suggested.');
    }
    return pickTarget(['fruit_forward', 'more_sweetness'], 'Natural or high-aroma process cue: Fruit-Forward suggested.');
  }
  if (varietySignal.acidity || clarityCue >= 2) {
    return pickTarget(['floral_transparent', 'more_acidity'], 'Clarity variety cue: Floral & Transparent suggested.');
  }
  if (varietySignal.body || bodyCue >= 2) {
    return pickTarget(['dense_comforting', 'more_body'], 'Body variety cue: Dense & Comforting suggested.');
  }
  return pickTarget(['balance_clean'], 'Unknown or weak evidence: Balance & Clean suggested.');
}

export function resolveDefaultTargetProfileIdForBean(
  input: Partial<AiBrewFormState>,
  catalog?: AiBrewCatalog,
) {
  return resolveDefaultTargetProfileForBean(input, catalog).id;
}
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createOriginKeywordPattern(keyword: string) {
  const source = escapeRegExp(keyword.trim())
    .replace(/\s+/g, '\\s+')
    .replace(/'/g, "['’]?");
  return new RegExp(`\\b${source}\\b`, 'i');
}

const ORIGIN_PROFILE_RULES: Array<{
  profileId: OriginProfileId;
  label: string;
  keywords: string[];
  patterns: RegExp[];
}> = ORIGIN_PROFILE_RULES_V2026_05.map((rule) => ({
  profileId: rule.profileId as OriginProfileId,
  label: rule.label,
  keywords: rule.keywords,
  patterns: rule.keywords.map(createOriginKeywordPattern),
}));

function createNeutralCalibrationAdjustment(): CalibrationAdjustment {
  return {
    ratioDelta: 0,
    tempDeltaC: 0,
    brewTimeDeltaSec: 0,
    grindBias: 'same',
    notes: [],
    confidenceNotes: [],
  };
}

function detectOriginProfile(text: string) {
  const normalized = text.trim();
  if (!normalized) return null;

  for (const rule of ORIGIN_PROFILE_RULES) {
    const matchedOrigins = rule.keywords
      .filter((_, index) => rule.patterns[index]?.test(normalized))
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (matchedOrigins.length > 0) {
      return {
        profileId: rule.profileId,
        label: rule.label,
        matchedOrigins: Array.from(new Set(matchedOrigins)),
      };
    }
  }

  return null;
}

function normalizeSearchHaystack(parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeProcessInput(value: string) {
  return normalizeSearchHaystack([value])
    .replace(/[_/|]+/g, ' ')
    .replace(/[^\w\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeVarietyInput(value: string) {
  return normalizeSearchHaystack([value])
    .replace(/[_/|]+/g, ' ')
    .replace(/[^\w\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haystackHasAny(haystack: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(haystack));
}

function hasExplicitGeishaVariety(input: AiBrewFormState, varietyEntry?: VarietyCatalogEntry) {
  const varietyText = normalizeSearchHaystack([
    input.coffeeName,
    input.variety,
    input.customVariety,
    varietyEntry?.id,
    varietyEntry?.label,
    varietyEntry?.searchText,
    ...(varietyEntry?.aliases || []),
  ]);
  return haystackHasAny(varietyText, [/\bgeisha\b/i, /\bgesha\b/i]);
}

function isLightOrMediumLightRoast(roastLevel: RoastLevel) {
  return roastLevel === 'light' || roastLevel === 'medium_light';
}

function isMediumOrDarkerRoast(roastLevel: RoastLevel) {
  return roastLevel === 'medium' || roastLevel === 'medium_dark' || roastLevel === 'dark';
}

function isNaturalLikeProcess(processEntry?: ProcessCatalogEntry, explicitProcess?: string, customProcess?: string) {
  const processId = String(processEntry?.id || explicitProcess || '').toLowerCase();
  if (SWEETNESS_PROCESS_IDS.has(processId) || BODY_PROCESS_IDS.has(processId)) {
    if (/(natural|honey|anaerobic|carbonic|maceration|fermentation|lactic|yeast|koji|co_fermented)/i.test(processId)) {
      return true;
    }
  }
  const processText = normalizeSearchHaystack([
    explicitProcess,
    customProcess,
    processEntry?.id,
    processEntry?.label,
    processEntry?.searchText,
    ...(processEntry?.aliases || []),
  ]);
  return haystackHasAny(processText, [
    /\bnatural\b/i,
    /\bhoney\b/i,
    /\banaerobic\b/i,
    /\bcarbonic\b/i,
    /\bmaceration\b/i,
    /\bfermentation\b/i,
    /\blactic\b/i,
    /\byeast\b/i,
    /\bkoji\b/i,
  ]);
}

function resolveHardToExtractHotFilterFloor(params: {
  input: AiBrewFormState;
  methodFamily: AiBrewMethodFamily;
  processEntry?: ProcessCatalogEntry;
}) {
  if (params.input.brewMode !== 'hot') return null;
  if (!POUR_CONTROL_METHOD_FAMILIES.has(params.methodFamily)) return null;
  if (!isLightOrMediumLightRoast(params.input.roastLevel)) return null;

  const processId = String(params.processEntry?.id || params.input.process || '').toLowerCase();
  const processText = normalizeSearchHaystack([
    params.input.process,
    params.input.customProcess,
    params.processEntry?.id,
    params.processEntry?.label,
    params.processEntry?.searchText,
    ...(params.processEntry?.aliases || []),
  ]);
  const isWashedHighClarity = CLARITY_PROCESS_IDS.has(processId)
    || haystackHasAny(processText, [/\bwashed\b/i, /\bfully washed\b/i, /\bwet process\b/i]);
  if (!isWashedHighClarity) return null;
  if (isNaturalLikeProcess(params.processEntry, params.input.process, params.input.customProcess)) return null;

  const density = Number.parseFloat(String(params.input.beanDensityGml || ''));
  const altitude = Number.parseFloat(String(params.input.altitudeMasl || ''));
  const isUnderdeveloped = params.input.roastDevelopment === 'underdeveloped';
  const isLowSolubility = params.input.solubility === 'low';
  const isDenseHighAltitude = Number.isFinite(density)
    && density >= 0.75
    && Number.isFinite(altitude)
    && altitude >= 1850;
  if (!isUnderdeveloped && !isLowSolubility && !isDenseHighAltitude) return null;

  const strongExtractionNeed = isUnderdeveloped || isLowSolubility;
  const cueLabels = normalizeNoteList([
    isUnderdeveloped ? 'underdeveloped roast' : undefined,
    isLowSolubility ? 'low-solubility bean' : undefined,
    isDenseHighAltitude ? 'high-density high-altitude bean' : undefined,
  ]);

  return {
    minTempC: strongExtractionNeed ? 94 : 93.5,
    minTimeSeconds: strongExtractionNeed ? 150 : 145,
    notes: [
      `Hard-to-extract light washed filter floor active: ${cueLabels.join(', ')} keeps extraction pressure coherent before acidity/floral target shortening.`,
    ],
    confidenceNotes: [
      'Barista extraction floor active: hard-to-extract washed hot filter plan cannot be shortened below the minimum service window.',
    ],
  };
}

function hasHighAromaNaturalCue(
  input: AiBrewFormState,
  processEntry?: ProcessCatalogEntry,
  varietyEntry?: VarietyCatalogEntry,
) {
  if (!isNaturalLikeProcess(processEntry, input.process, input.customProcess)) {
    return false;
  }
  const haystack = normalizeSearchHaystack([
    input.coffeeName,
    input.customVariety,
    varietyEntry?.id,
    varietyEntry?.label,
    varietyEntry?.searchText,
    ...(varietyEntry?.aliases || []),
    ...(varietyEntry?.origins || []),
  ]);
  return haystackHasAny(haystack, [
    /\bombligon\b/i,
    /\bcolombia\b/i,
    /\bhuila\b/i,
    /\bcauca\b/i,
    /\bnarino\b/i,
    /\bnariño\b/i,
    /\bpanama\b/i,
    /\bboquete\b/i,
    /\bgesha\b/i,
    /\bgeisha\b/i,
  ]);
}

function createNeutralTemperatureCalibration(): TemperatureCalibration {
  return {
    tempDeltaC: 0,
    notes: [],
    confidenceNotes: [],
  };
}

function deriveBaristaTemperatureCalibration(params: {
  input: AiBrewFormState;
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
  originAdjustment: OriginCalibrationAdjustment;
}) {
  const calibration = createNeutralTemperatureCalibration();
  if (params.methodFamily === 'cold_brew' || params.methodFamily === 'espresso' || params.methodFamily === 'moka_pot') {
    return calibration;
  }

  const processText = normalizeSearchHaystack([
    params.input.process,
    params.input.customProcess,
    params.processEntry?.id,
    params.processEntry?.label,
    params.processEntry?.searchText,
    ...(params.processEntry?.aliases || []),
  ]);
  const varietyText = normalizeSearchHaystack([
    params.input.variety,
    params.input.customVariety,
    params.varietyEntry?.id,
    params.varietyEntry?.label,
    params.varietyEntry?.searchText,
    ...(params.varietyEntry?.aliases || []),
  ]);
  const coffeeText = normalizeSearchHaystack([
    params.input.coffeeName,
    params.input.customProcess,
    params.input.customVariety,
    varietyText,
    processText,
  ]);

  const isWashed = haystackHasAny(processText, [/\bwashed\b/i, /\bfully washed\b/i, /\bwet process\b/i]);
  const isGeisha = hasExplicitGeishaVariety(params.input, params.varietyEntry);
  const isEastAfrica = params.originAdjustment.profileId === 'east_africa_floral'
    || haystackHasAny(coffeeText, [/\bethiopia\b/i, /\byirgacheffe\b/i, /\bchelbesa\b/i, /\bchebesa\b/i, /\bkenya\b/i, /\bsl28\b/i, /\bsl34\b/i]);
  const isKenya = haystackHasAny(coffeeText, [/\bkenya\b/i, /\bnyeri\b/i, /\bkirinyaga\b/i, /\bsl28\b/i, /\bsl34\b/i]);
  const isEthiopia = haystackHasAny(coffeeText, [/\bethiopia\b/i, /\byirgacheffe\b/i, /\bchelbesa\b/i, /\bchebesa\b/i, /\bguji\b/i, /\bsidamo\b/i]);
  const isIndonesiaBody = params.originAdjustment.profileId === 'indonesia_structured'
    || haystackHasAny(coffeeText, [/\bsumatra\b/i, /\bgayo\b/i, /\baceh\b/i, /\blintong\b/i, /\bmandheling\b/i]);
  const isAntigua = haystackHasAny(coffeeText, [/\bantigua\b/i, /\bguatemala\b/i]);
  const isCostaRica = haystackHasAny(coffeeText, [/\bcosta rica\b/i, /\btarrazu\b/i]);
  const isColombia = haystackHasAny(coffeeText, [/\bcolombia\b/i, /\bexcelso\b/i, /\bhuila\b/i, /\bcauca\b/i]);
  const isHighAromaNatural = hasHighAromaNaturalCue(params.input, params.processEntry, params.varietyEntry);
  const isNaturalSweetnessTarget = isHighAromaNatural
    && params.input.targetProfileId === 'more_sweetness'
    && isLightOrMediumLightRoast(params.input.roastLevel);

  if (params.methodFamily === 'aeropress') {
    calibration.minTempC = isMediumOrDarkerRoast(params.input.roastLevel) ? 88 : 90;
    calibration.maxTempC = params.input.roastLevel === 'dark' ? 91 : 94;
    calibration.tempDeltaC += params.input.roastLevel === 'medium_dark' || params.input.roastLevel === 'dark' ? 0.5 : 1.4;
    if (
      isWashed
      && isLightOrMediumLightRoast(params.input.roastLevel)
      && (
        params.input.targetProfileId === 'floral_transparent'
        || params.input.targetProfileId === 'more_acidity'
        || isGeisha
        || isEastAfrica
        || isColombia
      )
    ) {
      calibration.minTempC = 91;
      calibration.maxTempC = 94;
      calibration.tempDeltaC += 0.6;
      calibration.notes.push('AeroPress washed light clarity profile uses a warmer 91-94C service band; press control, not extra heat, keeps the finish clean.');
      calibration.confidenceNotes.push('Barista temperature calibration active: AeroPress washed-light clarity floor.');
    }
    calibration.notes.push('AeroPress service floor protects medium and lighter roasts from under-extraction; preheat, then press steadily instead of using a very low kettle temperature.');
    calibration.confidenceNotes.push('Barista temperature calibration active: AeroPress immersion floor.');
    return calibration;
  }

  if (params.methodFamily === 'french_press') {
    calibration.minTempC = params.input.roastLevel === 'dark' ? 88 : 90;
    calibration.maxTempC = params.input.roastLevel === 'dark' ? 92 : 94;
    calibration.tempDeltaC += params.input.roastLevel === 'medium_dark' || params.input.roastLevel === 'dark' ? -0.2 : 0.2;
    calibration.notes.push('French Press temperature kept in a calm immersion band so body builds without extracting harsh fines.');
    calibration.confidenceNotes.push('Barista temperature calibration active: French Press immersion band.');
    return calibration;
  }

  if (
    params.methodFamily === 'hario_switch'
    && isWashed
    && isLightOrMediumLightRoast(params.input.roastLevel)
    && (
      params.input.targetProfileId === 'floral_transparent'
      || params.input.targetProfileId === 'more_acidity'
      || params.input.targetProfileId === 'fruit_forward'
      || params.input.targetProfileId === 'balance_clean'
      || isGeisha
      || isEastAfrica
      || isColombia
    )
  ) {
    calibration.minTempC = params.brewMode === 'iced' ? 91 : 91;
    calibration.maxTempC = 94;
    calibration.tempDeltaC += params.brewMode === 'iced' ? 0.6 : 0.8;
    calibration.notes.push('Hario Switch washed light clarity profile keeps a warmer 91-94C hybrid band; valve timing controls texture while temperature keeps florals from tasting thin.');
    calibration.confidenceNotes.push('Barista temperature calibration active: Switch washed-light clarity floor.');
    return calibration;
  }

  if (
    params.methodFamily === 'clever_dripper'
    && params.brewMode === 'hot'
    && isWashed
    && isLightOrMediumLightRoast(params.input.roastLevel)
    && (
      params.input.targetProfileId === 'floral_transparent'
      || params.input.targetProfileId === 'more_acidity'
      || isGeisha
      || isEastAfrica
    )
  ) {
    calibration.minTempC = 92;
    calibration.maxTempC = 94;
    calibration.tempDeltaC += 0.8;
    calibration.notes.push('No-bypass/steep-release washed light profile stays around 92-94C so florals open without pushing the long-contact phase harsh.');
    calibration.confidenceNotes.push('Barista temperature calibration active: no-bypass washed-light clarity floor.');
    return calibration;
  }

  if (params.brewMode === 'iced' && ICED_MANUAL_POUR_OVER_FAMILIES.has(params.methodFamily)) {
    calibration.maxTempC = 96;
    if (params.input.targetProfileId === 'more_sweetness' && isLightOrMediumLightRoast(params.input.roastLevel)) {
      calibration.minTempC = 92;
      calibration.maxTempC = 93;
      calibration.tempDeltaC -= 0.8;
      calibration.notes.push('Japanese-iced More Sweetness light/medium-light baseline is capped at 92-93C; higher heat is reserved only for explicit hard-to-extract cues.');
      calibration.confidenceNotes.push('Barista temperature calibration active: safe light-roast Japanese-iced sweetness cap.');
    } else if (isNaturalSweetnessTarget) {
      calibration.minTempC = 91;
      calibration.maxTempC = 93;
      calibration.tempDeltaC -= 1.3;
      calibration.notes.push('Natural high-aroma Japanese-iced profile is capped around 91-93C so fruit sweetness stays clean without harsh ferment notes.');
      calibration.confidenceNotes.push('Barista temperature calibration active: natural high-aroma iced sweetness cap.');
    } else if (params.methodFamily === 'v60' && params.input.targetProfileId === 'more_sweetness' && params.input.roastLevel === 'medium') {
      calibration.minTempC = 93;
      calibration.maxTempC = 93;
      calibration.tempDeltaC -= 0.4;
      calibration.notes.push('V60 Japanese-iced More Sweetness medium roast is held around 93C for compact extraction without pushing aromatics harsh.');
      calibration.confidenceNotes.push('Barista temperature calibration active: V60 Japanese-iced sweetness envelope.');
    } else if (
      isWashed
      && isLightOrMediumLightRoast(params.input.roastLevel)
      && (
        params.input.targetProfileId === 'floral_transparent'
        || params.input.targetProfileId === 'more_acidity'
        || isGeisha
        || isEastAfrica
        || isColombia
      )
    ) {
      calibration.minTempC = 92;
      calibration.maxTempC = 94;
      calibration.tempDeltaC += 0.7;
      calibration.notes.push('Japanese-iced washed light clarity profile keeps hot-water concentrate around 92-94C so bright acids extract before chilling.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed-light Japanese-iced clarity floor.');
    } else if (isGeisha) {
      calibration.minTempC = 92;
      calibration.maxTempC = 94;
      calibration.tempDeltaC -= 1.8;
      calibration.notes.push('Delicate Geisha/Gesha iced profile capped at 92-94°C to protect floral aroma while keeping Japanese-style concentration.');
      calibration.confidenceNotes.push('Barista temperature calibration active: delicate Geisha iced cap.');
    } else if (isIndonesiaBody) {
      calibration.minTempC = 90;
      calibration.maxTempC = params.methodFamily === 'chemex' ? 92 : 93;
      calibration.tempDeltaC -= params.methodFamily === 'chemex' ? 2.2 : 1.4;
      calibration.notes.push('Structured Indonesian iced profile uses lower kettle energy so body stays sweet instead of bitter or burnt.');
      calibration.confidenceNotes.push('Barista temperature calibration active: Indonesian Japanese-iced body control.');
    } else if (isColombia && isWashed && params.methodFamily === 'april') {
      calibration.minTempC = 93;
      calibration.maxTempC = 95;
      calibration.tempDeltaC += 1.1;
      calibration.notes.push('Washed Colombia on April iced gets a little more kettle energy to lift caramel, red-apple, and citrus sweetness.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed Colombia April iced lift.');
    }
    if (calibration.notes.length === 0) {
      calibration.notes.push('Japanese-iced manual pour-over is capped at 96C so the concentrate extracts efficiently without using unnecessary kettle heat.');
      calibration.confidenceNotes.push('Barista temperature calibration active: general Japanese-iced temperature cap.');
    }
    return calibration;
  }

  if (params.brewMode === 'hot' && ICED_MANUAL_POUR_OVER_FAMILIES.has(params.methodFamily)) {
    if (isNaturalSweetnessTarget) {
      calibration.minTempC = 90;
      calibration.maxTempC = 92;
      calibration.tempDeltaC -= 1.1;
      calibration.notes.push('Natural high-aroma hot filter profile stays around 90-92C with calmer agitation to protect fruit sweetness and avoid a rough finish.');
      calibration.confidenceNotes.push('Barista temperature calibration active: natural high-aroma hot sweetness cap.');
    } else if (params.methodFamily === 'v60' && params.input.targetProfileId === 'more_sweetness' && params.input.roastLevel === 'medium') {
      calibration.minTempC = 92;
      calibration.maxTempC = 94;
      calibration.tempDeltaC += 0.1;
      calibration.notes.push('V60 hot More Sweetness medium roast stays in a 92-94C service band so sweetness thickens without over-driving acidity.');
      calibration.confidenceNotes.push('Barista temperature calibration active: V60 hot sweetness envelope.');
    } else if (
      isGeisha
      && isWashed
      && isLightOrMediumLightRoast(params.input.roastLevel)
      && [
        'floral_transparent',
        'more_acidity',
        'fruit_forward',
        'balance_clean',
      ].includes(params.input.targetProfileId)
    ) {
      calibration.minTempC = 92;
      calibration.maxTempC = 95;
      calibration.tempDeltaC += 1.2;
      calibration.notes.push('Washed Geisha/Gesha light hot pour-over keeps a 92-95C service band so floral clarity opens without chasing harsh extraction.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed Geisha hot pour-over clarity floor.');
    } else if (isKenya && isWashed && isLightOrMediumLightRoast(params.input.roastLevel)) {
      calibration.minTempC = 94;
      calibration.maxTempC = 96;
      calibration.tempDeltaC += 1.5;
      calibration.notes.push('Washed Kenya light/medium-light profile lifted toward 94-96°C so berry, citrus, and bergamot notes extract clearly.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed Kenya bright filter lift.');
    } else if (isEthiopia && isWashed && isLightOrMediumLightRoast(params.input.roastLevel)) {
      calibration.minTempC = 94;
      calibration.maxTempC = 96;
      calibration.tempDeltaC += 1.4;
      calibration.notes.push('Washed Ethiopia/Yirgacheffe light profile lifted toward 94-96°C to open citrus, honey, and floral clarity.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed Ethiopia bright filter lift.');
    } else if ((isCostaRica || isAntigua) && isWashed && isLightOrMediumLightRoast(params.input.roastLevel)) {
      calibration.minTempC = 93;
      calibration.maxTempC = 95;
      calibration.tempDeltaC += 0.8;
      calibration.notes.push('Washed Central America light/medium-light profile nudged toward 93-95°C for citrus, caramel, and clean sweetness.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed Central America filter lift.');
    } else if (isEastAfrica && isWashed && isLightOrMediumLightRoast(params.input.roastLevel)) {
      calibration.minTempC = 93;
      calibration.maxTempC = 96;
      calibration.tempDeltaC += 0.9;
      calibration.notes.push('Bright washed highland profile uses a slightly warmer filter envelope so clarity does not turn thin.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed highland filter lift.');
    } else if (
      isWashed
      && isLightOrMediumLightRoast(params.input.roastLevel)
      && [
        'floral_transparent',
        'more_acidity',
        'fruit_forward',
        'balance_clean',
      ].includes(params.input.targetProfileId)
    ) {
      calibration.minTempC = 92;
      calibration.maxTempC = 95;
      calibration.tempDeltaC += isColombia ? 0.9 : 0.6;
      calibration.notes.push('Washed light/medium-light clarity filter profile keeps a 92-95C service band so roast solubility is respected before water or grinder cautions are applied.');
      calibration.confidenceNotes.push('Barista temperature calibration active: washed light clarity filter floor.');
    }

    const naturalOrFermentRisk = isNaturalLikeProcess(params.processEntry, params.input.process, params.input.customProcess)
      || hasAnyRiskTag(params.processEntry, ['experimental', 'ferment-risk', 'high-ferment', 'taste-feedback-required']);
    if (naturalOrFermentRisk && isLightOrMediumLightRoast(params.input.roastLevel)) {
      calibration.minTempC = Math.max(calibration.minTempC ?? 90, 90);
      calibration.maxTempC = Math.min(calibration.maxTempC ?? 93, 93);
      calibration.notes.push('Hot filter natural/ferment profile stays in a controlled 90-93C band: enough extraction for light roast, without pushing winey or sharp notes.');
      calibration.confidenceNotes.push('Barista temperature calibration active: hot natural/ferment light-roast band.');
    } else if (isLightOrMediumLightRoast(params.input.roastLevel)) {
      calibration.minTempC = Math.max(calibration.minTempC ?? 89, 89);
      calibration.notes.push('Hot filter light/medium-light roast keeps at least 89C so the cup does not become hollow from under-extraction.');
      calibration.confidenceNotes.push('Barista temperature calibration active: hot light-roast filter floor.');
    }
    if (params.input.roastLevel === 'dark') {
      calibration.minTempC = Math.max(calibration.minTempC ?? 86, 86);
      calibration.maxTempC = Math.min(calibration.maxTempC ?? 92.5, 92.5);
      calibration.notes.push('Dark roast hot filter profile caps kettle energy around 92.5C to protect sweetness and reduce bitter, dry finish risk.');
      calibration.confidenceNotes.push('Barista temperature calibration active: dark roast hot filter ceiling.');
    }
  }

  return calibration;
}

function deriveOriginAdjustment(
  input: AiBrewFormState,
  processEntry: ProcessCatalogEntry | undefined,
  varietyEntry: VarietyCatalogEntry | undefined,
  targetProfileLabel: string,
  targetProfileId?: string,
): OriginCalibrationAdjustment {
  const explicitMatch = detectOriginProfile(String(input.coffeeName || '').toLowerCase());
  const inferredMatch = explicitMatch
    ? null
    : detectOriginProfile([
      ...(varietyEntry?.origins || []),
      ...(processEntry?.origins || []),
      varietyEntry?.originNotes || '',
    ].join(' ').toLowerCase());
  const resolvedMatch = explicitMatch || inferredMatch;
  if (!resolvedMatch) {
    return {
      ...createNeutralCalibrationAdjustment(),
      profileId: 'unknown',
      matchedOrigins: [],
    };
  }

  const targetIntent = resolveTargetIntent(targetProfileLabel, targetProfileId);
  const strength = explicitMatch ? 1 : 0.55;
  let ratioDelta = 0;
  let tempDeltaC = 0;
  let brewTimeDeltaSec = 0;
  let grindBias: GrindBias = 'same';

  switch (resolvedMatch.profileId) {
    case 'east_africa_floral':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.05;
        tempDeltaC = -0.3;
        brewTimeDeltaSec = -6;
        grindBias = 'coarser';
      } else if (targetIntent === 'balanced') {
        ratioDelta = 0.03;
        tempDeltaC = -0.2;
        brewTimeDeltaSec = -3;
        grindBias = 'coarser';
      } else if (targetIntent === 'body') {
        ratioDelta = -0.01;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      } else {
        ratioDelta = 0.01;
      }
      break;
    case 'latin_america_balanced':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.02;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = -2;
        grindBias = 'coarser';
      } else if (targetIntent === 'sweetness') {
        ratioDelta = -0.02;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      } else if (targetIntent === 'body') {
        ratioDelta = -0.02;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      }
      break;
    case 'central_america_cocoa':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.01;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = -1;
      } else if (targetIntent === 'sweetness' || targetIntent === 'body') {
        ratioDelta = -0.02;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      } else {
        ratioDelta = -0.01;
        brewTimeDeltaSec = 1;
      }
      break;
    case 'mexico_mesoamerica':
      if (targetIntent === 'sweetness' || targetIntent === 'body') {
        ratioDelta = -0.02;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      } else if (targetIntent === 'acidity') {
        ratioDelta = 0.01;
        brewTimeDeltaSec = -1;
      } else {
        ratioDelta = -0.01;
        brewTimeDeltaSec = 1;
      }
      break;
    case 'andes_balanced':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.02;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = -2;
        grindBias = 'coarser';
      } else if (targetIntent === 'sweetness') {
        ratioDelta = -0.01;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 1;
      } else if (targetIntent === 'body') {
        ratioDelta = -0.02;
        brewTimeDeltaSec = 2;
      }
      break;
    case 'caribbean_milds':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.01;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = -1;
      } else {
        ratioDelta = -0.02;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      }
      break;
    case 'brazil_sweet':
      if (targetIntent === 'sweetness') {
        ratioDelta = -0.03;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 3;
        grindBias = 'finer';
      } else if (targetIntent === 'body') {
        ratioDelta = -0.03;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 3;
      } else if (targetIntent === 'acidity') {
        ratioDelta = 0.02;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = -2;
        grindBias = 'coarser';
      } else {
        ratioDelta = -0.01;
        brewTimeDeltaSec = 1;
      }
      break;
    case 'indonesia_structured':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.03;
        tempDeltaC = -0.2;
        brewTimeDeltaSec = -3;
        grindBias = 'coarser';
      } else if (targetIntent === 'body' || targetIntent === 'sweetness') {
        ratioDelta = -0.03;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = 2;
      }
      break;
    case 'middle_east_dried_fruit':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.02;
        tempDeltaC = -0.2;
        brewTimeDeltaSec = -2;
        grindBias = 'coarser';
      } else {
        ratioDelta = -0.03;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = 1;
        grindBias = targetIntent === 'balanced' ? 'same' : 'coarser';
      }
      break;
    case 'pacific_islands_complex':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.01;
        brewTimeDeltaSec = -1;
      } else if (targetIntent === 'body' || targetIntent === 'sweetness') {
        ratioDelta = -0.01;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      }
      break;
    case 'south_asia_monsoon_spice':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.03;
        tempDeltaC = -0.2;
        brewTimeDeltaSec = -3;
        grindBias = 'coarser';
      } else {
        ratioDelta = -0.03;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = 2;
        grindBias = 'coarser';
      }
      break;
    case 'china_yunnan_fruit':
      if (targetIntent === 'acidity' || targetIntent === 'balanced') {
        ratioDelta = 0.01;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = -1;
      } else {
        ratioDelta = -0.01;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 1;
      }
      break;
    case 'robusta_lowland_body':
      if (targetIntent === 'acidity') {
        ratioDelta = 0.03;
        tempDeltaC = -0.2;
        brewTimeDeltaSec = -3;
        grindBias = 'coarser';
      } else {
        ratioDelta = -0.04;
        tempDeltaC = -0.2;
        brewTimeDeltaSec = 2;
        grindBias = 'coarser';
      }
      break;
    case 'asia_highland':
      if (targetIntent === 'acidity' || targetIntent === 'balanced') {
        ratioDelta = 0.02;
        tempDeltaC = -0.1;
        brewTimeDeltaSec = -2;
        grindBias = 'coarser';
      } else {
        ratioDelta = -0.01;
        tempDeltaC = 0.1;
        brewTimeDeltaSec = 2;
      }
      break;
    default:
      break;
  }

  const scaledRatioDelta = roundTo(ratioDelta * strength, 2);
  const scaledTempDeltaC = roundTo(tempDeltaC * strength, 1);
  const scaledBrewTimeDeltaSec = Math.round(brewTimeDeltaSec * strength);

  return {
    profileId: resolvedMatch.profileId,
    matchedOrigins: resolvedMatch.matchedOrigins,
    ratioDelta: scaledRatioDelta,
    tempDeltaC: scaledTempDeltaC,
    brewTimeDeltaSec: scaledBrewTimeDeltaSec,
    grindBias: explicitMatch ? grindBias : 'same',
    notes: [
      explicitMatch
        ? `Origin cue ${resolvedMatch.label.toLowerCase()} adjusted the extraction envelope.`
        : `Catalog origin context (${resolvedMatch.label.toLowerCase()}) lightly tuned the extraction envelope.`,
    ],
    confidenceNotes: [
      explicitMatch
        ? `Origin cue recognized from coffee/origin input: ${resolvedMatch.label}.`
        : `Origin cue inferred from process/variety metadata: ${resolvedMatch.label}.`,
    ],
  };
}

function resolveNominalDoseG(methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  const baseline = (() => {
    switch (methodFamily) {
      case 'espresso':
        return 18;
      case 'chemex':
      case 'siphon':
        return 20;
      case 'clever_dripper':
      case 'hario_switch':
      case 'aeropress':
      case 'moka_pot':
        return 18;
      case 'kalita_wave':
      case 'melitta':
        return 16;
      case 'french_press':
        return 30;
      case 'cold_brew':
        return 60;
      case 'batch_brew':
        return 55;
      default:
        return 15;
    }
  })();
  return brewMode === 'iced' ? baseline + 2 : baseline;
}

function deriveDoseAdjustment(
  doseG: number,
  methodFamily: AiBrewMethodFamily,
  brewMode: 'hot' | 'iced',
): DoseCalibrationAdjustment {
  const nominalDoseG = resolveNominalDoseG(methodFamily, brewMode);
  const responseScale = methodFamily === 'chemex'
    ? 0.8
    : methodFamily === 'clever_dripper' || methodFamily === 'hario_switch' || methodFamily === 'french_press' || methodFamily === 'cold_brew' || methodFamily === 'batch_brew'
      ? 0.7
      : methodFamily === 'april' || methodFamily === 'aeropress' || methodFamily === 'espresso'
        ? 0.85
        : 1;
  const normalizedOffset = clamp(((doseG - nominalDoseG) / 6) * responseScale, -1, 1);
  const adjustment = createNeutralCalibrationAdjustment();

  adjustment.ratioDelta = roundTo(normalizedOffset * 0.05, 2);
  adjustment.tempDeltaC = roundTo(normalizedOffset * -0.2, 1);
  adjustment.brewTimeDeltaSec = Math.round(normalizedOffset * -7);
  adjustment.grindBias = normalizedOffset <= -0.35 ? 'finer' : normalizedOffset >= 0.35 ? 'coarser' : 'same';

  if (Math.abs(normalizedOffset) >= 0.2) {
    const methodLabel = methodFamily.replace(/_/g, ' ');
    const doseNote = methodFamily === 'moka_pot'
      ? normalizedOffset < 0
        ? 'Dose sits below the nominal moka pot basket fill range, so extraction was tightened slightly.'
        : 'Dose sits above the nominal moka pot basket fill range, so extraction was opened slightly.'
      : normalizedOffset < 0
        ? `Dose sits below the nominal ${methodLabel} service bed depth, so extraction was tightened slightly.`
        : `Dose sits above the nominal ${methodLabel} service bed depth, so extraction was opened slightly.`;
    adjustment.notes.push(
      doseNote,
    );
    adjustment.confidenceNotes.push(`Dose calibration active around ${doseG} g on ${methodLabel}.`);
  }

  return {
    ...adjustment,
    nominalDoseG,
    normalizedOffset,
  };
}

function resolveProcessRiskFallback(entry?: ProcessCatalogEntry) {
  if (!entry) return undefined;
  if (entry.processRisk) return entry.processRisk;
  if (hasAnyRiskTag(entry, ['experimental', 'ferment-risk', 'high-ferment', 'taste-feedback-required'])) {
    return { variability: 'high' as const, overFermentRisk: 'high' as const, recommendationMode: 'taste_feedback_required' as const };
  }
  if (hasAnyRiskTag(entry, ['decaf-sensitive', 'non-arabica', 'canephora', 'liberica', 'excelsa'])) {
    return { variability: 'medium' as const, overFermentRisk: 'medium' as const, recommendationMode: 'conservative' as const };
  }
  if (hasAnyRiskTag(entry, ['drying-only'])) {
    return { variability: 'medium' as const, overFermentRisk: 'low' as const, recommendationMode: 'conservative' as const };
  }
  const haystack = normalizeSearchHaystack([
    entry.id,
    entry.label,
    entry.group,
    entry.searchText,
    ...(entry.aliases || []),
  ]);
  if (/\b(co[-\s]?ferment|coferment|infused|fruit\s+maceration|koji|enzyme|thermal\s+shock)\b/i.test(haystack)) {
    return { variability: 'high' as const, overFermentRisk: 'high' as const, recommendationMode: 'taste_feedback_required' as const };
  }
  if (/\b(anaerobic|carbonic|lactic|yeast|extended\s+fermentation|mosto|submerged)\b/i.test(haystack)) {
    return { variability: 'high' as const, overFermentRisk: 'high' as const, recommendationMode: 'conservative' as const };
  }
  if (/\b(natural|honey|pulped\s+natural|wet[-\s]?hulled|giling\s+basah)\b/i.test(haystack)) {
    return { variability: 'medium' as const, overFermentRisk: 'medium' as const, recommendationMode: 'conservative' as const };
  }
  if (/\b(washed|fully\s+washed|double\s+washed|mechanically\s+demucilaged)\b/i.test(haystack)) {
    return { variability: 'low' as const, overFermentRisk: 'low' as const, recommendationMode: 'deterministic' as const };
  }
  return { variability: 'medium' as const, overFermentRisk: 'medium' as const, recommendationMode: 'conservative' as const };
}

function deriveSensoryBiasAdjustment(params: {
  targetProfileId: string;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
}): CalibrationAdjustment {
  const processBias = params.processEntry?.sensoryBias;
  const varietyBias = params.varietyEntry?.sensoryBias;
  const processRisk = resolveProcessRiskFallback(params.processEntry);
  if (!processBias && !varietyBias && !processRisk) return createNeutralCalibrationAdjustment();

  const targetIntent = resolveTargetIntent(params.targetProfileId, params.targetProfileId);
  const acidity = (processBias?.acidity || 0) + (varietyBias?.acidity || 0);
  const sweetness = (processBias?.sweetness || 0) + (varietyBias?.sweetness || 0);
  const body = (processBias?.body || 0) + (varietyBias?.body || 0);
  const clarity = (processBias?.clarity || 0) + (varietyBias?.clarity || 0);
  const fermentIntensity = Math.max(processBias?.fermentIntensity || 0, varietyBias?.fermentIntensity || 0);
  const bitternessRisk = Math.max(processBias?.bitternessRisk || 0, varietyBias?.bitternessRisk || 0);
  const aromaVolatility = Math.max(processBias?.aromaVolatility || 0, varietyBias?.aromaVolatility || 0);
  let ratioDelta = 0;
  let tempDeltaC = 0;
  let brewTimeDeltaSec = 0;
  const grindBiases: GrindBias[] = ['same'];
  const notes: string[] = [];
  const confidenceNotes: string[] = [];

  if (targetIntent === 'acidity' && (clarity >= 2 || acidity >= 2)) {
    ratioDelta += 0.02;
    tempDeltaC -= 0.1;
    brewTimeDeltaSec -= 1;
    grindBiases.push('coarser');
  }
  if (targetIntent === 'sweetness' && (sweetness >= 2 || aromaVolatility >= 2)) {
    ratioDelta += 0.01;
    tempDeltaC -= 0.1;
    brewTimeDeltaSec -= 1;
  }
  if (targetIntent === 'body' && body >= 2) {
    ratioDelta -= 0.02;
    brewTimeDeltaSec += 2;
    grindBiases.push('same');
  }
  if (fermentIntensity >= 2 || aromaVolatility >= 2) {
    ratioDelta += 0.02;
    tempDeltaC -= 0.15;
    brewTimeDeltaSec -= 2;
    grindBiases.push('coarser');
  }
  if (bitternessRisk >= 2 || processRisk?.recommendationMode === 'taste_feedback_required') {
    ratioDelta += 0.02;
    tempDeltaC -= 0.15;
    brewTimeDeltaSec -= 2;
    grindBiases.push('coarser');
  }

  ratioDelta = roundTo(clamp(ratioDelta, -0.04, 0.04), 2);
  tempDeltaC = roundTo(clamp(tempDeltaC, -0.3, 0.2), 1);
  brewTimeDeltaSec = Math.round(clamp(brewTimeDeltaSec, -5, 5));

  if (ratioDelta || tempDeltaC || brewTimeDeltaSec) {
    notes.push('Sensory taxonomy cue applied as a conservative baseline, not as a fixed flavor claim.');
    confidenceNotes.push(`Sensory bias active: acidity ${acidity}, sweetness ${sweetness}, body ${body}, clarity ${clarity}, ferment ${fermentIntensity}, bitterness risk ${bitternessRisk}.`);
  }
  if (processRisk?.variability === 'high') {
    notes.push('High-variability process detected; keep first brew conservative and use taste feedback before pushing extraction.');
  }

  return {
    ratioDelta,
    tempDeltaC,
    brewTimeDeltaSec,
    grindBias: combineBias(...grindBiases),
    notes,
    confidenceNotes,
  };
}

function resolveTargetAwareProcessAdjustment(params: {
  input: AiBrewFormState;
  targetProfile: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
}): TargetAwareProcessAdjustment {
  const adjustment: TargetAwareProcessAdjustment = createNeutralCalibrationAdjustment();
  const targetId = String(params.targetProfile.id || '').toLowerCase();
  const targetIntent = resolveTargetIntent(params.targetProfile.label, params.targetProfile.id);
  const processId = String(params.processEntry?.id || params.input.process || '').toLowerCase();
  const species = params.varietyEntry?.taxonomy?.species;
  const haystack = normalizeSearchHaystack([
    params.input.coffeeName,
    params.input.process,
    params.input.customProcess,
    params.processEntry?.id,
    params.processEntry?.label,
    params.processEntry?.searchText,
    ...(params.processEntry?.aliases || []),
    params.input.variety,
    params.input.customVariety,
    params.varietyEntry?.id,
    params.varietyEntry?.label,
    params.varietyEntry?.searchText,
    ...(params.varietyEntry?.aliases || []),
    params.varietyEntry?.taxonomy?.species,
    params.varietyEntry?.taxonomy?.lineageGroup,
  ]);
  const isSweetnessTarget = targetIntent === 'sweetness' || targetId === 'soft_round';
  const isBodyTarget = targetIntent === 'body' || targetId === 'dense_comforting';
  const isFruitTarget = targetId === 'fruit_forward' || targetIntent === 'sweetness';
  const isClarityTarget = targetIntent === 'acidity' || targetId === 'floral_transparent';
  const isNatural = processId === 'natural' || /\b(natural|dry\s+process)\b/i.test(haystack);
  const isHoney = /\b(honey|pulped\s+natural|yellow\s+honey|red\s+honey|black\s+honey|white\s+honey)\b/i.test(haystack);
  const isWetHulled = processId === 'wet_hulled' || /\b(wet[-\s]?hulled|giling\s+basah|semi[-\s]?washed\s+indonesia|sumatra|mandheling|gayo|lintong)\b/i.test(haystack);
  const isExperimental = params.processEntry?.processRisk?.recommendationMode === 'taste_feedback_required'
    || /\b(anaerobic|carbonic|cm\b|co[-\s]?ferment|coferment|infused|fruit\s+maceration|thermal\s+shock|lactic|yeast|extended\s+fermentation)\b/i.test(haystack);
  const isWashedHighClarity = (CLARITY_PROCESS_IDS.has(processId) || /\b(washed|fully\s+washed|double\s+washed|wet\s+process)\b/i.test(haystack))
    && /\b(geisha|gesha|sl\s?28|sl\s?34|ethiopia|ethiopian|yirgacheffe|guji|sidama|kenya|nyeri|kirinyaga|floral|high[-\s]?altitude)\b/i.test(haystack);
  const isNonArabica = species === 'canephora'
    || species === 'liberica'
    || species === 'excelsa'
    || /\b(robusta|conilon|canephora|liberica|excelsa)\b/i.test(haystack);

  if (isNatural && !isExperimental && isSweetnessTarget) {
    adjustment.tempDeltaC += 0.2;
    adjustment.grindBias = 'same';
    adjustment.notes.push('Target-aware process cue: clean natural sweetness is protected with a fuller middle pour, low agitation, and no forced cooler/faster baseline.');
  }

  if (isHoney && (targetId === 'soft_round' || isSweetnessTarget)) {
    adjustment.tempDeltaC += 0.1;
    adjustment.notes.push('Target-aware process cue: honey/pulped-natural keeps a balanced-to-full middle and gentle finish instead of rushing the close.');
  }

  if (isWetHulled && isBodyTarget) {
    adjustment.tempDeltaC -= 0.2;
    adjustment.brewTimeDeltaSec += 3;
    adjustment.maxTempC = 93;
    adjustment.notes.push('Target-aware process cue: wet-hulled/body profile uses low pour height, controlled agitation, and a 92-93C default cap to protect bitterness.');
  }

  if (isExperimental && targetId === 'fruit_forward') {
    adjustment.ratioDelta += 0.02;
    adjustment.tempDeltaC -= 0.2;
    adjustment.brewTimeDeltaSec -= 3;
    adjustment.grindBias = 'coarser';
    adjustment.maxTempC = 93;
    adjustment.notes.push('Target-aware process cue: high-variability fruit process keeps the recipe conservative, cooler, lower-agitation, and aroma-protected.');
  }

  if (isWashedHighClarity && isClarityTarget) {
    adjustment.ratioDelta += 0.01;
    adjustment.tempDeltaC -= 0.2;
    adjustment.brewTimeDeltaSec -= 3;
    adjustment.grindBias = 'coarser';
    adjustment.notes.push('Target-aware process cue: washed high-clarity bean protects florals with lower agitation, lower heat, and quicker finish pacing.');
  }

  if (isNonArabica && targetId === 'dense_comforting') {
    adjustment.ratioDelta -= 0.02;
    adjustment.tempDeltaC -= 0.4;
    adjustment.brewTimeDeltaSec += 2;
    adjustment.grindBias = combineBias(adjustment.grindBias, 'coarser');
    adjustment.maxTempC = Math.min(adjustment.maxTempC ?? 93, 93);
    adjustment.notes.push('Target-aware variety cue: canephora/liberica/excelsa defaults to dense comfort, controlled agitation, and bitterness protection without claiming floral clarity.');
  }

  adjustment.ratioDelta = roundTo(clamp(adjustment.ratioDelta, -0.04, 0.04), 2);
  adjustment.tempDeltaC = roundTo(clamp(adjustment.tempDeltaC, -0.5, 0.3), 1);
  adjustment.brewTimeDeltaSec = Math.round(clamp(adjustment.brewTimeDeltaSec, -6, 8));
  if (adjustment.notes.length > 0) {
    adjustment.confidenceNotes.push('Target-aware process/variety balancing active after catalog process and variety modifiers.');
  }
  return adjustment;
}

function resolveMethodTargetBehaviorPatch(
  methodFamily: AiBrewMethodFamily,
  targetProfileId: string,
  brewMode: 'hot' | 'iced',
): MethodTargetBehaviorPatch {
  const patch = createNeutralCalibrationAdjustment();
  const targetIntent = resolveTargetIntent(targetProfileId, targetProfileId);
  const isAcidity = targetIntent === 'acidity';
  const isSweetness = targetIntent === 'sweetness' || targetProfileId === 'soft_round' || targetProfileId === 'fruit_forward';
  const isBody = targetIntent === 'body' || targetProfileId === 'dense_comforting';

  switch (methodFamily) {
    case 'aeropress':
      if (isAcidity) {
        patch.brewTimeDeltaSec -= 10;
        patch.notes.push('AeroPress target behavior: shorter steep and gentle press protect brightness.');
      } else if (isSweetness) {
        patch.brewTimeDeltaSec += 10;
        patch.notes.push('AeroPress target behavior: a slightly longer steep or one extra stir builds sweetness without changing dose.');
      } else if (isBody) {
        patch.brewTimeDeltaSec += 12;
        patch.notes.push('AeroPress target behavior: no-bypass style, steady press, and longer contact support body.');
      }
      break;
    case 'french_press':
      if (isAcidity) {
        patch.brewTimeDeltaSec -= 15;
        patch.notes.push('French Press target behavior: shorter steep and earlier decant keep the cup cleaner.');
      } else if (isSweetness) {
        patch.brewTimeDeltaSec += 18;
        patch.notes.push('French Press target behavior: a little longer steep builds sweetness; decant cleanly instead of stirring late.');
      } else if (isBody) {
        patch.brewTimeDeltaSec += 20;
        patch.notes.push('French Press target behavior: settle fines and decant cleanly; do not over-plunge for body.');
      }
      break;
    case 'espresso':
      if (isAcidity) patch.notes.push('Espresso target behavior: stop earlier only inside the locked yield/flow window and protect even flow.');
      else if (isSweetness) patch.notes.push('Espresso target behavior: keep stable flow and preserve yield; do not change dose automatically.');
      else if (isBody) patch.notes.push('Espresso target behavior: tighter flow needs puck prep discipline while dose and yield stay locked.');
      break;
    case 'moka_pot':
      if (isAcidity) patch.notes.push('Moka target behavior: use softer heat and stop before sputter to keep brightness clean.');
      else if (isSweetness) patch.notes.push('Moka target behavior: stable heat and an early stop protect sweetness from a burnt finish.');
      else if (isBody) patch.notes.push('Moka target behavior: full level basket and controlled heat build body without harsh pressure.');
      break;
    case 'siphon':
      if (isAcidity) {
        patch.brewTimeDeltaSec -= 8;
        patch.notes.push('Siphon target behavior: shorter upper-chamber contact protects aromatics.');
      } else if (isSweetness || isBody) {
        patch.brewTimeDeltaSec += 10;
        patch.notes.push('Siphon target behavior: 8-12 seconds more upper-chamber contact and a gentle stir build sweetness/body.');
      }
      break;
    case 'batch_brew':
      patch.notes.push('Batch brewer target behavior: tune spray distribution, bed level, dose-per-liter, and batch mixing rather than manual extraction cues.');
      break;
    case 'cold_brew':
      if (isAcidity) patch.brewTimeDeltaSec -= brewMode === 'hot' ? 1800 : 0;
      else if (isSweetness) patch.brewTimeDeltaSec += brewMode === 'hot' ? 1200 : 0;
      else if (isBody) patch.brewTimeDeltaSec += brewMode === 'hot' ? 2400 : 0;
      patch.notes.push('Cold brew target behavior: use steep duration, full saturation, clean filtration, and dilution only after filtration.');
      break;
    default:
      break;
  }

  patch.brewTimeDeltaSec = Math.round(clamp(patch.brewTimeDeltaSec, -1800, 2400));
  if (patch.notes.length > 0) {
    patch.confidenceNotes.push(`Method-specific target behavior active for ${methodFamily.replace(/_/g, ' ')} ${targetProfileId}.`);
  }
  return patch;
}

const SERVICE_DOSE_TARGET_METHODS = new Set<AiBrewMethodFamily>([
  'v60',
  'origami',
  'kono',
  'kalita_wave',
  'melitta',
  'april',
  'chemex',
  'clever_dripper',
  'aeropress',
  'siphon',
]);

function deriveServiceDoseTargetAdjustment(params: {
  doseG: number;
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  targetProfileLabel: string;
  targetProfileId?: string;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
  customVarietyText?: string;
}): CalibrationAdjustment {
  const adjustment = createNeutralCalibrationAdjustment();
  if (!SERVICE_DOSE_TARGET_METHODS.has(params.methodFamily)) return adjustment;
  if (params.doseG < 10 || params.doseG > 20) return adjustment;

  const targetIntent = resolveTargetIntent(params.targetProfileLabel, params.targetProfileId);
  const processId = params.processEntry?.id || '';
  const varietySignal = inferVarietyIntentSignal({
    varietyId: params.varietyEntry?.id,
    varietyEntry: params.varietyEntry,
    customVarietyText: params.customVarietyText,
  });
  const clarityBean = CLARITY_PROCESS_IDS.has(processId) || varietySignal.acidity;
  const sweetnessBean = SWEETNESS_PROCESS_IDS.has(processId) || varietySignal.sweetness;
  const bodyBean = BODY_PROCESS_IDS.has(processId) || varietySignal.body;
  const doseBand =
    params.doseG <= 12
      ? 'compact'
      : params.doseG >= 18
        ? 'large'
        : 'standard';

  if (doseBand === 'compact') {
    adjustment.ratioDelta -= 0.02;
    adjustment.tempDeltaC += 0.1;
    adjustment.brewTimeDeltaSec += 3;
    adjustment.grindBias = 'finer';
    adjustment.notes.push('Compact 10-12 g service dose kept the bed slightly tighter so the guide does not taste thin.');
  } else if (doseBand === 'large') {
    adjustment.ratioDelta += 0.02;
    adjustment.tempDeltaC -= 0.1;
    adjustment.brewTimeDeltaSec -= 2;
    adjustment.grindBias = 'coarser';
    adjustment.notes.push('Large 18-20 g service dose opened extraction slightly to keep flow and clarity practical.');
  }

  if (targetIntent === 'acidity' && bodyBean) {
    adjustment.ratioDelta += 0.02;
    adjustment.tempDeltaC -= 0.1;
    adjustment.brewTimeDeltaSec -= 3;
    adjustment.grindBias = 'coarser';
    adjustment.notes.push('Clarity target moderated a body-heavy bean signal so the cup avoids muddy extraction.');
  } else if (targetIntent === 'body' && (clarityBean || doseBand === 'compact')) {
    adjustment.ratioDelta -= 0.01;
    adjustment.tempDeltaC += 0.1;
    adjustment.brewTimeDeltaSec += 3;
    adjustment.grindBias = 'finer';
    adjustment.notes.push('Body target reinforced contact time for a clarity-leaning or compact service recipe.');
  } else if (targetIntent === 'sweetness' && sweetnessBean) {
    adjustment.ratioDelta -= 0.01;
    adjustment.tempDeltaC += 0.1;
    if (adjustment.grindBias !== 'coarser') adjustment.grindBias = 'finer';
    adjustment.notes.push('Sweetness target protected soluble aroma compounds from the active process or variety signal.');
  } else if (targetIntent === 'acidity' && clarityBean && doseBand === 'compact') {
    adjustment.ratioDelta += 0.01;
    adjustment.brewTimeDeltaSec -= 2;
    adjustment.notes.push('Compact clarity recipe stayed open enough for a crisp finish.');
  }

  adjustment.ratioDelta = roundTo(clamp(adjustment.ratioDelta, -0.05, 0.05), 2);
  adjustment.tempDeltaC = roundTo(clamp(adjustment.tempDeltaC, -0.3, 0.3), 1);
  adjustment.brewTimeDeltaSec = Math.round(clamp(adjustment.brewTimeDeltaSec, -6, 8));

  if (adjustment.notes.length > 0) {
    adjustment.confidenceNotes.push(
      `Dose-target-variety calibration active for ${roundTo(params.doseG, 1)} g ${params.methodFamily.replace(/_/g, ' ')} ${params.brewMode} service.`,
    );
  }

  return adjustment;
}

function deriveFlavorAlignmentAdjustment(params: {
  targetProfileLabel: string;
  targetProfileId?: string;
  roastLevel: RoastLevel;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
  customVarietyText?: string;
  waterProfile: ReturnType<typeof deriveWaterMineralProfile>;
  originAdjustment: OriginCalibrationAdjustment;
}): FlavorAlignmentAdjustment {
  const scores = {
    acidity: 0,
    sweetness: 0,
    body: 0,
  };
  const targetIntent = resolveTargetIntent(params.targetProfileLabel, params.targetProfileId);
  if (targetIntent === 'acidity') scores.acidity += 2.2;
  else if (targetIntent === 'sweetness') scores.sweetness += 2.2;
  else if (targetIntent === 'body') scores.body += 2.2;
  else {
    scores.acidity += 0.8;
    scores.sweetness += 1;
    scores.body += 0.5;
  }

  const processId = params.processEntry?.id || '';
  if (CLARITY_PROCESS_IDS.has(processId)) scores.acidity += 1.1;
  if (SWEETNESS_PROCESS_IDS.has(processId)) scores.sweetness += 0.95;
  if (BODY_PROCESS_IDS.has(processId)) scores.body += 1.05;

  const varietyId = params.varietyEntry?.id || '';
  if (CLARITY_VARIETY_IDS.has(varietyId)) scores.acidity += 1.05;
  if (SWEETNESS_VARIETY_IDS.has(varietyId)) scores.sweetness += 0.9;
  if (BODY_VARIETY_IDS.has(varietyId)) scores.body += 1.05;
  const varietySignal = inferVarietyIntentSignal({
    varietyId,
    varietyEntry: params.varietyEntry,
    customVarietyText: params.customVarietyText,
  });
  if (!params.varietyEntry && varietySignal.acidity) scores.acidity += 0.85;
  if (!params.varietyEntry && varietySignal.sweetness) scores.sweetness += 0.75;
  if (!params.varietyEntry && varietySignal.body) scores.body += 0.85;

  if (params.roastLevel === 'light') scores.acidity += 1;
  else if (params.roastLevel === 'medium_light') scores.acidity += 0.55;
  else if (params.roastLevel === 'medium_dark') {
    scores.body += 0.75;
    scores.sweetness += 0.25;
  } else if (params.roastLevel === 'dark') {
    scores.body += 1.1;
    scores.sweetness += 0.35;
  }

  if (params.waterProfile.minerals.hardnessPpm <= 45 && params.waterProfile.minerals.alkalinityPpm <= 30) {
    scores.acidity += 0.45;
  } else if (params.waterProfile.minerals.hardnessPpm >= 110 || params.waterProfile.minerals.alkalinityPpm >= 75) {
    scores.body += 0.55;
    scores.sweetness += 0.2;
  }

  switch (params.originAdjustment.profileId) {
    case 'east_africa_floral':
      scores.acidity += 0.85;
      break;
    case 'latin_america_balanced':
      scores.acidity += 0.2;
      scores.sweetness += 0.45;
      break;
    case 'central_america_cocoa':
      scores.sweetness += 0.5;
      scores.acidity += 0.25;
      scores.body += 0.15;
      break;
    case 'mexico_mesoamerica':
      scores.sweetness += 0.45;
      scores.acidity += 0.2;
      scores.body += 0.2;
      break;
    case 'andes_balanced':
      scores.acidity += 0.35;
      scores.sweetness += 0.4;
      break;
    case 'caribbean_milds':
      scores.sweetness += 0.45;
      scores.body += 0.2;
      scores.acidity += 0.15;
      break;
    case 'brazil_sweet':
      scores.sweetness += 0.65;
      scores.body += 0.3;
      break;
    case 'indonesia_structured':
      scores.body += 0.7;
      scores.sweetness += 0.2;
      break;
    case 'middle_east_dried_fruit':
      scores.sweetness += 0.45;
      scores.body += 0.35;
      break;
    case 'pacific_islands_complex':
      scores.sweetness += 0.35;
      scores.body += 0.3;
      scores.acidity += 0.15;
      break;
    case 'south_asia_monsoon_spice':
      scores.body += 0.55;
      scores.sweetness += 0.3;
      break;
    case 'china_yunnan_fruit':
      scores.acidity += 0.3;
      scores.sweetness += 0.35;
      break;
    case 'robusta_lowland_body':
      scores.body += 0.95;
      scores.sweetness += 0.2;
      break;
    case 'asia_highland':
      scores.acidity += 0.4;
      scores.sweetness += 0.35;
      break;
    default:
      break;
  }

  const ranked = (Object.entries(scores) as Array<[Exclude<TargetIntent, 'balanced'>, number]>)
    .sort((left, right) => right[1] - left[1]);
  const dominantAxis = ranked[0]?.[0] || 'acidity';
  const topScore = ranked[0]?.[1] || 0;
  const secondScore = ranked[1]?.[1] || 0;
  const intensity = clamp((topScore - secondScore) / 2.4, 0, 1);

  if (intensity < 0.18) {
    return {
      ...createNeutralCalibrationAdjustment(),
      dominantAxis: 'balanced',
      intensity: 0,
      scores,
    };
  }

  let ratioDelta = 0;
  let tempDeltaC = 0;
  let brewTimeDeltaSec = 0;
  let grindBias: GrindBias = 'same';

  if (dominantAxis === 'acidity') {
    ratioDelta = roundTo(0.02 + (0.03 * intensity), 2);
    tempDeltaC = roundTo(-0.1 - (0.2 * intensity), 1);
    brewTimeDeltaSec = Math.round(-2 - (6 * intensity));
    grindBias = targetIntent === 'balanced' ? 'same' : intensity >= 0.7 ? 'coarser' : 'same';
  } else if (dominantAxis === 'sweetness') {
    ratioDelta = roundTo(-0.02 - (0.03 * intensity), 2);
    tempDeltaC = roundTo(0.1 + (0.25 * intensity), 1);
    brewTimeDeltaSec = Math.round(2 + (6 * intensity));
    grindBias = targetIntent === 'balanced' ? 'same' : intensity >= 0.55 ? 'finer' : 'same';
  } else {
    ratioDelta = roundTo(-0.03 - (0.04 * intensity), 2);
    tempDeltaC = roundTo(0.05 + (0.2 * intensity), 1);
    brewTimeDeltaSec = Math.round(4 + (6 * intensity));
    grindBias = targetIntent === 'balanced' ? 'same' : intensity >= 0.45 ? 'finer' : 'same';
  }

  return {
    ratioDelta,
    tempDeltaC,
    brewTimeDeltaSec,
    grindBias,
    notes: [
      `Cross-signal calibration reinforced ${dominantAxis === 'body' ? 'body' : dominantAxis} handling from the active target, roast, and bean context.`,
    ],
    confidenceNotes: [
      `Flavor alignment axis: ${dominantAxis} (${roundTo(intensity, 2)} intensity).`,
    ],
    dominantAxis,
    intensity,
    scores,
  };
}

function resolveServiceTimeBounds(params: {
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  doseG: number;
  targetProfileId?: string;
  base: { min: number; max: number };
}) {
  const targetId = String(params.targetProfileId || '').toLowerCase();
  if (
    params.methodFamily === 'v60'
    && params.brewMode === 'hot'
    && params.doseG >= 14
    && params.doseG <= 16
    && (targetId === 'more_sweetness' || targetId === 'more_body' || targetId === 'dense_comforting')
  ) {
    return {
      min: params.base.min,
      max: Math.min(params.base.max, targetId === 'more_sweetness' ? 235 : 240),
    };
  }
  return params.base;
}

function resolveIcedHotWaterShare(params: {
  methodFamily: AiBrewMethodFamily;
  finalRatio: number;
  roastLevel: RoastLevel;
  targetProfileLabel: string;
  targetProfileId?: string;
  processEntry?: ProcessCatalogEntry;
  originAdjustment: OriginCalibrationAdjustment;
  flavorAlignment: FlavorAlignmentAdjustment;
}) {
  const icedMethod = BREW_METHOD_MAP[resolveIcedMethodId(params.methodFamily)];
  const baseShare = icedMethod.japaneseSplit?.hotWaterShare || BREW_METHOD_MAP.v60_japanese_iced.japaneseSplit?.hotWaterShare || 0.6;
  const familyShareProfile = {
    base: baseShare,
    min: Math.max(0.54, roundTo(baseShare - 0.05, 2)),
    max: Math.min(0.7, roundTo(baseShare + 0.08, 2)),
  };

  let hotWaterShare = familyShareProfile.base;
  if (params.methodFamily === 'kono') hotWaterShare += 0.05;
  if (params.methodFamily === 'origami') hotWaterShare -= 0.01;
  if (params.methodFamily === 'melitta') hotWaterShare += 0.04;
  const targetIntent = resolveTargetIntent(params.targetProfileLabel, params.targetProfileId);
  if (targetIntent === 'body') hotWaterShare += 0.02;
  else if (targetIntent === 'sweetness') hotWaterShare += 0.015;
  else if (targetIntent === 'acidity') hotWaterShare -= 0.015;

  if (params.roastLevel === 'light') hotWaterShare -= 0.01;
  else if (params.roastLevel === 'dark') hotWaterShare += 0.01;

  const processId = params.processEntry?.id || '';
  if (CLARITY_PROCESS_IDS.has(processId)) hotWaterShare -= 0.01;
  if (BODY_PROCESS_IDS.has(processId)) hotWaterShare += 0.01;

  if (params.originAdjustment.profileId === 'east_africa_floral') hotWaterShare -= 0.005;
  if (
    params.originAdjustment.profileId === 'brazil_sweet'
    || params.originAdjustment.profileId === 'indonesia_structured'
    || params.originAdjustment.profileId === 'middle_east_dried_fruit'
    || params.originAdjustment.profileId === 'south_asia_monsoon_spice'
    || params.originAdjustment.profileId === 'robusta_lowland_body'
  ) {
    hotWaterShare += 0.005;
  }
  if (
    params.originAdjustment.profileId === 'central_america_cocoa'
    || params.originAdjustment.profileId === 'mexico_mesoamerica'
    || params.originAdjustment.profileId === 'andes_balanced'
    || params.originAdjustment.profileId === 'caribbean_milds'
    || params.originAdjustment.profileId === 'china_yunnan_fruit'
  ) {
    hotWaterShare += 0.002;
  }

  if (params.flavorAlignment.dominantAxis === 'acidity') {
    hotWaterShare -= 0.01 * params.flavorAlignment.intensity;
  } else if (params.flavorAlignment.dominantAxis === 'body') {
    hotWaterShare += 0.01 * params.flavorAlignment.intensity;
  } else if (params.flavorAlignment.dominantAxis === 'sweetness') {
    hotWaterShare += 0.005 * params.flavorAlignment.intensity;
  }

  const hotRatioBounds = ICED_HOT_EXTRACTION_RATIO_BOUNDS[params.methodFamily] || ICED_HOT_EXTRACTION_RATIO_BOUNDS.v60;
  const finalRatio = Math.max(1, params.finalRatio);
  const boundedByConcentrateRatioMin = hotRatioBounds.min / finalRatio;
  const boundedByConcentrateRatioMax = hotRatioBounds.max / finalRatio;
  const ratioAwareMin = Math.max(familyShareProfile.min, boundedByConcentrateRatioMin);
  const ratioAwareMax = Math.min(familyShareProfile.max, boundedByConcentrateRatioMax);
  if (ratioAwareMin > ratioAwareMax) {
    const nearestConcentrateFloor = clamp(
      boundedByConcentrateRatioMin,
      familyShareProfile.min,
      familyShareProfile.max,
    );
    return roundTo(clamp(
      Math.max(hotWaterShare, nearestConcentrateFloor),
      familyShareProfile.min,
      familyShareProfile.max,
    ), 2);
  }

  return roundTo(clamp(hotWaterShare, ratioAwareMin, ratioAwareMax), 2);
}

type V60ServiceCalibration = {
  recommendedRatio: number;
  hotExtractionRatio: number | null;
  timeMinSec: number;
  timeMaxSec: number;
  tempC?: number;
  minTempC?: number;
  maxTempC?: number;
  notes: string[];
  confidenceNotes: string[];
};

type IcedStrengthCalibration = CalibrationAdjustment & {
  warnings: string[];
  targetFinalRatioRange: [number, number];
};

function resolveIcedFinalRatioRange(params: {
  methodFamily: AiBrewMethodFamily;
  dripper: EquipmentCatalogEntry;
  targetProfileId: string;
  roastLevel: RoastLevel;
  processEntry?: ProcessCatalogEntry;
}) {
  const name = `${params.dripper.name} ${params.dripper.typeLabel}`.toLowerCase();
  const noBypassOrLowBypass = /\b(tricolate|pulsar|nextlevel|mugen x switch|no[-\s]?bypass|vietnam drip)\b/i.test(name);
  const flatBottom = params.methodFamily === 'april'
    || params.methodFamily === 'kalita_wave'
    || /\b(orea|b75|stagg|flat bottom|blue bottle|gem|tornado)\b/i.test(name);
  const targetIntent = resolveTargetIntent(params.targetProfileId, params.targetProfileId);

  let min = 13.8;
  let max = 14.5;
  let label = 'seduhan es konikal';

  if (params.methodFamily === 'chemex') {
    min = 14.3;
    max = 15.0;
    label = 'seduhan es Chemex';
  } else if (params.methodFamily === 'clever_dripper' || params.methodFamily === 'hario_switch' || noBypassOrLowBypass) {
    min = 13.7;
    max = 14.5;
    label = noBypassOrLowBypass ? 'seduhan es low-bypass' : 'seduhan es immersion';
  } else if (params.methodFamily === 'aeropress') {
    min = 12.5;
    max = 13.8;
    label = 'seduhan es AeroPress';
  } else if (flatBottom || params.methodFamily === 'melitta') {
    min = 14.2;
    max = 15.0;
    label = 'seduhan es flat-bottom';
  } else if (params.methodFamily === 'origami' || params.methodFamily === 'kono') {
    min = 13.8;
    max = 14.6;
    label = 'seduhan es cone';
  }

  if (targetIntent === 'sweetness') {
    min -= 0.15;
    max -= 0.35;
  } else if (targetIntent === 'body') {
    min -= 0.25;
    max -= 0.55;
  } else if (params.targetProfileId === 'fruit_forward') {
    max -= 0.2;
  } else if (targetIntent === 'acidity') {
    min += 0.05;
    max += params.targetProfileId === 'floral_transparent' ? 0.25 : 0.1;
  }

  if (params.roastLevel === 'dark' || params.roastLevel === 'medium_dark') {
    max -= 0.25;
  }

  const processRisk = resolveProcessRiskFallback(params.processEntry);
  if (processRisk?.variability === 'high') {
    max = Math.min(max, targetIntent === 'acidity' ? 15.2 : 14.8);
  }

  return {
    min: roundTo(Math.max(12.8, min), 2),
    max: roundTo(Math.min(15.3, Math.max(min + 0.2, max)), 2),
    label,
  };
}

function deriveIcedStrengthCalibration(params: {
  input: AiBrewFormState;
  methodFamily: AiBrewMethodFamily;
  dripper: EquipmentCatalogEntry;
  baseRecommendedRatio: number;
  ratioLowerBound: number;
  ratioUpperBound: number;
  processEntry?: ProcessCatalogEntry;
  v60SweetnessServiceCalibration: V60ServiceCalibration | null;
}): IcedStrengthCalibration {
  const neutral = {
    ...createNeutralCalibrationAdjustment(),
    warnings: [],
    targetFinalRatioRange: [0, 0] as [number, number],
  };
  if (params.input.brewMode !== 'iced') return neutral;
  if (params.v60SweetnessServiceCalibration) return neutral;
  if (params.input.targetRatio || params.input.targetWaterMl) return neutral;
  if (!ICED_METHOD_FAMILIES.has(params.methodFamily)) return neutral;

  const range = resolveIcedFinalRatioRange({
    methodFamily: params.methodFamily,
    dripper: params.dripper,
    targetProfileId: params.input.targetProfileId || 'balance_clean',
    roastLevel: params.input.roastLevel,
    processEntry: params.processEntry,
  });
  const lower = Math.max(params.ratioLowerBound, range.min);
  const upper = Math.min(params.ratioUpperBound, range.max);
  const current = params.baseRecommendedRatio;
  let targetRatio = current;
  const warnings: string[] = [];
  const notes: string[] = [];
  const confidenceNotes: string[] = [];

  if (current > upper) {
    targetRatio = upper;
    notes.push(
      `Batas kekuatan es merapatkan rasio final ${range.label} dari 1:${formatBaristaRatio(current)} ke 1:${formatBaristaRatio(targetRatio)} agar cup tidak tipis setelah es terukur mencair.`,
    );
  } else if (current < lower) {
    targetRatio = lower;
    notes.push(
      `Batas kekuatan es membuka rasio final ${range.label} dari 1:${formatBaristaRatio(current)} ke 1:${formatBaristaRatio(targetRatio)} agar konsentrat panas tidak terlalu berat.`,
    );
  } else if (
    (params.input.targetProfileId === 'more_sweetness' || params.input.targetProfileId === 'more_body' || params.input.targetProfileId === 'dense_comforting')
    && current > lower + 0.25
  ) {
    targetRatio = Math.max(lower, current - 0.2);
    notes.push(
      `Target rasa es merapatkan rasio final sedikit untuk ${params.input.targetProfileId.replace(/_/g, ' ')} tanpa mengubah batas aman air panas dan es.`,
    );
  }

  if (targetRatio > 15.2) {
    warnings.push('Cup es bisa terasa ringan; gunakan target Lebih Manis/Body atau rapatkan rasio final setelah satu brew evaluasi.');
  }

  if (notes.length > 0 || warnings.length > 0) {
    confidenceNotes.push(
      `Rentang kekuatan es aktif untuk ${range.label}: rasio final 1:${formatBaristaRatio(lower)}-1:${formatBaristaRatio(upper)}.`,
    );
  }

  return {
    ratioDelta: roundTo(targetRatio - current, 2),
    tempDeltaC: 0,
    brewTimeDeltaSec: 0,
    grindBias: 'same',
    notes,
    confidenceNotes,
    warnings,
    targetFinalRatioRange: [lower, upper],
  };
}

function deriveV60SweetnessServiceCalibration(params: {
  input: AiBrewFormState;
  methodFamily: AiBrewMethodFamily;
  deviceProfile: DeviceBrewProfile;
  waterProfile: ReturnType<typeof deriveWaterMineralProfile>;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
}): V60ServiceCalibration | null {
  if (
    params.methodFamily !== 'v60'
    || !params.deviceProfile.exactMatch
    || !params.deviceProfile.dripperIds.includes('hario-v60')
  ) {
    return null;
  }

  if (params.input.brewMode === 'iced') {
    const targetId = params.input.targetProfileId || 'balance_clean';
    const density = Number.parseFloat(String(params.input.beanDensityGml || ''));
    const hardToExtractBody = (targetId === 'more_body' || targetId === 'dense_comforting')
      && isLightOrMediumLightRoast(params.input.roastLevel)
      && (
        params.input.roastDevelopment === 'underdeveloped'
        || params.input.solubility === 'low'
        || (Number.isFinite(density) && density >= 0.75)
      );
    const icedTargetMatrix: Record<string, {
      recommendedRatio: number;
      hotExtractionRatio: number;
      timeMinSec: number;
      timeMaxSec: number;
      tempC: number;
      minTempC: number;
      maxTempC: number;
      note: string;
    }> = {
      floral_transparent: {
        recommendedRatio: 14.33,
        hotExtractionRatio: 9,
        timeMinSec: 170,
        timeMaxSec: 185,
        tempC: 92,
        minTempC: 92,
        maxTempC: 93,
        note: 'V60 Japanese-iced Floral & Transparent calibration uses 135 g hot water and 80 g measured ice for a light, clean finish.',
      },
      more_acidity: {
        recommendedRatio: 14.33,
        hotExtractionRatio: 9,
        timeMinSec: 170,
        timeMaxSec: 185,
        tempC: 92,
        minTempC: 92,
        maxTempC: 93,
        note: 'V60 Japanese-iced More Acidity calibration keeps temperature low and drawdown quick so brightness stays clean.',
      },
      balance_clean: {
        recommendedRatio: 14,
        hotExtractionRatio: 9,
        timeMinSec: 180,
        timeMaxSec: 190,
        tempC: 93,
        minTempC: 93,
        maxTempC: 93,
        note: 'V60 Japanese-iced Balance calibration uses 135 g hot water and 75 g measured ice for a clear baseline.',
      },
      more_sweetness: {
        recommendedRatio: 14,
        hotExtractionRatio: 9,
        timeMinSec: 185,
        timeMaxSec: 200,
        tempC: 93,
        minTempC: 92,
        maxTempC: 93,
        note: 'V60 Japanese-iced More Sweetness calibration loads the middle pour for sweetness while keeping measured ice separate.',
      },
      fruit_forward: {
        recommendedRatio: 14,
        hotExtractionRatio: 9,
        timeMinSec: 185,
        timeMaxSec: 200,
        tempC: 92,
        minTempC: 92,
        maxTempC: 93,
        note: 'V60 Japanese-iced Fruit-Forward calibration preserves aroma with cooler heat, full middle pour, and no late bypass water.',
      },
      soft_round: {
        recommendedRatio: 14,
        hotExtractionRatio: 9,
        timeMinSec: 190,
        timeMaxSec: 205,
        tempC: 93,
        minTempC: 92,
        maxTempC: 93,
        note: 'V60 Japanese-iced Soft & Round calibration uses a fuller bloom and gentle finish to keep sweetness round.',
      },
      more_body: {
        recommendedRatio: 13.67,
        hotExtractionRatio: 9,
        timeMinSec: 195,
        timeMaxSec: 215,
        tempC: hardToExtractBody ? 94 : 93,
        minTempC: 92,
        maxTempC: hardToExtractBody ? 94 : 93,
        note: hardToExtractBody
          ? 'V60 Japanese-iced More Body calibration allows 94C only because light or low-solubility cues need more extraction pressure.'
          : 'V60 Japanese-iced More Body calibration uses 135 g hot water and 70 g measured ice for density without late bypass water.',
      },
      dense_comforting: {
        recommendedRatio: 13.67,
        hotExtractionRatio: 9,
        timeMinSec: 195,
        timeMaxSec: 215,
        tempC: hardToExtractBody ? 94 : 93,
        minTempC: 92,
        maxTempC: hardToExtractBody ? 94 : 93,
        note: hardToExtractBody
          ? 'V60 Japanese-iced Dense & Comforting calibration allows 94C only because light or low-solubility cues need more extraction pressure.'
          : 'V60 Japanese-iced Dense & Comforting calibration keeps the hot phase at 135 g and uses 70 g measured ice for compact body.',
      },
    };
    const calibration = icedTargetMatrix[targetId] || icedTargetMatrix.balance_clean;
    return {
      ...calibration,
      notes: [
        calibration.note,
        'Exact Hario V60 Japanese iced profile active: final beverage is hot concentrate plus measured ice; do not add bypass water after brewing.',
      ],
      confidenceNotes: [
        `V60 iced 15 g benchmark active for ${targetId}: hot concentrate 1:9 with target-specific measured ice.`,
      ],
    };
  }

  if (params.input.targetProfileId !== 'more_sweetness') {
    return null;
  }

  const highAromaNaturalSweetness = hasHighAromaNaturalCue(params.input, params.processEntry, params.varietyEntry)
    && isLightOrMediumLightRoast(params.input.roastLevel);
  if (highAromaNaturalSweetness) {
    return {
      recommendedRatio: 15.05,
      hotExtractionRatio: null,
      timeMinSec: 160,
      timeMaxSec: 175,
      notes: [
        'V60 hot natural sweetness calibration uses a compact service ratio, longer bloom, and calm pours so fruit sweetness lands without rough ferment notes.',
      ],
      confidenceNotes: [
        'Natural high-aroma V60 hot baseline active: about 225 g water, 90-92C, and a 2:40-2:55 extraction window for 15 g.',
      ],
    };
  }

  if (params.input.roastLevel !== 'medium') {
    return null;
  }

  const lowMineral = params.waterProfile.minerals.hardnessPpm < 40 || params.waterProfile.minerals.alkalinityPpm < 30;
  const coffeeText = normalizeSearchHaystack([params.input.coffeeName]);
  const bolindaServiceBaseline = haystackHasAny(coffeeText, [/\bbolinda\b/i, /\bcaranavi\b/i, /\bla paz\b/i]);
  if (!lowMineral && !bolindaServiceBaseline) {
    return null;
  }

  return {
    recommendedRatio: 15.05,
    hotExtractionRatio: null,
    timeMinSec: 170,
    timeMaxSec: 185,
    notes: [
      lowMineral
        ? 'V60 hot More Sweetness uses a slightly shorter ratio for soft, low-buffer water so sweetness stays round before tightening grind.'
        : 'V60 hot More Sweetness uses a compact 1:15-ish service ratio to build sweetness without making the cup heavy.',
    ],
    confidenceNotes: [
      'V60 hot sweetness baseline active: medium roast target ratio 1:15.0-15.3 and 2:50-3:05 extraction window.',
    ],
  };
}

function buildExtractionRationale(params: {
  input: AiBrewFormState;
  methodFamily: AiBrewMethodFamily;
  processLabel: string;
  varietyLabel: string;
  targetProfileLabel: string;
  waterTempC: number;
  totalTimeSeconds: number;
  recommendedRatio: number;
  finalBeverageRatio: number;
  hotExtractionRatio: number;
  totalWaterMl: number;
  hotWaterMl: number;
  iceMl: number;
  hotWaterSharePercent: number;
  iceSharePercent: number;
  grindBias: GrindBias;
  grindRecommendation: string;
  steps: BrewPlanStep[];
  waterProfile: ReturnType<typeof deriveWaterMineralProfile>;
  beanProfile: BeanProfileState;
  beanCoverage?: BeanCoverageState;
  processRisk?: ProcessRiskModel;
  warnings: string[];
  confidenceNotes: string[];
}): BrewExtractionRationale {
  const positivePours = params.steps.filter((step) => step.pourVolumeMl > 0);
  const firstPour = positivePours[0];
  const lastPour = positivePours[positivePours.length - 1];
  const techniqueSignals = Array.from(new Set(positivePours.flatMap((step) => [
    step.pourPath,
    step.pourHeight,
    step.agitationLevel,
  ].filter(Boolean) as string[]))).slice(0, 5);
  const beanSignals = normalizeNoteList([
    `process: ${params.processLabel || 'not specified'}`,
    `variety: ${params.varietyLabel || 'not specified'}`,
    `roast: ${params.input.roastLevel}`,
    params.beanProfile.roastDevelopment ? `development: ${params.beanProfile.roastDevelopment}` : undefined,
    params.beanProfile.solubility ? `solubility: ${params.beanProfile.solubility}` : undefined,
    params.beanProfile.altitudeMasl ? `altitude: ${params.beanProfile.altitudeMasl} masl` : undefined,
    params.beanProfile.beanDensityGml ? `density: ${params.beanProfile.beanDensityGml} g/ml` : undefined,
    `water: TDS ${params.waterProfile.minerals.tdsPpm}, GH ${params.waterProfile.minerals.hardnessPpm}, KH ${params.waterProfile.minerals.alkalinityPpm}`,
    `grind source: ${params.grindRecommendation}`,
  ]);
  const processRiskWarning = params.processRisk?.variability === 'high'
    || params.processRisk?.recommendationMode === 'taste_feedback_required'
    ? 'High-variability process: use first-cup taste feedback before increasing extraction pressure.'
    : undefined;
  const naturalFermentWarning = isNaturalLikeProcess(undefined, params.input.process, params.input.customProcess)
    ? 'Natural, honey, or ferment-like process: keep agitation gentle and change one variable after tasting.'
    : undefined;
  const finishCue = params.methodFamily === 'aeropress'
    ? 'press finish'
    : params.methodFamily === 'french_press'
      ? 'decant'
      : params.methodFamily === 'hario_switch'
        ? 'release and drawdown finish'
        : params.methodFamily === 'espresso'
          ? 'shot stop'
          : params.methodFamily === 'moka_pot'
            ? 'service stop'
            : params.methodFamily === 'cold_brew'
              ? 'filtration finish'
              : 'drawdown';
  const genericTasteWarning = `This recipe is calculated from the dose, ratio, brew method, bean profile, roast level, grinder baseline, and water condition. Use it as a starting point, then validate aroma, sweetness, bitterness, and ${finishCue} before changing numbers.`;
  const rationaleWarnings = normalizeNoteList(
    params.warnings,
    params.beanCoverage?.warnings || [],
    [processRiskWarning, naturalFermentWarning, genericTasteWarning],
  ).slice(0, 6);
  const hotOrTotalWater = params.iceMl > 0
    ? `${params.hotWaterMl} ml hot water into ${params.iceMl} g ice`
    : params.hotWaterMl < params.totalWaterMl
      ? `${params.hotWaterMl} ml brew water plus ${Math.max(0, params.totalWaterMl - params.hotWaterMl)} ml bypass`
      : `${params.totalWaterMl} ml water`;
  const processContext = /\bprocess$/i.test(params.processLabel.trim())
    ? params.processLabel
    : `${params.processLabel} process`;

  return {
    ratio: params.iceMl > 0
      ? `Final ratio 1:${formatBaristaRatio(params.finalBeverageRatio)} keeps iced strength after dilution; hot concentrate 1:${formatBaristaRatio(params.hotExtractionRatio)} extracts with ${hotOrTotalWater}.`
      : `Brew ratio 1:${formatBaristaRatio(params.finalBeverageRatio)} balances ${params.targetProfileLabel} with ${processContext} and ${params.input.roastLevel} roast solubility.`,
    temperature: `${formatBaristaTemperature(params.waterTempC)}C is selected from roast, process, water minerals, and target extraction style.`,
    time: `${formatTime(params.totalTimeSeconds)} service window keeps contact time aligned with ${params.methodFamily.replace(/_/g, ' ')} flow and ${params.targetProfileLabel}.`,
    grind: `${params.grindBias === 'finer' ? 'Finer' : params.grindBias === 'coarser' ? 'Coarser' : 'Neutral'} grind bias: ${params.grindRecommendation}`,
    pour: params.methodFamily === 'aeropress'
      ? `AeroPress workflow charges ${params.hotWaterMl} ml in the chamber, then controls stir, steep, press, and serve checkpoints.`
      : params.methodFamily === 'french_press'
        ? `French Press workflow charges ${params.hotWaterMl} ml, then controls steep, settle, gentle press, and full decant checkpoints.`
        : params.methodFamily === 'hario_switch'
          ? `Switch workflow uses valve state, chamber load, release, and drawdown checkpoints from ${firstPour?.pourVolumeMl || 0} ml to final target ${lastPour?.targetVolumeMl || params.hotWaterMl} ml.`
          : params.methodFamily === 'siphon'
            ? `Siphon workflow charges ${params.hotWaterMl} ml in the lower bowl, then controls vapor rise, agitation, steeping, and vacuum drawdown.`
            : positivePours.length > 0
              ? `Pour map uses ${positivePours.length} checkpoints from ${firstPour?.pourVolumeMl || 0} ml to final target ${lastPour?.targetVolumeMl || params.hotWaterMl} ml with ${techniqueSignals.join(', ') || 'controlled flow'} technique.`
              : `Workflow map uses ${params.steps.length} checkpoints with controlled contact and no extra water outside the deterministic plan.`,
    iceSplit: params.iceMl > 0
      ? `Iced split uses ${params.hotWaterSharePercent}% hot water and ${params.iceSharePercent}% ice: ${params.hotWaterMl} ml hot concentrate over ${params.iceMl} g measured ice.`
      : undefined,
    beanPrecision: {
      summary: params.beanCoverage
        ? `${params.beanCoverage.label} (${params.beanCoverage.confidence})`
        : 'Bean precision uses available process, variety, roast, water, and grinder data.',
      signals: beanSignals,
    },
    warnings: rationaleWarnings,
  };
}

function deriveMethodFamilyAdjustment(params: {
  methodFamily: AiBrewMethodFamily;
  filterStyle: DeviceBrewProfile['filterStyle'];
  flatBottomProfile?: FlatBottomProfileFamily;
  recipeStyle?:
    | Exclude<AeroPressRecipeStyle, 'auto'>
    | Exclude<FrenchPressRecipeStyle, 'auto'>
    | Exclude<KalitaWaveRecipeStyle, 'auto'>
    | Exclude<CleverDripperRecipeStyle, 'auto'>
    | Exclude<ChemexRecipeStyle, 'auto'>
    | Exclude<MokaPotRecipeStyle, 'auto'>
    | Exclude<ColdBrewRecipeStyle, 'auto'>
    | Exclude<BatchBrewRecipeStyle, 'auto'>
    | Exclude<SiphonRecipeStyle, 'auto'>
    | Exclude<OrigamiRecipeStyle, 'auto'>
    | Exclude<AprilRecipeStyle, 'auto'>
    | Exclude<MelittaRecipeStyle, 'auto'>
    | Exclude<KonoRecipeStyle, 'auto'>
    | SwitchPublicPresetId;
  brewMode: 'hot' | 'iced';
  targetProfileLabel: string;
  targetProfileId?: string;
}): MethodFamilyAdjustment {
  const targetIntent = resolveTargetIntent(params.targetProfileLabel, params.targetProfileId);
  const neutral = (): MethodFamilyAdjustment => ({
    ...createNeutralCalibrationAdjustment(),
    sequenceSignature: 'neutral',
  });

  const methodLabel = params.methodFamily.replace(/_/g, ' ');
  const adjustment = neutral();

  switch (params.methodFamily) {
    case 'v60':
      adjustment.sequenceSignature = 'clarity_flow';
      adjustment.ratioDelta = targetIntent === 'body' ? 0 : 0.04;
      adjustment.tempDeltaC = targetIntent === 'body' ? 0.1 : 0;
      adjustment.brewTimeDeltaSec = targetIntent === 'body' ? 2 : 5;
      adjustment.grindBias = 'same';
      adjustment.notes.push('V60 family keeps a slightly more open cone-flow profile for clarity and clean drawdown.');
      break;
    case 'origami':
      if (params.filterStyle === 'flat') {
        adjustment.sequenceSignature = 'flatbed_mid';
        adjustment.ratioDelta = targetIntent === 'body' || targetIntent === 'sweetness' ? -0.03 : 0;
        adjustment.tempDeltaC = targetIntent === 'sweetness' ? 0 : -0.1;
        adjustment.brewTimeDeltaSec = targetIntent === 'acidity' ? 1 : 5;
        adjustment.grindBias = targetIntent === 'body' ? 'finer' : 'same';
        adjustment.notes.push('Origami wave-filter profile behaves like a flat bed: level contact, center pours, and calmer drawdown control.');
      } else {
        adjustment.sequenceSignature = 'clarity_flow';
        adjustment.ratioDelta = targetIntent === 'sweetness' || targetIntent === 'body' ? 0 : 0.03;
        adjustment.tempDeltaC = targetIntent === 'sweetness' ? 0.1 : -0.1;
        adjustment.brewTimeDeltaSec = targetIntent === 'sweetness' ? 1 : -3;
        adjustment.grindBias = targetIntent === 'sweetness' ? 'same' : 'coarser';
        adjustment.notes.push('Origami cone-filter profile stays agile and transparent, with a cleaner and faster cone-flow signature.');
      }
      break;
    case 'kono':
      adjustment.sequenceSignature = 'sweet_contact';
      adjustment.ratioDelta = -0.04;
      adjustment.tempDeltaC = 0.2;
      adjustment.brewTimeDeltaSec = 8;
      adjustment.grindBias = 'finer';
      adjustment.notes.push('Kono family leans toward sweeter center extraction with stable contact time to establish a sweet core through centered and slightly deeper pours.');
      break;
    case 'kalita_wave':
      adjustment.sequenceSignature = 'flatbed_mid';
      adjustment.ratioDelta = -0.02;
      adjustment.tempDeltaC = -0.1;
      adjustment.brewTimeDeltaSec = 5;
      adjustment.grindBias = 'finer';
      adjustment.notes.push('Kalita Wave family favors a flatter, middle-loaded extraction to keep the bed even and body tidy.');
      break;
    case 'melitta':
      adjustment.sequenceSignature = 'flatbed_mid';
      adjustment.ratioDelta = -0.04;
      adjustment.tempDeltaC = -0.1;
      adjustment.brewTimeDeltaSec = 7;
      adjustment.grindBias = 'finer';
      adjustment.notes.push('Melitta family adds a little more controlled contact time to keep trapezoid flow stable and forgiving.');
      break;
    case 'april':
      adjustment.sequenceSignature = params.flatBottomProfile === 'no_bypass'
        ? 'flatbed_mid'
        : params.flatBottomProfile === 'restricted_flat_bottom'
          ? 'flatbed_mid'
          : 'fast_even';
      if (params.flatBottomProfile === 'april_low_agitation') {
        adjustment.ratioDelta = 0.08;
        adjustment.tempDeltaC = -0.5;
        adjustment.brewTimeDeltaSec = -12;
        adjustment.grindBias = 'coarser';
        adjustment.notes.push('April low-agitation profile keeps a fast, organized pulse recipe without stretching the contact window.');
      } else if (params.flatBottomProfile === 'restricted_flat_bottom') {
        adjustment.ratioDelta = -0.04;
        adjustment.tempDeltaC = -0.2;
        adjustment.brewTimeDeltaSec = 8;
        adjustment.grindBias = 'same';
        adjustment.notes.push('Restricted flat-bottom profile protects flow by slowing the finish slightly and avoiding a choked bed.');
      } else if (params.flatBottomProfile === 'no_bypass') {
        adjustment.ratioDelta = -0.02;
        adjustment.tempDeltaC = -0.1;
        adjustment.brewTimeDeltaSec = 18;
        adjustment.grindBias = 'finer';
        adjustment.notes.push('No-bypass flat-bottom profile uses fuller saturation and a longer finishing window because all water must extract through the bed.');
      } else {
        adjustment.ratioDelta = 0.02;
        adjustment.tempDeltaC = -0.35;
        adjustment.brewTimeDeltaSec = -8;
        adjustment.grindBias = 'coarser';
        adjustment.notes.push('Fast flat-bottom profile keeps low agitation and short centered pulses so flow stays quick without tasting thin.');
      }
      break;
    case 'chemex':
      adjustment.sequenceSignature = 'thick_filter';
      adjustment.ratioDelta = 0.12;
      adjustment.tempDeltaC = 0.1;
      adjustment.brewTimeDeltaSec = params.brewMode === 'iced' ? 24 : 18;
      adjustment.grindBias = 'coarser';
      adjustment.notes.push('Chemex family runs a longer window than V60 because thick bonded paper needs stable flow, not a rushed drawdown.');
      break;
    case 'clever_dripper':
    case 'hario_switch':
      adjustment.sequenceSignature = 'immersion_release';
      adjustment.ratioDelta = -0.15;
      adjustment.tempDeltaC = -0.3;
      adjustment.brewTimeDeltaSec = 20;
      adjustment.grindBias = 'coarser';
      adjustment.notes.push(params.methodFamily === 'hario_switch'
        ? 'Hario Switch family protects valve state, chamber capacity, and immersion-release timing before drawdown.'
        : 'Clever Dripper family protects immersion sweetness first, then releases through a calmer finishing phase.');
      break;
    case 'french_press':
      adjustment.sequenceSignature = 'immersion_press';
      if (params.recipeStyle === 'heavy_concentrate') {
        adjustment.ratioDelta = -3.5; // Brings 1:15 default toward a safer 1:11-1:12 concentrate.
        adjustment.tempDeltaC = -0.2;
        adjustment.brewTimeDeltaSec = 90;
        adjustment.grindBias = 'coarser';
        adjustment.notes.push('French Press heavy concentrate style is labeled as concentrate and keeps dilution with water or milk explicit so it is not mistaken for normal black coffee.');
        adjustment.notes.push('French Press health guard: unfiltered immersion coffee can carry more cafestol and kahweol than paper-filtered coffee; use a paper or double-filter variant if LDL cholesterol management matters.');
      } else if (params.recipeStyle === 'double_filter') {
        adjustment.ratioDelta = 0;
        adjustment.tempDeltaC = -0.3;
        adjustment.brewTimeDeltaSec = 20;
        adjustment.grindBias = 'finer';
        adjustment.notes.push('French Press double filter style uses a medium to medium-coarse starting grind around 1:15, using paper plus metal filtration to reduce sediment and lower coffee-oil carryover versus metal mesh alone.');
        adjustment.notes.push('French Press health guard: paper filtration is the safer default when users want lower diterpene exposure; treat this as a brewing guardrail and ask a clinician for personal health decisions.');
      } else if (params.recipeStyle === 'clean_decant') {
        adjustment.ratioDelta = 0.6;
        adjustment.tempDeltaC = -0.4;
        adjustment.brewTimeDeltaSec = 240;
        adjustment.grindBias = 'coarser';
        adjustment.notes.push('French Press clean decant style relies on a long (Hoffmann-style) settle phase to sink fine particles to the bottom.');
        adjustment.notes.push('French Press health guard: unfiltered immersion coffee can carry more cafestol and kahweol than paper-filtered coffee; choose Double Filter for lower lipid carryover.');
      } else if (params.recipeStyle === 'sweet_immersion') {
        adjustment.ratioDelta = -0.1;
        adjustment.tempDeltaC = -1.0; // Cooler temperature
        adjustment.brewTimeDeltaSec = 85;
        adjustment.grindBias = 'coarser';
        adjustment.notes.push('French Press sweet immersion style keeps water temperature lower and avoids late agitation to lock in sweet compounds.');
        adjustment.notes.push('French Press health guard: unfiltered immersion coffee can carry more cafestol and kahweol than paper-filtered coffee; choose Double Filter for lower lipid carryover.');
      } else {
        // traditional or auto
        adjustment.ratioDelta = 0.0; // 1:15
        adjustment.tempDeltaC = -0.4;
        adjustment.brewTimeDeltaSec = 45;
        adjustment.grindBias = 'coarser';
        adjustment.notes.push('French Press traditional style uses full immersion, coarse grind, and a standard brew window.');
        adjustment.notes.push('French Press health guard: unfiltered immersion coffee can carry more cafestol and kahweol than paper-filtered coffee; use Double Filter when lower lipid carryover is preferred.');
      }
      break;
    case 'aeropress':
      adjustment.sequenceSignature = 'pressure_immersion';
      if (params.recipeStyle === 'bright_clean') {
        adjustment.ratioDelta = 0.35;
        adjustment.tempDeltaC = 0.4;
        adjustment.brewTimeDeltaSec = -15;
        adjustment.grindBias = 'same';
        adjustment.notes.push('AeroPress bright-clean style uses shorter contact, moderate agitation, and a controlled press for clarity.');
      } else if (params.recipeStyle === 'sweet_body') {
        adjustment.ratioDelta = -0.35;
        adjustment.tempDeltaC = -0.4;
        adjustment.brewTimeDeltaSec = 15;
        adjustment.grindBias = 'finer';
        adjustment.notes.push('AeroPress sweet-body style extends immersion and presses slower for a denser cup.');
      } else if (params.recipeStyle === 'bypass') {
        adjustment.ratioDelta = -0.55;
        adjustment.tempDeltaC = -0.2;
        adjustment.brewTimeDeltaSec = -5;
        adjustment.grindBias = 'finer';
        adjustment.notes.push('Bypass style: brew concentrate then dilute.');
      } else {
        adjustment.ratioDelta = -0.05;
        adjustment.tempDeltaC = -1;
        adjustment.brewTimeDeltaSec = -20;
        adjustment.grindBias = 'finer';
        adjustment.notes.push('AeroPress family uses short immersion and a controlled press, so the plan tightens grind and keeps the steep/press window compact.');
      }
      break;
    case 'siphon':
      adjustment.sequenceSignature = 'vacuum_clear';
      adjustment.ratioDelta = -0.03;
      adjustment.tempDeltaC = -0.2;
      adjustment.brewTimeDeltaSec = 8;
      adjustment.grindBias = 'same';
      adjustment.notes.push('Siphon family protects aromatic clarity with a clean heat phase, brief agitation, and natural drawdown.');
      break;
    case 'moka_pot':
      adjustment.sequenceSignature = 'stovetop_concentrate';
      adjustment.ratioDelta = -0.12;
      adjustment.tempDeltaC = -0.4;
      adjustment.brewTimeDeltaSec = 8;
      adjustment.grindBias = 'finer';
      adjustment.notes.push('Moka Pot family targets a concentrated stovetop cup with moderate heat and an immediate stop before boiling.');
      break;
    case 'cold_brew':
      adjustment.sequenceSignature = 'cold_immersion';
      adjustment.ratioDelta = -0.2;
      adjustment.tempDeltaC = 0;
      adjustment.brewTimeDeltaSec = 0;
      adjustment.grindBias = 'coarser';
      adjustment.notes.push('Cold Brew family keeps extraction slow, coarse, and immersion-led so strength comes from time rather than heat.');
      break;
    case 'batch_brew':
      adjustment.sequenceSignature = 'batch_consistency';
      adjustment.ratioDelta = 0.05;
      adjustment.tempDeltaC = 0.1;
      adjustment.brewTimeDeltaSec = 18;
      adjustment.grindBias = 'same';
      adjustment.notes.push('Batch Brew family keeps cafe-service consistency by holding a Golden Cup style ratio, stable water temperature, and machine flow window.');
      break;
    case 'espresso':
      adjustment.sequenceSignature = 'pressure_shot';
      adjustment.ratioDelta = 0;
      adjustment.tempDeltaC = 0;
      adjustment.brewTimeDeltaSec = 0;
      adjustment.grindBias = 'finer';
      adjustment.notes.push('Espresso family is treated as a pressure-shot target where yield and time matter more than pour pulses.');
      break;
    default:
      return adjustment;
  }

  if (params.brewMode === 'iced') {
    adjustment.ratioDelta = roundTo(adjustment.ratioDelta * 0.55, 2);
    adjustment.tempDeltaC = roundTo(adjustment.tempDeltaC * 0.6, 1);
    adjustment.brewTimeDeltaSec = Math.round(adjustment.brewTimeDeltaSec * 0.6);
  }

  adjustment.confidenceNotes.push(`Method-family signature active: ${methodLabel}.`);
  return adjustment;
}

function deriveTargetFamilyAdjustment(params: {
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  targetProfileLabel: string;
  targetProfileId?: string;
  pourBehavior?: TargetProfilePourBehavior;
}): TargetFamilyAdjustment {
  const adjustment: TargetFamilyAdjustment = {
    ...createNeutralCalibrationAdjustment(),
    finalWindowDeltaSec: 0,
    directionalShift: 0,
    middleShift: 0,
    firstShareDelta: 0,
    middleShareDelta: 0,
    lastShareDelta: 0,
  };
  const targetIntent = resolveTargetIntent(params.targetProfileLabel, params.targetProfileId);

  const methodLabel = params.methodFamily.replace(/_/g, ' ');

  if (targetIntent !== 'balanced') {
    switch (params.methodFamily) {
      case 'v60':
        if (targetIntent === 'acidity') {
        adjustment.ratioDelta = 0.03;
        adjustment.tempDeltaC = -0.2;
        adjustment.brewTimeDeltaSec = -5;
        adjustment.grindBias = 'coarser';
        adjustment.finalWindowDeltaSec = 4;
        adjustment.directionalShift = 0.22;
        adjustment.firstShareDelta = -0.012;
        adjustment.lastShareDelta = 0.012;
      } else if (targetIntent === 'sweetness') {
        adjustment.ratioDelta = params.targetProfileId === 'soft_round' ? -0.16 : -0.02;
        adjustment.tempDeltaC = 0.1;
        adjustment.brewTimeDeltaSec = 4;
        adjustment.middleShift = 0.18;
        adjustment.firstShareDelta = -0.008;
        adjustment.middleShareDelta = 0.016;
        adjustment.lastShareDelta = -0.008;
      } else {
        adjustment.ratioDelta = -0.03;
        adjustment.tempDeltaC = 0.2;
        adjustment.brewTimeDeltaSec = 6;
        adjustment.grindBias = 'finer';
        adjustment.finalWindowDeltaSec = -3;
        adjustment.directionalShift = -0.16;
        adjustment.firstShareDelta = 0.016;
        adjustment.lastShareDelta = -0.016;
      }
        break;
      case 'origami':
        if (targetIntent === 'acidity') {
        adjustment.ratioDelta = 0.03;
        adjustment.tempDeltaC = -0.2;
        adjustment.brewTimeDeltaSec = -6;
        adjustment.grindBias = 'coarser';
        adjustment.finalWindowDeltaSec = 3;
        adjustment.directionalShift = 0.18;
        adjustment.firstShareDelta = -0.01;
        adjustment.lastShareDelta = 0.01;
      } else if (targetIntent === 'sweetness') {
        adjustment.ratioDelta = -0.01;
        adjustment.tempDeltaC = 0.1;
        adjustment.brewTimeDeltaSec = 2;
        adjustment.middleShift = 0.12;
        adjustment.middleShareDelta = 0.012;
        adjustment.firstShareDelta = -0.006;
        adjustment.lastShareDelta = -0.006;
      } else {
        adjustment.ratioDelta = -0.02;
        adjustment.tempDeltaC = 0.15;
        adjustment.brewTimeDeltaSec = 4;
        adjustment.directionalShift = -0.08;
        adjustment.firstShareDelta = 0.01;
        adjustment.lastShareDelta = -0.01;
      }
        break;
      case 'kono':
        if (targetIntent === 'acidity') {
        adjustment.ratioDelta = 0.01;
        adjustment.tempDeltaC = -0.1;
        adjustment.brewTimeDeltaSec = -2;
        adjustment.finalWindowDeltaSec = 1;
        adjustment.directionalShift = 0.08;
        adjustment.firstShareDelta = -0.006;
        adjustment.lastShareDelta = 0.006;
      } else if (targetIntent === 'sweetness') {
        adjustment.ratioDelta = -0.03;
        adjustment.tempDeltaC = 0.15;
        adjustment.brewTimeDeltaSec = 5;
        adjustment.grindBias = 'finer';
        adjustment.middleShift = 0.14;
        adjustment.firstShareDelta = 0.012;
        adjustment.middleShareDelta = 0.012;
        adjustment.lastShareDelta = -0.024;
      } else {
        adjustment.ratioDelta = -0.03;
        adjustment.tempDeltaC = 0.2;
        adjustment.brewTimeDeltaSec = 7;
        adjustment.grindBias = 'finer';
        adjustment.directionalShift = -0.16;
        adjustment.firstShareDelta = 0.016;
        adjustment.middleShareDelta = 0.01;
        adjustment.lastShareDelta = -0.026;
      }
        break;
      case 'kalita_wave':
      case 'melitta':
        if (targetIntent === 'acidity') {
        adjustment.ratioDelta = 0.01;
        adjustment.tempDeltaC = -0.1;
        adjustment.brewTimeDeltaSec = -2;
        adjustment.directionalShift = 0.06;
        adjustment.middleShift = 0.05;
        adjustment.firstShareDelta = -0.006;
        adjustment.middleShareDelta = 0.004;
        adjustment.lastShareDelta = 0.002;
      } else if (targetIntent === 'sweetness') {
        adjustment.ratioDelta = -0.02;
        adjustment.tempDeltaC = 0.1;
        adjustment.brewTimeDeltaSec = 4;
        adjustment.middleShift = 0.22;
        adjustment.firstShareDelta = -0.01;
        adjustment.middleShareDelta = 0.02;
        adjustment.lastShareDelta = -0.01;
      } else {
        adjustment.ratioDelta = -0.03;
        adjustment.tempDeltaC = 0.2;
        adjustment.brewTimeDeltaSec = 6;
        adjustment.grindBias = 'finer';
        adjustment.middleShift = 0.26;
        adjustment.directionalShift = -0.1;
        adjustment.firstShareDelta = 0.012;
        adjustment.middleShareDelta = 0.016;
        adjustment.lastShareDelta = -0.028;
      }
        break;
      case 'april':
        if (targetIntent === 'acidity') {
        adjustment.ratioDelta = 0.04;
        adjustment.tempDeltaC = -0.2;
        adjustment.brewTimeDeltaSec = -7;
        adjustment.grindBias = 'coarser';
        adjustment.finalWindowDeltaSec = -4;
        adjustment.directionalShift = 0.12;
        adjustment.firstShareDelta = -0.008;
        adjustment.lastShareDelta = 0.008;
      } else if (targetIntent === 'sweetness') {
        adjustment.ratioDelta = -0.01;
        adjustment.tempDeltaC = 0.1;
        adjustment.brewTimeDeltaSec = 2;
        adjustment.middleShift = 0.14;
        adjustment.firstShareDelta = -0.004;
        adjustment.middleShareDelta = 0.008;
        adjustment.lastShareDelta = -0.004;
      } else {
        adjustment.ratioDelta = -0.02;
        adjustment.tempDeltaC = 0.2;
        adjustment.brewTimeDeltaSec = 4;
        adjustment.directionalShift = -0.08;
        adjustment.firstShareDelta = 0.012;
        adjustment.middleShareDelta = 0.008;
        adjustment.lastShareDelta = -0.02;
      }
        break;
      case 'chemex':
        if (targetIntent === 'acidity') {
        adjustment.ratioDelta = 0.01;
        adjustment.tempDeltaC = -0.1;
        adjustment.brewTimeDeltaSec = -3;
        adjustment.finalWindowDeltaSec = 2;
        adjustment.directionalShift = 0.04;
        adjustment.firstShareDelta = -0.004;
        adjustment.lastShareDelta = 0.004;
      } else if (targetIntent === 'sweetness') {
        adjustment.ratioDelta = -0.02;
        adjustment.tempDeltaC = 0.1;
        adjustment.brewTimeDeltaSec = 4;
        adjustment.middleShift = 0.16;
        adjustment.firstShareDelta = 0.008;
        adjustment.middleShareDelta = 0.01;
        adjustment.lastShareDelta = -0.018;
      } else {
        adjustment.ratioDelta = -0.03;
        adjustment.tempDeltaC = 0.2;
        adjustment.brewTimeDeltaSec = 7;
        adjustment.directionalShift = -0.14;
        adjustment.firstShareDelta = 0.018;
        adjustment.middleShareDelta = 0.01;
        adjustment.lastShareDelta = -0.028;
      }
        break;
      case 'clever_dripper':
        if (targetIntent === 'acidity') {
        adjustment.ratioDelta = 0.03;
        adjustment.tempDeltaC = -0.2;
        adjustment.brewTimeDeltaSec = -8;
        adjustment.grindBias = 'coarser';
        adjustment.finalWindowDeltaSec = -6;
        adjustment.directionalShift = 0.14;
        adjustment.firstShareDelta = -0.02;
        adjustment.lastShareDelta = 0.02;
      } else if (targetIntent === 'sweetness') {
        adjustment.ratioDelta = -0.03;
        adjustment.tempDeltaC = 0.1;
        adjustment.brewTimeDeltaSec = 5;
        adjustment.middleShift = 0.16;
        adjustment.firstShareDelta = 0.02;
        adjustment.middleShareDelta = 0.008;
        adjustment.lastShareDelta = -0.028;
      } else {
        adjustment.ratioDelta = -0.04;
        adjustment.tempDeltaC = 0.2;
        adjustment.brewTimeDeltaSec = 8;
        adjustment.directionalShift = -0.18;
        adjustment.firstShareDelta = 0.026;
        adjustment.middleShareDelta = 0.012;
        adjustment.lastShareDelta = -0.038;
      }
        break;
      default:
        break;
    }
  }

  const behavior = params.pourBehavior || resolveTargetPourBehavior(params.targetProfileId);
  if (behavior) {
    if (behavior.middleLoadBias === 'full') {
      adjustment.middleShift += 0.12;
      adjustment.middleShareDelta += 0.018;
      adjustment.lastShareDelta -= 0.01;
    } else if (behavior.middleLoadBias === 'light') {
      adjustment.middleShift -= 0.05;
      adjustment.middleShareDelta -= 0.012;
      adjustment.lastShareDelta += 0.012;
    }

    if (behavior.finalLoadBias === 'light') {
      adjustment.lastShareDelta -= 0.014;
      adjustment.middleShareDelta += 0.01;
    } else if (behavior.finalLoadBias === 'gentle') {
      adjustment.lastShareDelta -= 0.006;
    }

    if (behavior.agitation === 'minimal') {
      adjustment.tempDeltaC -= 0.1;
      adjustment.brewTimeDeltaSec -= 2;
      adjustment.directionalShift += 0.04;
    } else if (behavior.agitation === 'controlled') {
      adjustment.brewTimeDeltaSec += 4;
      adjustment.directionalShift -= 0.04;
    }

    if (behavior.drawdownBias === 'faster') {
      adjustment.brewTimeDeltaSec -= 3;
      adjustment.finalWindowDeltaSec += 4;
    } else if (behavior.drawdownBias === 'slower') {
      adjustment.brewTimeDeltaSec += 5;
      adjustment.finalWindowDeltaSec += 6;
    }
  }

  if (params.brewMode === 'iced') {
    adjustment.ratioDelta = roundTo(adjustment.ratioDelta * 0.65, 2);
    adjustment.tempDeltaC = roundTo(adjustment.tempDeltaC * 0.6, 1);
    adjustment.brewTimeDeltaSec = Math.round(adjustment.brewTimeDeltaSec * 0.55);
    adjustment.finalWindowDeltaSec = Math.round(adjustment.finalWindowDeltaSec * 0.6);
    adjustment.directionalShift = roundTo(adjustment.directionalShift * 0.7, 2);
    adjustment.middleShift = roundTo(adjustment.middleShift * 0.7, 2);
    adjustment.firstShareDelta = roundTo(adjustment.firstShareDelta * 0.7, 3);
    adjustment.middleShareDelta = roundTo(adjustment.middleShareDelta * 0.7, 3);
    adjustment.lastShareDelta = roundTo(adjustment.lastShareDelta * 0.7, 3);
  }

  adjustment.notes.push(`Target-to-device calibration sharpened ${targetIntent} handling for ${methodLabel}.`);
  if (behavior) {
    if (supportsAiBrewPourControls(params.methodFamily)) {
      adjustment.notes.push(`Target pour behavior active: bloom ${behavior.bloomMultiplier || 2}x, ${behavior.bloomTimeSec || 42}s, ${behavior.agitation || 'low'} agitation, ${behavior.drawdownBias || 'normal'} drawdown bias.`);
    } else {
      adjustment.notes.push(`Target method behavior active: ${behavior.agitation || 'low'} agitation/contact guidance with ${behavior.drawdownBias || 'normal'} service pacing.`);
    }
  }
  adjustment.confidenceNotes.push(`Target-method calibration active: ${targetIntent} x ${methodLabel}.`);
  return adjustment;
}

function resolveOriginProfileDisplayLabel(profileId: OriginProfileId) {
  switch (profileId) {
    case 'east_africa_floral':
      return 'East Africa floral';
    case 'latin_america_balanced':
      return 'Latin America balanced';
    case 'central_america_cocoa':
      return 'Central America cocoa citrus';
    case 'mexico_mesoamerica':
      return 'Mexico and Mesoamerica cocoa citrus';
    case 'andes_balanced':
      return 'Andes balanced fruit';
    case 'caribbean_milds':
      return 'Caribbean mild sweetness';
    case 'brazil_sweet':
      return 'Brazil sweet';
    case 'indonesia_structured':
      return 'Indonesia structured';
    case 'middle_east_dried_fruit':
      return 'Middle East dried fruit';
    case 'pacific_islands_complex':
      return 'Pacific islands structured';
    case 'south_asia_monsoon_spice':
      return 'South Asia monsoon spice';
    case 'china_yunnan_fruit':
      return 'China Yunnan fruit clarity';
    case 'robusta_lowland_body':
      return 'Robusta lowland body';
    case 'asia_highland':
      return 'Asia highland';
    default:
      return 'origin';
  }
}

function deriveOriginTargetMethodAdjustment(params: {
  originProfileId: OriginProfileId;
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  targetProfileLabel: string;
  targetProfileId?: string;
}): OriginTargetMethodAdjustment {
  const adjustment: OriginTargetMethodAdjustment = {
    ...createNeutralCalibrationAdjustment(),
    finalWindowDeltaSec: 0,
    directionalShift: 0,
    middleShift: 0,
    firstShareDelta: 0,
    middleShareDelta: 0,
    lastShareDelta: 0,
  };

  if (params.originProfileId === 'unknown') return adjustment;

  const targetIntent = resolveTargetIntent(params.targetProfileLabel, params.targetProfileId);
  const methodFamily = params.methodFamily;

  switch (params.originProfileId) {
    case 'east_africa_floral':
      if (methodFamily === 'v60' || methodFamily === 'origami') {
        if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.02;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -3;
          adjustment.grindBias = 'coarser';
          adjustment.finalWindowDeltaSec = 2;
          adjustment.directionalShift = 0.12;
          adjustment.firstShareDelta = -0.008;
          adjustment.lastShareDelta = 0.008;
        } else if (targetIntent === 'sweetness') {
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.06;
          adjustment.firstShareDelta = -0.004;
          adjustment.middleShareDelta = 0.008;
          adjustment.lastShareDelta = -0.004;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.01;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.firstShareDelta = 0.006;
          adjustment.lastShareDelta = -0.006;
        } else {
          adjustment.ratioDelta = 0.01;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -1;
          adjustment.directionalShift = 0.08;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        }
      } else if (methodFamily === 'kalita_wave' || methodFamily === 'melitta') {
        if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.01;
          adjustment.brewTimeDeltaSec = -2;
          adjustment.directionalShift = 0.06;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        } else if (targetIntent === 'sweetness') {
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.06;
          adjustment.middleShareDelta = 0.008;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = -0.004;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.01;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.04;
          adjustment.firstShareDelta = 0.004;
          adjustment.middleShareDelta = 0.004;
          adjustment.lastShareDelta = -0.008;
        }
      } else if (methodFamily === 'april') {
        if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.02;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -4;
          adjustment.grindBias = 'coarser';
          adjustment.finalWindowDeltaSec = -2;
          adjustment.directionalShift = 0.08;
          adjustment.firstShareDelta = -0.006;
          adjustment.lastShareDelta = 0.006;
        } else if (targetIntent === 'sweetness') {
          adjustment.middleShift = 0.04;
          adjustment.middleShareDelta = 0.006;
          adjustment.firstShareDelta = -0.003;
          adjustment.lastShareDelta = -0.003;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.01;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.firstShareDelta = 0.004;
          adjustment.lastShareDelta = -0.004;
        }
      } else if (methodFamily === 'chemex') {
        if (targetIntent === 'acidity' || targetIntent === 'balanced') {
          adjustment.ratioDelta = 0.01;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -2;
          adjustment.directionalShift = 0.04;
          adjustment.firstShareDelta = -0.003;
          adjustment.lastShareDelta = 0.003;
        } else if (targetIntent === 'sweetness') {
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.04;
          adjustment.middleShareDelta = 0.006;
          adjustment.lastShareDelta = -0.006;
        }
      } else if (methodFamily === 'clever_dripper') {
        if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.02;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -5;
          adjustment.grindBias = 'coarser';
          adjustment.finalWindowDeltaSec = -4;
          adjustment.directionalShift = 0.16;
          adjustment.firstShareDelta = -0.018;
          adjustment.lastShareDelta = 0.018;
        } else if (targetIntent === 'sweetness') {
          adjustment.brewTimeDeltaSec = -1;
          adjustment.middleShift = 0.02;
          adjustment.firstShareDelta = -0.008;
          adjustment.lastShareDelta = 0.008;
        }
      }
      break;
    case 'brazil_sweet':
      if (methodFamily === 'v60' || methodFamily === 'origami') {
        if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.02;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 2;
          adjustment.middleShift = 0.08;
          adjustment.directionalShift = -0.06;
          adjustment.firstShareDelta = 0.004;
          adjustment.middleShareDelta = 0.008;
          adjustment.lastShareDelta = -0.012;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.02;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 3;
          adjustment.directionalShift = -0.08;
          adjustment.firstShareDelta = 0.01;
          adjustment.middleShareDelta = 0.006;
          adjustment.lastShareDelta = -0.016;
        } else if (targetIntent === 'balanced') {
          adjustment.ratioDelta = -0.01;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.04;
          adjustment.middleShareDelta = 0.004;
        }
      } else if (methodFamily === 'kalita_wave' || methodFamily === 'melitta') {
        if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.02;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 3;
          adjustment.middleShift = 0.1;
          adjustment.firstShareDelta = 0.006;
          adjustment.middleShareDelta = 0.012;
          adjustment.lastShareDelta = -0.018;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.03;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 4;
          adjustment.directionalShift = -0.1;
          adjustment.middleShift = 0.08;
          adjustment.firstShareDelta = 0.012;
          adjustment.middleShareDelta = 0.01;
          adjustment.lastShareDelta = -0.022;
        } else if (targetIntent === 'balanced') {
          adjustment.ratioDelta = -0.01;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.05;
          adjustment.middleShareDelta = 0.006;
        }
      } else if (methodFamily === 'april') {
        if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.01;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.04;
          adjustment.middleShareDelta = 0.004;
          adjustment.lastShareDelta = -0.004;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.01;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 2;
          adjustment.firstShareDelta = 0.008;
          adjustment.lastShareDelta = -0.008;
        }
      } else if (methodFamily === 'chemex') {
        if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.01;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 2;
          adjustment.middleShift = 0.08;
          adjustment.firstShareDelta = 0.006;
          adjustment.middleShareDelta = 0.008;
          adjustment.lastShareDelta = -0.014;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.02;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 4;
          adjustment.directionalShift = -0.08;
          adjustment.firstShareDelta = 0.01;
          adjustment.middleShareDelta = 0.008;
          adjustment.lastShareDelta = -0.018;
        }
      } else if (methodFamily === 'clever_dripper') {
        if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.03;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 4;
          adjustment.middleShift = 0.08;
          adjustment.firstShareDelta = 0.012;
          adjustment.middleShareDelta = 0.008;
          adjustment.lastShareDelta = -0.02;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.03;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 6;
          adjustment.directionalShift = -0.12;
          adjustment.firstShareDelta = 0.02;
          adjustment.middleShareDelta = 0.01;
          adjustment.lastShareDelta = -0.03;
        }
      }
      break;
    case 'indonesia_structured':
    case 'south_asia_monsoon_spice':
      if (methodFamily === 'v60' || methodFamily === 'origami') {
        if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.02;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -2;
          adjustment.grindBias = 'coarser';
          adjustment.directionalShift = 0.1;
          adjustment.firstShareDelta = -0.006;
          adjustment.lastShareDelta = 0.006;
        } else if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.01;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.04;
          adjustment.middleShareDelta = 0.006;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.01;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 2;
          adjustment.directionalShift = -0.06;
          adjustment.firstShareDelta = 0.008;
          adjustment.lastShareDelta = -0.008;
        }
      } else if (methodFamily === 'kalita_wave' || methodFamily === 'melitta') {
        if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.02;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 4;
          adjustment.directionalShift = -0.12;
          adjustment.middleShift = 0.12;
          adjustment.firstShareDelta = 0.008;
          adjustment.middleShareDelta = 0.012;
          adjustment.lastShareDelta = -0.02;
        } else if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.02;
          adjustment.brewTimeDeltaSec = 3;
          adjustment.middleShift = 0.1;
          adjustment.middleShareDelta = 0.012;
          adjustment.lastShareDelta = -0.012;
        } else if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.01;
          adjustment.brewTimeDeltaSec = -1;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        }
      } else if (methodFamily === 'april') {
        if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.01;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -3;
          adjustment.directionalShift = 0.06;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        } else if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.01;
          adjustment.brewTimeDeltaSec = 1;
          adjustment.middleShift = 0.04;
          adjustment.middleShareDelta = 0.006;
        } else if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.02;
          adjustment.brewTimeDeltaSec = 2;
          adjustment.firstShareDelta = 0.008;
          adjustment.lastShareDelta = -0.008;
        }
      } else if (methodFamily === 'chemex') {
        if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.02;
          adjustment.brewTimeDeltaSec = 4;
          adjustment.directionalShift = -0.08;
          adjustment.firstShareDelta = 0.01;
          adjustment.middleShareDelta = 0.008;
          adjustment.lastShareDelta = -0.018;
        } else if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.01;
          adjustment.brewTimeDeltaSec = -1;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        }
      } else if (methodFamily === 'clever_dripper') {
        if (targetIntent === 'body') {
          adjustment.ratioDelta = -0.03;
          adjustment.tempDeltaC = 0.1;
          adjustment.brewTimeDeltaSec = 6;
          adjustment.directionalShift = -0.14;
          adjustment.firstShareDelta = 0.018;
          adjustment.middleShareDelta = 0.01;
          adjustment.lastShareDelta = -0.028;
        } else if (targetIntent === 'sweetness') {
          adjustment.ratioDelta = -0.02;
          adjustment.brewTimeDeltaSec = 3;
          adjustment.middleShift = 0.08;
          adjustment.middleShareDelta = 0.008;
          adjustment.lastShareDelta = -0.01;
        } else if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.01;
          adjustment.brewTimeDeltaSec = -3;
          adjustment.grindBias = 'coarser';
          adjustment.directionalShift = 0.1;
          adjustment.firstShareDelta = -0.012;
          adjustment.lastShareDelta = 0.012;
        }
      }
      break;
    case 'asia_highland':
    case 'china_yunnan_fruit':
      if (methodFamily === 'v60' || methodFamily === 'origami') {
        if (targetIntent === 'acidity' || targetIntent === 'balanced') {
          adjustment.ratioDelta = 0.01;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -2;
          adjustment.directionalShift = 0.08;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        } else if (targetIntent === 'sweetness') {
          adjustment.middleShift = 0.05;
          adjustment.middleShareDelta = 0.006;
        }
      } else if (methodFamily === 'kalita_wave' || methodFamily === 'melitta') {
        if (targetIntent === 'sweetness' || targetIntent === 'balanced') {
          adjustment.brewTimeDeltaSec = 2;
          adjustment.middleShift = 0.08;
          adjustment.middleShareDelta = 0.01;
          adjustment.lastShareDelta = -0.01;
        } else if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.01;
          adjustment.brewTimeDeltaSec = -1;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        }
      } else if (methodFamily === 'april') {
        if (targetIntent === 'acidity') {
          adjustment.ratioDelta = 0.01;
          adjustment.tempDeltaC = -0.1;
          adjustment.brewTimeDeltaSec = -2;
          adjustment.directionalShift = 0.05;
          adjustment.firstShareDelta = -0.004;
          adjustment.lastShareDelta = 0.004;
        } else if (targetIntent === 'sweetness') {
          adjustment.middleShift = 0.04;
          adjustment.middleShareDelta = 0.005;
        }
      } else if (methodFamily === 'clever_dripper' && targetIntent === 'sweetness') {
        adjustment.ratioDelta = -0.01;
        adjustment.brewTimeDeltaSec = 1;
        adjustment.middleShift = 0.04;
        adjustment.middleShareDelta = 0.006;
        adjustment.lastShareDelta = -0.006;
      }
      break;
    case 'latin_america_balanced':
    case 'mexico_mesoamerica':
    case 'caribbean_milds':
      if ((methodFamily === 'v60' || methodFamily === 'origami') && targetIntent === 'balanced') {
        adjustment.middleShift = 0.04;
        adjustment.middleShareDelta = 0.004;
      } else if ((methodFamily === 'kalita_wave' || methodFamily === 'melitta') && targetIntent === 'sweetness') {
        adjustment.middleShift = 0.05;
        adjustment.middleShareDelta = 0.006;
        adjustment.lastShareDelta = -0.006;
      }
      break;
    default:
      break;
  }

  if (params.brewMode === 'iced') {
    adjustment.ratioDelta = roundTo(adjustment.ratioDelta * 0.65, 2);
    adjustment.tempDeltaC = roundTo(adjustment.tempDeltaC * 0.6, 1);
    adjustment.brewTimeDeltaSec = Math.round(adjustment.brewTimeDeltaSec * 0.55);
    adjustment.finalWindowDeltaSec = Math.round(adjustment.finalWindowDeltaSec * 0.6);
    adjustment.directionalShift = roundTo(adjustment.directionalShift * 0.7, 2);
    adjustment.middleShift = roundTo(adjustment.middleShift * 0.7, 2);
    adjustment.firstShareDelta = roundTo(adjustment.firstShareDelta * 0.7, 3);
    adjustment.middleShareDelta = roundTo(adjustment.middleShareDelta * 0.7, 3);
    adjustment.lastShareDelta = roundTo(adjustment.lastShareDelta * 0.7, 3);
  }

  const isActive =
    adjustment.ratioDelta !== 0
    || adjustment.tempDeltaC !== 0
    || adjustment.brewTimeDeltaSec !== 0
    || adjustment.grindBias !== 'same'
    || adjustment.finalWindowDeltaSec !== 0
    || adjustment.directionalShift !== 0
    || adjustment.middleShift !== 0
    || adjustment.firstShareDelta !== 0
    || adjustment.middleShareDelta !== 0
    || adjustment.lastShareDelta !== 0;

  if (!isActive) return adjustment;

  const originLabel = resolveOriginProfileDisplayLabel(params.originProfileId);
  const methodLabel = params.methodFamily.replace(/_/g, ' ');
  adjustment.notes.push(`Origin-to-device calibration sharpened ${originLabel.toLowerCase()} handling for ${methodLabel}.`);
  adjustment.confidenceNotes.push(`Origin-method calibration active: ${originLabel.toLowerCase()} x ${targetIntent} x ${methodLabel}.`);
  return adjustment;
}

function resolveMethodFamilyFinalWindowDelta(methodFamily: AiBrewMethodFamily) {
  switch (methodFamily) {
    case 'espresso':
      return -24;
    case 'aeropress':
      return -16;
    case 'moka_pot':
      return 18;
    case 'french_press':
      return 24;
    case 'cold_brew':
      return 900;
    case 'batch_brew':
      return 16;
    case 'siphon':
      return 10;
    case 'chemex':
      return 8;
    case 'clever_dripper':
    case 'hario_switch':
      return 10;
    case 'kono':
      return 5;
    case 'april':
      return -6;
    case 'kalita_wave':
    case 'melitta':
      return -1;
    case 'origami':
      return 1;
    case 'v60':
    default:
      return 2;
  }
}

function resolveMethodFamilyFinalWindowBounds(methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  switch (methodFamily) {
    case 'espresso':
      return { min: 3, max: 10 };
    case 'aeropress':
      return { min: 15, max: 40 };
    case 'moka_pot':
      return { min: 30, max: 70 };
    case 'french_press':
      return { min: 15, max: 30 };
    case 'siphon':
      return { min: 28, max: 70 };
    case 'cold_brew':
      return { min: 600, max: 3600 };
    case 'batch_brew':
      return { min: 60, max: 110 };
    case 'chemex':
      return brewMode === 'iced' ? { min: 80, max: 125 } : { min: 75, max: 130 };
    case 'clever_dripper':
    case 'hario_switch':
      return brewMode === 'iced' ? { min: 42, max: 78 } : { min: 50, max: 88 };
    case 'kono':
      return brewMode === 'iced' ? { min: 58, max: 88 } : { min: 38, max: 78 };
    case 'kalita_wave':
    case 'melitta':
      return brewMode === 'iced' ? { min: 55, max: 85 } : { min: 36, max: 78 };
    case 'april':
      return brewMode === 'iced' ? { min: 44, max: 75 } : { min: 28, max: 62 };
    case 'origami':
      return brewMode === 'iced' ? { min: 56, max: 86 } : { min: 32, max: 70 };
    case 'v60':
    default:
      return brewMode === 'iced' ? { min: 70, max: 95 } : { min: 36, max: 78 };
  }
}

function resolveMethodFamilyDirectionalShift(methodFamily: AiBrewMethodFamily) {
  switch (methodFamily) {
    case 'espresso':
      return 0;
    case 'aeropress':
      return 0.12;
    case 'moka_pot':
      return -0.1;
    case 'french_press':
    case 'cold_brew':
      return -0.4;
    case 'siphon':
      return -0.05;
    case 'batch_brew':
      return -0.12;
    case 'v60':
    case 'origami':
      return 0.18;
    case 'kono':
      return -0.22;
    case 'chemex':
      return -0.12;
    case 'clever_dripper':
    case 'hario_switch':
      return -0.35;
    case 'april':
      return 0.04;
    case 'kalita_wave':
    case 'melitta':
      return -0.08;
    default:
      return 0;
  }
}

function resolveMethodFamilyMiddleShift(methodFamily: AiBrewMethodFamily) {
  switch (methodFamily) {
    case 'french_press':
    case 'cold_brew':
      return 0.5;
    case 'aeropress':
      return 0.25;
    case 'siphon':
      return 0.18;
    case 'moka_pot':
    case 'batch_brew':
      return 0.1;
    case 'kalita_wave':
    case 'melitta':
      return 0.34;
    case 'april':
      return 0.12;
    case 'chemex':
      return 0.18;
    case 'v60':
    case 'origami':
      return 0.05;
    default:
      return 0;
  }
}

function buildMethodFamilyShareDeltas(methodFamily: AiBrewMethodFamily, count: number) {
  const deltas = Array.from({ length: count }, () => 0);
  const first = 0;
  const last = count - 1;
  const middleLeft = Math.floor((count - 1) / 2);
  const middleRight = Math.ceil((count - 1) / 2);

  switch (methodFamily) {
    case 'v60':
    case 'origami':
      deltas[first] -= 0.012;
      deltas[last] += 0.012;
      break;
    case 'kono':
      deltas[first] += 0.028;
      if (count > 2) deltas[Math.min(last, first + 1)] += 0.01;
      deltas[last] -= 0.038;
      break;
    case 'kalita_wave':
    case 'melitta':
      deltas[first] -= 0.01;
      if (middleLeft === middleRight) {
        deltas[middleLeft] += 0.02;
      } else {
        deltas[middleLeft] += 0.01;
        deltas[middleRight] += 0.01;
      }
      deltas[last] -= 0.01;
      break;
    case 'april':
      deltas[first] -= 0.004;
      if (middleLeft === middleRight) {
        deltas[middleLeft] += 0.008;
      } else {
        deltas[middleLeft] += 0.004;
        deltas[middleRight] += 0.004;
      }
      deltas[last] -= 0.004;
      break;
    case 'chemex':
      deltas[first] += 0.014;
      if (count > 2) {
        deltas[Math.min(last, first + 1)] += 0.01;
      }
      deltas[last] -= 0.024;
      break;
    case 'clever_dripper':
    case 'hario_switch':
      deltas[first] += 0.05;
      deltas[last] -= 0.05;
      if (count > 3) {
        deltas[Math.max(first, last - 1)] -= 0.01;
      }
      break;
    default:
      break;
  }

  return deltas;
}

function normalizeSharesToUnit(shares: number[]) {
  const safe = shares.map((share) => (Number.isFinite(share) && share > 0 ? share : 0));
  const total = safe.reduce((sum, share) => sum + share, 0);
  if (total <= 0) {
    const uniform = safe.length > 0 ? 1 / safe.length : 0;
    return safe.map(() => uniform);
  }
  return safe.map((share) => share / total);
}

function inferBrewStepKind(
  step: DeviceBrewProfile['steps'][number],
  context: AdaptiveShareContext,
  index: number,
  stepCount: number,
): BrewTemplateStepKind {
  if (step.kind) return step.kind;
  const signature = `${step.id} ${step.label} ${step.note}`.toLowerCase();
  const hasPositiveShare = Number.isFinite(step.share) && step.share > 0;
  if (context.methodFamily === 'clever_dripper' || context.methodFamily === 'hario_switch') {
    if (index === 0) return 'pour';
    if (/\b(open valve|open the valve|release to cup|release and let|drain cleanly|activate drain|drawdown)\b/.test(signature) || index === stepCount - 1) return 'release';
    if (/hold|steep|wait|rest|valve|release|finish|pour/.test(signature) || index > 0) return 'wait';
    return 'pour';
  }
  if (/release|valve/.test(signature)) return 'release';
  if (/\bpress\b|\bplunge\b/.test(signature)) return 'press';
  if (/\bheat\b|\bstove\b|\bburner\b/.test(signature)) return 'heat';
  if (/\bextract\b|\bshot\b|\byield\b/.test(signature)) return 'extract';
  if (hasPositiveShare) return 'pour';
  if (/drawdown|drain only|let drain|finish drain|finish draining|\bdrain\b/.test(signature)) return 'drawdown';
  if (/\bserve\b|\bdecant\b/.test(signature)) return 'serve';
  if (/hold|steep|wait|rest/.test(signature)) return 'wait';
  return 'pour';
}

function isVolumeTargetStepKind(kind: BrewTemplateStepKind) {
  return kind === 'pour' || kind === 'extract';
}

function rebalanceSharesWithinBounds(rawShares: number[], minShare: number, maxShare: number) {
  const bounded = rawShares.map((share) => clamp(share, minShare, maxShare));
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const total = bounded.reduce((sum, share) => sum + share, 0);
    const diff = 1 - total;
    if (Math.abs(diff) < 0.0001) break;

    if (diff > 0) {
      const headroom = bounded.map((share) => Math.max(0, maxShare - share));
      const totalHeadroom = headroom.reduce((sum, value) => sum + value, 0);
      if (totalHeadroom <= 0) break;
      for (let index = 0; index < bounded.length; index += 1) {
        if (headroom[index] <= 0) continue;
        bounded[index] = clamp(bounded[index] + (diff * headroom[index]) / totalHeadroom, minShare, maxShare);
      }
      continue;
    }

    const slack = bounded.map((share) => Math.max(0, share - minShare));
    const totalSlack = slack.reduce((sum, value) => sum + value, 0);
    if (totalSlack <= 0) break;
    for (let index = 0; index < bounded.length; index += 1) {
      if (slack[index] <= 0) continue;
      bounded[index] = clamp(bounded[index] + (diff * slack[index]) / totalSlack, minShare, maxShare);
    }
  }

  const normalized = normalizeSharesToUnit(bounded);
  const sum = normalized.reduce((total, value) => total + value, 0);
  return sum <= 0 ? normalized : normalized.map((share) => share / sum);
}

function resolveExtractionResistance(context: AdaptiveShareContext) {
  let score = 0;

  if (context.roastLevel === 'light') score += 0.25;
  else if (context.roastLevel === 'medium_light') score += 0.1;
  else if (context.roastLevel === 'medium_dark') score -= 0.18;
  else if (context.roastLevel === 'dark') score -= 0.35;

  if (context.roastDevelopment === 'underdeveloped') score += 0.85;
  else if (context.roastDevelopment === 'developed') score -= 0.85;

  if (context.solubility === 'low') score += 0.75;
  else if (context.solubility === 'high') score -= 0.75;

  if (context.processId && CLARITY_PROCESS_IDS.has(context.processId)) score += 0.15;
  if (context.processId && BODY_PROCESS_IDS.has(context.processId)) score -= 0.18;

  if (context.hardnessPpm >= 120) score += 0.35;
  else if (context.hardnessPpm <= 45) score -= 0.25;

  if (context.alkalinityPpm >= 80) score += 0.3;
  else if (context.alkalinityPpm <= 30) score -= 0.2;

  if (context.doseScale <= -0.35) score += 0.28;
  else if (context.doseScale >= 0.35) score -= 0.24;

  return clamp(score, -2, 2);
}

function buildAdaptiveStepShares(profile: DeviceBrewProfile, context: AdaptiveShareContext) {
  const count = profile.steps.length;
  if (count === 0) return [] as number[];
  if (count < 3) {
    return normalizeSharesToUnit(profile.steps.map((step) => step.share));
  }

  if (context.brewMode === 'iced' && context.methodFamily === 'v60' && count === 3) {
    const v60IcedShares = resolveV60IcedThreePourShares(context.targetProfileId);
    if (v60IcedShares) return v60IcedShares;
  }

  const base = normalizeSharesToUnit(profile.steps.map((step) => step.share));
  if (context.methodFamily === 'hario_switch') {
    return base;
  }
  if (
    context.manualTechniquePattern === 'equal_five_pour'
    || context.manualTechniquePattern === 'four_six'
    || context.manualTechniquePattern === 'ten_pour_multi'
  ) {
    return base;
  }
  const intent = resolveContextTargetIntent(context);

  const deltas = Array.from({ length: count }, () => 0);
  const first = 0;
  const last = count - 1;
  const middleLeft = Math.floor((count - 1) / 2);
  const middleRight = Math.ceil((count - 1) / 2);
  const familyDeltas = buildMethodFamilyShareDeltas(context.methodFamily, count);
  for (let index = 0; index < familyDeltas.length; index += 1) {
    deltas[index] += familyDeltas[index] || 0;
  }
  deltas[first] += context.targetFamilyFirstShareDelta;
  deltas[last] += context.targetFamilyLastShareDelta;
  if (middleLeft === middleRight) {
    deltas[middleLeft] += context.targetFamilyMiddleShareDelta;
  } else {
    deltas[middleLeft] += context.targetFamilyMiddleShareDelta / 2;
    deltas[middleRight] += context.targetFamilyMiddleShareDelta / 2;
  }
  deltas[first] += context.originTargetMethodFirstShareDelta;
  deltas[last] += context.originTargetMethodLastShareDelta;
  if (middleLeft === middleRight) {
    deltas[middleLeft] += context.originTargetMethodMiddleShareDelta;
  } else {
    deltas[middleLeft] += context.originTargetMethodMiddleShareDelta / 2;
    deltas[middleRight] += context.originTargetMethodMiddleShareDelta / 2;
  }

  if (intent === 'acidity') {
    deltas[first] -= 0.04;
    deltas[last] += 0.04;
    if (count > 3) {
      deltas[Math.min(last, first + 1)] -= 0.02;
      deltas[Math.max(first, last - 1)] += 0.02;
    }
  } else if (intent === 'body') {
    deltas[first] += 0.05;
    deltas[last] -= 0.05;
    if (count > 3) {
      deltas[Math.min(last, first + 1)] += 0.02;
      deltas[Math.max(first, last - 1)] -= 0.02;
    }
  } else if (intent === 'sweetness') {
    deltas[first] -= 0.02;
    deltas[last] -= 0.02;
    if (middleLeft === middleRight) {
      deltas[middleLeft] += 0.04;
    } else {
      deltas[middleLeft] += 0.02;
      deltas[middleRight] += 0.02;
    }
  }

  const gasHeavyNatural = Boolean(context.processId && isNaturalLikeProcess(undefined, context.processId));
  const highAromaNatural = Boolean(context.highAromaNatural)
    || (gasHeavyNatural && Boolean(context.varietyId && SWEETNESS_VARIETY_IDS.has(context.varietyId)));
  const shouldFrontLoadNaturalBloom = highAromaNatural
    && context.targetProfileId !== 'more_sweetness'
    && context.targetProfileId !== 'fruit_forward';
  if (
    shouldFrontLoadNaturalBloom
    && (context.methodFamily === 'v60'
      || context.methodFamily === 'chemex'
      || context.methodFamily === 'kalita_wave'
      || context.methodFamily === 'april'
      || context.methodFamily === 'origami'
      || context.methodFamily === 'kono'
      || context.methodFamily === 'melitta')
  ) {
    const firstLift = highAromaNatural ? 0.06 : 0.045;
    const lastTrim = highAromaNatural ? 0.035 : 0.025;
    deltas[first] += firstLift;
    deltas[last] -= lastTrim;
    if (middleLeft === middleRight) {
      deltas[middleLeft] -= firstLift - lastTrim;
    } else {
      const middleTrim = (firstLift - lastTrim) / 2;
      deltas[middleLeft] -= middleTrim;
      deltas[middleRight] -= middleTrim;
    }
  }

  const extractionResistance = resolveExtractionResistance(context);
  if (extractionResistance !== 0) {
    const resistanceDelta = 0.015 * extractionResistance;
    deltas[first] -= resistanceDelta;
    deltas[last] += resistanceDelta;
    if (count > 3) {
      deltas[Math.min(last, first + 1)] -= resistanceDelta * 0.5;
      deltas[Math.max(first, last - 1)] += resistanceDelta * 0.5;
    }
  }

  const flavorDirection = context.flavorDirection === 'balanced' ? intent : context.flavorDirection;
  const flavorIntensity = clamp(context.flavorIntensity, 0, 1);
  if (flavorDirection === 'acidity' && flavorIntensity > 0) {
    const flavorDelta = 0.02 * flavorIntensity;
    deltas[first] -= flavorDelta;
    deltas[last] += flavorDelta;
    if (count > 3) {
      deltas[Math.min(last, first + 1)] -= flavorDelta * 0.5;
      deltas[Math.max(first, last - 1)] += flavorDelta * 0.5;
    }
  } else if (flavorDirection === 'body' && flavorIntensity > 0) {
    const flavorDelta = 0.024 * flavorIntensity;
    deltas[first] += flavorDelta;
    deltas[last] -= flavorDelta;
    if (count > 3) {
      deltas[Math.min(last, first + 1)] += flavorDelta * 0.5;
      deltas[Math.max(first, last - 1)] -= flavorDelta * 0.5;
    }
  } else if (flavorDirection === 'sweetness' && flavorIntensity > 0) {
    const flavorDelta = 0.018 * flavorIntensity;
    if (middleLeft === middleRight) {
      deltas[middleLeft] += flavorDelta * 2;
    } else {
      deltas[middleLeft] += flavorDelta;
      deltas[middleRight] += flavorDelta;
    }
    deltas[first] -= flavorDelta;
    deltas[last] -= flavorDelta;
  }

  if (context.doseScale !== 0) {
    const doseDelta = 0.018 * (-context.doseScale);
    deltas[first] -= doseDelta;
    deltas[last] += doseDelta;
    if (count > 3) {
      deltas[Math.min(last, first + 1)] -= doseDelta * 0.5;
      deltas[Math.max(first, last - 1)] += doseDelta * 0.5;
    }
  }

  const minShare = count >= 5 ? 0.08 : 0.1;
  const maxShare = 0.62;
  const shifted = base.map((share, index) => share + deltas[index]);

  const activeIndices: number[] = [];
  for (let i = 0; i < profile.steps.length; i += 1) {
    if ((profile.steps[i].share ?? 0) > 0) {
      activeIndices.push(i);
    }
  }

  if (activeIndices.length === 0) {
    return Array.from({ length: count }, () => 0);
  }

  const activeShifted = activeIndices.map((idx) => shifted[idx]);
  const rebalancedActive = rebalanceSharesWithinBounds(activeShifted, minShare, maxShare);

  const finalShares = Array.from({ length: count }, () => 0);
  for (let k = 0; k < activeIndices.length; k += 1) {
    finalShares[activeIndices[k]] = rebalancedActive[k];
  }
  return finalShares;
}

type AdaptiveStepPhase = 'bloom' | 'early_middle' | 'late_middle' | 'finish';

function isImmersionLedAdaptiveFamily(methodFamily: AiBrewMethodFamily) {
  return methodFamily === 'french_press'
    || methodFamily === 'clever_dripper'
    || methodFamily === 'aeropress'
    || methodFamily === 'cold_brew';
}

function isNonManualFlowAdaptiveFamily(methodFamily: AiBrewMethodFamily) {
  return methodFamily === 'espresso'
    || methodFamily === 'moka_pot'
    || methodFamily === 'batch_brew'
    || methodFamily === 'siphon';
}

function resolveAdaptiveStepPhase(index: number, count: number): AdaptiveStepPhase {
  if (index <= 0) return 'bloom';
  if (index >= count - 1) return 'finish';
  if (count <= 3) return 'early_middle';
  const middlePivot = Math.floor((count - 1) / 2);
  return index <= middlePivot ? 'early_middle' : 'late_middle';
}

function buildAdaptivePhaseFocusCue(context: AdaptiveShareContext, phase: AdaptiveStepPhase) {
  const targetIntent = resolveContextTargetIntent(context);
  const focus = context.flavorDirection === 'balanced' ? targetIntent : context.flavorDirection;
  const immersionLed = isImmersionLedAdaptiveFamily(context.methodFamily);
  const nonManualFlow = isNonManualFlowAdaptiveFamily(context.methodFamily);

  switch (phase) {
    case 'bloom':
      if (immersionLed) {
        if (focus === 'acidity') return 'Keep the first wetting calm so clarity stays intact.';
        if (focus === 'body') return 'Make sure all grounds are wet so the cup does not run thin later.';
        if (focus === 'sweetness') return 'Keep the first wetting calm so the cup can build a sweeter middle.';
        return 'Wet the grounds evenly before moving to the next checkpoint.';
      }
      if (nonManualFlow) {
        if (context.methodFamily === 'espresso') return 'Start the shot evenly; watch first drops and keep the flow controlled.';
        if (context.methodFamily === 'moka_pot') return 'Start heat gently so the basket wets evenly before coffee rises.';
        if (context.methodFamily === 'batch_brew') return 'Start the machine cycle evenly and confirm the spray pattern is wetting the bed.';
        return 'Start heating and confirm the upper chamber engages evenly.';
      }
      if (focus === 'acidity') return 'Keep the opening gentle so clarity stays intact.';
      if (focus === 'body') return 'Make sure the bed is fully wet so the cup does not run thin later.';
      if (focus === 'sweetness') return 'Keep the bloom calm so the cup can build a sweeter middle.';
      return 'Open the bed evenly before moving to the next checkpoint.';
    case 'early_middle':
      if (nonManualFlow) {
        if (context.methodFamily === 'espresso') return 'Let the middle flow stabilize without chasing extra yield.';
        if (context.methodFamily === 'moka_pot') return 'Keep heat steady while the stream stays honey-like.';
        if (context.methodFamily === 'batch_brew') return 'Keep the spray cycle even so the basket drains uniformly.';
        return 'Keep contact stable while vapor pressure keeps water in the upper chamber.';
      }
      if (focus === 'acidity') return 'Keep the middle phase clean and avoid pushing the walls.';
      if (focus === 'body') return 'Hold slurry depth steady through the middle phase.';
      if (focus === 'sweetness') return 'Use this phase to build sweetness without spiking agitation.';
      return 'Keep the flow stable and repeatable through the middle phase.';
    case 'late_middle':
      if (nonManualFlow) {
        if (context.methodFamily === 'espresso') return 'Watch flow and color so the shot does not run past the sweet finish.';
        if (context.methodFamily === 'moka_pot') return 'Reduce heat before the stream turns pale or sputtery.';
        if (context.methodFamily === 'batch_brew') return 'Let the basket finish evenly without disturbing the bed.';
        return 'Keep the draw-down calm so the lower chamber return stays clean.';
      }
      if (focus === 'acidity') return 'Let the later middle phase stay light so the finish does not flatten.';
      if (focus === 'body') return 'Carry enough contact here to keep structure in the cup.';
      if (focus === 'sweetness') return 'Keep the later middle phase level so sweetness lands cleanly.';
      return 'Keep the later middle phase controlled and level.';
    case 'finish':
    default:
      if (nonManualFlow) {
        if (context.methodFamily === 'espresso') return 'Stop cleanly at target yield so the finish stays sweet.';
        if (context.methodFamily === 'moka_pot') return 'Stop before sputter so the finish stays clean.';
        if (context.methodFamily === 'batch_brew') return 'Mix the batch gently after the basket finishes draining.';
        return 'Break heat and draw the brew down cleanly before serving.';
      }
      if (immersionLed) {
        if (context.methodFamily === 'cold_brew') return 'Filter cleanly first, then dilute or serve only after the grounds are separated.';
        if (context.methodFamily === 'french_press') return 'Press gently, decant cleanly, and leave the fines behind.';
        if (context.methodFamily === 'aeropress') return 'Press steadily and follow the active AeroPress style cue: clarity styles stop before the hiss, body styles press near the hiss and stop before the cup turns dry or gritty.';
        if (context.methodFamily === 'clever_dripper') return 'Release cleanly and avoid stirring again once the brewer is draining.';
        return 'Finish the immersion phase cleanly and separate the brew from the grounds.';
      }
      if (focus === 'acidity') return 'Finish cleanly and avoid heavy late agitation.';
      if (focus === 'body') return 'Finish with enough control to keep the cup dense, not muddy.';
      if (focus === 'sweetness') return 'Finish calmly so the aftertaste stays sweet and round.';
      return 'Finish calmly and let the drawdown stay tidy.';
  }
}

function buildAdaptiveDoseCue(context: AdaptiveShareContext) {
  if (context.doseScale <= -0.35) {
    if (isImmersionLedAdaptiveFamily(context.methodFamily)) {
      return 'This lighter dose needs cleaner contact and shorter idle gaps between checkpoints.';
    }
    if (context.methodFamily === 'moka_pot') {
      return 'This lighter basket fill needs cleaner flow and shorter idle gaps between checkpoints.';
    }
    if (isNonManualFlowAdaptiveFamily(context.methodFamily)) {
      return 'This lighter dose needs cleaner flow and shorter idle gaps between checkpoints.';
    }
    return 'This lighter bed depth needs cleaner flow and shorter idle gaps between pours.';
  }
  if (context.doseScale >= 0.35) {
    if (context.methodFamily === 'moka_pot') {
      return 'This fuller basket can carry a bit more contact, so do not rush the middle checkpoints.';
    }
    return 'This deeper bed can carry a bit more contact, so do not rush the middle checkpoints.';
  }
  return undefined;
}

function buildBaristaStepPracticalCue(context: AdaptiveShareContext, phase: AdaptiveStepPhase) {
  const isManualPaperFilter = ICED_MANUAL_POUR_OVER_FAMILIES.has(context.methodFamily);

  if (isManualPaperFilter) {
    if (phase === 'bloom') {
      const bloomMultiplier = context.pourBehavior?.bloomMultiplier || 2;
      const bloomTimeSec = context.pourBehavior?.bloomTimeSec || (context.brewMode === 'iced' ? 45 : 42);
      if (context.brewMode === 'iced') {
        return `Rinse the paper filter separately, preheat the brewer, discard rinse water, tare the scale, then put measured ice in the server before dosing coffee. Bloom with about ${formatBaristaRatio(bloomMultiplier)}x coffee weight and wait ${bloomTimeSec} seconds before the next pour.`;
      }
      if (context.methodFamily === 'chemex') {
        return `Rinse the thick Chemex paper thoroughly, preheat the brewer/server, discard rinse water, and tare the scale before dosing coffee. Bloom with about ${formatBaristaRatio(bloomMultiplier)}x coffee weight and wait ${bloomTimeSec} seconds before building volume.`;
      }
      return `Rinse the paper filter, preheat the brewer/server, discard rinse water, and tare the scale before dosing coffee. Bloom with about ${formatBaristaRatio(bloomMultiplier)}x coffee weight and wait ${bloomTimeSec} seconds before the next pour.`;
    }
    if (phase === 'early_middle') {
      if (context.methodFamily === 'kalita_wave' || context.methodFamily === 'april') {
        return 'Keep the spout low and use short pulses; if the bed mounds, one gentle swirl or stir after this pour is enough.';
      }
      if (context.methodFamily === 'origami') {
        return 'Pour center-to-spiral with a light hand; one small swirl is enough if the bed looks uneven.';
      }
      if (context.methodFamily === 'chemex') {
        return 'Keep the stream away from the paper wall so the thick filter does not stall or create bypass.';
      }
    }
    if (phase === 'finish') {
      if (context.brewMode === 'iced') {
        return 'Finish at the hot-water target only; let drawdown complete over ice, then stir the server 5-8 seconds before serving.';
      }
      return 'After the last pour, use only a small leveling swirl if needed, then let drawdown finish without wall-rinsing.';
    }
  }

  if (context.methodFamily === 'aeropress') {
    if (phase === 'bloom') {
      return 'Preheat the chamber, rinse the paper cap, and tare the scale first, then wet the compact bed quickly so contact starts evenly.';
    }
    if (phase === 'finish') {
      return 'Press with steady pressure and stop before the final dry hiss so bitterness does not enter the cup.';
    }
  }

  if (context.methodFamily === 'french_press') {
    if (phase === 'bloom') {
      return 'Tare the scale, use a coarse even grind, and saturate all grounds; leave the immersion quiet after the first wetting.';
    }
    if (phase === 'late_middle') {
      return 'Around the late steep window, break the crust gently and skim foam or floating grounds without aggressive stirring.';
    }
    if (phase === 'finish') {
      return 'Press slowly, do not squeeze the bed, then decant immediately so extraction stops cleanly.';
    }
  }

  if (context.methodFamily === 'clever_dripper' && phase === 'bloom') {
    return resolveImmersionReleaseCopy(context).bloomPrep;
  }

  return undefined;
}

function buildMethodFamilyStepInstruction(params: {
  methodFamily: AiBrewMethodFamily;
  phase: AdaptiveStepPhase;
  context: AdaptiveShareContext;
  fallbackNote: string;
  stepId?: string;
}) {
  const { methodFamily, phase, context, fallbackNote } = params;
  let quickNote = fallbackNote;
  let detail = fallbackNote;

  switch (methodFamily) {
    case 'v60':
      if (phase === 'bloom') {
        quickNote = 'Open the bloom evenly and let the cone drain cleanly before the next pour.';
        detail = 'Pour through the center first, then widen only enough to wet the full bed; avoid riding the wall so the cone stays clean.';
      } else if (phase === 'early_middle') {
        quickNote = 'Push a clean center-to-mid pour and keep the cone walls quiet.';
        detail = 'Use a steady center-to-mid path and keep the stream narrow enough to maintain a clear V60 drawdown.';
      } else if (phase === 'late_middle') {
        quickNote = 'Keep the later V60 phase centered so the cup stays transparent.';
        detail = 'Do not widen the late middle too much; hold the stream near center so the bed finishes with clarity instead of bypass.';
      } else {
        quickNote = 'Finish calmly and let the cone drain without chasing the walls.';
        detail = context.brewMode === 'iced'
          ? 'Land the final hot water cleanly, let the cone drain over the ice, then stir the server 5-8 seconds so the melt is even; do not add another pour.'
          : 'Land the last pour gently, then let the cone drain on its own without reopening the wall path.';
      }
      break;
    case 'origami':
      if (context.origamiStyle && context.origamiStyle !== 'auto') {
        quickNote = fallbackNote;
        detail = fallbackNote;
      } else if (context.filterStyle === 'flat') {
        if (phase === 'bloom') {
          quickNote = 'Set the wave filter level and saturate the flat bed edge to edge.';
          detail = 'Use the wave paper like a Kalita bed: wet evenly, keep the base flat, and avoid cone-style wall chasing.';
        } else if (phase === 'early_middle') {
          quickNote = 'Pour from center to a small ring so the wave bed stays level.';
          detail = 'Keep the stream low and centered; Origami with wave paper needs flat-bed contact, not wide circular agitation.';
        } else if (phase === 'late_middle') {
          quickNote = 'Hold the later wave phase calm and centered.';
          detail = 'Let the ribs drain evenly while the bed stays level; do not flood one side or sweep the wall.';
        } else {
          quickNote = 'Finish evenly and let the wave-filter drawdown complete.';
          detail = 'Land the last water across the flat bed and let drawdown finish without a swirl.';
        }
      } else if (phase === 'bloom') {
        quickNote = 'Keep the bloom light and even so the faster cone flow stays clean.';
        detail = 'Wet the bed evenly, but keep the bloom light; Origami cone flow opens quickly and does not need extra turbulence to start well.';
      } else if (phase === 'early_middle') {
        quickNote = 'Use compact cone pulses and keep the flow agile through the middle.';
        detail = 'Keep the pulses compact and controlled so Origami with cone paper keeps its faster, cleaner signature.';
      } else if (phase === 'late_middle') {
        quickNote = 'Hold the later cone phase short and tidy so transparency stays high.';
        detail = 'Avoid stretching the late middle phase; let the bed settle between small pulses rather than forcing more contact.';
      } else {
        quickNote = 'Close with a light finishing pour and let the fast drawdown stay clean.';
        detail = 'Use a light closing pour and let the final drawdown run without extra agitation so the finish stays crisp.';
      }
      break;
    case 'kono':
      if (context.konoStyle && context.konoStyle !== 'auto') {
        quickNote = fallbackNote;
        detail = fallbackNote;
      } else if (phase === 'bloom') {
        quickNote = 'Keep the bloom centered and slightly deeper to establish a sweet core.';
        detail = 'Stay tighter in the center during bloom so the Kono can build its sweeter contact path before the flow opens.';
      } else if (phase === 'early_middle') {
        quickNote = 'Hold a tighter center pour to build sweetness with stable contact time.';
        detail = 'Use a tighter center stream and resist widening too early; the Kono wants a sweeter, more anchored middle phase.';
      } else if (phase === 'late_middle') {
        quickNote = 'Carry the late middle with a narrow, steady stream.';
        detail = 'Keep the late middle narrow and stable so sweetness holds without turning the finish heavy.';
      } else {
        quickNote = 'Finish narrow and controlled so sweetness stays intact.';
        detail = 'Keep the finishing pour restrained and centered, then let the bed settle without reopening the brew path.';
      }
      break;
    case 'kalita_wave':
      {
        const kalitaStyle = context.kalitaWaveStyle || 'auto';
        if (kalitaStyle === 'competition_fast_four') {
          if (phase === 'bloom') {
            quickNote = 'Pour aggressively in the center to wet all grounds quickly.';
            detail = 'Deliver hot water rapidly at the core; push hydration rapidly to the edges while maintaining a flat bed.';
          } else if (phase === 'early_middle') {
            quickNote = 'Pour with high flow rate in a tight center zone to agitate deeply.';
            detail = 'Increase flow rate to promote intense early agitation; keep the slurry level low to maximize velocity and clarity while maintaining a flat bed.';
          } else if (phase === 'late_middle') {
            quickNote = 'Pour with high flow rate in a tight center zone, creating high extraction velocity.';
            detail = 'Deliver the third quick pulse, focusing the stream entirely inside the central zone to accelerate the drawdown without disturbing the flat bed.';
          } else {
            quickNote = 'Final rapid center pulse, keeping the water level low to drain quickly.';
            detail = 'Complete the final short pulse cleanly; let the coffee drain rapidly and completely to produce a vibrant, crisp cup.';
          }
        } else if (kalitaStyle === 'continuous_slow_stream') {
          if (phase === 'bloom') {
            quickNote = 'Pour gently in the center to pre-wet the grounds.';
            detail = 'Wet the dry coffee bed with a very gentle, low-altitude stream to avoid disturbing the flat bed.';
          } else if (phase === 'early_middle') {
            quickNote = 'Maintain an extremely low, slow, continuous centered flow.';
            detail = 'Establish a tiny, continuous centered stream (1.5-2.0 ml/sec). Keep the kettle height low to avoid introducing heavy turbulence and to keep the bed level.';
          } else if (phase === 'late_middle') {
            quickNote = 'Keep a constant water column and steady centered stream.';
            detail = 'Maintain the slow continuous pour without interruption, allowing the water column to extract evenly with minimal agitation while maintaining a flat bed.';
          } else {
            quickNote = 'Stop pouring and let the level column drain slowly.';
            detail = 'Gracefully cut the pour; allow the high-density slurry to drain slowly, extracting deep sweetness and velvety body.';
          }
        } else if (kalitaStyle === 'iced_wave') {
          if (phase === 'bloom') {
            quickNote = 'Bloom hot onto the dry bed; let gassing complete quickly.';
            detail = 'Saturate the small flat bed edge-to-edge; let the gas escape rapidly so the high-density extraction starts clean.';
          } else if (phase === 'early_middle') {
            quickNote = 'Pour hot water in quick center pulses, keeping slurry low and extraction concentrated.';
            detail = 'Apply a tight, rapid center pour to build solubility while keeping the bed level; the concentrate will drip directly onto the ice bed below.';
          } else if (phase === 'late_middle') {
            quickNote = 'Final center hot pour, draining rapidly directly onto the ice bed.';
            detail = 'Top up with the remaining hot target water cleanly, ensuring high thermal locking as it drips onto the ice and keeping the bed level.';
          } else {
            quickNote = 'Let the final drops drain and swirl the server to melt ice completely.';
            detail = 'Allow the concentrated draw to complete, then swirl the server to blend the hot extract and ice into a chilled balance.';
          }
        } else if (kalitaStyle === 'high_dose_concentrate') {
          if (phase === 'bloom') {
            quickNote = 'Wet the thick bed slowly; let gas release from the high dose.';
            detail = 'Pour slowly and into the center; high dose coffee packs tightly, so ensure complete water saturation before pulsing while keeping the bed level.';
          } else if (phase === 'early_middle') {
            quickNote = 'Pour in slow center pulses, keeping the slurry level low to avoid bypass.';
            detail = 'Deliver slow, heavy pulses near the center to wash the deep bed, keeping the water level low to prevent edge bypass and maintain a flat bed.';
          } else if (phase === 'late_middle') {
            quickNote = 'Final slow center pour to wash the bed; avoid fluted wall agitation.';
            detail = 'Finish the hot water target with a slow centered pour; do not wash down fluted walls to protect clarity, ensuring a flat bed.';
          } else {
            quickNote = 'Let the thick, rich concentrate finish draining.';
            detail = 'Allow the syrupy concentrate to drain completely; serve neat or dilute with hot water as a clean bypass.';
          }
        } else {
          // traditional_flat_three / auto (default)
          if (phase === 'bloom') {
            quickNote = 'Wet the flat bed edge to edge, then let it settle level before building the cup.';
            detail = 'Make sure the Kalita bed is fully saturated edge to edge, then let the slurry settle level before the next pulse.';
          } else if (phase === 'early_middle') {
            quickNote = 'Keep the flat bed level with even pulses from the center.';
            detail = 'Use even pulses that cover the flat bed without flooding one side; keep the slurry level and the agitation controlled.';
          } else if (phase === 'late_middle') {
            quickNote = 'Protect the later middle with flat, even contact across the bed.';
            detail = 'Keep the late middle level and even so the Kalita holds body without stalling the final drawdown.';
          } else {
            quickNote = 'Land the final water evenly to keep drawdown flat and tidy.';
            detail = 'Finish by laying the final water evenly across the flat bed, then let the drawdown complete without a last-second swirl.';
          }
        }
      }
      break;
    case 'melitta':
      if (phase === 'bloom') {
        quickNote = 'Open the trapezoid bed evenly so the first drain starts clean and forgiving.';
        detail = 'Wet the full trapezoid bed evenly and give the paper path a clean start before the middle pours build contact.';
      } else if (phase === 'early_middle') {
        quickNote = 'Keep the middle pours level and measured so the flow stays forgiving.';
        detail = 'Use measured, even pours and keep the bed level; Melitta works best when the middle stays stable rather than dramatic.';
      } else if (phase === 'late_middle') {
        quickNote = 'Carry the later middle with stable, level contact.';
        detail = 'Protect the late middle with even contact and avoid dumping water onto one wall of the brewer.';
      } else {
        quickNote = 'Finish with a tidy, level pour and let the bed drain cleanly.';
        detail = 'Close with a tidy, level finishing pour so the trapezoid bed drains evenly and the cup stays balanced.';
      }
      break;
    case 'april':
      if (context.flatBottomProfile === 'no_bypass') {
        if (phase === 'bloom') {
          quickNote = 'Saturate the full no-bypass bed evenly before extraction builds.';
          detail = 'No-bypass brewers need full-bed wetting because every gram of water extracts through the coffee, not around it.';
        } else if (phase === 'early_middle') {
          quickNote = 'Pour steadily across the bed and avoid bypass-style edge shortcuts.';
          detail = 'Keep the stream centered-to-wide only enough to cover the bed; do not chase the wall or flood one channel.';
        } else if (phase === 'late_middle') {
          quickNote = 'Hold the late phase stable so the full bed drains evenly.';
          detail = 'Keep agitation modest and let the no-bypass bed complete extraction without extra swirl.';
        } else {
          quickNote = 'Let the no-bypass drawdown finish fully before service.';
          detail = 'Wait for a clean finish; if it stalls, move coarser next brew instead of shortening the recipe blindly.';
        }
      } else if (context.flatBottomProfile === 'restricted_flat_bottom') {
        if (phase === 'bloom') {
          quickNote = 'Bloom evenly and protect the restricted outlet from early clogging.';
          detail = 'Keep the bed level and avoid heavy swirl; restricted flat-bottom brewers punish fines migration.';
        } else if (phase === 'early_middle') {
          quickNote = 'Use a calm center pour and keep slurry height controlled.';
          detail = 'Do not flood the brewer; a lower, steadier slurry protects flow and keeps the cup clean.';
        } else if (phase === 'late_middle') {
          quickNote = 'Keep the late pulse small so the outlet stays open.';
          detail = 'A small top-up is safer than broad agitation when the bed is already dense.';
        } else {
          quickNote = 'Finish without swirling and watch for a clean stream-to-drip transition.';
          detail = 'Let drawdown complete; if the finish chokes, adjust grind coarser rather than adding agitation.';
        }
      } else if (phase === 'bloom') {
        quickNote = 'Use a short, even bloom and avoid excess swirl so the flat bed stays fast.';
        detail = 'Start with a short, even bloom and skip extra agitation; fast flat-bottom brewing wants a quick, settled opening.';
      } else if (phase === 'early_middle') {
        quickNote = 'Use short, low-agitation centered pulses and reset quickly.';
        detail = 'Keep the early middle pulse-based and low-agitation; let the bed reset briefly instead of stretching contact.';
      } else if (phase === 'late_middle') {
        quickNote = 'Keep the late pulses quick and even so the cup stays open.';
        detail = 'Use another short, even pulse and keep the kettle resets clean; the brew should feel organized, not saturated and slow.';
      } else {
        quickNote = 'Finish early and clean; avoid stretching the last phase.';
        detail = 'Close the recipe without dragging the last phase out; the finish should stay short, clean, and low-agitation.';
      }
      break;
    case 'chemex':
      {
        const chemexStyle = context.chemexStyle || 'auto';
        if (chemexStyle === 'competition_multi_pulse') {
          if (phase === 'bloom') {
            quickNote = 'Aggressive tight center bloom to wake up acids quickly.';
            detail = 'Pour rapidly in the center; avoid bypass on the thick walls to trigger highly vibrant acid extraction.';
          } else if (phase === 'early_middle') {
            quickNote = 'Deliver second rapid pulse in the center to keep water columns high.';
            detail = 'Increase kettle flow velocity; keep water moving in centered streams to prevent fine clogging.';
          } else if (phase === 'late_middle') {
            quickNote = 'Perform third and fourth rapid center pulses; keep velocity high.';
            detail = 'Maintain high water column height to force clean extraction through thick wood-fiber.';
          } else {
            quickNote = 'Final fast center pulse; let it drain into a level bed.';
            detail = 'Finish the target water quickly and let the drawdown snap clean. The high-velocity stream gives bright cup clarity.';
          }
        } else if (chemexStyle === 'continuous_center_pour') {
          if (phase === 'bloom') {
            quickNote = 'Wet the grounds with a gentle center pour; skip swirling.';
            detail = 'Deliver a slow center pour without agitation to keep the dense wood-fiber filter from choking.';
          } else if (phase === 'early_middle') {
            quickNote = 'Maintain a tiny, continuous centered stream without building height.';
            detail = 'Keep kettle altitude very low and maintain a slow stream (1.5-2.0 ml/sec) directly in the center.';
          } else if (phase === 'late_middle') {
            quickNote = 'Continue the slow center pour with zero agitation.';
            detail = 'Hold the steady center line to minimize water bypass, letting the thick paper slowly extract sweet compounds.';
          } else {
            quickNote = 'Stop pouring and let the heavy water column settle for sweet clarity.';
            detail = 'Cut the flow smoothly; let the quiet column drain naturally to produce a sweet, syrupy, and perfectly clear cup.';
          }
        } else if (chemexStyle === 'iced_chemex') {
          if (phase === 'bloom') {
            quickNote = 'Saturate grounds slowly; server must be preloaded with ice.';
            detail = 'Pour hot water over dry grounds in the center; ensure the elegant Chemex glass is loaded with ice below.';
          } else if (phase === 'early_middle') {
            quickNote = 'Pour hot concentrate in the center; keep water off the thick paper.';
            detail = 'Deliver the second hot pour cleanly, avoiding the high paper walls to keep solubility high while maintaining a flat bed.';
          } else if (phase === 'late_middle') {
            quickNote = 'Final slow center pour; drippings lock aromatics instantly.';
            detail = 'Pour the remaining hot water through the center; the hot concentrate drips directly over ice to lock acids.';
          } else {
            quickNote = 'Let drawdown drain and swirl the carafe to melt remaining ice.';
            detail = 'Let the drawdown finish completely; swirl to blend the concentrate and chilled ice for a crisp, cold finish.';
          }
        } else if (chemexStyle === 'high_dose_heavy_body') {
          if (phase === 'bloom') {
            quickNote = 'Wet the thick bed slowly; let the large dose degas fully.';
            detail = 'Deliver a slow, wide bloom. The massive dose needs time to wet completely through the dense paper.';
          } else if (phase === 'early_middle') {
            quickNote = 'Pour in slow, thick center rings; avoid bypass.';
            detail = 'Maintain a calm water level to wash the deep bed, keeping water away from the spout area to prevent bypass.';
          } else if (phase === 'late_middle') {
            quickNote = 'Final slow center pour to extract rich oils.';
            detail = 'Keep the kettle stream low and heavy; wash the center bed gently without disturbing the filter walls.';
          } else {
            quickNote = 'Allow a slow, heavy drawdown to finish. Yields maximum body.';
            detail = 'Let the dense drawdown finish naturally; do not stir or swirl so the cup retains massive syrupy body.';
          }
        } else {
          // traditional_three_pour / auto
          if (phase === 'bloom') {
            quickNote = 'Rinse hard, preheat the glass, set the three-layer side at the spout, then bloom fully.';
            detail = 'Use a strong rinse to seat the bonded paper, warm the Chemex, keep the three-layer side facing the spout, and leave the vent open before wetting the bed.';
          } else if (phase === 'early_middle') {
            quickNote = 'Use a steady center-to-mid stream and let the thick filter manage flow.';
            detail = 'Build the middle with stable flow; do not chase the paper wall or collapse the vent because that turns Chemex slow and papery.';
          } else if (phase === 'late_middle') {
            quickNote = 'Keep the later middle open, stable, and away from the filter wall.';
            detail = 'Hold a calm slurry height and avoid washing the sides; Chemex should drain longer than V60 but still look open.';
          } else {
            quickNote = 'Finish the target water, keep the vent open, and let the thick filter draw down naturally.';
            detail = 'Let the final drawdown complete without wall rinsing or extra swirl; adjust coarser next brew if it stalls.';
          }
        }
      }
      break;
    case 'hario_switch':
      {
        const immersionCopy = resolveImmersionReleaseCopy(context);
        const programme = String(context.methodProgramme || '');
        const isOpenMode = programme === 'full_percolation_v60_mode';
        const isBrightHybrid = programme === 'percolation_then_immersion' || programme === 'temperature_shift_hybrid';
        const isIcedSwitch = programme === 'iced_hybrid';
        if (phase === 'bloom') {
          quickNote = isOpenMode
            ? 'Valve open from the start; bloom like a clean V60-style brew.'
            : isBrightHybrid
              ? 'Start open and gentle so acidity and florals stay clear.'
              : isIcedSwitch
                ? 'Bloom the hot concentrate over measured ice in the server.'
                : 'Wet the full bed evenly and start the planned closed sweetness phase.';
          detail = immersionCopy.openingDetail;
        } else if (phase === 'early_middle') {
          quickNote = isOpenMode
            ? 'Keep the valve open and build volume with a calm center-to-mid pour.'
            : isBrightHybrid
              ? 'Keep this phase clean and open before the short capture.'
              : isIcedSwitch
                ? 'Add only planned hot water; the ice is already part of the recipe.'
                : 'Use the closed phase to build sweetness without forcing turbulence.';
          detail = immersionCopy.middleDetail;
        } else if (phase === 'late_middle') {
          quickNote = isOpenMode
            ? 'Finish the target with the valve still open; no release checkpoint is needed.'
            : isBrightHybrid
              ? 'Close only briefly for sweetness, then release before body gets heavy.'
              : isIcedSwitch
                ? 'Keep the hot-contact window short so the iced cup stays fresh.'
                : 'Release before the bed feels stalled, then finish open if the plan asks for it.';
          detail = immersionCopy.lateDetail;
        } else {
          quickNote = isOpenMode
            ? 'Let drawdown finish naturally with the valve open.'
            : isIcedSwitch
              ? 'Release over ice and stir the server 5-8 seconds.'
              : 'Open the release cleanly and let the bed drain without stirring the finish.';
          detail = immersionCopy.finishDetail;
        }
      }
      break;
    case 'clever_dripper':
      {
        const immersionCopy = resolveImmersionReleaseCopy(context);
        if (phase === 'bloom') {
          quickNote = 'Saturate the full bed evenly and let immersion start building sweetness.';
          detail = immersionCopy.openingDetail;
        } else if (phase === 'early_middle') {
          quickNote = 'Use the middle phase to build immersion gently rather than chasing more turbulence.';
          detail = immersionCopy.middleDetail;
        } else if (phase === 'late_middle') {
          quickNote = 'Keep the later immersion phase quiet so the release stays clean.';
          detail = immersionCopy.lateDetail;
        } else {
          quickNote = 'Open the release cleanly and let the bed drain without stirring the finish.';
          detail = immersionCopy.finishDetail;
        }
      }
      break;
    case 'french_press':
      if (phase === 'bloom') {
        if (context.recipeStyle === 'clean_decant') {
          quickNote = 'Pour boiling water swiftly to saturate all coffee grounds.';
          detail = 'Pour boiling water swiftly to wet all grounds cleanly and establish a stable heat retention in the glass chamber.';
        } else if (context.recipeStyle === 'double_filter') {
          quickNote = 'Pour water in circular motions to saturate the medium-ground bed.';
          detail = 'Pour water gently in slow circular paths to wet the medium-ground bed, promoting even wetting before the clean steep phase.';
        } else if (context.recipeStyle === 'heavy_concentrate') {
          quickNote = 'Pour water rapidly over the heavy dose to wet the fine grounds.';
          detail = 'Pour hot water rapidly to wet the high-dose bed; maintain maximum thermal mass inside the chamber.';
        } else if (context.recipeStyle === 'sweet_immersion') {
          quickNote = 'Pour water gently to promote a round, sweet extraction.';
          detail = 'Pour water gently at a slightly lower temperature to promote high sweet solubility without dissolving bitter compounds.';
        } else {
          quickNote = 'Saturate all grounds evenly and start a clean immersion bed.';
          detail = 'Add water evenly through the full bed, make sure no dry pockets remain, then leave the slurry quiet.';
        }
      } else if (phase === 'early_middle') {
        if (context.recipeStyle === 'clean_decant') {
          quickNote = 'Allow the crust to form undisturbed for 4 minutes.';
          detail = 'Leave the chamber undisturbed while a thick, aromatic crust of coffee grounds forms at the surface.';
        } else if (context.recipeStyle === 'double_filter') {
          quickNote = 'Steep cleanly while the double filter elements are prepared.';
          detail = 'Allow full immersion to proceed undisturbed; prepare the double mesh or paper filter insert by pre-wetting with hot water.';
        } else if (context.recipeStyle === 'heavy_concentrate') {
          quickNote = 'Stir vigorously 5-6 times to maximize early extraction strength.';
          detail = 'Use strong agitation early to break down the dense slurry, maximizing extraction from the concentrated bed.';
        } else if (context.recipeStyle === 'sweet_immersion') {
          quickNote = 'Stir gently exactly 2 times to distribute extraction evenly.';
          detail = 'Stir exactly twice with a light touch to distribute heat and grounds without introducing bitterness.';
        } else {
          quickNote = 'Let immersion build sweetness without repeated stirring.';
          detail = 'Hold the press undisturbed so fines settle and sweetness develops without making the cup muddy.';
        }
      } else if (phase === 'late_middle') {
        if (context.recipeStyle === 'clean_decant') {
          quickNote = 'Stir the crust gently, skim the surface foam and floating oils.';
          detail = 'Break the crust with 2-3 gentle folds, then skim the remaining light foam and floating oils from the surface to ensure high cup clarity.';
        } else if (context.recipeStyle === 'double_filter') {
          quickNote = 'Give a light swirl to settle the grounds before placing the plunger.';
          detail = 'Give a light, gentle swirl to detach grounds from the glass wall and let them settle to the bottom.';
        } else if (context.recipeStyle === 'heavy_concentrate') {
          quickNote = 'Let the thick immersion concentrate develop body and richness.';
          detail = 'Allow the high-strength immersion slurry to steep, building a syrupy mouthfeel and sweet cocoa structure.';
        } else if (context.recipeStyle === 'sweet_immersion') {
          quickNote = 'Steep quietly to allow sugar compounds to fully dissolve.';
          detail = 'Steep quietly; the lower temperature protects sweet caramel and chocolate solubility.';
        } else {
          quickNote = 'Break the crust gently and keep the bed calm before pressing.';
          detail = 'Use only a gentle break or skim; avoid aggressive stirring late because it lifts fines into the cup.';
        }
      } else {
        if (context.recipeStyle === 'clean_decant') {
          quickNote = 'Fit plunger and lower it just to touch the liquid surface; decant gently.';
          detail = 'Fit the plunger and lower the mesh just to touch the surface (do not plunge!). Pour out extremely slowly to prevent churning the settled bed.';
        } else if (context.recipeStyle === 'double_filter') {
          quickNote = 'Press down slowly over 30 seconds through the double filter; serve cleanly.';
          detail = 'Press the double filter down slowly with uniform, light force over 30 seconds, trapping all fines for an ultra-clean finish.';
        } else if (context.recipeStyle === 'heavy_concentrate') {
          quickNote = 'Press firmly through the coffee mass, then serve as concentrate or dilute if planned.';
          detail = 'Apply firm, stable force through the dense coffee mass; serve as concentrate or dilute only when the recipe planned it.';
        } else if (context.recipeStyle === 'sweet_immersion') {
          quickNote = 'Plunge extremely slowly over 30 seconds to avoid fines churning.';
          detail = 'Plunge with feather-light force to avoid fines migration, and decant immediately to stop the extraction.';
        } else {
          quickNote = 'Press slowly and decant so extraction stops cleanly.';
          detail = 'Press with slow, even pressure, then pour off the coffee rather than leaving it on the grounds.';
        }
      }
      break;
    case 'aeropress':
      if (params.stepId === 'capacity_pre_wet') {
        quickNote = params.fallbackNote;
        detail = 'Due to physical chamber limits for high-volume upright brews, pre-wet and shrink the coffee bed first before adding the remaining water.';
      } else if (params.stepId === 'main_charge') {
        quickNote = 'Charge remaining water to target volume and let immersion start.';
        detail = 'Add the remaining water steadily to reach the target volume for the main immersion phase.';
      } else if (phase === 'bloom') {
        quickNote = context.recipeStyle === 'inverted'
          ? 'Assemble inverted safely, then wet the compact bed quickly and evenly.'
          : 'Wet the compact bed quickly and evenly.';
        detail = context.recipeStyle === 'inverted'
          ? 'Use a stable inverted setup, add water decisively, wet all grounds, and keep the coffee mixture compact before attaching the cap.'
          : 'Add water decisively, wet all grounds, and keep the coffee mixture compact so the short contact window stays controlled.';
      } else if (phase === 'early_middle') {
        if (context.recipeStyle === 'sweet_body') {
          quickNote = 'Use 5x aggressive Cross-Stir (North-South, East-West) to increase extraction.';
          detail = 'Stir vigorously 5 times using back-and-forth cross motions (North-South, East-West) to maximize kinetic energy and build body, then attach the plunger.';
        } else if (context.recipeStyle === 'bright_clean') {
          quickNote = 'Swirl gently 2 times and let the coffee settle; avoid paddle contact to keep clarity high.';
          detail = 'Gently swirl the entire AeroPress in circular motions 2 times. Do not stir with a spoon/paddle to prevent fines from clogging the filter, preserving a high-clarity profile.';
        } else if (context.recipeStyle === 'bypass') {
          quickNote = 'Use 3x intense Cross-Stir to mix the concentrate.';
          detail = 'Stir intensely 3 times in cross directions (North-South, East-West) to build extraction in the small volume, then secure the plunger.';
        } else if (context.recipeStyle === 'inverted') {
          quickNote = 'Stir gently 4 times in a circular motion, then secure the cap.';
          detail = 'Stir 4 times in a calm circular motion to distribute grounds evenly in the inverted chamber before securing the filter cap.';
        } else if (context.manualTechniquePattern === 'aeropress_clean') {
          quickNote = 'Use 3x Cross-Stir to wet all grounds quickly.';
          detail = 'Stir 3 times in cross directions (North-South, East-West) to wet the high dose coffee rapidly.';
        } else {
          quickNote = 'Use 3x gentle Cross-Stir (North-South, East-West) to wet all grounds.';
          detail = 'Stir 3 times gently in back-and-forth cross motions (North-South, East-West) to settle the coffee bed and ensure even extraction.';
        }
      } else if (phase === 'late_middle') {
        quickNote = context.recipeStyle === 'bypass'
          ? 'Prepare the bypass water separately; do not push it through the puck.'
          : 'Set up the press before the cup turns heavy.';
        detail = context.recipeStyle === 'bypass'
          ? 'Keep dilution water ready for after pressing; the extraction phase stays as a concentrate.'
          : 'Attach or prepare the cap and keep the brewer stable so the press starts on time.';
      } else {
        if (context.recipeStyle === 'bright_clean') {
          quickNote = 'Press steadily and stop before the hiss to keep the cup clean.';
          detail = 'Press steadily with light pressure, stopping at the first hiss to keep the finish clean and limit fines carry-over.';
        } else if (context.recipeStyle === 'bypass') {
          quickNote = 'Press concentrate steadily and stop before the hiss.';
          detail = 'Press the concentrate steadily, stopping before the hiss to keep it sweet and clean, then dilute with bypass water in the cup.';
        } else if (context.recipeStyle === 'sweet_body') {
          quickNote = 'Press slowly near the hiss and stop before the cup turns dry.';
          detail = 'Apply steady, slow pressure near the hiss to build body, but stop if the press feels heavy or the cup trends bitter, dry, or gritty with fines.';
        } else if (context.recipeStyle === 'inverted') {
          quickNote = 'Press steadily and stop before the dry hiss.';
          detail = 'Press slowly after the safe flip, stopping before the dry hiss so sweetness stays round without forcing extra fines through the filter.';
        } else {
          quickNote = 'Press steadily and stop before the dry hiss.';
          detail = 'Press with light, constant pressure and stop before the dry hiss to keep the AeroPress cup sweet, clean, and repeatable.';
        }
      }
      break;
    case 'siphon':
      if (context.siphonStyle && context.siphonStyle !== 'auto') {
        quickNote = fallbackNote;
        detail = fallbackNote;
      } else if (phase === 'bloom') {
        quickNote = 'Load water and stabilize the upper chamber before agitation.';
        detail = 'Let the water rise fully, then add coffee and keep the first stir gentle so the vacuum bed stays clean.';
      } else if (phase === 'early_middle') {
        quickNote = 'Hold heat briefly and stir only enough to wet the bed.';
        detail = 'Keep the upper chamber hot for the planned contact window; too much stirring will dull the aromatic finish.';
      } else if (phase === 'late_middle') {
        quickNote = 'Cut heat and let the drawdown begin naturally.';
        detail = 'Remove heat cleanly and let the vacuum pull the coffee down without shaking the brewer.';
      } else {
        quickNote = 'Let drawdown finish cleanly before serving.';
        detail = 'Wait for the lower bowl to clear, then serve promptly while the aromatics are still high.';
      }
      break;
    case 'moka_pot':
      if (context.mokaPotStyle && context.mokaPotStyle !== 'auto') {
        quickNote = fallbackNote;
        detail = fallbackNote;
      } else if (phase === 'bloom') {
        quickNote = 'Fill the base correctly and level the basket with no tamp.';
        detail = 'Keep water below the safety valve and level the grounds loosely; use no tamp because the pot needs a safe pressure path.';
      } else if (phase === 'early_middle') {
        quickNote = 'Use low to medium heat and keep the flow calm.';
        detail = 'Heat gently so the first flow is steady, not sputtering; harsh heat turns the cup bitter fast.';
      } else if (phase === 'late_middle') {
        quickNote = 'Watch the stream and prepare to stop before boiling.';
        detail = 'When the stream lightens or sputters, remove heat immediately rather than pushing the last harsh liquid.';
      } else {
        quickNote = 'Stop the extraction and serve the concentrate promptly.';
        detail = 'Remove from heat, cool the base if needed, and serve or dilute before the brew tastes cooked.';
      }
      break;
    case 'cold_brew':
      if (context.coldBrewStyle && context.coldBrewStyle !== 'auto') {
        quickNote = fallbackNote;
        detail = fallbackNote;
      } else if (phase === 'bloom') {
        quickNote = 'Saturate coarse grounds evenly with cool water.';
        detail = 'Add water in stages and make sure the coarse bed is fully wet before the long steep starts.';
      } else if (phase === 'early_middle') {
        quickNote = 'Steep without heat and avoid over-agitation.';
        detail = 'Leave the vessel covered at the planned temperature; strength comes from time, not stirring.';
      } else if (phase === 'late_middle') {
        quickNote = 'Check strength before filtering so the cup lands clean.';
        detail = 'Taste or smell-check near the end of the window; if it is already heavy, filter sooner rather than stretching bitterness.';
      } else {
        quickNote = 'Filter cleanly and dilute only after extraction is separated.';
        detail = 'Separate the concentrate from the grounds first, then dilute or serve over ice after the extraction is stopped.';
      }
      break;
    case 'batch_brew':
      if (context.batchBrewStyle && context.batchBrewStyle !== 'auto') {
        quickNote = fallbackNote;
        detail = fallbackNote;
      } else if (phase === 'bloom') {
        quickNote = 'Start with a level bed and correct brew basket setup.';
        detail = 'Level the bed, confirm the filter is seated, and start the cycle without overloading the basket.';
      } else if (phase === 'early_middle') {
        quickNote = 'Let the machine build an even spray pattern.';
        detail = 'Do not disturb the basket during the main spray phase; consistency depends on stable flow and bed geometry.';
      } else if (phase === 'late_middle') {
        quickNote = 'Watch for a clean stream-to-drip transition.';
        detail = 'The late cycle should slow cleanly without choking; if it stalls, grind coarser next batch.';
      } else {
        quickNote = 'Let drawdown finish and serve from a mixed batch.';
        detail = 'Wait for the last drip window, then gently mix the batch before service so strength is even.';
      }
      break;
    case 'espresso':
      if (phase === 'bloom') {
        quickNote = 'Prep the puck evenly before starting the shot.';
        detail = 'Distribute, tamp level, and clear the basket rim so the shot starts from a stable puck.';
      } else if (phase === 'early_middle') {
        quickNote = 'Start extraction and watch flow symmetry.';
        detail = 'Engage the pump and watch the first drops; uneven flow means the next shot needs distribution or grind correction.';
      } else if (phase === 'late_middle') {
        quickNote = 'Track yield and color instead of chasing volume blindly.';
        detail = 'Keep eyes on yield and flow; blonding too early usually means the next grind should be finer or dose/prep cleaner.';
      } else {
        quickNote = 'Stop at target yield and record taste for the next shot.';
        detail = 'Stop the shot at the target yield/time window, then adjust grind or ratio from taste rather than extending a bad shot.';
      }
      break;
    default:
      break;
  }

  const focusCue = buildAdaptivePhaseFocusCue(context, phase);
  const doseCue = buildAdaptiveDoseCue(context);
  const practicalCue = buildBaristaStepPracticalCue(context, phase);

  return {
    note: quickNote,
    hybridInstruction: joinInstructionText(detail, practicalCue, focusCue, phase === 'finish' ? doseCue : undefined, fallbackNote),
  };
}

function resolveStepTechniqueMetadata(
  context: AdaptiveShareContext,
  step: Pick<BrewPlanStep, 'kind' | 'pourVolumeMl'>,
  phase: AdaptiveStepPhase,
): StepTechniqueMetadata {
  const kind = step.kind || 'pour';
  if (kind === 'press') {
    return {
      pourPath: 'press',
      agitationLevel: 'controlled',
    };
  }
  if (kind === 'heat') {
    return {
      pourPath: 'heat_control',
      agitationLevel: 'minimal',
    };
  }
  if (kind === 'extract') {
    return {
      flowRateMlPerSec: [1, 2],
      pourPath: context.methodFamily === 'espresso' ? 'machine_flow' : 'press',
      agitationLevel: 'controlled',
    };
  }
  if (!isVolumeTargetStepKind(kind) || step.pourVolumeMl <= 0) {
    return {};
  }

  if (context.methodFamily === 'aeropress') {
    return {
      flowRateMlPerSec: [8, 12],
      pourPath: 'immersion_charge',
      pourHeight: 'low',
      agitationLevel: context.recipeStyle === 'sweet_body' || context.recipeStyle === 'no_bypass' ? 'controlled' : 'low',
    };
  }
  if (context.methodFamily === 'french_press') {
    return {
      flowRateMlPerSec: [8, 12],
      pourPath: 'immersion_charge',
      pourHeight: 'low',
      agitationLevel: context.recipeStyle === 'heavy_concentrate'
        ? 'controlled'
        : context.recipeStyle === 'clean_decant'
          ? 'minimal'
          : 'low',
    };
  }
  if (context.methodFamily === 'cold_brew' || context.methodFamily === 'clever_dripper') {
    return {
      flowRateMlPerSec: [8, 12],
      pourPath: 'immersion_charge',
      pourHeight: 'low',
      agitationLevel: 'minimal',
    };
  }
  if (context.methodFamily === 'moka_pot') {
    return {
      pourPath: 'heat_control',
      agitationLevel: 'minimal',
    };
  }
  if (context.methodFamily === 'batch_brew') {
    return {
      pourPath: 'machine_flow',
      agitationLevel: 'low',
    };
  }
  if (context.methodFamily === 'siphon') {
    return {
      flowRateMlPerSec: [7, 10],
      pourPath: phase === 'bloom' ? 'immersion_charge' : 'center',
      pourHeight: 'low',
      agitationLevel: 'controlled',
    };
  }

  const targetId = String(context.targetProfileId || '').toLowerCase();
  const targetIntent = resolveContextTargetIntent(context);
  let metadata: StepTechniqueMetadata = {
    flowRateMlPerSec: [5, 6],
    pourPath: 'center_to_mid',
    pourHeight: context.pourBehavior?.pourHeight || 'low',
    agitationLevel: context.pourBehavior?.agitation || 'low',
  };

  if (targetIntent === 'acidity' || targetId === 'floral_transparent') {
    metadata = {
      flowRateMlPerSec: [4, 5],
      pourPath: 'center_to_mid',
      pourHeight: 'low',
      agitationLevel: 'minimal',
    };
  } else if (targetIntent === 'sweetness' || targetId === 'fruit_forward' || targetId === 'soft_round') {
    metadata = {
      flowRateMlPerSec: [5, 7],
      pourPath: 'center_to_mid',
      pourHeight: context.pourBehavior?.pourHeight || 'low',
      agitationLevel: 'low',
    };
  } else if (targetIntent === 'body' || targetId === 'dense_comforting') {
    metadata = {
      flowRateMlPerSec: [5, 6],
      pourPath: phase === 'finish' ? 'center_to_mid' : 'center',
      pourHeight: 'low',
      agitationLevel: 'controlled',
    };
  }

  if (
    context.methodFamily === 'kalita_wave'
    || context.methodFamily === 'april'
    || context.methodFamily === 'melitta'
    || context.flatBottomProfile === 'april_low_agitation'
    || context.flatBottomProfile === 'fast_flat_bottom'
    || context.flatBottomProfile === 'restricted_flat_bottom'
    || context.flatBottomProfile === 'no_bypass'
    || context.filterStyle === 'flat'
  ) {
    return {
      ...metadata,
      flowRateMlPerSec: context.flatBottomProfile === 'restricted_flat_bottom' || context.flatBottomProfile === 'no_bypass'
        ? [4, 5]
        : metadata.flowRateMlPerSec,
      pourPath: 'flat_center',
      pourHeight: 'low',
      agitationLevel: metadata.agitationLevel === 'minimal'
        ? 'minimal'
        : context.flatBottomProfile === 'restricted_flat_bottom' || context.flatBottomProfile === 'no_bypass'
          ? 'controlled'
          : 'low',
    };
  }

  if (context.methodFamily === 'chemex') {
    return {
      ...metadata,
      flowRateMlPerSec: targetIntent === 'acidity' ? [4, 5] : [5, 6],
      pourPath: 'center_to_mid',
      pourHeight: 'low',
      agitationLevel: targetIntent === 'body' ? 'controlled' : 'low',
    };
  }

  if (context.methodFamily === 'kono') {
    return {
      ...metadata,
      pourPath: 'center',
      pourHeight: 'low',
    };
  }

  if (context.methodFamily === 'origami' && phase === 'finish') {
    return {
      ...metadata,
      pourPath: 'compact_spiral',
    };
  }

  return metadata;
}

function applyStepTechniqueMetadata(steps: BrewPlanStep[], context: AdaptiveShareContext): BrewPlanStep[] {
  return steps.map((step, index) => {
    const metadata = resolveStepTechniqueMetadata(
      context,
      step,
      resolveAdaptiveStepPhase(index, steps.length),
    );
    return {
      ...step,
      ...metadata,
      flowRateMlPerSec: step.flowRateMlPerSec ?? metadata.flowRateMlPerSec,
      pourPath: step.pourPath ?? metadata.pourPath,
      pourHeight: step.pourHeight ?? metadata.pourHeight,
      agitationLevel: step.agitationLevel ?? metadata.agitationLevel,
    };
  });
}

function isIcedManualPourOverFamily(methodFamily: AiBrewMethodFamily) {
  return ICED_MANUAL_POUR_OVER_FAMILIES.has(methodFamily);
}

function polishIcedManualPourOverSteps(
  steps: BrewPlanStep[],
  context: AdaptiveShareContext,
) {
  if (context.brewMode !== 'iced' || !isIcedManualPourOverFamily(context.methodFamily)) return steps;

  const lastPositivePourIndex = steps.reduce(
    (lastIndex, step, index) => (step.pourVolumeMl > 0 ? index : lastIndex),
    -1,
  );
  const lastStepIndex = steps.length - 1;

  return steps.map((step, index) => {
    let nextStep = step;

    if (
      index === lastStepIndex
      && step.pourVolumeMl <= 0
      && (step.kind === 'serve' || step.kind === 'drawdown' || /\bserve\b/i.test(step.label))
    ) {
      nextStep = {
        ...step,
        label: /\bserve\b/i.test(step.label) ? 'Drawdown' : step.label,
        kind: 'drawdown',
        note:
          'Let drawdown finish over the measured ice; stir the server after the final drips so service stays separate from brewing.',
        hybridInstruction: joinInstructionText(
          'Stop adding water here. Let the bed finish draining over the measured ice, then stir the server 5-8 seconds before serving.',
          step.hybridInstruction,
        ),
      };
    }

    if (index === lastPositivePourIndex && nextStep.pourVolumeMl > 0) {
      return {
        ...nextStep,
        hybridInstruction: joinInstructionText(
          nextStep.hybridInstruction,
          `Target ${nextStep.targetVolumeMl} ml hot water. Land the final hot-water target only; the ice is intentional bypass, not another pour through the bed.`,
        ),
      };
    }

    return nextStep;
  });
}

function inferSwitchValveState(step: DeviceBrewProfile['steps'][number], kind: BrewTemplateStepKind) {
  if (step.valveState) return step.valveState;
  const signature = `${step.id} ${step.label} ${step.note}`.toLowerCase();
  if (kind === 'release' || kind === 'drawdown' || kind === 'serve' || /\b(open|release|drawdown|serve)\b/.test(signature)) {
    return 'open' as const;
  }
  if (/\b(closed|close|steep)\b/.test(signature)) return 'closed' as const;
  return undefined;
}

function inferSwitchChamberState(step: DeviceBrewProfile['steps'][number], kind: BrewTemplateStepKind) {
  if (step.chamberState) return step.chamberState;
  const signature = `${step.id} ${step.label} ${step.note}`.toLowerCase();
  if (kind === 'serve') return 'served' as const;
  if (kind === 'drawdown') return 'drawdown' as const;
  if (kind === 'release' || /\brelease|open\b/.test(signature)) return 'releasing' as const;
  if (/\bbloom\b/.test(signature)) return 'bloom' as const;
  if (/\bfill|charge\b/.test(signature)) return 'filling' as const;
  if (/\bpercolation|open fill\b/.test(signature)) return 'percolation' as const;
  if (kind === 'wait' || /\bsteep|hold|immersion\b/.test(signature)) return 'immersion' as const;
  return undefined;
}

function targetVolumeForChamberLoad(kind: BrewTemplateStepKind, valveState: ReturnType<typeof inferSwitchValveState>, targetVolumeMl: number) {
  if (kind === 'serve') return 0;
  if (valveState === 'open') return 0;
  if (kind === 'drawdown') return targetVolumeMl;
  return targetVolumeMl;
}

function buildSteps(
  profile: DeviceBrewProfile,
  hotWaterMl: number,
  totalTimeSeconds: number,
  adaptiveShareContext: AdaptiveShareContext,
): BrewPlanStep[] {
  if (profile.steps.length === 0) return [];
  const volumeIncrementMl = resolveBaristaVolumeIncrementMl(adaptiveShareContext.methodFamily);
  const timeIncrementSeconds = resolveBaristaTimeIncrementSeconds(adaptiveShareContext.methodFamily);
  if (adaptiveShareContext.methodFamily === 'clever_dripper' && profile.steps.length === 1) {
    const sourceStep = profile.steps[0];
    const immersionCopy = resolveImmersionReleaseCopy(adaptiveShareContext);
    const finalWindowBounds = resolveMethodFamilyFinalWindowBounds(adaptiveShareContext.methodFamily, adaptiveShareContext.brewMode);
    const finalWindow = roundBaristaTimeSeconds(
      clamp(totalTimeSeconds * 0.32, finalWindowBounds.min, finalWindowBounds.max),
      adaptiveShareContext.methodFamily,
    );
    const releaseStart = clampRoundedToIncrement(
      totalTimeSeconds - finalWindow,
      45,
      Math.max(45, totalTimeSeconds - timeIncrementSeconds),
      timeIncrementSeconds,
    );
    const holdStart = clampRoundedToIncrement(
      releaseStart * 0.48,
      25,
      Math.max(25, releaseStart - timeIncrementSeconds),
      timeIncrementSeconds,
    );
    const chargeInstruction = buildMethodFamilyStepInstruction({
      methodFamily: adaptiveShareContext.methodFamily,
      phase: 'bloom',
      context: adaptiveShareContext,
      fallbackNote: 'Charge full hot-water target and start immersion contact.',
    });
    return applyStepTechniqueMetadata([
      {
        id: sourceStep.id === 'charge' ? sourceStep.id : `${sourceStep.id}_charge`,
        label: 'Charge',
        kind: 'pour',
        startSeconds: 0,
        pourVolumeMl: hotWaterMl,
        targetVolumeMl: hotWaterMl,
        note: chargeInstruction.note,
        hybridInstruction: chargeInstruction.hybridInstruction,
      },
      {
        id: `${sourceStep.id}_hold`,
        label: 'Hold',
        kind: 'wait',
        startSeconds: holdStart,
        pourVolumeMl: 0,
        targetVolumeMl: hotWaterMl,
        note: 'Hold immersion contact; do not add more water at this checkpoint.',
        hybridInstruction: joinInstructionText(
          `${immersionCopy.closedCue} and let contact time do the work; no extra pour is needed here.`,
          buildAdaptivePhaseFocusCue(adaptiveShareContext, 'early_middle'),
          'Keep immersion stable before release.',
        ),
      },
      {
        id: `${sourceStep.id}_release`,
        label: 'Release',
        kind: 'release',
        startSeconds: releaseStart,
        pourVolumeMl: 0,
        targetVolumeMl: hotWaterMl,
        note: 'Open the release and let the brew drain cleanly without extra water.',
        hybridInstruction: joinInstructionText(
          `${immersionCopy.setOnServerCue}, ${immersionCopy.releaseCue}, and let the coffee drain on its own without stirring or topping up.`,
          buildAdaptivePhaseFocusCue(adaptiveShareContext, 'finish'),
          sourceStep.note,
        ),
      },
    ], adaptiveShareContext);
  }
  const adaptedStartSeconds = normalizeBaristaStepStartSeconds(
    buildAdaptiveStepStartSeconds(profile, totalTimeSeconds, adaptiveShareContext),
    totalTimeSeconds,
    adaptiveShareContext.methodFamily,
    {
      finalWindowMinSeconds: adaptiveShareContext.brewMode === 'iced' && isIcedManualPourOverFamily(adaptiveShareContext.methodFamily)
        ? resolveMethodFamilyFinalWindowBounds(adaptiveShareContext.methodFamily, adaptiveShareContext.brewMode).min
        : undefined,
    },
  );
  const adaptedShares = buildAdaptiveStepShares(profile, adaptiveShareContext);
  const stepKinds = profile.steps.map((step, index) =>
    inferBrewStepKind(step, adaptiveShareContext, index, profile.steps.length));
  const inferredVolumeIndexes = stepKinds
    .map((kind, index) => (isVolumeTargetStepKind(kind) ? index : -1))
    .filter((index) => index >= 0);
  const pourIndexes = inferredVolumeIndexes.length > 0
    ? inferredVolumeIndexes
    : profile.steps.map((_, index) => index);
  const lastPourIndex = pourIndexes[pourIndexes.length - 1] ?? profile.steps.length - 1;
  const pourShareTotal = pourIndexes.reduce((sum, index) => sum + Math.max(0, adaptedShares[index] ?? profile.steps[index]?.share ?? 0), 0);

  let runningTotal = 0;
  const steps = profile.steps.map((step, index) => {
    const kind = stepKinds[index] || 'pour';
    const isPourStep = isVolumeTargetStepKind(kind) || inferredVolumeIndexes.length === 0;
    const isLastPourStep = index === lastPourIndex;
    const remainingWater = Math.max(0, hotWaterMl - runningTotal);
    const remainingPourCount = pourIndexes.filter((pourIndex) => pourIndex > index).length;
    const minimumReserveMl = remainingPourCount * volumeIncrementMl;
    const rawShare = Math.max(0, adaptedShares[index] ?? step.share);
    const normalizedPourShare = pourShareTotal > 0 ? rawShare / pourShareTotal : 1 / Math.max(1, pourIndexes.length);
    const rawPour = isLastPourStep ? remainingWater : hotWaterMl * normalizedPourShare;
    const isFirstPourStep = index === pourIndexes[0];
    const unconstrainedMaxPourVolumeMl = isLastPourStep
      ? remainingWater
      : Math.max(0, remainingWater - minimumReserveMl);
    const bloomCeilingMl = isFirstPourStep
      ? resolveManualPourBloomCeilingMl(adaptiveShareContext)
      : null;
    const maxPourVolumeMl = bloomCeilingMl !== null && !isLastPourStep
      ? Math.min(unconstrainedMaxPourVolumeMl, bloomCeilingMl)
      : unconstrainedMaxPourVolumeMl;
    const bloomFloorMl = isFirstPourStep
      && supportsAiBrewPourControls(adaptiveShareContext.methodFamily)
      && adaptiveShareContext.manualTechniquePattern !== 'ten_pour_multi'
      ? roundBaristaVolumeMl(
        adaptiveShareContext.doseG * (adaptiveShareContext.pourBehavior?.bloomMultiplier || 2),
        adaptiveShareContext.methodFamily,
      )
      : 0;
    const baseMinPourVolumeMl = !isLastPourStep && rawShare > 0 && maxPourVolumeMl >= volumeIncrementMl
      ? volumeIncrementMl
      : 0;
    const minPourVolumeMl = !isLastPourStep && maxPourVolumeMl >= volumeIncrementMl
      ? Math.min(maxPourVolumeMl, Math.max(baseMinPourVolumeMl, bloomFloorMl))
      : baseMinPourVolumeMl;
    const pourVolumeMl = isPourStep
      ? isLastPourStep
        ? remainingWater
        : clampRoundedToIncrement(rawPour, minPourVolumeMl, maxPourVolumeMl, volumeIncrementMl)
      : 0;
    runningTotal = isLastPourStep
      ? hotWaterMl
      : roundTo(runningTotal + pourVolumeMl, 0);
    const phase = resolveAdaptiveStepPhase(index, profile.steps.length);
    const phaseInstruction = buildMethodFamilyStepInstruction({
      methodFamily: adaptiveShareContext.methodFamily,
      phase,
      context: adaptiveShareContext,
      fallbackNote: step.note,
    });
    let note = phaseInstruction.note;
    let hybridInstruction = phaseInstruction.hybridInstruction;
    if (adaptiveShareContext.methodFamily === 'clever_dripper' && kind === 'wait') {
      const immersionCopy = resolveImmersionReleaseCopy(adaptiveShareContext);
      note = 'Hold immersion contact; do not add more water at this checkpoint.';
      hybridInstruction = joinInstructionText(
        `${immersionCopy.closedCue} and let contact time do the work; no extra pour is needed here.`,
        buildAdaptivePhaseFocusCue(adaptiveShareContext, phase),
        step.note,
      );
    } else if (adaptiveShareContext.methodFamily === 'clever_dripper' && kind === 'release') {
      const immersionCopy = resolveImmersionReleaseCopy(adaptiveShareContext);
      note = 'Open the release and let the brew drain cleanly without extra water.';
      hybridInstruction = joinInstructionText(
        `${immersionCopy.setOnServerCue}, ${immersionCopy.releaseCue}, and let the coffee drain on its own without stirring or topping up.`,
        buildAdaptivePhaseFocusCue(adaptiveShareContext, phase),
        step.note,
      );
    }

    const isHarioSwitch = adaptiveShareContext.methodFamily === 'hario_switch';
    if (isHarioSwitch) {
      note = step.note;
      const immersionCopy = resolveImmersionReleaseCopy(adaptiveShareContext);
      const detail = phase === 'bloom' ? immersionCopy.openingDetail
        : phase === 'early_middle' ? immersionCopy.middleDetail
        : phase === 'late_middle' ? immersionCopy.lateDetail
        : immersionCopy.finishDetail;
      const focusCue = buildAdaptivePhaseFocusCue(adaptiveShareContext, phase);
      const doseCue = buildAdaptiveDoseCue(adaptiveShareContext);
      const practicalCue = buildBaristaStepPracticalCue(adaptiveShareContext, phase);

      hybridInstruction = joinInstructionText(
        step.note,
        detail,
        practicalCue,
        focusCue,
        phase === 'finish' ? doseCue : undefined,
      );
    }
    const valveState = isHarioSwitch ? inferSwitchValveState(step, kind) : undefined;
    const chamberState = isHarioSwitch ? inferSwitchChamberState(step, kind) : undefined;
    const chamberLoadMl = isHarioSwitch
      ? Math.max(0, step.chamberLoadMl ?? (
        typeof step.chamberLoadShare === 'number'
          ? roundTo(hotWaterMl * step.chamberLoadShare, 0)
          : targetVolumeForChamberLoad(kind, valveState, runningTotal)
      ))
      : undefined;

    return {
      id: step.id,
      label: step.label,
      kind,
      share: step.share,
      startSeconds: adaptedStartSeconds[index] ?? step.startSeconds,
      pourVolumeMl,
      targetVolumeMl: runningTotal,
      valveState,
      chamberState,
      chamberLoadMl,
      switchProgramme: isHarioSwitch ? (step.switchProgramme || adaptiveShareContext.methodProgramme as SwitchBrewProgramme | undefined) : undefined,
      flowRateMlPerSec: step.flowRateMlPerSec,
      pourPath: step.pourPath,
      pourHeight: step.pourHeight,
      agitationLevel: step.agitationLevel,
      note,
      hybridInstruction,
    };
  });
  let finalSteps: BrewPlanStep[] = steps;
  if (
    adaptiveShareContext.methodFamily === 'aeropress' &&
    hotWaterMl >= 240 &&
    adaptiveShareContext.recipeStyle !== 'inverted' &&
    adaptiveShareContext.recipeStyle !== 'bypass'
  ) {
    const chargeIndex = steps.findIndex((step) => step.id === 'charge');
    if (chargeIndex !== -1) {
      const volumeIncrement = resolveBaristaVolumeIncrementMl(adaptiveShareContext.methodFamily);
      const preWetVolumeMl = clampRoundedToIncrement(
        adaptiveShareContext.doseG * 2,
        24,
        45,
        volumeIncrement,
      );
      const originalChargeStep = steps[chargeIndex];
      const preWetStepInstruction = buildMethodFamilyStepInstruction({
        methodFamily: 'aeropress',
        phase: 'bloom',
        context: { ...adaptiveShareContext, recipeStyle: 'no_bypass' },
        fallbackNote: `Pre-wet and shrink the coffee bed; due to chamber limits, charge ${preWetVolumeMl} ml for 20s before the main water.`,
        stepId: 'capacity_pre_wet',
      } as any);

      const mainChargeStepInstruction = buildMethodFamilyStepInstruction({
        methodFamily: 'aeropress',
        phase: 'bloom',
        context: adaptiveShareContext,
        fallbackNote: 'Charge remaining water to target volume and let immersion start.',
        stepId: 'main_charge',
      } as any);

      const preWetStep: BrewPlanStep = {
        ...originalChargeStep,
        id: 'pre_wet',
        label: 'Pre-wet',
        pourVolumeMl: preWetVolumeMl,
        targetVolumeMl: preWetVolumeMl,
        startSeconds: 0,
        note: preWetStepInstruction.note,
        hybridInstruction: preWetStepInstruction.hybridInstruction,
      };

      const mainChargeStep: BrewPlanStep = {
        ...originalChargeStep,
        id: 'charge',
        label: 'Main Charge',
        pourVolumeMl: hotWaterMl - preWetVolumeMl,
        targetVolumeMl: hotWaterMl,
        startSeconds: 20,
        note: mainChargeStepInstruction.note,
        hybridInstruction: mainChargeStepInstruction.hybridInstruction,
      };

      const newSteps: BrewPlanStep[] = [];
      for (let i = 0; i < steps.length; i++) {
        if (i === chargeIndex) {
          newSteps.push(preWetStep, mainChargeStep);
        } else {
          const step = steps[i];
          newSteps.push({
            ...step,
            startSeconds: step.startSeconds + 20,
            targetVolumeMl: hotWaterMl,
          });
        }
      }
      finalSteps = newSteps;
    }
  }
  return applyStepTechniqueMetadata(
    polishIcedManualPourOverSteps(finalSteps, adaptiveShareContext),
    adaptiveShareContext,
  );
}

function buildSummary(plan: Pick<
  BrewPlan,
  'brewMode' | 'methodFamily' | 'coffeeName' | 'dripper' | 'targetProfileLabel' | 'recommendedRatio' | 'finalBeverageRatio' | 'hotExtractionRatio' | 'waterTempC' | 'totalTimeSeconds'
>) {
  const hasSeparateExtractionRatio = plan.brewMode === 'iced'
    || (plan.methodFamily === 'aeropress' && Math.abs(plan.hotExtractionRatio - plan.finalBeverageRatio) > 0.05);
  const ratioText = hasSeparateExtractionRatio
    ? `final ratio 1:${formatBaristaRatio(plan.finalBeverageRatio)} with hot concentrate 1:${formatBaristaRatio(plan.hotExtractionRatio)}`
    : `1:${formatBaristaRatio(plan.finalBeverageRatio)}`;
  const tasteTimeSeconds = Math.max(0, Math.round((plan as Partial<BrewPlan>).extractionEndSeconds ?? plan.totalTimeSeconds));
  const timeLabel = plan.methodFamily === 'espresso'
    ? 'shot time'
    : plan.methodFamily === 'cold_brew'
      ? 'cold steep'
      : plan.methodFamily === 'french_press'
        ? 'decant time'
        : plan.methodFamily === 'clever_dripper'
          ? 'release finish'
          : plan.methodFamily === 'aeropress'
            ? 'press finish'
            : plan.methodFamily === 'moka_pot'
              ? 'service stop'
              : POUR_CONTROL_METHOD_FAMILIES.has(plan.methodFamily)
                ? plan.brewMode === 'iced'
                  ? 'hot drawdown finish'
                  : 'drawdown finish'
                : plan.brewMode === 'iced'
                  ? 'hot extraction time'
                  : 'extraction time';
  const modeLabel = plan.methodFamily === 'cold_brew'
    ? 'Cold brew'
    : plan.methodFamily === 'espresso'
      ? 'Espresso'
      : plan.brewMode === 'iced'
        ? 'Japanese-style iced brew'
        : 'Hot brew';
  return `${modeLabel} plan for ${plan.coffeeName || 'your coffee'} on ${plan.dripper.name}, tuned for ${plan.targetProfileLabel.toLowerCase()} at ${ratioText}, ${formatBaristaTemperature(plan.waterTempC)}°C, ${timeLabel} around ${formatTime(tasteTimeSeconds)}.`;
}

function buildCanonicalTimeRationale(params: {
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  totalTimeSeconds: number;
  targetProfileLabel: string;
}) {
  const methodLabel = params.methodFamily.replace(/_/g, ' ');
  const finishLabel = params.methodFamily === 'aeropress'
    ? 'press finish'
    : params.methodFamily === 'french_press'
      ? 'decant window'
      : params.methodFamily === 'hario_switch'
        ? 'release drawdown finish'
        : params.methodFamily === 'espresso'
          ? 'shot stop'
          : params.methodFamily === 'moka_pot'
            ? 'stop-before-sputter service cue'
            : params.methodFamily === 'cold_brew'
              ? 'steep or filtration finish'
              : params.brewMode === 'iced'
                ? 'hot drawdown finish'
                : 'drawdown finish';
  return `${formatTime(params.totalTimeSeconds)} ${finishLabel} keeps contact time aligned with ${methodLabel} workflow and ${params.targetProfileLabel}.`;
}

function buildServiceExecutionNote(params: {
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  hotWaterMl: number;
  iceMl: number;
  totalWaterMl: number;
  finalBeverageRatio: number;
  hotExtractionRatio: number;
  hotSplitPercent: number;
  iceSplitPercent: number;
  waterTempC: number;
}) {
  if (params.brewMode === 'iced' && !['cold_brew', 'espresso', 'moka_pot', 'french_press'].includes(params.methodFamily)) {
    if (params.methodFamily === 'aeropress') {
      return `AeroPress iced is locked: brew ${params.hotWaterMl} ml hot concentrate over ${params.iceMl} g ice (${params.hotSplitPercent}%:${params.iceSplitPercent}%). Total input is ${params.totalWaterMl} ml, not final cup output. Final ratio is 1:${formatBaristaRatio(params.finalBeverageRatio)}; hot concentrate extracts at 1:${formatBaristaRatio(params.hotExtractionRatio)}. Press steadily to hold back ice dilution, then stir the chilled server so service is not confused with another brew step.`;
    }
    return `Japanese-style iced is locked: brew ${params.hotWaterMl} ml hot concentrate over ${params.iceMl} g ice (${params.hotSplitPercent}%:${params.iceSplitPercent}%). Total input is ${params.totalWaterMl} ml, not final cup output. Final ratio is 1:${formatBaristaRatio(params.finalBeverageRatio)}; hot concentrate extracts at 1:${formatBaristaRatio(params.hotExtractionRatio)}. Keep pours compact to hold sweetness and clarity, then stir the chilled server after drawdown so service is not confused with another brew step.`;
  }
  if (params.methodFamily === 'aeropress' && params.hotWaterMl < params.totalWaterMl) {
    const bypassWaterMl = Math.max(0, params.totalWaterMl - params.hotWaterMl);
    return `AeroPress bypass split is locked: brew ${params.hotWaterMl} ml through the chamber, then add ${bypassWaterMl} ml bypass water in the cup after pressing. Final ratio is 1:${formatBaristaRatio(params.finalBeverageRatio)}; concentrate extracts at 1:${formatBaristaRatio(params.hotExtractionRatio)}.`;
  }
  switch (params.methodFamily) {
    case 'cold_brew':
      return `Use ${params.totalWaterMl} ml cool water, saturate the coarse bed fully, then separate the concentrate before dilution or service.`;
    case 'espresso':
      return `Treat ${params.totalWaterMl} ml as the target shot yield, not a filter-brew pour volume; stop by yield, time, and flow together.`;
    case 'moka_pot':
      return `Fill the base below the safety valve, keep heat moderate, and remove from heat before the brew boils or sputters harshly.`;
    case 'batch_brew':
      return `Use ${params.totalWaterMl} ml as the brew cycle water target and let the machine finish drawdown before mixing the batch.`;
    case 'french_press':
    case 'aeropress':
    case 'siphon':
      return `Use the full ${params.totalWaterMl} ml as brew water and keep contact time controlled around ${formatBaristaTemperature(params.waterTempC)}°C without extra late agitation.`;
    default:
      return `Use the full ${params.totalWaterMl} ml as brew water and keep kettle near ${formatBaristaTemperature(params.waterTempC)}°C with calm, center-focused pours.`;
  }
}

const POST_EXTRACTION_ACTIONS = new Set<WorkflowGuideActionType>([
  'serve',
  'mix',
  'decant',
  'filter',
  'dilute',
]);

const EXTRACTION_ACTIONS = new Set<WorkflowGuideActionType>([
  'bloom',
  'pour',
  'charge',
  'stir',
  'swirl',
  'steep',
  'release',
  'drawdown',
  'press',
  'heat',
  'monitor_flow',
  'extract',
  'stop',
  'settle',
  'wait',
]);

function resolveTimeDisplayMode(plan: BrewPlan) {
  if (plan.methodFamily === 'cold_brew') return 'cold_brew' as const;
  if (plan.methodFamily === 'espresso') return 'pressure' as const;
  if (plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper') return 'long_steep' as const;
  return 'extraction' as const;
}

function defaultPostExtractionSeconds(plan: BrewPlan, actionType?: WorkflowGuideActionType) {
  if (plan.methodFamily === 'cold_brew') return actionType === 'filter' ? 300 : 30;
  if (actionType === 'filter') return 30;
  if (actionType === 'decant') return 12;
  if (actionType === 'dilute') return 15;
  if (plan.brewMode === 'iced' || actionType === 'mix') return 8;
  if (actionType === 'serve') return 6;
  return 0;
}

function guideStepMarkerSeconds(step: WorkflowGuideStep, fallbackEndSeconds: number) {
  const end = typeof step.endSeconds === 'number' && Number.isFinite(step.endSeconds)
    ? step.endSeconds
    : undefined;
  if (typeof end === 'number') return Math.max(step.startSeconds, end);
  if (step.actionType === 'serve' || step.actionType === 'mix') return step.startSeconds;
  if (step.actionType === 'decant' || step.actionType === 'filter' || step.actionType === 'dilute') return Math.max(step.startSeconds, fallbackEndSeconds);
  return step.startSeconds;
}

function deriveBrewPlanTimeSemantics(plan: BrewPlan, guideSteps: WorkflowGuideStep[]) {
  const sortedSteps = guideSteps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => a.step.startSeconds - b.step.startSeconds || a.index - b.index)
    .map(({ step }) => step);
  const timeDisplayMode = resolveTimeDisplayMode(plan);
  const firstPostStep = sortedSteps.find((step) => POST_EXTRACTION_ACTIONS.has(step.actionType));
  const serveStartSeconds = firstPostStep?.startSeconds;
  const extractionCandidates = sortedSteps
    .filter((step) => {
      if (firstPostStep && step.startSeconds > firstPostStep.startSeconds) return false;
      if (POST_EXTRACTION_ACTIONS.has(step.actionType)) return false;
      return EXTRACTION_ACTIONS.has(step.actionType) || step.pourVolumeMl > 0;
    })
    .map((step) => guideStepMarkerSeconds(step, plan.totalTimeSeconds));
  let extractionEndSeconds = Math.max(0, ...extractionCandidates, firstPostStep ? firstPostStep.startSeconds : plan.totalTimeSeconds);
  if (firstPostStep && firstPostStep.startSeconds >= 0) {
    extractionEndSeconds = Math.min(extractionEndSeconds, firstPostStep.startSeconds);
  }
  if (timeDisplayMode === 'cold_brew' && firstPostStep?.actionType === 'filter') {
    extractionEndSeconds = firstPostStep.startSeconds;
  }
  extractionEndSeconds = Math.max(0, Math.round(extractionEndSeconds));
  const explicitGuideEndSeconds = Math.max(
    plan.totalTimeSeconds,
    ...sortedSteps.map((step) => guideStepMarkerSeconds(step, plan.totalTimeSeconds)),
  );
  const postExtractionSeconds = firstPostStep
    ? Math.max(0, Math.round(explicitGuideEndSeconds - extractionEndSeconds) || defaultPostExtractionSeconds(plan, firstPostStep.actionType))
    : 0;
  const guideEndSeconds = Math.max(extractionEndSeconds, Math.round(explicitGuideEndSeconds), extractionEndSeconds + postExtractionSeconds);
  const rangePad = timeDisplayMode === 'cold_brew'
    ? 3600
    : timeDisplayMode === 'pressure'
      ? 5
      : plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper'
        ? 20
        : 15;
  const low = Math.max(0, Math.round(extractionEndSeconds - rangePad));
  const high = Math.max(low, Math.round(extractionEndSeconds + (timeDisplayMode === 'cold_brew' ? rangePad : rangePad + 5)));

  return {
    extractionEndSeconds,
    guideEndSeconds,
    serveStartSeconds,
    postExtractionSeconds: Math.max(0, guideEndSeconds - extractionEndSeconds),
    tasteTimeRangeSeconds: [low, high] as [number, number],
    timeDisplayMode,
  };
}

function findFallbackDeviceProfile(catalog: AiBrewCatalog, methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  if (methodFamily === 'cold_brew') {
    const toddyProfile = catalog.deviceProfiles.find((item) => item.id === 'profile_toddy_cold_brew_hot');
    if (toddyProfile) {
      return brewMode === 'iced' ? { ...toddyProfile, exactMatch: false, brewMode: 'iced' as const } : { ...toddyProfile, exactMatch: false };
    }
  }
  return catalog.deviceProfiles.find((item) => !item.exactMatch && item.methodFamily === methodFamily && item.brewMode === brewMode);
}

function promoteFamilyTemplateToDeviceExact(
  fallback: DeviceBrewProfile,
  dripper: EquipmentCatalogEntry,
  brewMode: 'hot' | 'iced',
): DeviceBrewProfile {
  return {
    ...fallback,
    id: `profile_derived_${dripper.id}_${brewMode}`,
    label: `${dripper.name} ${brewMode === 'iced' ? 'Japanese Iced' : 'Hot'} (Template)`,
    dripperIds: [dripper.id],
    exactMatch: true,
    note: `${fallback.note} Derived from ${fallback.label} template for this device.`,
    source: 'derived_device_profile',
    verificationLevel: 'fallback',
    confidence: 'low',
  };
}

type DeviceProfileSelectionOptions = {
  doseG?: number;
  origamiFilterStyle?: OrigamiFilterStyle;
  aeropressStyle?: AeroPressRecipeStyle;
  frenchPressStyle?: FrenchPressRecipeStyle;
  targetProfileId?: string;
};

function profileIdForMode(baseId: string, brewMode: 'hot' | 'iced') {
  return brewMode === 'iced' ? baseId.replace(/_hot$/, '_iced') : baseId;
}

function resolveKalitaWaveProfileId(
  dripper: EquipmentCatalogEntry,
  brewMode: 'hot' | 'iced',
  doseG?: number,
) {
  const haystack = `${dripper.id} ${dripper.name}`.toLowerCase();
  if (!/\bkalita\b/.test(haystack) || !/\bwave\b/.test(haystack)) return undefined;
  const safeDoseG = Number.isFinite(doseG) ? Number(doseG) : 15;
  const baseId = safeDoseG <= 17 ? 'profile_kalita_wave_155_hot' : 'profile_kalita_wave_185_hot';
  return profileIdForMode(baseId, brewMode);
}

function resolveOrigamiProfileId(
  dripper: EquipmentCatalogEntry,
  brewMode: 'hot' | 'iced',
  filterStyle?: OrigamiFilterStyle,
) {
  const haystack = `${dripper.id} ${dripper.name} ${dripper.typeLabel}`.toLowerCase();
  if (!haystack.includes('origami')) return undefined;
  if (filterStyle === 'wave') return profileIdForMode('profile_origami_wave_hot', brewMode);
  if (filterStyle === 'cone') return profileIdForMode('profile_origami_hot', brewMode);
  return undefined;
}

function resolveAeroPressProfileId(
  dripper: EquipmentCatalogEntry,
  brewMode: 'hot' | 'iced',
  options?: DeviceProfileSelectionOptions,
) {
  const haystack = `${dripper.id} ${dripper.name}`.toLowerCase();
  if (!haystack.includes('aeropress')) return undefined;
  const explicitStyle = options?.aeropressStyle && options.aeropressStyle !== 'auto'
    ? options.aeropressStyle
    : undefined;
  const style = explicitStyle || resolveAeroPressAutoStyle(options?.targetProfileId);
  return style === 'standard' ? 'profile_aeropress_hot' : `profile_aeropress_${style}_hot`;
}

function resolveFrenchPressProfileId(
  dripper: EquipmentCatalogEntry,
  brewMode: 'hot' | 'iced',
  options?: DeviceProfileSelectionOptions,
) {
  const haystack = `${dripper.id} ${dripper.name}`.toLowerCase();
  if ((!haystack.includes('french press') && !haystack.includes('press pot')) || brewMode !== 'hot') return undefined;
  const explicitStyle = options?.frenchPressStyle && options.frenchPressStyle !== 'auto'
    ? options.frenchPressStyle
    : undefined;
  const targetProfileId = options?.targetProfileId;
  const style = explicitStyle
    || (targetProfileId === 'more_sweetness' || targetProfileId === 'soft_round'
      ? 'sweet_immersion'
      : targetProfileId === 'more_acidity' || targetProfileId === 'floral_transparent' || targetProfileId === 'fruit_forward'
        ? 'clean_decant'
        : targetProfileId === 'more_body' || targetProfileId === 'dense_comforting'
          ? 'sweet_immersion'
          : 'traditional');
  return style === 'traditional' ? 'profile_french_press_hot' : `profile_french_press_${style}_hot`;
}

export function resolveDeviceProfileSelection(
  catalog: AiBrewCatalog,
  dripper: EquipmentCatalogEntry,
  brewMode: 'hot' | 'iced',
  options: DeviceProfileSelectionOptions = {},
) {
  const profilePreferenceId = resolveKalitaWaveProfileId(dripper, brewMode, options.doseG)
    || resolveOrigamiProfileId(dripper, brewMode, options.origamiFilterStyle)
    || resolveAeroPressProfileId(dripper, brewMode, options)
    || resolveFrenchPressProfileId(dripper, brewMode, options);
  const requestedDefaultId = profilePreferenceId
    || (brewMode === 'iced'
      ? dripper.defaultProfileId?.replace(/_hot$/, '_iced')
      : dripper.defaultProfileId);

  const exact =
    (requestedDefaultId
      ? catalog.deviceProfiles.find((item) => item.id === requestedDefaultId && (item.brewMode === brewMode || (dripper.methodFamily === 'aeropress' && brewMode === 'iced')))
      : undefined)
    || catalog.deviceProfiles.find((item) => item.exactMatch && (item.brewMode === brewMode || (dripper.methodFamily === 'aeropress' && brewMode === 'iced')) && item.dripperIds.includes(dripper.id));

  if (exact) {
    return {
      profile: dripper.methodFamily === 'aeropress' && brewMode === 'iced' ? { ...exact, brewMode: 'iced' as const } : exact,
      mode: 'exact' as const,
      fallbackUsed: false,
    };
  }

  const fallback = findFallbackDeviceProfile(catalog, dripper.methodFamily || 'v60', brewMode);
  if (!fallback) {
    throw new Error(`No device profile available for ${dripper.name}.`);
  }

  if (!FORCE_FAMILY_FALLBACK_DRIPPER_IDS.has(dripper.id)) {
    return {
      profile: promoteFamilyTemplateToDeviceExact(fallback, dripper, brewMode),
      mode: 'derived_template' as const,
      fallbackUsed: false,
    };
  }

  return {
    profile: fallback,
    mode: 'family_fallback' as const,
    fallbackUsed: true,
  };
}

function finalizePlanCore(
  input: AiBrewFormState,
  catalog: AiBrewCatalog,
  dripper: EquipmentCatalogEntry,
  grinder: EquipmentCatalogEntry,
  processEntry: ProcessCatalogEntry | undefined,
  varietyEntry: VarietyCatalogEntry | undefined,
  waterBrand: WaterBrandProfile | undefined,
  deviceSelection: ReturnType<typeof resolveDeviceProfileSelection>,
  grinderSetting: GrinderSettingReference | undefined,
  waterProfile: ReturnType<typeof deriveWaterMineralProfile>,
  customProcessDetection?: CustomProcessDetection | null,
) {
  const targetProfile = findTargetProfile(catalog, input.targetProfileId) || catalog.targetProfiles[0];
  const targetPourBehavior = resolveTargetPourBehavior(targetProfile.id, targetProfile);
  const selectionDoseG = parseDose(input.doseG);
  const preliminaryMethodFamily = deviceSelection.profile.methodFamily || dripper.methodFamily || 'v60';
  const switchSelection = preliminaryMethodFamily === 'hario_switch'
    ? resolveSwitchPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      waterClassification: waterProfile.classification ?? waterBrand?.classification,
      grinderVerification: grinderSetting?.verificationLevel,
      doseG: selectionDoseG,
    })
    : null;
  const kalitaSelection = preliminaryMethodFamily === 'kalita_wave'
    ? resolveKalitaPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const cleverSelection = preliminaryMethodFamily === 'clever_dripper' && isCleverDripperId(dripper.id)
    ? resolveCleverPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const chemexSelection = preliminaryMethodFamily === 'chemex' && isChemexDripperId(dripper.id)
    ? resolveChemexPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const mokaSelection = preliminaryMethodFamily === 'moka_pot' && isMokaPotDripperId(dripper.id)
    ? resolveMokaPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const coldBrewSelection = preliminaryMethodFamily === 'cold_brew' && isColdBrewDripperId(dripper.id)
    ? resolveColdBrewPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const batchBrewSelection = preliminaryMethodFamily === 'batch_brew' && isBatchBrewDripperId(dripper.id)
    ? resolveBatchPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const siphonSelection = preliminaryMethodFamily === 'siphon' && isSiphonDripperId(dripper.id)
    ? resolveSiphonPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const origamiSelection = preliminaryMethodFamily === 'origami' && isOrigamiDripperId(dripper.id)
    ? resolveOrigamiPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const aprilSelection = preliminaryMethodFamily === 'april' && isAprilDripperId(dripper.id)
    ? resolveAprilPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const melittaSelection = preliminaryMethodFamily === 'melitta' && isMelittaDripperId(dripper.id)
    ? resolveMelittaPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  const konoSelection = preliminaryMethodFamily === 'kono' && isKonoDripperId(dripper.id)
    ? resolveKonoPlanSelection({
      input,
      catalog,
      dripper,
      profile: deviceSelection.profile,
      targetProfile,
      processEntry,
      doseG: selectionDoseG,
    })
    : null;
  let effectiveDeviceProfile =
    switchSelection?.adjustedProfile ||
    kalitaSelection?.adjustedProfile ||
    cleverSelection?.adjustedProfile ||
    chemexSelection?.adjustedProfile ||
    mokaSelection?.adjustedProfile ||
    coldBrewSelection?.adjustedProfile ||
    batchBrewSelection?.adjustedProfile ||
    siphonSelection?.adjustedProfile ||
    origamiSelection?.adjustedProfile ||
    aprilSelection?.adjustedProfile ||
    melittaSelection?.adjustedProfile ||
    konoSelection?.adjustedProfile ||
    deviceSelection.profile;
  const methodFamily = effectiveDeviceProfile.methodFamily || dripper.methodFamily || 'v60';
  const doseG = parseDoseForMethod(input.doseG, methodFamily);
  const manualPreset = findManualBrewPreset(catalog, input.manualPresetId || '');
  let methodId = resolveProfileBrewMethodId(effectiveDeviceProfile, methodFamily, input.brewMode);
  const ratioToolMethodId = methodId;
  let method = BREW_METHOD_MAP[methodId];
  let roastAdjustedTargets = buildRoastAdjustedTargets(method, input.roastLevel);

  const processModifiers = mergeProcessModifiers(processEntry);
  const varietyModifiers = mergeVarietyModifiers(varietyEntry);
  const beanProfileAdjustment = deriveBeanProfileAdjustment(input);
  const sensoryBiasAdjustment = deriveSensoryBiasAdjustment({
    targetProfileId: targetProfile.id,
    processEntry,
    varietyEntry,
  });
  const targetAwareProcessAdjustment = resolveTargetAwareProcessAdjustment({
    input,
    targetProfile,
    processEntry,
    varietyEntry,
  });
  const originAdjustment = deriveOriginAdjustment(input, processEntry, varietyEntry, targetProfile.label, targetProfile.id);
  const doseAdjustment = deriveDoseAdjustment(doseG, methodFamily, input.brewMode);
  const serviceDoseTargetAdjustment = deriveServiceDoseTargetAdjustment({
    doseG,
    methodFamily,
    brewMode: input.brewMode,
    targetProfileLabel: targetProfile.label,
    targetProfileId: targetProfile.id,
    processEntry,
    varietyEntry,
    customVarietyText: input.variety === CUSTOM_ENTRY_ID ? input.customVariety : '',
  });
  let methodFamilyAdjustment = deriveMethodFamilyAdjustment({
    methodFamily,
    filterStyle: effectiveDeviceProfile.filterStyle,
    flatBottomProfile: effectiveDeviceProfile.flatBottomProfile,
    recipeStyle: effectiveDeviceProfile.recipeStyle,
    brewMode: input.brewMode,
    targetProfileLabel: targetProfile.label,
    targetProfileId: targetProfile.id,
  });
  const targetFamilyAdjustment = deriveTargetFamilyAdjustment({
    methodFamily,
    brewMode: input.brewMode,
    targetProfileLabel: targetProfile.label,
    targetProfileId: targetProfile.id,
    pourBehavior: targetPourBehavior,
  });
  const methodTargetBehaviorPatch = resolveMethodTargetBehaviorPatch(methodFamily, targetProfile.id, input.brewMode);
  const originTargetMethodAdjustment = deriveOriginTargetMethodAdjustment({
    originProfileId: originAdjustment.profileId,
    methodFamily,
    brewMode: input.brewMode,
    targetProfileLabel: targetProfile.label,
    targetProfileId: targetProfile.id,
  });
  const flavorAlignment = deriveFlavorAlignmentAdjustment({
    targetProfileLabel: targetProfile.label,
    targetProfileId: targetProfile.id,
    roastLevel: input.roastLevel,
    processEntry,
    varietyEntry,
    customVarietyText: input.variety === CUSTOM_ENTRY_ID ? input.customVariety : '',
    waterProfile,
    originAdjustment,
  });
  const baristaTemperatureCalibration = deriveBaristaTemperatureCalibration({
    input,
    methodFamily,
    brewMode: input.brewMode,
    processEntry,
    varietyEntry,
    originAdjustment,
  });
  const v60SweetnessServiceCalibration = deriveV60SweetnessServiceCalibration({
    input,
    methodFamily,
    deviceProfile: effectiveDeviceProfile,
    waterProfile,
    processEntry,
    varietyEntry,
  });
  const hardToExtractHotFilterFloor = resolveHardToExtractHotFilterFloor({
    input,
    methodFamily,
    processEntry,
  });

  let ratioLowerBound = method.ratioRange[0] - 0.75;
  let ratioUpperBound = method.ratioRange[1] + 0.75;
  if (methodFamily === 'french_press') {
    const fpStyle = (effectiveDeviceProfile.recipeStyle || 'traditional') as EffectiveFrenchPressStyle;
    const envelope = resolveFrenchPressProductionEnvelope(fpStyle, doseG);
    ratioLowerBound = envelope.ratio.min;
    ratioUpperBound = envelope.ratio.max;
  }
  if (manualPreset) {
    const presetRatio = resolveManualPresetScalingRatio(manualPreset);
    if (presetRatio < ratioLowerBound) {
      ratioLowerBound = Math.max(1, presetRatio - 0.75);
    }
    if (presetRatio > ratioUpperBound) {
      ratioUpperBound = presetRatio + 0.75;
    }
  }
  const baseRecommendedRatio = roundTo(clamp(
    roastAdjustedTargets.adjustedRatioDefault
      + effectiveDeviceProfile.ratioDelta
      + waterProfile.ratioDelta
      + targetProfile.ratioDelta
      + (processModifiers.ratioDelta || 0)
      + (varietyModifiers.ratioDelta || 0)
      + beanProfileAdjustment.ratioDelta
      + sensoryBiasAdjustment.ratioDelta
      + targetAwareProcessAdjustment.ratioDelta
      + methodFamilyAdjustment.ratioDelta
      + targetFamilyAdjustment.ratioDelta
      + methodTargetBehaviorPatch.ratioDelta
      + originAdjustment.ratioDelta
      + originTargetMethodAdjustment.ratioDelta
      + doseAdjustment.ratioDelta
      + serviceDoseTargetAdjustment.ratioDelta
      + flavorAlignment.ratioDelta
      + (input.brewMode === 'iced' ? -0.65 : 0),
    ratioLowerBound,
    ratioUpperBound,
  ), 2);
  const targetWaterBounds = resolveTargetWaterOverrideBounds(methodFamily, doseG, ratioLowerBound, ratioUpperBound, input.brewMode);
  const manualPresetScaledWaterMl = resolveManualPresetScaledWaterMl(
    manualPreset,
    doseG,
    input.targetWaterMl || '',
    methodFamily,
  );
  const targetWaterOverrideMl = parseOptionalNumber(
    'Target water',
    manualPresetScaledWaterMl !== null ? String(manualPresetScaledWaterMl) : input.targetWaterMl || '',
    targetWaterBounds.min,
    targetWaterBounds.max,
  );
  const targetRatioOverride = targetWaterOverrideMl !== null
    ? null
    : parseOptionalNumber(
      'Target ratio',
      input.targetRatio || '',
      ratioLowerBound,
      ratioUpperBound,
    );
  const precisionOverrideNotes: string[] = [];

  const ratioBeforeIcedStrengthCalibration = targetWaterOverrideMl === null
    && targetRatioOverride === null
    && typeof v60SweetnessServiceCalibration?.recommendedRatio === 'number'
    ? v60SweetnessServiceCalibration.recommendedRatio
    : baseRecommendedRatio;
  const icedStrengthCalibration = deriveIcedStrengthCalibration({
    input,
    methodFamily,
    dripper,
    baseRecommendedRatio: ratioBeforeIcedStrengthCalibration,
    ratioLowerBound,
    ratioUpperBound,
    processEntry,
    v60SweetnessServiceCalibration,
  });
  const calibratedRecommendedRatio = roundTo(clamp(
    ratioBeforeIcedStrengthCalibration + icedStrengthCalibration.ratioDelta,
    ratioLowerBound,
    ratioUpperBound,
  ), 2);
  let totalWaterMl = targetWaterOverrideMl !== null
    ? roundManualPresetWaterMl(targetWaterOverrideMl, methodFamily, manualPreset)
    : roundBaristaVolumeMl(calcWaterFromDoseRatio(doseG, targetRatioOverride ?? calibratedRecommendedRatio), methodFamily);
  let recommendedRatio = targetWaterOverrideMl !== null
    ? roundTo(totalWaterMl / doseG, 2)
    : roundTo(targetRatioOverride ?? calibratedRecommendedRatio, 2);

  let isAutoBypassSwapped = false;
  if (
    methodFamily === 'aeropress' &&
    input.aeropressStyle === 'auto' &&
    ['more_acidity', 'floral_transparent', 'fruit_forward'].includes(targetProfile.id) &&
    totalWaterMl > 240
  ) {
    const bypassProfile = catalog.deviceProfiles.find(
      (item) => item.id === 'profile_aeropress_bypass_hot' && item.brewMode === 'hot'
    );
    if (bypassProfile) {
      effectiveDeviceProfile = bypassProfile;
      isAutoBypassSwapped = true;
      precisionOverrideNotes.push(
        'AeroPress Auto selected bypass concentrate because the bright/clean target would exceed safe upright chamber capacity.'
      );
    }
  }

  if (isAutoBypassSwapped) {
    methodId = resolveProfileBrewMethodId(effectiveDeviceProfile, methodFamily, input.brewMode);
    method = BREW_METHOD_MAP[methodId];
    roastAdjustedTargets = buildRoastAdjustedTargets(method, input.roastLevel);
    methodFamilyAdjustment = deriveMethodFamilyAdjustment({
      methodFamily,
      filterStyle: effectiveDeviceProfile.filterStyle,
      flatBottomProfile: effectiveDeviceProfile.flatBottomProfile,
      recipeStyle: effectiveDeviceProfile.recipeStyle,
      brewMode: input.brewMode,
      targetProfileLabel: targetProfile.label,
      targetProfileId: targetProfile.id,
    });

    let ratioLowerBound = method.ratioRange[0] - 0.75;
    let ratioUpperBound = method.ratioRange[1] + 0.75;
    if (methodFamily === 'french_press') {
      const fpStyle = (effectiveDeviceProfile.recipeStyle || 'traditional') as EffectiveFrenchPressStyle;
      const envelope = resolveFrenchPressProductionEnvelope(fpStyle, doseG);
      ratioLowerBound = envelope.ratio.min;
      ratioUpperBound = envelope.ratio.max;
    }
    if (manualPreset) {
      const presetRatio = resolveManualPresetScalingRatio(manualPreset);
      if (presetRatio < ratioLowerBound) {
        ratioLowerBound = Math.max(1, presetRatio - 0.75);
      }
      if (presetRatio > ratioUpperBound) {
        ratioUpperBound = presetRatio + 0.75;
      }
    }

    const baseRecommendedRatio = roundTo(clamp(
      roastAdjustedTargets.adjustedRatioDefault
        + effectiveDeviceProfile.ratioDelta
        + waterProfile.ratioDelta
        + targetProfile.ratioDelta
        + (processModifiers.ratioDelta || 0)
        + (varietyModifiers.ratioDelta || 0)
        + beanProfileAdjustment.ratioDelta
        + sensoryBiasAdjustment.ratioDelta
        + targetAwareProcessAdjustment.ratioDelta
        + methodFamilyAdjustment.ratioDelta
        + targetFamilyAdjustment.ratioDelta
        + methodTargetBehaviorPatch.ratioDelta
        + originAdjustment.ratioDelta
        + originTargetMethodAdjustment.ratioDelta
        + doseAdjustment.ratioDelta
        + serviceDoseTargetAdjustment.ratioDelta
        + flavorAlignment.ratioDelta
        + (input.brewMode === 'iced' ? -0.65 : 0),
      ratioLowerBound,
      ratioUpperBound,
    ), 2);

    const ratioBeforeIcedStrengthCalibration = targetWaterOverrideMl === null
      && targetRatioOverride === null
      && typeof v60SweetnessServiceCalibration?.recommendedRatio === 'number'
      ? v60SweetnessServiceCalibration.recommendedRatio
      : baseRecommendedRatio;

    const icedStrengthCalibration = deriveIcedStrengthCalibration({
      input,
      methodFamily,
      dripper,
      baseRecommendedRatio: ratioBeforeIcedStrengthCalibration,
      ratioLowerBound,
      ratioUpperBound,
      processEntry,
      v60SweetnessServiceCalibration,
    });

    const calibratedRecommendedRatio = roundTo(clamp(
      ratioBeforeIcedStrengthCalibration + icedStrengthCalibration.ratioDelta,
      ratioLowerBound,
      ratioUpperBound,
    ), 2);

    totalWaterMl = targetWaterOverrideMl !== null
      ? roundManualPresetWaterMl(targetWaterOverrideMl, methodFamily, manualPreset)
      : roundBaristaVolumeMl(calcWaterFromDoseRatio(doseG, targetRatioOverride ?? calibratedRecommendedRatio), methodFamily);

    recommendedRatio = targetWaterOverrideMl !== null
      ? roundTo(totalWaterMl / doseG, 2)
      : roundTo(targetRatioOverride ?? calibratedRecommendedRatio, 2);
  }

  const aeropressProductionStyle = methodFamily === 'aeropress'
    ? resolveEffectiveAeroPressStyle(effectiveDeviceProfile, targetProfile.id)
    : null;
  const aeropressProductionTarget = aeropressProductionStyle
    ? resolveAeroPressProductionTarget(aeropressProductionStyle, targetProfile.id, input.roastLevel, input.brewMode)
    : null;
  if (
    methodFamily === 'aeropress'
    && aeropressProductionTarget
    && !manualPreset
    && targetWaterOverrideMl === null
    && targetRatioOverride === null
    && input.brewMode === 'hot'
  ) {
    recommendedRatio = aeropressProductionTarget.finalRatio;
    totalWaterMl = roundBaristaVolumeMl(calcWaterFromDoseRatio(doseG, recommendedRatio), methodFamily);
    recommendedRatio = roundTo(totalWaterMl / doseG, 2);
  }

  if (targetWaterOverrideMl !== null) {
    precisionOverrideNotes.push(
      manualPresetScaledWaterMl !== null
        ? `Manual preset water scaled for ${roundTo(doseG, 1)} g dose: ${totalWaterMl} ml at 1:${formatBaristaRatio(recommendedRatio)}.`
        : `Precision target water active: ${totalWaterMl} ml; ratio recalculated from ${roundTo(doseG, 1)} g dose to 1:${formatBaristaRatio(recommendedRatio)}.`,
    );
  } else if (targetRatioOverride !== null) {
    precisionOverrideNotes.push(
      `Precision target ratio active: 1:${formatBaristaRatio(recommendedRatio)} with service-rounded water.`,
    );
  }
  const hotWaterShare = input.brewMode === 'iced'
    ? resolveIcedHotWaterShare({
      methodFamily,
      finalRatio: recommendedRatio,
      roastLevel: input.roastLevel,
      targetProfileLabel: targetProfile.label,
      targetProfileId: targetProfile.id,
      processEntry,
      originAdjustment,
      flavorAlignment,
    })
    : 1;
  let hotWaterMl = input.brewMode === 'iced'
    ? roundBaristaVolumeMl(totalWaterMl * hotWaterShare, methodFamily)
    : totalWaterMl;
  if (input.brewMode === 'iced') {
    const hotRatioBounds = ICED_HOT_EXTRACTION_RATIO_BOUNDS[methodFamily] || ICED_HOT_EXTRACTION_RATIO_BOUNDS.v60;
    const minHotWaterMl = Math.ceil(doseG * hotRatioBounds.min);
    const maxHotWaterMl = Math.floor(doseG * hotRatioBounds.max);
    const maxHotWaterWithIceMl = Math.max(1, totalWaterMl - 1);
    const lowerHotWaterMl = Math.min(maxHotWaterWithIceMl, Math.max(1, minHotWaterMl));
    const upperHotWaterMl = Math.min(maxHotWaterWithIceMl, Math.max(lowerHotWaterMl, maxHotWaterMl));
    hotWaterMl = clampRoundedToIncrement(
      hotWaterMl,
      lowerHotWaterMl,
      upperHotWaterMl,
      resolveBaristaVolumeIncrementMl(methodFamily),
    );
    if (
      targetWaterOverrideMl === null
      && targetRatioOverride === null
      && v60SweetnessServiceCalibration?.hotExtractionRatio
    ) {
      hotWaterMl = clampRoundedToIncrement(
        calcWaterFromDoseRatio(doseG, v60SweetnessServiceCalibration.hotExtractionRatio),
        lowerHotWaterMl,
        upperHotWaterMl,
        resolveBaristaVolumeIncrementMl(methodFamily),
      );
    }
  }
  const manualPresetBrewWaterOverrideMl = resolveManualPresetBrewWaterOverrideMl(
    manualPreset,
    doseG,
    totalWaterMl,
    methodFamily,
    input.brewMode,
  );
  if (manualPresetBrewWaterOverrideMl !== null) {
    hotWaterMl = manualPresetBrewWaterOverrideMl;
  }

  if (methodFamily === 'aeropress') {
    const style = aeropressProductionStyle || resolveEffectiveAeroPressStyle(effectiveDeviceProfile, targetProfile.id);
    if (style === 'inverted') {
      if (totalWaterMl > 220) {
        totalWaterMl = 220;
        if (input.brewMode === 'iced') {
          const minHot = Math.ceil(doseG * (ICED_HOT_EXTRACTION_RATIO_BOUNDS[methodFamily]?.min || 8.8));
          hotWaterMl = clampRoundedToIncrement(totalWaterMl * hotWaterShare, Math.max(1, minHot), 220, resolveBaristaVolumeIncrementMl(methodFamily));
        } else {
          hotWaterMl = 220;
        }
        recommendedRatio = roundTo(totalWaterMl / doseG, 2);
        precisionOverrideNotes.push(
          `AeroPress Inverted capacity limit active: chamber recipe water capped at 220 ml for safety.`
        );
      }
    } else if (style === 'bypass') {
      if (manualPresetBrewWaterOverrideMl === null) {
        const concentrateRatio = aeropressProductionTarget?.concentrateRatio || 9;
        let chamberTarget = roundBaristaVolumeMl(doseG * concentrateRatio, methodFamily);
        if (chamberTarget > 240) {
          chamberTarget = 240;
        }
        if (chamberTarget >= totalWaterMl) {
          chamberTarget = roundBaristaVolumeMl(totalWaterMl * 0.7, methodFamily);
        }
        hotWaterMl = chamberTarget;
      } else {
        if (hotWaterMl > 240) {
          hotWaterMl = 240;
        }
      }
    } else {
      if (totalWaterMl > 240) {
        totalWaterMl = 240;
        if (input.brewMode === 'iced') {
          const minHot = Math.ceil(doseG * (ICED_HOT_EXTRACTION_RATIO_BOUNDS[methodFamily]?.min || 8.8));
          hotWaterMl = clampRoundedToIncrement(totalWaterMl * hotWaterShare, Math.max(1, minHot), 240, resolveBaristaVolumeIncrementMl(methodFamily));
        } else {
          hotWaterMl = 240;
        }
        recommendedRatio = roundTo(totalWaterMl / doseG, 2);
        precisionOverrideNotes.push(
          `AeroPress chamber capacity limit active: recipe water capped at 240 ml to prevent overflow.`
        );
      }
    }
  }

  if (methodFamily === 'french_press') {
    const fpStyle = effectiveDeviceProfile.recipeStyle || 'traditional';
    if (
      fpStyle === 'heavy_concentrate'
      && targetWaterOverrideMl === null
      && targetRatioOverride === null
      && doseG >= 45
    ) {
      const heavyDoseRatio = doseG >= 60 ? 8 : 10;
      if ((doseG >= 60 && recommendedRatio > heavyDoseRatio) || (doseG < 60 && recommendedRatio < heavyDoseRatio)) {
        recommendedRatio = heavyDoseRatio;
        totalWaterMl = roundBaristaVolumeMl(calcWaterFromDoseRatio(doseG, recommendedRatio), methodFamily);
        hotWaterMl = totalWaterMl;
        precisionOverrideNotes.push(
          doseG >= 60
            ? 'French Press maximum practical dose guard active: heavy concentrate is capped near 1:8 to protect vessel headroom; split the brew or use a larger press if more volume is needed.'
            : 'French Press heavy concentrate dose guard active: 45-59 g service loads stay near 1:10 so strength is high without making the press dangerously full.'
        );
      }
    }

    if (doseG <= 10) {
      precisionOverrideNotes.push(
        'French Press small batch/minimum dose guard active: preheat hard, keep the charge compact, and decant promptly because tiny batches lose heat fast.'
      );
    } else if (doseG <= 16) {
      precisionOverrideNotes.push(
        'French Press 250 ml small batch guard active: this dose sits in the small-press range, so use a warm vessel and avoid late stirring.'
      );
    } else if (doseG >= 25 && doseG <= 35) {
      precisionOverrideNotes.push(
        'French Press 500 ml medium batch guard active: keep enough headroom for the crust, then settle and decant rather than forcing the plunger.'
      );
    }

    if (doseG >= 35) {
      precisionOverrideNotes.push(
        'French Press heavy dose headroom guard active: leave room for crust expansion, use controlled agitation, and decant in one steady pour.'
      );
    }
    if (doseG >= 60) {
      precisionOverrideNotes.push(
        'French Press maximum practical dose warning: 60-80 g loads are service-size batches and need a large press, strong preheat, and conservative headroom.'
      );
    }

    if (input.roastLevel === 'light' || input.roastLevel === 'medium_light') {
      precisionOverrideNotes.push(
        'French Press roast guard: light and light-medium roasts need hotter preheated immersion, slightly longer contact, and controlled agitation before settling.'
      );
    } else if (input.roastLevel === 'medium_dark' || input.roastLevel === 'dark') {
      precisionOverrideNotes.push(
        'French Press roast guard: medium-dark and dark roasts need lower temperature, gentler agitation, and earlier clean decant to avoid dry bitterness.'
      );
    } else {
      precisionOverrideNotes.push(
        'French Press roast guard: medium roast stays near the baseline; adjust from taste before changing more than one variable.'
      );
    }

    const originCue = `${input.coffeeName || ''} ${originAdjustment.matchedOrigins.join(' ')}`.toLowerCase();
    if (originCue.includes('ethiopia')) {
      precisionOverrideNotes.push('French Press origin cue: Ethiopia usually benefits from clean decant, floral clarity, steady heat, and restrained agitation.');
    } else if (originCue.includes('kenya')) {
      precisionOverrideNotes.push('French Press origin cue: Kenya acidity stays brighter with clean decant, careful settling, and no hard late press.');
    } else if (originCue.includes('brazil')) {
      precisionOverrideNotes.push('French Press origin cue: Brazil nut and chocolate profiles suit sweet immersion or body-forward service without rough agitation.');
    } else if (originCue.includes('sumatra')) {
      precisionOverrideNotes.push('French Press origin cue: Sumatra earthy body fits heavy concentrate or rich immersion, with early decant to keep the finish clean.');
    } else if (originCue.includes('java')) {
      precisionOverrideNotes.push('French Press origin cue: Java balanced spice works well with sweet immersion and a calm steep before clean decant.');
    } else if (originCue.includes('flores')) {
      precisionOverrideNotes.push('French Press origin cue: Flores spice and sweetness fit sweet immersion, moderate heat, and a slow decant after settling.');
    }

    precisionOverrideNotes.push(
      'French Press science: full immersion moves toward equilibrium; TDS/EY respond to grind surface area, temperature, contact time, and agitation, then decanting stops contact.'
    );
    precisionOverrideNotes.push(
      'French Press filtration guard: metal mesh carries more coffee oils and sediment than paper; double filter lowers lipid carryover without promising medical outcomes.'
    );
  }
  const manualPresetBypassWaterMl = input.brewMode === 'hot'
    ? roundTo(Math.max(0, totalWaterMl - hotWaterMl), 0)
    : 0;
  const iceMl = input.brewMode === 'iced'
    ? roundTo(totalWaterMl - hotWaterMl, 0)
    : 0;
  const finalBeverageRatio = roundTo(totalWaterMl / doseG, 2);
  if (targetWaterOverrideMl !== null || methodFamily === 'batch_brew' || methodFamily === 'aeropress' || methodFamily === 'french_press' || methodFamily === 'cold_brew') {
    recommendedRatio = finalBeverageRatio;
  }
  const hotExtractionRatio = roundTo(hotWaterMl / doseG, 2);
  if (manualPresetBypassWaterMl > 0) {
    precisionOverrideNotes.push(
      `Bypass split: brew ${hotWaterMl} ml through the chamber, then add ${manualPresetBypassWaterMl} ml bypass water in the cup after pressing. Final ratio 1:${formatBaristaRatio(finalBeverageRatio)}, concentrate ratio 1:${formatBaristaRatio(hotExtractionRatio)}.`,
    );
    if (aeropressProductionTarget?.targetNote) {
      precisionOverrideNotes.push(aeropressProductionTarget.targetNote);
    }
    precisionOverrideNotes.push(
      'Koreksi: if thin, reduce bypass 10-15 ml, extend steep 5-10 seconds, or grind slightly finer; if bitter or dry, grind coarser, lower temperature 1-2C, reduce stirring, and stop pressing earlier.',
    );
    precisionOverrideNotes.push(
      'Koreksi: if flat, reduce bypass or use lower-buffer water; if muddy or heavy, reduce stirring, press gentler, stop before the hiss, and grind slightly coarser.',
    );
  }

  const methodTempBounds = (methodFamily === 'cold_brew' || input.manualPresetId === 'inspired-aeropress-cold-brew-express')
    ? { min: 4, max: 25 }
    : { min: 78, max: 98 };
  const targetTempOverrideC = parseOptionalNumber(
    'Target temperature',
    input.targetTempC || '',
    methodTempBounds.min,
    methodTempBounds.max,
  );
  const baseWaterTempC = midpoint(roastAdjustedTargets.adjustedTempRangeC, 1)
    + effectiveDeviceProfile.tempDeltaC
    + waterProfile.tempDeltaC
    + targetProfile.tempDeltaC
    + (processModifiers.tempDeltaC || 0)
    + (varietyModifiers.tempDeltaC || 0)
    + beanProfileAdjustment.tempDeltaC
    + sensoryBiasAdjustment.tempDeltaC
    + targetAwareProcessAdjustment.tempDeltaC
    + methodFamilyAdjustment.tempDeltaC
    + targetFamilyAdjustment.tempDeltaC
    + methodTargetBehaviorPatch.tempDeltaC
    + originAdjustment.tempDeltaC
    + originTargetMethodAdjustment.tempDeltaC
    + doseAdjustment.tempDeltaC
    + serviceDoseTargetAdjustment.tempDeltaC
    + flavorAlignment.tempDeltaC
    + baristaTemperatureCalibration.tempDeltaC;
  const calibratedTempMin = Math.max(
    methodTempBounds.min,
    v60SweetnessServiceCalibration?.minTempC ?? baristaTemperatureCalibration.minTempC ?? methodTempBounds.min,
    targetAwareProcessAdjustment.minTempC ?? methodTempBounds.min,
    hardToExtractHotFilterFloor?.minTempC ?? methodTempBounds.min,
  );
  const calibratedTempMax = Math.min(
    methodTempBounds.max,
    v60SweetnessServiceCalibration?.maxTempC ?? baristaTemperatureCalibration.maxTempC ?? methodTempBounds.max,
    targetAwareProcessAdjustment.maxTempC ?? methodTempBounds.max,
    waterProfile.tempMaxC ?? methodTempBounds.max,
  );
  let waterTempC = roundTo(targetTempOverrideC ?? clamp(
    typeof v60SweetnessServiceCalibration?.tempC === 'number'
      ? v60SweetnessServiceCalibration.tempC
      : baseWaterTempC,
    Math.min(calibratedTempMin, calibratedTempMax),
    Math.max(calibratedTempMin, calibratedTempMax),
  ), 1);
  if (
    methodFamily === 'aeropress'
    && aeropressProductionTarget
    && !manualPreset
    && targetTempOverrideC === null
    && input.brewMode === 'hot'
  ) {
    const [styleMinTempC, styleMaxTempC] = aeropressProductionTarget.tempRangeC;
    waterTempC = roundTo(clamp(waterTempC, styleMinTempC, styleMaxTempC), 1);
  }
  if (targetTempOverrideC !== null) {
    precisionOverrideNotes.push(
      `Precision target temperature active: ${formatBaristaTemperature(waterTempC)}°C.`,
    );
  }

  const methodTimeBounds = methodFamily === 'cold_brew'
    ? { min: 21600, max: 64800 }
    : methodFamily === 'espresso'
      ? { min: 20, max: 45 }
      : methodFamily === 'french_press'
        ? { min: 240, max: 540 }
        : { min: 75, max: 420 };
  const calibratedServiceTimeBounds = v60SweetnessServiceCalibration
    ? {
      min: Math.max(methodTimeBounds.min, v60SweetnessServiceCalibration.timeMinSec),
      max: Math.min(methodTimeBounds.max, v60SweetnessServiceCalibration.timeMaxSec),
    }
    : methodTimeBounds;
  const serviceTimeBounds = resolveServiceTimeBounds({
    methodFamily,
    brewMode: input.brewMode,
    doseG,
    targetProfileId: targetProfile.id,
    base: calibratedServiceTimeBounds,
  });
  const controlledDeviceProfile = applyPourControlsToProfile(effectiveDeviceProfile, input, methodFamily, manualPreset);
  const pourControlNote = buildPourControlNote(input, methodFamily);
  const manualPresetTimeDeltaSeconds = resolveManualPresetTimeAdjustmentSeconds(manualPreset);
  const baseTotalTimeSeconds = roundBaristaTimeSeconds(clamp(
    midpoint(roastAdjustedTargets.adjustedBrewTimeRangeSec, 0)
      + effectiveDeviceProfile.brewTimeDeltaSec
      + waterProfile.brewTimeDeltaSec
      + targetProfile.brewTimeDeltaSec
      + (processModifiers.brewTimeDeltaSec || 0)
      + (varietyModifiers.brewTimeDeltaSec || 0)
      + beanProfileAdjustment.brewTimeDeltaSec
      + sensoryBiasAdjustment.brewTimeDeltaSec
      + targetAwareProcessAdjustment.brewTimeDeltaSec
      + methodFamilyAdjustment.brewTimeDeltaSec
      + targetFamilyAdjustment.brewTimeDeltaSec
      + methodTargetBehaviorPatch.brewTimeDeltaSec
      + originAdjustment.brewTimeDeltaSec
      + originTargetMethodAdjustment.brewTimeDeltaSec
      + doseAdjustment.brewTimeDeltaSec
      + serviceDoseTargetAdjustment.brewTimeDeltaSec
      + flavorAlignment.brewTimeDeltaSec
      + manualPresetTimeDeltaSeconds
      + (input.brewMode === 'iced' ? -5 : 0),
    serviceTimeBounds.min,
    serviceTimeBounds.max,
  ), methodFamily);
  const minimumServiceTimeSeconds = resolveMinimumIcedManualPourOverTimeSeconds(controlledDeviceProfile, methodFamily, input.brewMode);
  const minimumMethodServiceTimeSeconds = resolveMinimumMethodServiceTimeSeconds(methodFamily, input.brewMode);
  const minimumManualPresetTimeSeconds = resolveManualPresetMinimumTimeSeconds(manualPreset, methodFamily, input.brewMode);
  let totalTimeSeconds = roundBaristaTimeSeconds(
    clamp(
      Math.max(
        baseTotalTimeSeconds,
        minimumServiceTimeSeconds,
        minimumMethodServiceTimeSeconds,
        minimumManualPresetTimeSeconds,
        hardToExtractHotFilterFloor?.minTimeSeconds || 0,
      ),
      serviceTimeBounds.min,
      serviceTimeBounds.max,
    ),
    methodFamily,
  );
  if (
    methodFamily === 'aeropress'
    && aeropressProductionTarget
    && !manualPreset
    && input.brewMode === 'hot'
  ) {
    totalTimeSeconds = roundBaristaTimeSeconds(
      clamp(
        totalTimeSeconds,
        aeropressProductionTarget.finishRangeSeconds[0],
        aeropressProductionTarget.finishRangeSeconds[1],
      ),
      methodFamily,
    );
  }
  if (
    methodFamily === 'french_press'
    && input.brewMode === 'hot'
    && !manualPreset
  ) {
    const fpStyle = (effectiveDeviceProfile.recipeStyle || 'traditional') as EffectiveFrenchPressStyle;
    const envelope = resolveFrenchPressProductionEnvelope(fpStyle, doseG);
    totalTimeSeconds = roundBaristaTimeSeconds(
      clamp(
        totalTimeSeconds,
        envelope.finishSeconds.min,
        envelope.finishSeconds.max,
      ),
      methodFamily,
    );
  }
  const hotSplitPercent = roundTo(totalWaterMl > 0 ? (hotWaterMl / totalWaterMl) * 100 : 100, 0);
  const iceSplitPercent = roundTo(totalWaterMl > 0 ? (iceMl / totalWaterMl) * 100 : 0, 0);
  const hotWaterSharePercent = hotSplitPercent;
  const iceSharePercent = iceSplitPercent;

  const grindBias = combineBias(
    roastAdjustedTargets.suggestedGrindBias,
    targetProfile.grindBias,
    effectiveDeviceProfile.grindBias,
    processModifiers.grindBias || 'same',
    varietyModifiers.grindBias || 'same',
    beanProfileAdjustment.grindBias,
    sensoryBiasAdjustment.grindBias,
    targetAwareProcessAdjustment.grindBias,
    methodFamilyAdjustment.grindBias,
    targetFamilyAdjustment.grindBias,
    methodTargetBehaviorPatch.grindBias,
    originAdjustment.grindBias,
    originTargetMethodAdjustment.grindBias,
    doseAdjustment.grindBias,
    serviceDoseTargetAdjustment.grindBias,
    flavorAlignment.grindBias,
  );
  const grindDetails = buildGrindRecommendation(grinder, grinderSetting, grindBias, input.roastLevel, input.brewMode);
  const steps = buildSteps(controlledDeviceProfile, hotWaterMl, totalTimeSeconds, {
    targetProfileId: targetProfile.id,
    targetProfileLabel: targetProfile.label,
    pourBehavior: targetPourBehavior,
    methodFamily,
    dripperId: dripper.id,
    dripperName: dripper.name,
    filterStyle: controlledDeviceProfile.filterStyle,
    flatBottomProfile: controlledDeviceProfile.flatBottomProfile,
    recipeStyle: controlledDeviceProfile.recipeStyle,
    physicalConstraints: controlledDeviceProfile.physicalConstraints,
    methodProgramme: controlledDeviceProfile.methodProgramme,
    manualTechniquePattern: manualPreset?.techniquePattern,
    kalitaWaveStyle: kalitaSelection?.style || undefined,
    cleverDripperStyle: cleverSelection?.style || undefined,
    chemexStyle: chemexSelection?.style || undefined,
    mokaPotStyle: mokaSelection?.style || undefined,
    coldBrewStyle: coldBrewSelection?.style || undefined,
    batchBrewStyle: batchBrewSelection?.style || undefined,
    siphonStyle: siphonSelection?.style || undefined,
    origamiStyle: origamiSelection?.style || undefined,
    aprilStyle: aprilSelection?.style || undefined,
    melittaStyle: melittaSelection?.style || undefined,
    konoStyle: konoSelection?.style || undefined,
    brewMode: input.brewMode,
    roastLevel: input.roastLevel,
    roastDevelopment: input.roastDevelopment || undefined,
    solubility: input.solubility || undefined,
    hardnessPpm: waterProfile.minerals.hardnessPpm,
    alkalinityPpm: waterProfile.minerals.alkalinityPpm,
    processId: processEntry?.id,
    varietyId: varietyEntry?.id,
    highAromaNatural: hasHighAromaNaturalCue(input, processEntry, varietyEntry),
    doseG,
    doseScale: doseAdjustment.normalizedOffset,
    flavorDirection: flavorAlignment.dominantAxis,
    flavorIntensity: flavorAlignment.intensity,
    targetFamilyFinalWindowDeltaSec: targetFamilyAdjustment.finalWindowDeltaSec,
    targetFamilyDirectionalShift: targetFamilyAdjustment.directionalShift,
    targetFamilyMiddleShift: targetFamilyAdjustment.middleShift,
    targetFamilyFirstShareDelta: targetFamilyAdjustment.firstShareDelta,
    targetFamilyMiddleShareDelta: targetFamilyAdjustment.middleShareDelta,
    targetFamilyLastShareDelta: targetFamilyAdjustment.lastShareDelta,
    originTargetMethodFinalWindowDeltaSec: originTargetMethodAdjustment.finalWindowDeltaSec,
    originTargetMethodDirectionalShift: originTargetMethodAdjustment.directionalShift,
    originTargetMethodMiddleShift: originTargetMethodAdjustment.middleShift,
    originTargetMethodFirstShareDelta: originTargetMethodAdjustment.firstShareDelta,
    originTargetMethodMiddleShareDelta: originTargetMethodAdjustment.middleShareDelta,
    originTargetMethodLastShareDelta: originTargetMethodAdjustment.lastShareDelta,
  });
  if (methodFamily === 'aeropress' && hotWaterMl >= 240 && controlledDeviceProfile.recipeStyle !== 'inverted' && controlledDeviceProfile.recipeStyle !== 'bypass') {
    totalTimeSeconds += 20;
  }
  const switchStepValidation = switchSelection
    ? validateSwitchStepSafety({
      steps,
      doseRow: switchSelection.doseRow,
      presetId: switchSelection.preset.id,
      hotWaterMl,
      constraints: controlledDeviceProfile.physicalConstraints,
      suggestedPresetId: switchSelection.tasteProgramme.suggestedPresetId,
    })
    : undefined;

  const brewOutputs = buildBrewOutputs({
    method,
    doseG,
    waterMl: hotWaterMl,
    ratio: hotExtractionRatio,
  });
  const estimatedBrewOutputMl = input.brewMode === 'iced'
    ? roundEstimatedCupOutputMl(estimateCupOutputMl(hotWaterMl, doseG, input.brewMode), methodFamily)
    : roundEstimatedCupOutputMl(brewOutputs.beverageOutputMl, methodFamily);
  const estimatedCupOutputMl = roundEstimatedCupOutputMl(
    estimateCupOutputMl(totalWaterMl, doseG, input.brewMode),
    methodFamily,
  );

  const processLabel = resolveCatalogLabel(processEntry, input.process, input.customProcess, 'Not specified');
  const varietyLabel = resolveCatalogLabel(varietyEntry, input.variety, input.customVariety, 'Not specified');
  const coffeeName = input.coffeeName.trim() || 'Unknown Origin';
  const operatorKnowledgeNotes = resolveAiBrewKnowledgeNotes({
    coffeeName,
    dripperName: dripper.name,
    methodFamily,
    process: processLabel,
    variety: varietyLabel,
  });
  const processRisk = resolveProcessRiskFallback(processEntry);
  const targetProfileSuggestion = resolveDefaultTargetProfileForBean(input, catalog);
  const targetProfileAutoSuggested = targetProfileSuggestion.id === targetProfile.id;

  const baseGuardrails = validateBrewInputs({
    method,
    doseG,
    waterMl: totalWaterMl,
    ratio: recommendedRatio,
  }, {
    roastLevel: input.roastLevel,
  });
  const baseConformance = evaluateConformance({
    method,
    doseG,
    waterMl: totalWaterMl,
    ratio: recommendedRatio,
  }, {
    roastLevel: input.roastLevel,
  });
  const filteredBaseGuardrailWarnings = filterContextualConformanceWarnings(baseGuardrails.warnings, {
    methodFamily,
    roastLevel: input.roastLevel,
    waterTempC,
  });
  const filteredBaseConformanceWarnings = filterContextualConformanceWarnings(baseConformance.warnings, {
    methodFamily,
    roastLevel: input.roastLevel,
    waterTempC,
  });
  const filteredBaseConformanceMisses = filterContextualConformanceWarnings(baseConformance.standardsMisses, {
    methodFamily,
    roastLevel: input.roastLevel,
    waterTempC,
  });

  const grindSettingMode: GrindSettingMode = grinderSetting?.id.startsWith('derived_') ? 'derived_baseline' : 'catalog_reference';
  const grindCalibrationRequired = Boolean(grinderSetting?.calibrationRequired);
  const temperatureWarnings = waterTempC >= 97 && methodFamily !== 'moka_pot' && methodFamily !== 'espresso'
    ? ['Suhu 97C+ adalah mode ekstraksi tinggi. Aman untuk kopi padat/light roast atau konsentrat es, tetapi turunkan 1-2C jika roast medium-dark/dark, air low-buffer, atau rasa mulai pahit/seret.']
    : [];
  const processCueForAeroPress = `${processEntry?.id || ''} ${processLabel} ${input.customProcess || ''}`.toLowerCase();
  const aeropressWaterBeanWarnings = methodFamily === 'aeropress'
    ? normalizeNoteList(
      waterProfile.classification === 'moderate_upper_buffered'
        || waterProfile.classification === 'high_buffer'
        || waterProfile.minerals.alkalinityPpm >= 55
        ? [targetProfile.id === 'floral_transparent' ? 'AeroPress water cue: high-buffer water will heavily mute delicate floral notes; consider a softer water or use a tighter ratio to punch through.' : 'AeroPress water cue: upper-buffered alkalinity can soften acidity and floral clarity; keep agitation controlled and avoid pushing temperature higher than needed.']
        : [],
      (waterProfile.classification === 'soft_low_buffer' || waterProfile.minerals.tdsPpm <= 40) && input.brewMode === 'iced' && aeropressProductionStyle === 'bypass'
        ? ['AeroPress water cue: very soft/low-mineral water combined with iced bypass can lead to a thin cup. You may need to tighten the ratio or grind slightly finer.']
        : [],
      /natural|anaerobic|ferment|carbonic|mosto|thermal|coferment/.test(processCueForAeroPress)
        ? ['AeroPress process cue: natural or ferment-leaning beans can show winey/ferment notes if agitation and contact run too high; adjust one variable after tasting.']
        : [],
      /washed|fully washed|double washed/.test(processCueForAeroPress)
        ? ['AeroPress washed-process cue: preserve clarity with controlled temperature and light agitation rather than chasing body through a harder press.']
        : [],
      aeropressProductionStyle === 'sweet_body'
        ? ['AeroPress sweet-body guard: pressing too hard near the hiss can push fines and bitterness into the cup; stop if the finish turns dry or gritty.']
        : [],
    )
    : [];
  const warnings = normalizeNoteList(
    [deviceSelection.fallbackUsed ? `Using ${effectiveDeviceProfile.label} family fallback profile.` : undefined],
    methodFamily === 'aeropress' && controlledDeviceProfile.recipeStyle === 'inverted'
      ? ['Safety Warning: Inverted chamber capacity is capped at 220 ml. Make sure the press plunger is inserted at least 2 cm into the AeroPress chamber before flipping!']
      : [],
    temperatureWarnings,
    aeropressWaterBeanWarnings,
    waterProfile.warnings,
    icedStrengthCalibration.warnings,
    switchSelection?.tasteProgramme.riskWarnings || [],
    switchStepValidation && switchStepValidation.status !== 'safe' ? [switchStepValidation.message] : [],
    kalitaSelection?.watch ? [kalitaSelection.watch] : [],
    cleverSelection?.watch ? [cleverSelection.watch] : [],
    chemexSelection?.watch ? [chemexSelection.watch] : [],
    mokaSelection?.watch ? [mokaSelection.watch] : [],
    coldBrewSelection?.watch ? [coldBrewSelection.watch] : [],
    batchBrewSelection?.watch ? [batchBrewSelection.watch] : [],
    siphonSelection?.watch ? [siphonSelection.watch] : [],
    origamiSelection?.watch ? [origamiSelection.watch] : [],
    aprilSelection?.watch ? [aprilSelection.watch] : [],
    melittaSelection?.watch ? [melittaSelection.watch] : [],
    konoSelection?.watch ? [konoSelection.watch] : [],
    filteredBaseGuardrailWarnings,
  );
  const isDerivedTemplateProfile = deviceSelection.mode === 'derived_template';
  const manualPresetAdaptationNote = buildManualPresetAdaptationNote(
    manualPreset,
    doseG,
    totalWaterMl,
    waterTempC,
  );

  const notes = normalizeNoteList(
    [
      targetProfile.description,
      controlledDeviceProfile.note,
      manualPreset ? `Manual brew preset selected: ${manualPreset.safeLabel}. ${manualPreset.visibleSummary}` : undefined,
      manualPresetAdaptationNote,
      manualPreset?.fallbackReason,
      kalitaSelection?.why ? kalitaSelection.why : undefined,
      cleverSelection?.why ? cleverSelection.why : undefined,
      chemexSelection?.why ? chemexSelection.why : undefined,
      mokaSelection?.why ? mokaSelection.why : undefined,
      coldBrewSelection?.why ? coldBrewSelection.why : undefined,
      batchBrewSelection?.why ? batchBrewSelection.why : undefined,
      siphonSelection?.why ? siphonSelection.why : undefined,
      origamiSelection?.why ? origamiSelection.why : undefined,
      aprilSelection?.why ? aprilSelection.why : undefined,
      melittaSelection?.why ? melittaSelection.why : undefined,
      konoSelection?.why ? konoSelection.why : undefined,
    ],
    waterProfile.notes,
    manualPreset?.guardrails || [],
    processEntry?.notes || [],
    varietyEntry?.notes || [],
    beanProfileAdjustment.notes,
    sensoryBiasAdjustment.notes,
    targetAwareProcessAdjustment.notes,
    methodFamilyAdjustment.notes,
    targetFamilyAdjustment.notes,
    methodTargetBehaviorPatch.notes,
    originAdjustment.notes,
    originTargetMethodAdjustment.notes,
    doseAdjustment.notes,
    serviceDoseTargetAdjustment.notes,
    flavorAlignment.notes,
    icedStrengthCalibration.notes,
    baristaTemperatureCalibration.notes,
    hardToExtractHotFilterFloor?.notes || [],
    v60SweetnessServiceCalibration?.notes || [],
    precisionOverrideNotes,
    operatorKnowledgeNotes,
    [
      !input.process ? 'Process not specified. No automatic process modifier was applied.' : undefined,
      !input.variety ? 'Variety not specified. No automatic variety modifier was applied.' : undefined,
      customProcessDetection?.note,
      targetProfileAutoSuggested ? targetProfileSuggestion.reason : undefined,
      processRisk?.variability === 'high' ? 'High variability process: use taste feedback before increasing extraction pressure.' : undefined,
      buildServiceExecutionNote({
        methodFamily,
        brewMode: input.brewMode,
        hotWaterMl,
        iceMl,
        totalWaterMl,
        finalBeverageRatio,
        hotExtractionRatio,
        hotSplitPercent,
        iceSplitPercent,
        waterTempC,
      }),
      pourControlNote,
      grinderSetting?.note,
    ],
  );

  const confidenceNotes = normalizeNoteList(
    [deviceSelection.fallbackUsed
      ? 'Exact device profile unavailable; family fallback was used.'
      : isDerivedTemplateProfile
        ? `Device profile was generated from the ${effectiveDeviceProfile.methodFamily} family template for ${dripper.name}.`
        : `Exact device profile matched: ${effectiveDeviceProfile.label}.`],
    grindDetails.confidenceNotes,
    waterProfile.confidenceNotes,
    beanProfileAdjustment.confidenceNotes,
    sensoryBiasAdjustment.confidenceNotes,
    targetAwareProcessAdjustment.confidenceNotes,
    methodFamilyAdjustment.confidenceNotes,
    targetFamilyAdjustment.confidenceNotes,
    methodTargetBehaviorPatch.confidenceNotes,
    originAdjustment.confidenceNotes,
    originTargetMethodAdjustment.confidenceNotes,
    doseAdjustment.confidenceNotes,
    serviceDoseTargetAdjustment.confidenceNotes,
    flavorAlignment.confidenceNotes,
    icedStrengthCalibration.confidenceNotes,
    baristaTemperatureCalibration.confidenceNotes,
    hardToExtractHotFilterFloor?.confidenceNotes || [],
    v60SweetnessServiceCalibration?.confidenceNotes || [],
    precisionOverrideNotes,
    operatorKnowledgeNotes.length > 0
      ? [`Operator knowledge active: ${operatorKnowledgeNotes.length} matched note(s) from the operator knowledge layer.`]
      : [],
    [
      waterBrand
        ? `Water source: ${waterBrand.shortLabel} (${input.waterCustomized ? 'customized' : waterBrand.presetStatus}).`
        : 'Water source: manual mineral entry.',
      switchSelection?.tasteProgramme
        ? `Switch taste programme: ${switchSelection.tasteProgramme.presetId}, bloom ${switchSelection.tasteProgramme.bloomMl} ml (${switchSelection.tasteProgramme.bloomRatio}x), closed peak target ${switchSelection.tasteProgramme.closedPhaseMl} ml, release ${switchSelection.tasteProgramme.releaseSeconds}s.`
        : undefined,
      switchStepValidation ? `Switch chamber validation: ${switchStepValidation.status}, peak ${switchStepValidation.peakClosedLoadMl}/${switchStepValidation.maxClosedLoadMl} ml.` : undefined,
      `Device profile source: ${effectiveDeviceProfile.verificationLevel}.`,
      `Grinder setting source: ${grindDetails.verificationLevel}.`,
      customProcessDetection ? `Custom process detection: ${customProcessDetection.id} (${customProcessDetection.confidence}).` : undefined,
      processRisk ? `Process risk: ${processRisk.variability} variability, ${processRisk.recommendationMode}.` : undefined,
      manualPreset ? `Manual brew preset source: ${manualPreset.safeLabel} (${manualPreset.verificationLevel}).` : undefined,
      input.brewMode === 'iced'
        ? (methodFamily === 'cold_brew'
            ? `Iced split source: final beverage ratio 1:${formatBaristaRatio(finalBeverageRatio)}, cold ratio 1:${formatBaristaRatio(hotExtractionRatio)}, liquid/ice ${hotSplitPercent}:${iceSplitPercent}.`
            : `Iced split source: final beverage ratio 1:${formatBaristaRatio(finalBeverageRatio)}, hot extraction ratio 1:${formatBaristaRatio(hotExtractionRatio)}, hot/ice ${hotSplitPercent}:${iceSplitPercent}.`)
        : undefined,
      pourControlNote ? `Pour control source: ${pourControlNote}` : undefined,
    ],
  );
  const beanCoverageBase = {
    input,
    processEntry,
    varietyEntry,
    processLabel,
    varietyLabel,
    methodFamily,
    deviceProfileMode: deviceSelection.mode,
    grindVerification: grindDetails.verificationLevel,
    grindSettingMode,
    grindCalibrationRequired,
    waterMode: input.waterMode,
    waterBrand,
    waterMinerals: waterProfile.minerals,
    waterMineralDerivation: waterProfile.mineralDerivation,
    processRisk,
    beanProfile: beanProfileAdjustment.state,
    guardrailErrors: baseGuardrails.errors,
    switchValidation: switchStepValidation,
  };
  const beanCoverage = buildBeanCoverageState(beanCoverageBase);
  const beanTaxonomy = deriveBeanTaxonomySignal({
    input,
    processEntry,
    varietyEntry,
    processLabel,
    varietyLabel,
    customProcessDetection,
    processRisk,
  });
  const provenanceAttentionNeeded =
    deviceSelection.mode !== 'exact'
    || grindSettingMode === 'derived_baseline'
    || grindCalibrationRequired
    || input.waterCustomized
    || input.waterMode === 'manual'
    || waterProfile.mineralDerivation === 'estimated_from_community_profile'
    || waterBrand?.presetStatus === 'manual_required';
  const waterIsBrewReadyForPlan = Boolean(waterBrand?.isBrewReady ?? input.waterMode === 'manual')
    && !(
      waterBrand?.classification === 'zero_mineral_ro'
      || (
        waterBrand?.classification !== 'low_mineral_clarity'
        && waterBrand?.classification !== 'demineral_direct_experiment'
        &&
        waterProfile.minerals.tdsPpm < 30
        && waterProfile.minerals.hardnessPpm < 20
        && waterProfile.minerals.alkalinityPpm < 20
      )
    );
  const extractionRationale = buildExtractionRationale({
    input,
    methodFamily,
    processLabel,
    varietyLabel,
    targetProfileLabel: targetProfile.label,
    waterTempC,
    totalTimeSeconds,
    recommendedRatio,
    finalBeverageRatio,
    hotExtractionRatio,
    totalWaterMl,
    hotWaterMl,
    iceMl,
    hotWaterSharePercent,
    iceSharePercent,
    grindBias,
    grindRecommendation: grindDetails.grindRecommendation,
    steps,
    waterProfile,
    beanProfile: beanProfileAdjustment.state,
    beanCoverage,
    processRisk,
    warnings,
    confidenceNotes,
  });

  const summary = buildSummary({
    brewMode: input.brewMode,
    methodFamily,
    coffeeName,
    dripper,
    targetProfileLabel: targetProfile.label,
    recommendedRatio,
    finalBeverageRatio,
    hotExtractionRatio,
    waterTempC,
    totalTimeSeconds,
  });

  const createdAt = Date.now();
  const fingerprint = createFingerprint(JSON.stringify({
    coffeeName,
    brewMode: input.brewMode,
    dripperId: dripper.id,
    grinderId: grinder.id,
    targetProfileId: targetProfile.id,
    deviceProfileId: effectiveDeviceProfile.id,
    grindSettingId: grinderSetting?.id,
    manualPresetId: manualPreset?.id,
    manualPresetTechniquePattern: manualPreset?.techniquePattern,
    switchPresetId: switchSelection?.preset.id,
    switchDoseMatrixRowId: switchSelection?.doseRow?.id,
    process: input.process,
    processEntryId: processEntry?.id,
    processLabel,
    customProcess: input.customProcess.trim(),
    customProcessDetectionId: customProcessDetection?.id,
    variety: input.variety,
    varietyEntryId: varietyEntry?.id,
    varietyLabel,
    customVariety: input.customVariety.trim(),
    pourStyle: input.pourStyle,
    pourCount: input.pourCount,
    origamiFilterStyle: origamiSelection?.resolvedFilterStyle || input.origamiFilterStyle,
    aeropressStyle: input.aeropressStyle,
    frenchPressStyle: input.frenchPressStyle,
    kalitaWaveStyle: input.kalitaWaveStyle,
    cleverDripperStyle: input.cleverDripperStyle,
    chemexStyle: input.chemexStyle,
    mokaPotStyle: input.mokaPotStyle,
    coldBrewStyle: input.coldBrewStyle,
    batchBrewStyle: input.batchBrewStyle,
    siphonStyle: input.siphonStyle,
    origamiStyle: input.origamiStyle,
    aprilStyle: input.aprilStyle,
    melittaStyle: input.melittaStyle,
    konoStyle: input.konoStyle,
    ratio: recommendedRatio,
    doseG,
    totalWaterMl,
    hotWaterMl,
    iceMl,
    waterTempC,
    totalTimeSeconds,
    roastLevel: input.roastLevel,
    waterMode: input.waterMode,
    waterRegion: input.waterRegion,
    waterBrandId: input.waterBrandId,
    waterCustomized: input.waterCustomized,
    waterTdsPpm: waterProfile.minerals.tdsPpm,
    waterHardnessPpm: waterProfile.minerals.hardnessPpm,
    waterAlkalinityPpm: waterProfile.minerals.alkalinityPpm,
    altitudeMasl: input.altitudeMasl,
    beanDensityGml: input.beanDensityGml,
    roastDevelopment: input.roastDevelopment,
    solubility: input.solubility,
    targetRatio: input.targetRatio,
    targetWaterMl: input.targetWaterMl,
    targetTempC: input.targetTempC,
    steps: steps.map((step) => ({
      kind: step.kind,
      actionType: 'actionType' in step ? step.actionType : undefined,
      share: step.share,
      label: step.label,
      startSeconds: step.startSeconds,
      targetVolumeMl: step.targetVolumeMl,
      pourVolumeMl: step.pourVolumeMl,
      control: (step as { control?: unknown }).control,
    })),
  }));

  const plan = {
    id: nowId('plan'),
    fingerprint,
    createdAt,
    catalogVersion: catalog.catalogVersion,
    formState: { ...input },
    brewMode: input.brewMode,
    methodFamily,
    recipeStyle: controlledDeviceProfile.recipeStyle,
    methodId,
    ratioToolMethodId,
    coffeeName,
    process: processLabel,
    variety: varietyLabel,
    roastLevel: input.roastLevel,
    beanProfile: beanProfileAdjustment.state,
    beanCoverage,
    beanTaxonomy,
    targetProfileId: targetProfile.id,
    targetProfileLabel: targetProfile.label,
    targetProfileAutoSuggested,
    targetProfileSuggestionReason: targetProfileAutoSuggested ? targetProfileSuggestion.reason : undefined,
    dripper,
    grinder,
    processEntry,
    varietyEntry,
    waterMode: input.waterMode,
    waterRegion: input.waterRegion,
    waterBrandId: waterBrand?.id || '',
    waterBrandLabel: waterBrand?.shortLabel,
    waterPresetStatus: waterBrand?.presetStatus,
    waterPublishState: waterBrand?.publishState,
    waterIsBrewReady: waterIsBrewReadyForPlan,
    waterClassification: waterProfile.classification ?? waterBrand?.classification,
    waterBrewBlockReason: waterBrand?.brewBlockReason || [],
    waterBrandMarkets: waterBrand?.markets || [],
    waterBrandVerification: waterBrand?.verificationLevel,
    waterBrandSourceUrls: waterBrand?.sourceUrls || [],
    waterMineralDerivation: waterProfile.mineralDerivation,
    waterCustomized: input.waterCustomized,
    waterMinerals: waterProfile.minerals,
    waterGuidance: catalog.waterGuidance,
    totalWaterMl,
    hotWaterMl,
    iceMl,
    recommendedRatio,
    finalBeverageRatio,
    hotExtractionRatio,
    hotWaterSharePercent,
    iceSharePercent,
    doseG,
    waterTempC,
    totalTimeSeconds,
    estimatedCupOutputMl,
    estimatedBrewOutputMl,
    estimatedBeverageOutputMl: estimatedCupOutputMl,
    grindBias,
    grindRecommendation: grindDetails.grindRecommendation,
    grindBandLabel: grindDetails.grindBandLabel,
    summary,
    steps,
    devicePhysicalConstraints: controlledDeviceProfile.physicalConstraints,
    methodProgramme: controlledDeviceProfile.methodProgramme,
    switchPresetId: switchSelection?.preset.id,
    switchPresetLabel: switchSelection?.preset.label,
    manualPresetId: manualPreset?.id,
    manualPresetLabel: manualPreset?.safeLabel,
    manualPresetCategory: manualPreset?.category,
    manualPresetTechniquePattern: manualPreset?.techniquePattern,
    manualPresetSummary: manualPreset?.visibleSummary,
    manualPresetSourceUrls: manualPreset?.sourceUrls,
    manualPresetGuidance: manualPreset?.internalTips,
    manualPresetGuardrails: manualPreset?.guardrails,
    switchTeachingMode: switchSelection?.preset.teachingMode,
    switchDoseMatrixRowId: switchSelection?.doseRow?.id,
    switchCompatibility: switchSelection?.compatibility,
    switchTasteProgramme: switchSelection?.tasteProgramme,
    switchStepValidation,
    switchProvenance: switchSelection?.preset.provenance,
    switchExpectedCupShift: switchSelection?.preset.expectedCupShift,
    switchWhy: switchSelection?.tasteProgramme.sensoryReason || switchSelection?.preset.why,
    switchWatch: switchSelection?.tasteProgramme.riskWarnings[0] || switchStepValidation?.message || switchSelection?.preset.watch,
    kalitaWaveStyle: kalitaSelection?.style || undefined,
    cleverDripperStyle: cleverSelection?.style || undefined,
    chemexStyle: chemexSelection?.style || undefined,
    mokaPotStyle: mokaSelection?.style || undefined,
    coldBrewStyle: coldBrewSelection?.style || undefined,
    batchBrewStyle: batchBrewSelection?.style || undefined,
    siphonStyle: siphonSelection?.style || undefined,
    origamiStyle: origamiSelection?.style || undefined,
    aprilStyle: aprilSelection?.style || undefined,
    melittaStyle: melittaSelection?.style || undefined,
    konoStyle: konoSelection?.style || undefined,
    notes,
    warnings,
    extractionRationale,
    guardrails: {
      errors: baseGuardrails.errors,
      warnings,
    },
    conformance: {
      warnings: normalizeNoteList(filteredBaseConformanceWarnings, warnings),
      standardsHits: baseConformance.standardsHits,
      standardsMisses: normalizeNoteList(filteredBaseConformanceMisses, waterProfile.warnings),
    },
    deviceProfileId: effectiveDeviceProfile.id,
    deviceProfileLabel: effectiveDeviceProfile.label,
    deviceProfileMode: deviceSelection.mode,
    processRisk,
    processReviewStatus: processEntry?.reviewStatus,
    varietyReviewStatus: varietyEntry?.reviewStatus,
    grindSettingReference: grinderSetting?.rangeLabel || 'No verified setting yet',
    grindSettingMode,
    grindSettingVerification: grindDetails.verificationLevel,
    grindCalibrationRequired,
    fallbackUsed: deviceSelection.fallbackUsed || !grinderSetting,
    provenanceAttentionNeeded,
    confidenceNotes,
  } satisfies BrewPlan;

  const workflowGuideSteps = buildWorkflowAwareGuideSteps(plan);
  const workflowValidation = validateMethodWorkflowGuide(plan, workflowGuideSteps);
  const workflowConfidenceNotes = workflowValidation.passed
    ? [`Workflow Ready: ${workflowValidation.readinessScore}/100 method guide validation.`]
    : [
      `Workflow ${workflowValidation.status === 'blocked' ? 'Blocked' : 'Needs Review'}: ${workflowValidation.readinessScore}/100 method guide validation.`,
      ...workflowValidation.blockingErrors,
      ...workflowValidation.warnings,
    ];
  const timeSemantics = deriveBrewPlanTimeSemantics(plan, workflowGuideSteps);
  const canonicalSummary = buildSummary({
    ...plan,
    ...timeSemantics,
  });
  const canonicalExtractionRationale = {
    ...plan.extractionRationale,
    time: buildCanonicalTimeRationale({
      methodFamily,
      brewMode: input.brewMode,
      totalTimeSeconds: timeSemantics.extractionEndSeconds ?? totalTimeSeconds,
      targetProfileLabel: targetProfile.label,
    }),
  };

  const planWithWorkflow = {
    ...plan,
    workflowGuideSteps,
    workflowValidation,
    ...timeSemantics,
    summary: canonicalSummary,
    extractionRationale: canonicalExtractionRationale,
    warnings: workflowValidation.passed
      ? plan.warnings
      : normalizeNoteList(plan.warnings, workflowValidation.blockingErrors),
    confidenceNotes: normalizeNoteList(plan.confidenceNotes, workflowConfidenceNotes),
    beanCoverage: buildBeanCoverageState({
      ...beanCoverageBase,
      guardrailErrors: normalizeNoteList(baseGuardrails.errors, workflowValidation.blockingErrors),
      workflowStatus: workflowValidation.status,
    }),
  } satisfies BrewPlan;

  return {
    ...planWithWorkflow,
    expectedCupProfile: buildExpectedCupProfile(planWithWorkflow, processEntry, varietyEntry, targetProfile),
    readinessScores: buildAiBrewReadinessScores(planWithWorkflow),
  } satisfies BrewPlan;
}

export function createDefaultAiBrewFormState(catalog?: AiBrewCatalog): AiBrewFormState {
  return {
    brewMode: 'hot',
    coffeeName: '',
    doseG: '15',
    process: '',
    customProcess: '',
    variety: '',
    customVariety: '',
    roastLevel: 'medium',
    altitudeMasl: '',
    beanDensityGml: '',
    roastDevelopment: '',
    solubility: '',
    dripperId: pickDefaultCatalogId(catalog?.drippers, DEFAULT_DRIPPER_PRIORITY),
    grinderId: pickDefaultCatalogId(catalog?.grinders, DEFAULT_GRINDER_PRIORITY),
    waterMode: 'brand',
    waterRegion: 'id',
    waterBrandId: '',
    waterCustomized: false,
    waterTdsPpm: '',
    waterHardnessPpm: '',
    waterAlkalinityPpm: '',
    waterNotes: '',
    targetProfileId: pickDefaultCatalogId(catalog?.targetProfiles, DEFAULT_TARGET_PROFILE_PRIORITY) || 'balance_clean',
    targetRatio: '',
    targetWaterMl: '',
    targetTempC: '',
    pourStyle: 'auto',
    pourCount: 'auto',
    origamiFilterStyle: 'auto',
    aeropressStyle: 'auto',
    frenchPressStyle: 'auto',
    switchPresetId: '',
    switchTeachingMode: '',
    kalitaWaveStyle: 'auto',
    cleverDripperStyle: 'auto',
    chemexStyle: 'auto',
    mokaPotStyle: 'auto',
    coldBrewStyle: 'auto',
    batchBrewStyle: 'auto',
    siphonStyle: 'auto',
    origamiStyle: 'auto',
    aprilStyle: 'auto',
    melittaStyle: 'auto',
    konoStyle: 'auto',
  };
}

export function sanitizeAiBrewFormState(input: Partial<AiBrewFormState>, catalog?: AiBrewCatalog): AiBrewFormState {
  const fallback = createDefaultAiBrewFormState(catalog);
  const validProcesses = new Set(['', ...(catalog?.processes.map((item) => item.id) || []), CUSTOM_ENTRY_ID]);
  const validVarieties = new Set(['', ...(catalog?.varieties.map((item) => item.id) || []), CUSTOM_ENTRY_ID]);
  const validRoasts = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'] as RoastLevel[];
  const validRoastDevelopment = new Set(['', 'underdeveloped', 'balanced', 'developed']);
  const validSolubility = new Set(['', 'low', 'medium', 'high']);
  const process = String(input.process || fallback.process);
  const variety = String(input.variety || fallback.variety);
  const validWaterModes = new Set(['brand', 'manual']);
  const validWaterRegions = new Set(['id', 'sg', 'bn', 'my']);
  const validPourStyles = new Set(['auto', 'balanced', 'pulse', 'gentle']);
  const validPourCounts = new Set(['auto', '3', '4', '5']);
  const validOrigamiFilterStyles = new Set(['auto', 'cone', 'wave']);
  const validAeroPressStyles = new Set(['auto', 'standard', 'inverted', 'bypass', 'no_bypass', 'bright_clean', 'sweet_body']);
  const validFrenchPressStyles = new Set(['auto', 'traditional', 'clean_decant', 'double_filter', 'heavy_concentrate', 'sweet_immersion']);
  const validManualPresetIds = new Set(['', ...(catalog?.manualBrewPresets || []).map((item) => item.id)]);
  const validSwitchPresetIds = new Set(['', ...(catalog?.switchPresets || []).map((item) => item.id)]);
  const validSwitchTeachingModes = new Set(['', 'full_immersion', 'full_percolation_v60_mode', 'hybrid']);
  const validKalitaWaveStyles = new Set(['auto', 'traditional_flat_three', 'competition_fast_four', 'continuous_slow_stream', 'iced_wave', 'high_dose_concentrate']);
  const validCleverDripperStyles = new Set(['auto', 'classic_closed', 'reverse_water_first', 'double_stage_hybrid', 'iced_clever', 'high_dose_concentrate']);
  const validChemexStyles = new Set(['auto', 'traditional_three_pour', 'competition_multi_pulse', 'continuous_center_pour', 'iced_chemex', 'high_dose_heavy_body']);
  const validMokaPotStyles = new Set(['auto', 'traditional_stovetop', 'preheated_boiler', 'low_temp_controlled', 'iced_moka_concentrate', 'high_yield_robust']);
  const validColdBrewStyles = new Set(['auto', 'classic_toddy_immersion', 'cold_drip_tower', 'double_extraction_concentrate', 'accelerated_room_temp', 'japanese_slow_drip']);
  const validBatchBrewStyles = new Set(['auto', 'sca_gold_cup', 'heavy_batch_catering', 'bright_light_roast_batch', 'pre_wet_hybrid_batch', 'high_extraction_thermos']);
  const validSiphonStyles = new Set(['auto', 'traditional_vacuum_siphon', 'competition_triple_agitation', 'low_temp_delicate', 'high_body_fast_drawdown', 'spirit_infusion_style']);
  const validOrigamiStyles = new Set(['auto', 'cone_dripper_style', 'wave_dripper_style', 'mugen_one_pour', 'iced_origami', 'competition_hybrid_flow']);
  const validAprilStyles = new Set(['auto', 'april_flat_bottom_standard', 'april_continuous_slow', 'competition_two_pour', 'iced_april_style', 'high_body_heavy_dose']);
  const validMelittaStyles = new Set(['auto', 'traditional_melitta_one_pour', 'aromaboy_style', 'three_pour_melitta', 'iced_melitta_brew', 'dense_classic_extraction']);
  const validKonoStyles = new Set(['auto', 'kono_meimon_traditional', 'kono_dripper_standard', 'kono_slow_drip_body', 'iced_kono_meimon', 'kono_agitation_sweet']);
  const waterBrandId = String(input.waterBrandId || '');
  const dripperId = String(input.dripperId || fallback.dripperId);
  const requestedBrewMode = input.brewMode === 'iced' ? 'iced' : 'hot';
  const brewMode = requestedBrewMode === 'iced' && !supportsAiBrewIcedMode(catalog, dripperId) ? 'hot' : requestedBrewMode;
  return {
    ...fallback,
    ...input,
    brewMode,
    process: validProcesses.has(process) ? process : fallback.process,
    variety: validVarieties.has(variety) ? variety : fallback.variety,
    roastLevel: validRoasts.includes(input.roastLevel as RoastLevel)
      ? (input.roastLevel as RoastLevel)
      : fallback.roastLevel,
    coffeeName: String(input.coffeeName || '').slice(0, 120),
    doseG: String(input.doseG || fallback.doseG),
    customProcess: String(input.customProcess || ''),
    customVariety: String(input.customVariety || ''),
    altitudeMasl: String(input.altitudeMasl || ''),
    beanDensityGml: String(input.beanDensityGml || ''),
    roastDevelopment: validRoastDevelopment.has(String(input.roastDevelopment))
      ? (String(input.roastDevelopment) as AiBrewFormState['roastDevelopment'])
      : fallback.roastDevelopment,
    solubility: validSolubility.has(String(input.solubility))
      ? (String(input.solubility) as AiBrewFormState['solubility'])
      : fallback.solubility,
    dripperId,
    grinderId: String(input.grinderId || fallback.grinderId),
    waterMode: validWaterModes.has(String(input.waterMode)) ? (input.waterMode as AiBrewFormState['waterMode']) : fallback.waterMode,
    waterRegion: validWaterRegions.has(String(input.waterRegion)) ? (input.waterRegion as AiBrewFormState['waterRegion']) : fallback.waterRegion,
    waterBrandId: Array.isArray(catalog?.waterBrands) && catalog.waterBrands.some((item) => item.id === waterBrandId) ? waterBrandId : '',
    waterCustomized: Boolean(input.waterCustomized),
    waterTdsPpm: String(input.waterTdsPpm || ''),
    waterHardnessPpm: String(input.waterHardnessPpm || ''),
    waterAlkalinityPpm: String(input.waterAlkalinityPpm || ''),
    waterNotes: String(input.waterNotes || ''),
    targetProfileId: String(input.targetProfileId || fallback.targetProfileId),
    targetRatio: String(input.targetRatio || ''),
    targetWaterMl: String(input.targetWaterMl || ''),
    targetTempC: String(input.targetTempC || ''),
    pourStyle: validPourStyles.has(String(input.pourStyle))
      ? (String(input.pourStyle) as AiBrewFormState['pourStyle'])
      : fallback.pourStyle,
    pourCount: validPourCounts.has(String(input.pourCount))
      ? (String(input.pourCount) as AiBrewFormState['pourCount'])
      : fallback.pourCount,
    manualPresetId: validManualPresetIds.has(String(input.manualPresetId || ''))
      ? String(input.manualPresetId || '')
      : '',
    origamiFilterStyle: validOrigamiFilterStyles.has(String(input.origamiFilterStyle))
      ? (String(input.origamiFilterStyle) as AiBrewFormState['origamiFilterStyle'])
      : fallback.origamiFilterStyle,
    aeropressStyle: validAeroPressStyles.has(String(input.aeropressStyle))
      ? (String(input.aeropressStyle) as AeroPressRecipeStyle)
      : fallback.aeropressStyle,
    frenchPressStyle: validFrenchPressStyles.has(String(input.frenchPressStyle))
      ? (String(input.frenchPressStyle) as FrenchPressRecipeStyle)
      : fallback.frenchPressStyle,
    switchPresetId: validSwitchPresetIds.has(String(input.switchPresetId || ''))
      ? (String(input.switchPresetId || '') as AiBrewFormState['switchPresetId'])
      : fallback.switchPresetId,
    switchTeachingMode: validSwitchTeachingModes.has(String(input.switchTeachingMode || ''))
      ? (String(input.switchTeachingMode || '') as AiBrewFormState['switchTeachingMode'])
      : fallback.switchTeachingMode,
    kalitaWaveStyle: validKalitaWaveStyles.has(String(input.kalitaWaveStyle))
      ? (String(input.kalitaWaveStyle) as KalitaWaveRecipeStyle)
      : fallback.kalitaWaveStyle,
    cleverDripperStyle: validCleverDripperStyles.has(String(input.cleverDripperStyle))
      ? (String(input.cleverDripperStyle) as CleverDripperRecipeStyle)
      : fallback.cleverDripperStyle,
    chemexStyle: validChemexStyles.has(String(input.chemexStyle))
      ? (String(input.chemexStyle) as ChemexRecipeStyle)
      : fallback.chemexStyle,
    mokaPotStyle: validMokaPotStyles.has(String(input.mokaPotStyle))
      ? (String(input.mokaPotStyle) as MokaPotRecipeStyle)
      : fallback.mokaPotStyle,
    coldBrewStyle: validColdBrewStyles.has(String(input.coldBrewStyle))
      ? (String(input.coldBrewStyle) as ColdBrewRecipeStyle)
      : fallback.coldBrewStyle,
    batchBrewStyle: validBatchBrewStyles.has(String(input.batchBrewStyle))
      ? (String(input.batchBrewStyle) as BatchBrewRecipeStyle)
      : fallback.batchBrewStyle,
    siphonStyle: validSiphonStyles.has(String(input.siphonStyle))
      ? (String(input.siphonStyle) as SiphonRecipeStyle)
      : fallback.siphonStyle,
    origamiStyle: validOrigamiStyles.has(String(input.origamiStyle))
      ? (String(input.origamiStyle) as OrigamiRecipeStyle)
      : fallback.origamiStyle,
    aprilStyle: validAprilStyles.has(String(input.aprilStyle))
      ? (String(input.aprilStyle) as AprilRecipeStyle)
      : fallback.aprilStyle,
    melittaStyle: validMelittaStyles.has(String(input.melittaStyle))
      ? (String(input.melittaStyle) as MelittaRecipeStyle)
      : fallback.melittaStyle,
    konoStyle: validKonoStyles.has(String(input.konoStyle))
      ? (String(input.konoStyle) as KonoRecipeStyle)
      : fallback.konoStyle,
  };
}

export function createQuickAiBrewFormState(input: AiBrewFormState, catalog?: AiBrewCatalog): AiBrewFormState {
  const sanitized = sanitizeAiBrewFormState(input, catalog);
  const preserveManualPresetPrefill = Boolean(sanitized.manualPresetId);
  return {
    ...sanitized,
    customProcess: sanitized.process === CUSTOM_ENTRY_ID ? sanitized.customProcess : '',
    customVariety: sanitized.variety === CUSTOM_ENTRY_ID ? sanitized.customVariety : '',
    altitudeMasl: '',
    beanDensityGml: '',
    roastDevelopment: '',
    solubility: '',
    targetRatio: preserveManualPresetPrefill ? sanitized.targetRatio : '',
    targetWaterMl: preserveManualPresetPrefill ? sanitized.targetWaterMl : '',
    targetTempC: preserveManualPresetPrefill ? sanitized.targetTempC : '',
    origamiFilterStyle: preserveManualPresetPrefill ? sanitized.origamiFilterStyle : 'auto',
    aeropressStyle: preserveManualPresetPrefill ? sanitized.aeropressStyle : 'auto',
    frenchPressStyle: preserveManualPresetPrefill ? sanitized.frenchPressStyle : 'auto',
    kalitaWaveStyle: preserveManualPresetPrefill ? sanitized.kalitaWaveStyle : 'auto',
    cleverDripperStyle: preserveManualPresetPrefill ? sanitized.cleverDripperStyle : 'auto',
    chemexStyle: preserveManualPresetPrefill ? sanitized.chemexStyle : 'auto',
    mokaPotStyle: preserveManualPresetPrefill ? sanitized.mokaPotStyle : 'auto',
    coldBrewStyle: preserveManualPresetPrefill ? sanitized.coldBrewStyle : 'auto',
    batchBrewStyle: preserveManualPresetPrefill ? sanitized.batchBrewStyle : 'auto',
    siphonStyle: preserveManualPresetPrefill ? sanitized.siphonStyle : 'auto',
    origamiStyle: preserveManualPresetPrefill ? sanitized.origamiStyle : 'auto',
    aprilStyle: preserveManualPresetPrefill ? sanitized.aprilStyle : 'auto',
    melittaStyle: preserveManualPresetPrefill ? sanitized.melittaStyle : 'auto',
    konoStyle: preserveManualPresetPrefill ? sanitized.konoStyle : 'auto',
  };
}

export function buildAiBrewPlan(input: AiBrewFormState, catalog: AiBrewCatalog): BrewPlan {
  const sanitized = sanitizeAiBrewFormState(applyManualBrewPresetDefaultsForPlanning(input, catalog), catalog);
  const dripper = findDripper(catalog, sanitized.dripperId) || catalog.drippers[0];
  const grinder = findGrinder(catalog, sanitized.grinderId) || catalog.grinders[0];
  if (!dripper || !grinder) throw new Error('AI Brew equipment catalog is incomplete.');
  const customProcessDetection = sanitized.process === CUSTOM_ENTRY_ID ? detectCustomProcess(sanitized, catalog) : null;
  const processEntry = sanitized.process === CUSTOM_ENTRY_ID
    ? customProcessDetection ? findProcessEntry(catalog, customProcessDetection.id) : undefined
    : findProcessEntry(catalog, sanitized.process);
  const varietyEntry = sanitized.variety === CUSTOM_ENTRY_ID ? undefined : findVarietyEntry(catalog, sanitized.variety);
  const waterBrand = sanitized.waterBrandId ? findWaterBrand(catalog, sanitized.waterBrandId) : undefined;
  const deviceSelection = resolveDeviceProfileSelection(catalog, dripper, sanitized.brewMode, {
    doseG: parseDose(sanitized.doseG),
    origamiFilterStyle: sanitized.origamiFilterStyle,
    aeropressStyle: sanitized.aeropressStyle,
    frenchPressStyle: sanitized.frenchPressStyle,
    targetProfileId: sanitized.targetProfileId,
  });
  const grinderSetting = resolveGrinderSettingReference(catalog, grinder, deviceSelection.profile, sanitized.brewMode);
  const waterProfile = deriveWaterMineralProfile(sanitized, catalog.waterGuidance, waterBrand);
  return finalizePlanCore(
    sanitized,
    catalog,
    dripper,
    grinder,
    processEntry,
    varietyEntry,
    waterBrand,
    deviceSelection,
    grinderSetting,
    waterProfile,
    customProcessDetection,
  );
}

export interface AiBrewOptimizationStepPatch {
  index?: number;
  stepId?: string;
  startSeconds?: number;
  pourVolumeMl?: number;
  control?: string;
}

export interface AiBrewOptimizationPatch {
  reason?: string;
  confidence?: number;
  recommendedRatio?: number;
  waterTempC?: number;
  totalTimeSeconds?: number;
  hotWaterSharePercent?: number;
  pourStyleHint?: string;
  grindGuidance?: string;
  steps?: AiBrewOptimizationStepPatch[];
}

export interface AiBrewOptimizationResult {
  plan: BrewPlan;
  applied: boolean;
  diagnostics: string[];
  rejected: string[];
}

function rebuildOptimizedSteps(
  plan: BrewPlan,
  hotWaterMl: number,
  totalTimeSeconds: number,
  patches: AiBrewOptimizationStepPatch[],
) {
  const volumeIncrementMl = resolveBaristaVolumeIncrementMl(plan.methodFamily);
  const timeScale = plan.totalTimeSeconds > 0 ? totalTimeSeconds / plan.totalTimeSeconds : 1;
  const startCandidates = plan.steps.map((step, index) => {
    const patch = resolveStepPatch(patches, step, index);
    const proposed = finitePatchNumber(patch?.startSeconds);
    return proposed ?? (index === 0 ? 0 : step.startSeconds * timeScale);
  });
  const startSeconds = normalizeBaristaStepStartSeconds(
    startCandidates,
    totalTimeSeconds,
    plan.methodFamily,
    {
      finalWindowMinSeconds: plan.brewMode === 'iced' && isIcedManualPourOverFamily(plan.methodFamily)
        ? resolveMethodFamilyFinalWindowBounds(plan.methodFamily, plan.brewMode).min
        : undefined,
    },
  );
  const volumeIndexes = plan.steps
    .map((step, index) => {
      const kind = step.kind || 'pour';
      const isCandidate = kind === 'pour' || kind === 'extract' || step.pourVolumeMl > 0;
      const hasNoShare = step.share !== undefined && step.share <= 0;
      return isCandidate && !hasNoShare ? index : -1;
    })
    .filter((index) => index >= 0);
  const pourIndexes = volumeIndexes.length > 0 ? volumeIndexes : plan.steps.map((_, index) => index);
  const lastPourIndex = pourIndexes[pourIndexes.length - 1] ?? plan.steps.length - 1;
  const waterScale = plan.hotWaterMl > 0 ? hotWaterMl / plan.hotWaterMl : 1;
  const rawPours = plan.steps.map((step, index) => {
    if (!pourIndexes.includes(index)) return 0;
    const patch = resolveStepPatch(patches, step, index);
    return Math.max(0, finitePatchNumber(patch?.pourVolumeMl) ?? step.pourVolumeMl * waterScale);
  });
  const rawPourTotal = pourIndexes.reduce((sum, index) => sum + Math.max(0, rawPours[index] || 0), 0);

  let runningTotal = 0;
  return plan.steps.map((step, index) => {
    const patch = resolveStepPatch(patches, step, index);
    const isPourStep = pourIndexes.includes(index);
    const isLastPourStep = index === lastPourIndex;
    const remainingWater = Math.max(0, hotWaterMl - runningTotal);
    const remainingPourCount = pourIndexes.filter((pourIndex) => pourIndex > index).length;
    const minimumReserveMl = remainingPourCount * volumeIncrementMl;
    const normalizedShare = rawPourTotal > 0
      ? Math.max(0, rawPours[index] || 0) / rawPourTotal
      : 1 / Math.max(1, pourIndexes.length);
    const rawPour = isLastPourStep ? remainingWater : hotWaterMl * normalizedShare;
    const maxPourVolumeMl = isLastPourStep
      ? remainingWater
      : Math.max(0, remainingWater - minimumReserveMl);
    const minPourVolumeMl = !isLastPourStep && isPourStep && maxPourVolumeMl >= volumeIncrementMl
      ? volumeIncrementMl
      : 0;
    const pourVolumeMl = isPourStep
      ? isLastPourStep
        ? remainingWater
        : clampRoundedToIncrement(rawPour, minPourVolumeMl, maxPourVolumeMl, volumeIncrementMl)
      : 0;
    runningTotal = isLastPourStep ? hotWaterMl : roundTo(runningTotal + pourVolumeMl, 0);
    const control = sanitizeOptimizationControl(patch?.control);
    return {
      ...step,
      startSeconds: startSeconds[index] ?? step.startSeconds,
      pourVolumeMl,
      targetVolumeMl: runningTotal,
      hybridInstruction: control
        ? joinInstructionText(control, step.hybridInstruction || step.note)
        : step.hybridInstruction,
    } satisfies BrewPlanStep;
  });
}

function validateOptimizedPlanEnvelope(plan: BrewPlan) {
  const errors: string[] = [];
  const numericValues = [
    plan.totalWaterMl,
    plan.hotWaterMl,
    plan.iceMl,
    plan.recommendedRatio,
    plan.finalBeverageRatio,
    plan.hotExtractionRatio,
    plan.waterTempC,
    plan.totalTimeSeconds,
    ...plan.steps.flatMap((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
  ];
  if (numericValues.some((value) => !Number.isFinite(value))) {
    errors.push('AI optimization produced a non-finite number.');
  }

  const totalPoured = plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
  const finalStep = plan.steps[plan.steps.length - 1];
  if (totalPoured !== plan.hotWaterMl) {
    errors.push(`Step total pour ${totalPoured} ml must equal hot water ${plan.hotWaterMl} ml.`);
  }
  if (finalStep?.targetVolumeMl !== plan.hotWaterMl) {
    errors.push(`Final step target ${finalStep?.targetVolumeMl ?? 'missing'} ml must equal hot water ${plan.hotWaterMl} ml.`);
  }
  if (plan.brewMode === 'iced' && plan.hotWaterMl + plan.iceMl !== plan.totalWaterMl) {
    errors.push('Iced hot water and ice split must equal total water.');
  }
  for (let index = 1; index < plan.steps.length; index += 1) {
    if (plan.steps[index].startSeconds <= plan.steps[index - 1].startSeconds) {
      errors.push('Step timestamps must be strictly increasing.');
      break;
    }
  }
  return errors;
}

export function applyAiBrewOptimizationPatch(
  plan: BrewPlan,
  patch: AiBrewOptimizationPatch | null | undefined,
): AiBrewOptimizationResult {
  if (!patch) {
    return { plan, applied: false, diagnostics: [], rejected: ['AI optimization response was empty or invalid JSON.'] };
  }

  const diagnostics: string[] = [];
  const rejected: string[] = [];
  const method = BREW_METHOD_MAP[plan.methodId] || BREW_METHOD_MAP[resolvePlannerMethodId(plan.methodFamily, plan.brewMode)];
  const roastTargets = buildRoastAdjustedTargets(method, plan.roastLevel);
  const deltaBounds = resolveOptimizationDeltaBounds(plan.methodFamily);
  const ratioMin = Math.max(method.ratioRange[0] - 0.75, roastTargets.adjustedRatioRange[0] - 0.75, plan.recommendedRatio - deltaBounds.ratio);
  const ratioMax = Math.min(method.ratioRange[1] + 0.75, roastTargets.adjustedRatioRange[1] + 0.75, plan.recommendedRatio + deltaBounds.ratio);
  const nextRatio = roundTo(clampPatchValue(
    finitePatchNumber(patch.recommendedRatio),
    plan.recommendedRatio,
    ratioMin,
    ratioMax,
    'ratio',
    diagnostics,
  ), 2);
  const totalWaterMl = roundBaristaVolumeMl(calcWaterFromDoseRatio(plan.doseG, nextRatio), plan.methodFamily);

  let hotWaterMl = totalWaterMl;
  if (plan.brewMode === 'iced') {
    const rawSharePercent = finitePatchNumber(patch.hotWaterSharePercent) ?? plan.hotWaterSharePercent;
    const requestedShare = clampPatchValue(rawSharePercent, plan.hotWaterSharePercent, 50, 78, 'hot water share', diagnostics) / 100;
    const hotRatioBounds = ICED_HOT_EXTRACTION_RATIO_BOUNDS[plan.methodFamily] || ICED_HOT_EXTRACTION_RATIO_BOUNDS.v60;
    const volumeIncrementMl = resolveBaristaVolumeIncrementMl(plan.methodFamily);
    const minHotWaterMl = Math.ceil(plan.doseG * hotRatioBounds.min);
    const maxHotWaterMl = Math.floor(plan.doseG * hotRatioBounds.max);
    const maxHotWaterWithIceMl = Math.max(1, totalWaterMl - volumeIncrementMl);
    const lowerHotWaterMl = Math.min(maxHotWaterWithIceMl, Math.max(volumeIncrementMl, minHotWaterMl));
    const upperHotWaterMl = Math.min(maxHotWaterWithIceMl, Math.max(lowerHotWaterMl, maxHotWaterMl));
    hotWaterMl = clampRoundedToIncrement(totalWaterMl * requestedShare, lowerHotWaterMl, upperHotWaterMl, volumeIncrementMl);
  }
  const iceMl = plan.brewMode === 'iced' ? roundTo(totalWaterMl - hotWaterMl, 0) : 0;
  const finalBeverageRatio = roundTo(totalWaterMl / plan.doseG, 2);
  const hotExtractionRatio = roundTo(hotWaterMl / plan.doseG, 2);
  const hotWaterSharePercent = roundTo(totalWaterMl > 0 ? (hotWaterMl / totalWaterMl) * 100 : 100, 0);
  const iceSharePercent = roundTo(totalWaterMl > 0 ? (iceMl / totalWaterMl) * 100 : 0, 0);

  const tempBounds = (plan.methodFamily === 'cold_brew' || plan.manualPresetId === 'inspired-aeropress-cold-brew-express') ? { min: 4, max: 25 } : { min: 78, max: 98 };
  const minPatchedTempC = Math.max(tempBounds.min, plan.waterTempC - deltaBounds.tempC);
  const maxPatchedTempC = Math.min(tempBounds.max, plan.waterTempC + deltaBounds.tempC);
  const rawWaterTempC = clampPatchValue(
    finitePatchNumber(patch.waterTempC),
    plan.waterTempC,
    minPatchedTempC,
    maxPatchedTempC,
    'temperature',
    diagnostics,
  );
  const waterTempC = clamp(Math.round(rawWaterTempC), minPatchedTempC, maxPatchedTempC);
  const methodTimeBounds = resolveOptimizationTimeBounds(plan.methodFamily);
  const minPatchedTimeSeconds = Math.max(methodTimeBounds.min, plan.totalTimeSeconds - deltaBounds.timeSec);
  const maxPatchedTimeSeconds = Math.min(methodTimeBounds.max, plan.totalTimeSeconds + deltaBounds.timeSec);
  const rawTotalTimeSeconds = clampPatchValue(
    finitePatchNumber(patch.totalTimeSeconds),
    plan.totalTimeSeconds,
    minPatchedTimeSeconds,
    maxPatchedTimeSeconds,
    'main taste time',
    diagnostics,
  );
  const totalTimeSeconds = clamp(
    roundBaristaTimeSeconds(rawTotalTimeSeconds, plan.methodFamily),
    minPatchedTimeSeconds,
    maxPatchedTimeSeconds,
  );
  const styleHint = sanitizeOptimizationPourStyleHint(patch.pourStyleHint);
  const patchSteps = patch.steps?.length ? patch.steps : buildStyleHintStepPatches(plan, styleHint);
  const steps = rebuildOptimizedSteps(plan, hotWaterMl, totalTimeSeconds, patchSteps);
  const brewOutputs = buildBrewOutputs({ method, doseG: plan.doseG, waterMl: hotWaterMl, ratio: nextRatio });
  const estimatedBrewOutputMl = plan.brewMode === 'iced'
    ? roundEstimatedCupOutputMl(estimateCupOutputMl(hotWaterMl, plan.doseG, plan.brewMode), plan.methodFamily)
    : roundEstimatedCupOutputMl(brewOutputs.beverageOutputMl, plan.methodFamily);
  const estimatedCupOutputMl = roundEstimatedCupOutputMl(
    estimateCupOutputMl(totalWaterMl, plan.doseG, plan.brewMode),
    plan.methodFamily,
  );
  const baseGuardrails = validateBrewInputs({ method, doseG: plan.doseG, waterMl: totalWaterMl, ratio: finalBeverageRatio }, { roastLevel: plan.roastLevel });
  const baseConformance = evaluateConformance({ method, doseG: plan.doseG, waterMl: totalWaterMl, ratio: finalBeverageRatio }, { roastLevel: plan.roastLevel });
  const optimizationReason = patch.reason?.trim().slice(0, 220);
  const grindGuidance = sanitizeOptimizationGrindGuidance(patch.grindGuidance, plan);
  const warnings = normalizeNoteList(plan.warnings, baseGuardrails.warnings);
  const positivePourSteps = steps.filter((step) => step.pourVolumeMl > 0);
  const firstPourStep = positivePourSteps[0];
  const lastPourStep = positivePourSteps[positivePourSteps.length - 1];
  const notes = normalizeNoteList(
    plan.notes.slice(0, 15),
    optimizationReason ? [`AI optimizer: ${optimizationReason}`] : ['AI optimizer adjusted the deterministic brew envelope within guardrails.'],
    grindGuidance ? [`AI grind guidance: ${grindGuidance}`] : [],
  );
  const confidenceNotes = normalizeNoteList(
    plan.confidenceNotes,
    [`AI numeric optimizer accepted inside guardrails${typeof patch.confidence === 'number' ? ` (confidence ${roundPercent(clamp(patch.confidence <= 1 ? patch.confidence * 100 : patch.confidence, 0, 100))}%).` : '.'}`],
    diagnostics,
  );
  const extractionRationale = {
    ...plan.extractionRationale,
    ratio: plan.brewMode === 'iced'
      ? `Final ratio 1:${formatBaristaRatio(finalBeverageRatio)} keeps iced strength after dilution; hot concentrate 1:${formatBaristaRatio(hotExtractionRatio)} extracts with ${hotWaterMl} ml hot water into ${iceMl} g ice.`
      : `Brew ratio 1:${formatBaristaRatio(finalBeverageRatio)} remains inside optimizer guardrails for ${plan.targetProfileLabel} and ${plan.roastLevel} roast solubility.`,
    temperature: `${formatBaristaTemperature(waterTempC)}C remains inside optimizer guardrails and must be validated by taste before further pressure changes.`,
    time: `${formatTime(totalTimeSeconds)} service window remains inside optimizer guardrails for ${plan.methodFamily.replace(/_/g, ' ')} flow.`,
    pour: positivePourSteps.length > 0
      ? `Optimized pour map uses ${positivePourSteps.length} checkpoints from ${firstPourStep?.pourVolumeMl || 0} ml to final target ${lastPourStep?.targetVolumeMl || hotWaterMl} ml without adding water outside the deterministic envelope.`
      : plan.extractionRationale.pour,
    iceSplit: plan.brewMode === 'iced'
      ? `Iced split uses ${hotWaterSharePercent}% hot water and ${iceSharePercent}% ice: ${hotWaterMl} ml hot concentrate over ${iceMl} g measured ice.`
      : undefined,
    warnings: normalizeNoteList(plan.extractionRationale.warnings, warnings, diagnostics).slice(0, 6),
  } satisfies BrewExtractionRationale;
  const nextPlan = {
    ...plan,
    fingerprint: createFingerprint(JSON.stringify({
      previousFingerprint: plan.fingerprint,
      aiOptimizedAt: Date.now(),
      ratio: nextRatio,
      totalWaterMl,
      hotWaterMl,
      iceMl,
      waterTempC,
      totalTimeSeconds,
      steps: steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
    })),
    totalWaterMl,
    hotWaterMl,
    iceMl,
    recommendedRatio: nextRatio,
    finalBeverageRatio,
    hotExtractionRatio,
    hotWaterSharePercent,
    iceSharePercent,
    waterTempC,
    totalTimeSeconds,
    estimatedCupOutputMl,
    estimatedBrewOutputMl,
    estimatedBeverageOutputMl: estimatedCupOutputMl,
    summary: buildSummary({
      brewMode: plan.brewMode,
      methodFamily: plan.methodFamily,
      coffeeName: plan.coffeeName,
      dripper: plan.dripper,
      targetProfileLabel: plan.targetProfileLabel,
      recommendedRatio: nextRatio,
      finalBeverageRatio,
      hotExtractionRatio,
      waterTempC,
      totalTimeSeconds,
    }),
    steps,
    notes,
    warnings,
    extractionRationale,
    guardrails: {
      errors: baseGuardrails.errors,
      warnings,
    },
    conformance: {
      warnings: normalizeNoteList(baseConformance.warnings, warnings),
      standardsHits: baseConformance.standardsHits,
      standardsMisses: normalizeNoteList(baseConformance.standardsMisses),
    },
    confidenceNotes,
  } satisfies BrewPlan;

  rejected.push(...validateOptimizedPlanEnvelope(nextPlan));
  if (rejected.length > 0 || nextPlan.guardrails.errors.length > 0) {
    return {
      plan,
      applied: false,
      diagnostics,
      rejected: normalizeNoteList(rejected, nextPlan.guardrails.errors),
    };
  }

  const applied = (
    nextPlan.recommendedRatio !== plan.recommendedRatio
    || nextPlan.totalWaterMl !== plan.totalWaterMl
    || nextPlan.hotWaterMl !== plan.hotWaterMl
    || nextPlan.iceMl !== plan.iceMl
    || nextPlan.waterTempC !== plan.waterTempC
    || nextPlan.totalTimeSeconds !== plan.totalTimeSeconds
    || nextPlan.steps.some((step, index) => {
      const previous = plan.steps[index];
      return !previous
        || step.startSeconds !== previous.startSeconds
        || step.pourVolumeMl !== previous.pourVolumeMl
        || step.targetVolumeMl !== previous.targetVolumeMl
        || step.hybridInstruction !== previous.hybridInstruction;
    })
  );

  return { plan: applied ? nextPlan : plan, applied, diagnostics, rejected: [] };
}

export async function buildAiBrewPlanProgressively(
  input: AiBrewFormState,
  catalog: AiBrewCatalog,
  onStage?: (stage: AiBrewGenerationProgress) => void | Promise<void>,
): Promise<BrewPlan> {
  const stage = async (progress: AiBrewGenerationProgress) => {
    if (onStage) await onStage(progress);
  };

  const sanitized = sanitizeAiBrewFormState(input, catalog);
  const dripper = findDripper(catalog, sanitized.dripperId) || catalog.drippers[0];
  const grinder = findGrinder(catalog, sanitized.grinderId) || catalog.grinders[0];
  if (!dripper || !grinder) throw new Error('AI Brew equipment catalog is incomplete.');
  const customProcessDetection = sanitized.process === CUSTOM_ENTRY_ID ? detectCustomProcess(sanitized, catalog) : null;
  const processEntry = sanitized.process === CUSTOM_ENTRY_ID
    ? customProcessDetection ? findProcessEntry(catalog, customProcessDetection.id) : undefined
    : findProcessEntry(catalog, sanitized.process);
  const varietyEntry = sanitized.variety === CUSTOM_ENTRY_ID ? undefined : findVarietyEntry(catalog, sanitized.variety);
  const targetProfile = findTargetProfile(catalog, sanitized.targetProfileId) || catalog.targetProfiles[0];
  const waterBrand = sanitized.waterBrandId ? findWaterBrand(catalog, sanitized.waterBrandId) : undefined;
  const waterProfile = deriveWaterMineralProfile(sanitized, catalog.waterGuidance, waterBrand);
  const inputFitScore = scoreInputFit(sanitized);
  const waterReferenceScore = scoreWaterReference(sanitized, waterBrand);
  const waterReferenceResolved = waterProfile ? 1 : 0;
  const targetProfileId = targetProfile?.id || sanitized.targetProfileId;
  const targetProfileLabel = targetProfile?.label || sanitized.targetProfileId || 'Target profile';

  await stage(buildGenerationProgressEvent({
    id: 'validate_input',
    catalogVersion: catalog.catalogVersion,
    sanitized,
    targetProfileId,
    targetProfileLabel,
    waterBrand,
    inputFitScore,
    referenceStrengthScore: averageScores([waterReferenceScore]),
    resolvedReferenceCount: waterReferenceResolved,
  }));

  const deviceSelection = resolveDeviceProfileSelection(catalog, dripper, sanitized.brewMode, {
    doseG: parseDose(sanitized.doseG),
    origamiFilterStyle: sanitized.origamiFilterStyle,
    aeropressStyle: sanitized.aeropressStyle,
    frenchPressStyle: sanitized.frenchPressStyle,
    targetProfileId,
  });
  const deviceReferenceScore = scoreDeviceReference(deviceSelection.mode);
  const matchedReferenceScore = averageScores([waterReferenceScore, deviceReferenceScore]);

  await stage(buildGenerationProgressEvent({
    id: 'match_device_profile',
    catalogVersion: catalog.catalogVersion,
    sanitized,
    targetProfileId,
    targetProfileLabel,
    waterBrand,
    deviceSelection,
    inputFitScore,
    referenceStrengthScore: matchedReferenceScore,
    resolvedReferenceCount: waterReferenceResolved + 1,
  }));

  const grinderSetting = resolveGrinderSettingReference(catalog, grinder, deviceSelection.profile, sanitized.brewMode);
  const grinderReferenceScore = scoreVerificationStrength(grinderSetting?.verificationLevel);
  const resolvedReferenceCount = waterReferenceResolved + 2;
  const referenceStrengthScore = averageScores([
    waterReferenceScore,
    deviceReferenceScore,
    grinderReferenceScore,
  ]);

  await stage(buildGenerationProgressEvent({
    id: 'resolve_grinder_settings',
    catalogVersion: catalog.catalogVersion,
    sanitized,
    targetProfileId,
    targetProfileLabel,
    waterBrand,
    deviceSelection,
    grinderSetting,
    inputFitScore,
    referenceStrengthScore,
    resolvedReferenceCount,
  }));

  const nextPlan = finalizePlanCore(
    sanitized,
    catalog,
    dripper,
    grinder,
    processEntry,
    varietyEntry,
    waterBrand,
    deviceSelection,
    grinderSetting,
    waterProfile,
    customProcessDetection,
  );

  await stage(buildGenerationProgressEvent({
    id: 'compute_brew_variables',
    catalogVersion: catalog.catalogVersion,
    sanitized,
    targetProfileId,
    targetProfileLabel,
    waterBrand,
    deviceSelection,
    grinderSetting,
    plan: nextPlan,
    inputFitScore,
    referenceStrengthScore,
    resolvedReferenceCount,
  }));

  await stage(buildGenerationProgressEvent({
    id: 'build_sequence',
    catalogVersion: catalog.catalogVersion,
    sanitized,
    targetProfileId,
    targetProfileLabel,
    waterBrand,
    deviceSelection,
    grinderSetting,
    plan: nextPlan,
    inputFitScore,
    referenceStrengthScore,
    resolvedReferenceCount,
  }));

  const standardsScore = scoreStandardsQuality(nextPlan);
  await stage(buildGenerationProgressEvent({
    id: 'run_standards_checks',
    catalogVersion: catalog.catalogVersion,
    sanitized,
    targetProfileId,
    targetProfileLabel,
    waterBrand,
    deviceSelection,
    grinderSetting,
    plan: nextPlan,
    inputFitScore,
    referenceStrengthScore,
    standardsScore,
    resolvedReferenceCount,
  }));

  return nextPlan;
}

export function loadPlanIntoForm(plan: BrewPlan): Partial<AiBrewFormState> {
  return { ...plan.formState };
}

function isIndonesianLocale(locale?: string) {
  return isIndonesianAiBrewLanguage(locale);
}

export interface AiBrewMethodBrief {
  title: string;
  primaryLabel: string;
  primaryValue: string;
  controlLabel: string;
  controlValue: string;
  successLabel: string;
  successCue: string;
  watch: string[];
}

function formatMethodBriefMl(value: number) {
  return `${Math.round(value)} ml`;
}

export function buildPlanMethodBrief(plan: BrewPlan, locale?: string): AiBrewMethodBrief {
  const id = isIndonesianLocale(locale);
  const target = id
    ? localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, locale).toLowerCase()
    : plan.targetProfileLabel.toLowerCase();
  const methodName = plan.dripper.name;
  const defaultPrimaryLabel = plan.brewMode === 'iced'
    ? (id ? 'Air panas seduh' : 'Hot brew water')
    : (id ? 'Total air' : 'Total water');
  const defaultPrimaryValue = formatMethodBriefMl(plan.brewMode === 'iced' ? plan.hotWaterMl : plan.totalWaterMl);
  const defaultSuccess = id
    ? 'Bed turun rapi, tidak macet, dan rasa tetap sesuai target.'
    : 'Bed drains cleanly without stalling and the cup stays aligned with target.';

  const common = {
    title: id ? 'Kunci metode' : 'Method focus',
    primaryLabel: defaultPrimaryLabel,
    primaryValue: defaultPrimaryValue,
    controlLabel: id ? 'Kontrol utama' : 'Main control',
    controlValue: id ? `Jaga ${target} dengan waktu dan aliran stabil.` : `Keep ${target} with stable time and flow.`,
    successLabel: id ? 'Tanda selesai' : 'Finish cue',
    successCue: defaultSuccess,
    watch: id
      ? [
          'Ikuti checkpoint berurutan sebagai output utama.',
          'Baca waktu aliran dulu: terlalu cepat biasanya perlu sedikit lebih halus, terlalu lambat biasanya perlu sedikit lebih kasar.',
        ]
      : [
          'Follow checkpoints in order as the main output.',
          'Read flow time first: too fast usually needs slightly finer grind, too slow usually needs slightly coarser grind.',
        ],
  };

  switch (plan.methodFamily) {
    case 'espresso':
      return {
        ...common,
        primaryLabel: id ? 'Hasil espresso' : 'Espresso yield',
        primaryValue: formatMethodBriefMl(plan.totalWaterMl),
        controlValue: id
          ? 'Berhenti berdasarkan hasil, waktu, dan aliran. Jangan mengejar volume dengan ekstraksi berlebih.'
          : 'Stop by yield, time, and flow. Do not chase volume by over-extending extraction.',
        successCue: id
          ? 'Aliran menyempit bersih dan ekstraksi berhenti di target hasil sebelum blonding agresif.'
          : 'Flow narrows cleanly and the shot stops at target yield before aggressive blonding.',
        watch: id
          ? ['Hasil adalah minuman espresso di cangkir, bukan air seduh filter.', 'Lihat aliran dan waktu bersamaan sebelum menghentikan ekstraksi.']
          : ['Yield is espresso beverage output, not a filter-brew pour volume.', 'Read flow and time together before stopping the shot.'],
      };
    case 'moka_pot':
      return {
        ...common,
        primaryLabel: id ? 'Air base moka' : 'Moka base water',
        primaryValue: formatMethodBriefMl(plan.totalWaterMl),
        controlValue: id
          ? 'Isi base di bawah safety valve, basket jangan ditamp, lalu pakai panas moderat.'
          : 'Fill the base below the safety valve, use no tamp in the basket, then use moderate heat.',
        successCue: id
          ? 'Angkat sebelum sputter kasar atau rasa rebus muncul.'
          : 'Remove from heat before harsh sputtering or boiled flavor appears.',
        watch: id
          ? ['Panas terlalu tinggi membuat rasa cepat pahit.', 'Sajikan saat ruang atas sudah terisi sesuai target.']
          : ['Too much heat turns the cup bitter fast.', 'Serve when the upper chamber reaches target output.'],
      };
    case 'cold_brew':
      return {
        ...common,
        primaryLabel: id ? 'Air dingin' : 'Cool water',
        primaryValue: formatMethodBriefMl(plan.totalWaterMl),
        controlValue: id
          ? `Basahi seluruh kopi kasar, lalu rendam sekitar ${formatTime(plan.totalTimeSeconds)}.`
          : `Fully saturate the coarse bed, then hold the steep around ${formatTime(plan.totalTimeSeconds)}.`,
        successCue: id
          ? 'Saring atau tuang pisah dengan bersih agar ekstraksi berhenti sebelum disajikan.'
          : 'Filter or decant cleanly so extraction stops before service.',
        watch: id
          ? ['Bagian bubuk yang masih kering membuat hasil tipis dan tidak rata.', 'Pisahkan kopi dari ampas sebelum disimpan atau disajikan.']
          : ['Dry pockets make extraction thin and uneven.', 'Separate brew from grounds before storage or service.'],
      };
    case 'batch_brew':
      return {
        ...common,
        primaryLabel: id ? 'Air siklus mesin' : 'Machine cycle water',
        primaryValue: formatMethodBriefMl(plan.totalWaterMl),
        controlValue: id
          ? 'Ratakan keranjang, biarkan siklus mesin dan air turun selesai, lalu aduk batch.'
          : 'Level the basket, let the machine cycle and drawdown finish, then mix the batch.',
        successCue: id
          ? 'Wadah saji tercampur rata dan tidak ada jalur besar di hamparan kopi.'
          : 'Carafe is mixed evenly and the bed shows no major channeling.',
        watch: id
          ? ['Hamparan kopi miring membuat batch tidak konsisten.', 'Aduk wadah saji sebelum evaluasi rasa.']
          : ['An uneven bed makes the batch inconsistent.', 'Mix the carafe before judging flavor.'],
      };
    case 'french_press':
      return {
        ...common,
        controlValue: id
          ? 'Rendaman penuh, waktu rendam stabil, lalu tekan pelan dan tuang pisah.'
          : 'Full immersion, stable steep, then slow press and decant.',
        successCue: id
          ? 'Tekanan terasa halus dan seduhan dipisahkan agar partikel halus tidak terus mengekstrak.'
          : 'Plunge feels smooth and brew is separated so fines stop extracting.',
        watch: id
          ? ['Jangan aduk agresif menjelang akhir.', 'Tuang pisah setelah ditekan agar rasa tidak makin berat.']
          : ['Avoid aggressive late stirring.', 'Decant after pressing so the cup does not keep getting heavier.'],
      };
    case 'aeropress':
      return {
        ...common,
        controlValue: id
          ? 'Rendaman pendek, timing ketat, lalu tekan stabil tanpa memaksa akhir.'
          : 'Short immersion, tight timing, then steady press without forcing the finish.',
        successCue: id
          ? 'Tekanan selesai halus di target; hindari memaksa desis terakhir.'
          : 'Press finishes smoothly at target; avoid forcing the final hiss.',
        watch: id
          ? ['Ruang seduh harus basah rata sebelum ditekan.', 'Tekanan stabil lebih penting daripada menekan cepat.']
          : ['Chamber should be evenly wet before pressing.', 'Stable pressure matters more than a fast press.'],
      };
    case 'siphon':
      return {
        ...common,
        controlValue: id
          ? 'Jaga panas/vakum stabil, agitasi singkat, lalu biarkan air turun selesai.'
          : 'Keep heat/vacuum stable, agitate briefly, then let drawdown finish.',
        successCue: id
          ? 'Air turun bersih setelah panas dimatikan tanpa agitasi tambahan.'
          : 'Drawdown finishes cleanly after heat-off without extra agitation.',
        watch: id
          ? ['Jangan aduk berlebihan saat ruang atas aktif.', 'Matikan panas tepat waktu supaya akhir rasa tidak kasar.']
          : ['Do not over-stir while the upper chamber is active.', 'Cut heat on time so the finish stays clean.'],
      };
    case 'hario_switch':
      return {
        ...common,
        controlValue: id
          ? 'Katup Switch mengatur fase tertutup/terbuka; ikuti target muatan ruang dan titik buka katup.'
          : 'Switch valve controls closed/open phases; follow chamber load targets and the release checkpoint.',
        successCue: id
          ? 'Buka katup stabil, hamparan kopi tidak terguncang, dan cangkir tetap manis tanpa akhir rasa keruh.'
          : 'Release flows steadily, the bed stays settled, and the cup keeps sweetness without a muddy finish.',
        watch: id
          ? ['Bilas filter, panaskan bodi kaca Switch, dan tara timbangan sebelum mulai.', 'Jangan lewati batas muatan ruang saat katup tertutup.']
          : ['Rinse the filter, preheat the glass body, and tare the scale first.', 'Do not exceed chamber load while the valve is closed.'],
      };
    case 'clever_dripper':
      if (plan.dripper.id === 'hario-switch') {
        return {
          ...common,
          controlValue: id
            ? 'Katup tertutup untuk bloom/rendam, lalu buka Switch dengan bersih di titik buka katup.'
            : 'Keep the valve closed for bloom/steep, then open the switch cleanly at the release checkpoint.',
          successCue: id
            ? 'Buka katup stabil, hamparan kopi tidak terguncang, dan cangkir tetap manis tanpa akhir rasa keruh.'
            : 'Release flows steadily, the bed stays settled, and the cup keeps sweetness without a muddy finish.',
          watch: id
            ? ['Bilas filter, panaskan bodi kaca Switch, dan tara timbangan sebelum mulai.', 'Jangan putar berat tepat sebelum membuka Switch.']
            : ['Rinse the filter, preheat the glass body, and tare the scale first.', 'Avoid heavy swirling right before opening the switch.'],
        };
      }
      return {
        ...common,
        controlValue: id
          ? 'Bangun rendaman tenang, lalu buka katup dengan bersih di titik yang ditentukan.'
          : 'Build calm immersion, then release cleanly at checkpoint.',
        successCue: id
          ? 'Aliran buka katup stabil dan akhir rasa tidak keruh atau kasar.'
          : 'Release flows steadily and the finish is not muddy or harsh.',
        watch: id
          ? ['Waktu kontak adalah kontrol utama.', 'Jangan putar berat menjelang buka katup.']
          : ['Contact time is the main control.', 'Avoid heavy swirling before release.'],
      };
    case 'chemex':
      return {
        ...common,
        controlValue: id
          ? 'Jaga aliran stabil dan hindari bypass di dinding filter tebal.'
          : 'Keep flow stable and avoid bypass through the thick filter wall.',
        successCue: id
          ? 'Air turun tetap lancar, tidak tersendat oleh filter.'
          : 'Drawdown stays open and does not stall through the filter.',
        watch: id
          ? ['Filter tebal butuh aliran stabil.', 'Hindari turbulensi agresif di akhir.']
          : ['Thick filters need steady flow.', 'Avoid aggressive turbulence late.'],
      };
    case 'kalita_wave':
    case 'april':
    case 'melitta':
      return {
        ...common,
        controlValue: id
          ? 'Jaga hamparan flat-bottom rata dengan pulse pendek dan cerat rendah.'
          : 'Keep the flat bed level with short pulses and a low spout.',
        successCue: id
          ? 'Permukaan hamparan kopi rata dan air turun seragam.'
          : 'Bed surface stays level and drawdown finishes evenly.',
        watch: id
          ? ['Hamparan kopi miring membuat ekstraksi tidak rata.', 'Pulse pendek lebih aman daripada air menggenang.']
          : ['A tilted bed extracts unevenly.', 'Short pulses are safer than flooding.'],
      };
    default:
      return methodName.toLowerCase().includes('kono')
        ? {
          ...common,
          controlValue: id
            ? 'Mulai center-focused, lalu buka alur perlahan untuk menjaga sweetness.'
            : 'Start center-focused, then widen gently to preserve sweetness.',
          successCue: id
            ? 'Tengah tetap bersih dan akhir rasa manis tanpa turbulensi akhir.'
            : 'Center stays clean and finish remains sweet without late turbulence.',
        }
        : common;
  }
}

export function buildPlanRecipeName(plan: BrewPlan, locale?: string) {
  const fallback = isIndonesianLocale(locale) ? 'AI Seduh' : 'AI Brew';
  return `${plan.coffeeName || fallback} · ${plan.targetProfileLabel}`;
}

export function buildPlanRecipeDescription(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  const gear = `${plan.dripper.name} + ${plan.grinder.name}`;
  const split = plan.iceMl > 0
    ? (id ? ` Split ${plan.hotWaterMl} ml panas / ${plan.iceMl} ml es. Rasio final 1:${formatBaristaRatio(plan.finalBeverageRatio)}, konsentrat panas 1:${formatBaristaRatio(plan.hotExtractionRatio)}.` : ` Split ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice. Final ratio 1:${formatBaristaRatio(plan.finalBeverageRatio)}, hot concentrate 1:${formatBaristaRatio(plan.hotExtractionRatio)}.`)
    : '';
  const waterSource = plan.waterBrandLabel
    ? (id
      ? ` Air: ${plan.waterBrandLabel}${plan.waterCustomized ? ' (disesuaikan)' : ''}.`
      : ` Water: ${plan.waterBrandLabel}${plan.waterCustomized ? ' (customized)' : ''}.`)
    : (id ? ' Air: input mineral manual.' : ' Water: manual mineral input.');
  return id
    ? `${plan.summary} Perangkat: ${gear}.${split}${waterSource}`
    : `${plan.summary} Gear: ${gear}.${split}${waterSource}`;
}

function buildPlanRecipeStepAction(step: BrewPlan['steps'][number], locale?: string, plan?: BrewPlan) {
  const id = isIndonesianLocale(locale);
  const kind = step.kind || 'pour';

  if (kind === 'release') {
    return id
      ? `buka katup pada target ${step.targetVolumeMl} ml`
      : `open release at target ${step.targetVolumeMl} ml`;
  }
  if (kind === 'wait') {
    return id
      ? `tahan kontak; jangan tambah air. Target tetap ${step.targetVolumeMl} ml`
      : `hold contact; do not add water. Target stays ${step.targetVolumeMl} ml`;
  }
  if (kind === 'drawdown') {
    return id
      ? `biarkan air turun lanjut; target tetap ${step.targetVolumeMl} ml`
      : `let drawdown continue; target stays ${step.targetVolumeMl} ml`;
  }
  if (kind === 'press') {
    return id
      ? `tekan perlahan; target tetap ${step.targetVolumeMl} ml`
      : `press slowly; target stays ${step.targetVolumeMl} ml`;
  }
  if (kind === 'heat') {
    return id
      ? `panaskan stabil; target tetap ${step.targetVolumeMl} ml`
      : `heat steadily; target stays ${step.targetVolumeMl} ml`;
  }
  if (kind === 'extract') {
    return id
      ? `ekstrak ${step.pourVolumeMl} ml hingga yield target ${step.targetVolumeMl} ml`
      : `extract ${step.pourVolumeMl} ml to target yield ${step.targetVolumeMl} ml`;
  }
  if (kind === 'serve') {
    return id
      ? `pisahkan dan sajikan; target tetap ${step.targetVolumeMl} ml`
      : `separate and serve; target stays ${step.targetVolumeMl} ml`;
  }
  if (kind === 'pour' && (step.pourVolumeMl ?? 0) <= 0) {
    const isPrep = /prep|dose|siap|timbang/i.test(`${step.id} ${step.label}`);
    if (isPrep) {
      return id
        ? `siapkan dosis dan filter; target tetap ${step.targetVolumeMl} ml`
        : `prep dose and filter; target stays ${step.targetVolumeMl} ml`;
    }
    return id
      ? `siapkan peralatan; target tetap ${step.targetVolumeMl} ml`
      : `prepare equipment; target stays ${step.targetVolumeMl} ml`;
  }
  if (plan?.brewMode === 'iced' && step.pourVolumeMl > 0) {
    return id
      ? `tuang ${step.pourVolumeMl} ml hingga target ${step.targetVolumeMl} ml air panas`
      : `pour ${step.pourVolumeMl} ml to reach ${step.targetVolumeMl} ml hot water`;
  }
  return id
    ? `tuang ${step.pourVolumeMl} ml hingga mencapai ${step.targetVolumeMl} ml`
    : `pour ${step.pourVolumeMl} ml to reach ${step.targetVolumeMl} ml`;
}

export function buildPlanRecipeSteps(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  return plan.steps.map((step) =>
    id
      ? `${step.label} (${formatTime(step.startSeconds)}): ${buildPlanRecipeStepAction(step, locale, plan)}. ${step.hybridInstruction || step.note}`
      : `${step.label} (${formatTime(step.startSeconds)}): ${buildPlanRecipeStepAction(step, locale, plan)}. ${step.hybridInstruction || step.note}`
  );
}

export function buildPlanRecipeIngredients(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  const waterIngredientName = plan.methodFamily === 'espresso'
    ? (id ? 'Hasil espresso' : 'Espresso yield')
    : plan.methodFamily === 'cold_brew'
      ? (id ? 'Air dingin' : 'Cool water')
      : id
        ? (plan.iceMl > 0 ? 'Total air akhir' : 'Air')
        : (plan.iceMl > 0 ? 'Final total water' : 'Water');
  return [
    { name: id ? 'Kopi' : 'Coffee', amount: `${plan.doseG} g` },
    { name: waterIngredientName, amount: `${plan.totalWaterMl} ml` },
    ...(plan.iceMl > 0 ? [{ name: id ? 'Air panas seduh' : 'Hot brew water', amount: `${plan.hotWaterMl} ml` }] : []),
    ...(plan.waterBrandLabel
      ? [{
        name: id ? 'Sumber air' : 'Water source',
        amount: `${plan.waterBrandLabel}${plan.waterCustomized ? (id ? ' (disesuaikan)' : ' (customized)') : ''}`,
      }]
      : []),
    { name: id ? 'Mineral air' : 'Water minerals', amount: `TDS ${plan.waterMinerals.tdsPpm} ppm · GH ${plan.waterMinerals.hardnessPpm} ppm · KH ${plan.waterMinerals.alkalinityPpm} ppm` },
    ...(plan.iceMl > 0 ? [{ name: id ? 'Es' : 'Ice', amount: `${plan.iceMl} ml / g` }] : []),
  ];
}

export function buildLocalizedPlanRecipeName(plan: BrewPlan, locale?: string) {
  const fallback = isIndonesianLocale(locale) ? 'AI Seduh' : 'AI Brew';
  const coffeeName = localizeAiBrewDynamicText(plan.coffeeName || fallback, locale);
  const targetLabel = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, locale);
  return `${coffeeName} · ${targetLabel}`;
}

export function buildLocalizedPlanRecipeDescription(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  const gear = `${plan.dripper.name} + ${plan.grinder.name}`;
  const split = plan.iceMl > 0
    ? (id ? ` Split ${plan.hotWaterMl} ml panas / ${plan.iceMl} ml es. Rasio final 1:${formatBaristaRatio(plan.finalBeverageRatio)}, konsentrat panas 1:${formatBaristaRatio(plan.hotExtractionRatio)}.` : ` Split ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice. Final ratio 1:${formatBaristaRatio(plan.finalBeverageRatio)}, hot concentrate 1:${formatBaristaRatio(plan.hotExtractionRatio)}.`)
    : '';
  const waterSource = plan.waterBrandLabel
    ? (id
      ? ` Air: ${plan.waterBrandLabel}${plan.waterCustomized ? ' (disesuaikan)' : ''}.`
      : ` Water: ${plan.waterBrandLabel}${plan.waterCustomized ? ' (customized)' : ''}.`)
    : (id ? ' Air: input mineral manual.' : ' Water: manual mineral input.');
  const summary = localizeAiBrewSummary(plan, locale);
  return id
    ? `${summary} Perangkat: ${gear}.${split}${waterSource}`
    : `${summary} Gear: ${gear}.${split}${waterSource}`;
}

export function buildLocalizedPlanRecipeSteps(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  return plan.steps.map((step) => {
    const stepTime = formatAiBrewTimeForLanguage(step.startSeconds, locale);
    return id
      ? `${localizeAiBrewStepLabel(step.label, locale)} (${stepTime}): ${buildPlanRecipeStepAction(step, locale, plan)}. ${localizeAiBrewDynamicText(step.hybridInstruction || step.note, locale)}`
      : `${localizeAiBrewStepLabel(step.label, locale)} (${stepTime}): ${buildPlanRecipeStepAction(step, locale, plan)}. ${localizeAiBrewDynamicText(step.hybridInstruction || step.note, locale)}`;
  });
}

export function buildBrewPlanRecipeSignature(plan: Pick<
  BrewPlan,
  'finalBeverageRatio' | 'hotExtractionRatio' | 'totalWaterMl' | 'hotWaterMl' | 'iceMl' | 'waterTempC' | 'totalTimeSeconds' | 'steps'
>) {
  return JSON.stringify({
    finalBeverageRatio: roundTo(plan.finalBeverageRatio, 2),
    hotExtractionRatio: roundTo(plan.hotExtractionRatio, 2),
    totalWaterMl: roundTo(plan.totalWaterMl, 0),
    hotWaterMl: roundTo(plan.hotWaterMl, 0),
    iceMl: roundTo(plan.iceMl, 0),
    waterTempC: roundTo(plan.waterTempC, 1),
    totalTimeSeconds: Math.round(plan.totalTimeSeconds),
    steps: plan.steps.map((step) => ({
      startSeconds: Math.round(step.startSeconds),
      pourVolumeMl: roundTo(step.pourVolumeMl, 0),
      targetVolumeMl: roundTo(step.targetVolumeMl, 0),
    })),
  });
}

export function buildPlanRecipeMetadata(plan: BrewPlan) {
  return {
    planId: plan.id,
    fingerprint: plan.fingerprint,
    brewMode: plan.brewMode,
    process: plan.process,
    variety: plan.variety,
    roastLevel: plan.roastLevel,
    beanAltitudeMasl: plan.beanProfile.altitudeMasl,
    beanDensityGml: plan.beanProfile.beanDensityGml,
    beanRoastDevelopment: plan.beanProfile.roastDevelopment,
    beanSolubility: plan.beanProfile.solubility,
    beanProfileSummary: plan.beanProfile.summary,
    targetProfileId: plan.targetProfileId,
    targetProfileLabel: plan.targetProfileLabel,
    dripperId: plan.dripper.id,
    dripperName: plan.dripper.name,
    grinderId: plan.grinder.id,
    grinderName: plan.grinder.name,
    waterMode: plan.waterMode,
    waterRegion: plan.waterRegion,
    waterBrandId: plan.waterBrandId,
    waterBrandLabel: plan.waterBrandLabel,
    waterPresetStatus: plan.waterPresetStatus,
    waterPublishState: plan.waterPublishState,
    waterIsBrewReady: plan.waterIsBrewReady,
    waterBrewBlockReason: plan.waterBrewBlockReason,
    waterBrandMarkets: plan.waterBrandMarkets,
    waterBrandVerification: plan.waterBrandVerification,
    waterBrandSourceUrls: plan.waterBrandSourceUrls,
    waterMineralDerivation: plan.waterMineralDerivation,
    waterCustomized: plan.waterCustomized,
    waterStyleLabel: plan.waterMinerals.styleLabel,
    waterTdsPpm: plan.waterMinerals.tdsPpm,
    waterHardnessPpm: plan.waterMinerals.hardnessPpm,
    waterAlkalinityPpm: plan.waterMinerals.alkalinityPpm,
    deviceProfileId: plan.deviceProfileId,
    deviceProfileLabel: plan.deviceProfileLabel,
    deviceProfileMode: plan.deviceProfileMode,
    grindSettingReference: plan.grindSettingReference,
    grindSettingMode: plan.grindSettingMode,
    grindCalibrationRequired: plan.grindCalibrationRequired,
    provenanceAttentionNeeded: plan.provenanceAttentionNeeded,
    catalogVersion: plan.catalogVersion,
    totalTimeSeconds: plan.totalTimeSeconds,
    totalWaterMl: plan.totalWaterMl,
    hotWaterMl: plan.hotWaterMl,
    iceMl: plan.iceMl,
    waterTempC: plan.waterTempC,
    ratio: plan.recommendedRatio,
    finalBeverageRatio: plan.finalBeverageRatio,
    hotExtractionRatio: plan.hotExtractionRatio,
    hotWaterSharePercent: plan.hotWaterSharePercent,
    iceSharePercent: plan.iceSharePercent,
    warnings: plan.warnings,
    confidenceNotes: plan.confidenceNotes,
    extractionRationale: plan.extractionRationale,
    steps: plan.steps.map((step) => ({
      id: step.id,
      label: step.label,
      kind: step.kind || 'pour',
      startSeconds: step.startSeconds,
      targetVolumeMl: step.targetVolumeMl,
      pourVolumeMl: step.pourVolumeMl,
      flowRateMlPerSec: step.flowRateMlPerSec || [0, 0],
      pourPath: step.pourPath || (step.kind === 'press' ? 'press' : step.kind === 'heat' ? 'heat_control' : 'center'),
      pourHeight: step.pourHeight || 'low',
      agitationLevel: step.agitationLevel || 'low',
      hybridInstruction: step.hybridInstruction,
    })),
  };
}







