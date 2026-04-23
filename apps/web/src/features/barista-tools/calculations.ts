import type {
  BrewCalcInputs,
  BrewCalcOutputs,
  BrewMethodProfile,
  GrindBias,
  RoastAdjustmentProfile,
  RoastLevel,
} from './types.ts';
import { getCategoryRoastAdjustments, getMethodEvidenceProfile } from './evidence/pack.ts';

export function roundTo(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const safeDigits = Number.isFinite(digits) ? Math.min(6, Math.max(0, Math.trunc(digits))) : 2;
  const factor = 10 ** safeDigits;
  return Math.round(value * factor) / factor;
}

const DEFAULT_AGTRON_RANGE: [number, number] = [25, 95];

export interface RoastAdjustedTargets {
  roastLevel: RoastLevel;
  adjustment: RoastAdjustmentProfile;
  adjustedRatioDefault: number;
  adjustedRatioRange: [number, number];
  adjustedTempRangeC: [number, number];
  adjustedBrewTimeRangeSec: [number, number];
  suggestedGrindBias: GrindBias;
}

export function mapAgtronToRoastLevel(agtron: number, agtronRange: [number, number] = DEFAULT_AGTRON_RANGE): RoastLevel {
  const [min, max] = agtronRange;
  if (max <= min) return 'medium';
  const normalized = Math.max(0, Math.min(1, (agtron - min) / (max - min)));
  if (normalized >= 0.82) return 'light';
  if (normalized >= 0.66) return 'medium_light';
  if (normalized >= 0.44) return 'medium';
  if (normalized >= 0.24) return 'medium_dark';
  return 'dark';
}

export function getDefaultRoastLevel(method: BrewMethodProfile): RoastLevel {
  return getMethodEvidenceProfile(method.id)?.roastSupport.defaultLevel ?? method.roastSupport?.defaultLevel ?? 'medium';
}

export function getRoastAdjustment(method: BrewMethodProfile, roastLevel: RoastLevel): RoastAdjustmentProfile {
  const evidenceProfile = getMethodEvidenceProfile(method.id);
  const categoryDefaults = getCategoryRoastAdjustments(method.category);
  return evidenceProfile?.roastAdjustments?.[roastLevel]
    ?? method.roastAdjustments?.[roastLevel]
    ?? categoryDefaults[roastLevel]
    ?? categoryDefaults.medium;
}

export function buildRoastAdjustedTargets(method: BrewMethodProfile, roastLevel: RoastLevel): RoastAdjustedTargets {
  const evidenceProfile = getMethodEvidenceProfile(method.id);
  const baseline = evidenceProfile?.baseline;
  const ratioDefault = baseline?.ratioDefault ?? method.ratioDefault;
  const ratioRange = baseline?.ratioRange ?? method.ratioRange;
  const tempRange = baseline?.tempRangeC ?? method.tempRangeC;
  const brewTimeRange = baseline?.brewTimeRangeSec ?? method.brewTimeRangeSec;
  const adjustment = getRoastAdjustment(method, roastLevel);
  const adjustedRatioRange: [number, number] = [
    roundTo(Math.max(0.5, ratioRange[0] + adjustment.ratioDelta), 2),
    roundTo(Math.max(0.75, ratioRange[1] + adjustment.ratioDelta), 2),
  ];
  const adjustedTempRangeC: [number, number] = [
    roundTo(tempRange[0] + adjustment.tempDeltaC, 1),
    roundTo(tempRange[1] + adjustment.tempDeltaC, 1),
  ];
  const adjustedBrewTimeRangeSec: [number, number] = [
    Math.max(15, Math.round(brewTimeRange[0] + adjustment.brewTimeDeltaSec)),
    Math.max(20, Math.round(brewTimeRange[1] + adjustment.brewTimeDeltaSec)),
  ];

  return {
    roastLevel,
    adjustment,
    adjustedRatioDefault: roundTo(Math.max(0.5, ratioDefault + adjustment.ratioDelta), 2),
    adjustedRatioRange,
    adjustedTempRangeC,
    adjustedBrewTimeRangeSec,
    suggestedGrindBias: adjustment.grindBias,
  };
}

export function calcWaterFromDoseRatio(doseG: number, ratio: number) {
  if (!Number.isFinite(doseG) || !Number.isFinite(ratio) || doseG <= 0 || ratio <= 0) return 0;
  return roundTo(doseG * ratio, 1);
}

export function calcDoseFromWaterRatio(waterMl: number, ratio: number) {
  if (!Number.isFinite(waterMl) || !Number.isFinite(ratio) || waterMl <= 0 || ratio <= 0) return 0;
  return roundTo(waterMl / ratio, 2);
}

