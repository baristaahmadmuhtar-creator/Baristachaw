import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyAiBrewOptimizationPatch,
  buildAiBrewPlan,
  buildAiBrewPlanProgressively,
  buildBrewPlanRecipeSignature,
  buildWorkflowAwareGuideSteps,
  buildPlanMethodBrief,
  buildLocalizedPlanRecipeSteps,
  createDefaultAiBrewFormState,
  createQuickAiBrewFormState,
  detectCustomProcess,
  resolveDefaultTargetProfileIdForBean,
  resolveDeviceProfileSelection,
  resolveGrinderSettingReference,
  sanitizeAiBrewFormState,
  supportsAiBrewIcedMode,
  validateMethodWorkflowGuide,
  type AiBrewGenerationProgress,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import {
  resolveProcessModifierCoverage,
  resolveVarietyModifierCoverage,
} from '../../apps/web/src/features/ai-brew/beanPlanner.ts';
import { buildExtractionFinisher } from '../../apps/web/src/features/ai-brew/extractionFinisher.ts';
import { buildDeterministicAiCoachMarkdown } from '../../apps/web/src/features/ai-brew/coachNotes.ts';
import { parseAiBrewOptimizationPatch } from '../../apps/web/src/features/ai-brew/aiOptimizer.ts';
import {
  deriveAlkalinityFromBicarbonate,
  deriveHardnessFromCalciumMagnesium,
  inferDripperMethodFamily,
  parseNumericRange,
  validateWaterChemistryConsistency,
} from '../../apps/web/src/features/ai-brew/catalog.ts';
import {
  loadAiBrewFormDraft,
  loadCachedAiBrewCatalogSnapshot,
  loadLastGeneratedBrewPlan,
  saveAiBrewFormDraft,
  saveCachedAiBrewCatalogSnapshot,
  saveLastGeneratedBrewPlan,
} from '../../apps/web/src/features/ai-brew/storage.ts';
import {
  buildAiAssistPrompt,
  buildExplainPrompt,
  buildGenerateBriefPrompt,
  buildOptimizationPrompt,
  buildTroubleshootPrompt,
  estimatePromptSize,
} from '../../apps/web/src/features/ai-brew/prompts.ts';
import { resolveBrewerProfileTrustStatus } from '../../apps/web/src/features/ai-brew/catalogTrust.ts';
import { sanitizeBrewNarrative, validateBrewPlanOutput } from '../../apps/web/src/features/ai-brew/antiHallucination.ts';
import { sanitizeAiCoachMarkdown } from '../../apps/web/src/features/ai-brew/coachGuard.ts';
import { localizeAiBrewDynamicText } from '../../apps/web/src/features/ai-brew/localization.ts';
import {
  buildAiBrewTasteLoopMarkdown,
  buildTasteFeedbackCorrection,
  resolveAiBrewActionPriorities,
  resolveAiBrewBeanCharacterInsights,
  resolveAiBrewConfidenceBadges,
} from '../../apps/web/src/features/ai-brew/experience.ts';
import { resolveWaterMineralCompletion } from '../../apps/web/src/features/ai-brew/waterMineralCompletion.ts';
import type {
  AiBrewCatalog,
  AiBrewFormState,
  AiBrewMethodFamily,
  CatalogConfidence,
  CatalogMarketSegment,
  CatalogPopularityTier,
  CatalogReleaseStatus,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderSettingReference,
  ProcessCatalogEntry,
  RawDripperCatalogEntry,
  RawGrinderCatalogEntry,
  TargetProfile,
  VarietyCatalogEntry,
  VerificationLevel,
  WaterGuidance,
} from '../../apps/web/src/features/ai-brew/types.ts';
import type { BrewMethodId } from '../../apps/web/src/features/barista-tools/types.ts';

