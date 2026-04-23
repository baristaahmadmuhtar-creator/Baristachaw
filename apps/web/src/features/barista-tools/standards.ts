import { buildRoastAdjustedTargets, mapAgtronToRoastLevel } from './calculations.ts';
import type { BrewCalcInputs, BrewGuardrailState, BrewMethodProfile, RatioWarningPolicy, RoastLevel } from './types.ts';
import { getMethodEvidenceProfile } from './evidence/pack.ts';

export const SCA_BASELINE = {
  ratioRange: [12, 22] as [number, number],
  tempRangeC: [80, 100] as [number, number],
  brewTimeRangeSec: [60, 86_400] as [number, number],
  tdsRangePct: [0.7, 2.2] as [number, number],
  extractionTargetPct: [18, 22] as [number, number],
};

const MAX_REASONABLE_DOSE_G = 120;
const MAX_REASONABLE_WATER_ML = 3_500;

const CATEGORY_RATIO_POLICIES: Record<BrewMethodProfile['category'], RatioWarningPolicy> = {
  filter: { min: 12, max: 22, label: 'broad SCA-style filter baseline' },
  batch: { min: 12, max: 22, label: 'broad SCA-style batch baseline' },
  espresso: { min: 1, max: 3.5, label: 'espresso shot baseline' },
};

function resolveRatioPolicy(method: BrewMethodProfile): RatioWarningPolicy {
  const evidencePolicy = getMethodEvidenceProfile(method.id)?.ratioPolicy;
  if (evidencePolicy) return evidencePolicy;
  if (method.ratioPolicy) return method.ratioPolicy;
  return CATEGORY_RATIO_POLICIES[method.category];
}

export interface ConformanceResult {
  warnings: string[];
  standardsHits: string[];
  standardsMisses: string[];
}

type StandardsMessageKey =
  | 'invalidNumericInput'
  | 'ratioOutsideBaseline'
  | 'ratioInsideBaseline'
  | 'ratioOutsideTarget'
  | 'ratioInsideTarget'
  | 'tdsOutsideTypicalFilter'
  | 'tdsInsideTypicalFilter'
  | 'tempTooHighRoast'
  | 'tempTooLowRoast'
  | 'tempGuidanceAlignsRoast'
  | 'doseMustBePositive'
  | 'waterMustBePositive'
  | 'ratioMustBePositive'
  | 'doseUnusuallyHigh'
  | 'waterUnusuallyHigh'
  | 'tdsMustBeFinite'
  | 'tdsMustBePositive';

type StandardsMessageParams = {
  fields?: string;
  ratio?: string;
  policyLabel?: string;
  min?: string;
  max?: string;
  roastLevel?: string;
  tds?: string;
  tempRange?: string;
};

type StandardsMessageFormatter = (key: StandardsMessageKey, params: StandardsMessageParams) => string;

interface StandardsOptions {
  roastLevel?: RoastLevel;
  agtronValue?: number;
  formatMessage?: StandardsMessageFormatter;
  resolvePolicyLabel?: (policy: RatioWarningPolicy, method: BrewMethodProfile) => string;
  resolveRoastLevelLabel?: (roastLevel: RoastLevel) => string;
}

