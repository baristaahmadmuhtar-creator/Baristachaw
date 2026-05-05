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

export function mergeProcessModifiers(entry: ProcessCatalogEntry | undefined): Partial<NonNullable<ProcessCatalogEntry['numericModifiers']>> {
  if (!entry) return {};
  const curated = PROCESS_CURATED_MODIFIERS_V2026_05[entry.id];
  return {
    ...(curated || {}),
    ...(entry.numericModifiers || {}),
  };
}

export function mergeVarietyModifiers(entry: VarietyCatalogEntry | undefined): Partial<NonNullable<VarietyCatalogEntry['numericModifiers']>> {
  if (!entry) return {};
  const curated = VARIETY_CURATED_MODIFIERS_V2026_05[entry.id];
  return {
    ...(curated || {}),
    ...(entry.numericModifiers || {}),
  };
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