const catalog: AiBrewCatalog = {
  catalogVersion: 'test-v2',
  drippers: [
    {
      id: 'hario-v60',
      kind: 'dripper',
      name: 'Hario V60',
      brand: 'Hario',
      typeLabel: 'Cone Dripper',
      description: 'Cone baseline.',
      searchText: 'hario v60 cone dripper',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/v60'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      methodFamily: 'v60',
      defaultProfileId: 'profile_hario_v60_hot',
    },
    {
      id: 'latina-cono',
      kind: 'dripper',
      name: 'Latina Cono',
      brand: 'Latina',
      typeLabel: 'Cone Dripper',
      description: 'Niche cone dripper.',
      searchText: 'latina cono cone dripper',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/latina-cono'],
      verificationLevel: 'dataset_unverified',
      verifiedAt: '2026-03-09',
      popularityTier: 'niche',
      marketSegment: 'small_market',
      releaseStatus: 'established',
      confidence: 'low',
      methodFamily: 'v60',
    },
    {
      id: 'hario-switch',
      kind: 'dripper',
      name: 'Hario Switch',
      brand: 'Hario',
      typeLabel: 'Immersion Switch',
      description: 'Hybrid V60-style immersion release dripper.',
      searchText: 'hario switch immersion hybrid v60 release',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      methodFamily: 'hario_switch',
      defaultProfileId: 'profile_hario_switch_hot',
      hidden: true,
      deprecated: true,
      migrationTargetIds: ['hario-switch-02', 'hario-switch-03', 'mugen-x-switch'],
    },
    {
      id: 'hario-switch-02',
      kind: 'dripper',
      name: 'Hario Switch 02',
      brand: 'Hario',
      typeLabel: 'Immersion Switch 02',
      description: 'Exact 200 ml Switch.',
      searchText: 'hario switch 02 immersion hybrid valve',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch-02'],
      verificationLevel: 'official',
      verifiedAt: '2026-05-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      methodFamily: 'hario_switch',
      defaultProfileId: 'profile_hario_switch_02_hot',
      physicalConstraints: {
        finishedCapacityMl: 200,
        recommendedClosedPhaseMaxMl: 180,
        workingHeadspaceMl: 20,
        filterSize: 'V60 02',
        coneType: 'v60',
      },
      methodProgramme: 'immersion_then_percolation',
    },
    {
      id: 'hario-switch-03',
      kind: 'dripper',
      name: 'Hario Switch 03',
      brand: 'Hario',
      typeLabel: 'Immersion Switch 03',
      description: 'Exact 360 ml Switch.',
      searchText: 'hario switch 03 immersion hybrid valve',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch-03'],
      verificationLevel: 'official',
      verifiedAt: '2026-05-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      methodFamily: 'hario_switch',
      defaultProfileId: 'profile_hario_switch_03_hot',
      physicalConstraints: {
        finishedCapacityMl: 360,
        recommendedClosedPhaseMaxMl: 320,
        workingHeadspaceMl: 40,
        filterSize: 'V60 03',
        coneType: 'v60',
      },
      methodProgramme: 'bloom_then_immersion',
    },
    {
      id: 'mugen-x-switch',
      kind: 'dripper',
      name: 'MUGEN x SWITCH',
      brand: 'Hario',
      typeLabel: 'MUGEN x SWITCH 02',
      description: 'Exact MUGEN x SWITCH 02.',
      searchText: 'mugen switch hario immersion hybrid valve',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/mugen-x-switch'],
      verificationLevel: 'official',
      verifiedAt: '2026-05-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      methodFamily: 'hario_switch',
      defaultProfileId: 'profile_mugen_x_switch_hot',
      physicalConstraints: {
        finishedCapacityMl: 200,
        recommendedClosedPhaseMaxMl: 180,
        workingHeadspaceMl: 20,
        filterSize: 'V60 02',
        coneType: 'mugen',
      },
      methodProgramme: 'competition_hybrid',
    },
  ],
  grinders: [
    {
      id: '1zpresso-k-ultra',
      kind: 'grinder',
      name: '1Zpresso K-Ultra',
      brand: '1Zpresso',
      typeLabel: 'Hand Grinder',
      description: 'Official filter reference available.',
      searchText: '1zpresso k-ultra hand grinder',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/k-ultra'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      grindBands: {
        coarse: '9.5 - 10.5 numbers',
        medium: '8.0 - 9.0 numbers',
        fine: '7.0 - 8.0 numbers',
        parsedMedium: parseNumericRange('8.0 - 9.0 numbers'),
      },
    },
    {
      id: 'hario-mini-slim',
      kind: 'grinder',
      name: 'Hario Mini Slim+',
      brand: 'Hario',
      typeLabel: 'Hand Grinder',
      description: 'No verified filter reference.',
      searchText: 'hario mini slim hand grinder',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/hario-mini'],
      verificationLevel: 'dataset_unverified',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'low',
      grindBands: {
        coarse: '11 - 14 clicks',
        medium: '8 - 10 clicks',
        fine: '5 - 7 clicks',
        parsedMedium: parseNumericRange('8 - 10 clicks'),
      },
    },
    {
      id: 'feima-600n',
      kind: 'grinder',
      name: 'Feima 600N',
      brand: 'Feima',
      typeLabel: 'Electric flat burr',
      description: '600N platform baseline.',
      searchText: 'feima 600n latina flying eagle',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/600n'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      grindBands: {
        coarse: 'setting 5-0',
        medium: 'setting 4-5',
        fine: 'setting 4-4',
        parsedMedium: parseNumericRange('4 - 5 setting'),
      },
    },
  ],
  processes: [
    {
      id: 'washed',
      label: 'Washed',
      group: 'classic',
      aliases: ['wet process'],
      searchText: 'washed wet process',
      source: 'test',
      sourceUrls: ['https://example.com/washed'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Classic washed baseline.'],
    },
    {
      id: 'natural',
      label: 'Natural',
      group: 'classic',
      aliases: ['dry process'],
      searchText: 'natural dry process',
      source: 'test',
      sourceUrls: ['https://example.com/natural'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Natural process reference.'],
    },
    {
      id: 'wet_hulled',
      label: 'Wet Hulled',
      group: 'regional',
      aliases: ['giling basah'],
      searchText: 'wet hulled giling basah',
      source: 'test',
      sourceUrls: ['https://example.com/wet-hulled'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Wet hulled reference.'],
    },
  ],
  varieties: [
    {
      id: 'bourbon',
      label: 'Bourbon',
      group: 'classic-arabica',
      aliases: [],
      searchText: 'bourbon',
      originNotes: 'Classic lineage.',
      source: 'test',
      sourceUrls: ['https://example.com/bourbon'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Bourbon lineage.'],
    },
    {
      id: 'geisha',
      label: 'Geisha / Gesha',
      group: 'specialty-reference',
      aliases: ['gesha'],
      searchText: 'geisha gesha',
      originNotes: 'Specialty reference.',
      source: 'test',
      sourceUrls: ['https://example.com/geisha'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Geisha lineage.'],
    },
    {
      id: 'pacamara',
      label: 'Pacamara',
      group: 'specialty-reference',
      aliases: [],
      searchText: 'pacamara',
      originNotes: 'Large-seed structured profile.',
      source: 'test',
      sourceUrls: ['https://example.com/pacamara'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Pacamara structure reference.'],
    },
    {
      id: 'ombligon',
      label: 'Ombligon',
      group: 'specialty-reference',
      aliases: ['colombia ombligon'],
      searchText: 'ombligon colombia huila natural',
      originNotes: 'Colombian specialty selection used as a high-aroma natural baseline.',
      origins: ['Colombia'],
      source: 'test',
      sourceUrls: ['https://example.com/ombligon'],
      verificationLevel: 'curated',
      verifiedAt: '2026-05-05',
      popularityTier: 'specialty_niche',
      marketSegment: 'competition_specialty',
      releaseStatus: 'established',
      confidence: 'medium',
      notes: ['Curated high-aroma natural test fixture; no official numeric recipe assumption.'],
    },
  ],
  waterBrands: [
    {
      id: 'evian-sg',
      brandGroupId: 'evian',
      marketCode: 'sg',
      skuLabel: 'Evian Singapore',
      label: 'Evian Singapore',
      shortLabel: 'Evian',
      subtitle: 'Singapore - still mineral water',
      country: 'France',
      markets: ['sg'],
      searchText: 'evian singapore france mineral water',
      description: 'Label-backed mineral profile.',
      notes: ['Official mineral profile for brew autofill tests.'],
      presetStatus: 'autofill',
      publishState: 'published',
      isBrewReady: true,
      brewBlockReason: [],
      still: true,
      recommendedForFilter: true,
      classification: 'high_buffer',
      classificationLabel: 'High buffer',
      classificationNote: 'Buffer-heavy water that can mute acidity.',
      classificationCaution: 'Watch delicate coffees carefully.',
      chemistry: {
        tdsPpm: 345,
        calciumMgL: 80,
        magnesiumMgL: 26,
        bicarbonateMgL: 360,
      },
      resolvedMinerals: {
        tdsPpm: 345,
        hardnessPpm: deriveHardnessFromCalciumMagnesium(80, 26),
        alkalinityPpm: deriveAlkalinityFromBicarbonate(360),
        derivation: 'derived_from_ions',
      },
      source: 'test',
      sourceUrls: ['https://example.com/evian'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'aqua-id',
      brandGroupId: 'aqua',
      marketCode: 'id',
      skuLabel: 'Aqua Indonesia',
      label: 'Aqua Indonesia',
      shortLabel: 'Aqua',
      subtitle: 'Indonesia - provenance only',
      country: 'Indonesia',
      markets: ['id'],
      searchText: 'aqua indonesia mineral water',
      description: 'Tracked in catalog, but minerals require manual input.',
      notes: ['Public mineral panel is incomplete for brew autofill.'],
      presetStatus: 'manual_required',
      publishState: 'review_only',
      isBrewReady: false,
      brewBlockReason: ['Water minerals are incomplete in this test catalog.'],
      still: true,
      recommendedForFilter: true,
      classification: 'body_builder',
      classificationLabel: 'Body builder',
      classificationNote: 'Known as a broader body-first water in Indonesian brewing.',
      chemistry: {},
      resolvedMinerals: null,
      source: 'test',
      sourceUrls: ['https://example.com/aqua'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
    {
      id: 'amidis-id',
      brandGroupId: 'amidis',
      marketCode: 'id',
      skuLabel: 'Amidis Indonesia',
      label: 'Amidis Indonesia',
      shortLabel: 'Amidis',
      subtitle: 'Indonesia - low-mineral water',
      country: 'Indonesia',
      markets: ['id'],
      searchText: 'amidis indonesia ro low mineral water',
      description: 'Low-mineral water must be remineralized before brewing.',
      notes: ['Water is too low-mineral for ready-brew use; add minerals manually.'],
      presetStatus: 'manual_required',
      publishState: 'review_only',
      isBrewReady: false,
      brewBlockReason: ['Water is too low-mineral for ready-brew use; add minerals manually.'],
      still: true,
      recommendedForFilter: false,
      classification: 'zero_mineral_ro',
      classificationLabel: 'Zero mineral / RO',
      classificationNote: 'Use as a remineralization base.',
      classificationCaution: 'Add minerals manually before generating a plan.',
      chemistry: {
        tdsPpm: 2,
        hardnessPpm: 1.4,
        alkalinityPpm: 1.2,
      },
      resolvedMinerals: {
        tdsPpm: 2,
        hardnessPpm: 1.4,
        alkalinityPpm: 1.2,
        derivation: 'direct',
      },
      source: 'test',
      sourceUrls: ['local:/data/catalog/raw-evidence/phase1/water-curated-dataset-snapshot.json#amidis-id'],
      verificationLevel: 'dataset_unverified',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'low',
      catalogVersion: 'test-v2',
    },
    {
      id: 'estimated-water',
      brandGroupId: 'estimated-water',
      marketCode: 'global',
      skuLabel: 'Estimated Water',
      label: 'Estimated Water',
      shortLabel: 'Estimated Water',
      subtitle: 'Global - estimated baseline',
      country: 'Unknown',
      markets: ['global'],
      searchText: 'estimated water baseline',
      description: 'Estimated data must be verified manually.',
      notes: ['Estimated water values must be verified manually before ready-brew use.'],
      presetStatus: 'manual_required',
      publishState: 'review_only',
      isBrewReady: false,
      brewBlockReason: ['Estimated water values must be verified manually before ready-brew use.'],
      still: true,
      recommendedForFilter: false,
      classification: 'balanced',
      classificationLabel: 'Estimated baseline',
      classificationNote: 'Estimated values are only a placeholder.',
      classificationCaution: 'Verify manually before brewing.',
      chemistry: {},
      resolvedMinerals: {
        tdsPpm: 100,
        hardnessPpm: 55,
        alkalinityPpm: 40,
        derivation: 'estimated_from_classification',
      },
      source: 'test',
      sourceUrls: ['local:/data/catalog/raw-evidence/phase1/water-curated-dataset-snapshot.json#estimated-water'],
      verificationLevel: 'dataset_unverified',
      verifiedAt: '2026-03-09',
      popularityTier: 'niche',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'low',
      catalogVersion: 'test-v2',
    },
  ],
  waterGuidance: {
    id: 'manual-water',
    label: 'Manual Water',
    description: 'Manual mineral input only.',
    recommended: {
      tdsPpm: [60, 140],
      hardnessPpm: [40, 80],
      alkalinityPpm: [30, 60],
    },
    caution: {
      tooSoft: 'Too soft.',
      tooHard: 'Too hard.',
      tooLowAlkalinity: 'Too low alkalinity.',
      tooHighAlkalinity: 'Too high alkalinity.',
    },
    notes: ['No bottled water presets are used.'],
    source: 'test',
    sourceUrls: ['https://example.com/water'],
    verificationLevel: 'official',
    verifiedAt: '2026-03-09',
    popularityTier: 'widely_used',
    marketSegment: 'mass_market',
    releaseStatus: 'established',
    confidence: 'high',
    catalogVersion: 'test-v2',
  },
  targetProfiles: [
    {
      id: 'balance_clean',
      label: 'Balance & Clean',
      description: 'Clean, repeatable baseline.',
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'more_sweetness',
      label: 'More Sweetness',
      description: 'Deeper sweetness push.',
      ratioDelta: -0.2,
      tempDeltaC: 0.6,
      brewTimeDeltaSec: 10,
      grindBias: 'finer',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'more_acidity',
      label: 'More Acidity',
      description: 'Brighter acidity push.',
      ratioDelta: 0.25,
      tempDeltaC: -0.5,
      brewTimeDeltaSec: -10,
      grindBias: 'coarser',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'more_body',
      label: 'More Body',
      description: 'Denser body push.',
      ratioDelta: -0.35,
      tempDeltaC: 0.3,
      brewTimeDeltaSec: 12,
      grindBias: 'finer',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'floral_transparent',
      label: 'Floral & Transparent',
      description: 'Floral clarity profile.',
      ratioDelta: 0.18,
      tempDeltaC: -0.3,
      brewTimeDeltaSec: -6,
      grindBias: 'coarser',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'fruit_forward',
      label: 'Fruit-Forward',
      description: 'Fruit-forward conservative profile.',
      ratioDelta: 0.12,
      tempDeltaC: -0.35,
      brewTimeDeltaSec: -5,
      grindBias: 'coarser',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'soft_round',
      label: 'Soft & Round',
      description: 'Soft rounded profile.',
      ratioDelta: -0.08,
      tempDeltaC: 0.1,
      brewTimeDeltaSec: 4,
      grindBias: 'same',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'dense_comforting',
      label: 'Dense & Comforting',
      description: 'Dense body-forward profile.',
      ratioDelta: -0.18,
      tempDeltaC: -0.1,
      brewTimeDeltaSec: 8,
      grindBias: 'finer',
      notes: [],
      catalogVersion: 'test-v2',
    },
  ],
  deviceProfiles: [
    {
      id: 'profile_hario_v60_hot',
      label: 'Hario V60 Hot',
      brewMode: 'hot',
      dripperIds: ['hario-v60'],
      methodFamily: 'v60',
      brewMethodId: 'v60',
      exactMatch: true,
      filterStyle: 'cone',
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same',
      note: 'Exact V60 baseline.',
      steps: [
        { id: 'bloom', label: 'Bloom', share: 0.2, startSeconds: 0, note: 'Saturate evenly.' },
        { id: 'main', label: 'Main Pour', share: 0.4, startSeconds: 35, note: 'Build the slurry.' },
        { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 95, note: 'Finish clean.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/v60-profile'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_family_v60_hot',
      label: 'Cone Family Hot',
      brewMode: 'hot',
      dripperIds: [],
      methodFamily: 'v60',
      brewMethodId: 'v60',
      exactMatch: false,
      filterStyle: 'cone',
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same',
      note: 'Fallback cone baseline.',
      steps: [
        { id: 'bloom', label: 'Bloom', share: 0.2, startSeconds: 0, note: 'Saturate evenly.' },
        { id: 'main', label: 'Main Pour', share: 0.4, startSeconds: 35, note: 'Build the slurry.' },
        { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 95, note: 'Finish clean.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/family-v60'],
      verificationLevel: 'fallback',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_hario_v60_iced',
      label: 'Hario V60 Japanese Iced',
      brewMode: 'iced',
      dripperIds: ['hario-v60'],
      methodFamily: 'v60',
      brewMethodId: 'v60_japanese_iced',
      exactMatch: true,
      filterStyle: 'cone',
      ratioDelta: -0.25,
      tempDeltaC: 0.5,
      brewTimeDeltaSec: -10,
      grindBias: 'finer',
      note: 'Exact Hario V60 Japanese iced baseline.',
      steps: [
        { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Wet all grounds.' },
        { id: 'build_1', label: 'Center Pour', share: 0.28, startSeconds: 35, note: 'Keep center-focused.' },
        { id: 'build_2', label: 'Second Pulse', share: 0.24, startSeconds: 70, note: 'Keep slurry modest.' },
        { id: 'finish', label: 'Final Pour', share: 0.24, startSeconds: 105, note: 'Finish to hot-water target, then serve after drawdown.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/hario-v60-japanese-iced'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_family_v60_iced',
      label: 'Cone Family Iced',
      brewMode: 'iced',
      dripperIds: [],
      methodFamily: 'v60',
      brewMethodId: 'v60',
      exactMatch: false,
      filterStyle: 'cone',
      ratioDelta: -0.25,
      tempDeltaC: 0.5,
      brewTimeDeltaSec: -10,
      grindBias: 'finer',
      note: 'Fallback iced cone baseline.',
      steps: [
        { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Wet all grounds.' },
        { id: 'build_1', label: 'Center Pour', share: 0.28, startSeconds: 35, note: 'Keep center-focused.' },
        { id: 'build_2', label: 'Second Pulse', share: 0.24, startSeconds: 70, note: 'Keep slurry modest.' },
        { id: 'finish', label: 'Final Pour', share: 0.24, startSeconds: 105, note: 'Finish to hot-water target, then serve after drawdown.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/family-v60-iced'],
      verificationLevel: 'fallback',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_hario_switch_hot',
      label: 'Hario Switch Hot',
      brewMode: 'hot',
      dripperIds: ['hario-switch'],
      methodFamily: 'hario_switch',
      brewMethodId: 'clever_dripper',
      exactMatch: true,
      filterStyle: 'immersion',
      ratioDelta: 0.45,
      tempDeltaC: -2.2,
      brewTimeDeltaSec: 10,
      grindBias: 'coarser',
      note: 'Hybrid closed-valve immersion release baseline.',
      steps: [
        { id: 'closed_bloom', label: 'Closed Bloom', kind: 'pour', share: 0.35, startSeconds: 0, note: 'Switch closed. Rinse/preheat first, then wet all grounds evenly.' },
        { id: 'closed_fill', label: 'Closed Fill', kind: 'pour', share: 0.65, startSeconds: 35, note: 'Still closed. Fill calmly to target water and avoid heavy agitation.' },
        { id: 'steep', label: 'Steep Closed', kind: 'wait', share: 0, startSeconds: 110, note: 'Hold immersion contact quietly before opening.' },
        { id: 'release', label: 'Open Valve', kind: 'release', share: 0, startSeconds: 165, note: 'Open the switch cleanly and let the bed drain without stirring.' },
        { id: 'finish', label: 'Serve', kind: 'serve', share: 0, startSeconds: 225, note: 'Serve after drawdown.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch-profile'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_hario_switch_02_hot',
      label: 'Hario Switch 02 Hot Hybrid',
      brewMode: 'hot',
      dripperIds: ['hario-switch-02'],
      methodFamily: 'hario_switch',
      brewMethodId: 'clever_dripper',
      exactMatch: true,
      filterStyle: 'immersion',
      methodWorkflow: 'immersion',
      methodProgramme: 'immersion_then_percolation',
      physicalConstraints: { finishedCapacityMl: 200, recommendedClosedPhaseMaxMl: 180, workingHeadspaceMl: 20, filterSize: 'V60 02', coneType: 'v60' },
      ratioDelta: 0.25,
      tempDeltaC: -2.2,
      brewTimeDeltaSec: 6,
      grindBias: 'coarser',
      note: 'Safe Switch 02 hybrid baseline.',
      steps: [
        { id: 'closed_bloom', label: 'Closed Bloom', kind: 'pour', share: 0.35, startSeconds: 0, note: 'Valve closed. Wet the bed evenly.', valveState: 'closed', chamberState: 'bloom' },
        { id: 'release_bloom', label: 'Open Switch', kind: 'release', share: 0, startSeconds: 40, note: 'Open before larger fill.', valveState: 'open', chamberState: 'releasing' },
        { id: 'open_fill', label: 'Open Fill', kind: 'pour', share: 0.65, startSeconds: 55, note: 'Valve open. Fill to target.', valveState: 'open', chamberState: 'percolation' },
        { id: 'drawdown', label: 'Drawdown', kind: 'drawdown', share: 0, startSeconds: 155, note: 'Let drawdown finish.', valveState: 'open', chamberState: 'drawdown' },
        { id: 'serve', label: 'Serve', kind: 'serve', share: 0, startSeconds: 215, note: 'Serve after drawdown.', valveState: 'open', chamberState: 'served' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch-02-profile'],
      verificationLevel: 'official',
      verifiedAt: '2026-05-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_hario_switch_03_hot',
      label: 'Hario Switch 03 Hot Hybrid',
      brewMode: 'hot',
      dripperIds: ['hario-switch-03'],
      methodFamily: 'hario_switch',
      brewMethodId: 'clever_dripper',
      exactMatch: true,
      filterStyle: 'immersion',
      methodWorkflow: 'immersion',
      methodProgramme: 'bloom_then_immersion',
      physicalConstraints: { finishedCapacityMl: 360, recommendedClosedPhaseMaxMl: 320, workingHeadspaceMl: 40, filterSize: 'V60 03', coneType: 'v60' },
      ratioDelta: 0.45,
      tempDeltaC: -2.2,
      brewTimeDeltaSec: 10,
      grindBias: 'coarser',
      note: 'Switch 03 closed fill baseline.',
      steps: [
        { id: 'closed_bloom', label: 'Closed Bloom', kind: 'pour', share: 0.35, startSeconds: 0, note: 'Valve closed. Wet all grounds evenly.', valveState: 'closed', chamberState: 'bloom' },
        { id: 'closed_fill', label: 'Closed Fill', kind: 'pour', share: 0.65, startSeconds: 35, note: 'Still closed. Fill calmly to target water.', valveState: 'closed', chamberState: 'filling' },
        { id: 'steep', label: 'Steep Closed', kind: 'wait', share: 0, startSeconds: 110, note: 'Hold immersion contact quietly.', valveState: 'closed', chamberState: 'immersion' },
        { id: 'release', label: 'Open Switch', kind: 'release', share: 0, startSeconds: 165, note: 'Open the switch cleanly.', valveState: 'open', chamberState: 'releasing' },
        { id: 'serve', label: 'Serve', kind: 'serve', share: 0, startSeconds: 225, note: 'Serve after drawdown.', valveState: 'open', chamberState: 'served' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch-03-profile'],
      verificationLevel: 'official',
      verifiedAt: '2026-05-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_hario_switch_iced',
      label: 'Hario Switch Japanese Iced',
      brewMode: 'iced',
      dripperIds: ['hario-switch'],
      methodFamily: 'hario_switch',
      brewMethodId: 'clever_dripper_iced',
      exactMatch: true,
      filterStyle: 'immersion',
      ratioDelta: -0.22,
      tempDeltaC: 0.2,
      brewTimeDeltaSec: 12,
      grindBias: 'same',
      note: 'Hybrid immersion iced baseline.',
      steps: [
        { id: 'charge', label: 'Charge Closed', kind: 'pour', share: 1, startSeconds: 0, note: 'Valve closed. Add hot water target and steep briefly.' },
        { id: 'release', label: 'Release Over Ice', kind: 'release', share: 0, startSeconds: 120, note: 'Open the switch over measured ice.' },
        { id: 'finish', label: 'Stir Server', kind: 'serve', share: 0, startSeconds: 165, note: 'Stir server before serving.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch-iced-profile'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_hario_switch_03_iced',
      label: 'Hario Switch 03 Japanese Iced',
      brewMode: 'iced',
      dripperIds: ['hario-switch-03'],
      methodFamily: 'hario_switch',
      brewMethodId: 'clever_dripper_iced',
      exactMatch: true,
      filterStyle: 'immersion',
      methodWorkflow: 'immersion',
      methodProgramme: 'full_immersion',
      physicalConstraints: { finishedCapacityMl: 360, recommendedClosedPhaseMaxMl: 320, workingHeadspaceMl: 40, filterSize: 'V60 03', coneType: 'v60' },
      ratioDelta: -0.22,
      tempDeltaC: 0.2,
      brewTimeDeltaSec: 12,
      grindBias: 'same',
      note: 'Switch 03 iced baseline.',
      steps: [
        { id: 'charge', label: 'Charge Closed', kind: 'pour', share: 1, startSeconds: 0, note: 'Valve closed. Add hot water target and steep briefly.', valveState: 'closed', chamberState: 'immersion' },
        { id: 'steep', label: 'Steep Closed', kind: 'wait', share: 0, startSeconds: 85, note: 'Hold short immersion contact.', valveState: 'closed', chamberState: 'immersion' },
        { id: 'release', label: 'Release Over Ice', kind: 'release', share: 0, startSeconds: 120, note: 'Open the switch over measured ice.', valveState: 'open', chamberState: 'releasing' },
        { id: 'finish', label: 'Stir Server', kind: 'serve', share: 0, startSeconds: 165, note: 'Stir server before serving.', valveState: 'open', chamberState: 'served' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/hario-switch-03-iced-profile'],
      verificationLevel: 'official',
      verifiedAt: '2026-05-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
  ],
  grinderSettings: [
    {
      id: 'gs_k_ultra_cone',
      grinderId: '1zpresso-k-ultra',
      brewMode: 'both',
      profileIds: ['profile_family_v60_hot', 'profile_family_v60_iced'],
      rangeLabel: '8.0 - 9.0 numbers',
      parsedRange: parseNumericRange('8.0 - 9.0 numbers'),
      note: 'Official K-Ultra filter baseline.',
      source: 'test',
      sourceUrls: ['https://example.com/k-ultra-grind'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'gs_feima_600n_cone',
      grinderId: 'feima-600n',
      brewMode: 'both',
      profileIds: ['profile_family_v60_hot', 'profile_family_v60_iced'],
      rangeLabel: 'setting 4-5',
      parsedRange: parseNumericRange('4 - 5 setting'),
      note: 'Curated 600N platform filter baseline.',
      source: 'test',
      sourceUrls: ['https://example.com/600n-grind'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
  ],
};

function installLocalStorageMock(options?: { throwOnSetItem?: boolean }) {
  const shouldThrowOnSetItem = Boolean(options?.throwOnSetItem);
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        if (shouldThrowOnSetItem) {
          throw new Error('storage blocked');
        }
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    },
  });
}

function getBaristaVolumeIncrementMl(methodFamily: AiBrewMethodFamily) {
  if (methodFamily === 'espresso') return 1;
  if (methodFamily === 'cold_brew' || methodFamily === 'batch_brew') return 25;
  return 5;
}

function getBaristaTimeIncrementSeconds(methodFamily: AiBrewMethodFamily) {
  if (methodFamily === 'espresso') return 1;
  if (methodFamily === 'cold_brew') return 300;
  if (methodFamily === 'batch_brew') return 15;
  return 5;
}

function assertMultipleOf(value: number, increment: number, label: string) {
  const roundedQuotient = Math.round(value / increment);
  assert.ok(
    Math.abs(value - roundedQuotient * increment) < 1e-9,
    `${label} should be rounded to ${increment}, got ${value}`,
  );
}

function assertBaristaRoundedPlan(plan: ReturnType<typeof buildAiBrewPlan>) {
  const volumeIncrement = getBaristaVolumeIncrementMl(plan.methodFamily);
  const timeIncrement = getBaristaTimeIncrementSeconds(plan.methodFamily);

  assertMultipleOf(plan.totalWaterMl, volumeIncrement, 'total water');
  assertMultipleOf(plan.hotWaterMl, volumeIncrement, 'hot water');
  assertMultipleOf(plan.iceMl, volumeIncrement, 'ice');
  assertMultipleOf(plan.estimatedCupOutputMl, volumeIncrement, 'estimated cup output');
  assertMultipleOf(plan.totalTimeSeconds, timeIncrement, 'total time');

  for (const [index, step] of plan.steps.entries()) {
    assertMultipleOf(step.startSeconds, timeIncrement, `step ${index + 1} start time`);
    assertMultipleOf(step.pourVolumeMl, volumeIncrement, `step ${index + 1} pour volume`);
    assertMultipleOf(step.targetVolumeMl, volumeIncrement, `step ${index + 1} target volume`);
  }
}

function assertPlanEnvelope(plan: ReturnType<typeof buildAiBrewPlan>) {
  const totalPoured = plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
  const finalStep = plan.steps[plan.steps.length - 1];
  const extractionEndSeconds = plan.extractionEndSeconds ?? -1;
  const guideEndSeconds = plan.guideEndSeconds ?? -1;
  const postExtractionSeconds = plan.postExtractionSeconds ?? -1;
  const tasteTimeRangeSeconds = plan.tasteTimeRangeSeconds ?? [-1, -1];
  const finiteValues: Array<[string, number]> = [
    ['dose', plan.doseG],
    ['total water', plan.totalWaterMl],
    ['hot water', plan.hotWaterMl],
    ['ice', plan.iceMl],
    ['ratio', plan.recommendedRatio],
    ['hot extraction ratio', plan.hotExtractionRatio],
    ['temperature', plan.waterTempC],
    ['total time', plan.totalTimeSeconds],
    ['extraction end', extractionEndSeconds],
    ['guide end', guideEndSeconds],
    ['post extraction', postExtractionSeconds],
    ['taste time low', tasteTimeRangeSeconds[0]],
    ['taste time high', tasteTimeRangeSeconds[1]],
    ['estimated cup output', plan.estimatedCupOutputMl],
  ];

  assertBaristaRoundedPlan(plan);
  for (const [label, value] of finiteValues) {
    assert.ok(Number.isFinite(value), `${label} should be finite`);
    assert.ok(value >= 0, `${label} should not be negative`);
  }
  for (const [index, step] of plan.steps.entries()) {
    assert.ok(Number.isFinite(step.startSeconds), `step ${index + 1} start should be finite`);
    assert.ok(Number.isFinite(step.pourVolumeMl), `step ${index + 1} pour should be finite`);
    assert.ok(Number.isFinite(step.targetVolumeMl), `step ${index + 1} target should be finite`);
    assert.ok(step.startSeconds >= 0, `step ${index + 1} start should not be negative`);
    assert.ok(step.pourVolumeMl >= 0, `step ${index + 1} pour should not be negative`);
    assert.ok(step.targetVolumeMl >= 0, `step ${index + 1} target should not be negative`);
    if (index > 0) {
      assert.ok(step.startSeconds >= plan.steps[index - 1].startSeconds, `step ${index + 1} time should not go backward`);
    }
  }
  assert.equal(totalPoured, plan.hotWaterMl);
  assert.equal(finalStep?.targetVolumeMl, plan.hotWaterMl);
  assert.ok(extractionEndSeconds <= guideEndSeconds, `${plan.dripper.name} extraction time should not exceed guide time`);
  assert.equal(postExtractionSeconds, guideEndSeconds - extractionEndSeconds);
  assert.ok(tasteTimeRangeSeconds[0] <= extractionEndSeconds && tasteTimeRangeSeconds[1] >= extractionEndSeconds);
  assert.ok(plan.timeDisplayMode, `${plan.dripper.name} should expose time display mode`);
  assert.ok(plan.recommendedRatio > 0);
  assert.equal(plan.finalBeverageRatio, plan.recommendedRatio);
  assert.ok(plan.hotExtractionRatio > 0);
  assert.ok(plan.hotWaterSharePercent >= 0 && plan.hotWaterSharePercent <= 100);
  assert.ok(plan.iceSharePercent >= 0 && plan.iceSharePercent <= 100);
  const minTempC = plan.methodFamily === 'cold_brew' ? 0 : 78;
  assert.ok(plan.waterTempC >= minTempC && plan.waterTempC <= 98);
  const maxTimeSeconds = plan.methodFamily === 'cold_brew' ? 48 * 60 * 60 : plan.methodFamily === 'espresso' ? 75 : 420;
  const minTimeSeconds = plan.methodFamily === 'espresso' ? 15 : 75;
  assert.ok(plan.totalTimeSeconds >= minTimeSeconds && plan.totalTimeSeconds <= maxTimeSeconds);
}

type AiBrewPlanForTest = ReturnType<typeof buildAiBrewPlan>;

function summarizeAiBrewPlan(plan: AiBrewPlanForTest) {
  return {
    method: plan.methodFamily,
    targetProfile: plan.targetProfileId,
    doseG: plan.doseG,
    totalWaterMl: plan.totalWaterMl,
    hotWaterMl: plan.hotWaterMl,
    iceMl: plan.iceMl,
    ratio: plan.finalBeverageRatio,
    tempC: plan.waterTempC,
    grind: plan.grindRecommendation,
    timeSeconds: plan.totalTimeSeconds,
    stepCount: plan.steps.length,
    expectedCup: {
      acidity: plan.expectedCupProfile?.acidity || 0,
      sweetness: plan.expectedCupProfile?.sweetness || 0,
      body: plan.expectedCupProfile?.body || 0,
      clarity: plan.expectedCupProfile?.clarity || 0,
      bitterRisk: plan.expectedCupProfile?.bitterRisk || 0,
      confidence: plan.expectedCupProfile?.confidence || 'low',
    },
    beanCoverage: plan.beanCoverage,
    warnings: normalizeTestStrings(plan.warnings, plan.expectedCupProfile?.warnings || [], plan.beanCoverage?.warnings || []),
    provenance: {
      device: plan.deviceProfileMode,
      grinder: plan.grindSettingVerification,
      water: plan.waterBrandVerification || plan.waterMineralDerivation || 'manual',
    },
  };
}

function normalizeTestStrings(...groups: Array<Array<string | undefined>>) {
  return Array.from(new Set(groups.flat().filter((value): value is string => Boolean(value))));
}

function summarizeSwitchPlan(plan: AiBrewPlanForTest) {
  const waterSteps = plan.steps.filter((step) => step.pourVolumeMl > 0);
  const closedLoads = plan.steps
    .filter((step) => step.valveState === 'closed')
    .map((step) => step.chamberLoadMl || 0);
  return {
    dripper: plan.dripper.name,
    targetProfile: plan.targetProfileId,
    presetId: plan.switchPresetId,
    presetLabel: plan.switchPresetLabel,
    programme: plan.methodProgramme,
    doseG: plan.doseG,
    totalWaterMl: plan.totalWaterMl,
    hotWaterMl: plan.hotWaterMl,
    iceMl: plan.iceMl,
    finalRatio: plan.finalBeverageRatio,
    bloomMl: plan.switchTasteProgramme?.bloomMl || 0,
    bloomSeconds: plan.switchTasteProgramme?.bloomSeconds || 0,
    releaseSeconds: plan.switchTasteProgramme?.releaseSeconds || 0,
    valvePath: plan.switchTasteProgramme?.valvePath || [],
    closedPhaseMl: plan.switchTasteProgramme?.closedPhaseMl || 0,
    openPhaseMl: plan.switchTasteProgramme?.openPhaseMl || 0,
    closedLoadPeakMl: plan.switchStepValidation?.peakClosedLoadMl || Math.max(0, ...closedLoads),
    safeClosedMaxMl: plan.switchStepValidation?.maxClosedLoadMl || 0,
    steps: plan.steps.map((step) => ({
      id: step.id,
      startSeconds: step.startSeconds,
      pourVolumeMl: step.pourVolumeMl,
      targetVolumeMl: step.targetVolumeMl,
      valveState: step.valveState,
      chamberState: step.chamberState,
      chamberLoadMl: step.chamberLoadMl,
      flowRate: step.flowRateMlPerSec,
      pourPath: step.pourPath,
      agitation: step.agitationLevel,
    })),
    expectedCup: {
      acidity: plan.expectedCupProfile?.acidity || 0,
      sweetness: plan.expectedCupProfile?.sweetness || 0,
      body: plan.expectedCupProfile?.body || 0,
      clarity: plan.expectedCupProfile?.clarity || 0,
      bitterRisk: plan.expectedCupProfile?.bitterRisk || 0,
      aroma: plan.expectedCupProfile?.aromaIntensity || 0,
      confidence: plan.expectedCupProfile?.confidence,
    },
    warnings: [
      ...plan.warnings,
      ...(plan.workflowValidation?.warnings || []),
      ...(plan.workflowValidation?.blockingErrors || []),
      ...(plan.switchTasteProgramme?.riskWarnings || []),
    ],
    validationStatus: plan.switchStepValidation?.status,
  };
}

function assertSwitchWaterAccounting(plan: AiBrewPlanForTest) {
  assert.equal(plan.methodFamily, 'hario_switch');
  const summary = summarizeSwitchPlan(plan);
  const waterSteps = summary.steps.filter((step) => step.pourVolumeMl > 0);
  assert.ok(waterSteps.length > 0, `${summary.dripper} should have water steps`);
  assert.ok(
    Math.abs(waterSteps.reduce((sum, step) => sum + step.pourVolumeMl, 0) - summary.hotWaterMl) <= 1,
    `${summary.dripper} pour sum should equal hot water: ${JSON.stringify(summary)}`,
  );
  for (let index = 1; index < waterSteps.length; index += 1) {
    assert.ok(
      waterSteps[index].targetVolumeMl >= waterSteps[index - 1].targetVolumeMl,
      `${summary.dripper} target should be monotonic: ${JSON.stringify(summary.steps)}`,
    );
  }
  assert.equal(waterSteps.at(-1)?.targetVolumeMl, summary.hotWaterMl);
  assert.ok(waterSteps.every((step) => step.flowRate && step.pourPath && step.agitation), `${summary.dripper} missing step technique metadata`);
  assert.ok((plan.workflowGuideSteps || []).filter((step) => step.pourVolumeMl > 0).every((step) => (
    /\d+:\d{2}/.test(step.primaryText)
    && /tuang \d+ ml sampai \d+ ml/.test(step.primaryText)
    && /Katup (tutup|buka)/.test(step.primaryText)
  )), `${summary.dripper} Ringkas guide should keep time, valve, pour, and cumulative target`);
}

function assertSafeSwitchPlan(plan: AiBrewPlanForTest) {
  const summary = summarizeSwitchPlan(plan);
  assert.equal(summary.validationStatus, 'safe', `${summary.dripper} should be safe: ${JSON.stringify(summary)}`);
  assert.ok(summary.closedLoadPeakMl <= summary.safeClosedMaxMl, `${summary.dripper} peak closed load should stay safe: ${JSON.stringify(summary)}`);
}

function assertUnsafeSwitchPlan(plan: AiBrewPlanForTest) {
  const summary = summarizeSwitchPlan(plan);
  assert.ok(summary.validationStatus === 'caution' || summary.validationStatus === 'blocked', `${summary.dripper} should caution/block: ${JSON.stringify(summary)}`);
  assert.ok((plan.switchStepValidation?.unsafeStepIds.length || 0) > 0 || summary.validationStatus === 'caution');
  assert.match(plan.switchStepValidation?.message || summary.warnings.join(' '), /safe|aman|exceeds|melewati|muatan|chamber/i);
}

function getFinalWindowSeconds(plan: ReturnType<typeof buildAiBrewPlan>) {
  const finalStep = plan.steps[plan.steps.length - 1];
  return plan.totalTimeSeconds - (finalStep?.startSeconds || 0);
}

test('AI Brew time semantics separates extraction from finishing work', () => {
  const timeCatalog = buildProductionAiBrewCatalogForTests();
  const base = {
    ...createDefaultAiBrewFormState(timeCatalog),
    coffeeName: 'Time Semantics QA',
    doseG: '15',
    targetProfileId: 'balance_clean',
    process: 'washed',
    variety: 'ethiopian_heirloom',
    roastLevel: 'medium_light' as const,
    waterMode: 'manual' as const,
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '30',
  };
  const switchIced = buildAiBrewPlan({
    ...base,
    brewMode: 'iced',
    dripperId: 'hario-switch-03',
    switchPresetId: 'iced_hybrid',
  }, timeCatalog);
  assertPlanEnvelope(switchIced);
  assert.equal(switchIced.timeDisplayMode, 'extraction');
  assert.ok((switchIced.postExtractionSeconds || 0) >= 8);
  assert.ok((switchIced.extractionEndSeconds || 0) < (switchIced.guideEndSeconds || switchIced.totalTimeSeconds));
  assert.ok((switchIced.extractionEndSeconds || 0) < switchIced.totalTimeSeconds);
  assert.match((switchIced.workflowGuideSteps || []).map((step) => step.primaryText).join(' '), /aduk|sajikan/i);

  const frenchPress = buildAiBrewPlan({ ...base, dripperId: 'french-press' }, timeCatalog);
  assertPlanEnvelope(frenchPress);
  assert.equal(frenchPress.timeDisplayMode, 'long_steep');
  assert.ok((frenchPress.guideEndSeconds || 0) >= (frenchPress.extractionEndSeconds || 0));

  const aeropress = buildAiBrewPlan({ ...base, dripperId: 'aeropress' }, timeCatalog);
  assertPlanEnvelope(aeropress);
  assert.ok((aeropress.workflowGuideSteps || []).some((step) => step.actionType === 'serve'));
  assert.ok((aeropress.guideEndSeconds || 0) >= (aeropress.extractionEndSeconds || 0));

  const espresso = buildAiBrewPlan({
    ...base,
    dripperId: 'espresso-machine',
    doseG: '18',
    targetWaterMl: '40',
  }, timeCatalog);
  assertPlanEnvelope(espresso);
  assert.equal(espresso.timeDisplayMode, 'pressure');
  assert.equal(espresso.extractionEndSeconds, espresso.totalTimeSeconds);
});

function getPourShareMap(plan: ReturnType<typeof buildAiBrewPlan>) {
  return plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);
}

const ALL_METHOD_FAMILY_CASES: Array<{
  family: AiBrewMethodFamily;
  dripperId: string;
  name: string;
  brand: string;
  typeLabel: string;
  cue: RegExp;
}> = [
  {
    family: 'v60',
    dripperId: 'matrix-v60-all',
    name: 'Hario V60 Matrix All',
    brand: 'Hario',
    typeLabel: 'Cone Dripper',
    cue: /cone drain cleanly|center-to-mid/i,
  },
  {
    family: 'origami',
    dripperId: 'matrix-origami-all',
    name: 'Origami Matrix All',
    brand: 'Origami',
    typeLabel: 'Cone Dripper',
    cue: /faster cone flow|compact pulses|flow agile/i,
  },
  {
    family: 'kono',
    dripperId: 'matrix-kono-all',
    name: 'Kono Matrix All',
    brand: 'Kono',
    typeLabel: 'Cone Dripper',
    cue: /sweet core|stable contact|centered and slightly deeper/i,
  },
  {
    family: 'kalita_wave',
    dripperId: 'matrix-kalita-all',
    name: 'Kalita Wave Matrix All',
    brand: 'Kalita',
    typeLabel: 'Flat Bottom Dripper',
    cue: /flat bed|bed level|edge to edge/i,
  },
  {
    family: 'melitta',
    dripperId: 'matrix-melitta-all',
    name: 'Melitta Matrix All',
    brand: 'Melitta',
    typeLabel: 'Trapezoid Dripper',
    cue: /trapezoid bed|forgiving|level and measured/i,
  },
  {
    family: 'april',
    dripperId: 'matrix-april-all',
    name: 'April Matrix All',
    brand: 'April',
    typeLabel: 'Flat Bottom Dripper',
    cue: /low-agitation|quick, settled opening|pulse/i,
  },
  {
    family: 'chemex',
    dripperId: 'matrix-chemex-all',
    name: 'Chemex Matrix All',
    brand: 'Chemex',
    typeLabel: 'Glass Brewer',
    cue: /thick chemex paper|thick filter|filter resistance/i,
  },
  {
    family: 'clever_dripper',
    dripperId: 'matrix-clever-all',
    name: 'Clever Dripper Matrix All',
    brand: 'Clever',
    typeLabel: 'Immersion Dripper',
    cue: /open the release|open the valve|bed release|immersion/i,
  },
];

const TARGET_PROFILE_MATRIX_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'more_body',
] as const;

function resolveExpectedMethodIdForFamily(family: AiBrewMethodFamily): BrewMethodId {
  switch (family) {
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

function resolveExpectedRatioToolMethodIdForFamily(family: AiBrewMethodFamily, brewMode: 'hot' | 'iced'): BrewMethodId {
  if (brewMode === 'iced') {
    switch (family) {
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
  return resolveExpectedMethodIdForFamily(family);
}

function resolveFilterStyleForFamily(family: AiBrewMethodFamily): 'cone' | 'flat' | 'trapezoid' | 'immersion' {
  switch (family) {
    case 'kalita_wave':
    case 'april':
      return 'flat';
    case 'melitta':
      return 'trapezoid';
    case 'clever_dripper':
      return 'immersion';
    default:
      return 'cone';
  }
}

function buildProfileStepsForFamily(family: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  switch (family) {
    case 'chemex':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.25, startSeconds: 0, note: 'Wet thick filter and bed.' },
          { id: 'build', label: 'Build', share: 0.35, startSeconds: 50, note: 'Use steady stream.' },
          { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 120, note: 'Finish before filter stalls.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Wet thick filter and bed.' },
          { id: 'build', label: 'Build', share: 0.33, startSeconds: 55, note: 'Use steady stream.' },
          { id: 'finish', label: 'Finish', share: 0.43, startSeconds: 145, note: 'Finish before filter stalls.' },
        ];
    case 'kalita_wave':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Saturate the flat bed.' },
          { id: 'middle', label: 'Middle Pour', share: 0.38, startSeconds: 36, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 92, note: 'Land the final water evenly.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Saturate the flat bed.' },
          { id: 'middle', label: 'Middle Pour', share: 0.4, startSeconds: 40, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.38, startSeconds: 105, note: 'Land the final water evenly.' },
        ];
    case 'melitta':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Open the trapezoid bed evenly.' },
          { id: 'middle', label: 'Middle Pour', share: 0.36, startSeconds: 40, note: 'Keep the middle measured.' },
          { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 102, note: 'Close with a tidy level pour.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Open the trapezoid bed evenly.' },
          { id: 'middle', label: 'Middle Pour', share: 0.37, startSeconds: 42, note: 'Keep the middle measured.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 110, note: 'Close with a tidy level pour.' },
        ];
    case 'april':
      return brewMode === 'iced'
        ? [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'Short settled opening.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 35, note: 'Keep pulses organized.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 80, note: 'Finish clean and fast.' },
        ]
        : [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'Short settled opening.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Keep pulses organized.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 88, note: 'Finish clean and fast.' },
        ];
    case 'clever_dripper':
      return brewMode === 'iced'
        ? [
          { id: 'charge', label: 'Charge', share: 0.56, startSeconds: 0, note: 'Start immersion.' },
          { id: 'hold', label: 'Hold', share: 0.24, startSeconds: 55, note: 'Keep immersion calm.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ]
        : [
          { id: 'charge', label: 'Charge', share: 0.52, startSeconds: 0, note: 'Start immersion.' },
          { id: 'hold', label: 'Hold', share: 0.28, startSeconds: 50, note: 'Keep immersion calm.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 130, note: 'Release to cup.' },
        ];
    case 'origami':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Keep bloom light and even.' },
          { id: 'pulse', label: 'Pulse', share: 0.36, startSeconds: 30, note: 'Use compact pulses.' },
          { id: 'finish', label: 'Finish', share: 0.42, startSeconds: 84, note: 'Close with light finishing pour.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Keep bloom light and even.' },
          { id: 'pulse', label: 'Pulse', share: 0.35, startSeconds: 34, note: 'Use compact pulses.' },
          { id: 'finish', label: 'Finish', share: 0.43, startSeconds: 90, note: 'Close with light finishing pour.' },
        ];
    case 'kono':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.26, startSeconds: 0, note: 'Build a sweet core early.' },
          { id: 'center', label: 'Center Pour', share: 0.38, startSeconds: 34, note: 'Keep the stream tight.' },
          { id: 'finish', label: 'Finish', share: 0.36, startSeconds: 94, note: 'Finish narrow and controlled.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.25, startSeconds: 0, note: 'Build a sweet core early.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep the stream tight.' },
          { id: 'finish', label: 'Finish', share: 0.36, startSeconds: 105, note: 'Finish narrow and controlled.' },
        ];
    case 'v60':
    default:
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Open the bloom evenly.' },
          { id: 'build_1', label: 'Center Pour', share: 0.28, startSeconds: 35, note: 'Keep the cone walls quiet.' },
          { id: 'build_2', label: 'Second Pulse', share: 0.24, startSeconds: 70, note: 'Keep slurry modest.' },
          { id: 'finish', label: 'Final Pour', share: 0.24, startSeconds: 105, note: 'Finish calmly, then serve only after drawdown.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Open the bloom evenly.' },
          { id: 'center', label: 'Center Pour', share: 0.33, startSeconds: 35, note: 'Keep the cone walls quiet.' },
          { id: 'finish', label: 'Finish', share: 0.45, startSeconds: 95, note: 'Finish calmly and cleanly.' },
        ];
  }
}

function buildAllMethodFamilyCatalog(): AiBrewCatalog {
  const drippers = ALL_METHOD_FAMILY_CASES.map((entry) => ({
    id: entry.dripperId,
    kind: 'dripper' as const,
    name: entry.name,
    brand: entry.brand,
    typeLabel: entry.typeLabel,
    description: `${entry.name} test dripper.`,
    searchText: `${entry.name.toLowerCase()} ${entry.family} test dripper`,
    catalogVersion: 'test-v2',
    source: 'test',
    sourceUrls: [`https://example.com/${entry.dripperId}`],
    verificationLevel: 'official' as const,
    verifiedAt: '2026-03-09',
    popularityTier: 'widely_used' as const,
    marketSegment: 'specialty_mainstream' as const,
    releaseStatus: 'established' as const,
    confidence: 'high' as const,
    methodFamily: entry.family,
    defaultProfileId: `profile_${entry.dripperId}_hot`,
  }));

  const deviceProfiles = ALL_METHOD_FAMILY_CASES.flatMap((entry) => {
    const filterStyle = resolveFilterStyleForFamily(entry.family);
    return (['hot', 'iced'] as const).map((brewMode) => ({
      id: `profile_${entry.dripperId}_${brewMode}`,
      label: `${entry.name} ${brewMode === 'iced' ? 'Iced' : 'Hot'}`,
      brewMode,
      dripperIds: [entry.dripperId],
      methodFamily: entry.family,
      brewMethodId: resolveExpectedRatioToolMethodIdForFamily(entry.family, brewMode),
      exactMatch: true,
      filterStyle,
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same' as const,
      note: `${entry.name} ${brewMode} baseline.`,
      steps: buildProfileStepsForFamily(entry.family, brewMode),
      source: 'test',
      sourceUrls: [`https://example.com/profile-${entry.dripperId}-${brewMode}`],
      verificationLevel: 'official' as const,
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used' as const,
      marketSegment: 'specialty_mainstream' as const,
      releaseStatus: 'established' as const,
      confidence: 'high' as const,
      catalogVersion: 'test-v2',
    }));
  });

  return {
    ...catalog,
    drippers: [...catalog.drippers, ...drippers],
    deviceProfiles: [...catalog.deviceProfiles, ...deviceProfiles],
  };
}

function collectPlanNarrative(plan: ReturnType<typeof buildAiBrewPlan>) {
  return plan.steps.map((step) => `${step.note} ${step.hybridInstruction || ''}`).join(' ');
}

test('barista evaluation calibration tunes temperature and practical step details', () => {
  const fullCatalog = buildAllMethodFamilyCatalog();
  const baseInput = {
    ...createDefaultAiBrewFormState(fullCatalog),
    doseG: '15',
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const ethiopiaV60 = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Ethiopia Chelbesa Yirgacheffe Washed',
    process: 'washed',
    roastLevel: 'light',
    dripperId: 'matrix-v60-all',
    targetProfileId: 'balance_clean',
  }, fullCatalog);
  assert.ok(ethiopiaV60.waterTempC >= 94 && ethiopiaV60.waterTempC <= 96);
  assert.match(collectPlanNarrative(ethiopiaV60), /Rinse the paper filter.*Bloom with about .*x coffee weight/i);

  const geishaIced = buildAiBrewPlan({
    ...baseInput,
    brewMode: 'iced' as const,
    coffeeName: 'Panama Geisha Boquete Washed',
    process: 'washed',
    variety: 'geisha',
    roastLevel: 'light',
    dripperId: 'matrix-v60-all',
    targetProfileId: 'more_sweetness',
  }, fullCatalog);
  assert.ok(geishaIced.waterTempC >= 92 && geishaIced.waterTempC <= 93);
  assert.ok(geishaIced.notes.some((note) => /92-93C|Exact Hario V60 Japanese iced/i.test(note)));
  assert.match(collectPlanNarrative(geishaIced), /measured ice.*Bloom with about .*x coffee weight|hot-water target only/i);

  const chemexGayoIced = buildAiBrewPlan({
    ...baseInput,
    brewMode: 'iced' as const,
    coffeeName: 'Sumatra Gayo Aceh Washed',
    process: 'washed',
    roastLevel: 'medium',
    dripperId: 'matrix-chemex-all',
    targetProfileId: 'balance_clean',
  }, fullCatalog);
  assert.ok(chemexGayoIced.waterTempC >= 90 && chemexGayoIced.waterTempC <= 92);
  assert.match(collectPlanNarrative(chemexGayoIced), /thick filter.*stall|measured ice/i);

  const kalitaKenya = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Kenya AA Washed',
    process: 'washed',
    roastLevel: 'medium_light',
    dripperId: 'matrix-kalita-all',
    targetProfileId: 'balance_clean',
  }, fullCatalog);
  assert.ok(kalitaKenya.waterTempC >= 94 && kalitaKenya.waterTempC <= 96);
  assert.match(collectPlanNarrative(kalitaKenya), /short pulses.*gentle swirl/i);

  const aprilColombiaIced = buildAiBrewPlan({
    ...baseInput,
    brewMode: 'iced' as const,
    coffeeName: 'Colombia Excelso Washed',
    process: 'washed',
    roastLevel: 'medium',
    dripperId: 'matrix-april-all',
    targetProfileId: 'more_sweetness',
  }, fullCatalog);
  assert.ok(aprilColombiaIced.waterTempC >= 93 && aprilColombiaIced.waterTempC <= 95);
  assert.match(collectPlanNarrative(aprilColombiaIced), /short pulses|measured ice/i);
});

test('V60 More Sweetness calibration handles Japanese iced, hot, water, grind, prompt, and trust labels', () => {
  const iced = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    coffeeName: 'Bolinda, Caranavi, La Paz',
    doseG: '15',
    roastLevel: 'medium',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '9',
    waterHardnessPpm: '6.6',
    waterAlkalinityPpm: '5.5',
    pourStyle: 'balanced',
    pourCount: '3',
  }, catalog);

  assert.equal(iced.hotWaterMl, 135);
  assert.equal(iced.iceMl, 75);
  assert.ok(iced.finalBeverageRatio >= 13.9 && iced.finalBeverageRatio <= 14.1);
  assert.ok(iced.hotExtractionRatio >= 8.9 && iced.hotExtractionRatio <= 9.1);
  assert.ok(iced.waterTempC >= 92 && iced.waterTempC <= 93);
  assert.ok(iced.totalTimeSeconds >= 185 && iced.totalTimeSeconds <= 200);
  const icedPours = iced.steps.filter((step) => step.pourVolumeMl > 0);
  assert.equal(icedPours.length, 3);
  assert.deepEqual(icedPours.map((step) => step.pourVolumeMl), [30, 70, 35]);
  assert.equal(icedPours[icedPours.length - 1]?.targetVolumeMl, iced.hotWaterMl);
  assert.equal(iced.deviceProfileMode, 'exact');
  assert.equal(iced.deviceProfileId, 'profile_hario_v60_iced');
  assert.ok(iced.estimatedCupOutputMl < iced.totalWaterMl);
  assert.equal(iced.hotWaterMl + iced.iceMl, iced.totalWaterMl);
  assert.ok(iced.warnings.join(' ').toLowerCase().includes('hardness'));

  const hot = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Bolinda, Caranavi, La Paz',
    doseG: '15',
    roastLevel: 'medium',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '9',
    waterHardnessPpm: '6.6',
    waterAlkalinityPpm: '5.5',
  }, catalog);
  assert.ok(hot.totalWaterMl >= 225 && hot.totalWaterMl <= 235);
  assert.ok(hot.finalBeverageRatio >= 15.0 && hot.finalBeverageRatio <= 15.7);
  assert.ok(hot.waterTempC >= 92 && hot.waterTempC <= 94);
  assert.ok(hot.totalTimeSeconds >= 170 && hot.totalTimeSeconds <= 185);
  const hotPours = hot.steps.filter((step) => step.pourVolumeMl > 0);
  assert.equal(hotPours.length, 4);
  assert.equal(hotPours.reduce((sum, step) => sum + step.pourVolumeMl, 0), hot.hotWaterMl);
  assert.ok(hotPours[0].pourVolumeMl >= 30 && hotPours[0].pourVolumeMl <= 35);
  assert.ok(hotPours[1].pourVolumeMl >= 70 && hotPours[1].pourVolumeMl <= 105);
  assert.ok(hotPours.every((step) => !/drawdown|serve|sajikan/i.test(`${step.id} ${step.label}`)));

  const normalWaterHot = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Bolinda, Caranavi, La Paz',
    doseG: '15',
    roastLevel: 'medium',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assert.ok(normalWaterHot.totalWaterMl >= 225 && normalWaterHot.totalWaterMl <= 235);
  assert.ok(normalWaterHot.waterTempC >= 92 && normalWaterHot.waterTempC <= 94);
  assert.ok(normalWaterHot.totalTimeSeconds >= 170 && normalWaterHot.totalTimeSeconds <= 185);

  const promptWithoutVariety = buildGenerateBriefPrompt(iced, 'id');
  assert.doesNotMatch(promptWithoutVariety.body, /geisha|gesha/i);

  const geishaPlan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    coffeeName: 'Panama Boquete',
    doseG: '15',
    roastLevel: 'light',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    variety: 'geisha',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assert.match(buildGenerateBriefPrompt(geishaPlan, 'id').body, /geisha|gesha/i);

  const promptCases = [
    [buildExplainPrompt(iced, 'id'), 2500],
    [buildTroubleshootPrompt(iced, 'id'), 2500],
    [buildGenerateBriefPrompt(iced, 'id'), 2000],
    [buildAiAssistPrompt('ai_assist_deep_analysis', iced, 'id'), 4000],
    [buildOptimizationPrompt(iced, 'id'), 2500],
  ] as const;
  for (const [prompt, maxChars] of promptCases) {
    assert.ok(
      estimatePromptSize(prompt.body) <= maxChars,
      `${prompt.title} prompt exceeded ${maxChars} chars: ${estimatePromptSize(prompt.body)}`,
    );
    assert.doesNotMatch(
      prompt.body,
      /deterministic envelope|cadence profile|operation progression profile|target-intent checklist|method cue checklist|structured patch|validator clamp|extraction pressure profile/i,
    );
  }

  const feimaPlan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bolinda, Caranavi, La Paz',
    doseG: '15',
    dripperId: 'hario-v60',
    grinderId: 'feima-600n',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assert.match(feimaPlan.grindRecommendation, /Gilingan awal|Starting grind/i);
  assert.doesNotMatch(feimaPlan.grindRecommendation, /Gilingan:\s*setting 4-4[\s\S]*Sumber.*setting 4-5/i);

  assert.equal(resolveBrewerProfileTrustStatus({ deviceProfileMode: 'exact', exactMatch: true, confidence: 'high' }), 'exact');
  assert.equal(resolveBrewerProfileTrustStatus({ deviceProfileMode: 'derived_template', confidence: 'medium' }), 'derived');
  assert.equal(resolveBrewerProfileTrustStatus({ deviceProfileMode: 'family_fallback', confidence: 'low' }), 'calibration_required');
});

test('V60 natural Ombligon sweetness plans use lower hot temperature and safe 92-93C iced baseline without changing medium washed baseline', () => {
  const hot = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Colombia Huila Natural Ombligon',
    doseG: '15',
    process: 'natural',
    variety: 'ombligon',
    roastLevel: 'medium_light',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assertPlanEnvelope(hot);
  assert.ok(hot.totalWaterMl >= 225 && hot.totalWaterMl <= 230);
  assert.ok(hot.finalBeverageRatio >= 15 && hot.finalBeverageRatio <= 15.4);
  assert.ok(hot.waterTempC >= 90 && hot.waterTempC <= 92);
  assert.ok(hot.totalTimeSeconds >= 160 && hot.totalTimeSeconds <= 175);
  const hotPours = hot.steps.filter((step) => step.pourVolumeMl > 0);
  assert.ok(hotPours.length >= 3);
  assert.ok(hotPours[0].pourVolumeMl >= 30 && hotPours[0].pourVolumeMl <= 35);
  assert.match(hot.notes.join(' '), /natural high-aroma|longer bloom/i);

  const iced = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    coffeeName: 'Colombia Huila Natural Ombligon',
    doseG: '15',
    process: 'natural',
    variety: 'ombligon',
    roastLevel: 'medium_light',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assertPlanEnvelope(iced);
  assert.equal(iced.hotWaterMl, 135);
  assert.equal(iced.iceMl, 75);
  assert.equal(iced.hotWaterMl + iced.iceMl, iced.totalWaterMl);
  assert.ok(iced.finalBeverageRatio >= 13.9 && iced.finalBeverageRatio <= 14.1);
  assert.ok(iced.hotExtractionRatio >= 8.9 && iced.hotExtractionRatio <= 9.1);
  assert.ok(iced.waterTempC >= 92 && iced.waterTempC <= 93);
  assert.ok(iced.totalTimeSeconds >= 185 && iced.totalTimeSeconds <= 200);
  assert.ok(iced.estimatedCupOutputMl < iced.totalWaterMl);
  const icedPours = iced.steps.filter((step) => step.pourVolumeMl > 0);
  assert.deepEqual(icedPours.map((step) => step.pourVolumeMl), [30, 70, 35]);
  assert.equal(icedPours[1]?.startSeconds, 45);
});

test('V60 hot auto plan keeps structured global coffees flexible with four positive pours', () => {
  const assertStructuredPlan = (plan: ReturnType<typeof buildAiBrewPlan>) => {
    const pours = plan.steps.filter((step) => step.pourVolumeMl > 0);
    assert.equal(pours.length, 4);
    assert.ok(plan.totalWaterMl >= 230 && plan.totalWaterMl <= 245);
    assert.ok(plan.waterTempC >= 92 && plan.waterTempC <= 94);
    assert.equal(pours.reduce((sum, step) => sum + step.pourVolumeMl, 0), plan.hotWaterMl);
    assert.ok(pours[0].pourVolumeMl >= 30 && pours[0].pourVolumeMl <= 36);
    assert.ok(pours[1].pourVolumeMl >= 82 && pours[1].pourVolumeMl <= 90);
    assert.ok(pours[2].pourVolumeMl >= 55 && pours[2].pourVolumeMl <= 65);
    assert.ok(pours[3].pourVolumeMl >= 55 && pours[3].pourVolumeMl <= 65);
    assert.ok(pours.every((step) => !/drawdown|serve|sajikan/i.test(`${step.id} ${step.label}`)));
  };

  const indonesiaPlan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Sumatra Lintong Lake Toba',
    doseG: '15',
    process: 'wet_hulled',
    roastLevel: 'medium',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'balance_clean',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    pourStyle: 'auto',
    pourCount: 'auto',
  }, catalog);
  assertStructuredPlan(indonesiaPlan);

  const brazilPlan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Brazil Cerrado Natural Bourbon chocolate',
    doseG: '15',
    process: 'natural',
    roastLevel: 'medium',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'balance_clean',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    pourStyle: 'auto',
    pourCount: 'auto',
  }, catalog);
  assertStructuredPlan(brazilPlan);
});

test('Hario Switch exact variants preserve every volume checkpoint without changing V60 behavior', () => {
  const base = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Colombia Huila washed',
    doseG: '20',
    process: 'washed',
    roastLevel: 'medium' as const,
    dripperId: 'hario-switch-03',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const hot = buildAiBrewPlan({ ...base, brewMode: 'hot' }, catalog);
  assertPlanEnvelope(hot);
  assert.equal(hot.methodFamily, 'hario_switch');
  assert.equal(hot.deviceProfileMode, 'exact');
  assert.equal(hot.deviceProfileId, 'profile_hario_switch_03_hot');
  assert.equal(hot.ratioToolMethodId, 'clever_dripper');
  assert.equal(hot.steps.filter((step) => step.pourVolumeMl > 0).length, 2);
  assert.equal(hot.workflowValidation?.status, 'ready');
  assert.equal(hot.devicePhysicalConstraints?.finishedCapacityMl, 360);
  assert.ok(hot.steps.every((step) => step.valveState || step.kind === 'serve'));
  const sourceVolumeIds = hot.steps.filter((step) => step.pourVolumeMl > 0).map((step) => step.id);
  const guideSourceIds = new Set((hot.workflowGuideSteps || []).flatMap((step) => step.sourceStepIds));
  assert.deepEqual(sourceVolumeIds.filter((id) => !guideSourceIds.has(id)), []);
  const switchPourGuideLines = (hot.workflowGuideSteps || []).filter((step) => step.pourVolumeMl > 0);
  assert.ok(switchPourGuideLines.every((step) => /\d+:\d{2}/.test(step.primaryText)), 'Switch Ringkas guide keeps time in the main line');
  assert.ok(switchPourGuideLines.every((step) => /tuang \d+ ml sampai \d+ ml/.test(step.primaryText)), 'Switch Ringkas guide keeps pour and cumulative target');
  assert.ok(switchPourGuideLines.every((step) => /Katup (tutup|buka)/.test(step.primaryText)), 'Switch Ringkas guide keeps valve state');
  assert.ok(hot.steps.some((step) => step.kind === 'wait' && step.pourVolumeMl === 0));
  assert.ok(hot.steps.some((step) => step.kind === 'release' && step.pourVolumeMl === 0));
  assert.ok((hot.workflowGuideSteps || []).some((step) => step.techniqueChips.some((chip) => chip.key === 'valve' && chip.value === 'closed')));
  assert.ok((hot.workflowGuideSteps || []).some((step) => step.techniqueChips.some((chip) => chip.key === 'chamber_load')));
  assert.match(
    hot.steps.map((step) => `${step.label} ${step.note}`).join(' '),
    /valve|switch|release/i,
  );
  assert.match(
    hot.steps.map((step) => step.hybridInstruction || '').join(' '),
    /Hario Switch|switch/i,
  );
  assert.doesNotMatch(
    hot.steps.map((step) => step.hybridInstruction || '').join(' '),
    /\bClever\b/,
  );
  const hotBrief = buildPlanMethodBrief(hot, 'id');
  assert.match(hotBrief.controlValue, /Valve tertutup|switch/i);
  assert.match(hotBrief.watch.join(' '), /preheat|switch|swirl/i);

  const iced = buildAiBrewPlan({ ...base, brewMode: 'iced' }, catalog);
  assertPlanEnvelope(iced);
  assert.equal(iced.methodFamily, 'hario_switch');
  assert.equal(iced.deviceProfileMode, 'exact');
  assert.equal(iced.deviceProfileId, 'profile_hario_switch_03_iced');
  assert.equal(iced.ratioToolMethodId, 'clever_dripper_iced');
  assert.equal(iced.hotWaterMl + iced.iceMl, iced.totalWaterMl);
  assert.ok(iced.estimatedCupOutputMl < iced.totalWaterMl);
  assert.ok(iced.steps.some((step) => step.kind === 'release' && /ice|es/i.test(`${step.label} ${step.note}`)));
});

test('Hario Switch 02 guards chamber capacity and legacy Switch requires exact size', () => {
  const switch02 = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Colombia Huila washed',
    doseG: '20',
    process: 'washed',
    roastLevel: 'medium',
    dripperId: 'hario-switch-02',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    targetWaterMl: '300',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assert.equal(switch02.methodFamily, 'hario_switch');
  assert.equal(switch02.deviceProfileId, 'profile_hario_switch_02_hot');
  assert.equal(switch02.workflowValidation?.status, 'ready');
  assert.ok(Math.max(...switch02.steps.filter((step) => step.valveState === 'closed').map((step) => step.chamberLoadMl || 0)) <= 180);
  const positiveStepIds = switch02.steps.filter((step) => step.pourVolumeMl > 0).map((step) => step.id);
  const guideSourceIds = new Set((switch02.workflowGuideSteps || []).flatMap((step) => step.sourceStepIds));
  assert.deepEqual(positiveStepIds.filter((id) => !guideSourceIds.has(id)), []);

  const legacy = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Colombia Huila washed',
    doseG: '15',
    process: 'washed',
    roastLevel: 'medium',
    dripperId: 'hario-switch',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assert.equal(legacy.methodFamily, 'hario_switch');
  assert.equal(legacy.workflowValidation?.status, 'blocked');
  assert.match((legacy.workflowValidation?.blockingErrors || []).join(' '), /Choose Switch 02, Switch 03, or MUGEN x SWITCH/i);

  const unsafeGuide = buildWorkflowAwareGuideSteps({
    ...switch02,
    methodProgramme: 'full_immersion',
    hotWaterMl: 300,
    steps: [{
      ...switch02.steps[0],
      id: 'unsafe_full_charge',
      label: 'Unsafe Full Charge',
      pourVolumeMl: 300,
      targetVolumeMl: 300,
      valveState: 'closed',
      chamberState: 'immersion',
      chamberLoadMl: 300,
    }],
  });
  const unsafeValidation = validateMethodWorkflowGuide({
    ...switch02,
    methodProgramme: 'full_immersion',
    hotWaterMl: 300,
    steps: [{
      ...switch02.steps[0],
      id: 'unsafe_full_charge',
      label: 'Unsafe Full Charge',
      pourVolumeMl: 300,
      targetVolumeMl: 300,
      valveState: 'closed',
      chamberState: 'immersion',
      chamberLoadMl: 300,
    }],
  }, unsafeGuide);
  assert.equal(unsafeValidation.status, 'blocked');
  assert.match(unsafeValidation.blockingErrors.join(' '), /exceeds safe|Full-immersion/i);
});

test('production Hario Switch presets choose safe defaults and preserve programme provenance', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const base = {
    ...createDefaultAiBrewFormState(productionCatalog),
    brewMode: 'hot' as const,
    coffeeName: 'Switch QA washed',
    doseG: '15',
    process: 'washed',
    variety: 'bourbon',
    roastLevel: 'medium' as const,
    dripperId: 'hario-switch-03',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'balance_clean',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const quickDefault = buildAiBrewPlan(base, productionCatalog);
  assert.equal(quickDefault.methodFamily, 'hario_switch');
  assert.equal(quickDefault.switchPresetId, 'hybrid_balanced');
  assert.equal(quickDefault.methodProgramme, 'bloom_then_immersion');
  assert.equal(quickDefault.switchCompatibility?.status, 'safe');
  assert.equal(quickDefault.switchStepValidation?.status, 'safe');
  assert.ok((quickDefault.switchTasteProgramme?.bloomRatio || 0) >= 2.5);
  assert.ok((quickDefault.switchTasteProgramme?.bloomRatio || 0) <= 3);
  assert.ok((quickDefault.switchTasteProgramme?.closedPhaseMl || 0) > (quickDefault.switchTasteProgramme?.bloomMl || 0));
  assert.equal(quickDefault.switchProvenance?.hardwareVerificationLevel, 'official');
  assert.equal(quickDefault.switchProvenance?.workflowVerificationLevel, 'curated_synthesis');
  assert.equal(quickDefault.switchProvenance?.sensoryModelConfidence, 'medium');
  assert.match(quickDefault.switchWhy || '', /closed|sweetness|open/i);
  assert.ok((quickDefault.workflowGuideSteps || []).some((step) => step.techniqueChips.some((chip) => chip.key === 'programme')));

  const brightAuto = buildAiBrewPlan({
    ...base,
    targetProfileId: 'floral_transparent',
    process: 'washed',
  }, productionCatalog);
  assert.equal(brightAuto.switchPresetId, 'hybrid_bright_clean');
  assert.equal(brightAuto.methodProgramme, 'percolation_then_immersion');
  assert.ok((brightAuto.switchTasteProgramme?.bloomRatio || 0) <= 2.5);
  assert.ok((brightAuto.switchTasteProgramme?.openPhaseMl || 0) > (brightAuto.switchTasteProgramme?.closedPhaseMl || 0));
  assert.ok(brightAuto.steps.filter((step) => step.pourVolumeMl > 0).some((step) => step.valveState === 'open'));
  assert.ok(brightAuto.steps.filter((step) => step.pourVolumeMl > 0).some((step) => step.valveState === 'closed'));
  assert.ok(brightAuto.steps.filter((step) => step.pourVolumeMl > 0).every((step) => step.flowRateMlPerSec && step.pourPath && step.pourHeight && step.agitationLevel));

  const acidityAuto = buildAiBrewPlan({
    ...base,
    targetProfileId: 'more_acidity',
    process: 'washed',
  }, productionCatalog);
  assert.equal(acidityAuto.switchPresetId, 'hybrid_bright_clean');
  assert.ok((acidityAuto.switchTasteProgramme?.closedPhaseSeconds || 0) <= 45);
  assert.ok((acidityAuto.expectedCupProfile?.clarity || 0) >= (quickDefault.expectedCupProfile?.clarity || 0));

  const fruitAuto = buildAiBrewPlan({
    ...base,
    coffeeName: 'Switch QA natural fruit',
    targetProfileId: 'fruit_forward',
    process: 'natural',
  }, productionCatalog);
  assert.equal(fruitAuto.switchPresetId, 'hybrid_balanced');
  assert.ok((fruitAuto.switchTasteProgramme?.bloomRatio || 0) >= 2.5);
  assert.ok((fruitAuto.switchTasteProgramme?.openPhaseMl || 0) > 0);

  const sweetAuto = buildAiBrewPlan({
    ...base,
    targetProfileId: 'more_sweetness',
    process: 'washed',
  }, productionCatalog);
  assert.equal(sweetAuto.switchPresetId, 'immersion_sweet');
  assert.ok((sweetAuto.switchTasteProgramme?.bloomRatio || 0) >= 2.8);
  assert.ok((sweetAuto.switchTasteProgramme?.closedPhaseSeconds || 0) >= 80);
  assert.ok(sweetAuto.steps.filter((step) => step.pourVolumeMl > 0).length >= 2);

  const softAuto = buildAiBrewPlan({
    ...base,
    targetProfileId: 'soft_round',
    process: 'honey',
  }, productionCatalog);
  assert.equal(softAuto.switchPresetId, 'immersion_sweet');
  assert.ok((softAuto.switchTasteProgramme?.bloomRatio || 0) >= 2.8);
  assert.ok((softAuto.expectedCupProfile?.acidity || 0) <= (acidityAuto.expectedCupProfile?.acidity || 0));

  const bodyAuto = buildAiBrewPlan({
    ...base,
    doseG: '12',
    targetProfileId: 'dense_comforting',
    process: 'wet_hulled',
  }, productionCatalog);
  assert.equal(bodyAuto.switchPresetId, 'immersion_heavy_body');
  assert.equal(bodyAuto.workflowValidation?.status, 'ready');
  assert.equal(bodyAuto.switchStepValidation?.status, 'safe');
  assert.ok((bodyAuto.switchTasteProgramme?.bloomRatio || 0) >= 3.2);

  const switch02LargeAuto = buildAiBrewPlan({
    ...base,
    dripperId: 'hario-switch-02',
    doseG: '20',
    targetWaterMl: '300',
    targetProfileId: 'dense_comforting',
    process: 'wet_hulled',
  }, productionCatalog);
  assert.equal(switch02LargeAuto.switchPresetId, 'v60_mode');
  assert.equal(switch02LargeAuto.workflowValidation?.status, 'ready');
  assert.equal(switch02LargeAuto.switchStepValidation?.status, 'safe');
  assert.equal(switch02LargeAuto.switchTasteProgramme?.closedPhaseMl, 0);
  assert.ok(switch02LargeAuto.steps.filter((step) => step.pourVolumeMl > 0).every((step) => step.valveState === 'open'));

  const switch02UnsafeHeavy = buildAiBrewPlan({
    ...base,
    dripperId: 'hario-switch-02',
    doseG: '20',
    targetWaterMl: '300',
    switchPresetId: 'immersion_heavy_body',
  }, productionCatalog);
  assert.equal(switch02UnsafeHeavy.switchStepValidation?.status, 'blocked');
  assert.equal(switch02UnsafeHeavy.workflowValidation?.status, 'blocked');
  assert.match((switch02UnsafeHeavy.switchStepValidation?.message || ''), /exceeds safe|melebihi batas aman/i);

  const switch03Large = buildAiBrewPlan({
    ...base,
    doseG: '20',
    targetWaterMl: '300',
    switchPresetId: 'hybrid_balanced',
  }, productionCatalog);
  assert.equal(switch03Large.workflowValidation?.status, 'ready');
  assert.equal(switch03Large.switchStepValidation?.status, 'safe');
  assert.equal(switch03Large.switchDoseMatrixRowId, 'switch03-20');
  assert.ok(switch03Large.steps.filter((step) => step.pourVolumeMl > 0).length >= 2);
  assert.equal(
    switch03Large.steps.filter((step) => step.pourVolumeMl > 0).filter((step) => {
      const guideIds = new Set((switch03Large.workflowGuideSteps || []).flatMap((guideStep) => guideStep.sourceStepIds));
      return !guideIds.has(step.id);
    }).length,
    0,
  );

  const mugen = buildAiBrewPlan({
    ...base,
    dripperId: 'mugen-x-switch',
    doseG: '12',
  }, productionCatalog);
  assert.equal(mugen.switchPresetId, 'mugen_everyday_hybrid');
  assert.equal(mugen.devicePhysicalConstraints?.finishedCapacityMl, 200);
  assert.equal(mugen.devicePhysicalConstraints?.coneType, 'mugen');
  assert.notEqual(mugen.devicePhysicalConstraints?.finishedCapacityMl, switch03Large.devicePhysicalConstraints?.finishedCapacityMl);

  const mugen18 = buildAiBrewPlan({
    ...base,
    dripperId: 'mugen-x-switch',
    doseG: '18',
    targetProfileId: 'dense_comforting',
    process: 'wet_hulled',
  }, productionCatalog);
  assert.equal(mugen18.switchPresetId, 'mugen_everyday_hybrid');
  assert.equal(mugen18.devicePhysicalConstraints?.finishedCapacityMl, 200);
  assert.equal(mugen18.switchStepValidation?.status, 'safe');
  assert.ok((mugen18.switchTasteProgramme?.closedPhaseMl || 0) <= (mugen18.switchStepValidation?.maxClosedLoadMl || 0));
  assert.match(mugen18.switchWhy || '', /MUGEN|low-bypass|200 ml/i);
});

test('Hario Switch taste-first snapshot matrix proves numeric target differences and guardrails', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const base = {
    ...createDefaultAiBrewFormState(productionCatalog),
    brewMode: 'hot' as const,
    coffeeName: 'Switch taste matrix QA',
    doseG: '15',
    process: 'washed',
    variety: 'bourbon',
    roastLevel: 'medium' as const,
    dripperId: 'hario-switch-03',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'balance_clean',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const switch03Balance = buildAiBrewPlan({
    ...base,
    doseG: '20',
    targetWaterMl: '300',
    targetProfileId: 'balance_clean',
  }, productionCatalog);
  assertPlanEnvelope(switch03Balance);
  assertSwitchWaterAccounting(switch03Balance);
  assertSafeSwitchPlan(switch03Balance);
  let balanceSummary = summarizeSwitchPlan(switch03Balance);
  assert.equal(balanceSummary.presetId, 'hybrid_balanced');
  assert.equal(balanceSummary.hotWaterMl, 300);
  assert.equal(balanceSummary.steps.some((step) => step.id === 'switch_closed_bloom'), true);
  assert.equal(balanceSummary.steps.some((step) => step.id === 'switch_closed_sweeten'), true);
  assert.equal(balanceSummary.steps.some((step) => step.id === 'switch_release_checkpoint'), true);
  assert.equal(balanceSummary.steps.some((step) => step.id === 'switch_open_finish'), true);

  const switch03Sweet = buildAiBrewPlan({
    ...base,
    targetProfileId: 'more_sweetness',
  }, productionCatalog);
  assertPlanEnvelope(switch03Sweet);
  assertSwitchWaterAccounting(switch03Sweet);
  assertSafeSwitchPlan(switch03Sweet);
  const sweetSummary = summarizeSwitchPlan(switch03Sweet);
  assert.ok(['immersion_sweet', 'hybrid_balanced'].includes(String(sweetSummary.presetId)));
  assert.ok(sweetSummary.bloomMl >= switch03Sweet.doseG * 2.8 && sweetSummary.bloomMl <= switch03Sweet.doseG * 3.4);
  assert.ok(sweetSummary.closedPhaseMl / sweetSummary.hotWaterMl > balanceSummary.closedPhaseMl / balanceSummary.hotWaterMl);
  assert.ok(sweetSummary.expectedCup.sweetness >= balanceSummary.expectedCup.sweetness);

  const switch02BodyAuto = buildAiBrewPlan({
    ...base,
    dripperId: 'hario-switch-02',
    doseG: '20',
    targetWaterMl: '300',
    targetProfileId: 'more_body',
    process: 'wet_hulled',
  }, productionCatalog);
  assertPlanEnvelope(switch02BodyAuto);
  assertSwitchWaterAccounting(switch02BodyAuto);
  assertSafeSwitchPlan(switch02BodyAuto);
  const switch02AutoSummary = summarizeSwitchPlan(switch02BodyAuto);
  assert.ok(['v60_mode', 'hybrid_balanced'].includes(String(switch02AutoSummary.presetId)));
  assert.ok(switch02AutoSummary.closedLoadPeakMl <= switch02AutoSummary.safeClosedMaxMl);

  const switch02BodyManual = buildAiBrewPlan({
    ...base,
    dripperId: 'hario-switch-02',
    doseG: '20',
    targetWaterMl: '300',
    targetProfileId: 'more_body',
    process: 'wet_hulled',
    switchPresetId: 'immersion_heavy_body',
  }, productionCatalog);
  assertUnsafeSwitchPlan(switch02BodyManual);
  assert.equal(switch02BodyManual.switchPresetId, 'immersion_heavy_body');
  assert.notEqual(switch02BodyManual.workflowValidation?.status, 'ready');

  const switch03Floral = buildAiBrewPlan({
    ...base,
    targetProfileId: 'floral_transparent',
  }, productionCatalog);
  assertPlanEnvelope(switch03Floral);
  assertSwitchWaterAccounting(switch03Floral);
  assertSafeSwitchPlan(switch03Floral);
  const floralSummary = summarizeSwitchPlan(switch03Floral);
  assert.ok(['hybrid_bright_clean', 'v60_mode'].includes(String(floralSummary.presetId)));
  assert.ok(floralSummary.bloomMl < sweetSummary.bloomMl);
  assert.ok(floralSummary.closedPhaseMl < sweetSummary.closedPhaseMl);
  assert.ok(floralSummary.expectedCup.clarity >= balanceSummary.expectedCup.clarity);
  assert.ok(floralSummary.expectedCup.acidity >= balanceSummary.expectedCup.acidity);
  assert.ok(floralSummary.expectedCup.body <= sweetSummary.expectedCup.body);

  const switch03Fruit = buildAiBrewPlan({
    ...base,
    coffeeName: 'Switch fruit-forward natural',
    targetProfileId: 'fruit_forward',
    process: 'natural',
  }, productionCatalog);
  assertPlanEnvelope(switch03Fruit);
  assertSwitchWaterAccounting(switch03Fruit);
  assertSafeSwitchPlan(switch03Fruit);
  const fruitSummary = summarizeSwitchPlan(switch03Fruit);
  assert.ok(['hybrid_balanced', 'hybrid_bright_clean'].includes(String(fruitSummary.presetId)));
  assert.notEqual(fruitSummary.presetId, 'immersion_heavy_body');
  assert.ok(fruitSummary.expectedCup.sweetness >= balanceSummary.expectedCup.sweetness - 1);
  assert.ok(fruitSummary.expectedCup.aroma >= balanceSummary.expectedCup.aroma - 1);

  const switch03Soft = buildAiBrewPlan({
    ...base,
    targetProfileId: 'soft_round',
    process: 'honey',
  }, productionCatalog);
  assertPlanEnvelope(switch03Soft);
  assertSwitchWaterAccounting(switch03Soft);
  assertSafeSwitchPlan(switch03Soft);
  const softSummary = summarizeSwitchPlan(switch03Soft);
  assert.ok(['immersion_sweet', 'hybrid_balanced'].includes(String(softSummary.presetId)));
  assert.ok(softSummary.steps.filter((step) => step.pourVolumeMl > 0).every((step) => step.agitation === 'low' || step.agitation === 'minimal'));
  assert.ok(softSummary.expectedCup.acidity <= floralSummary.expectedCup.acidity);
  assert.ok(softSummary.expectedCup.sweetness >= balanceSummary.expectedCup.sweetness);

  const mugen18 = buildAiBrewPlan({
    ...base,
    dripperId: 'mugen-x-switch',
    doseG: '18',
    targetProfileId: 'dense_comforting',
    process: 'wet_hulled',
  }, productionCatalog);
  assertPlanEnvelope(mugen18);
  assertSwitchWaterAccounting(mugen18);
  assertSafeSwitchPlan(mugen18);
  const mugenSummary = summarizeSwitchPlan(mugen18);
  assert.equal(mugenSummary.presetId, 'mugen_everyday_hybrid');
  assert.equal(mugen18.devicePhysicalConstraints?.finishedCapacityMl, 200);
  assert.notEqual(mugenSummary.safeClosedMaxMl, switch03Balance.switchStepValidation?.maxClosedLoadMl);
  assert.match([mugen18.switchWhy, ...mugenSummary.warnings].join(' '), /MUGEN|low-bypass|200 ml/i);
  assert.notEqual(mugen18.doseG, 20);

  const iced = buildAiBrewPlan({
    ...base,
    brewMode: 'iced',
    targetProfileId: 'more_sweetness',
    switchPresetId: 'iced_hybrid',
  }, productionCatalog);
  assertPlanEnvelope(iced);
  assertSwitchWaterAccounting(iced);
  assertSafeSwitchPlan(iced);
  assert.equal(iced.hotWaterMl + iced.iceMl, iced.totalWaterMl);
  assert.ok(iced.steps.some((step) => step.kind === 'release' && /ice|es/i.test(`${step.label} ${step.note}`)));
  assert.match([iced.summary, iced.notes.join(' '), ...(iced.workflowGuideSteps || []).map((step) => step.primaryText)].join(' '), /hot|panas|ice|es/i);

  const v60Mode = buildAiBrewPlan({
    ...base,
    switchPresetId: 'v60_mode',
    targetProfileId: 'floral_transparent',
  }, productionCatalog);
  assertPlanEnvelope(v60Mode);
  assertSwitchWaterAccounting(v60Mode);
  assertSafeSwitchPlan(v60Mode);
  const v60ModeSummary = summarizeSwitchPlan(v60Mode);
  assert.equal(v60ModeSummary.presetId, 'v60_mode');
  assert.ok(v60Mode.steps.every((step) => step.valveState === 'open'));
  assert.ok(v60Mode.steps.every((step) => (step.chamberLoadMl || 0) === 0));
  assert.equal(v60Mode.steps.some((step) => step.kind === 'release'), false);
  assert.ok(v60ModeSummary.expectedCup.clarity >= balanceSummary.expectedCup.clarity);
  assert.ok(v60ModeSummary.expectedCup.body <= sweetSummary.expectedCup.body);

  const manualFloralHeavy = buildAiBrewPlan({
    ...base,
    targetProfileId: 'floral_transparent',
    switchPresetId: 'immersion_heavy_body',
  }, productionCatalog);
  assert.equal(manualFloralHeavy.switchPresetId, 'immersion_heavy_body');
  assert.match(summarizeSwitchPlan(manualFloralHeavy).warnings.join(' '), /Manual preset|clarity|Hybrid Bright Clean|V60 Mode/i);

  const v60Hot = buildAiBrewPlan({
    ...base,
    dripperId: 'hario-v60',
    brewMode: 'hot',
    targetProfileId: 'balance_clean',
    switchPresetId: '',
  }, productionCatalog);
  const v60Iced = buildAiBrewPlan({
    ...base,
    dripperId: 'hario-v60',
    brewMode: 'iced',
    targetProfileId: 'more_sweetness',
    switchPresetId: '',
  }, productionCatalog);
  assertPlanEnvelope(v60Hot);
  assertPlanEnvelope(v60Iced);
  assert.equal(v60Hot.methodFamily, 'v60');
  assert.equal(v60Iced.methodFamily, 'v60');
  assert.equal(v60Hot.switchTasteProgramme, undefined);
  assert.equal(v60Iced.switchTasteProgramme, undefined);
  assert.equal(v60Iced.hotWaterMl + v60Iced.iceMl, v60Iced.totalWaterMl);
  assert.doesNotMatch([...v60Hot.steps, ...v60Iced.steps].map((step) => `${step.label} ${step.note}`).join(' '), /Switch|katup|chamber/i);

  balanceSummary = summarizeSwitchPlan(switch03Balance);
  const numericFingerprints = new Set([
    balanceSummary,
    sweetSummary,
    floralSummary,
    summarizeSwitchPlan(buildAiBrewPlan({ ...base, targetProfileId: 'more_body', process: 'wet_hulled' }, productionCatalog)),
  ].map((summary) => JSON.stringify({
    bloomMl: summary.bloomMl,
    closedPhaseMl: summary.closedPhaseMl,
    openPhaseMl: summary.openPhaseMl,
    releaseSeconds: summary.releaseSeconds,
    valvePath: summary.valvePath,
    cup: summary.expectedCup,
  })));
  assert.ok(numericFingerprints.size >= 3, `target rasa must change numeric plan, not only copy: ${JSON.stringify([...numericFingerprints])}`);
});

test('AI Brew release snapshot matrix keeps global methods safe, honest, and method-specific', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const findDripperId = (pattern: RegExp) => {
    const dripper = productionCatalog.drippers.find((item) => pattern.test(item.name));
    assert.ok(dripper, `Missing dripper ${pattern}`);
    return dripper.id;
  };
  const base = {
    ...createDefaultAiBrewFormState(productionCatalog),
    coffeeName: 'Release Snapshot Washed Ethiopia',
    process: 'washed',
    variety: 'ethiopian_heirloom',
    roastLevel: 'light' as const,
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };
  const cases: Array<{
    label: string;
    input: Partial<AiBrewFormState>;
    expectedMethod?: AiBrewMethodFamily;
    requiredText?: RegExp;
    forbiddenText?: RegExp;
    expectBlocked?: boolean;
  }> = [
    { label: 'Switch 03 20g 300ml Seimbang', input: { dripperId: 'hario-switch-03', doseG: '20', targetWaterMl: '300', targetProfileId: 'balance_clean' }, expectedMethod: 'hario_switch', requiredText: /Katup|Switch|muatan ruang/i },
    { label: 'Switch 03 15g Manis', input: { dripperId: 'hario-switch-03', targetProfileId: 'more_sweetness' }, expectedMethod: 'hario_switch', requiredText: /Katup|tuang \d+ ml sampai/i },
    { label: 'Switch 02 20g Body Auto', input: { dripperId: 'hario-switch-02', doseG: '20', targetWaterMl: '300', targetProfileId: 'more_body', process: 'wet_hulled' }, expectedMethod: 'hario_switch', requiredText: /Katup buka|safe|aman/i },
    { label: 'Switch 02 20g Heavy manual', input: { dripperId: 'hario-switch-02', doseG: '20', targetWaterMl: '300', targetProfileId: 'more_body', process: 'wet_hulled', switchPresetId: 'immersion_heavy_body' }, expectedMethod: 'hario_switch', requiredText: /exceeds|melebihi|blocked|muatan|chamber/i, expectBlocked: true },
    { label: 'Switch 03 15g Floral Transparan', input: { dripperId: 'hario-switch-03', targetProfileId: 'floral_transparent' }, expectedMethod: 'hario_switch', requiredText: /Katup|tuang \d+ ml sampai/i },
    { label: 'Switch 03 15g Buah Menonjol', input: { dripperId: 'hario-switch-03', targetProfileId: 'fruit_forward', process: 'natural' }, expectedMethod: 'hario_switch', requiredText: /Katup|tuang \d+ ml sampai/i },
    { label: 'Switch 03 15g Lembut Bulat', input: { dripperId: 'hario-switch-03', targetProfileId: 'soft_round', process: 'honey' }, expectedMethod: 'hario_switch', requiredText: /Katup|tuang \d+ ml sampai/i },
    { label: 'MUGEN x SWITCH 18g Dense', input: { dripperId: 'mugen-x-switch', doseG: '18', targetProfileId: 'dense_comforting', process: 'wet_hulled' }, expectedMethod: 'hario_switch', requiredText: /MUGEN|low-bypass|200 ml|Katup/i },
    { label: 'Switch Iced Hybrid', input: { dripperId: 'hario-switch-03', brewMode: 'iced', switchPresetId: 'iced_hybrid', targetProfileId: 'more_sweetness' }, expectedMethod: 'hario_switch', requiredText: /panas|hot|ice|es/i },
    { label: 'Switch V60 Mode', input: { dripperId: 'hario-switch-03', switchPresetId: 'v60_mode', targetProfileId: 'floral_transparent' }, expectedMethod: 'hario_switch', requiredText: /Katup buka/i },
    { label: 'V60 hot light roast', input: { dripperId: findDripperId(/^Hario V60$/i), targetProfileId: 'more_acidity' }, expectedMethod: 'v60', requiredText: /bloom|drawdown/i, forbiddenText: /Katup|Switch|chamber/i },
    { label: 'V60 iced light roast', input: { dripperId: findDripperId(/^Hario V60$/i), brewMode: 'iced', targetProfileId: 'more_sweetness' }, expectedMethod: 'v60', requiredText: /hot water|air panas|ice|es/i, forbiddenText: /Katup|Switch|chamber/i },
    { label: 'Kalita balanced', input: { dripperId: findDripperId(/Kalita Wave/i), targetProfileId: 'balance_clean' }, expectedMethod: 'kalita_wave', requiredText: /flat|bed|drawdown/i },
    { label: 'Chemex clean', input: { dripperId: findDripperId(/^Chemex$/i), targetProfileId: 'floral_transparent' }, expectedMethod: 'chemex', requiredText: /thick|filter|drawdown/i },
    { label: 'AeroPress sweet', input: { dripperId: findDripperId(/^AeroPress$/i), targetProfileId: 'more_sweetness' }, expectedMethod: 'aeropress', requiredText: /charge|stir|press|hiss/i, forbiddenText: /final pour|wall/i },
    { label: 'French Press body', input: { dripperId: findDripperId(/^French Press$/i), targetProfileId: 'more_body' }, expectedMethod: 'french_press', requiredText: /charge|steep|settle|decant/i, forbiddenText: /bloom|final pour/i },
    { label: 'Clever balanced', input: { dripperId: findDripperId(/^Clever Dripper$/i), targetProfileId: 'balance_clean' }, expectedMethod: 'clever_dripper', requiredText: /charge|steep|release|drawdown/i },
    { label: 'Moka', input: { dripperId: findDripperId(/^Bialetti Moka Pot$/i), targetProfileId: 'dense_comforting' }, expectedMethod: 'moka_pot', requiredText: /boiler|basket|heat|sputter/i, forbiddenText: /bloom|kettle|final pour/i },
    { label: 'Espresso', input: { dripperId: findDripperId(/^Espresso Machine$/i), targetProfileId: 'balance_clean' }, expectedMethod: 'espresso', requiredText: /dose|puck|shot|yield|flow/i, forbiddenText: /bloom|kettle|drawdown bed/i },
    { label: 'Cold Brew', input: { dripperId: findDripperId(/^Toddy Cold Brew$/i), doseG: '60', targetProfileId: 'soft_round' }, expectedMethod: 'cold_brew', requiredText: /saturate|steep|filter|dilute/i, forbiddenText: /bloom|kettle|hot water/i },
  ];

  for (const entry of cases) {
    const plan = buildAiBrewPlan({ ...base, ...entry.input }, productionCatalog);
    assertPlanEnvelope(plan);
    const summary = summarizeAiBrewPlan(plan);
    assert.equal(summary.method, entry.expectedMethod, entry.label);
    assert.ok(summary.expectedCup.confidence, `${entry.label} expected cup confidence`);
    assert.ok(summary.beanCoverage, `${entry.label} bean coverage`);
    assert.ok(['known_high', 'partial_medium', 'risk_caution', 'unsupported_unsafe', 'unknown_fallback'].includes(summary.beanCoverage?.category || ''), `${entry.label} bean coverage category`);
    const minSnapshotTempC = summary.method === 'cold_brew' ? 0 : 78;
    assert.ok(summary.ratio > 0 && summary.tempC >= minSnapshotTempC && summary.tempC <= 98 && summary.timeSeconds > 0, `${entry.label} safe core metrics`);
    const text = [
      plan.summary,
      ...plan.steps.map((step) => `${step.label} ${step.note}`),
      ...(plan.workflowGuideSteps || []).map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`),
      ...plan.warnings,
      ...(plan.beanCoverage?.warnings || []),
    ].join('\n');
    if (entry.requiredText) assert.match(text, entry.requiredText, `${entry.label} required method language`);
    if (entry.forbiddenText) assert.doesNotMatch(text, entry.forbiddenText, `${entry.label} forbidden method leakage`);
    if (entry.expectBlocked) {
      assert.equal(plan.beanCoverage?.category, 'unsupported_unsafe', `${entry.label} should be unsafe coverage`);
      assert.ok(plan.switchStepValidation?.status === 'blocked' || plan.workflowValidation?.status === 'blocked');
    } else {
      assert.notEqual(plan.beanCoverage?.category, 'unsupported_unsafe', `${entry.label} should not be blocked`);
    }
    if (plan.brewMode === 'iced') {
      assert.equal(plan.hotWaterMl + plan.iceMl, plan.totalWaterMl, `${entry.label} iced split`);
      assert.ok(/hot water|air panas|target panas/i.test(text), `${entry.label} explicit hot target`);
    }
  }
});

test('Hario Switch public presets alter expected cup and keep corrections number-safe', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const base = {
    ...createDefaultAiBrewFormState(productionCatalog),
    brewMode: 'hot' as const,
    coffeeName: 'Switch sensory QA',
    doseG: '15',
    process: 'washed',
    variety: 'bourbon',
    roastLevel: 'medium' as const,
    dripperId: 'hario-switch-03',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'balance_clean',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const sweet = buildAiBrewPlan({ ...base, switchPresetId: 'immersion_sweet' }, productionCatalog);
  const heavy = buildAiBrewPlan({ ...base, switchPresetId: 'immersion_heavy_body' }, productionCatalog);
  const bright = buildAiBrewPlan({ ...base, switchPresetId: 'hybrid_bright_clean' }, productionCatalog);
  const v60Mode = buildAiBrewPlan({ ...base, switchPresetId: 'v60_mode' }, productionCatalog);
  const iced = buildAiBrewPlan({ ...base, brewMode: 'iced', switchPresetId: 'iced_hybrid' }, productionCatalog);

  assert.ok((sweet.expectedCupProfile?.sweetness || 0) >= (bright.expectedCupProfile?.sweetness || 0));
  assert.ok((heavy.expectedCupProfile?.body || 0) >= (bright.expectedCupProfile?.body || 0));
  assert.ok((bright.expectedCupProfile?.clarity || 0) >= (heavy.expectedCupProfile?.clarity || 0));
  assert.equal(v60Mode.methodProgramme, 'full_percolation_v60_mode');
  assert.equal(v60Mode.workflowValidation?.status, 'ready');
  assert.ok(v60Mode.steps.filter((step) => step.pourVolumeMl > 0).every((step) => step.valveState === 'open'));
  assert.equal(iced.methodProgramme, 'iced_hybrid');
  assert.equal(iced.hotWaterMl + iced.iceMl, iced.totalWaterMl);
  assert.match(
    [...iced.notes, ...(iced.workflowGuideSteps || []).map((step) => step.primaryText)].join(' '),
    /no bypass|do not add late bypass/i,
  );

  const bitter = buildTasteFeedbackCorrection(heavy, 'bitter', 'id');
  assert.match(`${bitter.primaryCorrection} ${bitter.backupCorrection}`, /release|buka|kasar|tertutup/i);
  assert.doesNotMatch(`${bitter.primaryCorrection} ${bitter.backupCorrection}`, /ubah dosis|ubah rasio|change dose|change ratio/i);
});

test('AI Brew defaults target profile from process, variety, and altitude without overriding explicit target', () => {
  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Brazil Natural',
    process: 'natural',
    roastLevel: 'medium',
  }, catalog), 'soft_round');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Gayo wet hulled',
    process: 'wet_hulled',
    roastLevel: 'medium_dark',
  }, catalog), 'dense_comforting');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Ethiopia washed high altitude',
    process: 'washed',
    altitudeMasl: '1900',
    roastLevel: 'medium_light',
  }, catalog), 'floral_transparent');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Costa Rica Tarrazu washed',
    process: 'washed',
    roastLevel: 'medium_light',
  }, catalog), 'floral_transparent');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Bolivia natural anaerobic',
    process: 'natural_anaerobic',
    roastLevel: 'medium',
  }, catalog), 'fruit_forward');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Vietnam robusta lowland',
    variety: 'robusta',
    roastLevel: 'medium_dark',
  }, catalog), 'dense_comforting');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Panama Boquete Gesha Washed Floral',
    process: 'washed',
    variety: 'custom',
    customVariety: 'Gesha',
    altitudeMasl: '1850',
    roastLevel: 'light',
  }, catalog), 'floral_transparent');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Neutral House Filter',
    process: 'washed',
    roastLevel: 'medium',
  }, catalog), 'balance_clean');

  const manualSweetness = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Manual target remains sweetness',
    process: 'washed',
    altitudeMasl: '1900',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  assert.equal(manualSweetness.targetProfileId, 'more_sweetness');
});

test('AI Brew publish taxonomy target recommendations stay valid and conservative', () => {
  const targetIds = new Set(catalog.targetProfiles.map((profile) => profile.id));
  const cases: Array<[Partial<AiBrewFormState>, Set<string>]> = [
    [{ coffeeName: 'Ethiopia natural high aroma', process: 'natural', roastLevel: 'light' }, new Set(['fruit_forward', 'more_sweetness'])],
    [{ coffeeName: 'Sumatra Mandheling giling basah', process: 'wet_hulled', roastLevel: 'medium' }, new Set(['dense_comforting', 'more_body'])],
    [{ coffeeName: 'Kenya double washed high altitude', process: 'washed', altitudeMasl: '1850', roastLevel: 'medium_light' }, new Set(['floral_transparent', 'more_acidity'])],
    [{ coffeeName: 'Uganda Robusta', customVariety: 'Canephora clone', roastLevel: 'medium_dark' }, new Set(['dense_comforting', 'more_body'])],
    [{ coffeeName: 'Panama Geisha washed floral', process: 'washed', customVariety: 'Gesha', roastLevel: 'light' }, new Set(['floral_transparent', 'balance_clean'])],
    [{ coffeeName: 'Unknown house filter', roastLevel: 'medium' }, new Set(['balance_clean'])],
  ];

  for (const [input, expectedIds] of cases) {
    const id = resolveDefaultTargetProfileIdForBean(input, catalog);
    assert.ok(id, `${input.coffeeName} should resolve a target id`);
    assert.ok(targetIds.has(String(id)), `${id} must exist in target profile catalog`);
    assert.ok(expectedIds.has(String(id)), `${input.coffeeName} resolved unexpected target ${id}`);
  }
});

test('AI Brew custom process parser maps modern process language without overriding explicit catalog choices', () => {
  const cases: Array<[string, string]> = [
    ['anaerobic natural Gesha', 'natural_anaerobic'],
    ['carbonic washed Kenya', 'carbonic_washed'],
    ['fruit co-ferment pink bourbon', 'coferment'],
    ['giling basah Sumatra', 'wet_hulled'],
    ['sugarcane decaf Colombia', 'sugarcane_decaf'],
    ['double washed Kenya', 'kenya_double_fermentation'],
  ];

  for (const [text, expectedId] of cases) {
    const detected = detectCustomProcess({ customProcess: text });
    assert.equal(detected?.id, expectedId, `${text} should map to ${expectedId}`);
    assert.ok(detected?.note);
  }

  const explicitWashed = resolveDefaultTargetProfileIdForBean({
    coffeeName: 'House Filter',
    process: 'washed',
    customProcess: 'anaerobic natural',
    roastLevel: 'medium',
  }, catalog);
  assert.equal(explicitWashed, 'balance_clean');
});

test('AI Brew process and variety modifier coverage never falls through silently', () => {
  const processes = readJsonItems<ProcessCatalogEntry>('apps/web/public/data/ai-brew/processes.v2026-06.json');
  const varieties = readJsonItems<VarietyCatalogEntry>('apps/web/public/data/ai-brew/varieties.v2026-06.json');
  const allowedProcessCoverage = new Set(['exact_entry', 'curated', 'group_fallback', 'neutral']);
  const allowedVarietyCoverage = new Set(['exact_entry', 'curated', 'lineage_group', 'group_fallback', 'neutral']);

  for (const process of processes) {
    assert.ok(allowedProcessCoverage.has(resolveProcessModifierCoverage(process)), `${process.id} process should resolve modifier coverage`);
  }
  for (const variety of varieties) {
    assert.ok(allowedVarietyCoverage.has(resolveVarietyModifierCoverage(variety)), `${variety.id} variety should resolve modifier coverage`);
  }
});

test('AI Brew custom co-ferment plan stays high-risk and conservative', () => {
  const coferment = readJsonItems<ProcessCatalogEntry>('apps/web/public/data/ai-brew/processes.v2026-06.json')
    .find((entry) => entry.id === 'coferment');
  assert.ok(coferment);
  const cofermentProcess = coferment as ProcessCatalogEntry;
  const baseCatalog = buildAllMethodFamilyCatalog();
  const fullCatalog = {
    ...baseCatalog,
    processes: [
      ...baseCatalog.processes.filter((entry) => entry.id !== 'coferment'),
      cofermentProcess,
    ],
  };
  const input = createDefaultAiBrewFormState(fullCatalog);
  const plan = buildAiBrewPlan({
    ...input,
    coffeeName: 'Colombia fruit co-ferment lot',
    process: 'custom',
    customProcess: 'fruit co-ferment',
    roastLevel: 'medium_light',
    waterMode: 'manual',
    waterTdsPpm: '90',
    waterHardnessPpm: '50',
    waterAlkalinityPpm: '35',
    targetProfileId: resolveDefaultTargetProfileIdForBean({
      ...input,
      coffeeName: 'Colombia fruit co-ferment lot',
      process: 'custom',
      customProcess: 'fruit co-ferment',
      roastLevel: 'medium_light',
    }, fullCatalog) || 'balance_clean',
  }, fullCatalog);

  assert.equal(plan.processRisk?.variability, 'high');
  assert.equal(plan.processRisk?.recommendationMode, 'taste_feedback_required');
  assert.ok(['fruit_forward', 'more_sweetness'].includes(plan.targetProfileId));
  assert.ok(plan.waterTempC <= 96.5, 'high-risk experimental process should not push excessive default temperature');
  assert.match([...plan.notes, ...plan.confidenceNotes].join(' '), /High variability|taste feedback|Custom process detection/i);
});

test('AI Brew shared core calibrates 10-20 g target profile, dose, process, and custom variety signals', () => {
  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Panama Gesha washed',
    process: 'washed',
    variety: 'custom',
    customVariety: 'Panama Gesha landrace',
    altitudeMasl: '1850',
    roastLevel: 'light',
  }, catalog), 'floral_transparent');

  assert.equal(resolveDefaultTargetProfileIdForBean({
    coffeeName: 'Indonesia Catimor compact body',
    process: 'washed',
    variety: 'custom',
    customVariety: 'Catimor Timtim S795',
    roastLevel: 'medium',
  }, catalog), 'dense_comforting');

  const scenarios = [
    {
      coffeeName: 'Compact Gesha clarity',
      doseG: '10',
      process: 'washed',
      customVariety: 'Panama Gesha',
      targetProfileId: 'more_acidity',
    },
    {
      coffeeName: 'Mid Bourbon sweetness',
      doseG: '15',
      process: 'natural',
      customVariety: 'Pink Bourbon Caturra',
      targetProfileId: 'more_sweetness',
    },
    {
      coffeeName: 'Large Catimor body control',
      doseG: '20',
      process: 'wet_hulled',
      customVariety: 'Catimor Timtim S795',
      targetProfileId: 'more_acidity',
    },
  ] as const;

  for (const scenario of scenarios) {
    const base = {
      ...createDefaultAiBrewFormState(catalog),
      brewMode: 'hot' as const,
      coffeeName: scenario.coffeeName,
      doseG: scenario.doseG,
      process: scenario.process,
      variety: 'custom',
      customVariety: scenario.customVariety,
      roastLevel: 'medium_light' as const,
      dripperId: 'hario-v60',
      grinderId: '1zpresso-k-ultra',
      targetProfileId: scenario.targetProfileId,
      waterMode: 'manual' as const,
      waterTdsPpm: '95',
      waterHardnessPpm: '55',
      waterAlkalinityPpm: '40',
    };
    const quickPlan = buildAiBrewPlan(createQuickAiBrewFormState(base, catalog), catalog);
    const proPlan = buildAiBrewPlan(base, catalog);
    const diagnostics = [...quickPlan.notes, ...quickPlan.confidenceNotes].join(' ');

    assertPlanEnvelope(quickPlan);
    assert.equal(quickPlan.variety, scenario.customVariety);
    assert.equal(quickPlan.recommendedRatio, proPlan.recommendedRatio);
    assert.equal(quickPlan.waterTempC, proPlan.waterTempC);
    assert.equal(quickPlan.totalTimeSeconds, proPlan.totalTimeSeconds);
    assert.match(diagnostics, /Dose-target-variety calibration active/i);
    assert.ok(quickPlan.doseG >= 10 && quickPlan.doseG <= 20);
  }
});

test('AI Brew precision controls honor barista-friendly dose and ratio while keeping filter prep in the guide', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Precision ratio QA',
    doseG: '12',
    targetRatio: '14.5',
    dripperId: 'hario-v60',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.equal(plan.doseG, 12);
  assert.ok(plan.recommendedRatio >= 14.4 && plan.recommendedRatio <= 14.6);
  assert.ok(plan.totalWaterMl >= 170 && plan.totalWaterMl <= 175);
  assert.match(collectPlanNarrative(plan), /Rinse the paper filter.*preheat the brewer\/server.*tare the scale.*Bloom with about .*x coffee weight/i);
});

test('AI Brew anti-hallucination guard sanitizes unsafe narrative claims', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    coffeeName: 'Bolinda, Caranavi, La Paz',
    doseG: '15',
    process: '',
    variety: '',
    roastLevel: 'medium',
    dripperId: 'latina-cono',
    grinderId: 'feima-600n',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '9',
    waterHardnessPpm: '6.6',
    waterAlkalinityPpm: '5.5',
  }, catalog);

  const unsafe = [
    `Kopi Geisha washed dari farm altitude 2200m.`,
    `Air ideal ready brew dengan hasil cangkir final ${plan.totalWaterMl} ml.`,
    'Official grind reference dan Profil exact.',
  ].join('\n');
  const sanitized = sanitizeBrewNarrative(unsafe, plan);
  assert.doesNotMatch(sanitized, /geisha|gesha/i);
  assert.doesNotMatch(sanitized, /\bwashed\b/i);
  assert.doesNotMatch(sanitized, /official grind reference/i);
  assert.doesNotMatch(sanitized, /Profil exact/i);
  assert.match(sanitized, new RegExp(`${plan.estimatedCupOutputMl}|retensi kopi`));

  const validation = validateBrewPlanOutput(plan);
  assert.equal(validation.allowed, true);
});

test('AI Brew coach guard preserves deterministic grind, water, brewer, and recipe numbers', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    coffeeName: 'Bolinda, Caranavi, La Paz',
    doseG: '15',
    process: '',
    variety: '',
    roastLevel: 'medium',
    dripperId: 'latina-cono',
    grinderId: 'feima-600n',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual',
    waterTdsPpm: '9',
    waterHardnessPpm: '6.6',
    waterAlkalinityPpm: '5.5',
  }, catalog);

  const explain = sanitizeAiCoachMarkdown({
    action: 'explain',
    plan,
    markdown: '### Kenapa cocok\nSuhu 99C, total water 300 ml, grind setting 9 untuk Geisha. Air ideal. Profil exact.',
  });
  assert.equal(explain.risk, 'high');
  assert.match(explain.markdown, new RegExp(`${plan.waterTempC}`));
  assert.match(explain.markdown, new RegExp(`${plan.totalWaterMl}`));
  assert.match(explain.markdown, /setting 4-5/i);
  assert.doesNotMatch(explain.markdown, /geisha|gesha/i);
  assert.doesNotMatch(explain.markdown, /Air ideal|Profil exact/i);
  assert.match(explain.markdown, /Kalibrasi dengan drawdown dan rasa/i);

  const troubleshoot = sanitizeAiCoachMarkdown({
    action: 'troubleshoot',
    plan,
    markdown: 'Jika asam: ganti ke setting 9 dan ubah suhu 99C. Ubah rasio ke 1:17 dan naikkan dosis. Jika pahit: tambah bypass 50 ml.',
  });
  assert.match(troubleshoot.markdown, /Mulai dari perubahan terkecil dulu/i);
  assert.match(troubleshoot.markdown, /setting 4-5/i);
  assert.match(troubleshoot.markdown, /Jangan ubah rasio\/dosis|grind kecil.*pouring\/agitation.*suhu kecil/is);
  assert.equal(troubleshoot.risk, 'high');

  const fallback = troubleshoot.risk === 'high'
    ? buildDeterministicAiCoachMarkdown(plan, 'troubleshoot', 'id')
    : troubleshoot.markdown;
  assert.doesNotMatch(fallback, /bypass 50/i);
});

function readJsonItems<T>(filePath: string): T[] {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { items?: T[] };
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function catalogSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function buildProductionAiBrewCatalogForTests(): AiBrewCatalog {
  const catalogVersion = 'production-fixture';
  const provenance = (entry: {
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
  }) => ({
    source: entry.source || 'test-normalized',
    sourceUrls: [
      ...(entry.sourceUrls || []),
      ...(entry.sourceUrl ? [entry.sourceUrl] : []),
    ].filter((url): url is string => Boolean(url)),
    verificationLevel: entry.verificationLevel || 'curated',
    verifiedAt: entry.verifiedAt || '2026-06-01',
    popularityTier: entry.popularityTier || 'specialty_common',
    marketSegment: entry.marketSegment || 'specialty_mainstream',
    releaseStatus: entry.releaseStatus || 'established',
    confidence: entry.confidence || 'medium',
    catalogVersion: entry.catalogVersion || catalogVersion,
  });

  const drippers = readJsonItems<RawDripperCatalogEntry>('apps/web/public/data/ai-brew/drippers.v2026-03.json')
    .map((entry): EquipmentCatalogEntry => ({
      id: typeof entry.id === 'string' && entry.id.trim() && !/^\d+$/.test(entry.id.trim())
        ? catalogSlug(entry.id)
        : catalogSlug(entry.name),
      kind: 'dripper',
      name: entry.name,
      brand: entry.brand,
      typeLabel: entry.type,
      description: entry.description || undefined,
      searchText: `${entry.name} ${entry.brand || ''} ${entry.type} ${entry.description || ''}`.toLowerCase(),
      methodFamily: inferDripperMethodFamily(entry.name, entry.type),
      defaultProfileId: entry.id === 'hario-switch-02'
        ? 'profile_hario_switch_02_hot'
        : entry.id === 'hario-switch-03'
          ? 'profile_hario_switch_03_hot'
          : entry.id === 'mugen-x-switch'
            ? 'profile_mugen_x_switch_hot'
            : undefined,
      hidden: entry.hidden,
      deprecated: entry.deprecated,
      migrationTargetIds: entry.migrationTargetIds,
      physicalConstraints: entry.physicalConstraints,
      methodProgramme: entry.methodProgramme,
      ...provenance(entry),
    }));

  const grinders = readJsonItems<RawGrinderCatalogEntry>('apps/web/public/data/ai-brew/grinders.v2026-03.json')
    .map((entry): EquipmentCatalogEntry => ({
      id: catalogSlug(entry.name),
      kind: 'grinder',
      name: entry.name,
      brand: entry.brand,
      typeLabel: entry.type,
      searchText: `${entry.name} ${entry.brand || ''} ${entry.type} ${entry.medium}`.toLowerCase(),
      grindBands: {
        coarse: entry.coarse,
        medium: entry.medium,
        fine: entry.fine,
        parsedMedium: parseNumericRange(entry.medium),
      },
      ...provenance(entry),
    }));

  const waterGuidanceFile = readJsonFile<{
    item: WaterGuidance;
  }>('apps/web/public/data/ai-brew/water-guidance.v2026-06.json');
  const switchProgrammesFile = readJsonFile<{
    publicPresets: NonNullable<AiBrewCatalog['switchPresets']>;
    internalProgrammes: NonNullable<AiBrewCatalog['switchProgrammes']>;
  }>('apps/web/public/data/ai-brew/switch-programmes.v2026-05.json');
  const switchDoseMatrixFile = readJsonFile<{
    rows: NonNullable<AiBrewCatalog['switchDoseMatrix']>;
  }>('apps/web/public/data/ai-brew/switch-dose-matrix.v2026-05.json');
  const switchTroubleshootingFile = readJsonFile<{
    items: NonNullable<AiBrewCatalog['switchTroubleshooting']>;
  }>('apps/web/public/data/ai-brew/switch-troubleshooting.v2026-05.json');
  const switchKnowledgeFile = readJsonFile<{
    item: NonNullable<AiBrewCatalog['switchKnowledge']>;
  }>('apps/web/public/data/ai-brew/switch-knowledge.v2026-05.json');

  return {
    catalogVersion,
    drippers,
    grinders,
    processes: readJsonItems<AiBrewCatalog['processes'][number]>('apps/web/public/data/ai-brew/processes.v2026-06.json'),
    varieties: readJsonItems<AiBrewCatalog['varieties'][number]>('apps/web/public/data/ai-brew/varieties.v2026-06.json'),
    waterBrands: [],
    waterGuidance: waterGuidanceFile.item,
    targetProfiles: readJsonItems<TargetProfile>('apps/web/public/data/ai-brew/target-profiles.v2026-03.json'),
    deviceProfiles: readJsonItems<DeviceBrewProfile>('apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json'),
    grinderSettings: readJsonItems<GrinderSettingReference>('apps/web/public/data/ai-brew/grinder-settings.v2026-06.json')
      .map((entry) => ({
        ...entry,
        parsedRange: entry.parsedRange || parseNumericRange(entry.rangeLabel),
      })),
    switchPresets: switchProgrammesFile.publicPresets,
    switchProgrammes: switchProgrammesFile.internalProgrammes,
    switchDoseMatrix: switchDoseMatrixFile.rows,
    switchTroubleshooting: switchTroubleshootingFile.items,
    switchKnowledge: switchKnowledgeFile.item,
  };
}

function explicitNonNumericRange(label: string) {
  return /reference official grinder chart|official stepped settings|manual setting required/i.test(label);
}

test('AI Brew process, variety, and origin knowledge catalog stays expanded and provenance-safe', () => {
  type KnowledgeEntry = {
    id: string;
    label?: string;
    origins?: string[];
    sourceUrls?: string[];
    verificationLevel?: string;
    confidence?: string;
  };
  const processes = readJsonItems<KnowledgeEntry>('apps/web/public/data/ai-brew/processes.v2026-06.json');
  const varieties = readJsonItems<KnowledgeEntry>('apps/web/public/data/ai-brew/varieties.v2026-06.json');
  const calibration = JSON.parse(fs.readFileSync('apps/web/src/features/ai-brew/data/planner-calibration.v2026-05.json', 'utf8')) as {
    processModifiers: Record<string, unknown>;
    varietyModifiers: Record<string, unknown>;
    originProfiles: Array<{
      profileId: string;
      keywords: string[];
      sourceUrls?: string[];
      verificationLevel?: string;
      confidence?: string;
    }>;
  };
  const processIds = new Set(processes.map((entry) => entry.id));
  const varietyIds = new Set(varieties.map((entry) => entry.id));
  const addedProcessIds = ['double_washed', 'carbonic_natural', 'carbonic_washed', 'cold_fermentation', 'shade_dried_natural', 'sugarcane_decaf'];
  const latestProcessIds = [
    'washed_anaerobic',
    'semi_anaerobic',
    'double_anaerobic',
    'mosto_fermentation',
    'slow_dry_natural',
    'natural_anaerobic',
    'double_soak_washed',
    'kenya_double_fermentation',
    'mechanically_demucilaged',
    'eco_pulped',
    'koji_fermentation',
    'coferment',
    'thermal_shock_washed',
    'thermal_shock_natural',
  ];
  const addedVarietyIds = ['gesha_1931', 'maracaturra', 'jember', 'bp_534', 'brs_2314', 'tr4', 'starmaya'];
  const latestVarietyIds = [
    'sl14',
    'mibirizi',
    'nyasaland',
    'catimor_129',
    'bourbon_mayaguez_71',
    'ethiopian_landrace',
    'rume_sudan',
    'tekisic',
    'centroamericano',
    'n39',
    'colombia_variety',
    'kartika',
    'sigarar_utang',
    'gayo_2',
    'linie_s',
    'sln_9',
    'timor_hybrid',
    'catuai_99',
    'catuai_144',
    'caturra_chiroso',
    'bourbon_pointu',
    'orange_bourbon',
    'andina',
  ];

  assert.ok(processes.length >= 62);
  assert.ok(varieties.length >= 136);
  assert.ok(calibration.originProfiles.length >= 14);
  for (const id of addedProcessIds) {
    assert.ok(processIds.has(id), `${id} process should exist`);
    assert.ok(calibration.processModifiers[id], `${id} process should have deterministic calibration`);
  }
  for (const id of latestProcessIds) {
    assert.ok(processIds.has(id), `${id} latest process should exist`);
    assert.ok(calibration.processModifiers[id], `${id} latest process should have deterministic calibration`);
  }
  for (const id of addedVarietyIds) {
    assert.ok(varietyIds.has(id), `${id} variety should exist`);
    assert.ok(calibration.varietyModifiers[id] || ['starmaya'].includes(id), `${id} variety should have deterministic calibration or neutral explicit coverage`);
  }
  for (const id of latestVarietyIds) {
    assert.ok(varietyIds.has(id), `${id} latest variety should exist`);
    assert.ok(calibration.varietyModifiers[id], `${id} latest variety should have deterministic calibration`);
  }

  for (const entry of [
    ...processes.filter((item) => addedProcessIds.includes(item.id)),
    ...processes.filter((item) => latestProcessIds.includes(item.id)),
    ...varieties.filter((item) => addedVarietyIds.includes(item.id)),
    ...varieties.filter((item) => latestVarietyIds.includes(item.id)),
  ]) {
    assert.ok(entry.sourceUrls?.length, `${entry.id} must keep sourceUrls`);
    if (entry.verificationLevel !== 'official') {
      assert.ok(['curated', 'community_verified', 'dataset_unverified'].includes(String(entry.verificationLevel)), `${entry.id} must expose a non-official verification level`);
    }
    assert.ok(['low', 'medium', 'high'].includes(String(entry.confidence)), `${entry.id} must expose confidence`);
  }

  for (const originProfile of calibration.originProfiles) {
    assert.ok(originProfile.sourceUrls?.length, `${originProfile.profileId} origin profile must keep public sourceUrls`);
    assert.equal(originProfile.verificationLevel, 'curated', `${originProfile.profileId} origin profile should stay curated`);
    assert.ok(['low', 'medium', 'high'].includes(String(originProfile.confidence)), `${originProfile.profileId} origin profile must expose confidence`);
  }

  const eastAfrica = calibration.originProfiles.find((profile) => profile.profileId === 'east_africa_floral');
  const centralAmerica = calibration.originProfiles.find((profile) => profile.profileId === 'central_america_cocoa');
  const mexico = calibration.originProfiles.find((profile) => profile.profileId === 'mexico_mesoamerica');
  const andes = calibration.originProfiles.find((profile) => profile.profileId === 'andes_balanced');
  const caribbean = calibration.originProfiles.find((profile) => profile.profileId === 'caribbean_milds');
  const latinAmerica = calibration.originProfiles.find((profile) => profile.profileId === 'latin_america_balanced');
  const indonesia = calibration.originProfiles.find((profile) => profile.profileId === 'indonesia_structured');
  const middleEast = calibration.originProfiles.find((profile) => profile.profileId === 'middle_east_dried_fruit');
  const pacific = calibration.originProfiles.find((profile) => profile.profileId === 'pacific_islands_complex');
  const southAsia = calibration.originProfiles.find((profile) => profile.profileId === 'south_asia_monsoon_spice');
  const chinaYunnan = calibration.originProfiles.find((profile) => profile.profileId === 'china_yunnan_fruit');
  const robusta = calibration.originProfiles.find((profile) => profile.profileId === 'robusta_lowland_body');
  const asia = calibration.originProfiles.find((profile) => profile.profileId === 'asia_highland');
  const keywordSet = (profile?: { keywords: string[] }) => new Set((profile?.keywords || []).map((keyword) => keyword.toLowerCase()));
  const eastAfricaKeywords = keywordSet(eastAfrica);
  const centralAmericaKeywords = keywordSet(centralAmerica);
  const mexicoKeywords = keywordSet(mexico);
  const andesKeywords = keywordSet(andes);
  const caribbeanKeywords = keywordSet(caribbean);
  const latinAmericaKeywords = keywordSet(latinAmerica);
  const indonesiaKeywords = keywordSet(indonesia);
  const middleEastKeywords = keywordSet(middleEast);
  const pacificKeywords = keywordSet(pacific);
  const southAsiaKeywords = keywordSet(southAsia);
  const chinaYunnanKeywords = keywordSet(chinaYunnan);
  const robustaKeywords = keywordSet(robusta);
  const asiaKeywords = keywordSet(asia);
  assert.ok(eastAfricaKeywords.has('tanzania'));
  assert.ok(eastAfricaKeywords.has('malawi'));
  assert.ok(centralAmericaKeywords.has('tarrazu'));
  assert.ok(centralAmericaKeywords.has('antigua'));
  assert.ok(mexicoKeywords.has('chiapas'));
  assert.ok(andesKeywords.has('huila'));
  assert.ok(andesKeywords.has('nariño'));
  assert.ok(andesKeywords.has('caranavi'));
  assert.ok(caribbeanKeywords.has('jamaica'));
  assert.ok(latinAmericaKeywords.has('bolivia'));
  assert.ok(indonesiaKeywords.has('kerinci'));
  assert.ok(indonesiaKeywords.has('garut'));
  assert.ok(middleEastKeywords.has('yemen'));
  assert.ok(pacificKeywords.has('papua new guinea'));
  assert.ok(southAsiaKeywords.has('monsooned malabar'));
  assert.ok(chinaYunnanKeywords.has('yunnan'));
  assert.ok(robustaKeywords.has('robusta'));
  assert.ok(asiaKeywords.has('india'));
  assert.ok(asiaKeywords.has('papua new guinea'));
});

test('AI Brew regression matrix covers popular Indonesian process and variety combinations', () => {
  const productionProcesses = readJsonItems<AiBrewCatalog['processes'][number]>('apps/web/public/data/ai-brew/processes.v2026-06.json');
  const productionVarieties = readJsonItems<AiBrewCatalog['varieties'][number]>('apps/web/public/data/ai-brew/varieties.v2026-06.json');
  const processIds = ['wet_hulled', 'washed', 'natural', 'honey', 'semi_washed', 'wine_process'];
  const varietyIds = ['andungsari', 's795', 'ateng_super', 'timtim', 'typica', 'catimor', 'sigarar_utang'];
  const calibration = JSON.parse(fs.readFileSync('apps/web/src/features/ai-brew/data/planner-calibration.v2026-05.json', 'utf8')) as {
    processModifiers: Record<string, unknown>;
    varietyModifiers: Record<string, unknown>;
  };
  const allFamilyCatalog = buildAllMethodFamilyCatalog();
  const matrixCatalog: AiBrewCatalog = {
    ...allFamilyCatalog,
    processes: [
      ...allFamilyCatalog.processes.filter((entry) => !processIds.includes(entry.id)),
      ...productionProcesses.filter((entry) => processIds.includes(entry.id)),
    ],
    varieties: [
      ...allFamilyCatalog.varieties.filter((entry) => !varietyIds.includes(entry.id)),
      ...productionVarieties.filter((entry) => varietyIds.includes(entry.id)),
    ],
  };

  for (const id of processIds) {
    assert.ok(matrixCatalog.processes.some((entry) => entry.id === id), `${id} process should be selectable`);
    assert.ok(calibration.processModifiers[id], `${id} process should have deterministic calibration`);
  }
  for (const id of varietyIds) {
    assert.ok(matrixCatalog.varieties.some((entry) => entry.id === id), `${id} variety should be selectable`);
    assert.ok(calibration.varietyModifiers[id], `${id} variety should have deterministic calibration`);
  }

  const baseInput = {
    ...createDefaultAiBrewFormState(matrixCatalog),
    doseG: '18',
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '96',
    waterHardnessPpm: '58',
    waterAlkalinityPpm: '42',
  };
  const scenarios = [
    ['Gayo wet hulled S795', 'wet_hulled', 's795', 'more_body', 'medium'],
    ['Java washed Andungsari', 'washed', 'andungsari', 'balance_clean', 'medium_light'],
    ['Bali natural Typica', 'natural', 'typica', 'more_sweetness', 'light'],
    ['Flores honey Catimor', 'honey', 'catimor', 'balance_clean', 'medium_light'],
    ['Sumatra wine Ateng Super', 'wine_process', 'ateng_super', 'more_sweetness', 'medium'],
    ['Toraja semi washed Timtim', 'semi_washed', 'timtim', 'more_body', 'medium'],
    ['Kintamani natural Sigarar Utang', 'natural', 'sigarar_utang', 'more_sweetness', 'medium_light'],
  ] as const;

  for (const [coffeeName, process, variety, targetProfileId, roastLevel] of scenarios) {
    const quickInput = createQuickAiBrewFormState({
      ...baseInput,
      coffeeName,
      process,
      variety,
      targetProfileId,
      roastLevel,
    }, matrixCatalog);
    const plan = buildAiBrewPlan(quickInput, matrixCatalog);
    const diagnostics = [...plan.notes, ...plan.confidenceNotes].join(' ');
    assertPlanEnvelope(plan);
    assert.equal(plan.coffeeName, coffeeName);
    assert.notEqual(plan.process, 'Not specified');
    assert.notEqual(plan.variety, 'Not specified');
    assert.doesNotMatch(diagnostics, /No automatic process modifier|No automatic variety modifier/i, `${coffeeName} should not fall back to missing process/variety calibration`);
    assert.ok(plan.recommendedRatio >= 13 && plan.recommendedRatio <= 17.5, `${coffeeName} ratio should stay in filter service range`);
    assert.ok(plan.waterTempC >= 88 && plan.waterTempC <= 97, `${coffeeName} temperature should stay practical`);
  }
});

test('AI Brew grinder catalog publish rules keep sources, references, and ranges auditable', () => {
  type RawGrinder = {
    name?: string;
    source?: string;
    sourceUrl?: string;
    sourceUrls?: string[];
    verificationLevel?: string;
    confidence?: string;
    medium?: string;
  };
  type GrinderSetting = {
    grinderId?: string;
    profileIds?: string[];
    rangeLabel?: string;
  };
  type DeviceProfile = { id?: string };
  const grinders = readJsonItems<RawGrinder>('apps/web/public/data/ai-brew/grinders.v2026-03.json');
  const settings = readJsonItems<GrinderSetting>('apps/web/public/data/ai-brew/grinder-settings.v2026-06.json');
  const profiles = readJsonItems<DeviceProfile>('apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json');
  const grinderIds = new Set(grinders.map((item) => catalogSlug(String(item.name || ''))));
  const profileIds = new Set(profiles.map((item) => item.id).filter(Boolean));

  for (const grinder of grinders) {
    const urls = [...(grinder.sourceUrls || []), ...(grinder.sourceUrl ? [grinder.sourceUrl] : [])];
    if (grinder.verificationLevel === 'official' || grinder.source === 'official_2026') {
      assert.ok(urls.length > 0, `${grinder.name} official grinder needs sourceUrls`);
    }
    if (grinder.source === 'user_dataset' && urls.length === 0) {
      assert.equal(grinder.verificationLevel, 'dataset_unverified', `${grinder.name} user dataset must stay unverified`);
      assert.equal(grinder.confidence, 'low', `${grinder.name} user dataset must stay low confidence`);
    }
    if (grinder.medium) {
      assert.ok(parseNumericRange(grinder.medium) || explicitNonNumericRange(grinder.medium), `${grinder.name} has unparseable medium band`);
    }
  }

  for (const setting of settings) {
    assert.ok(grinderIds.has(String(setting.grinderId)), `${setting.grinderId} setting references missing grinder`);
    for (const profileId of setting.profileIds || []) {
      assert.ok(profileIds.has(profileId), `${setting.grinderId} references missing profile ${profileId}`);
    }
    if (setting.rangeLabel) {
      assert.ok(parseNumericRange(setting.rangeLabel) || explicitNonNumericRange(setting.rangeLabel), `${setting.grinderId} has unparseable rangeLabel`);
    }
  }

  const kUltra = grinders.find((item) => item.name === '1Zpresso K-Ultra');
  assert.equal(kUltra?.medium, '8.0 - 9.0 numbers');
  const breville = grinders.find((item) => item.name === 'Breville Smart Grinder Pro');
  assert.equal(breville?.medium, 'Setting 40 - 50');
});

test('AI Brew core brewer production profiles keep method-specific SOP cues', () => {
  type DeviceProfile = {
    id?: string;
    brewMode?: string;
    note?: string;
    steps?: Array<{ id?: string; label?: string; kind?: string; note?: string }>;
  };
  const profiles = readJsonItems<DeviceProfile>('apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json');
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const profileText = (profileId: string) => {
    const profile = byId.get(profileId);
    assert.ok(profile, `${profileId} must exist`);
    return [
      profile.note || '',
      ...(profile.steps || []).flatMap((step) => [step.label || '', step.kind || '', step.note || '']),
    ].join(' ');
  };

  const icedProfileExpectations: Array<[string, RegExp]> = [
    ['profile_april_brewer_iced', /measured ice in server|server 5-8 seconds/i],
    ['profile_chemex_iced', /thick paper|paper wall|no late bypass water|server 5-8 seconds/i],
    ['profile_kalita_wave_iced', /flat bed|edge to edge|server 5-8 seconds/i],
    ['profile_kono_meimon_iced', /center-focused|hot-water target over measured ice/i],
    ['profile_melitta_iced', /trapezoid|measured ice in server|server 5-8 seconds/i],
    ['profile_origami_iced', /cone filter|measured ice in server|server 5-8 seconds/i],
  ];

  for (const [profileId, expectedCue] of icedProfileExpectations) {
    const text = profileText(profileId);
    assert.match(text, expectedCue, `${profileId} needs a method-specific Japanese iced cue`);
    assert.doesNotMatch(text, /before adding ice|combining with measured ice/i, `${profileId} must not imply ice is added after brewing`);
  }

  const cleverHot = byId.get('profile_clever_dripper_hot');
  assert.ok(cleverHot);
  assert.equal(cleverHot.steps?.find((step) => step.id === 'charge')?.kind, 'pour');
  assert.equal(cleverHot.steps?.find((step) => step.id === 'steep')?.kind, 'wait');
  assert.equal(cleverHot.steps?.find((step) => step.id === 'release')?.kind, 'release');
  assert.equal(cleverHot.steps?.find((step) => step.id === 'serve')?.kind, 'serve');

  const cleverIced = byId.get('profile_clever_dripper_iced');
  assert.ok(cleverIced);
  assert.equal(cleverIced.steps?.find((step) => step.id === 'charge')?.kind, 'pour');
  assert.equal(cleverIced.steps?.find((step) => step.id === 'release')?.kind, 'release');
  assert.equal(cleverIced.steps?.find((step) => step.id === 'finish')?.kind, 'serve');
  assert.match(profileText('profile_clever_dripper_iced'), /valve closed|measured ice|server 5-8 seconds/i);
});

test('AI Brew production golden recipes keep non-V60 device workflows distinct', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const baseInput = {
    ...createDefaultAiBrewFormState(productionCatalog),
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    coffeeName: 'Production Golden QA',
    process: 'washed',
    variety: 'bourbon',
    roastLevel: 'medium' as const,
    targetProfileId: 'balance_clean',
    doseG: '18',
  };
  const planFor = (overrides: Partial<AiBrewFormState>) => buildAiBrewPlan({
    ...baseInput,
    ...overrides,
  }, productionCatalog);
  const textFor = (plan: ReturnType<typeof buildAiBrewPlan>) => [
    ...plan.notes,
    ...plan.steps.flatMap((step) => [step.label, step.kind || 'pour', step.note, step.hybridInstruction || '']),
  ].join(' ');
  const positivePourCount = (plan: ReturnType<typeof buildAiBrewPlan>) =>
    plan.steps.filter((step) => step.pourVolumeMl > 0).length;
  const assertBasicGoldenEnvelope = (
    plan: ReturnType<typeof buildAiBrewPlan>,
    expected: { ratio: [number, number]; temp: [number, number]; time: [number, number] },
  ) => {
    assert.ok(
      plan.recommendedRatio >= expected.ratio[0] && plan.recommendedRatio <= expected.ratio[1],
      `${plan.deviceProfileId} ratio ${plan.recommendedRatio} outside ${expected.ratio.join('-')}`,
    );
    assert.ok(
      plan.waterTempC >= expected.temp[0] && plan.waterTempC <= expected.temp[1],
      `${plan.deviceProfileId} temp ${plan.waterTempC} outside ${expected.temp.join('-')}`,
    );
    assert.ok(
      plan.totalTimeSeconds >= expected.time[0] && plan.totalTimeSeconds <= expected.time[1],
      `${plan.deviceProfileId} time ${plan.totalTimeSeconds} outside ${expected.time.join('-')}`,
    );
    assert.ok(Number.isFinite(plan.totalWaterMl) && plan.totalWaterMl > 0);
    assert.ok(Number.isFinite(plan.hotWaterMl) && plan.hotWaterMl > 0);
    assert.equal(plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0), plan.hotWaterMl);
    assert.doesNotMatch(plan.grindRecommendation, /No verified setting yet/i);
    const positiveSteps = plan.steps.filter((step) => step.pourVolumeMl > 0);
    assert.ok(positiveSteps.every((step) => step.pourPath && step.agitationLevel), `${plan.deviceProfileId} missing technique metadata`);
    if (['v60', 'chemex', 'kalita_wave', 'origami', 'april', 'melitta', 'kono'].includes(plan.methodFamily)) {
      assert.ok(positiveSteps.every((step) => step.flowRateMlPerSec && step.pourHeight), `${plan.deviceProfileId} missing pour-over flow metadata`);
    }
  };

  const v60 = planFor({ dripperId: 'hario-v60' });
  assert.equal(v60.deviceProfileId, 'profile_hario_v60_hot');
  assertBasicGoldenEnvelope(v60, { ratio: [15.5, 16.8], temp: [89, 93], time: [140, 180] });
  assert.equal(positivePourCount(v60), 4);

  const chemexHot = planFor({ dripperId: 'chemex' });
  assert.equal(chemexHot.deviceProfileId, 'profile_chemex_hot');
  assertBasicGoldenEnvelope(chemexHot, { ratio: [15.8, 17], temp: [90, 94], time: [235, 330] });
  assert.ok(chemexHot.totalTimeSeconds >= v60.totalTimeSeconds + 70, 'Chemex hot must not collapse into a V60-fast finish');
  assert.equal(chemexHot.grindBias, 'coarser');
  assert.match(textFor(chemexHot), /rinse|preheat|three-layer|vent|thick/i);
  assert.notDeepEqual(
    chemexHot.steps.map((step) => step.label),
    v60.steps.map((step) => step.label),
  );

  const chemexIced = planFor({ dripperId: 'chemex', brewMode: 'iced' });
  assert.equal(chemexIced.deviceProfileId, 'profile_chemex_iced');
  assertBasicGoldenEnvelope(chemexIced, { ratio: [13.8, 15.4], temp: [90, 95], time: [190, 280] });
  assert.ok(chemexIced.iceMl > 0);
  assert.equal(chemexIced.hotWaterMl + chemexIced.iceMl, chemexIced.totalWaterMl);
  assert.match(textFor(chemexIced), /hot concentrate|measured ice|no (extra|late).*bypass|do not add bypass water/i);

  const kalita155 = planFor({ dripperId: 'kalita-wave-155-185', doseG: '15' });
  const kalita185 = planFor({ dripperId: 'kalita-wave-155-185', doseG: '20' });
  assert.equal(kalita155.deviceProfileId, 'profile_kalita_wave_155_hot');
  assert.equal(kalita185.deviceProfileId, 'profile_kalita_wave_185_hot');
  assertBasicGoldenEnvelope(kalita155, { ratio: [15.4, 16.5], temp: [90, 94], time: [175, 245] });
  assertBasicGoldenEnvelope(kalita185, { ratio: [15.5, 16.8], temp: [90, 94], time: [190, 265] });
  assert.ok(kalita185.totalTimeSeconds > kalita155.totalTimeSeconds);
  assert.match(textFor(kalita155), /155|small wave|flat bed|center/i);
  assert.match(textFor(kalita185), /185|broader bed|centered flat-bed/i);
  assert.doesNotMatch(textFor(kalita155), /aggressive spiral/i);

  const origamiCone = planFor({ dripperId: 'origami-dripper-s-m', origamiFilterStyle: 'cone' });
  const origamiWave = planFor({ dripperId: 'origami-dripper-s-m', origamiFilterStyle: 'wave' });
  assert.equal(origamiCone.deviceProfileId, 'profile_origami_hot');
  assert.equal(origamiWave.deviceProfileId, 'profile_origami_wave_hot');
  assertBasicGoldenEnvelope(origamiCone, { ratio: [15.5, 16.5], temp: [88, 92], time: [120, 170] });
  assertBasicGoldenEnvelope(origamiWave, { ratio: [15.4, 16.4], temp: [90, 94], time: [175, 230] });
  assert.ok(origamiWave.totalTimeSeconds > origamiCone.totalTimeSeconds + 30);
  assert.match(textFor(origamiCone), /cone-filter|V60-like|cone flow/i);
  assert.match(textFor(origamiWave), /wave-filter|flat-bed|Kalita-like|center pour/i);

  const april = planFor({ dripperId: 'april-brewer' });
  const orea = planFor({ dripperId: 'orea-v3-v4' });
  const stagg = planFor({ dripperId: 'fellow-stagg-x' });
  const tricolate = planFor({ dripperId: 'tricolate-brewer' });
  const pulsar = planFor({ dripperId: 'nextlevel-pulsar' });
  assert.match(textFor(april), /low-agitation|short.*pulse|April/i);
  assert.match(textFor(orea), /fast-flow|fast flat-bottom|short service/i);
  assert.match(textFor(stagg), /restricted|Stagg|choked|flow/i);
  assert.match(textFor(tricolate), /no-bypass|longer contact|full saturation|tighter grind/i);
  assert.match(textFor(pulsar), /no-bypass|closed steep|controlled release/i);
  assert.ok(new Set([april.totalTimeSeconds, orea.totalTimeSeconds, stagg.totalTimeSeconds, tricolate.totalTimeSeconds, pulsar.totalTimeSeconds]).size >= 4);
  assert.ok(tricolate.totalTimeSeconds > orea.totalTimeSeconds);
  assert.equal(positivePourCount(pulsar), 1);
  assert.ok(pulsar.steps.some((step) => step.kind === 'wait' || step.kind === 'release'));

  const clever = planFor({ dripperId: 'clever-dripper' });
  const switchPlan = planFor({ dripperId: 'hario-switch-03' });
  assert.equal(clever.deviceProfileId, 'profile_clever_dripper_hot');
  assert.deepEqual(clever.steps.map((step) => step.kind), ['pour', 'wait', 'release', 'serve']);
  assert.equal(positivePourCount(clever), 1);
  assert.match(textFor(clever), /steep-and-release|full-water charge|not a V60 pulse/i);
  assert.equal(switchPlan.deviceProfileId, 'profile_hario_switch_03_hot');
  assert.deepEqual(switchPlan.steps.map((step) => step.kind), ['pour', 'pour', 'release', 'pour', 'drawdown', 'serve']);
  assert.ok(positivePourCount(switchPlan) <= 3);
  assert.match(textFor(switchPlan), /closed bloom|closed sweeten|open finish|open switch/i);

  const aeropressPlans = {
    standard: planFor({ dripperId: 'aeropress', aeropressStyle: 'standard' }),
    inverted: planFor({ dripperId: 'aeropress', aeropressStyle: 'inverted' }),
    bypass: planFor({ dripperId: 'aeropress', aeropressStyle: 'bypass' }),
    noBypass: planFor({ dripperId: 'aeropress', aeropressStyle: 'no_bypass' }),
    brightClean: planFor({ dripperId: 'aeropress', aeropressStyle: 'bright_clean' }),
    sweetBody: planFor({ dripperId: 'aeropress', aeropressStyle: 'sweet_body' }),
  };
  assert.equal(aeropressPlans.standard.deviceProfileId, 'profile_aeropress_hot');
  assert.equal(aeropressPlans.inverted.deviceProfileId, 'profile_aeropress_inverted_hot');
  assert.equal(aeropressPlans.bypass.deviceProfileId, 'profile_aeropress_bypass_hot');
  assert.equal(aeropressPlans.noBypass.deviceProfileId, 'profile_aeropress_no_bypass_hot');
  assert.equal(aeropressPlans.brightClean.deviceProfileId, 'profile_aeropress_bright_clean_hot');
  assert.equal(aeropressPlans.sweetBody.deviceProfileId, 'profile_aeropress_sweet_body_hot');
  for (const [style, plan] of Object.entries(aeropressPlans)) {
    assertBasicGoldenEnvelope(plan, { ratio: [12.5, 15.2], temp: [80, 90], time: [60, 150] });
    assert.ok(plan.steps.some((step) => step.kind === 'press'), `${style} AeroPress should include a press step`);
    assert.match(textFor(plan), /stir|press|hiss|steep/i);
    assert.equal(positivePourCount(plan), 1);
  }
  assert.ok(aeropressPlans.sweetBody.totalTimeSeconds > aeropressPlans.brightClean.totalTimeSeconds);
  assert.match(textFor(aeropressPlans.bypass), /dilute|bypass water after pressing only/i);

  const nonPourOverCases: Array<{
    plan: ReturnType<typeof buildAiBrewPlan>;
    expectedProfile: string;
    ratio: [number, number];
    temp: [number, number];
    time: [number, number];
    kindPattern: RegExp;
    cue: RegExp;
  }> = [
    { plan: planFor({ dripperId: 'french-press' }), expectedProfile: 'profile_french_press_hot', ratio: [12, 16], temp: [91, 96], time: [300, 390], kindPattern: /pour,wait,wait,serve/, cue: /immersion|steep|settle|decant/i },
    { plan: planFor({ dripperId: 'bialetti-moka-pot' }), expectedProfile: 'profile_bialetti_moka_pot_hot', ratio: [7, 12], temp: [88, 95], time: [120, 240], kindPattern: /pour,heat,serve/, cue: /basket|boiler water below|sputter/i },
    { plan: planFor({ dripperId: 'hario-siphon' }), expectedProfile: 'profile_hario_siphon_hot', ratio: [13, 16.5], temp: [90, 94], time: [180, 300], kindPattern: /pour,heat,wait,wait,drawdown,serve/, cue: /draw-up|add coffee|remove heat|drawdown/i },
    { plan: planFor({ dripperId: 'batch-brewer' }), expectedProfile: 'profile_batch_brewer_hot', ratio: [15, 18], temp: [90, 96], time: [240, 380], kindPattern: /pour,wait,drawdown,serve/, cue: /dose per liter|machine brew volume|spray-pattern/i },
    { plan: planFor({ dripperId: 'toddy-cold-brew' }), expectedProfile: 'profile_toddy_cold_brew_hot', ratio: [8, 18], temp: [4, 25], time: [21600, 64800], kindPattern: /pour,wait,serve/, cue: /cool water|long cold immersion|not a hot workflow/i },
    { plan: planFor({ dripperId: 'espresso-machine' }), expectedProfile: 'profile_espresso_machine_hot', ratio: [1, 3.5], temp: [90, 96], time: [20, 40], kindPattern: /extract,serve/, cue: /yield|shot|not.*pour pulse|rather than pour pulses/i },
  ];

  for (const entry of nonPourOverCases) {
    assert.equal(entry.plan.deviceProfileId, entry.expectedProfile);
    assertBasicGoldenEnvelope(entry.plan, { ratio: entry.ratio, temp: entry.temp, time: entry.time });
    assert.match(entry.plan.steps.map((step) => step.kind || 'pour').join(','), entry.kindPattern);
    assert.match(textFor(entry.plan), entry.cue);
    assert.doesNotMatch(textFor(entry.plan), /\b(Pulse 1|Pulse 2|Final Pour|Center Pour|Second Pour)\b/i);
    assert.equal(positivePourCount(entry.plan), 1);
  }
});

test('workflow-aware guide expands all-method operational phases and validates readiness', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const planFor = (overrides: Partial<AiBrewFormState>) => buildAiBrewPlan({
    ...createDefaultAiBrewFormState(productionCatalog),
    brewMode: 'hot',
    coffeeName: 'Workflow QA',
    doseG: overrides.dripperId === 'toddy-cold-brew' ? '60' : overrides.dripperId === 'batch-brewer' ? '55' : '18',
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    process: 'washed',
    variety: 'bourbon',
    ...overrides,
  }, productionCatalog);
  const cases: Array<{ label: string; plan: ReturnType<typeof buildAiBrewPlan>; pattern: RegExp }> = [
    { label: 'AeroPress', plan: planFor({ dripperId: 'aeropress', aeropressStyle: 'standard' }), pattern: /charge[\s\S]*stir[\s\S]*steep[\s\S]*press[\s\S]*hiss/i },
    { label: 'French Press', plan: planFor({ dripperId: 'french-press' }), pattern: /charge[\s\S]*steep[\s\S]*(settle|crust)[\s\S]*(press|decant)/i },
    { label: 'Clever', plan: planFor({ dripperId: 'clever-dripper' }), pattern: /charge[\s\S]*steep[\s\S]*release[\s\S]*drawdown/i },
    { label: 'Moka', plan: planFor({ dripperId: 'bialetti-moka-pot' }), pattern: /below valve[\s\S]*basket[\s\S]*heat[\s\S]*sputter/i },
    { label: 'Espresso', plan: planFor({ dripperId: 'espresso-machine' }), pattern: /dose[\s\S]*(puck|tamp)[\s\S]*(shot|yield)[\s\S]*flow[\s\S]*stop/i },
    { label: 'Siphon', plan: planFor({ dripperId: 'hario-siphon' }), pattern: /draw-up[\s\S]*stir[\s\S]*contact[\s\S]*drawdown/i },
    { label: 'Batch', plan: planFor({ dripperId: 'batch-brewer' }), pattern: /(dose\/l|dose per liter)[\s\S]*spray[\s\S]*drawdown[\s\S]*mix batch/i },
    { label: 'Cold Brew', plan: planFor({ dripperId: 'toddy-cold-brew' }), pattern: /saturate[\s\S]*steep[\s\S]*filter[\s\S]*(after filtration|dilute)/i },
  ];

  for (const entry of cases) {
    const guide = entry.plan.workflowGuideSteps || buildWorkflowAwareGuideSteps(entry.plan);
    const validation = entry.plan.workflowValidation || validateMethodWorkflowGuide(entry.plan, guide);
    const text = guide.map((step) => `${step.label} ${step.actionType} ${step.primaryText} ${step.secondaryText || ''} ${step.techniqueChips.map((chip) => `${chip.label} ${chip.value}`).join(' ')}`).join('\n');
    assert.equal(validation.passed, true, `${entry.label} workflow should pass: ${validation.blockingErrors.join('; ')}`);
    assert.match(text, entry.pattern, `${entry.label} guide should include required phases`);
    assert.doesNotMatch(text, /\b(Pulse 1|Pulse 2|Final Pour|Center Pour)\b/i, `${entry.label} should not use generic V60 labels`);
  }
});

test('workflow validator blocks too-simple or method-wrong guide output', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const aeropress = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(productionCatalog),
    dripperId: 'aeropress',
    aeropressStyle: 'standard',
    doseG: '18',
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, productionCatalog);
  const aeropressChargeOnly = (aeropress.workflowGuideSteps || buildWorkflowAwareGuideSteps(aeropress))
    .filter((step) => step.actionType === 'charge')
    .slice(0, 1);
  const aeropressValidation = validateMethodWorkflowGuide(aeropress, aeropressChargeOnly);
  assert.equal(aeropressValidation.passed, false);
  assert.match(aeropressValidation.blockingErrors.join(' '), /press|hiss|single operational/i);

  const moka = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(productionCatalog),
    dripperId: 'bialetti-moka-pot',
    doseG: '18',
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, productionCatalog);
  const mokaBadGuide = (moka.workflowGuideSteps || buildWorkflowAwareGuideSteps(moka)).map((step) => ({
    ...step,
    primaryText: `${step.primaryText} bloom final pour center-to-mid`,
  }));
  const mokaValidation = validateMethodWorkflowGuide(moka, mokaBadGuide);
  assert.equal(mokaValidation.passed, false);
  assert.match(mokaValidation.blockingErrors.join(' '), /Moka Pot workflow contains pour-over wording/i);
});

test('workflow-aware V60 iced guide keeps hot-water target explicit', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    dripperId: 'hario-v60',
    doseG: '15',
    targetProfileId: 'more_sweetness',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  const guide = plan.workflowGuideSteps || buildWorkflowAwareGuideSteps(plan);
  const validation = plan.workflowValidation || validateMethodWorkflowGuide(plan, guide);
  const text = guide.map((step) => `${step.label} ${step.primaryText} ${step.techniqueChips.map((chip) => chip.value).join(' ')}`).join('\n');
  const lastPour = plan.steps.filter((step) => step.pourVolumeMl > 0).at(-1);

  assert.equal(validation.passed, true, validation.blockingErrors.join('; '));
  assert.equal(plan.hotWaterMl + plan.iceMl, plan.totalWaterMl);
  assert.equal(lastPour?.targetVolumeMl, plan.hotWaterMl);
  assert.match(text, new RegExp(`Target ${plan.hotWaterMl} ml hot water`, 'i'));
  assert.match(text, /Flow|center_to_mid|low|minimal|agitation/i);
});

test('expected cup profile and readiness scores reflect target, bean, water, and grinder trust', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const base = {
    ...createDefaultAiBrewFormState(productionCatalog),
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };
  const washedFloral = buildAiBrewPlan({
    ...base,
    coffeeName: 'Ethiopia washed gesha floral',
    process: 'washed',
    variety: 'geisha',
    roastLevel: 'light',
    targetProfileId: 'floral_transparent',
  }, productionCatalog);
  const naturalSweet = buildAiBrewPlan({
    ...base,
    coffeeName: 'Ethiopia natural heirloom sweet',
    process: 'natural',
    variety: 'ethiopian_heirloom',
    roastLevel: 'medium_light',
    targetProfileId: 'more_sweetness',
  }, productionCatalog);
  const wetHulledDense = buildAiBrewPlan({
    ...base,
    coffeeName: 'Gayo wet hulled dense',
    process: 'wet_hulled',
    variety: 'ateng_super',
    roastLevel: 'medium',
    targetProfileId: 'dense_comforting',
  }, productionCatalog);

  assert.ok(washedFloral.expectedCupProfile);
  assert.ok(naturalSweet.expectedCupProfile);
  assert.ok(wetHulledDense.expectedCupProfile);
  assert.ok(washedFloral.expectedCupProfile.clarity >= 4);
  assert.ok(washedFloral.expectedCupProfile.acidity >= 4);
  assert.ok(naturalSweet.expectedCupProfile.sweetness >= 4);
  assert.ok(naturalSweet.expectedCupProfile.body >= 3);
  assert.ok(wetHulledDense.expectedCupProfile.body >= 4);
  assert.ok(wetHulledDense.expectedCupProfile.clarity <= washedFloral.expectedCupProfile.clarity);
  assert.ok(washedFloral.readinessScores?.workflow && washedFloral.readinessScores.workflow >= 90);

  const highBuffer = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'High buffer floral',
    process: 'washed',
    variety: 'gesha',
    waterMode: 'brand',
    waterBrandId: 'evian-sg',
    targetProfileId: 'floral_transparent',
  }, catalog);
  assert.match(highBuffer.expectedCupProfile?.warnings.join(' ') || '', /High-buffer water/i);
  assert.ok((highBuffer.readinessScores?.water || 0) < 85);

  const zeroMineral = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'RO needs minerals',
    process: 'washed',
    variety: 'bourbon',
    waterMode: 'brand',
    waterBrandId: 'amidis-id',
    waterCustomized: true,
    waterTdsPpm: '8',
    waterHardnessPpm: '2',
    waterAlkalinityPpm: '1',
    targetProfileId: 'balance_clean',
  }, catalog);
  assert.equal(zeroMineral.expectedCupProfile?.confidence, 'low');
  assert.ok((zeroMineral.readinessScores?.water || 100) < 60);
  assert.match(zeroMineral.expectedCupProfile?.warnings.join(' ') || '', /Zero-mineral|RO/i);
});

test('taste feedback correction is one-knob, method-correct, and keeps protected numbers locked', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const planFor = (dripperName: RegExp, overrides: Partial<AiBrewFormState> = {}) => {
    const dripper = productionCatalog.drippers.find((item) => dripperName.test(item.name));
    assert.ok(dripper, `Missing dripper ${dripperName}`);
    return buildAiBrewPlan({
      ...createDefaultAiBrewFormState(productionCatalog),
      coffeeName: 'Feedback QA',
      dripperId: dripper.id,
      doseG: dripper.id === 'toddy-cold-brew' ? '60' : '18',
      grinderId: '1zpresso-k-ultra',
      waterMode: 'manual' as const,
      waterTdsPpm: '95',
      waterHardnessPpm: '55',
      waterAlkalinityPpm: '40',
      process: 'washed',
      variety: 'bourbon',
      ...overrides,
    }, productionCatalog);
  };

  const cases = [
    { label: 'V60 sour', plan: planFor(/^Hario V60$/i), rating: 'sour' as const, expected: /finer|lebih halus/i, forbidden: /add water|tambah air|change ratio|ubah rasio/i },
    { label: 'AeroPress bitter', plan: planFor(/^AeroPress$/i), rating: 'bitter' as const, expected: /press|hiss|steep|tekan/i, forbidden: /final pour|drawdown bed/i },
    { label: 'French Press muddy', plan: planFor(/^French Press$/i), rating: 'muddy' as const, expected: /settle|decant|diamkan/i, forbidden: /pour lower|tuang rendah|final pour/i },
    { label: 'Moka bitter', plan: planFor(/^Bialetti Moka Pot$/i), rating: 'bitter' as const, expected: /heat|sputter|panas/i, forbidden: /bloom|final pour/i },
    { label: 'Espresso sour', plan: planFor(/^Espresso Machine$/i), rating: 'sour' as const, expected: /puck|tamp|flow|halus/i, forbidden: /add water|tambah air|bloom/i },
    { label: 'Cold Brew thin', plan: planFor(/^Toddy Cold Brew$/i), rating: 'thin' as const, expected: /saturation|steep|filtration|saturasi/i, forbidden: /kettle|temperature|bloom/i },
  ];

  for (const entry of cases) {
    const correction = buildTasteFeedbackCorrection(entry.plan, entry.rating, 'id');
    const text = `${correction.primaryCorrection} ${correction.backupCorrection} ${correction.guardrail}`;
    assert.equal(correction.protectedNumbersLocked, true, entry.label);
    assert.match(text, entry.expected, entry.label);
    assert.doesNotMatch(text, entry.forbidden, entry.label);
    assert.match(buildAiBrewTasteLoopMarkdown(entry.plan, { rating: entry.rating }, 'id'), /Dosis|rasio|total air|timing step/i);
  }
});

test('all-method public snapshot matrix includes workflow, expected cup, feedback, and guard validation', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const findDripperId = (pattern: RegExp) => {
    const dripper = productionCatalog.drippers.find((item) => pattern.test(item.name));
    assert.ok(dripper, `Missing dripper ${pattern}`);
    return dripper.id;
  };
  const base = {
    ...createDefaultAiBrewFormState(productionCatalog),
    coffeeName: 'All Method Snapshot QA',
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    process: 'washed',
    variety: 'bourbon',
    roastLevel: 'medium_light' as const,
  };
  const cases: Array<{
    label: string;
    input: Partial<AiBrewFormState>;
    required: RegExp;
    forbidden?: RegExp;
    minGuide: number;
  }> = [
    { label: 'Hario V60 hot', input: { dripperId: findDripperId(/^Hario V60$/i) }, required: /bloom[\s\S]*pour[\s\S]*drawdown/i, minGuide: 4 },
    { label: 'Hario V60 iced', input: { dripperId: findDripperId(/^Hario V60$/i), brewMode: 'iced', targetProfileId: 'more_sweetness' }, required: /hot water|air panas/i, minGuide: 4 },
    { label: 'Chemex hot', input: { dripperId: findDripperId(/^Chemex$/i) }, required: /thick|filter|vent|drawdown/i, minGuide: 4 },
    { label: 'Chemex iced', input: { dripperId: findDripperId(/^Chemex$/i), brewMode: 'iced' }, required: /hot water|ice|air panas/i, minGuide: 4 },
    { label: 'Kalita hot', input: { dripperId: findDripperId(/Kalita Wave/i) }, required: /flat|bed|drawdown/i, minGuide: 4 },
    { label: 'Kalita iced', input: { dripperId: findDripperId(/Kalita Wave/i), brewMode: 'iced' }, required: /hot water|air panas|flat/i, minGuide: 4 },
    { label: 'Origami cone hot', input: { dripperId: findDripperId(/Origami/i), origamiFilterStyle: 'cone' }, required: /bloom|drawdown|spiral|center/i, minGuide: 4 },
    { label: 'Origami wave hot', input: { dripperId: findDripperId(/Origami/i), origamiFilterStyle: 'wave' }, required: /flat|bed|drawdown/i, minGuide: 4 },
    { label: 'April hot', input: { dripperId: findDripperId(/^April Brewer$/i) }, required: /flat|bed|drawdown/i, minGuide: 4 },
    { label: 'Melitta hot', input: { dripperId: findDripperId(/^Melitta$/i) }, required: /trapezoid|drawdown|pour/i, minGuide: 4 },
    { label: 'Kono hot', input: { dripperId: findDripperId(/^Kono Meimon$/i) }, required: /center|drawdown|pour/i, minGuide: 4 },
    { label: 'Clever hot', input: { dripperId: findDripperId(/^Clever Dripper$/i) }, required: /charge[\s\S]*steep[\s\S]*release[\s\S]*drawdown/i, forbidden: /Final Pour/i, minGuide: 5 },
    { label: 'AeroPress hot', input: { dripperId: findDripperId(/^AeroPress$/i), aeropressStyle: 'standard' }, required: /charge[\s\S]*stir[\s\S]*steep[\s\S]*press[\s\S]*hiss/i, forbidden: /final pour|drawdown bed/i, minGuide: 6 },
    { label: 'French Press hot', input: { dripperId: findDripperId(/^French Press$/i) }, required: /charge[\s\S]*steep[\s\S]*settle[\s\S]*decant/i, forbidden: /final pour|bloom/i, minGuide: 5 },
    { label: 'Moka Pot hot', input: { dripperId: findDripperId(/^Bialetti Moka Pot$/i) }, required: /boiler[\s\S]*basket[\s\S]*heat[\s\S]*sputter/i, forbidden: /bloom|final pour/i, minGuide: 4 },
    { label: 'Siphon hot', input: { dripperId: findDripperId(/^Hario Siphon$/i) }, required: /draw-up[\s\S]*stir[\s\S]*contact[\s\S]*drawdown/i, forbidden: /final pour/i, minGuide: 5 },
    { label: 'Batch Brewer hot', input: { dripperId: findDripperId(/^Batch Brewer$/i), doseG: '55' }, required: /dose\/l|spray|drawdown|mix batch/i, forbidden: /manual pour|bloom pour/i, minGuide: 5 },
    { label: 'Espresso hot', input: { dripperId: findDripperId(/^Espresso Machine$/i) }, required: /dose[\s\S]*puck[\s\S]*(shot|yield)[\s\S]*flow[\s\S]*stop/i, forbidden: /bloom|kettle|final pour/i, minGuide: 5 },
    { label: 'Cold Brew', input: { dripperId: findDripperId(/^Toddy Cold Brew$/i), doseG: '60' }, required: /saturate[\s\S]*steep[\s\S]*filter[\s\S]*dilute/i, forbidden: /bloom|kettle/i, minGuide: 4 },
  ];

  for (const entry of cases) {
    const plan = buildAiBrewPlan({ ...base, ...entry.input }, productionCatalog);
    const guide = plan.workflowGuideSteps || buildWorkflowAwareGuideSteps(plan);
    const text = guide.map((step) => `${step.label} ${step.actionType} ${step.primaryText} ${step.secondaryText || ''} ${step.techniqueChips.map((chip) => `${chip.label} ${chip.value}`).join(' ')}`).join('\n');
    assert.equal(plan.workflowValidation?.passed, true, `${entry.label}: ${plan.workflowValidation?.blockingErrors.join('; ')}`);
    assert.ok((plan.workflowValidation?.readinessScore || 0) >= 90, `${entry.label} readiness should be >=90`);
    assert.ok(guide.length >= entry.minGuide, `${entry.label} guide should have enough phases`);
    assert.match(text, entry.required, `${entry.label} required workflow phases`);
    if (entry.forbidden) assert.doesNotMatch(text, entry.forbidden, `${entry.label} forbidden wording`);
    assert.ok(plan.expectedCupProfile, `${entry.label} expected cup profile`);
    assert.ok(plan.readinessScores, `${entry.label} readiness scores`);
    const guard = validateBrewPlanOutput(plan);
    assert.equal(guard.allowed, true, `${entry.label} anti-hallucination guard: ${guard.reason || 'no reason'}`);
    for (const rating of ['sour', 'bitter', 'thin'] as const) {
      const correction = buildTasteFeedbackCorrection(plan, rating, 'en');
      assert.equal(correction.protectedNumbersLocked, true, `${entry.label} ${rating} correction`);
      const correctionText = `${correction.primaryCorrection} ${correction.backupCorrection}`.toLowerCase();
      if (plan.methodFamily === 'espresso') assert.doesNotMatch(correctionText, /add water|bloom|kettle/);
      if (plan.methodFamily === 'moka_pot') assert.doesNotMatch(correctionText, /bloom|final pour/);
      if (plan.methodFamily === 'cold_brew') assert.doesNotMatch(correctionText, /kettle|raise temperature/);
    }
    if (plan.brewMode === 'iced') {
      const pourSteps = plan.steps.filter((step) => step.pourVolumeMl > 0 || step.kind === 'extract');
      assert.equal(plan.hotWaterMl + plan.iceMl, plan.totalWaterMl, `${entry.label} iced split`);
      assert.equal(pourSteps.at(-1)?.targetVolumeMl, plan.hotWaterMl, `${entry.label} final hot target`);
      assert.ok(text.match(/hot water|air panas/i), `${entry.label} explicit hot water target`);
    }
  }
});

test('real-world bean stress matrix always produces safe baseline or honest fallback', () => {
  const productionCatalog = buildProductionAiBrewCatalogForTests();
  const findDripperId = (pattern: RegExp) => {
    const dripper = productionCatalog.drippers.find((item) => pattern.test(item.name));
    assert.ok(dripper, `Missing dripper ${pattern}`);
    return dripper.id;
  };
  const brewerIds = [
    findDripperId(/^Hario V60$/i),
    'hario-switch-03',
    findDripperId(/^Clever Dripper$/i),
  ];
  const base = {
    ...createDefaultAiBrewFormState(productionCatalog),
    doseG: '15',
    grinderId: '1zpresso-k-ultra',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
  };
  const beans: Array<{
    label: string;
    input: Partial<AiBrewFormState>;
    expectedCategory: 'known_high' | 'partial_medium' | 'unknown_fallback' | 'risk_caution';
    requiredWarning?: RegExp;
  }> = [
    { label: 'Washed Ethiopia light floral', input: { coffeeName: 'Washed Ethiopia Yirgacheffe floral', process: 'washed', variety: 'ethiopian_heirloom', roastLevel: 'light', targetProfileId: 'floral_transparent' }, expectedCategory: 'known_high' },
    { label: 'Natural Ethiopia fruit-forward', input: { coffeeName: 'Natural Ethiopia Guji fruit', process: 'natural', variety: 'ethiopian_heirloom', roastLevel: 'medium_light', targetProfileId: 'fruit_forward' }, expectedCategory: 'known_high' },
    { label: 'Kenya washed bright', input: { coffeeName: 'Kenya AA Nyeri washed', process: 'washed', variety: 'sl28', roastLevel: 'light', altitudeMasl: '1850', targetProfileId: 'more_acidity' }, expectedCategory: 'known_high' },
    { label: 'Colombia washed balanced', input: { coffeeName: 'Colombia Huila washed', process: 'washed', variety: 'caturra', roastLevel: 'medium_light' }, expectedCategory: 'known_high' },
    { label: 'Brazil natural nutty medium', input: { coffeeName: 'Brazil Cerrado natural nutty', process: 'natural', variety: 'bourbon', roastLevel: 'medium', targetProfileId: 'more_sweetness' }, expectedCategory: 'known_high' },
    { label: 'Sumatra wet-hulled heavy body', input: { coffeeName: 'Sumatra Mandheling wet hulled', process: 'wet_hulled', variety: 'ateng_super', roastLevel: 'medium', targetProfileId: 'more_body' }, expectedCategory: 'risk_caution', requiredWarning: /feedback|variability|caution|body|baseline/i },
    { label: 'Anaerobic experimental', input: { coffeeName: 'Experimental anaerobic natural Gesha', process: 'natural_anaerobic', customProcess: 'experimental anaerobic natural', variety: 'gesha', roastLevel: 'medium_light', targetProfileId: 'fruit_forward' }, expectedCategory: 'risk_caution', requiredWarning: /feedback|variability|experimental|baseline/i },
    { label: 'Honey process sweet', input: { coffeeName: 'Costa Rica honey process', process: 'honey', variety: 'catuai', roastLevel: 'medium_light', targetProfileId: 'more_sweetness' }, expectedCategory: 'known_high' },
    { label: 'Decaf medium roast', input: { coffeeName: 'Colombia sugarcane decaf', process: 'sugarcane_decaf', variety: 'caturra', roastLevel: 'medium', targetProfileId: 'soft_round' }, expectedCategory: 'risk_caution', requiredWarning: /feedback|baseline|caution/i },
    { label: 'Robusta canephora blend', input: { coffeeName: 'Vietnam robusta canephora blend', process: 'washed', variety: 'robusta', customVariety: 'canephora robusta', roastLevel: 'medium_dark', targetProfileId: 'dense_comforting' }, expectedCategory: 'risk_caution', requiredWarning: /robusta|canephora|bitterness/i },
    { label: 'Very dark roast smoky', input: { coffeeName: 'Very dark smoky house blend', process: 'washed', roastLevel: 'dark', targetProfileId: 'soft_round' }, expectedCategory: 'risk_caution', requiredWarning: /Dark roast|bitterness|pahit/i },
    { label: 'Unknown bean no process roast', input: { coffeeName: '', process: '', variety: '', roastLevel: 'medium' }, expectedCategory: 'unknown_fallback', requiredWarning: /Data beans tidak lengkap|safe baseline|baseline aman/i },
    { label: 'Old roast 45 days', input: { coffeeName: 'Old roast 45 days Colombia washed', process: 'washed', variety: 'caturra', roastLevel: 'medium', solubility: 'high', targetProfileId: 'more_sweetness' }, expectedCategory: 'risk_caution' },
    { label: 'Fresh roast 2 days', input: { coffeeName: 'Fresh roast 2 days Kenya washed', process: 'washed', variety: 'sl28', roastLevel: 'light', roastDevelopment: 'underdeveloped', solubility: 'low', targetProfileId: 'more_acidity' }, expectedCategory: 'risk_caution' },
    { label: 'High-density high altitude', input: { coffeeName: 'High-density high altitude Ethiopia washed', process: 'washed', variety: 'ethiopian_heirloom', roastLevel: 'light', altitudeMasl: '2200', beanDensityGml: '0.76', solubility: 'low', targetProfileId: 'floral_transparent' }, expectedCategory: 'risk_caution' },
    { label: 'Low-density soluble bean', input: { coffeeName: 'Low-density soluble Brazil natural', process: 'natural', variety: 'bourbon', roastLevel: 'medium', beanDensityGml: '0.62', solubility: 'high', targetProfileId: 'more_sweetness' }, expectedCategory: 'risk_caution' },
  ];

  for (const bean of beans) {
    for (const dripperId of brewerIds) {
      const plan = buildAiBrewPlan({ ...base, ...bean.input, dripperId }, productionCatalog);
      assertPlanEnvelope(plan);
      const summary = summarizeAiBrewPlan(plan);
      assert.ok(plan.expectedCupProfile, `${bean.label} ${plan.dripper.name} expected cup`);
      assert.ok(plan.beanCoverage, `${bean.label} ${plan.dripper.name} bean coverage`);
      assert.equal(plan.beanCoverage?.category, bean.expectedCategory, `${bean.label} ${plan.dripper.name} coverage: ${JSON.stringify(summary)}`);
      assert.notEqual(plan.workflowValidation?.status, 'blocked', `${bean.label} ${plan.dripper.name} should produce usable baseline`);
      assert.equal(validateBrewPlanOutput(plan).allowed, true, `${bean.label} ${plan.dripper.name} anti-hallucination guard`);
      const correction = buildTasteFeedbackCorrection(plan, 'sour', 'en');
      assert.equal(correction.protectedNumbersLocked, true, `${bean.label} ${plan.dripper.name} taste correction locks protected numbers`);
      assert.match(
        `${correction.primaryCorrection} ${correction.backupCorrection} ${plan.beanCoverage?.nextAction}`,
        /grind|contact|pour|agitation|feedback|drawdown|timing|brew/i,
        `${bean.label} ${plan.dripper.name} has actionable taste loop`,
      );
      if (bean.requiredWarning) {
        assert.match(
          [...(plan.beanCoverage?.warnings || []), ...(plan.confidenceNotes || []), ...plan.warnings].join(' '),
          bean.requiredWarning,
          `${bean.label} warning`,
        );
      }
    }
  }
});

test('AI Brew water catalog blocks private sources, zero-mineral autofill, and estimated facts', () => {
  type RawWater = {
    id?: string;
    brand_group_id?: string;
    source_url?: string;
    is_brew_ready?: boolean;
    tds_ppm?: number | null;
    publish_state?: string;
    primary_source?: { source_url?: string };
    sources?: Array<{ source_url?: string }>;
    data_quality?: { is_estimated?: boolean };
    coffee_parameters?: {
      hardness_ppm_as_caco3?: number | null;
      alkalinity_ppm_as_caco3?: number | null;
      brew_recommendation?: string;
    };
  };
  const waters = readJsonItems<RawWater>('apps/web/public/data/catalog/phase1/waters.catalog.json');
  const allSourceUrls = waters.flatMap((entry) => [
    ...(entry.sources || []).map((source) => source.source_url || ''),
    entry.primary_source?.source_url || '',
  ]);
  assert.ok(allSourceUrls.every((url) => !/^local:\/Users\/Alpha\//i.test(url)));

  for (const entry of waters) {
    const tds = typeof entry.tds_ppm === 'number' ? entry.tds_ppm : null;
    const gh = typeof entry.coffee_parameters?.hardness_ppm_as_caco3 === 'number'
      ? entry.coffee_parameters.hardness_ppm_as_caco3
      : null;
    const kh = typeof entry.coffee_parameters?.alkalinity_ppm_as_caco3 === 'number'
      ? entry.coffee_parameters.alkalinity_ppm_as_caco3
      : null;
    const isLowMineral = (tds !== null && tds <= 20) || (gh !== null && gh <= 15) || (kh !== null && kh <= 10);
    if (isLowMineral || ['amidis', 'air-alfamart', 'cleo', 'suci', 'rivero'].includes(String(entry.brand_group_id))) {
      assert.equal(entry.is_brew_ready, false, `${entry.id} low-mineral water must not be ready`);
      assert.equal(entry.coffee_parameters?.brew_recommendation, 'poor', `${entry.id} low-mineral water must be poor/manual`);
    }
    if (entry.data_quality?.is_estimated) {
      assert.equal(entry.is_brew_ready, false, `${entry.id} estimated water must not be ready`);
      assert.notEqual(entry.publish_state, 'published', `${entry.id} estimated water must not be published as fact`);
    }
  }
});

test('AI Brew planner requires manual minerals for blocked or estimated water brands', () => {
  assert.throws(() => buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    waterMode: 'brand',
    waterBrandId: 'amidis-id',
    waterTdsPpm: '',
    waterHardnessPpm: '',
    waterAlkalinityPpm: '',
  }, catalog), /Water TDS/);

  const remineralizedAmidis = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Manual minerals after Amidis',
    waterMode: 'brand',
    waterBrandId: 'amidis-id',
    waterTdsPpm: '85',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '38',
    waterCustomized: true,
  }, catalog);
  assert.equal(remineralizedAmidis.waterMineralDerivation, 'manual');
  assert.equal(remineralizedAmidis.waterIsBrewReady, false);
  assert.match(remineralizedAmidis.warnings.join(' '), /too low-mineral|add minerals/i);
  assert.ok(remineralizedAmidis.waterBrandSourceUrls.every((url) => !/^local:\/Users\/Alpha\//i.test(url)));

  assert.throws(() => buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    waterMode: 'brand',
    waterBrandId: 'estimated-water',
    waterTdsPpm: '',
    waterHardnessPpm: '',
    waterAlkalinityPpm: '',
  }, catalog), /Water TDS/);

  const verifiedEstimatedWater = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Manually verified estimated water',
    waterMode: 'brand',
    waterBrandId: 'estimated-water',
    waterTdsPpm: '100',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    waterCustomized: true,
  }, catalog);
  assert.equal(verifiedEstimatedWater.waterMineralDerivation, 'manual');
  assert.match(verifiedEstimatedWater.warnings.join(' '), /Estimated, verify manually/i);

  const evian = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Evian provenance test',
    waterMode: 'brand',
    waterBrandId: 'evian-sg',
  }, catalog);
  assert.equal(evian.waterMineralDerivation, 'derived_from_ions');
  assert.match(evian.warnings.join(' '), /High alkalinity|buffer/i);
});

test('water mineral completion fills safe manual baselines without reclassifying blocked brands', () => {
  const amidis = catalog.waterBrands.find((water) => water.id === 'amidis-id');
  assert.ok(amidis);

  const amidisCompletion = resolveWaterMineralCompletion({
    waterBrand: amidis,
    guidance: catalog.waterGuidance,
    language: 'id',
    targetProfileId: 'more_sweetness',
  });

  assert.equal(amidisCompletion.mode, 'remineralization_target');
  assert.equal(amidisCompletion.confidence, 'low');
  assert.ok(amidisCompletion.tdsPpm >= 70 && amidisCompletion.tdsPpm <= 125);
  assert.ok(amidisCompletion.hardnessPpm >= 45 && amidisCompletion.hardnessPpm <= 75);
  assert.ok(amidisCompletion.alkalinityPpm >= 30 && amidisCompletion.alkalinityPpm <= 50);
  assert.notEqual(amidisCompletion.tdsPpm, amidis.resolvedMinerals?.tdsPpm);
  assert.match(`${amidisCompletion.note} ${amidisCompletion.warnings.join(' ')}`, /remineralisasi|low-mineral/i);

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Completed low mineral water',
    waterMode: 'brand',
    waterBrandId: 'amidis-id',
    waterTdsPpm: String(amidisCompletion.tdsPpm),
    waterHardnessPpm: String(amidisCompletion.hardnessPpm),
    waterAlkalinityPpm: String(amidisCompletion.alkalinityPpm),
    waterNotes: amidisCompletion.note,
    waterCustomized: true,
  }, catalog);

  assert.equal(plan.waterMineralDerivation, 'manual');
  assert.equal(plan.waterIsBrewReady, false);
  assert.equal(plan.waterPresetStatus, 'manual_required');
  assert.match(plan.warnings.join(' '), /too low-mineral|add minerals/i);

  const estimatedWater = catalog.waterBrands.find((water) => water.id === 'estimated-water');
  assert.ok(estimatedWater);
  const estimatedCompletion = resolveWaterMineralCompletion({
    waterBrand: estimatedWater,
    guidance: catalog.waterGuidance,
    language: 'en',
  });
  assert.equal(estimatedCompletion.mode, 'classification_baseline');
  assert.equal(estimatedCompletion.confidence, 'low');
  assert.equal(estimatedCompletion.tdsPpm, 100);
  assert.match(`${estimatedCompletion.note} ${estimatedCompletion.warnings.join(' ')}`, /estimate|verify/i);

  const aqua = catalog.waterBrands.find((water) => water.id === 'aqua-id');
  assert.ok(aqua);
  const aquaCompletion = resolveWaterMineralCompletion({
    waterBrand: aqua,
    guidance: catalog.waterGuidance,
    language: 'en',
    targetProfileId: 'more_body',
  });
  assert.equal(aquaCompletion.mode, 'classification_baseline');
  assert.ok(aquaCompletion.tdsPpm >= 120);
  assert.ok(aquaCompletion.hardnessPpm >= 70);
  assert.match(aquaCompletion.note, /classification/i);
});

test('AI Brew optimizer can adjust iced plans without breaking planner guardrails', () => {
  const baseline = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    coffeeName: 'Iced Geisha Guardrail',
    doseG: '20',
    targetProfileId: 'more_sweetness',
    process: 'natural',
    variety: 'geisha',
    waterTdsPpm: '95',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '32',
  }, catalog);
  const result = applyAiBrewOptimizationPatch(baseline, {
    reason: 'Sweet high-grown coffee can take a slightly tighter iced extraction with compact pulses.',
    confidence: 0.92,
    recommendedRatio: baseline.recommendedRatio + 0.35,
    waterTempC: baseline.waterTempC + 1,
    totalTimeSeconds: baseline.totalTimeSeconds + 15,
    hotWaterSharePercent: 64,
    steps: baseline.steps.map((step, index) => ({
      index: index + 1,
      startSeconds: step.startSeconds + (index === 0 ? 0 : 5),
      pourVolumeMl: step.pourVolumeMl + (index === 0 ? 5 : 0),
      control: index === 0
        ? 'Buka bloom rata, lalu jaga aliran kecil dan bersih.'
        : 'Jaga pulse stabil; selesai tanpa mengaduk es terlalu keras.',
    })),
  });

  assert.equal(result.applied, true);
  assert.deepEqual(result.rejected, []);
  assertPlanEnvelope(result.plan);
  assert.equal(result.plan.brewMode, 'iced');
  assert.equal(result.plan.hotWaterMl + result.plan.iceMl, result.plan.totalWaterMl);
  assert.ok(result.plan.confidenceNotes.some((note) => /AI numeric optimizer accepted/i.test(note)));
  assert.ok(result.plan.steps.some((step) => /pulse|bloom|aliran/i.test(step.hybridInstruction || '')));
});

test('AI Brew optimizer clamps online patches to controlled micro-adjustments', () => {
  const baseline = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Sumatra Lintong Lake Toba',
    doseG: '15',
    targetProfileId: 'more_sweetness',
    process: 'wet_hulled',
    variety: '',
    roastLevel: 'medium',
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '32',
  }, catalog);

  const result = applyAiBrewOptimizationPatch(baseline, {
    reason: 'Structured coffee needs a tiny controlled sweetness patch.',
    confidence: 0.88,
    recommendedRatio: baseline.recommendedRatio + 1.5,
    waterTempC: baseline.waterTempC + 4,
    totalTimeSeconds: baseline.totalTimeSeconds + 60,
    pourStyleHint: 'pulse_light',
    grindGuidance: 'If thin, move slightly finer than the deterministic grind.',
  });

  assert.equal(result.applied, true);
  assert.ok(Math.abs(result.plan.recommendedRatio - baseline.recommendedRatio) <= 0.25);
  assert.ok(Math.abs(result.plan.waterTempC - baseline.waterTempC) <= 1);
  assert.ok(Math.abs(result.plan.totalTimeSeconds - baseline.totalTimeSeconds) <= 10);
  assert.ok(result.plan.steps.some((step) => /pulse|stabil|steady/i.test(step.hybridInstruction || '')));
  assert.ok(result.plan.notes.some((note) => /AI grind guidance/i.test(note)));
});

test('AI Brew experience layer exposes bean-safe reasoning, confidence labels, and tasting loop', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: 'Sumatra Lintong Lake Toba',
    doseG: '15',
    targetProfileId: 'more_sweetness',
    process: 'wet_hulled',
    roastLevel: 'medium',
    waterMode: 'manual',
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '32',
  }, catalog);

  const insights = resolveAiBrewBeanCharacterInsights(plan, 'id').join(' ');
  assert.match(insights, /body|sweetness|spice|berstruktur/i);
  assert.doesNotMatch(insights, /Geisha|Gesha/i);

  const badges = resolveAiBrewConfidenceBadges(plan, 'id').map((badge) => badge.label).join(' ');
  assert.match(badges, /Planner Lokal/);
  assert.match(badges, /Grinder resmi/);

  const sourLoop = buildAiBrewTasteLoopMarkdown(plan, { rating: 'sour' }, 'id');
  assert.match(sourLoop, /sedikit lebih halus/i);
  assert.match(sourLoop, /suhu kecil|C/i);
  assert.doesNotMatch(sourLoop, /ubah rasio|ubah dosis/i);

  const priorities = resolveAiBrewActionPriorities(plan, 'id').join(' ');
  assert.match(priorities, /output utama/i);
  assert.match(priorities, /flow time|air turun|drawdown/i);
  assert.match(priorities, /grind|giling|halus|kasar/i);
  assert.match(priorities, /satu variabel/i);
});

test('AI Brew optimizer parser unwraps nested structured text payloads', () => {
  const patch = parseAiBrewOptimizationPatch(JSON.stringify({
    ok: true,
    text: JSON.stringify({
      reason: 'Structured transport wrapped the optimizer JSON.',
      confidence: 0.81,
      targetRatio: 15.6,
      temperature: '92 C',
      targetTimeSeconds: 165,
      hotWaterShare: 62,
      pourStyleHint: 'pulse_light',
      grindGuidance: 'slightly finer only after tasting',
    }),
  }));

  assert.equal(patch?.recommendedRatio, 15.6);
  assert.equal(patch?.waterTempC, 92);
  assert.equal(patch?.totalTimeSeconds, 165);
  assert.equal(patch?.hotWaterSharePercent, 62);
  assert.equal(patch?.pourStyleHint, 'pulse_light');
  assert.equal(patch?.grindGuidance, 'slightly finer only after tasting');
});

test('AI Brew optimizer preserves hot and iced envelopes across core dripper families', () => {
  const matrixCatalog = buildAllMethodFamilyCatalog();

  for (const entry of ALL_METHOD_FAMILY_CASES) {
    for (const brewMode of ['hot', 'iced'] as const) {
      const baseline = buildAiBrewPlan({
        ...createDefaultAiBrewFormState(matrixCatalog),
        brewMode,
        coffeeName: `${entry.name} optimizer matrix`,
        dripperId: entry.dripperId,
        targetProfileId: brewMode === 'iced' ? 'more_sweetness' : 'balance_clean',
        roastLevel: 'medium_light',
        doseG: '18',
        waterTdsPpm: '92',
        waterHardnessPpm: '48',
        waterAlkalinityPpm: '34',
      }, matrixCatalog);
      const result = applyAiBrewOptimizationPatch(baseline, {
        reason: `${entry.family} ${brewMode} micro adjustment inside validated service range.`,
        confidence: 87,
        recommendedRatio: baseline.recommendedRatio + (brewMode === 'iced' ? 0.25 : -0.25),
        waterTempC: baseline.waterTempC + 1,
        totalTimeSeconds: baseline.totalTimeSeconds + 10,
        hotWaterSharePercent: brewMode === 'iced' ? 66 : undefined,
        steps: baseline.steps.map((step, index) => ({
          index: index + 1,
          startSeconds: step.startSeconds + (index === 0 ? 0 : 5),
          pourVolumeMl: step.pourVolumeMl,
          control: `Keep ${entry.family.replace(/_/g, ' ')} ${brewMode} control on checkpoint ${index + 1}.`,
        })),
      });

      assert.deepEqual(result.rejected, [], `${entry.family} ${brewMode} should not reject optimizer patch`);
      assertPlanEnvelope(result.plan);
      assert.equal(result.plan.brewMode, brewMode);
      assert.equal(result.plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0), result.plan.hotWaterMl);
      assert.equal(result.plan.steps[result.plan.steps.length - 1]?.targetVolumeMl, result.plan.hotWaterMl);
      if (brewMode === 'iced') {
        assert.equal(result.plan.hotWaterMl + result.plan.iceMl, result.plan.totalWaterMl);
      }
    }
  }
});

test('parseNumericRange extracts numeric grinder bands and units', () => {
  const parsed = parseNumericRange('20-24 clicks');
  assert.deepEqual(parsed, {
    min: 20,
    max: 24,
    unitLabel: 'clicks',
    precision: 0,
  });

  const parsedTurns = parseNumericRange('2.3 sampai 3.1 putaran');
  assert.deepEqual(parsedTurns, {
    min: 2.3,
    max: 3.1,
    unitLabel: 'turns',
    precision: 1,
  });

  const parsedParenthetical = parseNumericRange('30 - 39 clicks (1.0 - 1.3 turns)');
  assert.deepEqual(parsedParenthetical, {
    min: 30,
    max: 39,
    unitLabel: 'clicks',
    precision: 0,
  });

  const parsedCommaDecimals = parseNumericRange('1,4 - 1,8 putaran');
  assert.deepEqual(parsedCommaDecimals, {
    min: 1.4,
    max: 1.8,
    unitLabel: 'turns',
    precision: 1,
  });

  const parsedMajorDial = parseNumericRange('2.0 - 3.5 major');
  assert.deepEqual(parsedMajorDial, {
    min: 2,
    max: 3.5,
    unitLabel: 'numbers',
    precision: 1,
  });
});

test('inferDripperMethodFamily maps common dripper names to brew families', () => {
  assert.equal(inferDripperMethodFamily('Chemex', 'Glass Brewer'), 'chemex');
  assert.equal(inferDripperMethodFamily('ORIGAMI Dripper Air S', 'Cone Dripper'), 'origami');
  assert.equal(inferDripperMethodFamily('Clever Dripper', 'Immersion Dripper'), 'clever_dripper');
  assert.equal(inferDripperMethodFamily('Melitta 1x2', 'Trapezoid Dripper'), 'melitta');
  assert.equal(inferDripperMethodFamily('French Press', 'Full Immersion Press Brewer'), 'french_press');
  assert.equal(inferDripperMethodFamily('AeroPress', 'Pressure-Assisted Immersion Brewer'), 'aeropress');
  assert.equal(inferDripperMethodFamily('Hario Siphon', 'Vacuum Brewer'), 'siphon');
  assert.equal(inferDripperMethodFamily('Bialetti Moka Pot', 'Stovetop Brewer'), 'moka_pot');
  assert.equal(inferDripperMethodFamily('Toddy Cold Brew', 'Cold Brew Immersion Brewer'), 'cold_brew');
  assert.equal(inferDripperMethodFamily('Batch Brewer', 'Automatic Brewer'), 'batch_brew');
});

test('non-dripper method profiles generate action-safe AI Brew plans without fake iced mode', () => {
  const cases = [
    {
      family: 'espresso',
      methodId: 'espresso',
      dripperId: 'matrix-espresso',
      name: 'Espresso Machine Matrix',
      typeLabel: 'Pressure Espresso Brewer',
      filterStyle: 'pressure',
      steps: [
        { id: 'extract', label: 'Extract', kind: 'extract', share: 1, startSeconds: 0, note: 'Start the shot and track yield.' },
        { id: 'stop', label: 'Stop', kind: 'serve', share: 0, startSeconds: 28, note: 'Stop at target yield.' },
      ],
      expectedKinds: ['extract', 'serve'],
    },
    {
      family: 'french_press',
      methodId: 'french_press',
      dripperId: 'matrix-french-press',
      name: 'French Press Matrix',
      typeLabel: 'Full Immersion Press Brewer',
      filterStyle: 'immersion',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Add all water evenly.' },
        { id: 'steep', label: 'Steep', kind: 'wait', share: 0, startSeconds: 240, note: 'Hold immersion.' },
        { id: 'press', label: 'Press', kind: 'press', share: 0, startSeconds: 270, note: 'Press slowly.' },
      ],
      expectedKinds: ['pour', 'wait', 'press'],
    },
    {
      family: 'aeropress',
      methodId: 'aeropress',
      dripperId: 'matrix-aeropress',
      name: 'AeroPress Matrix',
      typeLabel: 'Pressure-Assisted Immersion Brewer',
      filterStyle: 'pressure',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Wet compact bed.' },
        { id: 'press', label: 'Press', kind: 'press', share: 0, startSeconds: 90, note: 'Press steadily.' },
      ],
      expectedKinds: ['pour', 'press'],
    },
    {
      family: 'siphon',
      methodId: 'siphon',
      dripperId: 'matrix-siphon',
      name: 'Siphon Matrix',
      typeLabel: 'Vacuum Siphon Brewer',
      filterStyle: 'vacuum',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Load water.' },
        { id: 'heat', label: 'Heat', kind: 'heat', share: 0, startSeconds: 60, note: 'Hold heat.' },
        { id: 'drawdown', label: 'Drawdown', kind: 'drawdown', share: 0, startSeconds: 150, note: 'Let coffee draw down.' },
      ],
      expectedKinds: ['pour', 'heat', 'drawdown'],
    },
    {
      family: 'moka_pot',
      methodId: 'moka_pot',
      dripperId: 'matrix-moka-pot',
      name: 'Moka Pot Matrix',
      typeLabel: 'Stovetop Pressure Brewer',
      filterStyle: 'stovetop',
      steps: [
        { id: 'fill_base', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Fill below the valve.' },
        { id: 'heat', label: 'Heat', kind: 'heat', share: 0, startSeconds: 60, note: 'Use low heat.' },
        { id: 'stop', label: 'Stop', kind: 'serve', share: 0, startSeconds: 180, note: 'Remove from heat.' },
      ],
      expectedKinds: ['pour', 'heat', 'serve'],
    },
    {
      family: 'cold_brew',
      methodId: 'cold_brew',
      dripperId: 'matrix-cold-brew',
      name: 'Cold Brew Matrix',
      typeLabel: 'Cold Brew Immersion Brewer',
      filterStyle: 'cold_immersion',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Add cool water.' },
        { id: 'steep', label: 'Steep', kind: 'wait', share: 0, startSeconds: 300, note: 'Steep cold.' },
        { id: 'filter', label: 'Filter', kind: 'serve', share: 0, startSeconds: 43200, note: 'Filter cleanly.' },
      ],
      expectedKinds: ['pour', 'wait', 'serve'],
    },
    {
      family: 'batch_brew',
      methodId: 'batch_brew',
      dripperId: 'matrix-batch-brewer',
      name: 'Batch Brewer Matrix',
      typeLabel: 'Automatic Batch Brewer',
      filterStyle: 'batch',
      steps: [
        { id: 'start_brew', label: 'Start Brew', kind: 'pour', share: 1, startSeconds: 0, note: 'Start brew cycle.' },
        { id: 'drawdown', label: 'Drawdown', kind: 'drawdown', share: 0, startSeconds: 270, note: 'Let drawdown finish.' },
      ],
      expectedKinds: ['pour', 'drawdown'],
    },
  ] as const;

  const expandedCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      ...cases.map((entry) => ({
        id: entry.dripperId,
        kind: 'dripper' as const,
        name: entry.name,
        brand: 'QA',
        typeLabel: entry.typeLabel,
        description: `${entry.name} QA brewer.`,
        searchText: entry.name.toLowerCase(),
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: [`https://example.com/${entry.dripperId}`],
        verificationLevel: 'official' as const,
        verifiedAt: '2026-05-01',
        popularityTier: 'widely_used' as const,
        marketSegment: 'specialty_mainstream' as const,
        releaseStatus: 'established' as const,
        confidence: 'high' as const,
        methodFamily: entry.family as AiBrewMethodFamily,
      })),
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      ...cases.map((entry) => ({
        id: `profile_${entry.dripperId}_hot`,
        label: `${entry.name} Hot`,
        brewMode: 'hot' as const,
        dripperIds: [entry.dripperId],
        methodFamily: entry.family as AiBrewMethodFamily,
        brewMethodId: entry.methodId as BrewMethodId,
        exactMatch: true,
        filterStyle: entry.filterStyle,
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same' as const,
        note: `${entry.name} QA baseline.`,
        steps: entry.steps,
        source: 'test',
        sourceUrls: [`https://example.com/profile-${entry.dripperId}`],
        verificationLevel: 'official' as const,
        verifiedAt: '2026-05-01',
        popularityTier: 'widely_used' as const,
        marketSegment: 'specialty_mainstream' as const,
        releaseStatus: 'established' as const,
        confidence: 'high' as const,
        catalogVersion: 'test-v2',
      })),
    ],
  };

  for (const entry of cases) {
    assert.equal(supportsAiBrewIcedMode(expandedCatalog, entry.dripperId), false);

    const input = {
      ...createDefaultAiBrewFormState(expandedCatalog),
      brewMode: 'iced' as const,
      dripperId: entry.dripperId,
      coffeeName: `${entry.name} QA`,
      doseG: entry.family === 'cold_brew' ? '60' : entry.family === 'batch_brew' ? '55' : '18',
      waterTdsPpm: '95',
      waterHardnessPpm: '55',
      waterAlkalinityPpm: '40',
      targetProfileId: 'balance_clean',
    };
    const sanitized = sanitizeAiBrewFormState(input, expandedCatalog);
    assert.equal(sanitized.brewMode, 'hot');

    const plan = buildAiBrewPlan(input, expandedCatalog);
    if (entry.family !== 'cold_brew' && entry.family !== 'espresso') {
      assertPlanEnvelope(plan);
    } else {
      assertBaristaRoundedPlan(plan);
      const totalPoured = plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
      assert.equal(totalPoured, plan.hotWaterMl);
      assert.equal(plan.steps.at(-1)?.targetVolumeMl, plan.hotWaterMl);
      assert.ok(plan.recommendedRatio > 0);
      assert.equal(plan.finalBeverageRatio, plan.recommendedRatio);
      assert.ok(plan.iceMl === 0);
      if (entry.family === 'cold_brew') {
        assert.ok(plan.waterTempC >= 4 && plan.waterTempC <= 25);
        assert.ok(plan.totalTimeSeconds >= 21600);
      } else {
        assert.ok(plan.waterTempC >= 88 && plan.waterTempC <= 98);
        assert.ok(plan.totalTimeSeconds >= 20 && plan.totalTimeSeconds <= 45);
      }
    }
    assert.equal(plan.brewMode, 'hot');
    assert.equal(plan.methodFamily, entry.family);
    assert.equal(plan.methodId, entry.methodId);
    assert.equal(plan.ratioToolMethodId, entry.methodId);
    assert.deepEqual(plan.steps.map((step) => step.kind), entry.expectedKinds);
    assert.doesNotMatch(buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'), /\btuang\s+0\b|\bpour\s+0\b/i);
    assert.ok(plan.confidenceNotes.some((note) =>
      note.toLowerCase().includes(`method-family signature active: ${entry.family.replace(/_/g, ' ')}`),
    ));
    const narrative = collectPlanNarrative(plan);
    if (entry.family === 'aeropress') {
      assert.ok(plan.waterTempC >= 88);
      assert.match(narrative, /Preheat the chamber|stop before the final dry hiss/i);
    }
    if (entry.family === 'french_press') {
      assert.match(narrative, /coarse, even grind|decant immediately/i);
    }

    if (entry.family === 'cold_brew') {
      assert.match(plan.summary, /Cold brew plan/i);
      assert.match(buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'), /\d+j/);
    }
    if (entry.family === 'espresso') {
      assert.ok(plan.steps.some((step) => step.kind === 'extract' && step.pourVolumeMl > 0));
      assert.match(plan.summary, /Espresso plan/i);
    }
  }

  assert.equal(supportsAiBrewIcedMode(expandedCatalog, 'hario-v60'), true);
});

test('sanitizeAiBrewFormState falls back to valid defaults for unsupported values', () => {
  const sanitized = sanitizeAiBrewFormState({
    brewMode: 'hot',
    process: 'invalid-process',
    variety: 'invalid-variety',
    roastLevel: 'ultra_light' as AiBrewFormState['roastLevel'],
    waterMode: 'sparkling' as AiBrewFormState['waterMode'],
    waterBrandId: 'unknown-brand',
    dripperId: '',
    grinderId: '',
  }, catalog);

  assert.equal(sanitized.process, '');
  assert.equal(sanitized.variety, '');
  assert.equal(sanitized.roastLevel, 'medium');
  assert.equal(sanitized.waterMode, 'brand');
  assert.equal(sanitized.waterBrandId, '');
  assert.equal(sanitized.dripperId, 'hario-v60');
  assert.equal(sanitized.grinderId, '1zpresso-k-ultra');
});

test('resolveDeviceProfileSelection prefers exact profile and derives a device template when exact is missing', () => {
  const exact = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  assert.equal(exact.profile.id, 'profile_hario_v60_hot');
  assert.equal(exact.mode, 'exact');

  const derived = resolveDeviceProfileSelection(catalog, catalog.drippers[1], 'hot');
  assert.equal(derived.mode, 'derived_template');
  assert.equal(derived.profile.id, 'profile_derived_latina-cono_hot');
  assert.equal(derived.profile.verificationLevel, 'fallback');
});

test('resolveGrinderSettingReference uses family fallback ids when no exact grinder match exists', () => {
  const deviceSelection = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  const grinderSetting = resolveGrinderSettingReference(catalog, catalog.grinders[0], deviceSelection.profile, 'hot');
  assert.equal(grinderSetting?.id, 'gs_k_ultra_cone');
});

test('resolveGrinderSettingReference derives a grinder baseline when no catalog chart exists', () => {
  const deviceSelection = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  const grinderSetting = resolveGrinderSettingReference(catalog, catalog.grinders[1], deviceSelection.profile, 'hot');
  assert.equal(grinderSetting?.id, 'derived_hario-mini-slim_hot');
  assert.equal(grinderSetting?.verificationLevel, 'fallback');
});

test('resolveGrinderSettingReference promotes curated grinder bands when provenance exists', () => {
  const deviceSelection = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  const curatedGrinder = {
    ...catalog.grinders[1],
    verificationLevel: 'curated' as const,
    confidence: 'medium' as const,
    source: 'brewlogic-curated',
  };
  const grinderSetting = resolveGrinderSettingReference(catalog, curatedGrinder, deviceSelection.profile, 'hot');
  assert.equal(grinderSetting?.id, 'catalog_hario-mini-slim_hot');
  assert.equal(grinderSetting?.verificationLevel, 'curated');
  assert.match(grinderSetting?.note || '', /published pour-over band/i);
});

test('buildAiBrewPlan creates a hot brew plan with deterministic outputs and provenance', () => {
  const form = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'QA Ethiopia',
    doseG: '15',
    waterTdsPpm: '90',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const plan = buildAiBrewPlan(form, catalog);

  assert.equal(plan.brewMode, 'hot');
  assert.equal(plan.methodId, 'v60');
  assert.equal(plan.ratioToolMethodId, 'v60');
  assert.equal(plan.hotWaterMl, plan.totalWaterMl);
  assert.equal(plan.iceMl, 0);
  assert.equal(plan.deviceProfileId, 'profile_hario_v60_hot');
  assert.equal(plan.deviceProfileMode, 'exact');
  assert.equal(plan.grindSettingMode, 'catalog_reference');
  assert.equal(plan.grindSettingVerification, 'official');
  assert.equal(plan.provenanceAttentionNeeded, false);
  assert.match(plan.grindRecommendation, /numbers/);
  assert.equal(plan.waterMinerals.tdsPpm, 90);
  assert.equal(plan.process, 'Not specified');
  assert.equal(plan.variety, 'Not specified');
  assert.ok(plan.notes.some((note) => /No automatic process modifier/i.test(note)));
  assert.match(plan.summary, /QA Ethiopia/);
});

test('buildAiBrewPlan applies operator knowledge seed notes from knowledge_v1 workbook', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Gayo Washed QA',
    dripperId: 'hario-v60',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.ok(plan.notes.some((note) => /Knowledge v1 - Gayo/i.test(note)));
  assert.ok(plan.notes.some((note) => /Knowledge v1 - V60/i.test(note)));
  assert.ok(plan.confidenceNotes.some((note) => /knowledge_v1\.xlsx/i.test(note)));
});

test('buildAiBrewPlanProgressively emits factual generation progress with increasing system signals', async () => {
  const progressEvents: AiBrewGenerationProgress[] = [];
  const plan = await buildAiBrewPlanProgressively({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Progress QA',
    doseG: '15',
    waterBrandId: 'evian-sg',
    process: 'washed',
    variety: 'bourbon',
    altitudeMasl: '1650',
    beanDensityGml: '0.71',
    roastDevelopment: 'light_roast',
    solubility: 'average',
  }, catalog, (progress) => {
    progressEvents.push(progress);
  });

  assert.equal(progressEvents.length, 6);
  assert.equal(progressEvents[0]?.id, 'validate_input');
  assert.equal(progressEvents[progressEvents.length - 1]?.id, 'run_standards_checks');
  assert.equal(progressEvents[0]?.metrics.resolvedReferenceCount, 1);
  assert.equal(progressEvents[2]?.metrics.resolvedReferenceCount, 3);
  assert.equal(progressEvents[3]?.metrics.totalWaterMl, plan.totalWaterMl);
  assert.equal(progressEvents[4]?.metrics.stepCount, plan.steps.length);
  assert.equal(progressEvents[5]?.metrics.stepCount, plan.steps.length);
  assert.ok((progressEvents[2]?.referenceStrengthScore || 0) >= (progressEvents[0]?.referenceStrengthScore || 0));
  assert.equal(progressEvents[5]?.progressRatio, 1);
  assert.equal(Number.isFinite(progressEvents[5]?.standardsScore || NaN), true);
});

test('buildAiBrewPlan keeps final step envelope aligned even with skewed profile shares', () => {
  const skewedCatalog = {
    ...catalog,
    deviceProfiles: catalog.deviceProfiles.map((profile) =>
      profile.id === 'profile_hario_v60_hot'
        ? {
            ...profile,
            steps: [
              { id: 'bloom', label: 'Bloom', share: 0.5, startSeconds: 0, note: 'Saturate evenly.' },
              { id: 'main', label: 'Main Pour', share: 0.5, startSeconds: 35, note: 'Build the slurry.' },
              { id: 'finish', label: 'Finish', share: 0.5, startSeconds: 95, note: 'Finish clean.' },
            ],
          }
        : profile,
    ),
  } as AiBrewCatalog;

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(skewedCatalog),
    coffeeName: 'Skewed Envelope QA',
    waterTdsPpm: '90',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, skewedCatalog);

  const summedPour = plan.steps.reduce((total, step) => total + step.pourVolumeMl, 0);
  const finalStep = plan.steps[plan.steps.length - 1];

  assert.equal(summedPour, plan.hotWaterMl);
  assert.equal(finalStep.targetVolumeMl, plan.hotWaterMl);
});

test('buildAiBrewPlan keeps brew temperature inside the real computed range', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Temperature Guard',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.equal(plan.waterTempC, 93);
  assert.ok(plan.waterTempC > 78);
});

test('buildAiBrewPlan keeps neutral quick and neutral pro-style inputs on the same deterministic core plan', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Quick Pro Neutral QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const quickLike = buildAiBrewPlan(baseInput, catalog);
  const proNeutral = buildAiBrewPlan({
    ...baseInput,
    process: '',
    variety: '',
    customProcess: '',
    customVariety: '',
    altitudeMasl: '',
    beanDensityGml: '',
    roastDevelopment: '',
    solubility: '',
    waterNotes: '',
  }, catalog);

  assert.equal(quickLike.recommendedRatio, proNeutral.recommendedRatio);
  assert.equal(quickLike.waterTempC, proNeutral.waterTempC);
  assert.equal(quickLike.totalTimeSeconds, proNeutral.totalTimeSeconds);
  assert.deepEqual(
    quickLike.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
    proNeutral.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
  );
});

test('createQuickAiBrewFormState keeps coffee context and strips hidden precision-only modifiers before generation', () => {
  const quickInput = createQuickAiBrewFormState({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Quick Sanitizer QA',
    brewMode: 'iced',
    process: 'natural',
    customProcess: 'experimental anaerobic',
    variety: 'geisha',
    customVariety: 'rare cultivar',
    altitudeMasl: '1950',
    beanDensityGml: '0.74',
    roastDevelopment: 'underdeveloped',
    solubility: 'low',
    waterNotes: 'extra buffer',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetRatio: '15.2',
    targetWaterMl: '230',
    targetTempC: '92',
    pourStyle: 'pulse',
    pourCount: '5',
  }, catalog);

  assert.equal(quickInput.brewMode, 'iced');
  assert.equal(quickInput.process, 'natural');
  assert.equal(quickInput.customProcess, '');
  assert.equal(quickInput.variety, 'geisha');
  assert.equal(quickInput.customVariety, '');
  assert.equal(quickInput.altitudeMasl, '');
  assert.equal(quickInput.beanDensityGml, '');
  assert.equal(quickInput.roastDevelopment, '');
  assert.equal(quickInput.solubility, '');
  assert.equal(quickInput.waterNotes, 'extra buffer');
  assert.equal(quickInput.targetRatio, '');
  assert.equal(quickInput.targetWaterMl, '');
  assert.equal(quickInput.targetTempC, '');
  assert.equal(quickInput.waterTdsPpm, '95');
  assert.equal(quickInput.pourStyle, 'pulse');
  assert.equal(quickInput.pourCount, '5');

  const customQuickInput = createQuickAiBrewFormState({
    ...createDefaultAiBrewFormState(catalog),
    process: 'custom',
    customProcess: 'carbonic maceration',
    variety: 'custom',
    customVariety: 'local landrace',
  }, catalog);

  assert.equal(customQuickInput.process, 'custom');
  assert.equal(customQuickInput.customProcess, 'carbonic maceration');
  assert.equal(customQuickInput.variety, 'custom');
  assert.equal(customQuickInput.customVariety, 'local landrace');
});

test('createQuickAiBrewFormState applies process and variety to the generated recipe core', () => {
  const base = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot' as const,
    coffeeName: 'Colombia Huila Natural Ombligon',
    doseG: '15',
    process: 'natural',
    variety: 'ombligon',
    roastLevel: 'medium_light' as const,
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'more_sweetness',
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };
  const quickPlan = buildAiBrewPlan(createQuickAiBrewFormState(base, catalog), catalog);
  const proPlan = buildAiBrewPlan(base, catalog);

  assert.equal(quickPlan.process, 'Natural');
  assert.equal(quickPlan.variety, 'Ombligon');
  assert.equal(quickPlan.recommendedRatio, proPlan.recommendedRatio);
  assert.equal(quickPlan.waterTempC, proPlan.waterTempC);
  assert.equal(quickPlan.totalTimeSeconds, proPlan.totalTimeSeconds);
});

test('precision targets can override ratio, total water, and temperature within guardrails', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const baseInput = {
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'Precision Override QA',
    waterMode: 'manual' as const,
    waterTdsPpm: '92',
    waterHardnessPpm: '46',
    waterAlkalinityPpm: '32',
    roastLevel: 'light' as const,
    targetProfileId: 'balance_clean',
  };

  const v60 = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'matrix-v60-all',
    doseG: '15',
    targetRatio: '15.5',
    targetTempC: '92',
  }, fullFamilyCatalog);

  assertPlanEnvelope(v60);
  assert.equal(v60.waterTempC, 92);
  assert.ok(Math.abs(v60.recommendedRatio - 15.5) <= 0.25);
  assert.ok(v60.notes.some((note) => /precision target ratio active/i.test(note)));
  assert.ok(v60.notes.some((note) => /precision target temperature active/i.test(note)));

  const chemex = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'matrix-chemex-all',
    doseG: '30',
    targetRatio: '14',
    targetWaterMl: '500',
    targetTempC: '90',
  }, fullFamilyCatalog);

  assertPlanEnvelope(chemex);
  assert.equal(chemex.totalWaterMl, 500);
  assert.equal(chemex.hotWaterMl, 500);
  assert.equal(chemex.waterTempC, 90);
  assert.ok(Math.abs(chemex.recommendedRatio - 16.67) <= 0.05);
  assert.ok(chemex.notes.some((note) => /precision target water active/i.test(note)));
});

test('buildAiBrewPlan roast level shifts extraction envelope in a sensible direction', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Roast Envelope QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
    process: 'washed',
  };

  const light = buildAiBrewPlan({
    ...baseInput,
    roastLevel: 'light',
  }, catalog);
  const medium = buildAiBrewPlan({
    ...baseInput,
    roastLevel: 'medium',
  }, catalog);
  const dark = buildAiBrewPlan({
    ...baseInput,
    roastLevel: 'dark',
  }, catalog);

  assertPlanEnvelope(light);
  assertPlanEnvelope(medium);
  assertPlanEnvelope(dark);

  assert.ok(light.waterTempC > medium.waterTempC);
  assert.ok(medium.waterTempC > dark.waterTempC);
  assert.ok(light.totalTimeSeconds > medium.totalTimeSeconds);
  assert.ok(medium.totalTimeSeconds > dark.totalTimeSeconds);
  assert.ok(light.recommendedRatio < medium.recommendedRatio);
  assert.ok(medium.recommendedRatio < dark.recommendedRatio);
  assert.equal(light.grindBias, 'finer');
  assert.equal(dark.grindBias, 'coarser');
});

