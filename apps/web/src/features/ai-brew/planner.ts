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
  findProcessEntry,
  findTargetProfile,
  findVarietyEntry,
  findWaterBrand,
} from './catalog.ts';
import {
  formatAiBrewTime,
  isIndonesianAiBrewLanguage,
  localizeAiBrewDynamicText,
  localizeAiBrewStepLabel,
  localizeAiBrewSummary,
  localizeAiBrewTargetProfile,
} from './localization.ts';
import type {
  AiBrewCatalog,
  AiBrewFormState,
  AiBrewMethodFamily,
  BeanProfileState,
  BeanRoastDevelopment,
  BeanSolubility,
  BrewJournalEntry,
  BrewPlan,
  BrewPlanStep,
  DeviceProfileMode,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderSettingReference,
  ParsedNumericRange,
  ProcessCatalogEntry,
  VarietyCatalogEntry,
  VerificationLevel,
  WaterBrandProfile,
  WaterGuidance,
  WaterMineralInput,
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
const DEFAULT_GRINDER_PRIORITY = ['1zpresso-k-ultra'];
const DEFAULT_TARGET_PROFILE_PRIORITY = ['balance_clean'];
const AI_BREW_CORE_INPUT_TOTAL = 7;
const AI_BREW_OPTIONAL_SIGNAL_TOTAL = 7;
const AI_BREW_REFERENCE_SIGNAL_TOTAL = 3;

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

function formatTime(totalSeconds: number) {
  return formatAiBrewTime(totalSeconds);
}

function resolveMethodId(methodFamily: AiBrewMethodFamily): BrewMethodId {
  switch (methodFamily) {
    case 'chemex':
      return 'chemex';
    case 'kalita_wave':
      return 'kalita_wave';
    case 'melitta':
      return 'melitta';
    case 'clever_dripper':
      return 'clever_dripper';
    case 'origami':
      return 'origami';
    case 'april':
      return 'april';
    case 'kono':
      return 'kono';
    case 'v60':
    default:
      return 'v60';
  }
}

function resolveIcedMethodId(methodFamily: AiBrewMethodFamily): BrewMethodId {
  switch (methodFamily) {
    case 'chemex':
      return 'chemex_iced';
    case 'kalita_wave':
      return 'kalita_wave_iced';
    case 'melitta':
      return 'melitta_iced';
    case 'clever_dripper':
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

function joinInstructionText(...parts: Array<string | undefined>) {
  return Array.from(
    new Set(
      parts
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).join(' ');
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

  const minGapSeconds = 10;
  const intentForFinalWindow = resolveTargetIntent(context.targetProfileLabel);
  const extractionForFinalWindow = resolveExtractionResistance(context);
  const adaptiveFinalWindowSeconds = Math.round(clamp(
    20
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
    10,
    36,
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

  const intent = resolveTargetIntent(context.targetProfileLabel);
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
  return adapted;
}

type TargetIntent = 'acidity' | 'body' | 'sweetness' | 'balanced';
type OriginProfileId =
  | 'east_africa_floral'
  | 'latin_america_balanced'
  | 'brazil_sweet'
  | 'indonesia_structured'
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

type OriginTargetMethodAdjustment = CalibrationAdjustment & {
  finalWindowDeltaSec: number;
  directionalShift: number;
  middleShift: number;
  firstShareDelta: number;
  middleShareDelta: number;
  lastShareDelta: number;
};

type AdaptiveShareContext = {
  targetProfileLabel: string;
  methodFamily: AiBrewMethodFamily;
  filterStyle: DeviceBrewProfile['filterStyle'];
  brewMode: 'hot' | 'iced';
  roastLevel: RoastLevel;
  roastDevelopment?: BeanRoastDevelopment;
  solubility?: BeanSolubility;
  hardnessPpm: number;
  alkalinityPpm: number;
  processId?: string;
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

function resolveTargetIntent(label: string): TargetIntent {
  const normalized = label.toLowerCase();
  if (normalized.includes('acid')) return 'acidity';
  if (normalized.includes('body') || normalized.includes('depth')) return 'body';
  if (normalized.includes('sweet')) return 'sweetness';
  return 'balanced';
}

const CLARITY_PROCESS_IDS = new Set([
  'washed',
  'double_washed',
  'fully_washed',
  'anaerobic_washed',
  'aerobic_fermentation',
]);

const SWEETNESS_PROCESS_IDS = new Set([
  'natural',
  'honey',
  'yellow_honey',
  'red_honey',
  'black_honey',
  'white_honey',
  'pulped_natural',
  'anaerobic_honey',
  'lactic',
  'yeast_inoculated',
]);

const BODY_PROCESS_IDS = new Set([
  'natural',
  'wet_hulled',
  'anaerobic',
  'anaerobic_natural',
  'carbonic_maceration',
  'extended_fermentation',
  'thermal_shock',
  'decaf',
]);

const CLARITY_VARIETY_IDS = new Set([
  'geisha',
  'abyssinia',
  'ethiopian_heirloom',
  'sl28',
  'sl34',
  'wush_wush',
  'typica',
]);

const SWEETNESS_VARIETY_IDS = new Set([
  'bourbon',
  'caturra',
  'catuai',
  'arara',
  'blue_mountain',
  'gesha_1931',
]);

const BODY_VARIETY_IDS = new Set([
  'pacamara',
  'maragogipe',
  'robusta',
  'liberica',
  's795',
  'sigarar_utang',
]);

const ORIGIN_PROFILE_RULES: Array<{
  profileId: OriginProfileId;
  label: string;
  patterns: RegExp[];
}> = [
  {
    profileId: 'east_africa_floral',
    label: 'East Africa floral highlands',
    patterns: [
      /\bethiopia\b/i,
      /\byirgacheffe\b/i,
      /\bguji\b/i,
      /\bsidamo\b/i,
      /\blimu\b/i,
      /\bkenya\b/i,
      /\bnyeri\b/i,
      /\bkirinyaga\b/i,
      /\brwanda\b/i,
      /\bburundi\b/i,
    ],
  },
  {
    profileId: 'latin_america_balanced',
    label: 'Latin America balanced sweetness',
    patterns: [
      /\bcolombia\b/i,
      /\bhuila\b/i,
      /\bnarino\b/i,
      /\bcauca\b/i,
      /\bguatemala\b/i,
      /\bhonduras\b/i,
      /\bel\s*salvador\b/i,
      /\bnicaragua\b/i,
      /\bcosta\s*rica\b/i,
      /\bpanama\b/i,
      /\bperu\b/i,
    ],
  },
  {
    profileId: 'brazil_sweet',
    label: 'Brazil comfort sweetness',
    patterns: [
      /\bbrazil\b/i,
      /\bcerrado\b/i,
      /\bmogiana\b/i,
      /\bmantiqueira\b/i,
      /\bsul\s+de\s+minas\b/i,
    ],
  },
  {
    profileId: 'indonesia_structured',
    label: 'Indonesia structured profile',
    patterns: [
      /\bindonesia\b/i,
      /\bsumatra\b/i,
      /\baceh\b/i,
      /\bgayo\b/i,
      /\blintong\b/i,
      /\bjava\b/i,
      /\bbali\b/i,
      /\bflores\b/i,
      /\btoraja\b/i,
      /\bsulawesi\b/i,
      /\bpapua\b/i,
    ],
  },
  {
    profileId: 'asia_highland',
    label: 'Asia highland clarity',
    patterns: [
      /\bchina\b/i,
      /\byunnan\b/i,
      /\bbaoshan\b/i,
      /\bpuer\b/i,
      /\bpu'er\b/i,
      /\btaiwan\b/i,
      /\bthailand\b/i,
      /\bvietnam\b/i,
      /\blaos\b/i,
    ],
  },
];

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
    const matchedOrigins = rule.patterns
      .filter((pattern) => pattern.test(normalized))
      .map((pattern) => pattern.source.replace(/\\b/g, '').replace(/[\\^$.*+?()[\]{}|]/g, ' '))
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

function deriveOriginAdjustment(
  input: AiBrewFormState,
  processEntry: ProcessCatalogEntry | undefined,
  varietyEntry: VarietyCatalogEntry | undefined,
  targetProfileLabel: string,
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

  const targetIntent = resolveTargetIntent(targetProfileLabel);
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
  const baseline = methodFamily === 'chemex'
    ? 20
    : methodFamily === 'clever_dripper'
      ? 18
      : methodFamily === 'kalita_wave' || methodFamily === 'melitta'
        ? 16
        : 15;
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
    : methodFamily === 'clever_dripper'
      ? 0.7
      : methodFamily === 'april'
        ? 0.85
        : 1;
  const normalizedOffset = clamp(((doseG - nominalDoseG) / 6) * responseScale, -1, 1);
  const adjustment = createNeutralCalibrationAdjustment();

  adjustment.ratioDelta = roundTo(normalizedOffset * 0.05, 2);
  adjustment.tempDeltaC = roundTo(normalizedOffset * -0.2, 1);
  adjustment.brewTimeDeltaSec = Math.round(normalizedOffset * -7);
  adjustment.grindBias = normalizedOffset <= -0.35 ? 'finer' : normalizedOffset >= 0.35 ? 'coarser' : 'same';

  if (Math.abs(normalizedOffset) >= 0.2) {
    adjustment.notes.push(
      normalizedOffset < 0
        ? `Dose sits below the nominal ${methodFamily.replace(/_/g, ' ')} service bed depth, so extraction was tightened slightly.`
        : `Dose sits above the nominal ${methodFamily.replace(/_/g, ' ')} service bed depth, so extraction was opened slightly.`,
    );
    adjustment.confidenceNotes.push(`Dose calibration active around ${doseG} g on ${methodFamily.replace(/_/g, ' ')}.`);
  }

  return {
    ...adjustment,
    nominalDoseG,
    normalizedOffset,
  };
}

function deriveFlavorAlignmentAdjustment(params: {
  targetProfileLabel: string;
  roastLevel: RoastLevel;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
  waterProfile: ReturnType<typeof deriveWaterMineralProfile>;
  originAdjustment: OriginCalibrationAdjustment;
}): FlavorAlignmentAdjustment {
  const scores = {
    acidity: 0,
    sweetness: 0,
    body: 0,
  };
  const targetIntent = resolveTargetIntent(params.targetProfileLabel);
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
    case 'brazil_sweet':
      scores.sweetness += 0.65;
      scores.body += 0.3;
      break;
    case 'indonesia_structured':
      scores.body += 0.7;
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

function resolveIcedHotWaterShare(params: {
  methodFamily: AiBrewMethodFamily;
  roastLevel: RoastLevel;
  targetProfileLabel: string;
  processEntry?: ProcessCatalogEntry;
  originAdjustment: OriginCalibrationAdjustment;
  flavorAlignment: FlavorAlignmentAdjustment;
}) {
  const icedMethod = BREW_METHOD_MAP[resolveIcedMethodId(params.methodFamily)];
  const baseShare = icedMethod.japaneseSplit?.hotWaterShare || BREW_METHOD_MAP.v60_japanese_iced.japaneseSplit?.hotWaterShare || 0.6;
  const familyShareProfile = {
    base: baseShare,
    min: Math.max(0.52, roundTo(baseShare - 0.04, 2)),
    max: Math.min(0.68, roundTo(baseShare + 0.04, 2)),
  };

  let hotWaterShare = familyShareProfile.base;
  const targetIntent = resolveTargetIntent(params.targetProfileLabel);
  if (targetIntent === 'body') hotWaterShare += 0.02;
  else if (targetIntent === 'sweetness') hotWaterShare += 0.015;
  else if (targetIntent === 'acidity') hotWaterShare -= 0.015;

  if (params.roastLevel === 'light') hotWaterShare -= 0.01;
  else if (params.roastLevel === 'dark') hotWaterShare += 0.01;

  const processId = params.processEntry?.id || '';
  if (CLARITY_PROCESS_IDS.has(processId)) hotWaterShare -= 0.01;
  if (BODY_PROCESS_IDS.has(processId)) hotWaterShare += 0.01;

  if (params.originAdjustment.profileId === 'east_africa_floral') hotWaterShare -= 0.005;
  if (params.originAdjustment.profileId === 'brazil_sweet' || params.originAdjustment.profileId === 'indonesia_structured') {
    hotWaterShare += 0.005;
  }

  if (params.flavorAlignment.dominantAxis === 'acidity') {
    hotWaterShare -= 0.01 * params.flavorAlignment.intensity;
  } else if (params.flavorAlignment.dominantAxis === 'body') {
    hotWaterShare += 0.01 * params.flavorAlignment.intensity;
  } else if (params.flavorAlignment.dominantAxis === 'sweetness') {
    hotWaterShare += 0.005 * params.flavorAlignment.intensity;
  }

  return roundTo(clamp(hotWaterShare, familyShareProfile.min, familyShareProfile.max), 2);
}

function deriveMethodFamilyAdjustment(params: {
  methodFamily: AiBrewMethodFamily;
  filterStyle: DeviceBrewProfile['filterStyle'];
  brewMode: 'hot' | 'iced';
  targetProfileLabel: string;
}): MethodFamilyAdjustment {
  const targetIntent = resolveTargetIntent(params.targetProfileLabel);
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
      adjustment.sequenceSignature = 'clarity_flow';
      adjustment.ratioDelta = targetIntent === 'sweetness' || targetIntent === 'body' ? 0 : 0.03;
      adjustment.tempDeltaC = targetIntent === 'sweetness' ? 0.1 : -0.1;
      adjustment.brewTimeDeltaSec = targetIntent === 'sweetness' ? 1 : -3;
      adjustment.grindBias = targetIntent === 'sweetness' ? 'same' : 'coarser';
      adjustment.notes.push('Origami family stays agile and transparent, with a slightly cleaner and faster cone-flow signature.');
      break;
    case 'kono':
      adjustment.sequenceSignature = 'sweet_contact';
      adjustment.ratioDelta = -0.04;
      adjustment.tempDeltaC = 0.2;
      adjustment.brewTimeDeltaSec = 8;
      adjustment.grindBias = 'finer';
      adjustment.notes.push('Kono family leans toward sweeter center extraction with longer contact stability through the middle phase.');
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
      adjustment.sequenceSignature = 'fast_even';
      adjustment.ratioDelta = 0.08;
      adjustment.tempDeltaC = -0.5;
      adjustment.brewTimeDeltaSec = -12;
      adjustment.grindBias = 'coarser';
      adjustment.notes.push('April-style flat-bottom brewing keeps a faster, lower-agitation service profile with evenly controlled pulses.');
      break;
    case 'chemex':
      adjustment.sequenceSignature = 'thick_filter';
      adjustment.ratioDelta = 0.16;
      adjustment.tempDeltaC = 0.1;
      adjustment.brewTimeDeltaSec = 18;
      adjustment.grindBias = 'coarser';
      adjustment.notes.push('Chemex family runs a slightly higher ratio and longer window to account for thicker filter resistance and cleaner drawdown.');
      break;
    case 'clever_dripper':
      adjustment.sequenceSignature = 'immersion_release';
      adjustment.ratioDelta = -0.15;
      adjustment.tempDeltaC = -0.3;
      adjustment.brewTimeDeltaSec = 20;
      adjustment.grindBias = 'coarser';
      adjustment.notes.push('Clever Dripper family protects immersion sweetness first, then releases through a calmer finishing phase.');
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
  const targetIntent = resolveTargetIntent(params.targetProfileLabel);
  if (targetIntent === 'balanced') return adjustment;

  const methodLabel = params.methodFamily.replace(/_/g, ' ');

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
        adjustment.ratioDelta = -0.02;
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
  adjustment.confidenceNotes.push(`Target-method calibration active: ${targetIntent} x ${methodLabel}.`);
  return adjustment;
}

function resolveOriginProfileDisplayLabel(profileId: OriginProfileId) {
  switch (profileId) {
    case 'east_africa_floral':
      return 'East Africa floral';
    case 'latin_america_balanced':
      return 'Latin America balanced';
    case 'brazil_sweet':
      return 'Brazil sweet';
    case 'indonesia_structured':
      return 'Indonesia structured';
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

  const targetIntent = resolveTargetIntent(params.targetProfileLabel);
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
    case 'chemex':
      return 8;
    case 'clever_dripper':
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

function resolveMethodFamilyDirectionalShift(methodFamily: AiBrewMethodFamily) {
  switch (methodFamily) {
    case 'v60':
    case 'origami':
      return 0.18;
    case 'kono':
      return -0.22;
    case 'chemex':
      return -0.12;
    case 'clever_dripper':
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

  const base = normalizeSharesToUnit(profile.steps.map((step) => step.share));
  const intent = resolveTargetIntent(context.targetProfileLabel);

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
  return rebalanceSharesWithinBounds(shifted, minShare, maxShare);
}

type AdaptiveStepPhase = 'bloom' | 'early_middle' | 'late_middle' | 'finish';

function resolveAdaptiveStepPhase(index: number, count: number): AdaptiveStepPhase {
  if (index <= 0) return 'bloom';
  if (index >= count - 1) return 'finish';
  if (count <= 3) return 'early_middle';
  const middlePivot = Math.floor((count - 1) / 2);
  return index <= middlePivot ? 'early_middle' : 'late_middle';
}

function buildAdaptivePhaseFocusCue(context: AdaptiveShareContext, phase: AdaptiveStepPhase) {
  const targetIntent = resolveTargetIntent(context.targetProfileLabel);
  const focus = context.flavorDirection === 'balanced' ? targetIntent : context.flavorDirection;

  switch (phase) {
    case 'bloom':
      if (focus === 'acidity') return 'Keep the opening gentle so clarity stays intact.';
      if (focus === 'body') return 'Make sure the bed is fully wet so the cup does not run thin later.';
      if (focus === 'sweetness') return 'Keep the bloom calm so the cup can build a sweeter middle.';
      return 'Open the bed evenly before moving to the next checkpoint.';
    case 'early_middle':
      if (focus === 'acidity') return 'Keep the middle phase clean and avoid pushing the walls.';
      if (focus === 'body') return 'Hold slurry depth steady through the middle phase.';
      if (focus === 'sweetness') return 'Use this phase to build sweetness without spiking agitation.';
      return 'Keep the flow stable and repeatable through the middle phase.';
    case 'late_middle':
      if (focus === 'acidity') return 'Let the later middle phase stay light so the finish does not flatten.';
      if (focus === 'body') return 'Carry enough contact here to keep structure in the cup.';
      if (focus === 'sweetness') return 'Keep the later middle phase level so sweetness lands cleanly.';
      return 'Keep the later middle phase controlled and level.';
    case 'finish':
    default:
      if (focus === 'acidity') return 'Finish cleanly and avoid heavy late agitation.';
      if (focus === 'body') return 'Finish with enough control to keep the cup dense, not muddy.';
      if (focus === 'sweetness') return 'Finish calmly so the aftertaste stays sweet and round.';
      return 'Finish calmly and let the drawdown stay tidy.';
  }
}

function buildAdaptiveDoseCue(context: AdaptiveShareContext) {
  if (context.doseScale <= -0.35) {
    return 'This lighter bed depth needs cleaner flow and shorter idle gaps between pours.';
  }
  if (context.doseScale >= 0.35) {
    return 'This deeper bed can carry a bit more contact, so do not rush the middle checkpoints.';
  }
  return undefined;
}

function buildMethodFamilyStepInstruction(params: {
  methodFamily: AiBrewMethodFamily;
  phase: AdaptiveStepPhase;
  context: AdaptiveShareContext;
  fallbackNote: string;
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
          ? 'Land the final hot water cleanly and let it drop over the ice without dragging the walls.'
          : 'Land the last pour gently, then let the cone drain on its own without reopening the wall path.';
      }
      break;
    case 'origami':
      if (phase === 'bloom') {
        quickNote = 'Keep the bloom light and even so the faster cone flow stays clean.';
        detail = 'Wet the bed evenly, but keep the bloom light; Origami opens quickly and does not need extra turbulence to start well.';
      } else if (phase === 'early_middle') {
        quickNote = 'Use compact pulses and keep the flow agile through the middle.';
        detail = 'Keep the pulses compact and controlled so the Origami keeps its faster, cleaner cone-flow signature.';
      } else if (phase === 'late_middle') {
        quickNote = 'Hold the later middle short and tidy so transparency stays high.';
        detail = 'Avoid stretching the late middle phase; let the bed settle between small pulses rather than forcing more contact.';
      } else {
        quickNote = 'Close with a light finishing pour and let the fast drawdown stay clean.';
        detail = 'Use a light closing pour and let the final drawdown run without extra agitation so the finish stays crisp.';
      }
      break;
    case 'kono':
      if (phase === 'bloom') {
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
      if (phase === 'bloom') {
        quickNote = 'Wet the flat bed edge to edge, then let it settle level before building the cup.';
        detail = 'Make sure the Kalita bed is fully saturated edge to edge, then let the slurry settle level before the next pulse.';
      } else if (phase === 'early_middle') {
        quickNote = 'Keep the flat bed level with even pulses from center to edge.';
        detail = 'Use even pulses that cover the flat bed without flooding one side; the goal is a level slurry, not a dramatic spiral.';
      } else if (phase === 'late_middle') {
        quickNote = 'Protect the later middle with flat, even contact across the bed.';
        detail = 'Keep the late middle level and even so the Kalita holds body without stalling the final drawdown.';
      } else {
        quickNote = 'Land the final water evenly to keep drawdown flat and tidy.';
        detail = 'Finish by laying the final water evenly across the flat bed, then let the drawdown complete without a last-second swirl.';
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
      if (phase === 'bloom') {
        quickNote = 'Use a short, even bloom and avoid excess swirl so the flat bed stays fast.';
        detail = 'Start with a short, even bloom and skip extra agitation; April-style brewing wants a quick, settled opening.';
      } else if (phase === 'early_middle') {
        quickNote = 'Use short, low-agitation pulses and reset the kettle quickly between pours.';
        detail = 'Keep the early middle pulse-based and low-agitation; let the bed reset briefly instead of stretching the contact window.';
      } else if (phase === 'late_middle') {
        quickNote = 'Keep the late pulses quick and even so the cup stays open.';
        detail = 'Use another short, even pulse and keep the kettle resets clean; April should feel fast and organized, not saturated and slow.';
      } else {
        quickNote = 'Finish early and clean; avoid stretching the last phase.';
        detail = 'Close the recipe without dragging the last phase out; the finish should stay short, clean, and low-agitation.';
      }
      break;
    case 'chemex':
      if (phase === 'bloom') {
        quickNote = 'Fully wet the thick filter path and the coffee bed before pushing the next pour.';
        detail = 'Make sure the thick Chemex paper and full bed are properly wet early, then give the bloom time to open before building more volume.';
      } else if (phase === 'early_middle') {
        quickNote = 'Use a steady stream and let the thick filter manage the flow.';
        detail = 'Build the middle with a steady stream and let the thicker filter resistance do its work instead of forcing extra turbulence.';
      } else if (phase === 'late_middle') {
        quickNote = 'Keep the later middle open and avoid flooding the filter wall.';
        detail = 'Protect the late middle by keeping the stream steady and away from the filter wall so the drawdown does not choke.';
      } else {
        quickNote = 'Finish before the filter stalls and let the drawdown stay open.';
        detail = 'Land the final water before the filter slows too far down, then let the Chemex finish without extra swirling or wall rinsing.';
      }
      break;
    case 'clever_dripper':
      if (phase === 'bloom') {
        quickNote = 'Saturate the full bed evenly and let immersion start building sweetness.';
        detail = 'Wet the entire bed evenly and let immersion start doing the work; the opening should feel full, not rushed.';
      } else if (phase === 'early_middle') {
        quickNote = 'Use the middle phase to build immersion gently rather than chasing more turbulence.';
        detail = 'Add the next water calmly and let immersion carry extraction; there is no need to force agitation the way you would on an open dripper.';
      } else if (phase === 'late_middle') {
        quickNote = 'Keep the later immersion phase quiet so the release stays clean.';
        detail = 'Hold the later middle phase calm and avoid stirring; Clever rewards a settled bed before the release.';
      } else {
        quickNote = 'Open the release cleanly and let the bed drain without stirring the finish.';
        detail = 'Open the valve cleanly and let the bed release on its own; do not stir or shake the brewer during the finishing drain.';
      }
      break;
    default:
      break;
  }

  const focusCue = buildAdaptivePhaseFocusCue(context, phase);
  const doseCue = buildAdaptiveDoseCue(context);

  return {
    note: quickNote,
    hybridInstruction: joinInstructionText(detail, focusCue, phase === 'finish' ? doseCue : undefined, fallbackNote),
  };
}

function buildSteps(
  profile: DeviceBrewProfile,
  hotWaterMl: number,
  totalTimeSeconds: number,
  adaptiveShareContext: AdaptiveShareContext,
): BrewPlanStep[] {
  if (profile.steps.length === 0) return [];
  const adaptedStartSeconds = buildAdaptiveStepStartSeconds(profile, totalTimeSeconds, adaptiveShareContext);
  const adaptedShares = buildAdaptiveStepShares(profile, adaptiveShareContext);

  let runningTotal = 0;
  return profile.steps.map((step, index) => {
    const isLastStep = index === profile.steps.length - 1;
    const remainingWater = Math.max(0, hotWaterMl - runningTotal);
    const share = adaptedShares[index] ?? step.share;
    const rawPour = isLastStep ? remainingWater : roundTo(hotWaterMl * share, 0);
    const pourVolumeMl = roundTo(Math.min(remainingWater, Math.max(0, rawPour)), 0);
    runningTotal = isLastStep ? hotWaterMl : roundTo(runningTotal + pourVolumeMl, 0);
    const phase = resolveAdaptiveStepPhase(index, profile.steps.length);
    const phaseInstruction = buildMethodFamilyStepInstruction({
      methodFamily: adaptiveShareContext.methodFamily,
      phase,
      context: adaptiveShareContext,
      fallbackNote: step.note,
    });

    return {
      id: step.id,
      label: step.label,
      startSeconds: adaptedStartSeconds[index] ?? step.startSeconds,
      pourVolumeMl,
      targetVolumeMl: runningTotal,
      note: phaseInstruction.note,
      hybridInstruction: phaseInstruction.hybridInstruction,
    };
  });
}

function buildSummary(plan: Pick<
  BrewPlan,
  'brewMode' | 'coffeeName' | 'dripper' | 'targetProfileLabel' | 'recommendedRatio' | 'waterTempC' | 'totalTimeSeconds'
>) {
  return `${plan.brewMode === 'iced' ? 'Ice brew' : 'Hot brew'} plan for ${plan.coffeeName || 'your coffee'} on ${plan.dripper.name}, tuned for ${plan.targetProfileLabel.toLowerCase()} at 1:${plan.recommendedRatio}, ${plan.waterTempC}°C, around ${formatTime(plan.totalTimeSeconds)}.`;
}

function deriveBeanProfileAdjustment(input: AiBrewFormState): {
  ratioDelta: number;
  tempDeltaC: number;
  brewTimeDeltaSec: number;
  grindBias: GrindBias;
  notes: string[];
  confidenceNotes: string[];
  state: BeanProfileState;
} {
  const altitudeMasl = parseOptionalNumber('Bean altitude', input.altitudeMasl || '', 0, 3200);
  const beanDensityGml = parseOptionalNumber('Bean density', input.beanDensityGml || '', 0.55, 0.95);
  const roastDevelopment = (input.roastDevelopment || '') as BeanRoastDevelopment;
  const solubility = (input.solubility || '') as BeanSolubility;

  let ratioDelta = 0;
  let tempDeltaC = 0;
  let brewTimeDeltaSec = 0;
  const grindBiases: GrindBias[] = ['same'];
  const notes: string[] = [];
  const confidenceNotes: string[] = [];

  if (altitudeMasl !== null) {
    if (altitudeMasl >= 1800) {
      tempDeltaC += 0.35;
      brewTimeDeltaSec += 6;
      grindBiases.push('finer');
      notes.push('High-altitude coffee usually benefits from a slightly tighter, hotter extraction.');
    } else if (altitudeMasl >= 1500) {
      tempDeltaC += 0.2;
      brewTimeDeltaSec += 3;
      notes.push('Higher altitude adds a small extraction lift to keep the cup fully developed.');
    } else if (altitudeMasl <= 1100) {
      tempDeltaC -= 0.2;
      brewTimeDeltaSec -= 3;
      grindBiases.push('coarser');
      notes.push('Lower-altitude coffee can read broader and easier to extract, so the profile is softened slightly.');
    }
  }

  if (beanDensityGml !== null) {
    if (beanDensityGml >= 0.73) {
      tempDeltaC += 0.25;
      brewTimeDeltaSec += 5;
      ratioDelta -= 0.03;
      grindBiases.push('finer');
      notes.push('Higher bean density adds a small extraction push to keep sweetness and clarity aligned.');
    } else if (beanDensityGml <= 0.67) {
      tempDeltaC -= 0.25;
      brewTimeDeltaSec -= 5;
      ratioDelta += 0.03;
      grindBiases.push('coarser');
      notes.push('Lower bean density softens the extraction slightly to avoid pushing roasty or woody notes.');
    }
  }

  if (roastDevelopment === 'underdeveloped') {
    tempDeltaC += 0.35;
    brewTimeDeltaSec += 6;
    ratioDelta -= 0.03;
    grindBiases.push('finer');
    notes.push('Underdeveloped roast profile needs a slightly more assertive extraction path.');
  } else if (roastDevelopment === 'developed') {
    tempDeltaC -= 0.35;
    brewTimeDeltaSec -= 6;
    ratioDelta += 0.04;
    grindBiases.push('coarser');
    notes.push('More developed roasting gets a softer extraction path to keep bitterness in check.');
  }

  if (solubility === 'low') {
    tempDeltaC += 0.3;
    brewTimeDeltaSec += 5;
    grindBiases.push('finer');
    notes.push('Low-solubility coffee gets a small extraction lift.');
  } else if (solubility === 'high') {
    tempDeltaC -= 0.3;
    brewTimeDeltaSec -= 5;
    ratioDelta += 0.03;
    grindBiases.push('coarser');
    notes.push('High-solubility coffee is relaxed slightly to keep the cup from running heavy.');
  }

  ratioDelta = clamp(roundTo(ratioDelta, 2), -0.16, 0.16);
  tempDeltaC = clamp(roundTo(tempDeltaC, 1), -1.2, 1.2);
  brewTimeDeltaSec = Math.round(clamp(brewTimeDeltaSec, -20, 20));

  const state: BeanProfileState = {
    altitudeMasl: altitudeMasl ?? undefined,
    beanDensityGml: beanDensityGml ?? undefined,
    roastDevelopment: roastDevelopment || undefined,
    solubility: solubility || undefined,
    active: altitudeMasl !== null || beanDensityGml !== null || Boolean(roastDevelopment) || Boolean(solubility),
    summary:
      altitudeMasl !== null || beanDensityGml !== null || Boolean(roastDevelopment) || Boolean(solubility)
        ? [
            altitudeMasl !== null ? `${Math.round(altitudeMasl)} masl` : null,
            beanDensityGml !== null ? `${roundTo(beanDensityGml, 2)} g/ml` : null,
            roastDevelopment ? roastDevelopment.replace(/_/g, ' ') : null,
            solubility || null,
          ].filter(Boolean).join(' · ')
        : 'No bean-profile modifier active.',
    notes,
  };

  if (state.active) {
    confidenceNotes.push(`Bean profile modifiers active: ${state.summary}.`);
  } else {
    confidenceNotes.push('Bean profile left neutral; no bean-specific modifier was applied.');
  }

  return {
    ratioDelta,
    tempDeltaC,
    brewTimeDeltaSec,
    grindBias: combineBias(...grindBiases),
    notes,
    confidenceNotes,
    state,
  };
}

const PROCESS_CURATED_MODIFIERS: Record<string, NonNullable<ProcessCatalogEntry['numericModifiers']>> = {
  natural: {
    ratioDelta: 0.05,
    tempDeltaC: -0.3,
    brewTimeDeltaSec: -5,
    grindBias: 'coarser',
  },
  honey: {
    ratioDelta: 0.03,
    tempDeltaC: -0.1,
    brewTimeDeltaSec: -2,
    grindBias: 'coarser',
  },
  pulped_natural: {
    ratioDelta: 0.03,
    tempDeltaC: -0.1,
    brewTimeDeltaSec: -2,
    grindBias: 'coarser',
  },
  wet_hulled: {
    ratioDelta: 0.04,
    tempDeltaC: -0.4,
    brewTimeDeltaSec: -6,
    grindBias: 'coarser',
  },
  anaerobic: {
    ratioDelta: 0.07,
    tempDeltaC: -0.4,
    brewTimeDeltaSec: -6,
    grindBias: 'coarser',
  },
  carbonic_maceration: {
    ratioDelta: 0.08,
    tempDeltaC: -0.5,
    brewTimeDeltaSec: -7,
    grindBias: 'coarser',
  },
  extended_fermentation: {
    ratioDelta: 0.06,
    tempDeltaC: -0.4,
    brewTimeDeltaSec: -6,
    grindBias: 'coarser',
  },
  lactic: {
    ratioDelta: 0.05,
    tempDeltaC: -0.3,
    brewTimeDeltaSec: -5,
    grindBias: 'coarser',
  },
  yeast_inoculated: {
    ratioDelta: 0.05,
    tempDeltaC: -0.3,
    brewTimeDeltaSec: -5,
    grindBias: 'coarser',
  },
  thermal_shock: {
    ratioDelta: 0.06,
    tempDeltaC: -0.4,
    brewTimeDeltaSec: -6,
    grindBias: 'coarser',
  },
  decaf: {
    ratioDelta: 0.05,
    tempDeltaC: -0.4,
    brewTimeDeltaSec: -6,
    grindBias: 'coarser',
  },
};

const VARIETY_CURATED_MODIFIERS: Record<string, NonNullable<VarietyCatalogEntry['numericModifiers']>> = {
  geisha: {
    ratioDelta: 0.04,
    tempDeltaC: -0.3,
    brewTimeDeltaSec: -4,
    grindBias: 'coarser',
  },
  abyssinia: {
    ratioDelta: 0.03,
    tempDeltaC: -0.2,
    brewTimeDeltaSec: -3,
    grindBias: 'coarser',
  },
  ethiopian_heirloom: {
    ratioDelta: 0.03,
    tempDeltaC: -0.2,
    brewTimeDeltaSec: -3,
    grindBias: 'coarser',
  },
  sl28: {
    ratioDelta: 0.03,
    tempDeltaC: -0.2,
    brewTimeDeltaSec: -3,
    grindBias: 'coarser',
  },
  sl34: {
    ratioDelta: 0.02,
    tempDeltaC: -0.2,
    brewTimeDeltaSec: -2,
    grindBias: 'coarser',
  },
  pacamara: {
    ratioDelta: -0.03,
    tempDeltaC: 0.2,
    brewTimeDeltaSec: 4,
    grindBias: 'finer',
  },
  maragogipe: {
    ratioDelta: -0.03,
    tempDeltaC: 0.2,
    brewTimeDeltaSec: 4,
    grindBias: 'finer',
  },
  robusta: {
    ratioDelta: 0.05,
    tempDeltaC: -0.4,
    brewTimeDeltaSec: -6,
    grindBias: 'coarser',
  },
};

function mergeProcessModifiers(entry: ProcessCatalogEntry | undefined): Partial<NonNullable<ProcessCatalogEntry['numericModifiers']>> {
  if (!entry) return {};
  const curated = PROCESS_CURATED_MODIFIERS[entry.id];
  return {
    ...(curated || {}),
    ...(entry.numericModifiers || {}),
  };
}

function mergeVarietyModifiers(entry: VarietyCatalogEntry | undefined): Partial<NonNullable<VarietyCatalogEntry['numericModifiers']>> {
  if (!entry) return {};
  const curated = VARIETY_CURATED_MODIFIERS[entry.id];
  return {
    ...(curated || {}),
    ...(entry.numericModifiers || {}),
  };
}

function deriveWaterMineralProfile(input: AiBrewFormState, guidance: WaterGuidance, waterBrand?: WaterBrandProfile) {
  const presetTdsPpm = input.waterMode === 'brand'
    ? (waterBrand?.resolvedMinerals?.tdsPpm ?? waterBrand?.chemistry.tdsPpm ?? null)
    : null;
  const presetHardnessPpm = input.waterMode === 'brand'
    ? (waterBrand?.resolvedMinerals?.hardnessPpm ?? waterBrand?.chemistry.hardnessPpm ?? null)
    : null;
  const presetAlkalinityPpm = input.waterMode === 'brand'
    ? (waterBrand?.resolvedMinerals?.alkalinityPpm ?? waterBrand?.chemistry.alkalinityPpm ?? null)
    : null;
  const tdsPpm = parseRequiredNumber('Water TDS', input.waterTdsPpm || String(presetTdsPpm ?? ''), 0, 600);
  const hardnessPpm = parseRequiredNumber('Water hardness', input.waterHardnessPpm || String(presetHardnessPpm ?? ''), 0, 500);
  const alkalinityPpm = parseRequiredNumber('Water alkalinity', input.waterAlkalinityPpm || String(presetAlkalinityPpm ?? ''), 0, 400);

  let ratioDelta = 0;
  let tempDeltaC = 0;
  let brewTimeDeltaSec = 0;
  const notes: string[] = [...guidance.notes];
  const warnings: string[] = [];
  const confidenceNotes: string[] = [];

  if (input.waterMode === 'brand' && waterBrand) {
    notes.unshift(
      input.waterCustomized
        ? `${waterBrand.shortLabel} was selected as the brand baseline, then adjusted manually.`
        : `${waterBrand.shortLabel} brand water profile is active for this brew plan.`,
    );
    if (waterBrand.presetStatus !== 'autofill') {
      confidenceNotes.push(`${waterBrand.shortLabel} does not have a full autofill panel in this catalog version.`);
    }
    if (waterBrand.resolvedMinerals?.derivation === 'estimated_from_classification') {
      confidenceNotes.push(`${waterBrand.shortLabel} minerals were estimated from the water classification baseline.`);
    }
    if (!waterBrand.isBrewReady) {
      confidenceNotes.push(...(waterBrand.brewBlockReason || []));
    }
  } else {
    notes.unshift('Manual mineral input is active for this brew plan.');
  }

  if (tdsPpm < guidance.recommended.tdsPpm[0]) {
    ratioDelta -= 0.05;
    tempDeltaC += 0.3;
    notes.push('Low-TDS water may need a touch more thermal energy.');
  }
  if (tdsPpm > guidance.recommended.tdsPpm[1]) {
    ratioDelta += 0.05;
    tempDeltaC -= 0.3;
    notes.push('Higher-TDS water can read fuller and heavier with the same brew settings.');
  }
  if (hardnessPpm < guidance.recommended.hardnessPpm[0]) {
    tempDeltaC += 0.4;
    warnings.push(guidance.caution.tooSoft);
    confidenceNotes.push('Water hardness is below the recommended band.');
  } else if (hardnessPpm > guidance.recommended.hardnessPpm[1]) {
    tempDeltaC -= 0.5;
    ratioDelta += 0.05;
    warnings.push(guidance.caution.tooHard);
    confidenceNotes.push('Water hardness is above the recommended band.');
  }

  if (alkalinityPpm < guidance.recommended.alkalinityPpm[0]) {
    brewTimeDeltaSec -= 4;
    warnings.push(guidance.caution.tooLowAlkalinity);
    confidenceNotes.push('Water alkalinity is below the recommended band.');
  } else if (alkalinityPpm > guidance.recommended.alkalinityPpm[1]) {
    tempDeltaC -= 0.2;
    warnings.push(guidance.caution.tooHighAlkalinity);
    confidenceNotes.push('Water alkalinity is above the recommended band.');
  }

  let styleLabel = 'Balanced mineral input';
  if (hardnessPpm < guidance.recommended.hardnessPpm[0] && alkalinityPpm < guidance.recommended.alkalinityPpm[0]) {
    styleLabel = 'Soft / low buffer water';
  } else if (hardnessPpm > guidance.recommended.hardnessPpm[1] || alkalinityPpm > guidance.recommended.alkalinityPpm[1]) {
    styleLabel = 'Hard / buffered water';
  } else if (tdsPpm < guidance.recommended.tdsPpm[0]) {
    styleLabel = 'Low-TDS water';
  } else if (tdsPpm > guidance.recommended.tdsPpm[1]) {
    styleLabel = 'High-TDS water';
  }

  return {
    minerals: {
      tdsPpm,
      hardnessPpm,
      alkalinityPpm,
      notes: input.waterNotes.trim() || undefined,
      styleLabel,
    } satisfies WaterMineralInput,
    ratioDelta,
    tempDeltaC,
    brewTimeDeltaSec,
    notes,
    warnings,
    confidenceNotes,
  };
}

function findFallbackDeviceProfile(catalog: AiBrewCatalog, methodFamily: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
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

export function resolveDeviceProfileSelection(
  catalog: AiBrewCatalog,
  dripper: EquipmentCatalogEntry,
  brewMode: 'hot' | 'iced',
) {
  const requestedDefaultId = brewMode === 'iced'
    ? dripper.defaultProfileId?.replace(/_hot$/, '_iced')
    : dripper.defaultProfileId;

  const exact =
    (requestedDefaultId
      ? catalog.deviceProfiles.find((item) => item.id === requestedDefaultId && item.brewMode === brewMode)
      : undefined)
    || catalog.deviceProfiles.find((item) => item.exactMatch && item.brewMode === brewMode && item.dripperIds.includes(dripper.id));

  if (exact) {
    return {
      profile: exact,
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

export function resolveGrinderSettingReference(
  catalog: AiBrewCatalog,
  grinder: EquipmentCatalogEntry,
  deviceProfile: DeviceBrewProfile,
  brewMode: 'hot' | 'iced',
) {
  const modeMatch = (entry: GrinderSettingReference) => entry.brewMode === brewMode || entry.brewMode === 'both';
  const exact = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.includes(deviceProfile.id),
  );
  if (exact) return exact;

  const familyIds = catalog.deviceProfiles
    .filter((entry) => !entry.exactMatch && entry.methodFamily === deviceProfile.methodFamily && entry.brewMode === brewMode)
    .map((entry) => entry.id);

  const familySetting = catalog.grinderSettings.find((entry) =>
    entry.grinderId === grinder.id
    && modeMatch(entry)
    && entry.profileIds.some((profileId) => familyIds.includes(profileId)),
  );
  if (familySetting) return familySetting;

  const baseline = grinder.grindBands?.medium?.trim();
  if (!baseline) return undefined;

  const hasCatalogBandProvenance = grinder.sourceUrls.length > 0
    && grinder.verificationLevel !== 'dataset_unverified'
    && grinder.verificationLevel !== 'fallback';

  return {
    id: `${hasCatalogBandProvenance ? 'catalog' : 'derived'}_${grinder.id}_${brewMode}`,
    grinderId: grinder.id,
    brewMode,
    profileIds: [],
    rangeLabel: baseline,
    parsedRange: grinder.grindBands?.parsedMedium || null,
    note: hasCatalogBandProvenance
      ? 'No profile-specific grinder chart is stored yet; using this grinder published pour-over band as the deterministic baseline.'
      : 'No profile-specific grinder chart found; using this grinder medium filter band as deterministic baseline.',
    source: hasCatalogBandProvenance ? 'catalog_pour_over_band' : 'derived_from_grinder_band',
    sourceUrls: grinder.sourceUrls,
    verificationLevel: hasCatalogBandProvenance ? grinder.verificationLevel : 'fallback',
    verifiedAt: hasCatalogBandProvenance ? grinder.verifiedAt : catalog.catalogVersion,
    popularityTier: grinder.popularityTier,
    marketSegment: grinder.marketSegment,
    releaseStatus: grinder.releaseStatus,
    confidence: hasCatalogBandProvenance ? grinder.confidence : 'low',
    catalogVersion: catalog.catalogVersion,
  };
}

function buildGrindRecommendation(
  grinder: EquipmentCatalogEntry,
  setting: GrinderSettingReference | undefined,
  grindBias: GrindBias,
  roastLevel: RoastLevel,
  brewMode: 'hot' | 'iced',
) {
  if (setting?.parsedRange) {
    const adjusted = adjustRange(setting.parsedRange, grindBias, roastLevel, brewMode);
    return {
      grindBandLabel: setting.rangeLabel,
      grindRecommendation: `${adjusted.min} - ${adjusted.max} ${setting.parsedRange.unitLabel}`.trim(),
      confidenceNotes: [setting.note],
      verificationLevel: setting.verificationLevel,
    };
  }

  if (setting) {
    return {
      grindBandLabel: setting.rangeLabel,
      grindRecommendation: `${setting.rangeLabel} (${grindBias === 'same' ? 'stay on baseline' : `bias ${grindBias}`})`,
      confidenceNotes: [setting.note],
      verificationLevel: setting.verificationLevel,
    };
  }

  const baseline = grinder.grindBands?.medium || grinder.typeLabel;
  return {
    grindBandLabel: baseline || 'No verified setting yet',
    grindRecommendation: `No verified setting yet. Start near ${baseline || "your grinder's medium filter range"} and bias ${grindBias}.`,
    confidenceNotes: ['No verified grinder setting is stored for this grinder and brew family yet.'],
    verificationLevel: 'fallback' as const,
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
) {
  const targetProfile = findTargetProfile(catalog, input.targetProfileId) || catalog.targetProfiles[0];
  const methodFamily = deviceSelection.profile.methodFamily || dripper.methodFamily || 'v60';
  const methodId = resolvePlannerMethodId(methodFamily, input.brewMode);
  const ratioToolMethodId = resolveRatioToolMethodId(methodFamily, input.brewMode);
  const method = BREW_METHOD_MAP[methodId];
  const roastAdjustedTargets = buildRoastAdjustedTargets(method, input.roastLevel);
  const doseG = parseDose(input.doseG);

  const processModifiers = mergeProcessModifiers(processEntry);
  const varietyModifiers = mergeVarietyModifiers(varietyEntry);
  const beanProfileAdjustment = deriveBeanProfileAdjustment(input);
  const originAdjustment = deriveOriginAdjustment(input, processEntry, varietyEntry, targetProfile.label);
  const doseAdjustment = deriveDoseAdjustment(doseG, methodFamily, input.brewMode);
  const methodFamilyAdjustment = deriveMethodFamilyAdjustment({
    methodFamily,
    filterStyle: deviceSelection.profile.filterStyle,
    brewMode: input.brewMode,
    targetProfileLabel: targetProfile.label,
  });
  const targetFamilyAdjustment = deriveTargetFamilyAdjustment({
    methodFamily,
    brewMode: input.brewMode,
    targetProfileLabel: targetProfile.label,
  });
  const originTargetMethodAdjustment = deriveOriginTargetMethodAdjustment({
    originProfileId: originAdjustment.profileId,
    methodFamily,
    brewMode: input.brewMode,
    targetProfileLabel: targetProfile.label,
  });
  const flavorAlignment = deriveFlavorAlignmentAdjustment({
    targetProfileLabel: targetProfile.label,
    roastLevel: input.roastLevel,
    processEntry,
    varietyEntry,
    waterProfile,
    originAdjustment,
  });

  const recommendedRatio = roundTo(clamp(
    roastAdjustedTargets.adjustedRatioDefault
      + deviceSelection.profile.ratioDelta
      + waterProfile.ratioDelta
      + targetProfile.ratioDelta
      + (processModifiers.ratioDelta || 0)
      + (varietyModifiers.ratioDelta || 0)
      + beanProfileAdjustment.ratioDelta
      + methodFamilyAdjustment.ratioDelta
      + targetFamilyAdjustment.ratioDelta
      + originAdjustment.ratioDelta
      + originTargetMethodAdjustment.ratioDelta
      + doseAdjustment.ratioDelta
      + flavorAlignment.ratioDelta
      + (input.brewMode === 'iced' ? -0.65 : 0),
    method.ratioRange[0] - 0.75,
    method.ratioRange[1] + 0.75,
  ), 2);

  const totalWaterMl = roundTo(calcWaterFromDoseRatio(doseG, recommendedRatio), 0);
  const hotWaterShare = input.brewMode === 'iced'
    ? resolveIcedHotWaterShare({
      methodFamily,
      roastLevel: input.roastLevel,
      targetProfileLabel: targetProfile.label,
      processEntry,
      originAdjustment,
      flavorAlignment,
    })
    : 1;
  const hotWaterMl = input.brewMode === 'iced'
    ? roundTo(totalWaterMl * hotWaterShare, 0)
    : totalWaterMl;
  const iceMl = input.brewMode === 'iced'
    ? roundTo(totalWaterMl - hotWaterMl, 0)
    : 0;

  const waterTempC = roundTo(clamp(
    midpoint(roastAdjustedTargets.adjustedTempRangeC, 1)
      + deviceSelection.profile.tempDeltaC
      + waterProfile.tempDeltaC
      + targetProfile.tempDeltaC
      + (processModifiers.tempDeltaC || 0)
      + (varietyModifiers.tempDeltaC || 0)
      + beanProfileAdjustment.tempDeltaC
      + methodFamilyAdjustment.tempDeltaC
      + targetFamilyAdjustment.tempDeltaC
      + originAdjustment.tempDeltaC
      + originTargetMethodAdjustment.tempDeltaC
      + doseAdjustment.tempDeltaC
      + flavorAlignment.tempDeltaC,
    78,
    98,
  ), 1);

  const totalTimeSeconds = Math.round(clamp(
    midpoint(roastAdjustedTargets.adjustedBrewTimeRangeSec, 0)
      + deviceSelection.profile.brewTimeDeltaSec
      + waterProfile.brewTimeDeltaSec
      + targetProfile.brewTimeDeltaSec
      + (processModifiers.brewTimeDeltaSec || 0)
      + (varietyModifiers.brewTimeDeltaSec || 0)
      + beanProfileAdjustment.brewTimeDeltaSec
      + methodFamilyAdjustment.brewTimeDeltaSec
      + targetFamilyAdjustment.brewTimeDeltaSec
      + originAdjustment.brewTimeDeltaSec
      + originTargetMethodAdjustment.brewTimeDeltaSec
      + doseAdjustment.brewTimeDeltaSec
      + flavorAlignment.brewTimeDeltaSec
      + (input.brewMode === 'iced' ? -5 : 0),
    75,
    420,
  ));
  const hotSplitPercent = roundTo(totalWaterMl > 0 ? (hotWaterMl / totalWaterMl) * 100 : 100, 0);
  const iceSplitPercent = roundTo(totalWaterMl > 0 ? (iceMl / totalWaterMl) * 100 : 0, 0);

  const grindBias = combineBias(
    roastAdjustedTargets.suggestedGrindBias,
    targetProfile.grindBias,
    deviceSelection.profile.grindBias,
    processModifiers.grindBias || 'same',
    varietyModifiers.grindBias || 'same',
    beanProfileAdjustment.grindBias,
    methodFamilyAdjustment.grindBias,
    targetFamilyAdjustment.grindBias,
    originAdjustment.grindBias,
    originTargetMethodAdjustment.grindBias,
    doseAdjustment.grindBias,
    flavorAlignment.grindBias,
  );
  const grindDetails = buildGrindRecommendation(grinder, grinderSetting, grindBias, input.roastLevel, input.brewMode);
  const steps = buildSteps(deviceSelection.profile, hotWaterMl, totalTimeSeconds, {
    targetProfileLabel: targetProfile.label,
    methodFamily,
    filterStyle: deviceSelection.profile.filterStyle,
    brewMode: input.brewMode,
    roastLevel: input.roastLevel,
    roastDevelopment: input.roastDevelopment || undefined,
    solubility: input.solubility || undefined,
    hardnessPpm: waterProfile.minerals.hardnessPpm,
    alkalinityPpm: waterProfile.minerals.alkalinityPpm,
    processId: processEntry?.id,
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

  const brewOutputs = buildBrewOutputs({
    method,
    doseG,
    waterMl: hotWaterMl,
    ratio: recommendedRatio,
  });
  const estimatedBrewOutputMl = brewOutputs.beverageOutputMl;
  const estimatedCupOutputMl = roundTo(estimatedBrewOutputMl + iceMl, 1);

  const processLabel = resolveCatalogLabel(processEntry, input.process, input.customProcess, 'Not specified');
  const varietyLabel = resolveCatalogLabel(varietyEntry, input.variety, input.customVariety, 'Not specified');

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

  const grindSettingMode = grinderSetting?.id.startsWith('derived_') ? 'derived_baseline' : 'catalog_reference';
  const warnings = normalizeNoteList(
    [deviceSelection.fallbackUsed ? `Using ${deviceSelection.profile.label} family fallback profile.` : undefined],
    waterProfile.warnings,
    baseGuardrails.warnings,
  );
  const isDerivedTemplateProfile = deviceSelection.mode === 'derived_template';

  const notes = normalizeNoteList(
    [targetProfile.description, deviceSelection.profile.note],
    waterProfile.notes,
    processEntry?.notes || [],
    varietyEntry?.notes || [],
    beanProfileAdjustment.notes,
    methodFamilyAdjustment.notes,
    targetFamilyAdjustment.notes,
    originAdjustment.notes,
    originTargetMethodAdjustment.notes,
    doseAdjustment.notes,
    flavorAlignment.notes,
    [
      !input.process ? 'Process not specified. No automatic process modifier was applied.' : undefined,
      !input.variety ? 'Variety not specified. No automatic variety modifier was applied.' : undefined,
      input.brewMode === 'iced'
        ? `Brew ${hotWaterMl} ml hot over ${iceMl} ml/g ice (${hotSplitPercent}%:${iceSplitPercent}%). Keep pours compact to hold sweetness and clarity.`
        : `Use the full ${totalWaterMl} ml as brew water and keep kettle near ${waterTempC}°C with calm, center-focused pours.`,
      grinderSetting?.note,
    ],
  );

  const confidenceNotes = normalizeNoteList(
    [deviceSelection.fallbackUsed
      ? 'Exact device profile unavailable; family fallback was used.'
      : isDerivedTemplateProfile
        ? `Device profile was generated from the ${deviceSelection.profile.methodFamily} family template for ${dripper.name}.`
        : `Exact device profile matched: ${deviceSelection.profile.label}.`],
    grindDetails.confidenceNotes,
    waterProfile.confidenceNotes,
    beanProfileAdjustment.confidenceNotes,
    methodFamilyAdjustment.confidenceNotes,
    targetFamilyAdjustment.confidenceNotes,
    originAdjustment.confidenceNotes,
    originTargetMethodAdjustment.confidenceNotes,
    doseAdjustment.confidenceNotes,
    flavorAlignment.confidenceNotes,
    [
      waterBrand
        ? `Water source: ${waterBrand.shortLabel} (${input.waterCustomized ? 'customized' : waterBrand.presetStatus}).`
        : 'Water source: manual mineral entry.',
      `Device profile source: ${deviceSelection.profile.verificationLevel}.`,
      `Grinder setting source: ${grindDetails.verificationLevel}.`,
    ],
  );
  const provenanceAttentionNeeded =
    deviceSelection.mode !== 'exact'
    || grindSettingMode === 'derived_baseline'
    || input.waterCustomized
    || input.waterMode === 'manual'
    || waterBrand?.presetStatus === 'manual_required';

  const coffeeName = input.coffeeName.trim() || 'Unknown Origin';
  const summary = buildSummary({
    brewMode: input.brewMode,
    coffeeName,
    dripper,
    targetProfileLabel: targetProfile.label,
    recommendedRatio,
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
    deviceProfileId: deviceSelection.profile.id,
    grindSettingId: grinderSetting?.id,
    ratio: recommendedRatio,
    doseG,
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
  }));

  return {
    id: nowId('plan'),
    fingerprint,
    createdAt,
    catalogVersion: catalog.catalogVersion,
    formState: { ...input },
    brewMode: input.brewMode,
    methodFamily,
    methodId,
    ratioToolMethodId,
    coffeeName,
    process: processLabel,
    variety: varietyLabel,
    roastLevel: input.roastLevel,
    beanProfile: beanProfileAdjustment.state,
    targetProfileId: targetProfile.id,
    targetProfileLabel: targetProfile.label,
    dripper,
    grinder,
    waterMode: input.waterMode,
    waterRegion: input.waterRegion,
    waterBrandId: waterBrand?.id || '',
    waterBrandLabel: waterBrand?.shortLabel,
    waterPresetStatus: waterBrand?.presetStatus,
    waterPublishState: waterBrand?.publishState,
    waterIsBrewReady: waterBrand?.isBrewReady ?? input.waterMode === 'manual',
    waterBrewBlockReason: waterBrand?.brewBlockReason || [],
    waterBrandMarkets: waterBrand?.markets || [],
    waterBrandVerification: waterBrand?.verificationLevel,
    waterBrandSourceUrls: waterBrand?.sourceUrls || [],
    waterCustomized: input.waterCustomized,
    waterMinerals: waterProfile.minerals,
    waterGuidance: catalog.waterGuidance,
    totalWaterMl,
    hotWaterMl,
    iceMl,
    recommendedRatio,
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
    notes,
    warnings,
    guardrails: {
      errors: baseGuardrails.errors,
      warnings,
    },
    conformance: {
      warnings: normalizeNoteList(baseConformance.warnings, warnings),
      standardsHits: baseConformance.standardsHits,
      standardsMisses: normalizeNoteList(baseConformance.standardsMisses, waterProfile.warnings),
    },
    deviceProfileId: deviceSelection.profile.id,
    deviceProfileLabel: deviceSelection.profile.label,
    deviceProfileMode: deviceSelection.mode,
    grindSettingReference: grinderSetting?.rangeLabel || 'No verified setting yet',
    grindSettingMode,
    grindSettingVerification: grindDetails.verificationLevel,
    fallbackUsed: deviceSelection.fallbackUsed || !grinderSetting,
    provenanceAttentionNeeded,
    confidenceNotes,
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
  const waterBrandId = String(input.waterBrandId || '');
  return {
    ...fallback,
    ...input,
    brewMode: input.brewMode === 'iced' ? 'iced' : 'hot',
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
    dripperId: String(input.dripperId || fallback.dripperId),
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
  };
}

export function buildAiBrewPlan(input: AiBrewFormState, catalog: AiBrewCatalog): BrewPlan {
  const sanitized = sanitizeAiBrewFormState(input, catalog);
  const dripper = findDripper(catalog, sanitized.dripperId) || catalog.drippers[0];
  const grinder = findGrinder(catalog, sanitized.grinderId) || catalog.grinders[0];
  if (!dripper || !grinder) throw new Error('AI Brew equipment catalog is incomplete.');
  const processEntry = sanitized.process === CUSTOM_ENTRY_ID ? undefined : findProcessEntry(catalog, sanitized.process);
  const varietyEntry = sanitized.variety === CUSTOM_ENTRY_ID ? undefined : findVarietyEntry(catalog, sanitized.variety);
  const waterBrand = sanitized.waterBrandId ? findWaterBrand(catalog, sanitized.waterBrandId) : undefined;
  const deviceSelection = resolveDeviceProfileSelection(catalog, dripper, sanitized.brewMode);
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
  );
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
  const processEntry = sanitized.process === CUSTOM_ENTRY_ID ? undefined : findProcessEntry(catalog, sanitized.process);
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

  const deviceSelection = resolveDeviceProfileSelection(catalog, dripper, sanitized.brewMode);
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

export function buildPlanRecipeName(plan: BrewPlan, locale?: string) {
  const fallback = isIndonesianLocale(locale) ? 'AI Seduh' : 'AI Brew';
  return `${plan.coffeeName || fallback} · ${plan.targetProfileLabel}`;
}

export function buildPlanRecipeDescription(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  const gear = `${plan.dripper.name} + ${plan.grinder.name}`;
  const split = plan.iceMl > 0
    ? (id ? ` Split ${plan.hotWaterMl} ml panas / ${plan.iceMl} ml es.` : ` Split ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice.`)
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

export function buildPlanRecipeSteps(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  return plan.steps.map((step) =>
    id
      ? `${step.label} (${formatTime(step.startSeconds)}): tuang ${step.pourVolumeMl} ml hingga mencapai ${step.targetVolumeMl} ml. ${step.hybridInstruction || step.note}`
      : `${step.label} (${formatTime(step.startSeconds)}): pour ${step.pourVolumeMl} ml to reach ${step.targetVolumeMl} ml. ${step.hybridInstruction || step.note}`
  );
}

export function buildPlanRecipeIngredients(plan: BrewPlan, locale?: string) {
  const id = isIndonesianLocale(locale);
  return [
    { name: id ? 'Kopi' : 'Coffee', amount: `${plan.doseG} g` },
    { name: id ? 'Air' : 'Water', amount: `${plan.totalWaterMl} ml` },
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
    ? (id ? ` Split ${plan.hotWaterMl} ml panas / ${plan.iceMl} ml es.` : ` Split ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice.`)
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
  return plan.steps.map((step) =>
    id
      ? `${localizeAiBrewStepLabel(step.label, locale)} (${formatTime(step.startSeconds)}): tuang ${step.pourVolumeMl} ml hingga mencapai ${step.targetVolumeMl} ml. ${localizeAiBrewDynamicText(step.hybridInstruction || step.note, locale)}`
      : `${localizeAiBrewStepLabel(step.label, locale)} (${formatTime(step.startSeconds)}): pour ${step.pourVolumeMl} ml to reach ${step.targetVolumeMl} ml. ${localizeAiBrewDynamicText(step.hybridInstruction || step.note, locale)}`
  );
}

export function buildPlanRecipeMetadata(plan: BrewPlan) {
  return {
    planId: plan.id,
    fingerprint: plan.fingerprint,
    brewMode: plan.brewMode,
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
    waterCustomized: plan.waterCustomized,
    waterStyleLabel: plan.waterMinerals.styleLabel,
    waterTdsPpm: plan.waterMinerals.tdsPpm,
    waterHardnessPpm: plan.waterMinerals.hardnessPpm,
    waterAlkalinityPpm: plan.waterMinerals.alkalinityPpm,
    beanAltitudeMasl: plan.beanProfile.altitudeMasl,
    beanDensityGml: plan.beanProfile.beanDensityGml,
    beanRoastDevelopment: plan.beanProfile.roastDevelopment,
    beanSolubility: plan.beanProfile.solubility,
    beanProfileSummary: plan.beanProfile.summary,
    deviceProfileId: plan.deviceProfileId,
    deviceProfileLabel: plan.deviceProfileLabel,
    deviceProfileMode: plan.deviceProfileMode,
    grindSettingReference: plan.grindSettingReference,
    grindSettingMode: plan.grindSettingMode,
    provenanceAttentionNeeded: plan.provenanceAttentionNeeded,
    catalogVersion: plan.catalogVersion,
    totalTimeSeconds: plan.totalTimeSeconds,
    totalWaterMl: plan.totalWaterMl,
    hotWaterMl: plan.hotWaterMl,
    iceMl: plan.iceMl,
    waterTempC: plan.waterTempC,
    ratio: plan.recommendedRatio,
    steps: plan.steps.map((step) => ({
      id: step.id,
      label: step.label,
      startSeconds: step.startSeconds,
      targetVolumeMl: step.targetVolumeMl,
      pourVolumeMl: step.pourVolumeMl,
      hybridInstruction: step.hybridInstruction,
    })),
  };
}







