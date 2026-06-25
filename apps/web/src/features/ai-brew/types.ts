import type {
  BrewGuardrailState,
  BrewMethodId,
  GrindBias,
  RoastLevel,
} from '../barista-tools/types.ts';

export type AiBrewMode = 'hot' | 'iced';
export type AiBrewPourStyle = 'auto' | 'balanced' | 'pulse' | 'gentle';
export type AiBrewPourCount = 'auto' | '3' | '4' | '5';
export type ManualBrewPresetCategory = 'competition_inspired' | 'global_classic' | 'taste_target';
export type ManualBrewTechniquePattern =
  | 'two_pour'
  | 'four_six'
  | 'equal_five_pour'
  | 'flat_bottom_fast_four'
  | 'front_loaded_four'
  | 'continuous_high_extraction'
  | 'temperature_decline_finish'
  | 'ten_pour_multi'
  | 'chemex_clean'
  | 'aeropress_clean'
  | 'generic_fast';
export type ManualBrewPresetVerificationLevel =
  | 'official_reference'
  | 'curated_reference'
  | 'community_reference'
  | 'internal_synthesis';
export type OrigamiFilterStyle = 'auto' | 'cone' | 'wave';
export type AeroPressRecipeStyle =
  | 'auto'
  | 'standard'
  | 'inverted'
  | 'bypass'
  | 'no_bypass'
  | 'bright_clean'
  | 'sweet_body';
export type FrenchPressRecipeStyle =
  | 'auto'
  | 'traditional'
  | 'clean_decant'
  | 'double_filter'
  | 'heavy_concentrate'
  | 'sweet_immersion';
export type KalitaWaveRecipeStyle =
  | 'auto'
  | 'traditional_flat_three'
  | 'competition_fast_four'
  | 'continuous_slow_stream'
  | 'iced_wave'
  | 'high_dose_concentrate';
export type CleverDripperRecipeStyle =
  | 'auto'
  | 'classic_closed'
  | 'reverse_water_first'
  | 'double_stage_hybrid'
  | 'iced_clever'
  | 'high_dose_concentrate';
export type ChemexRecipeStyle =
  | 'auto'
  | 'traditional_three_pour'
  | 'competition_multi_pulse'
  | 'continuous_center_pour'
  | 'iced_chemex'
  | 'high_dose_heavy_body';
export type MokaPotRecipeStyle =
  | 'auto'
  | 'traditional_stovetop'
  | 'preheated_boiler'
  | 'low_temp_controlled'
  | 'iced_moka_concentrate'
  | 'high_yield_robust';
export type ColdBrewRecipeStyle =
  | 'auto'
  | 'classic_toddy_immersion'
  | 'cold_drip_tower'
  | 'double_extraction_concentrate'
  | 'accelerated_room_temp'
  | 'japanese_slow_drip';
export type BatchBrewRecipeStyle =
  | 'auto'
  | 'sca_gold_cup'
  | 'heavy_batch_catering'
  | 'bright_light_roast_batch'
  | 'pre_wet_hybrid_batch'
  | 'high_extraction_thermos';
export type SiphonRecipeStyle =
  | 'auto'
  | 'traditional_vacuum_siphon'
  | 'competition_triple_agitation'
  | 'low_temp_delicate'
  | 'high_body_fast_drawdown'
  | 'spirit_infusion_style';
export type OrigamiRecipeStyle =
  | 'auto'
  | 'cone_dripper_style'
  | 'wave_dripper_style'
  | 'mugen_one_pour'
  | 'iced_origami'
  | 'competition_hybrid_flow';
export type AprilRecipeStyle =
  | 'auto'
  | 'april_flat_bottom_standard'
  | 'april_continuous_slow'
  | 'competition_two_pour'
  | 'iced_april_style'
  | 'high_body_heavy_dose';
export type MelittaRecipeStyle =
  | 'auto'
  | 'traditional_melitta_one_pour'
  | 'aromaboy_style'
  | 'three_pour_melitta'
  | 'iced_melitta_brew'
  | 'dense_classic_extraction';
export type KonoRecipeStyle =
  | 'auto'
  | 'kono_meimon_traditional'
  | 'kono_dripper_standard'
  | 'kono_slow_drip_body'
  | 'iced_kono_meimon'
  | 'kono_agitation_sweet';
export type AiBrewEngineMode =
  | 'local_planner'
  | 'precision_planner'
  | 'ai_assist_explain'
  | 'ai_assist_taste_fix'
  | 'ai_assist_rewrite'
  | 'ai_assist_deep_analysis'
  | 'strict_hybrid_optimization'
  | 'full_ai_disabled';
