import type {
  BrewRecommendation,
  CatalogSource,
  DataQuality,
  WaterCoffeeParameters,
  WaterMinerals,
  WaterRecord,
} from './types.js';

export function roundNumber(value: number | null, digits = 1): number | null {
  if (value === null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calculateHardnessPpmAsCaco3(calcium: number | null, magnesium: number | null): number | null {
  if (calcium === null || magnesium === null) return null;
  return roundNumber((calcium * 2.5) + (magnesium * 4.1), 1);
}

export function calculateAlkalinityPpmAsCaco3(bicarbonate: number | null): number | null {
  if (bicarbonate === null) return null;
  return roundNumber(bicarbonate * 0.82, 1);
}

function bandScore(value: number | null, min: number, max: number, tolerance: number): number {
  if (value === null) return 0;
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 1 - (distance / tolerance));
}

export function calculateScaMatchScore(input: {
  tds_ppm: number | null;
  hardness_ppm_as_caco3: number | null;
  alkalinity_ppm_as_caco3: number | null;
  ph: number | null;
  is_sparkling?: boolean;
}): number | null {
  if (
    input.tds_ppm === null
    || input.hardness_ppm_as_caco3 === null
    || input.alkalinity_ppm_as_caco3 === null
  ) {
    return null;
  }

  if (input.is_sparkling) return 0;

  const weightedScores: Array<{ score: number; weight: number }> = [
    { score: bandScore(input.tds_ppm, 75, 150, 80), weight: 0.34 },
    { score: bandScore(input.hardness_ppm_as_caco3, 50, 80, 55), weight: 0.33 },
    { score: bandScore(input.alkalinity_ppm_as_caco3, 40, 70, 45), weight: 0.23 },
  ];

  if (input.ph !== null) {
    weightedScores.push({ score: bandScore(input.ph, 6.5, 7.5, 1.2), weight: 0.1 });
  }

  const totalWeight = weightedScores.reduce((sum, entry) => sum + entry.weight, 0);
  const normalized = weightedScores.reduce((sum, entry) => sum + (entry.score * entry.weight), 0) / totalWeight;
  return Math.round(normalized * 100);
}

export function classifyBrewRecommendation(
  score: number | null,
  isSparkling: boolean,
): BrewRecommendation {
  if (isSparkling) return 'poor';
  if (score === null) return 'poor';
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 45) return 'acceptable';
  return 'poor';
}

export function buildWaterCoffeeParameters(input: {
  minerals_mg_l: WaterMinerals;
  ph: number | null;
  tds_ppm: number | null;
  is_sparkling: boolean;
}): WaterCoffeeParameters {
  const hardness = calculateHardnessPpmAsCaco3(input.minerals_mg_l.calcium, input.minerals_mg_l.magnesium);
  const alkalinity = calculateAlkalinityPpmAsCaco3(input.minerals_mg_l.bicarbonate);
  const sca = calculateScaMatchScore({
    tds_ppm: input.tds_ppm,
    hardness_ppm_as_caco3: hardness,
    alkalinity_ppm_as_caco3: alkalinity,
    ph: input.ph,
    is_sparkling: input.is_sparkling,
  });

  return {
    hardness_ppm_as_caco3: hardness,
    alkalinity_ppm_as_caco3: alkalinity,
    sca_match_score: sca,
    brew_recommendation: classifyBrewRecommendation(sca, input.is_sparkling),
  };
}

export function pickPrimarySource(sources: CatalogSource[]): CatalogSource | null {
  if (sources.length === 0) return null;
  return [...sources].sort((left, right) => right.confidence_score - left.confidence_score)[0] || null;
}

export function createDataQuality(
  fields: Record<string, unknown>,
  options?: { estimated?: boolean },
): DataQuality {
  const missing_fields = Object.entries(fields)
    .filter(([, value]) =>
      value === null
      || value === undefined
      || value === ''
      || (Array.isArray(value) && value.length === 0))
    .map(([key]) => key);

  const totalFields = Object.keys(fields).length || 1;
  const completeness_score = Math.round(((totalFields - missing_fields.length) / totalFields) * 100);

  return {
    is_estimated: Boolean(options?.estimated),
    missing_fields,
    completeness_score,
  };
}

export function buildWaterDataQuality(record: Pick<WaterRecord, 'minerals_mg_l' | 'ph' | 'tds_ppm' | 'sources'>): DataQuality {
  return createDataQuality({
    calcium: record.minerals_mg_l.calcium,
    magnesium: record.minerals_mg_l.magnesium,
    bicarbonate: record.minerals_mg_l.bicarbonate,
    tds_ppm: record.tds_ppm,
    ph: record.ph,
    sources: record.sources,
  });
}
