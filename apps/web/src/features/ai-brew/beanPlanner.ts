import { roundTo } from '../barista-tools/calculations.ts';
import type { GrindBias } from '../barista-tools/types.ts';
import type {
  AiBrewFormState,
  BeanProfileState,
  BeanRoastDevelopment,
  BeanSolubility,
  ProcessCatalogEntry,
  VarietyCatalogEntry,
} from './types.ts';
import {
  LINEAGE_GROUP_MODIFIERS_V2026_05,
  PROCESS_CURATED_MODIFIERS_V2026_05,
  VARIETY_CURATED_MODIFIERS_V2026_05,
} from './plannerCalibration.v2026-05.ts';

const GRIND_BIAS_SCORE: Record<GrindBias, number> = {
  finer: -1,
  same: 0,
  coarser: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function combineBias(...biases: GrindBias[]): GrindBias {
  const score = biases.reduce((total, bias) => total + GRIND_BIAS_SCORE[bias], 0);
  if (score < 0) return 'finer';
  if (score > 0) return 'coarser';
  return 'same';
}

function parseOptionalNumber(label: string, value: string, min: number, max: number) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid number.`);
  if (parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return parsed;
}

type NumericModifier = NonNullable<ProcessCatalogEntry['numericModifiers']>;

const NEUTRAL_MODIFIER: NumericModifier = {
  ratioDelta: 0,
  tempDeltaC: 0,
  brewTimeDeltaSec: 0,
  grindBias: 'same',
};

const PROCESS_GROUP_FALLBACK_MODIFIERS: Record<string, NumericModifier> = {
  washed: { ratioDelta: -0.01, tempDeltaC: 0.1, brewTimeDeltaSec: 2, grindBias: 'same' },
  classic: { ratioDelta: 0, tempDeltaC: 0, brewTimeDeltaSec: 0, grindBias: 'same' },
  drying: { ratioDelta: 0.02, tempDeltaC: -0.1, brewTimeDeltaSec: -2, grindBias: 'same' },
  fermented: { ratioDelta: 0.04, tempDeltaC: -0.25, brewTimeDeltaSec: -4, grindBias: 'coarser' },
  experimental: { ratioDelta: 0.05, tempDeltaC: -0.35, brewTimeDeltaSec: -5, grindBias: 'coarser' },
  regional: { ratioDelta: 0.01, tempDeltaC: -0.1, brewTimeDeltaSec: -1, grindBias: 'same' },
  special: { ratioDelta: 0.02, tempDeltaC: -0.15, brewTimeDeltaSec: -2, grindBias: 'same' },
};

const VARIETY_GROUP_FALLBACK_MODIFIERS: Record<string, NumericModifier> = {
  bourbon: { ratioDelta: -0.01, tempDeltaC: 0.1, brewTimeDeltaSec: 1, grindBias: 'same' },
  'bourbon-lineage': { ratioDelta: -0.01, tempDeltaC: 0.1, brewTimeDeltaSec: 1, grindBias: 'same' },
  'bourbon-typica': { ratioDelta: -0.01, tempDeltaC: 0.1, brewTimeDeltaSec: 1, grindBias: 'same' },
  'classic-arabica': { ratioDelta: 0, tempDeltaC: 0, brewTimeDeltaSec: 0, grindBias: 'same' },
  catuai: { ratioDelta: -0.01, tempDeltaC: 0.1, brewTimeDeltaSec: 1, grindBias: 'same' },
  caturra: { ratioDelta: -0.01, tempDeltaC: 0.1, brewTimeDeltaSec: 1, grindBias: 'same' },
  'ethiopian-landrace': { ratioDelta: 0.03, tempDeltaC: -0.1, brewTimeDeltaSec: -2, grindBias: 'coarser' },
  landrace: { ratioDelta: 0.03, tempDeltaC: -0.1, brewTimeDeltaSec: -2, grindBias: 'coarser' },
  'east-africa-selection': { ratioDelta: 0.03, tempDeltaC: -0.1, brewTimeDeltaSec: -2, grindBias: 'coarser' },
  'kenyan-selection': { ratioDelta: 0.03, tempDeltaC: -0.1, brewTimeDeltaSec: -2, grindBias: 'coarser' },
  'specialty-reference': { ratioDelta: 0.03, tempDeltaC: -0.2, brewTimeDeltaSec: -3, grindBias: 'coarser' },
  'brazil-selection': { ratioDelta: -0.02, tempDeltaC: 0.1, brewTimeDeltaSec: 2, grindBias: 'same' },
  introgressed: { ratioDelta: 0.02, tempDeltaC: -0.2, brewTimeDeltaSec: -3, grindBias: 'coarser' },
  'disease-resistant': { ratioDelta: 0.02, tempDeltaC: -0.2, brewTimeDeltaSec: -3, grindBias: 'coarser' },
  'south-asia-lineage': { ratioDelta: 0.02, tempDeltaC: -0.2, brewTimeDeltaSec: -3, grindBias: 'coarser' },
  'india-selection': { ratioDelta: 0.02, tempDeltaC: -0.2, brewTimeDeltaSec: -3, grindBias: 'coarser' },
  'f1-hybrid': { ratioDelta: 0, tempDeltaC: 0.1, brewTimeDeltaSec: 2, grindBias: 'same' },
  'hybrid-f1': { ratioDelta: 0, tempDeltaC: 0.1, brewTimeDeltaSec: 2, grindBias: 'same' },
  canephora: { ratioDelta: 0.05, tempDeltaC: -0.4, brewTimeDeltaSec: -6, grindBias: 'coarser' },
  'species-level': { ratioDelta: 0.04, tempDeltaC: -0.3, brewTimeDeltaSec: -5, grindBias: 'coarser' },
  'non-arabica': { ratioDelta: 0.04, tempDeltaC: -0.3, brewTimeDeltaSec: -5, grindBias: 'coarser' },
  'indonesia-selection': { ratioDelta: -0.01, tempDeltaC: -0.1, brewTimeDeltaSec: 1, grindBias: 'same' },
  'regional-selection': { ratioDelta: 0, tempDeltaC: 0, brewTimeDeltaSec: 0, grindBias: 'same' },
  'lot-composition': { ratioDelta: 0, tempDeltaC: 0, brewTimeDeltaSec: 0, grindBias: 'same' },
};

function normalizeGroupKey(value: string | undefined) {
  return String(value || '').trim().toLowerCase();
}

function hasModifierValues(value: Partial<NumericModifier> | undefined) {
  return Boolean(value && Object.keys(value).length > 0);
}

export function mergeProcessModifiers(entry: ProcessCatalogEntry | undefined): Partial<NonNullable<ProcessCatalogEntry['numericModifiers']>> {
  if (!entry) return NEUTRAL_MODIFIER;
  const groupFallback = PROCESS_GROUP_FALLBACK_MODIFIERS[normalizeGroupKey(entry.group)];
  const curated = PROCESS_CURATED_MODIFIERS_V2026_05[entry.id];
  return {
    ...NEUTRAL_MODIFIER,
    ...(groupFallback || {}),
    ...(curated || {}),
    ...(entry.numericModifiers || {}),
  };
}

export function mergeVarietyModifiers(entry: VarietyCatalogEntry | undefined): Partial<NonNullable<VarietyCatalogEntry['numericModifiers']>> {
  if (!entry) return NEUTRAL_MODIFIER;
  const lineageKey = entry.taxonomy?.lineageGroup || '';
  const lineageFallback = LINEAGE_GROUP_MODIFIERS_V2026_05[lineageKey];
  const groupFallback = VARIETY_GROUP_FALLBACK_MODIFIERS[normalizeGroupKey(entry.group)];
  const curated = VARIETY_CURATED_MODIFIERS_V2026_05[entry.id];
  return {
    ...NEUTRAL_MODIFIER,
    ...(groupFallback || {}),
    ...(lineageFallback || {}),
    ...(curated || {}),
    ...(entry.numericModifiers || {}),
  };
}

export function resolveProcessModifierCoverage(entry: ProcessCatalogEntry | undefined) {
  if (!entry) return 'neutral';
  if (hasModifierValues(entry.numericModifiers)) return 'exact_entry';
  if (hasModifierValues(PROCESS_CURATED_MODIFIERS_V2026_05[entry.id])) return 'curated';
  if (hasModifierValues(PROCESS_GROUP_FALLBACK_MODIFIERS[normalizeGroupKey(entry.group)])) return 'group_fallback';
  return 'neutral';
}

export function resolveVarietyModifierCoverage(entry: VarietyCatalogEntry | undefined) {
  if (!entry) return 'neutral';
  if (hasModifierValues(entry.numericModifiers)) return 'exact_entry';
  if (hasModifierValues(VARIETY_CURATED_MODIFIERS_V2026_05[entry.id])) return 'curated';
  if (hasModifierValues(LINEAGE_GROUP_MODIFIERS_V2026_05[entry.taxonomy?.lineageGroup || ''])) return 'lineage_group';
  if (hasModifierValues(VARIETY_GROUP_FALLBACK_MODIFIERS[normalizeGroupKey(entry.group)])) return 'group_fallback';
  return 'neutral';
}

export function deriveBeanProfileAdjustment(input: AiBrewFormState): {
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
          ].filter(Boolean).join(' - ')
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