export type MethodWorkflow =
  | 'pourover'
  | 'immersion'
  | 'pressure'
  | 'stovetop'
  | 'vacuum'
  | 'batch'
  | 'cold_immersion'
  | 'espresso';
export type FlatBottomProfileFamily =
  | 'april_low_agitation'
  | 'fast_flat_bottom'
  | 'restricted_flat_bottom'
  | 'no_bypass';

export type AiBrewMethodFamily =
  | 'v60'
  | 'chemex'
  | 'kalita_wave'
  | 'clever_dripper'
  | 'hario_switch'
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
export type CatalogReviewStatus = 'fresh' | 'needs_review' | 'deprecated' | 'conflicting';
export type CoffeeTaxonomyRiskTag =
  | 'decaf-sensitive'
  | 'aroma-preservation'
  | 'low-bitterness'
  | 'low-bitterness-margin'
  | 'experimental'
  | 'ferment-risk'
  | 'high-ferment'
  | 'drying-only'
  | 'non-arabica'
  | 'canephora'
  | 'liberica'
  | 'excelsa'
  | 'unusual-species'
  | 'bitter-risk'
  | 'muddy-risk'
  | 'woody-risk'
  | 'earthy-risk'
  | 'high-aroma'
  | 'clarity-leaning'
  | 'body-heavy'
  | 'body-medium'
  | 'low-acidity'
  | 'high-acidity'
  | 'low-solubility'
  | 'high-solubility'
  | 'conservative-extraction'
  | 'conservative-temperature'
  | 'taste-feedback-required'
  | 'lot-dependent'
  | 'floral-possible'
  | 'structure'
  | 'disease-resistant'
  | 'hybrid-species'
  | 'regional-variation'
  | 'delicate'
  | 'low-confidence-if-unverified';
export type VarietyTaxonomySpecies =
  | 'arabica'
  | 'canephora'
  | 'liberica'
  | 'excelsa'
  | 'eugenioides'
  | 'stenophylla'
  | 'racemosa'
  | 'hybrid'
  | 'unknown';
export type VarietyLineageGroup =
  | 'bourbon_typica'
  | 'ethiopian_landrace'
  | 'introgressed'
  | 'f1_hybrid'
  | 'canephora_clone'
  | 'liberica_excelsa'
  | 'brazil_selection'
  | 'kenyan_selection'
  | 'indonesia_selection'
  | 'regional_selection'
  | 'classic_arabica'
  | 'specialty_reference'
  | 'unknown';
export type VarietyCultivarType =
  | 'botanical_variety'
  | 'cultivar'
  | 'landrace'
  | 'clone'
  | 'regional_alias'
  | 'marketing_label'
  | 'mixed_lot'
  | 'unknown';
export interface CatalogSensoryBias {
  acidity: -2 | -1 | 0 | 1 | 2;
  sweetness: -2 | -1 | 0 | 1 | 2;
  body: -2 | -1 | 0 | 1 | 2;
  clarity: -2 | -1 | 0 | 1 | 2;
  fermentIntensity: 0 | 1 | 2 | 3;
  bitternessRisk: 0 | 1 | 2 | 3;
  aromaVolatility: 0 | 1 | 2 | 3;
}
export interface ProcessRiskModel {
  variability: 'low' | 'medium' | 'high';
  overFermentRisk: 'low' | 'medium' | 'high';
  recommendationMode: 'deterministic' | 'conservative' | 'taste_feedback_required';
}
export type WaterPresetStatus = 'autofill' | 'manual_required' | 'info_only';
export type WaterMode = 'brand' | 'manual';
export type WaterMarket = 'id' | 'sg' | 'bn' | 'my' | 'global';
export type WaterPublishState = 'published' | 'review_only' | 'rejected';
export type SwitchBrewProgramme =
  | 'auto'
  | 'full_immersion'
  | 'full_immersion_sweet'
  | 'full_immersion_heavy_body'
  | 'bloom_then_immersion'
  | 'percolation_then_immersion'
  | 'immersion_then_percolation'
  | 'full_percolation_v60_mode'
  | 'temperature_shift_hybrid'
  | 'iced_hybrid'
  | 'competition_hybrid';
export type SwitchPublicPresetId =
  | 'immersion_sweet'
  | 'immersion_heavy_body'
  | 'hybrid_balanced'
  | 'hybrid_bright_clean'
  | 'v60_mode'
  | 'iced_hybrid'
  | 'mugen_everyday_hybrid';
export type SwitchTeachingMode = 'full_immersion' | 'full_percolation_v60_mode' | 'hybrid';
export type SwitchWorkflowVerificationLevel = 'official_recipe' | 'curated_synthesis' | 'internal_model';
export type SwitchSourceType =
  | 'official_hardware'
  | 'official_recipe'
  | 'barista_curated'
  | 'education'
  | 'internal_model';