test('buildAiBrewPlan creates a japanese iced plan with split water and derived template disclosure', () => {
  const form = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced' as const,
    dripperId: 'latina-cono',
    coffeeName: 'QA Iced',
    doseG: '20',
    targetProfileId: 'more_sweetness',
    waterTdsPpm: '70',
    waterHardnessPpm: '35',
    waterAlkalinityPpm: '25',
  };

  const plan = buildAiBrewPlan(form, catalog);

  assert.equal(plan.brewMode, 'iced');
  assert.equal(plan.methodId, 'v60_japanese_iced');
  assert.equal(plan.ratioToolMethodId, 'v60_japanese_iced');
  assert.ok(plan.iceMl > 0);
  assert.ok(plan.hotWaterMl < plan.totalWaterMl);
  assert.equal(plan.finalBeverageRatio, plan.recommendedRatio);
  assert.equal(plan.hotExtractionRatio, Number((plan.hotWaterMl / plan.doseG).toFixed(2)));
  assert.ok(plan.hotExtractionRatio >= 8.8, `Expected hot concentrate >= 1:8.8, got 1:${plan.hotExtractionRatio} (${plan.hotWaterMl} ml / ${plan.doseG} g)`);
  assert.ok(plan.hotExtractionRatio <= 10.8);
  assert.ok(plan.hotWaterSharePercent >= 54);
  assert.ok(plan.hotWaterSharePercent <= 70);
  assert.equal(plan.steps.length, 4);
  assert.deepEqual(plan.steps.map((step) => step.kind), ['pour', 'pour', 'pour', 'pour']);
  assert.ok(plan.steps.every((step) => step.pourVolumeMl > 0), 'Iced V60 hot-water checkpoints should all be real pour steps');
  assert.match(plan.steps[plan.steps.length - 1]?.label || '', /Final Pour/i);
  assert.match(plan.summary, /Japanese-style iced brew/i);
  assert.doesNotMatch(
    buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'),
    /sajikan|pisahkan/i,
    'Iced V60 recipe steps should not turn the final pour into a serve step',
  );
  assert.equal(plan.deviceProfileMode, 'derived_template');
  assert.equal(plan.provenanceAttentionNeeded, true);
  assert.ok(plan.notes.some((note) => /hot concentrate extracts/i.test(note)));
  assert.ok(plan.confidenceNotes.some((note) => /generated from the v60 family template/i.test(note)));
});

