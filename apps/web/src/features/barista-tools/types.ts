export type BrewMethodId =
  | 'espresso'
  | 'v60'
  | 'v60_japanese_iced'
  | 'chemex'
  | 'chemex_iced'
  | 'kalita_wave'
  | 'kalita_wave_iced'
  | 'melitta'
  | 'melitta_iced'
  | 'french_press'
  | 'aeropress'
  | 'clever_dripper'
  | 'clever_dripper_iced'
  | 'origami'
  | 'origami_iced'
  | 'april'
  | 'april_iced'
  | 'kono'
  | 'kono_iced'
  | 'siphon'
  | 'moka_pot'
  | 'cold_brew'
  | 'batch_brew';

export type BrewCalcMode = 'basic' | 'advanced';
export type BrewUnitMode = 'metric' | 'imperial';
export type BrewCategory = 'filter' | 'espresso' | 'batch';
export type ShotPresetId = 'ristretto' | 'espresso' | 'lungo' | 'doppio';
export type RoastLevel = 'light' | 'medium_light' | 'medium' | 'medium_dark' | 'dark';
export type RoastInputMode = 'level' | 'agtron';
export type GrindBias = 'finer' | 'same' | 'coarser';
export type EvidenceConfidence = 'high' | 'medium' | 'experimental';
export type EvidenceSourceTag = 'core_standard' | 'competition_rule' | 'peer_review' | 'regional_context';

export interface RatioWarningPolicy {
  min: number;
  max: number;
  label: string;
}

export interface ShotPreset {
  id: ShotPresetId;
  label: string;
  ratio: number;
  ratioRange: {
    min: number;
    max: number;
  };
  timeSeconds: {
    min: number;
    max: number;
  };
}

export interface RoastWarningRules {
  highTempWarnAboveC: number;
  lowTempWarnBelowC: number;
}

export interface RoastAdjustmentProfile {
  tempDeltaC: number;
  ratioDelta: number;
  brewTimeDeltaSec: number;
  grindBias: GrindBias;
  warningRules: RoastWarningRules;
}

export interface EvidenceSource {
  id: string;
  title: string;
  org: string;
  url: string;
  publishedAt: string;
  versionTag: string;
  tags: EvidenceSourceTag[];
}

export interface MethodEvidenceBaseline {
  ratioDefault: number;
  ratioRange: [number, number];
  tempRangeC: [number, number];
  brewTimeRangeSec: [number, number];
}

export interface MethodEvidenceProfile {
  methodId: BrewMethodId;
  category: BrewCategory;
  baseline: MethodEvidenceBaseline;
  ratioPolicy: RatioWarningPolicy;
  roastSupport: {
    agtronRange?: [number, number];
    defaultLevel: RoastLevel;
  };
  roastAdjustments?: Record<RoastLevel, RoastAdjustmentProfile>;
  confidence: EvidenceConfidence;
  validationNotes: string[];
  sources: string[];
  updatedAt: string;
}

export interface StandardsPackVersion {
  packVersion: string;
  generatedAt: string;
  sourceDigest: string;
}

export interface BrewMethodProfile {
  id: BrewMethodId;
  label: string;
  category: BrewCategory;
  recommendedRatios: number[];
  ratioPolicy?: RatioWarningPolicy;
  shotPresets?: ShotPreset[];
  ratioDefault: number;
  ratioRange: [number, number];
  tempRangeC: [number, number];
  brewTimeRangeSec: [number, number];
  retentionFactor: number;
  processLossMl: number;
  grindGuidance: string;
  scaNotes: string;
  roastSupport?: {
    agtronRange?: [number, number];
    defaultLevel: RoastLevel;
  };
  roastAdjustments?: Record<RoastLevel, RoastAdjustmentProfile>;
  japaneseSplit?: {
    hotWaterShare: number;
    iceShare: number;
  };
}

export interface BrewCalcInputs {
  method: BrewMethodProfile;
  doseG: number;
  waterMl: number;
  ratio: number;
  tdsPercent?: number;
  measuredOutputMl?: number;
}

export interface BrewCalcOutputs {
  waterRetainedMl: number;
  processLossMl: number;
  beverageOutputMl: number;
  beverageOutputOz: number;
  extractionYieldPct?: number;
  extractionBand?: 'under' | 'target' | 'over';
  brewStrengthPct?: number;
}

export interface BrewGuardrailState {
  errors: string[];
  warnings: string[];
}