export type SwitchValveState = 'closed' | 'open' | 'transition';
export type SwitchChamberState =
  | 'empty'
  | 'bloom'
  | 'filling'
  | 'immersion'
  | 'percolation'
  | 'releasing'
  | 'drawdown'
  | 'served';
export type BrewPourPath = 'center' | 'center_to_mid' | 'flat_center' | 'compact_spiral' | 'immersion_charge' | 'press' | 'heat_control' | 'machine_flow';
export type BrewPourHeight = 'low' | 'medium';
export type BrewAgitationLevel = 'minimal' | 'low' | 'controlled' | 'medium';
export interface DevicePhysicalConstraints {
  finishedCapacityMl?: number;
  recommendedClosedPhaseMaxMl?: number;
  workingHeadspaceMl?: number;
  filterSize?: string;
  coneType?: 'v60' | 'mugen' | 'flat' | 'trapezoid' | 'custom';
}
export interface SwitchSourceReference {
  label: string;
  url: string;
  sourceType: SwitchSourceType;
}

export interface SwitchExpectedCupShift {
  acidity?: number;
  sweetness?: number;
  body?: number;
  clarity?: number;
  bitterRisk?: number;
  aromaIntensity?: number;
}

export interface SwitchProgrammeProvenance {
  hardwareVerificationLevel: VerificationLevel;
  workflowVerificationLevel: SwitchWorkflowVerificationLevel;
  sensoryModelConfidence: AiBrewScoreConfidence;
  curatedFromSources: SwitchSourceReference[];
  reviewedAt: string;
  evidenceUpdatedAt: string;
}

export interface SwitchPublicPreset {
  id: SwitchPublicPresetId;
  label: string;
  labelId?: string;
  teachingMode: SwitchTeachingMode;
  defaultProgramme: SwitchBrewProgramme;
  quickEligible: boolean;
  proOnly: boolean;
  mugenOnly?: boolean;
  defaultUse: string;
  defaultUseId?: string;
  cupShape: string;
  cupShapeId?: string;
  bestFor: string[];
  bestForId?: string[];
  easiestMistake: string;
  easiestMistakeId?: string;
  whenNotToUse: string;
  whenNotToUseId?: string;
  safeSizeCompatibility: string[];
  compatibleDripperIds: string[];
  preferredDripperIds?: string[];
  defaultDoseG?: number;
  doseG: number[];
  iced: boolean;
  internalProgrammes: SwitchBrewProgramme[];
  expectedCupShift: SwitchExpectedCupShift;
  why: string;
  whyId?: string;
  watch: string;
  watchId?: string;
  provenance: SwitchProgrammeProvenance;
}

export interface SwitchInternalProgramme {
  id: SwitchBrewProgramme;
  label: string;
  teachingMode: SwitchTeachingMode;
  proOnly: boolean;
  sourceStatus: SwitchWorkflowVerificationLevel;
  stepIntent: string;
  valvePath: SwitchValveState[];
  compatiblePresetIds: SwitchPublicPresetId[];
}

export interface SwitchDoseMatrixRow {
  id: string;
  dripperId: string;
  doseG: number;
  defaultTotalWaterMl: number;
  minTotalWaterMl: number;
  maxTotalWaterMl: number;
  safeClosedPhaseMaxMl: number;
  recommendedPresetIds: SwitchPublicPresetId[];
  blockedPresetIds: SwitchPublicPresetId[];
  cautionPresetIds: SwitchPublicPresetId[];
  note: string;
}

export interface SwitchTroubleshootingEntry {
  rating: BrewTasteFeedbackRating;
  presetIds: SwitchPublicPresetId[];
  primaryCorrection: string;
  backupCorrection: string;
  guardrail: string;
}

export interface SwitchKnowledgeMethod {
  id: SwitchTeachingMode;
  label: string;
  shortLabel: string;
  description: string;
  bestFor: string;
  risk: string;
}

export interface SwitchKnowledgeHardwareFact {
  dripperId: string;
  label: string;
  capacityMl: number;
  safeClosedPhaseMaxMl: number;
  sourceUrl: string;
  verificationLevel: VerificationLevel;
}

export interface SwitchKnowledge {
  teachingMethods: SwitchKnowledgeMethod[];
  hardwareFacts: SwitchKnowledgeHardwareFact[];
  provenanceCopy: {
    hardware: string;
    workflow: string;
    sensory: string;
  };
}

export interface SwitchCompatibilityState {
  status: 'safe' | 'caution' | 'blocked';
  sizeLabel: string;
  doseLabel: string;
  message: string;
  compatiblePresetIds: SwitchPublicPresetId[];
}