test('light roast japanese iced sweetness uses safe 92-93C baseline and target-behavior pour map', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    dripperId: 'hario-v60',
    coffeeName: 'Iced Light Sweetness QA',
    doseG: '15',
    targetProfileId: 'more_sweetness',
    process: 'natural',
    variety: 'ethiopian_heirloom',
    roastLevel: 'light',
    waterMode: 'manual',
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '32',
  }, catalog);

  assertPlanEnvelope(plan);
  assert.equal(plan.brewMode, 'iced');
  assert.equal(plan.methodFamily, 'v60');
  assert.ok(plan.waterTempC >= 92 && plan.waterTempC <= 93);
  assert.ok(plan.hotWaterMl >= 130 && plan.hotWaterMl <= 140, `Expected hot phase around 135 ml, got ${plan.hotWaterMl}`);
  assert.equal(plan.iceMl, 75);
  assert.ok(plan.estimatedCupOutputMl >= 175 && plan.estimatedCupOutputMl <= 185, `Expected served output near 175-185 ml, got ${plan.estimatedCupOutputMl}`);
  assert.equal(plan.hotWaterMl + plan.iceMl, plan.totalWaterMl);
  assert.equal(plan.steps[1]?.startSeconds, 45);
  assert.deepEqual(plan.steps.filter((step) => step.pourVolumeMl > 0).map((step) => step.pourVolumeMl), [30, 70, 35]);
  assert.ok(plan.notes.some((note) => /92-93C|Exact Hario V60 Japanese iced/i.test(note)));
  assert.match(plan.steps.map((step) => `${step.note} ${step.hybridInstruction || ''}`).join(' '), /no late bypass|hot concentrate only/i);
});

