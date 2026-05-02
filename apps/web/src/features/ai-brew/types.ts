import type {
  BrewGuardrailState,
  BrewMethodId,
  GrindBias,
  RoastLevel,
} from '../barista-tools/types.ts';

export type AiBrewMode = 'hot' | 'iced';
export type AiBrewPourStyle = 'auto' | 'balanced' | 'pulse' | 'gentle';
export type AiBrewPourCount = 'auto' | '3' | '4' | '5';

export type AiBrewMethodFamily =
  | 'v60'
  | 'chemex'
  | 'kalita_wave'
  | 'clever_dripper'
  | 'origami'
  | 'april'
  | 'melitta'
  | 'kono'
  | 'french_press'
  | 'aeropress'
  | 'siphon'
  | 'moka_pot'
  | 'cold_brew'
  | 'batch_brew'
  | 'espresso';

export type CatalogPopularityTier =
  | 'widely_used'
  | 'specialty_common'
  | 'emerging'
  | 'niche';

export type VerificationLevel =
  | 'official'
  | 'community_verified'
  | 'curated'
  | 'dataset_unverified'
  | 'fallback';

export type CatalogMarketSegment =
  | 'mass_market'
  | 'specialty_mainstream'
  | 'small_market';

export type CatalogReleaseStatus =
  | 'established'
  | 'new'
  | 'legacy';

export type CatalogConfidence = 'high' | 'medium' | 'low';
export type WaterPresetStatus = 'autofill' | 'manual_required' | 'info_only';
export type WaterMode = 'brand' | 'manual';
export type WaterMarket = 'id' | 'sg' | 'bn' | 'my' | 'global';
export type WaterPublishState = 'published' | 'review_only' | 'rejected';
export type BeanRoastDevelopment = '' | 'underdeveloped' | 'balanced' | 'developed';
export type BeanSolubility = '' | 'low' | 'medium' | 'high';
export type DeviceProfileMode = 'exact' | 'derived_template' | 'family_fallback';
export type GrindSettingMode = 'catalog_reference' | 'derived_baseline';
export type WaterClassification =
  | 'balanced'
  | 'zero_mineral_ro'
  | 'soft_balanced'
  | 'body_builder'
  | 'high_buffer'
  | 'alkaline_caution'
  | 'manual_required';

export interface CatalogProvenance {
  source: string;
  sourceUrls: string[];
  verificationLevel: VerificationLevel;
  verifiedAt: string;
  popularityTier: CatalogPopularityTier;
  marketSegment: CatalogMarketSegment;
  releaseStatus: CatalogReleaseStatus;
  confidence: CatalogConfidence;
  catalogVersion: string;
}

export interface RawDripperCatalogEntry {
  id: number | string;
  name: string;
  brand?: string;
  type: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
  source?: string;
  sourceUrl?: string | null;
  sourceUrls?: string[] | null;
  verificationLevel?: VerificationLevel;
  verifiedAt?: string;
  popularityTier?: CatalogPopularityTier;
  marketSegment?: CatalogMarketSegment;
  releaseStatus?: CatalogReleaseStatus;
  confidence?: CatalogConfidence;
  catalogVersion?: string;
}

export interface RawGrinderCatalogEntry {
  id: number | string;
  name: string;
  brand?: string;
  type: string;
  coarse: string;
  medium: string;
  fine: string;
  image_url?: string | null;
  created_at?: string;
  source?: string;
  sourceUrl?: string | null;
  sourceUrls?: string[] | null;
  verificationLevel?: VerificationLevel;
  verifiedAt?: string;
  popularityTier?: CatalogPopularityTier;
  marketSegment?: CatalogMarketSegment;
  releaseStatus?: CatalogReleaseStatus;
  confidence?: CatalogConfidence;
  catalogVersion?: string;
}

export interface ParsedNumericRange {
  min: number;
  max: number;
  unitLabel: string;
  precision: number;
}

export interface EquipmentCatalogEntry extends CatalogProvenance {
  id: string;
  kind: 'dripper' | 'grinder';
  name: string;
  brand?: string;
  typeLabel: string;
  description?: string;
  searchText: string;
  methodFamily?: AiBrewMethodFamily;
  defaultProfileId?: string;
  grindBands?: {
    coarse: string;
    medium: string;
    fine: string;
    parsedMedium?: ParsedNumericRange | null;
  };
}