export interface SwitchChamberLoadCheckpoint {
  stepId: string;
  valveState: SwitchValveState;
  chamberLoadMl: number;
}

export interface SwitchTasteProgrammePlan {
  presetId: SwitchPublicPresetId;
  bloomMl: number;
  bloomRatio: number;
  bloomSeconds: number;
  closedPhaseMl: number;
  closedPhaseSeconds: number;
  openPhaseMl: number;
  releaseSeconds: number;
  pourStyle: string;
  flowRateMlPerSec: [number, number];
  pourPath: BrewPourPath;
  pourHeight: BrewPourHeight;
  agitationLevel: BrewAgitationLevel;
  valvePath: SwitchValveState[];
  chamberLoadPlan: SwitchChamberLoadCheckpoint[];
  sensoryReason: string;
  riskWarnings: string[];
  suggestedPresetId?: SwitchPublicPresetId;
  originalPresetId?: SwitchPublicPresetId;
  finalPresetId?: SwitchPublicPresetId;
  recoveryApplied?: boolean;
  recoveryReason?: string;
  originalPresetStatus?: 'safe' | 'caution' | 'blocked';
  finalPresetStatus?: 'safe' | 'caution' | 'blocked';
  safeClosedPhaseMaxMl?: number;
  peakClosedLoadMl?: number;
  canonicalHotWaterMl?: number;
  canonicalTotalWaterMl?: number;
  recoveryOptions?: SwitchPublicPresetId[];
}

export interface SwitchStepValidation {
  status: 'safe' | 'caution' | 'blocked';
  maxClosedLoadMl: number;
  peakClosedLoadMl: number;
  unsafeStepIds: string[];
  message: string;
  suggestedPresetId?: SwitchPublicPresetId;
}
export type WaterEvidenceProvenance =
  | 'official_label_or_lab'
  | 'official_brand_site'
  | 'regulator_or_distributor'
  | 'curated_public_reference'
  | 'internal_curated_snapshot'
  | 'user_manual_input'
  | 'classification_estimate'
  | 'remineralisation_target';
export type WaterReadyDecision =
  | 'brew_ready'
  | 'manual_mineral'
  | 'estimated'
  | 'ro_base_remineralise'
  | 'high_buffer_caution'
  | 'needs_review'
  | 'blocked';
export type WaterRecommendedAction =
  | 'use_as_is'
  | 'manual_measurement_required'
  | 'remineralise_first'
  | 'verify_market_sku'
  | 'use_with_caution'
  | 'review_before_publish';
export type GrinderReferenceType =
  | 'official_chart'
  | 'community_verified'
  | 'curated_baseline'
  | 'method_specific_master_table'
  | 'derived_from_grinder_band'
  | 'fallback_estimate'
  | 'user_calibration';
export interface GrinderUserCalibrationOverlay {
  zeroPointMethod?: string;
  burrTouchOffset?: string;
  personalFilterSweetSpot?: string;
  beanRoastNotes?: string;
}
export type BeanRoastDevelopment = '' | 'underdeveloped' | 'balanced' | 'developed';
export type BeanSolubility = '' | 'low' | 'medium' | 'high';
export type DeviceProfileMode = 'exact' | 'derived_template' | 'family_fallback';
export type GrindSettingMode = 'catalog_reference' | 'derived_baseline';
export type WaterClassification =
  | 'balanced'
  | 'low_mineral'
  | 'soft_low_buffer'
  | 'moderate'
  | 'moderate_upper_buffered'
  | 'hard_mineral'
  | 'high_tds'
  | 'blocked_unsuitable'
  | 'zero_mineral_ro'
  | 'low_mineral_clarity'
  | 'demineral_direct_experiment'
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
  reviewStatus?: CatalogReviewStatus;
  lastReviewedAt?: string;
  reviewNotes?: string[];
}

export interface CoffeeExtractionProfile {
  extractionRole: string;
  solubilityCue: string;
  sensoryBias: CatalogSensoryBias;
  riskTags: CoffeeTaxonomyRiskTag[];
  recipeGuidance: string[];
  guardrails: string[];
  confidence: CatalogConfidence;
  sourceUrls: string[];
  visibility: 'internal';
}