test('V60 Japanese iced 15g target snapshots stay deterministic across all target profiles', () => {
  const baseForm = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced' as const,
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    coffeeName: 'V60 Japanese Iced Snapshot',
    doseG: '15',
    process: 'washed',
    variety: 'ethiopian_heirloom',
    roastLevel: 'medium' as const,
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    pourStyle: 'auto' as const,
    pourCount: 'auto' as const,
  };
  const expectations = {
    balance_clean: { total: 210, hot: 135, ice: 75, tempMin: 93, tempMax: 93, timeMin: 180, timeMax: 190, pours: [30, 60, 45] },
    more_acidity: { total: 215, hot: 135, ice: 80, tempMin: 92, tempMax: 93, timeMin: 170, timeMax: 185, pours: [30, 60, 45] },
    more_sweetness: { total: 210, hot: 135, ice: 75, tempMin: 92, tempMax: 93, timeMin: 185, timeMax: 200, pours: [30, 70, 35] },
    more_body: { total: 205, hot: 135, ice: 70, tempMin: 92, tempMax: 93, timeMin: 195, timeMax: 215, pours: [35, 60, 40] },
    floral_transparent: { total: 215, hot: 135, ice: 80, tempMin: 92, tempMax: 93, timeMin: 170, timeMax: 185, pours: [30, 60, 45] },
    fruit_forward: { total: 210, hot: 135, ice: 75, tempMin: 92, tempMax: 93, timeMin: 185, timeMax: 200, pours: [30, 70, 35] },
    soft_round: { total: 210, hot: 135, ice: 75, tempMin: 92, tempMax: 93, timeMin: 190, timeMax: 205, pours: [35, 60, 40] },
    dense_comforting: { total: 205, hot: 135, ice: 70, tempMin: 92, tempMax: 93, timeMin: 195, timeMax: 215, pours: [35, 60, 40] },
  } satisfies Record<string, {
    total: number;
    hot: number;
    ice: number;
    tempMin: number;
    tempMax: number;
    timeMin: number;
    timeMax: number;
    pours: number[];
  }>;

  const plans = new Map<string, ReturnType<typeof buildAiBrewPlan>>();
  for (const [targetProfileId, expected] of Object.entries(expectations)) {
    const plan = buildAiBrewPlan({ ...baseForm, targetProfileId }, catalog);
    const pours = plan.steps.filter((step) => step.pourVolumeMl > 0);
    plans.set(targetProfileId, plan);

    assertPlanEnvelope(plan);
    assert.equal(plan.deviceProfileMode, 'exact');
    assert.equal(plan.deviceProfileId, 'profile_hario_v60_iced');
    assert.equal(plan.totalWaterMl, expected.total);
    assert.equal(plan.hotWaterMl, expected.hot);
    assert.equal(plan.iceMl, expected.ice);
    assert.equal(plan.hotWaterMl + plan.iceMl, plan.totalWaterMl);
    assert.equal(plan.finalBeverageRatio, Math.round((expected.total / 15) * 100) / 100);
    assert.equal(plan.hotExtractionRatio, Math.round((expected.hot / 15) * 100) / 100);
    assert.ok(plan.waterTempC >= expected.tempMin && plan.waterTempC <= expected.tempMax, `${targetProfileId} temp ${plan.waterTempC}`);
    assert.ok(plan.totalTimeSeconds >= expected.timeMin && plan.totalTimeSeconds <= expected.timeMax, `${targetProfileId} time ${plan.totalTimeSeconds}`);
    assert.deepEqual(pours.map((step) => step.pourVolumeMl), expected.pours);
    assert.equal(pours.reduce((sum, step) => sum + step.pourVolumeMl, 0), plan.hotWaterMl);
    assert.equal(pours[pours.length - 1]?.targetVolumeMl, plan.hotWaterMl);
    assert.ok(pours.every((step) => step.flowRateMlPerSec), `${targetProfileId} missing flow metadata`);
    assert.ok(pours.every((step) => step.pourPath), `${targetProfileId} missing pour path metadata`);
    assert.ok(pours.every((step) => step.pourHeight), `${targetProfileId} missing pour height metadata`);
    assert.ok(pours.every((step) => step.agitationLevel), `${targetProfileId} missing agitation metadata`);
    if (targetProfileId === 'more_acidity' || targetProfileId === 'floral_transparent') {
      assert.deepEqual(pours[0].flowRateMlPerSec, [4, 5]);
      assert.equal(pours[0].pourHeight, 'low');
      assert.equal(pours[0].agitationLevel, 'minimal');
    }
    if (targetProfileId === 'more_sweetness' || targetProfileId === 'fruit_forward') {
      assert.deepEqual(pours.map((step) => step.pourVolumeMl), [30, 70, 35]);
      assert.equal(pours[1].pourPath, 'center_to_mid');
      assert.equal(pours[1].agitationLevel, 'low');
    }
    if (targetProfileId === 'more_body' || targetProfileId === 'dense_comforting') {
      assert.deepEqual(pours.map((step) => step.pourVolumeMl), [35, 60, 40]);
      assert.equal(pours[0].pourHeight, 'low');
      assert.equal(pours[0].agitationLevel, 'controlled');
    }
    assert.match(buildLocalizedPlanRecipeSteps(plan, 'en').join('\n'), /hot water/i);
    assert.match(buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'), /air panas/i);
  }

  const balance = plans.get('balance_clean')!;
  assert.ok(plans.get('more_acidity')!.waterTempC <= balance.waterTempC);
  assert.ok(plans.get('floral_transparent')!.waterTempC <= balance.waterTempC);
  assert.ok(plans.get('more_body')!.totalTimeSeconds >= balance.totalTimeSeconds);
  assert.ok(plans.get('dense_comforting')!.totalTimeSeconds >= balance.totalTimeSeconds);
  assert.notEqual(plans.get('more_sweetness')!.grindBias, 'coarser');
  assert.equal(
    buildBrewPlanRecipeSignature(balance),
    buildBrewPlanRecipeSignature({ ...balance, targetProfileId: 'duplicate_label_only' } as ReturnType<typeof buildAiBrewPlan>),
    'Recipe signatures must ignore labels so duplicate compare cards can be merged.',
  );
});