export interface VarietyCatalogEntry extends CatalogProvenance {
  id: string;
  label: string;
  group: string;
  aliases: string[];
  searchText: string;
  origins?: string[];
  originNotes?: string;
  numericModifiers?: {
    ratioDelta?: number;
    tempDeltaC?: number;
    brewTimeDeltaSec?: number;
    grindBias?: GrindBias;
  };
  notes: string[];
}

export interface ProcessCatalogEntry extends CatalogProvenance {
  id: string;
  label: string;
  group: string;
  aliases: string[];
  searchText: string;
  origins?: string[];
  numericModifiers?: {
    ratioDelta?: number;
    tempDeltaC?: number;
    brewTimeDeltaSec?: number;
    grindBias?: GrindBias;
  };
  notes: string[];
}

export interface WaterGuidance extends CatalogProvenance {
  id: string;
  label: string;
  description: string;
  recommended: {
    tdsPpm: [number, number];
    hardnessPpm: [number, number];
    alkalinityPpm: [number, number];
  };
  caution: {
    tooSoft: string;
    tooHard: string;
    tooLowAlkalinity: string;
    tooHighAlkalinity: string;
  };
  notes: string[];
}

export interface WaterChemistry {
  tdsPpm?: number;
  hardnessPpm?: number;
  alkalinityPpm?: number;
  calciumMgL?: number;
  magnesiumMgL?: number;
  bicarbonateMgL?: number;
  sodiumMgL?: number;
}

export interface WaterBrandResolvedMinerals {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
  derivation: 'direct' | 'derived_from_ions' | 'estimated_from_classification';
}

export interface WaterBrandProfile extends CatalogProvenance {
  id: string;
  brandGroupId: string;
  marketCode: WaterMarket;
  skuLabel: string;
  label: string;
  shortLabel: string;
  subtitle: string;
  country: string;
  markets: WaterMarket[];
  searchText: string;
  description?: string;
  notes: string[];
  presetStatus: WaterPresetStatus;
  publishState: WaterPublishState;
  isBrewReady: boolean;
  brewBlockReason: string[];
  still: boolean;
  recommendedForFilter: boolean;
  classification: WaterClassification;
  classificationLabel: string;
  classificationNote: string;
  classificationCaution?: string;
  chemistry: WaterChemistry;
  resolvedMinerals?: WaterBrandResolvedMinerals | null;
}

export interface WaterMineralInput {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
  notes?: string;
  styleLabel: string;
}

export interface TargetProfile {
  id: string;
  label: string;
  description: string;
  ratioDelta: number;
  tempDeltaC: number;
  brewTimeDeltaSec: number;
  grindBias: GrindBias;
  notes: string[];
  catalogVersion: string;
}

export type BrewTemplateStepKind =
  | 'pour'
  | 'wait'
  | 'release'
  | 'drawdown'
  | 'press'
  | 'heat'
  | 'extract'
  | 'serve';

export interface BrewTemplateStep {
  id: string;
  label: string;
  kind?: BrewTemplateStepKind;
  share: number;
  startSeconds: number;
  note: string;
}

export interface DeviceBrewProfile extends CatalogProvenance {
  id: string;
  label: string;
  brewMode: AiBrewMode;
  dripperIds: string[];
  methodFamily: AiBrewMethodFamily;
  brewMethodId: BrewMethodId;
  exactMatch: boolean;
  filterStyle: 'cone' | 'flat' | 'trapezoid' | 'immersion' | 'pressure' | 'vacuum' | 'stovetop' | 'cold_immersion' | 'batch';
  ratioDelta: number;
  tempDeltaC: number;
  brewTimeDeltaSec: number;
  grindBias: GrindBias;
  note: string;
  steps: BrewTemplateStep[];
}

export interface GrinderSettingReference extends CatalogProvenance {
  id: string;
  grinderId: string;
  brewMode: AiBrewMode | 'both';
  profileIds: string[];
  rangeLabel: string;
  parsedRange?: ParsedNumericRange | null;
  note: string;
}

export interface AiBrewCatalog {
  catalogVersion: string;
  drippers: EquipmentCatalogEntry[];
  grinders: EquipmentCatalogEntry[];
  processes: ProcessCatalogEntry[];
  varieties: VarietyCatalogEntry[];
  waterBrands: WaterBrandProfile[];
  waterGuidance: WaterGuidance;
  targetProfiles: TargetProfile[];
  deviceProfiles: DeviceBrewProfile[];
  grinderSettings: GrinderSettingReference[];
}