export interface ManualBrewPreset {
  id: string;
  safeLabel: string;
  category: ManualBrewPresetCategory;
  sourceAttribution: string;
  verificationLevel: ManualBrewPresetVerificationLevel;
  sourceUrls: string[];
  supportedDripperIds: string[];
  originalBrewerId?: string;
  fallbackDripperId?: string;
  fallbackReason?: string;
  targetDefaults: {
    brewMode: AiBrewMode;
    targetProfileId: string;
    doseG: number;
    targetWaterMl: number;
    targetTempC: number;
    targetRatio?: number;
    pourCount: Extract<AiBrewPourCount, '3' | '4' | '5'>;
    presetPourCount?: number;
    pourStyle: Exclude<AiBrewPourStyle, 'auto'>;
    waterTdsPpm: number;
    waterHardnessPpm: number;
    waterAlkalinityPpm: number;
    origamiFilterStyle?: OrigamiFilterStyle;
    aeropressStyle?: AeroPressRecipeStyle;
    frenchPressStyle?: FrenchPressRecipeStyle;
  };
  techniquePattern: ManualBrewTechniquePattern;
  visibleSummary: string;
  internalTips: string[];
  guardrails: string[];
  catalogVersion: string;
}

export interface RawDripperCatalogEntry {
  id: number | string;
  name: string;
  brand?: string;
  type: string;
  description?: string | null;
  expertDescription?: string | null;
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
  hidden?: boolean;
  deprecated?: boolean;
  migrationTargetIds?: string[];
  physicalConstraints?: DevicePhysicalConstraints;
  methodProgramme?: SwitchBrewProgramme | string;
}