test('AI Brew iced guard blocks invalid hot-water target and pour sum', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    dripperId: 'hario-v60',
    grinderId: '1zpresso-k-ultra',
    coffeeName: 'Iced Guard QA',
    doseG: '15',
    targetProfileId: 'balance_clean',
    process: 'washed',
    variety: 'ethiopian_heirloom',
    roastLevel: 'medium',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);
  const invalidLastTarget = {
    ...plan,
    steps: plan.steps.map((step, index) => index === plan.steps.length - 1
      ? { ...step, targetVolumeMl: step.targetVolumeMl + 5 }
      : step),
  };
  const invalidPourSum = {
    ...plan,
    steps: plan.steps.map((step, index) => index === 0
      ? { ...step, pourVolumeMl: step.pourVolumeMl + 5, targetVolumeMl: step.targetVolumeMl + 5 }
      : step),
  };

  assert.equal(validateBrewPlanOutput(plan).allowed, true);
  assert.equal(validateBrewPlanOutput(invalidLastTarget).allowed, false);
  assert.match(validateBrewPlanOutput(invalidLastTarget).reason || '', /last hot-water target step must equal hotWaterMl/i);
  assert.equal(validateBrewPlanOutput(invalidPourSum).allowed, false);
  assert.match(validateBrewPlanOutput(invalidPourSum).reason || '', /volume sum must equal hotWaterMl/i);
});

test('buildAiBrewPlan keeps small-dose V60 hot and iced cadence barista-friendly', () => {
  const base = {
    ...createDefaultAiBrewFormState(catalog),
    dripperId: 'hario-v60',
    coffeeName: 'Small Dose V60 QA',
    doseG: '15',
    targetProfileId: 'balance_clean',
    process: 'washed',
    variety: 'ethiopian_heirloom',
    roastLevel: 'medium_light' as const,
    waterMode: 'manual' as const,
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '30',
  };

  const hot = buildAiBrewPlan({ ...base, brewMode: 'hot' }, catalog);
  const iced = buildAiBrewPlan({ ...base, brewMode: 'iced' }, catalog);
  const icedPositivePours = iced.steps.filter((step) => step.pourVolumeMl > 0);
  const icedFinalPour = icedPositivePours[icedPositivePours.length - 1];

  assertPlanEnvelope(hot);
  assertPlanEnvelope(iced);
  assert.ok((hot.steps[1]?.startSeconds ?? 0) >= 30);
  assert.equal(icedPositivePours.length, 3);
  assert.match(icedPositivePours[1]?.label || '', /Center Pour/i);
  assert.ok(icedPositivePours[0].pourVolumeMl >= iced.doseG * 2);
  assert.ok(iced.totalTimeSeconds - icedFinalPour.startSeconds >= 65);
  assert.equal(iced.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0), iced.hotWaterMl);
  assert.equal(iced.steps.at(-1)?.targetVolumeMl, iced.hotWaterMl);
});