export function calcBeverageYieldBasic(inputs: BrewCalcInputs) {
  const safeDoseG = Number.isFinite(inputs.doseG) ? Math.max(0, inputs.doseG) : 0;
  const safeWaterMl = Number.isFinite(inputs.waterMl) ? Math.max(0, inputs.waterMl) : 0;
  const safeRatio = Number.isFinite(inputs.ratio) ? Math.max(0, inputs.ratio) : 0;
  const safeProcessLossMl = Number.isFinite(inputs.method.processLossMl) ? Math.max(0, inputs.method.processLossMl) : 0;
  const safeRetentionFactor = Number.isFinite(inputs.method.retentionFactor) ? Math.max(0, inputs.method.retentionFactor) : 0;

  if (inputs.method.category === 'espresso') {
    const processLossMl = roundTo(safeProcessLossMl, 1);
    const targetEspressoYieldMl = roundTo(safeDoseG * safeRatio, 1);
    const availableFromInputMl = Math.max(0, safeWaterMl - processLossMl);
    const beverageOutputMl = roundTo(Math.min(targetEspressoYieldMl, availableFromInputMl || targetEspressoYieldMl), 1);
    const waterRetainedMl = roundTo(Math.max(0, safeWaterMl - beverageOutputMl - processLossMl), 1);

    return {
      waterRetainedMl,
      processLossMl,
      beverageOutputMl,
    };
  }

  const waterRetainedMl = roundTo(safeDoseG * safeRetentionFactor, 1);
  const processLossMl = roundTo(safeProcessLossMl, 1);
  const beverageOutputMl = roundTo(Math.max(0, safeWaterMl - waterRetainedMl - processLossMl), 1);

  return {
    waterRetainedMl,
    processLossMl,
    beverageOutputMl,
  };
}

export function calcBrewStrengthFromTds(tdsPercent: number) {
  if (!Number.isFinite(tdsPercent) || tdsPercent <= 0) return 0;
  return roundTo(tdsPercent, 2);
}

export function calcExtractionYieldAdvanced(params: {
  doseG: number;
  beverageOutputMl: number;
  tdsPercent: number;
}) {
  if (
    !Number.isFinite(params.doseG)
    || !Number.isFinite(params.beverageOutputMl)
    || !Number.isFinite(params.tdsPercent)
    || params.doseG <= 0
    || params.beverageOutputMl <= 0
    || params.tdsPercent <= 0
  ) {
    return 0;
  }
  return roundTo((params.tdsPercent * params.beverageOutputMl) / params.doseG, 2);
}

export function classifyExtraction(extractionYieldPct: number): 'under' | 'target' | 'over' {
  if (extractionYieldPct < 18) return 'under';
  if (extractionYieldPct > 22) return 'over';
  return 'target';
}

export function toFluidOz(ml: number) {
  if (!Number.isFinite(ml) || ml <= 0) return 0;
  return roundTo(ml / 29.5735, 2);
}

export function buildBrewOutputs(inputs: BrewCalcInputs): BrewCalcOutputs {
  const basic = calcBeverageYieldBasic(inputs);
  const effectiveOutput = Number.isFinite(inputs.measuredOutputMl) && inputs.measuredOutputMl > 0
    ? inputs.measuredOutputMl
    : basic.beverageOutputMl;
  const safeWaterRetainedMl = roundTo(Math.max(0, Number.isFinite(basic.waterRetainedMl) ? basic.waterRetainedMl : 0), 1);
  const safeProcessLossMl = roundTo(Math.max(0, Number.isFinite(basic.processLossMl) ? basic.processLossMl : 0), 1);
  const safeBeverageOutputMl = roundTo(Math.max(0, Number.isFinite(effectiveOutput) ? effectiveOutput : 0), 1);
  const safeBeverageOutputOz = toFluidOz(safeBeverageOutputMl);

  if (inputs.tdsPercent !== undefined && Number.isFinite(inputs.tdsPercent) && inputs.tdsPercent > 0) {
    const extractionYieldPct = calcExtractionYieldAdvanced({
      doseG: inputs.doseG,
      beverageOutputMl: safeBeverageOutputMl,
      tdsPercent: inputs.tdsPercent,
    });
    const safeExtractionYieldPct = Number.isFinite(extractionYieldPct) ? extractionYieldPct : 0;

    return {
      waterRetainedMl: safeWaterRetainedMl,
      processLossMl: safeProcessLossMl,
      beverageOutputMl: safeBeverageOutputMl,
      beverageOutputOz: safeBeverageOutputOz,
      brewStrengthPct: calcBrewStrengthFromTds(inputs.tdsPercent),
      extractionYieldPct: safeExtractionYieldPct,
      extractionBand: classifyExtraction(safeExtractionYieldPct),
    };
  }

  return {
    waterRetainedMl: safeWaterRetainedMl,
    processLossMl: safeProcessLossMl,
    beverageOutputMl: safeBeverageOutputMl,
    beverageOutputOz: safeBeverageOutputOz,
  };
}