function defaultMessage(key: StandardsMessageKey, params: StandardsMessageParams): string {
  switch (key) {
    case 'invalidNumericInput':
      return `Invalid numeric input detected (${params.fields || ''}). Please enter finite numbers.`;
    case 'ratioOutsideBaseline':
      return `Ratio 1:${params.ratio || ''} is outside ${params.policyLabel || ''} (${params.min || ''}-${params.max || ''}).`;
    case 'ratioInsideBaseline':
      return `Ratio is inside ${params.policyLabel || ''}.`;
    case 'ratioOutsideTarget':
      return `Ratio is outside ${params.roastLevel || ''} roast target range (${params.min || ''}-${params.max || ''}).`;
    case 'ratioInsideTarget':
      return `Ratio is inside ${params.roastLevel || ''} roast target range.`;
    case 'tdsOutsideTypicalFilter':
      return `TDS ${params.tds || ''}% is outside typical filter range (${params.min || ''}-${params.max || ''}%).`;
    case 'tdsInsideTypicalFilter':
      return 'TDS is inside typical filter range.';
    case 'tempTooHighRoast':
      return `Target brew temp may be too high for ${params.roastLevel || ''} roast. Consider lowering ${params.tempRange || ''}.`;
    case 'tempTooLowRoast':
      return `Target brew temp may be too low for ${params.roastLevel || ''} roast. Consider raising ${params.tempRange || ''}.`;
    case 'tempGuidanceAlignsRoast':
      return `Temperature guidance aligns with ${params.roastLevel || ''} roast profile.`;
    case 'doseMustBePositive':
      return 'Dose must be greater than 0 g.';
    case 'waterMustBePositive':
      return 'Water must be greater than 0 ml.';
    case 'ratioMustBePositive':
      return 'Ratio must be greater than 0.';
    case 'doseUnusuallyHigh':
      return 'Dose is unusually high. Double-check batch size.';
    case 'waterUnusuallyHigh':
      return 'Water input is unusually high. Consider splitting batches.';
    case 'tdsMustBeFinite':
      return 'TDS must be a finite number.';
    case 'tdsMustBePositive':
      return 'TDS must be greater than 0%.';
    default:
      return '';
  }
}

function emit(
  formatter: StandardsMessageFormatter | undefined,
  key: StandardsMessageKey,
  params: StandardsMessageParams = {}
): string {
  if (formatter) return formatter(key, params);
  return defaultMessage(key, params);
}

export function evaluateConformance(
  inputs: BrewCalcInputs,
  options?: StandardsOptions
): ConformanceResult {
  const warnings: string[] = [];
  const standardsHits: string[] = [];
  const standardsMisses: string[] = [];
  const { method, doseG, waterMl, ratio, tdsPercent } = inputs;
  const invalidNumericFields: string[] = [];
  if (!Number.isFinite(doseG)) invalidNumericFields.push('dose');
  if (!Number.isFinite(waterMl)) invalidNumericFields.push('water');
  if (!Number.isFinite(ratio)) invalidNumericFields.push('ratio');
  if (tdsPercent !== undefined && !Number.isFinite(tdsPercent)) invalidNumericFields.push('tds');
  if (invalidNumericFields.length > 0) {
    const msg = emit(options?.formatMessage, 'invalidNumericInput', { fields: invalidNumericFields.join(', ') });
    warnings.push(msg);
    standardsMisses.push(msg);
    return { warnings, standardsHits, standardsMisses };
  }

  const evidence = getMethodEvidenceProfile(method.id);
  const roastLevel = Number.isFinite(options?.agtronValue)
    ? mapAgtronToRoastLevel(options.agtronValue, evidence?.roastSupport?.agtronRange ?? method.roastSupport?.agtronRange)
    : (options?.roastLevel ?? evidence?.roastSupport.defaultLevel ?? method.roastSupport?.defaultLevel ?? 'medium');
  const roastTargets = buildRoastAdjustedTargets(method, roastLevel);

  const ratioPolicy = resolveRatioPolicy(method);
  const policyLabel = options?.resolvePolicyLabel?.(ratioPolicy, method) ?? ratioPolicy.label;
  const roastLevelLabel = options?.resolveRoastLevelLabel?.(roastLevel) ?? roastLevel.replace(/_/g, ' ');

  if (ratio < ratioPolicy.min || ratio > ratioPolicy.max) {
    const msg = emit(options?.formatMessage, 'ratioOutsideBaseline', {
      ratio: ratio.toFixed(2),
      policyLabel,
      min: String(ratioPolicy.min),
      max: String(ratioPolicy.max),
    });
    warnings.push(msg);
    standardsMisses.push(msg);
  } else {
    standardsHits.push(emit(options?.formatMessage, 'ratioInsideBaseline', { policyLabel }));
  }

  if (ratio < roastTargets.adjustedRatioRange[0] || ratio > roastTargets.adjustedRatioRange[1]) {
    const msg = emit(options?.formatMessage, 'ratioOutsideTarget', {
      roastLevel: roastLevelLabel,
      min: String(roastTargets.adjustedRatioRange[0]),
      max: String(roastTargets.adjustedRatioRange[1]),
    });
    warnings.push(msg);
    standardsMisses.push(msg);
  } else {
    standardsHits.push(emit(options?.formatMessage, 'ratioInsideTarget', { roastLevel: roastLevelLabel }));
  }

  if (tdsPercent !== undefined && Number.isFinite(tdsPercent)) {
    const shouldApplyFilterTdsBand = method.category !== 'espresso';
    if (shouldApplyFilterTdsBand && (tdsPercent < SCA_BASELINE.tdsRangePct[0] || tdsPercent > SCA_BASELINE.tdsRangePct[1])) {
      const msg = emit(options?.formatMessage, 'tdsOutsideTypicalFilter', {
        tds: tdsPercent.toFixed(2),
        min: String(SCA_BASELINE.tdsRangePct[0]),
        max: String(SCA_BASELINE.tdsRangePct[1]),
      });
      warnings.push(msg);
      standardsMisses.push(msg);
    } else if (shouldApplyFilterTdsBand) {
      standardsHits.push(emit(options?.formatMessage, 'tdsInsideTypicalFilter'));
    }
  }

  const isHotBrew = method.tempRangeC[1] >= 70;
  const inferredTempC = (method.tempRangeC[0] + method.tempRangeC[1]) / 2;
  if (isHotBrew && inferredTempC > roastTargets.adjustment.warningRules.highTempWarnAboveC) {
    const msg = emit(options?.formatMessage, 'tempTooHighRoast', {
      roastLevel: roastLevelLabel,
      tempRange: '0.5-1.5 deg C',
    });
    warnings.push(msg);
    standardsMisses.push(msg);
  } else if (isHotBrew) {
    standardsHits.push(emit(options?.formatMessage, 'tempGuidanceAlignsRoast', { roastLevel: roastLevelLabel }));
  }

  if (isHotBrew && inferredTempC < roastTargets.adjustment.warningRules.lowTempWarnBelowC) {
    const msg = emit(options?.formatMessage, 'tempTooLowRoast', {
      roastLevel: roastLevelLabel,
      tempRange: '0.5-1.5 deg C',
    });
    warnings.push(msg);
    standardsMisses.push(msg);
  }

  return { warnings, standardsHits, standardsMisses };
}