test('buildAiBrewPlan keeps high-dose Japanese iced pour-over cadence service-safe', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const manualFamilies = new Set<AiBrewMethodFamily>([
    'v60',
    'origami',
    'kono',
    'kalita_wave',
    'melitta',
    'april',
    'chemex',
  ]);
  const minimumFinalWindowByFamily: Partial<Record<AiBrewMethodFamily, number>> = {
    v60: 65,
    origami: 50,
    kono: 50,
    kalita_wave: 50,
    melitta: 50,
    april: 40,
    chemex: 65,
  };

  for (const familyCase of ALL_METHOD_FAMILY_CASES.filter((entry) => manualFamilies.has(entry.family))) {
    for (const builder of ['quick', 'pro'] as const) {
      for (const doseG of ['30', '40']) {
        for (const targetProfileId of ['balance_clean', 'more_acidity', 'more_sweetness', 'more_body'] as const) {
          const base = {
            ...createDefaultAiBrewFormState(fullFamilyCatalog),
            brewMode: 'iced' as const,
            coffeeName: `${familyCase.name} high dose iced QA`,
            dripperId: familyCase.dripperId,
            doseG,
            targetProfileId,
            roastLevel: 'medium_light' as const,
            waterMode: 'manual' as const,
            waterTdsPpm: '92',
            waterHardnessPpm: '46',
            waterAlkalinityPpm: '32',
          };
          const plan = buildAiBrewPlan(
            builder === 'quick' ? createQuickAiBrewFormState(base, fullFamilyCatalog) : base,
            fullFamilyCatalog,
          );
          const positivePours = plan.steps.filter((step) => step.pourVolumeMl > 0);
          const finalPour = positivePours[positivePours.length - 1];
          const finalWindow = plan.totalTimeSeconds - finalPour.startSeconds;

          assertPlanEnvelope(plan);
          assert.equal(plan.brewMode, 'iced');
          assert.equal(positivePours.length, 5);
          assert.equal(plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0), plan.hotWaterMl);
          assert.equal(plan.steps.at(-1)?.targetVolumeMl, plan.hotWaterMl);
          assert.ok(
            finalWindow >= (minimumFinalWindowByFamily[familyCase.family] || 40),
            `${builder} ${familyCase.family} ${doseG}g ${targetProfileId} final window ${finalWindow}s is too short`,
          );
        }
      }
    }
  }

  const harioHighDose = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    dripperId: 'hario-v60',
    coffeeName: 'Production Hario V60 high dose iced QA',
    doseG: '40',
    targetProfileId: 'more_acidity',
    waterMode: 'manual',
    waterTdsPpm: '92',
    waterHardnessPpm: '46',
    waterAlkalinityPpm: '32',
  }, catalog);
  const harioFinalPour = harioHighDose.steps.filter((step) => step.pourVolumeMl > 0).at(-1);
  assert.ok(harioFinalPour);
  assert.ok(harioHighDose.totalTimeSeconds - harioFinalPour.startSeconds >= 65);
});

test('buildAiBrewPlan applies selected pour count and interval style without breaking Japanese iced totals', () => {
  const form = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced' as const,
    dripperId: 'hario-v60',
    coffeeName: 'Japanese Pulse QA',
    doseG: '20',
    pourStyle: 'pulse' as const,
    pourCount: '5' as const,
    targetProfileId: 'more_sweetness',
    waterMode: 'manual' as const,
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '30',
  };

  const plan = buildAiBrewPlan(form, catalog);
  const totalPoured = plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
  const positivePours = plan.steps.filter((step) => step.pourVolumeMl > 0);

  assert.equal(plan.brewMode, 'iced');
  assert.equal(plan.methodId, 'v60_japanese_iced');
  assert.equal(positivePours.length, 5);
  assert.equal(totalPoured, plan.hotWaterMl);
  assert.equal(plan.steps.at(-1)?.targetVolumeMl, plan.hotWaterMl);
  assert.ok(plan.notes.some((note) => /Japanese-style iced|5 pours|pulse interval/i.test(note)));
  assert.ok(plan.confidenceNotes.some((note) => /Pour control source/i.test(note)));
  assertPlanEnvelope(plan);
});

test('buildAiBrewPlan treats iced pour-over no-volume finish as drawdown, not a serve step', () => {
  const icedCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        ...catalog.drippers[0],
        id: 'test-v60-iced-finish',
        name: 'Test V60 Iced Finish',
        searchText: 'test v60 iced finish',
        defaultProfileId: 'profile_test_v60_iced_finish',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        ...catalog.deviceProfiles[0],
        id: 'profile_test_v60_iced_finish',
        label: 'Test V60 Iced Finish',
        brewMode: 'iced',
        dripperIds: ['test-v60-iced-finish'],
        methodFamily: 'v60',
        brewMethodId: 'v60_japanese_iced' as BrewMethodId,
        exactMatch: true,
        ratioDelta: -0.2,
        tempDeltaC: 0.4,
        brewTimeDeltaSec: -8,
        grindBias: 'finer',
        note: 'QA iced profile with a no-volume finish step.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Wet all grounds.' },
          { id: 'middle', label: 'Middle Pour', share: 0.76, startSeconds: 35, note: 'Build the hot concentrate.' },
          { id: 'serve', label: 'Serve', share: 0, startSeconds: 110, note: 'Let the bed finish draining and serve.' },
        ],
      },
    ],
  };

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(icedCatalog),
    brewMode: 'iced',
    dripperId: 'test-v60-iced-finish',
    coffeeName: 'Iced Drawdown QA',
    doseG: '20',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, icedCatalog);

  const finalStep = plan.steps[plan.steps.length - 1];
  assert.equal(finalStep.kind, 'drawdown');
  assert.equal(finalStep.pourVolumeMl, 0);
  assert.match(finalStep.hybridInstruction || finalStep.note, /drawdown|stir|measured ice/i);
  assert.ok(plan.steps.slice(0, -1).some((step) => step.pourVolumeMl > 0));
});

test('buildAiBrewPlan flags derived grinder baselines for provenance', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Derived Grind',
    grinderId: 'hario-mini-slim',
    waterTdsPpm: '90',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.equal(plan.deviceProfileMode, 'exact');
  assert.equal(plan.grindSettingMode, 'derived_baseline');
  assert.equal(plan.grindSettingVerification, 'fallback');
  assert.equal(plan.provenanceAttentionNeeded, true);
});

test('buildAiBrewPlan target profiles shift ratio, time, and deterministic pour-map structure in the expected direction', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Target Profile QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const balance = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'balance_clean',
  }, catalog);
  const sweetness = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'more_sweetness',
  }, catalog);
  const acidity = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'more_acidity',
  }, catalog);
  const body = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'more_body',
  }, catalog);

  assert.equal(balance.targetProfileLabel, 'Balance & Clean');
  assert.equal(sweetness.targetProfileLabel, 'More Sweetness');
  assert.equal(acidity.targetProfileLabel, 'More Acidity');
  assert.equal(body.targetProfileLabel, 'More Body');

  assert.ok(sweetness.recommendedRatio < balance.recommendedRatio);
  assert.ok(body.recommendedRatio < sweetness.recommendedRatio);
  assert.ok(acidity.recommendedRatio > balance.recommendedRatio);

  assert.ok(sweetness.waterTempC >= balance.waterTempC);
  assert.ok(body.waterTempC >= balance.waterTempC);
  assert.ok(acidity.waterTempC <= balance.waterTempC);

  assert.ok(sweetness.totalTimeSeconds > balance.totalTimeSeconds);
  assert.ok(body.totalTimeSeconds >= sweetness.totalTimeSeconds);
  assert.ok(acidity.totalTimeSeconds < balance.totalTimeSeconds);

  const balanceStepStarts = balance.steps.map((step) => step.startSeconds);
  const sweetnessStepStarts = sweetness.steps.map((step) => step.startSeconds);
  const acidityStepStarts = acidity.steps.map((step) => step.startSeconds);

  assert.notDeepEqual(sweetnessStepStarts, balanceStepStarts);
  assert.notDeepEqual(acidityStepStarts, balanceStepStarts);
  assert.ok(sweetnessStepStarts[sweetnessStepStarts.length - 1] > balanceStepStarts[balanceStepStarts.length - 1]);
  assert.ok(acidityStepStarts[acidityStepStarts.length - 1] < balanceStepStarts[balanceStepStarts.length - 1]);

  const getCadenceIntervals = (plan: ReturnType<typeof buildAiBrewPlan>) => {
    const starts = plan.steps.map((step) => step.startSeconds);
    const intervals: number[] = [];
    for (let index = 0; index < starts.length - 1; index += 1) {
      intervals.push(starts[index + 1] - starts[index]);
    }
    intervals.push(plan.totalTimeSeconds - starts[starts.length - 1]);
    return intervals;
  };

  const acidityIntervals = getCadenceIntervals(acidity);
  const bodyIntervals = getCadenceIntervals(body);
  assert.ok(acidityIntervals[acidityIntervals.length - 1] > bodyIntervals[bodyIntervals.length - 1]);
  assert.ok(bodyIntervals[0] >= acidityIntervals[0]);

  const getShareMap = (plan: ReturnType<typeof buildAiBrewPlan>) => plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);
  const balanceShares = getShareMap(balance);
  const sweetnessShares = getShareMap(sweetness);
  const acidityShares = getShareMap(acidity);
  const bodyShares = getShareMap(body);

  assert.ok(bodyShares[0] > balanceShares[0]);
  assert.ok(bodyShares[bodyShares.length - 1] < balanceShares[balanceShares.length - 1]);
  assert.ok(acidityShares[0] < balanceShares[0]);
  assert.ok(acidityShares[acidityShares.length - 1] > balanceShares[balanceShares.length - 1]);
  assert.ok(sweetnessShares[1] > balanceShares[1]);

  assert.match(sweetness.summary, /more sweetness/i);
  assert.match(acidity.summary, /more acidity/i);
  assert.match(body.summary, /more body/i);
});

test('target profile calibration follows stable ids when labels are localized or customized', () => {
  const localizedCatalog: AiBrewCatalog = {
    ...catalog,
    targetProfiles: catalog.targetProfiles?.map((profile) => ({
      ...profile,
      label: profile.id === 'more_acidity'
        ? 'Terang Juicy'
        : profile.id === 'more_body'
          ? 'Tekstur Tebal'
          : profile.id === 'more_sweetness'
            ? 'Manis Bersih'
            : 'Seimbang Harian',
    })),
  };
  const baseInput = {
    ...createDefaultAiBrewFormState(localizedCatalog),
    coffeeName: 'Localized Target QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const balance = buildAiBrewPlan({ ...baseInput, targetProfileId: 'balance_clean' }, localizedCatalog);
  const acidity = buildAiBrewPlan({ ...baseInput, targetProfileId: 'more_acidity' }, localizedCatalog);
  const sweetness = buildAiBrewPlan({ ...baseInput, targetProfileId: 'more_sweetness' }, localizedCatalog);
  const body = buildAiBrewPlan({ ...baseInput, targetProfileId: 'more_body' }, localizedCatalog);

  assert.equal(acidity.targetProfileLabel, 'Terang Juicy');
  assert.equal(body.targetProfileLabel, 'Tekstur Tebal');
  assert.ok(acidity.recommendedRatio > balance.recommendedRatio);
  assert.ok(body.recommendedRatio < sweetness.recommendedRatio);
  assert.ok(getFinalWindowSeconds(acidity) > getFinalWindowSeconds(body));
  assert.ok(getPourShareMap(body)[0] > getPourShareMap(acidity)[0]);
  assert.ok(getPourShareMap(sweetness)[1] >= getPourShareMap(balance)[1]);
});

test('buildAiBrewPlan requires manual mineral inputs', () => {
  assert.throws(() => {
    buildAiBrewPlan({
      ...createDefaultAiBrewFormState(catalog),
      coffeeName: 'Missing Minerals',
    }, catalog);
  }, /Water TDS is required/);
});

test('buildAiBrewPlan uses autofill brand chemistry and tracks customization provenance', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Brand Autofill Brew',
    waterBrandId: 'evian-sg',
  }, catalog);

  assert.equal(plan.waterMode, 'brand');
  assert.equal(plan.waterBrandId, 'evian-sg');
  assert.equal(plan.waterBrandLabel, 'Evian');
  assert.equal(plan.waterPresetStatus, 'autofill');
  assert.equal(plan.waterMinerals.tdsPpm, 345);
  assert.ok(plan.confidenceNotes.some((note) => /Water source: Evian/i.test(note)));

  const customized = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Brand Customized Brew',
    waterBrandId: 'evian-sg',
    waterCustomized: true,
    waterTdsPpm: '120',
    waterHardnessPpm: '65',
    waterAlkalinityPpm: '45',
  }, catalog);

  assert.equal(customized.waterCustomized, true);
  assert.equal(customized.waterMinerals.tdsPpm, 120);
  assert.ok(customized.notes.some((note) => /adjusted manually/i.test(note)));
});

test('manual-required water brands preserve provenance but still require minerals', () => {
  assert.throws(() => {
    buildAiBrewPlan({
      ...createDefaultAiBrewFormState(catalog),
      coffeeName: 'Aqua Manual Required',
      waterBrandId: 'aqua-id',
    }, catalog);
  }, /Water TDS is required/);

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Aqua Manual Ready',
    waterBrandId: 'aqua-id',
    waterTdsPpm: '92',
    waterHardnessPpm: '54',
    waterAlkalinityPpm: '38',
  }, catalog);

  assert.equal(plan.waterBrandLabel, 'Aqua');
  assert.equal(plan.waterPresetStatus, 'manual_required');
});

test('bean profile fields apply bounded deterministic modifiers', () => {
  const baseline = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Baseline',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  const adjusted = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Adjusted',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    altitudeMasl: '1950',
    beanDensityGml: '0.74',
    roastDevelopment: 'underdeveloped',
    solubility: 'low',
  }, catalog);

  assert.equal(adjusted.beanProfile.active, true);
  assert.equal(adjusted.beanProfile.roastDevelopment, 'underdeveloped');
  assert.equal(adjusted.beanProfile.solubility, 'low');
  assert.notEqual(adjusted.recommendedRatio, baseline.recommendedRatio);
  assert.notEqual(adjusted.totalTimeSeconds, baseline.totalTimeSeconds);
  assert.notEqual(adjusted.grindBias, baseline.grindBias);

  const baselineShares = baseline.steps.map((step) => step.pourVolumeMl / baseline.hotWaterMl);
  const adjustedShares = adjusted.steps.map((step) => step.pourVolumeMl / adjusted.hotWaterMl);
  assert.ok(adjustedShares[0] < baselineShares[0]);
  assert.ok(adjustedShares[adjustedShares.length - 1] > baselineShares[baselineShares.length - 1]);

  const easyExtraction = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Easy Extraction',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    roastDevelopment: 'developed',
    solubility: 'high',
  }, catalog);

  const easyShares = easyExtraction.steps.map((step) => step.pourVolumeMl / easyExtraction.hotWaterMl);
  assert.ok(easyShares[0] > baselineShares[0]);
  assert.ok(easyShares[easyShares.length - 1] < baselineShares[baselineShares.length - 1]);

  const adjustedAgain = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Adjusted',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    altitudeMasl: '1950',
    beanDensityGml: '0.74',
    roastDevelopment: 'underdeveloped',
    solubility: 'low',
  }, catalog);

  assert.equal(adjusted.recommendedRatio, adjustedAgain.recommendedRatio);
  assert.equal(adjusted.waterTempC, adjustedAgain.waterTempC);
  assert.equal(adjusted.totalTimeSeconds, adjustedAgain.totalTimeSeconds);
  assert.equal(adjusted.grindRecommendation, adjustedAgain.grindRecommendation);
  assert.deepEqual(adjusted.steps.map((step) => step.pourVolumeMl), adjustedAgain.steps.map((step) => step.pourVolumeMl));
});

test('curated process and variety rules affect recipe math when available', () => {
  const neutral = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Neutral Brew',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  const expressive = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Expressive Brew',
    process: 'natural',
    variety: 'geisha',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.notEqual(expressive.recommendedRatio, neutral.recommendedRatio);
  assert.notEqual(expressive.totalTimeSeconds, neutral.totalTimeSeconds);
  assert.notEqual(expressive.grindBias, neutral.grindBias);
});

test('coffee origin cues steer neutral AI Brew plans in sensible directions', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
  };

  const eastAfrica = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Ethiopia Yirgacheffe QA',
  }, catalog);
  const brazil = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Brazil Cerrado QA',
  }, catalog);
  const centralAmerica = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Costa Rica Tarrazu QA',
  }, catalog);
  const andes = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Colombia Huila QA',
  }, catalog);
  const robusta = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Canephora Lowland QA',
  }, catalog);

  assertPlanEnvelope(eastAfrica);
  assertPlanEnvelope(brazil);
  assertPlanEnvelope(centralAmerica);
  assertPlanEnvelope(andes);
  assertPlanEnvelope(robusta);
  assert.ok(eastAfrica.recommendedRatio > brazil.recommendedRatio);
  assert.ok(eastAfrica.waterTempC <= brazil.waterTempC);
  assert.ok(eastAfrica.totalTimeSeconds <= brazil.totalTimeSeconds);
  assert.ok(eastAfrica.confidenceNotes.some((note) => /origin cue recognized/i.test(note)));
  assert.ok(brazil.confidenceNotes.some((note) => /origin cue recognized/i.test(note)));
  assert.ok(centralAmerica.confidenceNotes.some((note) => /central america cocoa citrus/i.test(note)));
  assert.ok(andes.confidenceNotes.some((note) => /andes balanced fruit/i.test(note)));
  assert.ok(robusta.confidenceNotes.some((note) => /robusta.*lowland body/i.test(note)));
  assert.ok(robusta.recommendedRatio < eastAfrica.recommendedRatio);
});

test('dose size calibrates ratio, temperature, time, and grind direction', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Dose Calibration QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
  };

  const lowDose = buildAiBrewPlan({
    ...baseInput,
    doseG: '12',
  }, catalog);
  const highDose = buildAiBrewPlan({
    ...baseInput,
    doseG: '24',
  }, catalog);

  assertPlanEnvelope(lowDose);
  assertPlanEnvelope(highDose);
  assert.ok(lowDose.recommendedRatio < highDose.recommendedRatio);
  assert.ok(lowDose.waterTempC > highDose.waterTempC);
  assert.ok(lowDose.totalTimeSeconds > highDose.totalTimeSeconds);
  assert.notEqual(lowDose.grindBias, highDose.grindBias);
  assert.ok(lowDose.confidenceNotes.some((note) => /dose calibration active/i.test(note)));
  assert.ok(highDose.confidenceNotes.some((note) => /dose calibration active/i.test(note)));
});

test('iced split adapts to target and coffee context instead of staying static', () => {
  const clarityIced = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Ethiopia Yirgacheffe Iced',
    brewMode: 'iced',
    roastLevel: 'light',
    targetProfileId: 'more_acidity',
    process: 'washed',
    waterMode: 'manual',
    waterTdsPpm: '80',
    waterHardnessPpm: '40',
    waterAlkalinityPpm: '28',
  }, catalog);
  const sweetnessIced = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Brazil Cerrado Iced',
    brewMode: 'iced',
    roastLevel: 'medium',
    targetProfileId: 'more_sweetness',
    process: 'natural',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  const clarityShare = clarityIced.hotWaterMl / clarityIced.totalWaterMl;
  const sweetnessShare = sweetnessIced.hotWaterMl / sweetnessIced.totalWaterMl;

  assert.ok(clarityShare < sweetnessShare);
  assert.ok(clarityIced.iceMl > 0);
  assert.ok(sweetnessIced.iceMl > 0);
});

test('method-family signatures produce distinct AI Brew envelopes and sequence maps', () => {
  const familyCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        id: 'chemex-three-cup',
        kind: 'dripper',
        name: 'Chemex Three Cup',
        brand: 'Chemex',
        typeLabel: 'Glass Brewer',
        description: 'Test Chemex brewer.',
        searchText: 'chemex three cup glass brewer',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/chemex'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'chemex',
        defaultProfileId: 'profile_chemex_hot',
      },
      {
        id: 'kalita-wave-185',
        kind: 'dripper',
        name: 'Kalita Wave 185',
        brand: 'Kalita',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Test Kalita brewer.',
        searchText: 'kalita wave 185 flat bottom dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/kalita'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'kalita_wave',
        defaultProfileId: 'profile_kalita_hot',
      },
      {
        id: 'april-brewer-test',
        kind: 'dripper',
        name: 'April Brewer Test',
        brand: 'April',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Test April brewer.',
        searchText: 'april brewer flat bottom dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/april'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'april',
        defaultProfileId: 'profile_april_hot',
      },
      {
        id: 'clever-dripper-test',
        kind: 'dripper',
        name: 'Clever Dripper Test',
        brand: 'Clever',
        typeLabel: 'Immersion Dripper',
        description: 'Test Clever brewer.',
        searchText: 'clever dripper immersion',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/clever'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'clever_dripper',
        defaultProfileId: 'profile_clever_hot',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        id: 'profile_chemex_hot',
        label: 'Chemex Hot',
        brewMode: 'hot',
        dripperIds: ['chemex-three-cup'],
        methodFamily: 'chemex',
        brewMethodId: 'chemex',
        exactMatch: true,
        filterStyle: 'cone',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Chemex baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Charge evenly.' },
          { id: 'main_1', label: 'Main Pour', share: 0.38, startSeconds: 45, note: 'Build the slurry.' },
          { id: 'main_2', label: 'Second Main', share: 0.22, startSeconds: 110, note: 'Keep filter wall clean.' },
          { id: 'finish', label: 'Finish', share: 0.16, startSeconds: 170, note: 'Finish to target.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/chemex-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_kalita_hot',
        label: 'Kalita Hot',
        brewMode: 'hot',
        dripperIds: ['kalita-wave-185'],
        methodFamily: 'kalita_wave',
        brewMethodId: 'kalita_wave',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Kalita baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Even saturation.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 98, note: 'Close evenly.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/kalita-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_april_hot',
        label: 'April Hot',
        brewMode: 'hot',
        dripperIds: ['april-brewer-test'],
        methodFamily: 'april',
        brewMethodId: 'april',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact April baseline.',
        steps: [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'First pulse.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Second pulse.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 82, note: 'Third pulse.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/april-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_clever_hot',
        label: 'Clever Hot',
        brewMode: 'hot',
        dripperIds: ['clever-dripper-test'],
        methodFamily: 'clever_dripper',
        brewMethodId: 'clever_dripper',
        exactMatch: true,
        filterStyle: 'immersion',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Clever baseline.',
        steps: [
          { id: 'charge', label: 'Charge', share: 0.5, startSeconds: 0, note: 'Start immersion.' },
          { id: 'top_up', label: 'Top Up', share: 0.3, startSeconds: 45, note: 'Complete water charge.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/clever-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
    ],
  };

  const baseInput = {
    ...createDefaultAiBrewFormState(familyCatalog),
    coffeeName: 'Family Signature QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const v60 = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'hario-v60',
  }, familyCatalog);
  const chemex = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'chemex-three-cup',
  }, familyCatalog);
  const kalita = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'kalita-wave-185',
  }, familyCatalog);
  const april = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'april-brewer-test',
  }, familyCatalog);
  const clever = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'clever-dripper-test',
  }, familyCatalog);

  assertPlanEnvelope(v60);
  assertPlanEnvelope(chemex);
  assertPlanEnvelope(kalita);
  assertPlanEnvelope(april);
  assertPlanEnvelope(clever);

  assert.ok(chemex.recommendedRatio > v60.recommendedRatio);
  assert.ok(chemex.totalTimeSeconds > v60.totalTimeSeconds);
  assert.ok(april.totalTimeSeconds < kalita.totalTimeSeconds);
  assert.ok(april.recommendedRatio > kalita.recommendedRatio);
  assert.ok(clever.recommendedRatio < v60.recommendedRatio);
  assert.ok(clever.totalTimeSeconds > v60.totalTimeSeconds);

  const v60Shares = v60.steps.map((step) => step.pourVolumeMl / v60.hotWaterMl);
  const kalitaShares = kalita.steps.map((step) => step.pourVolumeMl / kalita.hotWaterMl);
  const cleverShares = clever.steps.map((step) => step.pourVolumeMl / clever.hotWaterMl);

  assert.ok(v60Shares[v60Shares.length - 1] > v60Shares[0]);
  assert.ok(kalitaShares[1] > v60Shares[1]);
  assert.ok(cleverShares[0] > cleverShares[cleverShares.length - 1]);

  assert.match(v60.steps[0].note, /cone drain cleanly/i);
  assert.match(kalita.steps[1].hybridInstruction || '', /flat bed|bed level/i);
  assert.match(april.steps[1].hybridInstruction || '', /low-agitation|quick, settled opening|pulse/i);
  assert.match(chemex.steps[0].hybridInstruction || '', /thick chemex paper|thick filter/i);
  assert.match(clever.steps[clever.steps.length - 1].hybridInstruction || '', /open the valve|bed release/i);
  assert.notEqual(v60.steps[0].note, chemex.steps[0].note);
  assert.notEqual(kalita.steps[kalita.steps.length - 1].note, april.steps[april.steps.length - 1].note);

  assert.ok(chemex.confidenceNotes.some((note) => /method-family signature active: chemex/i.test(note)));
  assert.ok(april.confidenceNotes.some((note) => /method-family signature active: april/i.test(note)));
  assert.ok(clever.confidenceNotes.some((note) => /method-family signature active: clever dripper/i.test(note)));
});

test('all supported dripper families stay production-safe across hot and iced flows', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const baseInput = {
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'All Family QA',
    process: 'washed',
    variety: 'bourbon',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const plans = new Map<string, ReturnType<typeof buildAiBrewPlan>>();

  for (const targetProfileId of TARGET_PROFILE_MATRIX_IDS) {
    for (const brewMode of ['hot', 'iced'] as const) {
      for (const familyCase of ALL_METHOD_FAMILY_CASES) {
        const plan = buildAiBrewPlan({
          ...baseInput,
          targetProfileId,
          brewMode,
          dripperId: familyCase.dripperId,
        }, fullFamilyCatalog);

        plans.set(`${targetProfileId}:${brewMode}:${familyCase.family}`, plan);

        assertPlanEnvelope(plan);
        assert.equal(plan.methodFamily, familyCase.family);
        assert.equal(plan.targetProfileId, targetProfileId);
        assert.equal(
          plan.methodId,
          resolveExpectedRatioToolMethodIdForFamily(familyCase.family, brewMode),
        );
        assert.equal(
          plan.ratioToolMethodId,
          resolveExpectedRatioToolMethodIdForFamily(familyCase.family, brewMode),
        );
        assert.match(collectPlanNarrative(plan), familyCase.cue);
        assert.ok(
          plan.confidenceNotes.some((note) =>
            note.toLowerCase().includes(`method-family signature active: ${familyCase.family.replace(/_/g, ' ')}`)
          ),
        );

        if (brewMode === 'hot') {
          assert.equal(plan.iceMl, 0);
          assert.equal(plan.hotWaterMl, plan.totalWaterMl);
          assert.equal(plan.hotExtractionRatio, plan.recommendedRatio);
        } else {
          assert.ok(plan.iceMl > 0);
          assert.ok(plan.hotWaterMl < plan.totalWaterMl);
          assert.ok(plan.hotExtractionRatio < plan.finalBeverageRatio);
          assert.match(plan.summary, /final ratio 1:[\d.]+ with hot concentrate 1:[\d.]+/i);
        }

        const indonesianRecipeSteps = buildLocalizedPlanRecipeSteps(plan, 'id').join('\n');
        assert.doesNotMatch(indonesianRecipeSteps, /\btuang\s+0\b|\bpour\s+0\b/i);

        if (familyCase.family === 'clever_dripper') {
          const pourSteps = plan.steps.filter((step) => (step.kind || 'pour') === 'pour');
          assert.equal(pourSteps.length, 1);
          assert.equal(pourSteps[0].pourVolumeMl, plan.hotWaterMl);
          assert.ok(plan.steps.some((step) => step.kind === 'wait'));
          assert.ok(plan.steps.some((step) => step.kind === 'release'));
          assert.ok(plan.steps.every((step) => step.kind === 'pour' || step.pourVolumeMl === 0));
          assert.match(indonesianRecipeSteps, /tahan kontak|buka release/i);
        } else {
          assert.ok(plan.steps.every((step) => (step.kind || 'pour') === 'pour'));
          assert.ok(plan.steps.every((step) => step.pourVolumeMl > 0));
          assert.ok(getFinalWindowSeconds(plan) >= (brewMode === 'iced' ? 24 : 28));
        }
      }
    }
  }

  const getPlan = (brewMode: 'hot' | 'iced', family: AiBrewMethodFamily, targetProfileId = 'balance_clean') =>
    plans.get(`${targetProfileId}:${brewMode}:${family}`)!;
  const getIcedShare = (family: AiBrewMethodFamily) => getPlan('iced', family).hotWaterMl / getPlan('iced', family).totalWaterMl;

  assert.ok(getIcedShare('chemex') > getIcedShare('v60'));
  assert.ok(getIcedShare('clever_dripper') > getIcedShare('april'));
  assert.ok(getIcedShare('melitta') > getIcedShare('origami'));
  assert.ok(
    getIcedShare('kono') > getIcedShare('origami'),
    `Expected rounded Kono hot split to stay above Origami, got Kono ${getIcedShare('kono')} and Origami ${getIcedShare('origami')}`,
  );

  assert.ok(getPlan('hot', 'chemex').recommendedRatio > getPlan('hot', 'v60').recommendedRatio);
  assert.ok(getPlan('hot', 'april').totalTimeSeconds < getPlan('hot', 'kalita_wave').totalTimeSeconds);
  assert.ok(getPlan('hot', 'clever_dripper').totalTimeSeconds > getPlan('hot', 'v60').totalTimeSeconds);
  assert.ok(getPlan('hot', 'kono').totalTimeSeconds > getPlan('hot', 'origami').totalTimeSeconds);
  assert.ok(getPlan('hot', 'melitta').totalTimeSeconds >= getPlan('hot', 'kalita_wave').totalTimeSeconds);
  assert.ok(getFinalWindowSeconds(getPlan('hot', 'v60', 'more_acidity')) > getFinalWindowSeconds(getPlan('hot', 'v60', 'more_body')));
  assert.ok(getPourShareMap(getPlan('hot', 'v60', 'more_body'))[0] > getPourShareMap(getPlan('hot', 'v60', 'more_acidity'))[0]);
});

test('exact device profiles can own the ratio tool method id without losing family cues', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const sourceProfile = fullFamilyCatalog.deviceProfiles.find((profile) => profile.id === 'profile_matrix-v60-all_hot');
  assert.ok(sourceProfile);

  const overrideCatalog: AiBrewCatalog = {
    ...fullFamilyCatalog,
    drippers: fullFamilyCatalog.drippers.map((dripper) =>
      dripper.id === 'matrix-v60-all'
        ? { ...dripper, defaultProfileId: 'profile_matrix-v60-flat-override_hot' }
        : dripper
    ),
    deviceProfiles: [
      ...fullFamilyCatalog.deviceProfiles,
      {
        ...sourceProfile,
        id: 'profile_matrix-v60-flat-override_hot',
        label: 'V60 Flat Filter Override Hot',
        dripperIds: ['matrix-v60-all'],
        methodFamily: 'v60',
        brewMethodId: 'kalita_wave',
        filterStyle: 'flat',
        exactMatch: true,
      },
    ],
  };

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(overrideCatalog),
    coffeeName: 'Profile Override QA',
    dripperId: 'matrix-v60-all',
    targetProfileId: 'balance_clean',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, overrideCatalog);

  assert.equal(plan.methodFamily, 'v60');
  assert.equal(plan.methodId, 'kalita_wave');
  assert.equal(plan.ratioToolMethodId, 'kalita_wave');
  assert.match(collectPlanNarrative(plan), /cone drain cleanly|center-to-mid/i);
});

test('single-step clever charge-release profiles expand into timer-safe hold and release checkpoints', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const overrideCatalog: AiBrewCatalog = {
    ...fullFamilyCatalog,
    deviceProfiles: fullFamilyCatalog.deviceProfiles.map((profile) =>
      profile.id === 'profile_matrix-clever-all_iced'
        ? {
          ...profile,
          steps: [
            {
              id: 'charge_release',
              label: 'Charge and Release',
              share: 1,
              startSeconds: 0,
              note: 'Charge full hot-water target, steep briefly, then release over ice.',
            },
          ],
        }
        : profile
    ),
  };

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(overrideCatalog),
    coffeeName: 'Single Step Clever QA',
    brewMode: 'iced',
    dripperId: 'matrix-clever-all',
    targetProfileId: 'balance_clean',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, overrideCatalog);

  assertPlanEnvelope(plan);
  assert.deepEqual(plan.steps.map((step) => step.kind), ['pour', 'wait', 'release']);
  assert.equal(plan.steps[0].pourVolumeMl, plan.hotWaterMl);
  assert.equal(plan.steps[1].pourVolumeMl, 0);
  assert.equal(plan.steps[2].pourVolumeMl, 0);
  assert.ok(plan.steps[1].startSeconds > 0);
  assert.ok(plan.steps[2].startSeconds > plan.steps[1].startSeconds);
  assert.doesNotMatch(buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'), /\btuang\s+0\b|\bpour\s+0\b/i);
});

test('extraction finisher adapts watchpoints and rescue actions by dripper family', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const baseInput = {
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'Family Dial-In QA',
    process: 'washed',
    variety: 'bourbon',
    targetProfileId: 'more_sweetness',
    roastLevel: 'medium_light' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    doseG: '15',
  };

  const chemexHot = buildAiBrewPlan({
    ...baseInput,
    brewMode: 'hot',
    dripperId: 'matrix-chemex-all',
  }, fullFamilyCatalog);
  const cleverIced = buildAiBrewPlan({
    ...baseInput,
    brewMode: 'iced',
    dripperId: 'matrix-clever-all',
  }, fullFamilyCatalog);

  const chemexFinisher = buildExtractionFinisher(chemexHot, 'en');
  const cleverFinisher = buildExtractionFinisher(cleverIced, 'en');

  assert.ok(chemexFinisher.controlPoints.some((item) => /thick filter wall|thick filter/i.test(item)));
  assert.ok(cleverFinisher.controlPoints.some((item) => /immersion stay calm|release cleanly/i.test(item)));

  const chemexSour = chemexFinisher.adjustments.find((item) => item.taste === 'sour');
  const cleverSour = cleverFinisher.adjustments.find((item) => item.taste === 'sour');
  const chemexBitter = chemexFinisher.adjustments.find((item) => item.taste === 'bitter');
  const cleverBitter = cleverFinisher.adjustments.find((item) => item.taste === 'bitter');

  assert.match(chemexSour?.action || '', /bloom|filter wall|temperature/i);
  assert.match(cleverSour?.action || '', /steep|release/i);
  assert.match(chemexBitter?.action || '', /filter wall|paper|temperature/i);
  assert.match(cleverBitter?.action || '', /release|temperature/i);
  assert.notEqual(chemexSour?.action, cleverSour?.action);
  assert.notEqual(chemexBitter?.action, cleverBitter?.action);
});

test('deterministic ai coach markdown stays localized and family-aware', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'Kono QA',
    process: 'washed',
    variety: 'bourbon',
    brewMode: 'iced',
    dripperId: 'matrix-kono-all',
    targetProfileId: 'more_sweetness',
    roastLevel: 'medium_light',
    waterTdsPpm: '92',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '38',
    doseG: '15',
  }, fullFamilyCatalog);

  const explainMarkdown = buildDeterministicAiCoachMarkdown(plan, 'explain', 'id');
  const troubleshootMarkdown = buildDeterministicAiCoachMarkdown(plan, 'troubleshoot', 'id');
  const adjustMarkdown = buildDeterministicAiCoachMarkdown(plan, 'adjust', 'id');

  assert.match(explainMarkdown, /## Ringkasan/);
  assert.match(explainMarkdown, /jalur tuang lebih terpusat|sweet contact/i);
  assert.match(troubleshootMarkdown, /## Watchpoint/);
  assert.match(troubleshootMarkdown, /## Jika Asam/);
  assert.match(troubleshootMarkdown, /panas \/ .* es|Jangan ubah split/i);
  assert.match(adjustMarkdown, /## Geser dari/);
  assert.match(adjustMarkdown, /## Aturan Dial-In/);
  assert.match(adjustMarkdown, /lebih terpusat|sweet contact/i);
});

test('deterministic ai coach and finisher never recommend changing ratio or dose first', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'Manual Locked Iced QA',
    process: 'natural',
    variety: 'ethiopian_heirloom',
    brewMode: 'iced',
    dripperId: 'matrix-v60-all',
    targetProfileId: 'more_sweetness',
    targetRatio: '14.2',
    roastLevel: 'light',
    waterMode: 'manual',
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '32',
    doseG: '16',
  }, fullFamilyCatalog);
  const unsafeChangePattern = /\b(?:tighten|open|raise|increase|extend|shorten|reduce)\s+(?:the\s+)?(?:brew\s+|shot\s+|concentrate\s+|target\s+)?(?:ratio|dose|yield)\b|perketat\s+rasio|naikkan\s+dose|tambah\s+yield|kurangi\s+yield|\bubah\s+(?:rasio|dosis)/i;

  const troubleshootMarkdown = buildDeterministicAiCoachMarkdown(plan, 'troubleshoot', 'en');
  const adjustMarkdown = buildDeterministicAiCoachMarkdown(plan, 'adjust', 'en');
  const localizedTroubleshootMarkdown = buildDeterministicAiCoachMarkdown(plan, 'troubleshoot', 'id');
  const localizedAdjustMarkdown = buildDeterministicAiCoachMarkdown(plan, 'adjust', 'id');
  const finisher = buildExtractionFinisher(plan, 'en');

  assert.match(troubleshootMarkdown, /Dose 16 g.*ratio.*locked.*coach does not change ratio\/dose/i);
  assert.match(troubleshootMarkdown, /User-set target ratio is locked/i);
  assert.match(localizedTroubleshootMarkdown, /Dosis 16 g.*rasio.*dikunci.*coach tidak mengubah rasio\/dosis/i);
  assert.match(localizedTroubleshootMarkdown, /Target ratio manual dikunci/i);

  for (const output of [troubleshootMarkdown, adjustMarkdown, localizedTroubleshootMarkdown, localizedAdjustMarkdown]) {
    assert.doesNotMatch(output, unsafeChangePattern);
  }
  for (const adjustment of finisher.adjustments) {
    assert.doesNotMatch(`${adjustment.action} ${adjustment.why}`, unsafeChangePattern);
  }
});