export interface AiBrewFormState {
  brewMode: AiBrewMode;
  coffeeName: string;
  doseG: string;
  process: string;
  customProcess: string;
  variety: string;
  customVariety: string;
  roastLevel: RoastLevel;
  altitudeMasl: string;
  beanDensityGml: string;
  roastDevelopment: BeanRoastDevelopment;
  solubility: BeanSolubility;
  dripperId: string;
  grinderId: string;
  waterMode: WaterMode;
  waterRegion: WaterMarket;
  waterBrandId: string;
  waterCustomized: boolean;
  waterTdsPpm: string;
  waterHardnessPpm: string;
  waterAlkalinityPpm: string;
  waterNotes: string;
  targetProfileId: string;
  targetRatio: string;
  targetWaterMl: string;
  targetTempC: string;
  pourStyle: AiBrewPourStyle;
  pourCount: AiBrewPourCount;
}

export interface BeanProfileState {
  altitudeMasl?: number;
  beanDensityGml?: number;
  roastDevelopment?: Exclude<BeanRoastDevelopment, ''>;
  solubility?: Exclude<BeanSolubility, ''>;
  active: boolean;
  summary: string;
  notes: string[];
}

export interface BrewPlanStep {
  id: string;
  label: string;
  kind?: BrewTemplateStepKind;
  startSeconds: number;
  targetVolumeMl: number;
  pourVolumeMl: number;
  note: string;
  hybridInstruction?: string;
}

export interface BrewPlanAiNotes {
  finisher?: string;
  generate?: string;
  sequence?: string;
  sequenceCanonical?: string;
  sequenceServicePattern?: string[];
  sequenceWatch?: string[];
  explain?: string;
  troubleshoot?: string;
  adjust?: string;
  sop?: string;
}

export interface BrewPlan {
  id: string;
  fingerprint: string;
  createdAt: number;
  catalogVersion: string;
  formState: AiBrewFormState;
  brewMode: AiBrewMode;
  methodFamily: AiBrewMethodFamily;
  methodId: BrewMethodId;
  ratioToolMethodId: BrewMethodId;
  coffeeName: string;
  process: string;
  variety: string;
  roastLevel: RoastLevel;
  beanProfile: BeanProfileState;
  targetProfileId: string;
  targetProfileLabel: string;
  dripper: EquipmentCatalogEntry;
  grinder: EquipmentCatalogEntry;
  waterMode: WaterMode;
  waterRegion: WaterMarket;
  waterBrandId: string;
  waterBrandLabel?: string;
  waterPresetStatus?: WaterPresetStatus;
  waterPublishState?: WaterPublishState;
  waterIsBrewReady: boolean;
  waterBrewBlockReason: string[];
  waterBrandMarkets: WaterMarket[];
  waterBrandVerification?: VerificationLevel;
  waterBrandSourceUrls: string[];
  waterCustomized: boolean;
  waterMinerals: WaterMineralInput;
  waterGuidance: WaterGuidance;
  totalWaterMl: number;
  hotWaterMl: number;
  iceMl: number;
  recommendedRatio: number;
  finalBeverageRatio: number;
  hotExtractionRatio: number;
  hotWaterSharePercent: number;
  iceSharePercent: number;
  doseG: number;
  waterTempC: number;
  totalTimeSeconds: number;
  estimatedCupOutputMl: number;
  estimatedBrewOutputMl: number;
  estimatedBeverageOutputMl: number;
  grindBias: GrindBias;
  grindRecommendation: string;
  grindBandLabel: string;
  summary: string;
  steps: BrewPlanStep[];
  notes: string[];
  warnings: string[];
  guardrails: BrewGuardrailState;
  conformance: {
    warnings: string[];
    standardsHits: string[];
    standardsMisses: string[];
  };
  deviceProfileId: string;
  deviceProfileLabel: string;
  deviceProfileMode: DeviceProfileMode;
  grindSettingReference: string;
  grindSettingMode: GrindSettingMode;
  grindSettingVerification: VerificationLevel;
  fallbackUsed: boolean;
  provenanceAttentionNeeded: boolean;
  confidenceNotes: string[];
  aiNotes?: BrewPlanAiNotes;
}

export interface BrewJournalEntry {
  id: string;
  fingerprint: string;
  title: string;
  locale: string;
  createdAt: number;
  updatedAt: number;
  plan: BrewPlan;
  aiNotes?: BrewPlanAiNotes;
}

export interface BrewPreset {
  id: string;
  fingerprint: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  plan: BrewPlan;
}

export interface AiBrewPromptContext {
  title: string;
  body: string;
}