export interface RawGrinderCatalogEntry {
  id: number | string;
  name: string;
  brand?: string;
  type: string;
  grinderType?: string;
  driveTypeConfidence?: 'high' | 'estimated';
  burrType?: string;
  safetyTags?: string[];
  idealMethodFamilies?: AiBrewMethodFamily[];
  avoidMethodFamilies?: AiBrewMethodFamily[];
  coarse: string;
  medium: string;
  fine: string;
  expertDescription?: string | null;
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

export type GrinderDriveType = 'hand' | 'electric' | 'hybrid' | 'unknown';
export type BurrType = 'conical' | 'flat' | 'hybrid' | 'unknown';
export type GrinderWarningSeverity = 'safe' | 'info' | 'caution' | 'blocked';

export interface EquipmentCatalogEntry extends CatalogProvenance {
  id: string;
  kind: 'dripper' | 'grinder';
  name: string;
  brand?: string;
  grinderDriveType?: GrinderDriveType;
  driveTypeConfidence?: 'high' | 'estimated';
  burrType?: BurrType;
  safetyTags?: string[];
  idealMethodFamilies?: AiBrewMethodFamily[];
  avoidMethodFamilies?: AiBrewMethodFamily[];
  typeLabel: string;
  description?: string;
  expertDescription?: string;
  searchText: string;
  methodFamily?: AiBrewMethodFamily;
  defaultProfileId?: string;
  hidden?: boolean;
  deprecated?: boolean;
  migrationTargetIds?: string[];
  physicalConstraints?: DevicePhysicalConstraints;
  methodProgramme?: SwitchBrewProgramme | string;
  grindBands?: {
    coarse: string;
    medium: string;
    fine: string;
    parsedCoarse?: ParsedNumericRange | null;
    parsedMedium?: ParsedNumericRange | null;
    parsedFine?: ParsedNumericRange | null;
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
  taxonomy?: {
    species: VarietyTaxonomySpecies;
    lineageGroup: VarietyLineageGroup;
    cultivarType: VarietyCultivarType;
    parentage?: string[];
  };
  sensoryBias?: CatalogSensoryBias;
  riskTags?: CoffeeTaxonomyRiskTag[];
  numericModifiers?: {
    ratioDelta?: number;
    tempDeltaC?: number;
    brewTimeDeltaSec?: number;
    grindBias?: GrindBias;
  };
  notes: string[];
  expertDescription?: string;
  extractionProfile?: CoffeeExtractionProfile;
}

export interface ProcessCatalogEntry extends CatalogProvenance {
  id: string;
  label: string;
  group: string;
  aliases: string[];
  searchText: string;
  origins?: string[];
  sensoryBias?: CatalogSensoryBias;
  processRisk?: ProcessRiskModel;
  riskTags?: CoffeeTaxonomyRiskTag[];
  numericModifiers?: {
    ratioDelta?: number;
    tempDeltaC?: number;
    brewTimeDeltaSec?: number;
    grindBias?: GrindBias;
  };
  notes: string[];
  expertDescription?: string;
  extractionProfile?: CoffeeExtractionProfile;
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
  derivation: 'direct' | 'derived_from_ions' | 'estimated_from_community_profile' | 'estimated_from_classification';
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
  provenanceLadder?: WaterEvidenceProvenance;
  plantScope?: string;
  skuScope?: string;
  collectedAt?: string;
  reviewDueAt?: string;
  evidenceId?: string;
  sourceHash?: string;
  readyDecision?: WaterReadyDecision;
  readyReason?: string;
  recommendedAction?: WaterRecommendedAction;
}

export interface WaterMineralInput {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
  notes?: string;
  styleLabel: string;
}

export interface TargetProfilePourBehavior {
  bloomMultiplier?: number;
  bloomTimeSec?: number;
  middleLoadBias?: 'light' | 'balanced' | 'full';
  finalLoadBias?: 'light' | 'balanced' | 'gentle';
  agitation?: 'minimal' | 'low' | 'medium' | 'controlled';
  pourHeight?: 'low' | 'medium';
  drawdownBias?: 'faster' | 'normal' | 'slower';
}

export interface TargetProfile {
  id: string;
  label: string;
  description: string;
  ratioDelta: number;
  tempDeltaC: number;
  brewTimeDeltaSec: number;
  grindBias: GrindBias;
  pourBehavior?: TargetProfilePourBehavior;
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
  flowRateMlPerSec?: [number, number];
  pourPath?: BrewPourPath;
  pourHeight?: BrewPourHeight;
  agitationLevel?: BrewAgitationLevel;
  valveState?: SwitchValveState;
  chamberState?: SwitchChamberState;
  chamberLoadShare?: number;
  chamberLoadMl?: number;
  switchProgramme?: SwitchBrewProgramme;
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
  methodWorkflow?: MethodWorkflow;
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
  ratioDelta: number;
  tempDeltaC: number;
  brewTimeDeltaSec: number;
  grindBias: GrindBias;
  note: string;
  targetWaterMl?: number;
  hotWaterMl?: number;
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
  referenceType?: GrinderReferenceType;
  zeroPointMethod?: string;
  calibrationRequired?: boolean;
  userCalibrationOverlay?: GrinderUserCalibrationOverlay;
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
  manualBrewPresets: ManualBrewPreset[];
  switchPresets?: SwitchPublicPreset[];
  switchProgrammes?: SwitchInternalProgramme[];
  switchDoseMatrix?: SwitchDoseMatrixRow[];
  switchTroubleshooting?: SwitchTroubleshootingEntry[];
  switchKnowledge?: SwitchKnowledge;
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
  manualPresetId?: string;
  origamiFilterStyle: OrigamiFilterStyle;
  aeropressStyle: AeroPressRecipeStyle;
  frenchPressStyle: FrenchPressRecipeStyle;
  switchPresetId?: SwitchPublicPresetId | '';
  switchTeachingMode?: SwitchTeachingMode | '';
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

export type BeanCoverageCategory =
  | 'known_high'
  | 'partial_medium'
  | 'unknown_fallback'
  | 'risk_caution'
  | 'unsupported_unsafe';

export type BeanTaxonomyCategory =
  | 'known_catalog'
  | 'regional_alias'
  | 'custom_detected'
  | 'unknown_fallback'
  | 'risk_caution';

export interface BeanTaxonomySignal {
  category: BeanTaxonomyCategory;
  confidence: AiBrewScoreConfidence;
  processId?: string;
  varietyId?: string;
  processLabel: string;
  varietyLabel: string;
  reasons: string[];
  warnings: string[];
}

export interface BeanCoverageState {
  category: BeanCoverageCategory;
  confidence: AiBrewScoreConfidence;
  label: string;
  reasons: string[];
  warnings: string[];
  nextAction: string;
}

export interface BrewPlanStep {
  id: string;
  label: string;
  kind?: BrewTemplateStepKind;
  share?: number;
  startSeconds: number;
  targetVolumeMl: number;
  pourVolumeMl: number;
  flowRateMlPerSec?: [number, number];
  pourPath?: BrewPourPath;
  pourHeight?: BrewPourHeight;
  agitationLevel?: BrewAgitationLevel;
  valveState?: SwitchValveState;
  chamberState?: SwitchChamberState;
  chamberLoadMl?: number;
  switchProgramme?: SwitchBrewProgramme;
  note: string;
  hybridInstruction?: string;
}

export type WorkflowGuideActionType =
  | 'setup'
  | 'rinse_preheat'
  | 'dose'
  | 'puck_prep'
  | 'bloom'
  | 'pour'
  | 'charge'
  | 'stir'
  | 'swirl'
  | 'steep'
  | 'release'
  | 'drawdown'
  | 'press'
  | 'heat'
  | 'monitor_flow'
  | 'extract'
  | 'stop'
  | 'settle'
  | 'decant'
  | 'filter'
  | 'dilute'
  | 'mix'
  | 'serve'
  | 'wait';

export type WorkflowGuideChipKey =
  | 'flow'
  | 'path'
  | 'height'
  | 'agitation'
  | 'charge'
  | 'stir'
  | 'swirl'
  | 'steep'
  | 'press'
  | 'stop'
  | 'boiler'
  | 'basket'
  | 'heat'
  | 'flow_cue'
  | 'dose'
  | 'yield'
  | 'shot_time'
  | 'puck_prep'
  | 'settle'
  | 'decant'
  | 'release'
  | 'valve'
  | 'chamber'
  | 'chamber_load'
  | 'programme'
  | 'drawdown'
  | 'draw_up'
  | 'contact'
  | 'dose_per_liter'
  | 'basket_prep'
  | 'spray'
  | 'mix_batch'
  | 'saturation'
  | 'filter'
  | 'dilution';

export interface WorkflowGuideTechniqueChip {
  key: WorkflowGuideChipKey;
  label: string;
  value: string;
}

export interface WorkflowGuideStep extends BrewPlanStep {
  actionType: WorkflowGuideActionType;
  primaryText: string;
  secondaryText?: string;
  endSeconds?: number;
  techniqueChips: WorkflowGuideTechniqueChip[];
  warnings: string[];
  sourceStepIds: string[];
  isOperationalOnly: boolean;
}

export type BrewPlanTimeDisplayMode =
  | 'extraction'
  | 'guide'
  | 'long_steep'
  | 'cold_brew'
  | 'pressure';

export interface MethodWorkflowValidationResult {
  passed: boolean;
  status: 'ready' | 'needs_review' | 'blocked';
  missingPhases: string[];
  warnings: string[];
  blockingErrors: string[];
  readinessScore: number;
}

export type AiBrewScoreConfidence = 'high' | 'medium' | 'low';

export interface ExpectedCupProfile {
  acidity: number;
  sweetness: number;
  body: number;
  clarity: number;
  bitterRisk: number;
  aromaIntensity?: number;
  confidence: AiBrewScoreConfidence;
  reasons: string[];
  warnings: string[];
}

export interface AiBrewReadinessScores {
  recipe: number;
  water: number;
  grinder: number;
  workflow: number;
  catalog: number;
  recipeArithmetic?: number;
  languageQuality?: number;
  sourceFidelity?: number;
  grinderCalibration?: number;
  waterVerification?: number;
  realBrewEvidence?: number;
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
  rewrite?: string;
  deepAnalysis?: string;
  adjust?: string;
  sop?: string;
}

export interface BrewExtractionRationale {
  ratio: string;
  temperature: string;
  time: string;
  grind: string;
  pour: string;
  iceSplit?: string;
  beanPrecision: {
    summary: string;
    signals: string[];
  };
  warnings: string[];
}

export interface BrewPlan {
  id: string;
  fingerprint: string;
  createdAt: number;
  catalogVersion: string;
  formState: AiBrewFormState;
  brewMode: AiBrewMode;
  methodFamily: AiBrewMethodFamily;
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
  methodId: BrewMethodId;
  ratioToolMethodId: BrewMethodId;
  coffeeName: string;
  process: string;
  variety: string;
  roastLevel: RoastLevel;
  beanProfile: BeanProfileState;
  beanCoverage?: BeanCoverageState;
  beanTaxonomy?: BeanTaxonomySignal;
  targetProfileId: string;
  targetProfileLabel: string;
  targetProfileAutoSuggested?: boolean;
  targetProfileSuggestionReason?: string;
  dripper: EquipmentCatalogEntry;
  grinder: EquipmentCatalogEntry;
  processEntry?: ProcessCatalogEntry;
  varietyEntry?: VarietyCatalogEntry;
  waterMode: WaterMode;
  waterRegion: WaterMarket;
  waterBrandId: string;
  waterBrandLabel?: string;
  waterPresetStatus?: WaterPresetStatus;
  waterPublishState?: WaterPublishState;
  waterIsBrewReady: boolean;
  waterClassification?: WaterClassification;
  waterBrewBlockReason: string[];
  waterBrandMarkets: WaterMarket[];
  waterBrandVerification?: VerificationLevel;
  waterBrandSourceUrls: string[];
  waterMineralDerivation?: 'direct' | 'derived_from_ions' | 'estimated_from_community_profile' | 'estimated_from_classification' | 'manual';
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
  extractionEndSeconds?: number;
  guideEndSeconds?: number;
  serveStartSeconds?: number;
  postExtractionSeconds?: number;
  tasteTimeRangeSeconds?: [number, number];
  timeDisplayMode?: BrewPlanTimeDisplayMode;
  estimatedCupOutputMl: number;
  estimatedBrewOutputMl: number;
  estimatedBeverageOutputMl: number;
  grindBias: GrindBias;
  grindRecommendation: string;
  grindBandLabel: string;
  summary: string;
  steps: BrewPlanStep[];
  workflowGuideSteps?: WorkflowGuideStep[];
  workflowValidation?: MethodWorkflowValidationResult;
  devicePhysicalConstraints?: DevicePhysicalConstraints;
  methodProgramme?: SwitchBrewProgramme | string;
  switchPresetId?: SwitchPublicPresetId;
  switchPresetLabel?: string;
  manualPresetId?: string;
  manualPresetLabel?: string;
  manualPresetCategory?: ManualBrewPresetCategory;
  manualPresetTechniquePattern?: ManualBrewTechniquePattern;
  manualPresetSummary?: string;
  manualPresetSourceUrls?: string[];
  manualPresetGuidance?: string[];
  manualPresetGuardrails?: string[];
  switchTeachingMode?: SwitchTeachingMode;
  switchDoseMatrixRowId?: string;
  switchCompatibility?: SwitchCompatibilityState;
  switchTasteProgramme?: SwitchTasteProgrammePlan;
  switchStepValidation?: SwitchStepValidation;
  switchProvenance?: SwitchProgrammeProvenance;
  switchExpectedCupShift?: SwitchExpectedCupShift;
  switchWhy?: string;
  switchWatch?: string;
  kalitaWaveStyle?: KalitaWaveRecipeStyle;
  cleverDripperStyle?: CleverDripperRecipeStyle;
  chemexStyle?: ChemexRecipeStyle;
  mokaPotStyle?: MokaPotRecipeStyle;
  coldBrewStyle?: ColdBrewRecipeStyle;
  batchBrewStyle?: BatchBrewRecipeStyle;
  siphonStyle?: SiphonRecipeStyle;
  origamiStyle?: OrigamiRecipeStyle;
  origamiFilterStyle?: OrigamiFilterStyle;
  aprilStyle?: AprilRecipeStyle;
  melittaStyle?: MelittaRecipeStyle;
  konoStyle?: KonoRecipeStyle;
  expectedCupProfile?: ExpectedCupProfile;
  readinessScores?: AiBrewReadinessScores;
  notes: string[];
  warnings: string[];
  extractionRationale: BrewExtractionRationale;
  guardrails: BrewGuardrailState;
  conformance: {
    warnings: string[];
    standardsHits: string[];
    standardsMisses: string[];
  };
  deviceProfileId: string;
  deviceProfileLabel: string;
  deviceProfileMode: DeviceProfileMode;
  processRisk?: ProcessRiskModel;
  processReviewStatus?: CatalogReviewStatus;
  varietyReviewStatus?: CatalogReviewStatus;
  grindSettingReference: string;
  grindSettingMode: GrindSettingMode;
  grindSettingVerification: VerificationLevel;
  grindCalibrationRequired?: boolean;
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
  feedback?: BrewTasteFeedback;
}

export type BrewTasteFeedbackRating =
  | 'great'
  | 'sour'
  | 'bitter'
  | 'thin'
  | 'flat'
  | 'muddy'
  | 'astringent';

export interface BrewTasteFeedbackCorrection {
  rating: BrewTasteFeedbackRating;
  primaryCorrection: string;
  backupCorrection: string;
  guardrail: string;
  methodFamily: AiBrewMethodFamily;
  protectedNumbersLocked: true;
}

export interface BrewTasteFeedback {
  rating: BrewTasteFeedbackRating;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RealBrewSensoryScore {
  acidity: number;
  sweetness: number;
  body: number;
  clarity: number;
  bitterness: number;
  astringency: number;
  balance: number;
  notes?: string;
}

export interface RealBrewMeasurement {
  label?: string;
  tdsPpm?: number;
  ghPpmAsCaCO3?: number;
  khPpmAsCaCO3?: number;
  sourceBacked: boolean;
  measured: boolean;
  verifiedAt?: number;
}

export interface GrinderCalibrationProfile {
  grinderId?: string;
  grinderLabel: string;
  zeroPointClicks?: number;
  burrTouchOffsetClicks?: number;
  lastDrawdownSeconds?: number;
  lastTasteCorrection?: string;
  completedAt?: number;
  confidence: AiBrewScoreConfidence;
}

export interface RealBrewLogEntry {
  id: string;
  planId?: string;
  fingerprint?: string;
  createdAt: number;
  updatedAt: number;
  brewDate: string;
  beanName: string;
  methodFamily: AiBrewMethodFamily;
  brewerLabel: string;
  grinderLabel: string;
  grinderSetting?: string;
  doseG: number;
  brewWaterMl: number;
  beverageOutputG?: number;
  tdsPercent?: number;
  extractionYieldPercent?: number;
  drawdownSeconds?: number;
  sensory?: RealBrewSensoryScore;
  water?: RealBrewMeasurement;
  calibration?: GrinderCalibrationProfile;
  notes?: string;
  validation: {
    status: 'validated' | 'needs_review' | 'blocked';
    warnings: string[];
  };
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