export function validateBrewInputs(
  inputs: BrewCalcInputs,
  options?: StandardsOptions
): BrewGuardrailState {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { method, doseG, waterMl, ratio, tdsPercent } = inputs;
  const normalizedAgtronValue = Number.isFinite(options?.agtronValue) ? options?.agtronValue : undefined;
  const roastLevel = normalizedAgtronValue !== undefined
    ? mapAgtronToRoastLevel(normalizedAgtronValue, getMethodEvidenceProfile(method.id)?.roastSupport?.agtronRange ?? method.roastSupport?.agtronRange)
    : (options?.roastLevel ?? getMethodEvidenceProfile(method.id)?.roastSupport.defaultLevel ?? method.roastSupport?.defaultLevel ?? 'medium');

  if (!Number.isFinite(doseG) || doseG <= 0) errors.push(emit(options?.formatMessage, 'doseMustBePositive'));
  if (!Number.isFinite(waterMl) || waterMl <= 0) errors.push(emit(options?.formatMessage, 'waterMustBePositive'));
  if (!Number.isFinite(ratio) || ratio <= 0) errors.push(emit(options?.formatMessage, 'ratioMustBePositive'));

  if (doseG > MAX_REASONABLE_DOSE_G) warnings.push(emit(options?.formatMessage, 'doseUnusuallyHigh'));
  if (waterMl > MAX_REASONABLE_WATER_ML) warnings.push(emit(options?.formatMessage, 'waterUnusuallyHigh'));

  if (tdsPercent !== undefined && !Number.isFinite(tdsPercent)) errors.push(emit(options?.formatMessage, 'tdsMustBeFinite'));
  if (tdsPercent !== undefined && Number.isFinite(tdsPercent) && tdsPercent <= 0) errors.push(emit(options?.formatMessage, 'tdsMustBePositive'));

  const conformance = evaluateConformance(inputs, {
    roastLevel,
    agtronValue: normalizedAgtronValue,
    formatMessage: options?.formatMessage,
    resolvePolicyLabel: options?.resolvePolicyLabel,
    resolveRoastLevelLabel: options?.resolveRoastLevelLabel,
  });
  warnings.push(...conformance.warnings);

  return { errors, warnings };
}