test('target-method calibration makes the same target behave differently across dripper families', () => {
  const matrixCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        id: 'kalita-wave-185-matrix',
        kind: 'dripper',
        name: 'Kalita Wave 185 Matrix',
        brand: 'Kalita',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Matrix Kalita brewer.',
        searchText: 'kalita wave 185 matrix dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/kalita-matrix'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'kalita_wave',
        defaultProfileId: 'profile_kalita_hot_matrix',
      },
      {
        id: 'april-brewer-matrix',
        kind: 'dripper',
        name: 'April Brewer Matrix',
        brand: 'April',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Matrix April brewer.',
        searchText: 'april brewer matrix dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/april-matrix'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'april',
        defaultProfileId: 'profile_april_hot_matrix',
      },
      {
        id: 'clever-dripper-matrix',
        kind: 'dripper',
        name: 'Clever Dripper Matrix',
        brand: 'Clever',
        typeLabel: 'Immersion Dripper',
        description: 'Matrix Clever brewer.',
        searchText: 'clever dripper matrix immersion',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/clever-matrix'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'clever_dripper',
        defaultProfileId: 'profile_clever_hot_matrix',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        id: 'profile_kalita_hot_matrix',
        label: 'Kalita Hot Matrix',
        brewMode: 'hot',
        dripperIds: ['kalita-wave-185-matrix'],
        methodFamily: 'kalita_wave',
        brewMethodId: 'kalita_wave',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Kalita matrix baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Even saturation.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 98, note: 'Close evenly.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/kalita-matrix-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_april_hot_matrix',
        label: 'April Hot Matrix',
        brewMode: 'hot',
        dripperIds: ['april-brewer-matrix'],
        methodFamily: 'april',
        brewMethodId: 'april',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact April matrix baseline.',
        steps: [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'First pulse.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Second pulse.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 82, note: 'Third pulse.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/april-matrix-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_clever_hot_matrix',
        label: 'Clever Hot Matrix',
        brewMode: 'hot',
        dripperIds: ['clever-dripper-matrix'],
        methodFamily: 'clever_dripper',
        brewMethodId: 'clever_dripper',
        exactMatch: true,
        filterStyle: 'immersion',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Clever matrix baseline.',
        steps: [
          { id: 'charge', label: 'Charge', share: 0.5, startSeconds: 0, note: 'Start immersion.' },
          { id: 'top_up', label: 'Top Up', share: 0.3, startSeconds: 45, note: 'Complete water charge.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/clever-matrix-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
    ],
  };

  const baseInput = {
    ...createDefaultAiBrewFormState(matrixCatalog),
    coffeeName: 'Target Method Matrix QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const v60Acidity = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'hario-v60',
    targetProfileId: 'more_acidity',
  }, matrixCatalog);
  const kalitaAcidity = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'kalita-wave-185-matrix',
    targetProfileId: 'more_acidity',
  }, matrixCatalog);
  const v60Body = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'hario-v60',
    targetProfileId: 'more_body',
  }, matrixCatalog);
  const kalitaBody = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'kalita-wave-185-matrix',
    targetProfileId: 'more_body',
  }, matrixCatalog);
  const aprilSweetness = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'april-brewer-matrix',
    targetProfileId: 'more_sweetness',
  }, matrixCatalog);
  const cleverSweetness = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'clever-dripper-matrix',
    targetProfileId: 'more_sweetness',
  }, matrixCatalog);

  assertPlanEnvelope(v60Acidity);
  assertPlanEnvelope(kalitaAcidity);
  assertPlanEnvelope(v60Body);
  assertPlanEnvelope(kalitaBody);
  assertPlanEnvelope(aprilSweetness);
  assertPlanEnvelope(cleverSweetness);

  const getShareMap = (plan: ReturnType<typeof buildAiBrewPlan>) => plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);
  const v60AcidityShares = getShareMap(v60Acidity);
  const kalitaAcidityShares = getShareMap(kalitaAcidity);
  const v60BodyShares = getShareMap(v60Body);
  const kalitaBodyShares = getShareMap(kalitaBody);
  const aprilSweetnessShares = getShareMap(aprilSweetness);
  const cleverSweetnessShares = getShareMap(cleverSweetness);

  assert.ok(v60Acidity.recommendedRatio > kalitaAcidity.recommendedRatio);
  assert.ok(v60AcidityShares[v60AcidityShares.length - 1] > kalitaAcidityShares[kalitaAcidityShares.length - 1]);
  assert.ok(kalitaBody.totalTimeSeconds > v60Body.totalTimeSeconds);
  assert.ok(kalitaBodyShares[1] > v60BodyShares[1]);
  assert.ok(aprilSweetness.totalTimeSeconds < cleverSweetness.totalTimeSeconds);
  assert.ok(cleverSweetnessShares[0] > aprilSweetnessShares[0]);
  assert.ok(aprilSweetnessShares[1] >= cleverSweetnessShares[1]);

  assert.ok(kalitaBody.confidenceNotes.some((note) => /target-method calibration active: body x kalita wave/i.test(note)));
  assert.ok(aprilSweetness.confidenceNotes.some((note) => /target-method calibration active: sweetness x april/i.test(note)));
  assert.ok(cleverSweetness.confidenceNotes.some((note) => /target-method calibration active: sweetness x clever dripper/i.test(note)));
});

test('origin-target-method calibration makes origin cues react differently across dripper families', () => {
  const originCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        id: 'kalita-wave-185-origin',
        kind: 'dripper',
        name: 'Kalita Wave 185 Origin',
        brand: 'Kalita',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Origin Kalita brewer.',
        searchText: 'kalita wave 185 origin dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/kalita-origin'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'kalita_wave',
        defaultProfileId: 'profile_kalita_hot_origin',
      },
      {
        id: 'april-brewer-origin',
        kind: 'dripper',
        name: 'April Brewer Origin',
        brand: 'April',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Origin April brewer.',
        searchText: 'april brewer origin dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/april-origin'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'april',
        defaultProfileId: 'profile_april_hot_origin',
      },
      {
        id: 'clever-dripper-origin',
        kind: 'dripper',
        name: 'Clever Dripper Origin',
        brand: 'Clever',
        typeLabel: 'Immersion Dripper',
        description: 'Origin Clever brewer.',
        searchText: 'clever dripper origin immersion',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/clever-origin'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'clever_dripper',
        defaultProfileId: 'profile_clever_hot_origin',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        id: 'profile_kalita_hot_origin',
        label: 'Kalita Hot Origin',
        brewMode: 'hot',
        dripperIds: ['kalita-wave-185-origin'],
        methodFamily: 'kalita_wave',
        brewMethodId: 'kalita_wave',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Kalita origin baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Even saturation.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 98, note: 'Close evenly.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/kalita-origin-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_april_hot_origin',
        label: 'April Hot Origin',
        brewMode: 'hot',
        dripperIds: ['april-brewer-origin'],
        methodFamily: 'april',
        brewMethodId: 'april',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact April origin baseline.',
        steps: [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'First pulse.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Second pulse.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 82, note: 'Third pulse.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/april-origin-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_clever_hot_origin',
        label: 'Clever Hot Origin',
        brewMode: 'hot',
        dripperIds: ['clever-dripper-origin'],
        methodFamily: 'clever_dripper',
        brewMethodId: 'clever_dripper',
        exactMatch: true,
        filterStyle: 'immersion',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Clever origin baseline.',
        steps: [
          { id: 'charge', label: 'Charge', share: 0.5, startSeconds: 0, note: 'Start immersion.' },
          { id: 'top_up', label: 'Top Up', share: 0.3, startSeconds: 45, note: 'Complete water charge.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/clever-origin-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
    ],
  };

  const baseInput = {
    ...createDefaultAiBrewFormState(originCatalog),
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const ethiopiaV60Acidity = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Ethiopia Yirgacheffe QA',
    dripperId: 'hario-v60',
    targetProfileId: 'more_acidity',
  }, originCatalog);
  const ethiopiaKalitaAcidity = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Ethiopia Yirgacheffe QA',
    dripperId: 'kalita-wave-185-origin',
    targetProfileId: 'more_acidity',
  }, originCatalog);
  const brazilAprilSweetness = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Brazil Cerrado QA',
    dripperId: 'april-brewer-origin',
    targetProfileId: 'more_sweetness',
  }, originCatalog);
  const brazilCleverSweetness = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Brazil Cerrado QA',
    dripperId: 'clever-dripper-origin',
    targetProfileId: 'more_sweetness',
  }, originCatalog);
  const gayoV60Body = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Gayo Sumatra QA',
    dripperId: 'hario-v60',
    targetProfileId: 'more_body',
  }, originCatalog);
  const gayoKalitaBody = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Gayo Sumatra QA',
    dripperId: 'kalita-wave-185-origin',
    targetProfileId: 'more_body',
  }, originCatalog);
  const yunnanV60Balanced = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Yunnan China QA',
    dripperId: 'hario-v60',
    targetProfileId: 'balance_clean',
  }, originCatalog);
  const yunnanKalitaBalanced = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Yunnan China QA',
    dripperId: 'kalita-wave-185-origin',
    targetProfileId: 'balance_clean',
  }, originCatalog);

  assertPlanEnvelope(ethiopiaV60Acidity);
  assertPlanEnvelope(ethiopiaKalitaAcidity);
  assertPlanEnvelope(brazilAprilSweetness);
  assertPlanEnvelope(brazilCleverSweetness);
  assertPlanEnvelope(gayoV60Body);
  assertPlanEnvelope(gayoKalitaBody);
  assertPlanEnvelope(yunnanV60Balanced);
  assertPlanEnvelope(yunnanKalitaBalanced);

  const getShareMap = (plan: ReturnType<typeof buildAiBrewPlan>) => plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);

  const ethiopiaV60Shares = getShareMap(ethiopiaV60Acidity);
  const ethiopiaKalitaShares = getShareMap(ethiopiaKalitaAcidity);
  const brazilAprilShares = getShareMap(brazilAprilSweetness);
  const brazilCleverShares = getShareMap(brazilCleverSweetness);
  const gayoV60Shares = getShareMap(gayoV60Body);
  const gayoKalitaShares = getShareMap(gayoKalitaBody);
  const yunnanV60Shares = getShareMap(yunnanV60Balanced);
  const yunnanKalitaShares = getShareMap(yunnanKalitaBalanced);

  assert.ok(ethiopiaV60Acidity.recommendedRatio > ethiopiaKalitaAcidity.recommendedRatio);
  assert.ok(ethiopiaV60Shares[ethiopiaV60Shares.length - 1] > ethiopiaKalitaShares[ethiopiaKalitaShares.length - 1]);
  assert.ok(brazilCleverSweetness.totalTimeSeconds > brazilAprilSweetness.totalTimeSeconds);
  assert.ok(brazilCleverShares[0] > brazilAprilShares[0]);
  assert.ok(gayoKalitaBody.totalTimeSeconds > gayoV60Body.totalTimeSeconds);
  assert.ok(gayoKalitaShares[1] > gayoV60Shares[1]);
  assert.ok(yunnanV60Balanced.recommendedRatio > yunnanKalitaBalanced.recommendedRatio);
  assert.ok(yunnanV60Shares[yunnanV60Shares.length - 1] > yunnanKalitaShares[yunnanKalitaShares.length - 1]);

  assert.ok(ethiopiaV60Acidity.confidenceNotes.some((note) => /origin-method calibration active: east africa floral x acidity x v60/i.test(note)));
  assert.ok(brazilCleverSweetness.confidenceNotes.some((note) => /origin-method calibration active: brazil sweet x sweetness x clever dripper/i.test(note)));
  assert.ok(gayoKalitaBody.confidenceNotes.some((note) => /origin-method calibration active: indonesia structured x body x kalita wave/i.test(note)));
  assert.ok(yunnanV60Balanced.confidenceNotes.some((note) => /origin-method calibration active: china yunnan fruit clarity x balanced x v60/i.test(note)));
});

test('Indonesian critical AI Brew trust copy stays localized and honest', () => {
  const localizedLeakPattern = /\b(Known bean|Partial bean|Unknown bean|Risk bean|Blocked \/ unsafe|safe baseline|taste feedback|confidence|warning|caution|valve closed|valve open|chamber load|Closed chamber|not guarantee|curated prediction)\b/i;
  const localizedCatalog = buildProductionAiBrewCatalogForTests();
  const base = {
    ...createDefaultAiBrewFormState(localizedCatalog),
    waterMode: 'manual' as const,
    waterCustomized: true,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const unknown = buildAiBrewPlan({
    ...base,
    coffeeName: '',
    process: '',
    variety: '',
    roastLevel: 'medium',
    dripperId: 'hario-v60',
  }, localizedCatalog);
  assert.equal(unknown.beanCoverage?.category, 'unknown_fallback');
  const unknownCopy = [
    unknown.beanCoverage?.label === 'Unknown bean / fallback' ? 'Bean belum lengkap' : unknown.beanCoverage?.label,
    ...(unknown.beanCoverage?.warnings || []),
    unknown.beanCoverage?.nextAction,
  ].filter(Boolean).map((item) => localizeAiBrewDynamicText(String(item), 'id')).join(' ');
  assert.match(unknownCopy, /Bean belum lengkap|Data beans tidak lengkap|baseline aman|feedback rasa/i);
  assert.doesNotMatch(unknownCopy, localizedLeakPattern);

  const known = buildAiBrewPlan({
    ...base,
    coffeeName: 'Washed Ethiopia QA',
    process: 'washed',
    variety: 'bourbon',
    roastLevel: 'light',
    dripperId: 'hario-v60',
  }, localizedCatalog);
  assert.ok(known.beanCoverage?.category === 'known_high' || known.beanCoverage?.category === 'partial_medium');
  const badgeText = resolveAiBrewConfidenceBadges(known, 'id').map((badge) => badge.label).join(' ');
  assert.match(badgeText, /Siap|Grinder resmi|Grinder kurasi|Profil alat exact|Template turunan|Fallback family/i);
  assert.doesNotMatch(badgeText, /\bReady|Device Exact|Grinder Official|Grinder Curated|Grinder Estimated|High Buffer|Manual Required\b/i);

  const switchUnsafe = buildAiBrewPlan({
    ...base,
    coffeeName: 'Switch 02 Body QA',
    process: 'wet_hulled',
    variety: 'bourbon',
    roastLevel: 'medium',
    dripperId: 'hario-switch-02',
    doseG: '20',
    targetWaterMl: '300',
    targetProfileId: 'more_body',
    switchPresetId: 'immersion_heavy_body',
  }, localizedCatalog);
  assert.equal(switchUnsafe.switchStepValidation?.status, 'blocked');
  const switchSafetyCopy = [
    switchUnsafe.switchStepValidation?.message,
    switchUnsafe.switchWatch,
    ...(switchUnsafe.switchTasteProgramme?.riskWarnings || []),
  ].filter(Boolean).map((item) => localizeAiBrewDynamicText(String(item), 'id')).join(' ');
  assert.match(switchSafetyCopy, /muatan ruang|batas aman|katup|Mode V60|hybrid konservatif/i);
  assert.doesNotMatch(switchSafetyCopy, localizedLeakPattern);

  const localizedSwitchSteps = buildLocalizedPlanRecipeSteps(switchUnsafe, 'id').join(' ');
  assert.match(localizedSwitchSteps, /Katup|Target|ml|Buka/i);
  assert.doesNotMatch(localizedSwitchSteps, /\bvalve closed|valve open|chamber load\b/i);

  const correction = buildTasteFeedbackCorrection(known, 'sour', 'id');
  const correctionCopy = `${correction.primaryCorrection} ${correction.backupCorrection} ${correction.guardrail}`;
  assert.match(correctionCopy, /ubah satu variabel|jangan ubah rasio\/dosis|rasa/i);
  assert.doesNotMatch(correctionCopy, localizedLeakPattern);
});

test('water chemistry extremes push AI Brew in opposite extraction directions', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Water Extremes QA',
    waterMode: 'manual' as const,
  };

  const softWater = buildAiBrewPlan({
    ...baseInput,
    waterTdsPpm: '65',
    waterHardnessPpm: '25',
    waterAlkalinityPpm: '20',
  }, catalog);
  const hardBufferedWater = buildAiBrewPlan({
    ...baseInput,
    waterTdsPpm: '180',
    waterHardnessPpm: '120',
    waterAlkalinityPpm: '85',
  }, catalog);

  assertPlanEnvelope(softWater);
  assertPlanEnvelope(hardBufferedWater);
  assert.ok(softWater.waterTempC > hardBufferedWater.waterTempC);
  assert.ok(softWater.recommendedRatio < hardBufferedWater.recommendedRatio);
  assert.ok(softWater.totalTimeSeconds < hardBufferedWater.totalTimeSeconds);
  assert.ok(softWater.warnings.some((note) => /too soft|too low alkalinity/i.test(note)));
  assert.ok(hardBufferedWater.warnings.some((note) => /too hard|too high alkalinity/i.test(note)));
});

test('AI Brew matrix stays deterministic across roast, target, water, process, and variety combinations', () => {
  const matrixCatalog = buildAllMethodFamilyCatalog();
  const baseGoldenInput = {
    ...createDefaultAiBrewFormState(matrixCatalog),
    waterMode: 'manual' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    grinderId: '1zpresso-k-ultra',
  };
  const scenarios: Array<{
    name: string;
    input: AiBrewFormState;
    expected?: {
      mode?: AiBrewFormState['brewMode'];
      family?: AiBrewMethodFamily;
      ratio?: [number, number];
      temp?: [number, number];
      time?: [number, number];
      minPours?: number;
      hasIce?: boolean;
    };
  }> = [
    {
      name: 'clarity_geisha_soft',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Clarity Geisha',
        roastLevel: 'light' as const,
        targetProfileId: 'more_acidity',
        process: 'natural',
        variety: 'geisha',
        waterMode: 'manual' as const,
        waterTdsPpm: '70',
        waterHardnessPpm: '35',
        waterAlkalinityPpm: '24',
        altitudeMasl: '1900',
        roastDevelopment: 'underdeveloped' as const,
        solubility: 'low' as const,
      },
      expected: { mode: 'hot', family: 'v60', ratio: [15.5, 17.5], temp: [92, 97], time: [140, 220], minPours: 3 },
    },
    {
      name: 'sweet_bourbon_balanced',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Sweet Bourbon',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'more_sweetness',
        process: 'washed',
        variety: 'bourbon',
        waterMode: 'manual' as const,
        waterTdsPpm: '95',
        waterHardnessPpm: '55',
        waterAlkalinityPpm: '40',
        roastDevelopment: 'balanced' as const,
        solubility: 'medium' as const,
      },
      expected: { mode: 'hot', family: 'v60', ratio: [14.6, 16.3], temp: [91, 96], time: [150, 240], minPours: 3 },
    },
    {
      name: 'body_pacamara_buffered',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Body Pacamara',
        roastLevel: 'medium_dark' as const,
        targetProfileId: 'more_body',
        process: 'wet_hulled',
        variety: 'pacamara',
        waterMode: 'manual' as const,
        waterTdsPpm: '170',
        waterHardnessPpm: '110',
        waterAlkalinityPpm: '82',
        roastDevelopment: 'developed' as const,
        solubility: 'high' as const,
      },
      expected: { mode: 'hot', family: 'v60', ratio: [13.5, 16.2], temp: [88, 94], time: [130, 205], minPours: 3 },
    },
    {
      name: 'iced_geisha_sweet',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Iced Geisha',
        brewMode: 'iced' as const,
        targetProfileId: 'more_sweetness',
        process: 'natural',
        variety: 'geisha',
        waterMode: 'manual' as const,
        waterTdsPpm: '85',
        waterHardnessPpm: '45',
        waterAlkalinityPpm: '32',
        roastLevel: 'light' as const,
        roastDevelopment: 'underdeveloped' as const,
        solubility: 'low' as const,
      },
      expected: { mode: 'iced', family: 'v60', ratio: [13, 15.3], temp: [90, 96], time: [155, 230], minPours: 3, hasIce: true },
    },
    {
      name: 'sumatra_lintong_wet_hulled_v60_hot',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Sumatra Lintong Lake Toba',
        process: 'wet_hulled',
        variety: 'mixed_variety',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_body',
      },
      expected: { mode: 'hot', family: 'v60', ratio: [13.8, 16], temp: [89, 94], time: [140, 205], minPours: 3 },
    },
    {
      name: 'ethiopia_yirgacheffe_washed_v60_hot',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Ethiopia Yirgacheffe Chelbesa',
        process: 'washed',
        variety: 'ethiopian_landrace_mix',
        roastLevel: 'light' as const,
        altitudeMasl: '2200',
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'v60', ratio: [15, 17], temp: [92, 97], time: [150, 220], minPours: 3 },
    },
    {
      name: 'panama_gesha_v60_iced',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Panama Boquete Gesha',
        brewMode: 'iced' as const,
        process: 'washed',
        variety: 'geisha',
        roastLevel: 'light' as const,
        targetProfileId: 'more_acidity',
      },
      expected: { mode: 'iced', family: 'v60', ratio: [13, 15.5], temp: [90, 96], time: [155, 230], minPours: 3, hasIce: true },
    },
    {
      name: 'brazil_cerrado_natural_kono_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kono-all',
        coffeeName: 'Brazil Cerrado Natural Yellow Bourbon',
        process: 'natural',
        variety: 'yellow_bourbon',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'hot', family: 'kono', ratio: [14, 16.5], temp: [89, 95], time: [145, 220], minPours: 3 },
    },
    {
      name: 'kenya_aa_washed_kalita_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kalita-all',
        coffeeName: 'Kenya AA Nyeri',
        process: 'washed',
        variety: 'sl28',
        roastLevel: 'medium_light' as const,
        altitudeMasl: '1800',
        targetProfileId: 'more_acidity',
      },
      expected: { mode: 'hot', family: 'kalita_wave', ratio: [15, 17.2], temp: [92, 97], time: [150, 225], minPours: 3 },
    },
    {
      name: 'guatemala_antigua_origami_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-origami-all',
        coffeeName: 'Guatemala Antigua Bourbon',
        process: 'washed',
        variety: 'bourbon',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'origami', ratio: [15, 17], temp: [91, 96], time: [145, 215], minPours: 3 },
    },
    {
      name: 'costa_rica_tarrazu_chemex_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-chemex-all',
        coffeeName: 'Costa Rica Tarrazu Caturra',
        process: 'washed',
        variety: 'caturra',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'chemex', ratio: [15, 17.5], temp: [91, 96], time: [160, 245], minPours: 3 },
    },
    {
      name: 'sumatra_gayo_chemex_iced',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-chemex-all',
        coffeeName: 'Sumatra Gayo Aceh',
        brewMode: 'iced' as const,
        process: 'wet_hulled',
        variety: 'ateng_super',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_body',
      },
      expected: { mode: 'iced', family: 'chemex', ratio: [13, 16], temp: [88, 95], time: [165, 260], minPours: 3, hasIce: true },
    },
    {
      name: 'colombia_excelso_april_iced',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-april-all',
        coffeeName: 'Colombia Excelso Huila',
        brewMode: 'iced' as const,
        process: 'washed',
        variety: 'castillo',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'iced', family: 'april', ratio: [13, 15.5], temp: [90, 96], time: [150, 230], minPours: 3, hasIce: true },
    },
    {
      name: 'indonesia_wine_process_melitta_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-melitta-all',
        coffeeName: 'Indonesia Wine Process Java',
        process: 'wine_process',
        variety: 'andungsari',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'hot', family: 'melitta', ratio: [14, 16.8], temp: [89, 95], time: [145, 235], minPours: 3 },
    },
    {
      name: 'vietnam_robusta_melitta_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-melitta-all',
        coffeeName: 'Vietnam Fine Robusta',
        process: 'washed',
        variety: 'robusta',
        roastLevel: 'medium_dark' as const,
        targetProfileId: 'more_body',
      },
      expected: { mode: 'hot', family: 'melitta', ratio: [13.5, 16.5], temp: [88, 95], time: [135, 245], minPours: 3 },
    },
    {
      name: 'decaf_colombia_clever_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-clever-all',
        coffeeName: 'Decaf Colombia Sugarcane',
        process: 'decaf',
        variety: 'castillo',
        roastLevel: 'medium' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'clever_dripper', ratio: [13.5, 16.5], temp: [86, 94], time: [130, 260], minPours: 1 },
    },
    {
      name: 'ecuador_sidra_origami_iced',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-origami-all',
        coffeeName: 'Ecuador Sidra Anaerobic Washed',
        brewMode: 'iced' as const,
        process: 'anaerobic_washed',
        variety: 'sidra',
        roastLevel: 'light' as const,
        targetProfileId: 'more_acidity',
      },
      expected: { mode: 'iced', family: 'origami', ratio: [13, 16], temp: [90, 96], time: [150, 240], minPours: 3, hasIce: true },
    },
    {
      name: 'colombia_pink_bourbon_v60_hot',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Colombia Pink Bourbon',
        process: 'washed',
        variety: 'pink_bourbon',
        roastLevel: 'light' as const,
        altitudeMasl: '1900',
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'hot', family: 'v60', ratio: [14.5, 16.8], temp: [91, 97], time: [150, 220], minPours: 3 },
    },
    {
      name: 'ethiopia_natural_heirloom_kalita_iced',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kalita-all',
        coffeeName: 'Ethiopia Natural Heirloom',
        brewMode: 'iced' as const,
        process: 'natural',
        variety: 'ethiopian_heirloom',
        roastLevel: 'light' as const,
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'iced', family: 'kalita_wave', ratio: [13, 15.8], temp: [89, 96], time: [150, 240], minPours: 3, hasIce: true },
    },
    {
      name: 'rwanda_bourbon_washed_april_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-april-all',
        coffeeName: 'Rwanda Bourbon Washed',
        process: 'washed',
        variety: 'bourbon',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'april', ratio: [15, 17.2], temp: [91, 96], time: [145, 215], minPours: 3 },
    },
    {
      name: 'burundi_red_bourbon_kono_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kono-all',
        coffeeName: 'Burundi Red Bourbon',
        process: 'washed',
        variety: 'bourbon',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'more_acidity',
      },
      expected: { mode: 'hot', family: 'kono', ratio: [15, 17.5], temp: [91, 97], time: [145, 220], minPours: 3 },
    },
    {
      name: 'mexico_typica_honey_chemex_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-chemex-all',
        coffeeName: 'Mexico Typica Honey',
        process: 'honey',
        variety: 'typica',
        roastLevel: 'medium' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'chemex', ratio: [14.5, 17], temp: [89, 95], time: [155, 240], minPours: 3 },
    },
    {
      name: 'peru_caturra_washed_v60_hot_low_dose',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Peru Caturra Washed',
        doseG: '10',
        process: 'washed',
        variety: 'caturra',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'v60', ratio: [15, 17], temp: [91, 96], time: [120, 205], minPours: 3 },
    },
    {
      name: 'java_andungsari_wet_hulled_high_dose',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kalita-all',
        coffeeName: 'Java Andungsari Wet Hulled',
        doseG: '20',
        process: 'wet_hulled',
        variety: 'andungsari',
        roastLevel: 'medium_dark' as const,
        targetProfileId: 'more_body',
      },
      expected: { mode: 'hot', family: 'kalita_wave', ratio: [13.5, 16.3], temp: [87, 94], time: [155, 245], minPours: 3 },
    },
    {
      name: 'panama_carbonic_maceration_chemex_iced',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-chemex-all',
        coffeeName: 'Panama Carbonic Maceration',
        brewMode: 'iced' as const,
        process: 'carbonic_maceration',
        variety: 'gesha',
        roastLevel: 'light' as const,
        targetProfileId: 'more_acidity',
      },
      expected: { mode: 'iced', family: 'chemex', ratio: [13, 16], temp: [89, 96], time: [160, 260], minPours: 3, hasIce: true },
    },
    {
      name: 'china_yunnan_catimor_melitta_iced',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-melitta-all',
        coffeeName: 'China Yunnan Catimor',
        brewMode: 'iced' as const,
        process: 'honey',
        variety: 'yunnan_catimor',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'iced', family: 'melitta', ratio: [13, 15.8], temp: [89, 96], time: [150, 245], minPours: 3, hasIce: true },
    },
    {
      name: 'papua_new_guinea_typica_origami_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-origami-all',
        coffeeName: 'Papua New Guinea Typica',
        process: 'washed',
        variety: 'typica',
        roastLevel: 'medium' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'origami', ratio: [15, 17], temp: [90, 96], time: [145, 215], minPours: 3 },
    },
    {
      name: 'india_s795_monsooned_kono_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kono-all',
        coffeeName: 'India S795 Monsooned',
        process: 'monsooned',
        variety: 's795',
        roastLevel: 'medium_dark' as const,
        targetProfileId: 'more_body',
      },
      expected: { mode: 'hot', family: 'kono', ratio: [13.5, 16.5], temp: [87, 94], time: [135, 235], minPours: 3 },
    },
    {
      name: 'laos_catimor_washed_april_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-april-all',
        coffeeName: 'Laos Bolaven Catimor',
        process: 'washed',
        variety: 'catimor',
        roastLevel: 'medium' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'april', ratio: [14.5, 17.3], temp: [90, 96], time: [140, 215], minPours: 3 },
    },
    {
      name: 'thailand_anaerobic_natural_kalita_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kalita-all',
        coffeeName: 'Thailand Anaerobic Natural',
        process: 'anaerobic_natural',
        variety: 'mixed_variety',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'hot', family: 'kalita_wave', ratio: [14, 16.7], temp: [88, 95], time: [145, 225], minPours: 3 },
    },
    {
      name: 'honduras_parainema_washed_v60_hot',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Honduras Parainema Washed',
        process: 'washed',
        variety: 'parainema',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'more_acidity',
      },
      expected: { mode: 'hot', family: 'v60', ratio: [15, 17.5], temp: [91, 97], time: [145, 220], minPours: 3 },
    },
    {
      name: 'el_salvador_pacas_honey_chemex_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-chemex-all',
        coffeeName: 'El Salvador Pacas Honey',
        process: 'honey',
        variety: 'pacas',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_sweetness',
      },
      expected: { mode: 'hot', family: 'chemex', ratio: [14, 16.8], temp: [89, 95], time: [155, 255], minPours: 3 },
    },
    {
      name: 'nicaragua_maragogipe_washed_origami_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-origami-all',
        coffeeName: 'Nicaragua Maragogipe',
        process: 'washed',
        variety: 'maragogipe',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'origami', ratio: [14.5, 16.8], temp: [91, 96], time: [150, 225], minPours: 3 },
    },
    {
      name: 'bolivia_caranavi_mixed_variety_v60_iced',
      input: {
        ...baseGoldenInput,
        coffeeName: 'Bolinda Caranavi La Paz',
        brewMode: 'iced' as const,
        process: 'washed',
        variety: 'mixed_variety',
        roastLevel: 'medium' as const,
        targetProfileId: 'more_sweetness',
        waterTdsPpm: '9',
        waterHardnessPpm: '6.6',
        waterAlkalinityPpm: '5.5',
        pourStyle: 'balanced' as const,
        pourCount: '3' as const,
      },
      expected: { mode: 'iced', family: 'v60', ratio: [13.9, 14.1], temp: [92, 93], time: [185, 200], minPours: 3, hasIce: true },
    },
    {
      name: 'bali_kintamani_semi_washed_melitta_hot',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-melitta-all',
        coffeeName: 'Bali Kintamani Semi Washed',
        process: 'semi_washed',
        variety: 'mixed_variety',
        roastLevel: 'medium' as const,
        targetProfileId: 'balance_clean',
      },
      expected: { mode: 'hot', family: 'melitta', ratio: [14.5, 17], temp: [89, 96], time: [145, 230], minPours: 3 },
    },
    {
      name: 'flores_bajawa_giling_basah_kono_iced',
      input: {
        ...baseGoldenInput,
        dripperId: 'matrix-kono-all',
        coffeeName: 'Flores Bajawa Giling Basah',
        brewMode: 'iced' as const,
        process: 'giling_basah',
        variety: 'mixed_variety',
        roastLevel: 'medium_dark' as const,
        targetProfileId: 'more_body',
      },
      expected: { mode: 'iced', family: 'kono', ratio: [13, 15.5], temp: [87, 94], time: [145, 240], minPours: 3, hasIce: true },
    },
  ];

  const results = scenarios.map((scenario) => ({
    name: scenario.name,
    first: buildAiBrewPlan(scenario.input, matrixCatalog),
    second: buildAiBrewPlan(scenario.input, matrixCatalog),
    expected: scenario.expected,
  }));

  for (const result of results) {
    assertPlanEnvelope(result.first);
    assert.equal(result.first.fingerprint, result.second.fingerprint);
    assert.equal(result.first.recommendedRatio, result.second.recommendedRatio);
    assert.equal(result.first.waterTempC, result.second.waterTempC);
    assert.equal(result.first.totalTimeSeconds, result.second.totalTimeSeconds);
    assert.deepEqual(
      result.first.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
      result.second.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
    );
    if (result.expected?.mode) assert.equal(result.first.brewMode, result.expected.mode);
    if (result.expected?.family) assert.equal(result.first.methodFamily, result.expected.family);
    if (result.expected?.ratio) {
      assert.ok(
        result.first.recommendedRatio >= result.expected.ratio[0] && result.first.recommendedRatio <= result.expected.ratio[1],
        `${result.name} ratio ${result.first.recommendedRatio} outside ${result.expected.ratio.join('-')}`,
      );
    }
    if (result.expected?.temp) {
      assert.ok(
        result.first.waterTempC >= result.expected.temp[0] && result.first.waterTempC <= result.expected.temp[1],
        `${result.name} temp ${result.first.waterTempC} outside ${result.expected.temp.join('-')}`,
      );
    }
    if (result.expected?.time) {
      const toleranceSeconds = 30;
      assert.ok(
        result.first.totalTimeSeconds >= result.expected.time[0] - toleranceSeconds
          && result.first.totalTimeSeconds <= result.expected.time[1] + toleranceSeconds,
        `${result.name} time ${result.first.totalTimeSeconds} outside ${result.expected.time.join('-')} (+/- ${toleranceSeconds}s)`,
      );
    }
    if (result.expected?.minPours) {
      const pourCount = result.first.steps.filter((step) => step.pourVolumeMl > 0).length;
      assert.ok(
        pourCount >= result.expected.minPours,
        `${result.name} positive pours ${pourCount} below ${result.expected.minPours}`,
      );
    }
    if (result.expected?.hasIce) {
      assert.ok(result.first.iceMl > 0);
      assert.equal(result.first.hotWaterMl + result.first.iceMl, result.first.totalWaterMl);
      assert.ok(result.first.estimatedCupOutputMl < result.first.totalWaterMl);
    }
  }

  const clarity = results.find((result) => result.name === 'clarity_geisha_soft')!.first;
  const sweetness = results.find((result) => result.name === 'sweet_bourbon_balanced')!.first;
  const body = results.find((result) => result.name === 'body_pacamara_buffered')!.first;
  const iced = results.find((result) => result.name === 'iced_geisha_sweet')!.first;

  assert.ok(clarity.recommendedRatio > sweetness.recommendedRatio);
  assert.ok(clarity.grindBias === 'coarser');
  assert.ok(clarity.warnings.some((note) => /too soft|too low alkalinity/i.test(note)));
  assert.ok(sweetness.grindBias === 'finer');
  assert.ok(body.waterTempC < sweetness.waterTempC);
  assert.ok(body.totalTimeSeconds <= sweetness.totalTimeSeconds);
  assert.ok(body.warnings.some((note) => /too hard|too high alkalinity/i.test(note)));
  assert.ok(iced.iceMl > 0);
  assert.ok(iced.hotWaterMl < iced.totalWaterMl);
  assert.ok(iced.grindBias === 'finer');
});

test('ai brew draft storage persists and merges with fallback defaults', () => {
  installLocalStorageMock();
  saveAiBrewFormDraft<Partial<AiBrewFormState>>({
    brewMode: 'iced',
    coffeeName: 'Stored Brew',
    doseG: '19',
  });

  const loaded = loadAiBrewFormDraft(createDefaultAiBrewFormState(catalog));
  assert.equal(loaded.brewMode, 'iced');
  assert.equal(loaded.coffeeName, 'Stored Brew');
  assert.equal(loaded.doseG, '19');
  assert.equal(loaded.dripperId, 'hario-v60');
});

test('ai brew catalog snapshot storage restores the last cached catalog', () => {
  installLocalStorageMock();
  saveCachedAiBrewCatalogSnapshot(catalog);

  const loaded = loadCachedAiBrewCatalogSnapshot();
  assert.ok(loaded);
  assert.equal(loaded?.catalogVersion, 'test-v2');
  assert.equal(loaded?.drippers[0]?.name, 'Hario V60');
  assert.equal(loaded?.processes[0]?.id, 'washed');
});

test('ai brew catalog snapshot storage rejects stale snapshots that miss target profiles', () => {
  installLocalStorageMock();
  localStorage.setItem('BARISTACHAW_AI_BREW_CATALOG_SNAPSHOT_V5', JSON.stringify({
    schemaVersion: 5,
    savedAt: Date.now(),
    payload: {
      ...catalog,
      targetProfiles: undefined,
    },
  }));

  assert.equal(loadCachedAiBrewCatalogSnapshot(), null);
});

test('ai brew catalog snapshot storage rejects stale snapshots that miss exact Switch variants', () => {
  installLocalStorageMock();
  localStorage.setItem('BARISTACHAW_AI_BREW_CATALOG_SNAPSHOT_V5', JSON.stringify({
    schemaVersion: 5,
    savedAt: Date.now(),
    payload: {
      ...catalog,
      drippers: catalog.drippers.filter((item) => item.id !== 'hario-switch-03'),
    },
  }));

  assert.equal(loadCachedAiBrewCatalogSnapshot(), null);
});

test('ai brew catalog snapshot storage rejects snapshots with visible legacy Switch entry', () => {
  installLocalStorageMock();
  localStorage.setItem('BARISTACHAW_AI_BREW_CATALOG_SNAPSHOT_V5', JSON.stringify({
    schemaVersion: 5,
    savedAt: Date.now(),
    payload: {
      ...catalog,
      drippers: catalog.drippers.map((item) => item.id === 'hario-switch'
        ? { ...item, hidden: false, deprecated: false }
        : item),
    },
  }));

  assert.equal(loadCachedAiBrewCatalogSnapshot(), null);
});

test('last generated brew plan storage restores matching catalog versions only', () => {
  installLocalStorageMock();
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Stored Plan',
    waterTdsPpm: '90',
    waterHardnessPpm: '50',
    waterAlkalinityPpm: '40',
  }, catalog);

  saveLastGeneratedBrewPlan(plan);

  assert.equal(loadLastGeneratedBrewPlan('test-v2')?.coffeeName, 'Stored Plan');
  assert.equal(loadLastGeneratedBrewPlan('other-version'), null);
});

test('ai brew storage write helpers stay crash-free when localStorage throws', () => {
  installLocalStorageMock({ throwOnSetItem: true });

  assert.doesNotThrow(() => {
    saveAiBrewFormDraft<Partial<AiBrewFormState>>({
      brewMode: 'hot',
      coffeeName: 'Storage blocked',
    });
  });

  assert.doesNotThrow(() => {
    saveCachedAiBrewCatalogSnapshot(catalog);
  });

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Blocked save plan',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.doesNotThrow(() => {
    saveLastGeneratedBrewPlan(plan);
  });
});


test('water chemistry formulas use requested GH/KH coefficients', () => {
  assert.equal(deriveHardnessFromCalciumMagnesium(22.4, 5.6), 79);
  assert.equal(deriveAlkalinityFromBicarbonate(56), 45.9);
});

test('validateWaterChemistryConsistency flags GH or KH above TDS', () => {
  const invalid = validateWaterChemistryConsistency(50, 55.1, 40);
  assert.match(invalid.join(' | '), /GH \(55.1\) exceeds TDS \(50\)/);

  const invalidKh = validateWaterChemistryConsistency(50, 40, 51.2);
  assert.match(invalidKh.join(' | '), /KH \(51.2\) exceeds TDS \(50\)/);

  const ok = validateWaterChemistryConsistency(120, 65, 44);
  assert.equal(ok.length, 0);
});
