import fs from 'node:fs';
import { execSync } from 'node:child_process';
import {
  buildAiBrewPlan,
  buildWorkflowAwareGuideSteps,
  createDefaultAiBrewFormState,
  supportsAiBrewIcedMode,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import {
  inferDripperMethodFamily,
  parseNumericRange,
} from '../../apps/web/src/features/ai-brew/catalog.ts';
import { validateBrewPlanOutput } from '../../apps/web/src/features/ai-brew/antiHallucination.ts';
import { buildTasteFeedbackCorrection } from '../../apps/web/src/features/ai-brew/experience.ts';
import { localizeAiBrewDynamicText } from '../../apps/web/src/features/ai-brew/localization.ts';
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
  RawDripperCatalogEntry,
  RawGrinderCatalogEntry,
  TargetProfile,
  VerificationLevel,
  WaterBrandProfile,
  WaterGuidance,
} from '../../apps/web/src/features/ai-brew/types.ts';

type AiBrewPlan = ReturnType<typeof buildAiBrewPlan>;

export interface AiBrewStressRunOptions {
  mode: 'hot' | 'iced';
  total: number;
}

type StressWaterCase = {
  id: string;
  label: string;
  risk: 'balanced' | 'soft' | 'high_buffer' | 'high_tds' | 'low_tds' | 'zero_mineral' | 'brand';
  input: Partial<AiBrewFormState>;
};

type StressBeanCase = {
  label: string;
  origin: string;
  expectation: 'classic' | 'risk' | 'unknown' | 'context';
  input: Partial<AiBrewFormState>;
};

type StressFailure = {
  index: number;
  mode: 'hot' | 'iced';
  dripperId: string;
  dripperName: string;
  methodFamily: string;
  targetProfileId: string;
  beanCase: string;
  grinderId: string;
  waterCase: string;
  reasons: string[];
  summary?: Record<string, unknown>;
};

type StressScores = {
  recipeEnvelopeSafety: number;
  methodGuideQuality: number;
  targetRasaFit: number;
  grinderConfidenceHonesty: number;
  waterHonesty: number;
  beanProcessRiskHonesty: number;
  expectedCupPlausibility: number;
  bahasaQuality: number;
  correctionLoopUsefulness: number;
  confidenceHonesty: number;
};

export interface AiBrewStressRunResult {
  mode: 'hot' | 'iced';
  summary: {
    requestedMode: 'hot' | 'iced';
    total: number;
    passed: number;
    visibleDrippers: number;
    icedSupportedDrippers: number;
    targets: number;
    processes: number;
    varieties: number;
    grinders: number;
    waterCases: number;
    beanCases: number;
    actualHotPlans: number;
    actualIcedPlans: number;
    unsupportedIcedFallbacks: number;
    methodCounts: Record<string, number>;
    targetCounts: Record<string, number>;
    roastCounts: Record<string, number>;
    processCounts: Record<string, number>;
    varietyCounts: Record<string, number>;
    grinderCounts: Record<string, number>;
    waterCounts: Record<string, number>;
    beanCoverageCounts: Record<string, number>;
    riskExpectationCounts: Record<string, number>;
    icedSplitStats: Record<string, number>;
    scoreMin: StressScores;
  };
  samples: Array<Record<string, unknown>>;
  failures: StressFailure[];
  artifactDir: string;
  files: string[];
}

const TARGET_PROFILE_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'more_body',
  'floral_transparent',
  'fruit_forward',
  'soft_round',
  'dense_comforting',
] as const;

const ROAST_LEVELS = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'] as const;

const REAL_BEAN_CASES: StressBeanCase[] = [
  { label: 'Ethiopia washed light floral', origin: 'Ethiopia', expectation: 'classic', input: { coffeeName: 'Ethiopia Yirgacheffe washed floral', process: 'washed', variety: 'ethiopian_heirloom', roastLevel: 'light', altitudeMasl: '2050', targetProfileId: 'floral_transparent' } },
  { label: 'Ethiopia natural fruit', origin: 'Ethiopia', expectation: 'classic', input: { coffeeName: 'Ethiopia Guji natural fruit', process: 'natural', variety: 'kurume', roastLevel: 'medium_light', targetProfileId: 'fruit_forward' } },
  { label: 'Kenya washed SL28 bright', origin: 'Kenya', expectation: 'classic', input: { coffeeName: 'Kenya Nyeri washed SL28', process: 'washed', variety: 'sl28', roastLevel: 'light', altitudeMasl: '1850', targetProfileId: 'more_acidity' } },
  { label: 'Colombia washed Castillo', origin: 'Colombia', expectation: 'classic', input: { coffeeName: 'Colombia Huila washed Castillo', process: 'washed', variety: 'castillo', roastLevel: 'medium_light' } },
  { label: 'Brazil natural Bourbon', origin: 'Brazil', expectation: 'classic', input: { coffeeName: 'Brazil Cerrado natural Bourbon', process: 'natural', variety: 'bourbon', roastLevel: 'medium', targetProfileId: 'more_sweetness' } },
  { label: 'Costa Rica honey Catuai', origin: 'Costa Rica', expectation: 'classic', input: { coffeeName: 'Costa Rica honey Catuai', process: 'honey', variety: 'catuai', roastLevel: 'medium_light', targetProfileId: 'more_sweetness' } },
  { label: 'Sumatra wet-hulled Mandheling', origin: 'Indonesia', expectation: 'risk', input: { coffeeName: 'Sumatra Mandheling wet hulled', process: 'wet_hulled', variety: 'ateng_super', roastLevel: 'medium', targetProfileId: 'more_body' } },
  { label: 'Panama Gesha washed', origin: 'Panama', expectation: 'classic', input: { coffeeName: 'Panama Gesha washed', process: 'washed', variety: 'gesha', roastLevel: 'light', targetProfileId: 'floral_transparent' } },
  { label: 'Burundi washed Bourbon', origin: 'Burundi', expectation: 'classic', input: { coffeeName: 'Burundi Kayanza washed Bourbon', process: 'washed', variety: 'bourbon', roastLevel: 'medium_light' } },
  { label: 'Rwanda washed Bourbon', origin: 'Rwanda', expectation: 'classic', input: { coffeeName: 'Rwanda washed Bourbon', process: 'washed', variety: 'red_bourbon', roastLevel: 'medium_light' } },
  { label: 'Vietnam robusta canephora', origin: 'Vietnam', expectation: 'risk', input: { coffeeName: 'Vietnam robusta canephora', process: 'robusta_washed', variety: 'fine_robusta', customVariety: 'robusta canephora', roastLevel: 'medium_dark', targetProfileId: 'dense_comforting' } },
  { label: 'Liberica Barako natural', origin: 'Philippines', expectation: 'risk', input: { coffeeName: 'Barako Liberica natural', process: 'liberica_natural', variety: 'barako_liberica', customVariety: 'liberica barako', roastLevel: 'medium' } },
  { label: 'Excelsa natural', origin: 'Southeast Asia', expectation: 'risk', input: { coffeeName: 'Excelsa natural lot', process: 'excelsa_natural', variety: 'excelsa', customVariety: 'excelsa', roastLevel: 'medium' } },
  { label: 'Colombia sugarcane decaf', origin: 'Colombia', expectation: 'risk', input: { coffeeName: 'Colombia sugarcane decaf', process: 'sugarcane_decaf', variety: 'caturra', roastLevel: 'medium', targetProfileId: 'soft_round' } },
  { label: 'Swiss Water decaf', origin: 'Global', expectation: 'risk', input: { coffeeName: 'Swiss Water decaf Bourbon', process: 'swiss_water_decaf', customProcess: 'swiss water process', variety: 'bourbon', roastLevel: 'medium' } },
  { label: 'Experimental anaerobic Gesha', origin: 'Colombia', expectation: 'risk', input: { coffeeName: 'Experimental anaerobic Gesha', process: 'natural_anaerobic', customProcess: 'experimental anaerobic natural', variety: 'gesha', roastLevel: 'medium_light', targetProfileId: 'fruit_forward' } },
  { label: 'Carbonic maceration lot', origin: 'Colombia', expectation: 'risk', input: { coffeeName: 'Carbonic maceration pink bourbon', process: 'carbonic_natural', customProcess: 'carbonic maceration natural', variety: 'pink_bourbon', roastLevel: 'medium_light' } },
  { label: 'Co-ferment fruit maceration', origin: 'Colombia', expectation: 'risk', input: { coffeeName: 'Fruit co-ferment lot', process: 'coferment', customProcess: 'fruit co-ferment maceration', variety: 'sidra', roastLevel: 'medium_light' } },
  { label: 'Unknown origin process', origin: 'Unknown', expectation: 'unknown', input: { coffeeName: '', process: '', variety: '', roastLevel: 'medium' } },
  { label: 'Dark house blend', origin: 'Blend', expectation: 'risk', input: { coffeeName: 'Dark roast house blend', process: 'washed', variety: '', roastLevel: 'dark', targetProfileId: 'soft_round' } },
];

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

function getCurrentAuditSha() {
  if (process.env.RELEASE_PROOF_SHA) return process.env.RELEASE_PROOF_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
  try {
    return execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

export function buildProductionAiBrewCatalogForStress(): AiBrewCatalog {
  const catalogVersion = 'production-stress-fixture';
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
    source: entry.source || 'stress-normalized',
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
      searchText: `${entry.name} ${entry.brand || ''} ${entry.type} ${entry.medium || ''}`.toLowerCase(),
      grindBands: {
        coarse: entry.coarse,
        medium: entry.medium,
        fine: entry.fine,
        parsedCoarse: parseNumericRange(entry.coarse),
        parsedMedium: parseNumericRange(entry.medium),
        parsedFine: parseNumericRange(entry.fine),
      },
      ...provenance(entry),
    }));

  const waterGuidanceFile = readJsonFile<{ item: WaterGuidance }>('apps/web/public/data/ai-brew/water-guidance.v2026-06.json');
  const switchProgrammesFile = readJsonFile<{
    publicPresets: NonNullable<AiBrewCatalog['switchPresets']>;
    internalProgrammes: NonNullable<AiBrewCatalog['switchProgrammes']>;
  }>('apps/web/public/data/ai-brew/switch-programmes.v2026-05.json');
  const switchDoseMatrixFile = readJsonFile<{ rows: NonNullable<AiBrewCatalog['switchDoseMatrix']> }>('apps/web/public/data/ai-brew/switch-dose-matrix.v2026-05.json');
  const switchTroubleshootingFile = readJsonFile<{ items: NonNullable<AiBrewCatalog['switchTroubleshooting']> }>('apps/web/public/data/ai-brew/switch-troubleshooting.v2026-05.json');
  const switchKnowledgeFile = readJsonFile<{ item: NonNullable<AiBrewCatalog['switchKnowledge']> }>('apps/web/public/data/ai-brew/switch-knowledge.v2026-05.json');

  return {
    catalogVersion,
    drippers,
    grinders,
    processes: readJsonItems<AiBrewCatalog['processes'][number]>('apps/web/public/data/ai-brew/processes.v2026-06.json'),
    varieties: readJsonItems<AiBrewCatalog['varieties'][number]>('apps/web/public/data/ai-brew/varieties.v2026-06.json'),
    waterBrands: buildStressWaterBrands(),
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

function buildStressWaterBrands(): WaterBrandProfile[] {
  type RawStressWater = {
    id?: string;
    brand_group_id?: string;
    market_code?: string;
    sku_label?: string;
    brand?: string;
    country_origin?: string;
    is_sparkling?: boolean;
    is_brew_ready?: boolean;
    brew_block_reason?: string[];
    tds_ppm?: number | null;
    coffee_parameters?: {
      hardness_ppm_as_caco3?: number | null;
      alkalinity_ppm_as_caco3?: number | null;
    };
    publish_state?: string;
    search_text?: string;
    data_quality?: { is_estimated?: boolean };
    primary_source?: { source_url?: string };
    sources?: Array<{ source_url?: string }>;
  };

  return readJsonItems<RawStressWater>('apps/web/public/data/catalog/phase1/waters.catalog.json')
    .filter((entry) => entry.is_brew_ready === true
      && entry.publish_state === 'published'
      && typeof entry.tds_ppm === 'number'
      && typeof entry.coffee_parameters?.hardness_ppm_as_caco3 === 'number'
      && typeof entry.coffee_parameters?.alkalinity_ppm_as_caco3 === 'number')
    .slice(0, 12)
    .map((entry): WaterBrandProfile => {
      const hardnessPpm = Number(entry.coffee_parameters?.hardness_ppm_as_caco3 || 0);
      const alkalinityPpm = Number(entry.coffee_parameters?.alkalinity_ppm_as_caco3 || 0);
      const sourceUrls = [
        entry.primary_source?.source_url,
        ...(entry.sources || []).map((source) => source.source_url),
      ].filter((url): url is string => Boolean(url));
      return {
        id: String(entry.id),
        brandGroupId: String(entry.brand_group_id || entry.id),
        marketCode: (entry.market_code || 'global') as WaterBrandProfile['marketCode'],
        skuLabel: String(entry.sku_label || entry.brand || entry.id),
        label: String(entry.brand || entry.sku_label || entry.id),
        shortLabel: String(entry.brand || entry.sku_label || entry.id),
        subtitle: String(entry.country_origin || ''),
        country: String(entry.country_origin || ''),
        markets: [(entry.market_code || 'global') as WaterBrandProfile['marketCode']],
        searchText: String(entry.search_text || `${entry.brand || ''} ${entry.sku_label || ''}`).toLowerCase(),
        notes: [],
        presetStatus: 'autofill',
        publishState: 'published',
        isBrewReady: true,
        brewBlockReason: entry.brew_block_reason || [],
        still: entry.is_sparkling !== true,
        recommendedForFilter: true,
        classification: alkalinityPpm >= 95 ? 'high_buffer' : hardnessPpm <= 40 ? 'soft_balanced' : 'balanced',
        classificationLabel: alkalinityPpm >= 95 ? 'Buffer tinggi' : hardnessPpm <= 40 ? 'Lunak seimbang' : 'Seimbang',
        classificationNote: 'Data brand digunakan untuk stress audit 1M.',
        chemistry: {
          tdsPpm: Number(entry.tds_ppm),
          hardnessPpm,
          alkalinityPpm,
        },
        resolvedMinerals: {
          tdsPpm: Number(entry.tds_ppm),
          hardnessPpm,
          alkalinityPpm,
          derivation: 'direct',
        },
        source: 'water-catalog-phase1',
        sourceUrls,
        verificationLevel: entry.data_quality?.is_estimated ? 'dataset_unverified' : 'curated',
        verifiedAt: '2026-06-01',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: entry.data_quality?.is_estimated ? 'low' : 'medium',
        catalogVersion: 'production-stress-fixture',
      };
    });
}

function buildWaterCases(catalog: AiBrewCatalog): StressWaterCase[] {
  const brandCases = catalog.waterBrands.slice(0, 12).map((water): StressWaterCase => ({
    id: water.id,
    label: `${water.shortLabel || water.label} brand`,
    risk: 'brand',
    input: {
      waterMode: 'brand',
      waterBrandId: water.id,
      waterCustomized: false,
      waterTdsPpm: '',
      waterHardnessPpm: '',
      waterAlkalinityPpm: '',
      waterNotes: water.classificationLabel,
    },
  }));
  return [
    ...brandCases,
    { id: 'manual-balanced', label: 'manual balanced 95/55/40', risk: 'balanced', input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '95', waterHardnessPpm: '55', waterAlkalinityPpm: '40', waterCustomized: true, waterNotes: 'balanced brew water' } },
    { id: 'manual-soft', label: 'manual soft 65/35/25', risk: 'soft', input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '65', waterHardnessPpm: '35', waterAlkalinityPpm: '25', waterCustomized: true, waterNotes: 'soft clarity water' } },
    { id: 'manual-high-buffer', label: 'manual high buffer 180/80/115', risk: 'high_buffer', input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '180', waterHardnessPpm: '80', waterAlkalinityPpm: '115', waterCustomized: true, waterNotes: 'high buffer water' } },
    { id: 'manual-high-tds', label: 'manual high TDS 260/130/95', risk: 'high_tds', input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '260', waterHardnessPpm: '130', waterAlkalinityPpm: '95', waterCustomized: true, waterNotes: 'high TDS water' } },
    { id: 'manual-low-tds', label: 'manual low TDS 35/18/12', risk: 'low_tds', input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '35', waterHardnessPpm: '18', waterAlkalinityPpm: '12', waterCustomized: true, waterNotes: 'low TDS water' } },
    { id: 'manual-zero-mineral', label: 'manual RO zero mineral 0/0/0', risk: 'zero_mineral', input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '0', waterHardnessPpm: '0', waterAlkalinityPpm: '0', waterCustomized: true, waterNotes: 'RO zero mineral base water' } },
  ];
}

function pickStressGrinderIds(catalog: AiBrewCatalog) {
  const preferred = [
    '1zpresso-k-ultra',
    'comandante-c40-mk4',
    'timemore-c3',
    'kingrinder-k6',
    'df64-gen2',
    'feima-600n',
    'baratza-encore',
    'fellow-ode-gen-2',
    'niche-zero',
  ];
  const byId = new Set(catalog.grinders.map((grinder) => grinder.id));
  const preferredExisting = preferred.filter((id) => byId.has(id));
  const lowConfidence = catalog.grinders
    .filter((grinder) => grinder.confidence === 'low' || grinder.verificationLevel === 'dataset_unverified')
    .slice(0, 4)
    .map((grinder) => grinder.id);
  return Array.from(new Set([...preferredExisting, ...lowConfidence])).slice(0, 14);
}

function resolveEffectiveBeanExpectation(
  useCatalogTaxonomy: boolean,
  beanCase: StressBeanCase,
  processEntry: AiBrewCatalog['processes'][number],
  varietyEntry: AiBrewCatalog['varieties'][number],
  roastLevel: AiBrewFormState['roastLevel'],
): StressBeanCase['expectation'] {
  if (!useCatalogTaxonomy) return beanCase.expectation;
  const riskTagText = [
    ...(processEntry.riskTags || []),
    ...(varietyEntry.riskTags || []),
    processEntry.processRisk?.variability,
    processEntry.processRisk?.recommendationMode,
  ].join(' ');
  const labelText = [
    processEntry.label,
    varietyEntry.label,
  ].join(' ');
  if (
    roastLevel === 'dark'
    || /decaf|experimental|ferment|non-arabica|canephora|robusta|liberica|excelsa|bitter|woody|earthy|muddy|taste-feedback|required/i.test(riskTagText)
    || /decaf|experimental|anaerobic|carbonic|co-?ferment|canephora|robusta|liberica|excelsa/i.test(labelText)
  ) {
    return 'risk';
  }
  return beanCase.expectation === 'unknown' ? 'unknown' : 'classic';
}

function increment(bucket: Record<string, number>, key: string | undefined) {
  const safeKey = key || 'unknown';
  bucket[safeKey] = (bucket[safeKey] || 0) + 1;
}

function minScores(current: StressScores, next: StressScores) {
  for (const key of Object.keys(current) as Array<keyof StressScores>) {
    current[key] = Math.min(current[key], next[key]);
  }
}

function summarizePlan(plan: AiBrewPlan) {
  return {
    dripperId: plan.dripper.id,
    dripperName: plan.dripper.name,
    methodFamily: plan.methodFamily,
    brewMode: plan.brewMode,
    targetProfileId: plan.targetProfileId,
    targetProfileLabel: plan.targetProfileLabel,
    doseG: plan.doseG,
    totalWaterMl: plan.totalWaterMl,
    hotWaterMl: plan.hotWaterMl,
    iceMl: plan.iceMl,
    ratio: plan.finalBeverageRatio,
    hotExtractionRatio: plan.hotExtractionRatio,
    tempC: plan.waterTempC,
    grind: plan.grindRecommendation,
    grinderName: plan.grinder.name,
    timeSeconds: plan.totalTimeSeconds,
    extractionEndSeconds: plan.extractionEndSeconds,
    guideEndSeconds: plan.guideEndSeconds,
    stepCount: plan.steps.length,
    beanCoverageCategory: plan.beanCoverage?.category,
    expectedCupConfidence: plan.expectedCupProfile?.confidence,
    grinderVerification: plan.grindSettingVerification,
  };
}

function collectNarrative(plan: AiBrewPlan) {
  const guide = plan.workflowGuideSteps || buildWorkflowAwareGuideSteps(plan);
  return [
    plan.summary,
    ...plan.steps.map((step) => `${step.label} ${step.kind || ''} ${step.note} ${step.hybridInstruction || ''}`),
    ...guide.map((step) => `${step.label} ${step.actionType} ${step.primaryText} ${step.secondaryText || ''} ${step.techniqueChips.map((chip) => `${chip.label} ${chip.value}`).join(' ')}`),
    ...(plan.warnings || []),
    ...(plan.confidenceNotes || []),
    ...(plan.beanCoverage?.warnings || []),
    ...(plan.expectedCupProfile?.warnings || []),
  ].join('\n');
}

function validateExpectedCup(plan: AiBrewPlan, reasons: string[]) {
  const cup = plan.expectedCupProfile;
  if (!cup) {
    reasons.push('missing expected cup profile');
    return;
  }
  for (const [key, value] of Object.entries({
    acidity: cup.acidity,
    sweetness: cup.sweetness,
    body: cup.body,
    clarity: cup.clarity,
    bitterRisk: cup.bitterRisk,
    aromaIntensity: cup.aromaIntensity,
  })) {
    if (!Number.isFinite(value) || value < 0 || value > 5) {
      reasons.push(`expected cup ${key} out of bounds: ${value}`);
    }
  }
}

function validatePlanEnvelope(plan: AiBrewPlan, requestedMode: 'hot' | 'iced', waterCase: StressWaterCase, beanCase: StressBeanCase, reasons: string[]) {
  const finiteValues: Array<[string, number]> = [
    ['dose', plan.doseG],
    ['total water', plan.totalWaterMl],
    ['hot water', plan.hotWaterMl],
    ['ice', plan.iceMl],
    ['ratio', plan.recommendedRatio],
    ['hot extraction ratio', plan.hotExtractionRatio],
    ['temperature', plan.waterTempC],
    ['total time', plan.totalTimeSeconds],
    ['extraction end', plan.extractionEndSeconds ?? -1],
    ['guide end', plan.guideEndSeconds ?? -1],
    ['estimated cup output', plan.estimatedCupOutputMl],
  ];
  for (const [label, value] of finiteValues) {
    if (!Number.isFinite(value)) reasons.push(`${label} is not finite`);
    if (value < 0) reasons.push(`${label} is negative`);
  }
  if (plan.recommendedRatio <= 0 || plan.recommendedRatio > 30) reasons.push(`ratio impossible: ${plan.recommendedRatio}`);
  const minTempC = plan.methodFamily === 'cold_brew' ? 0 : 78;
  if (plan.waterTempC < minTempC || plan.waterTempC > 98) reasons.push(`temperature unsafe: ${plan.waterTempC}`);
  if (!plan.steps.length) reasons.push('missing recipe steps');
  for (const [index, step] of plan.steps.entries()) {
    if (!Number.isFinite(step.startSeconds) || step.startSeconds < 0) reasons.push(`step ${index + 1} bad start`);
    if (!Number.isFinite(step.pourVolumeMl) || step.pourVolumeMl < 0) reasons.push(`step ${index + 1} bad pour`);
    if (!Number.isFinite(step.targetVolumeMl) || step.targetVolumeMl < 0) reasons.push(`step ${index + 1} bad target`);
    if (index > 0 && step.startSeconds < plan.steps[index - 1].startSeconds) reasons.push(`step ${index + 1} time moves backward`);
  }
  if ((plan.extractionEndSeconds ?? 0) > (plan.guideEndSeconds ?? 0)) reasons.push('extraction end exceeds guide end');
  const totalPoured = plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
  if (totalPoured !== plan.hotWaterMl) reasons.push(`pour sum ${totalPoured} does not equal hot water ${plan.hotWaterMl}`);
  if (plan.steps.at(-1)?.targetVolumeMl !== plan.hotWaterMl) reasons.push('final target does not equal hot water');

  if (requestedMode === 'hot') {
    if (plan.brewMode !== 'hot') reasons.push('hot request did not produce hot plan');
    if (plan.iceMl !== 0) reasons.push('hot plan has ice');
    if (plan.hotWaterMl !== plan.totalWaterMl) reasons.push('hot plan hot water differs from total water');
  }
  if (requestedMode === 'iced' && plan.brewMode === 'iced') {
    if (plan.hotWaterMl + plan.iceMl !== plan.totalWaterMl) reasons.push('iced split does not add to total');
    if (plan.iceMl <= 0) reasons.push('iced plan missing measured ice');
  }
  if (waterCase.risk === 'zero_mineral' && plan.expectedCupProfile?.confidence === 'high') reasons.push('zero mineral water produced high confidence');
  if (waterCase.risk === 'high_buffer' && plan.expectedCupProfile?.confidence === 'high') reasons.push('high-buffer water produced high confidence');
  if (beanCase.expectation === 'unknown' && plan.beanCoverage?.category !== 'unknown_fallback' && plan.beanCoverage?.category !== 'risk_caution') {
    reasons.push(`unknown bean produced ${plan.beanCoverage?.category}`);
  }
  if (beanCase.expectation === 'risk' && plan.beanCoverage?.category !== 'risk_caution') {
    reasons.push(`risk bean produced ${plan.beanCoverage?.category}`);
  }
}

function validateMethodNarrative(plan: AiBrewPlan, requestedMode: 'hot' | 'iced', waterCase: StressWaterCase, reasons: string[]) {
  const narrative = collectNarrative(plan);
  const operationalText = narrative.replace(plan.dripper.name, '');
  if (plan.methodFamily === 'hario_switch') {
    if (!/katup|valve|switch|muatan ruang|chamber/i.test(narrative)) reasons.push('Switch plan missing valve/chamber language');
  } else if (/Katup|muatan ruang|Switch 02|Switch 03|MUGEN x SWITCH/i.test(operationalText)) {
    reasons.push('non-Switch plan leaks Switch language');
  }
  if (plan.methodFamily === 'french_press' && /final pour|tuang akhir|drawdown bed|bloom \d/i.test(narrative)) reasons.push('French Press leaks pour-over wording');
  if (plan.methodFamily === 'espresso' && /bloom|air turun|drawdown|final pour|tuang akhir|kettle/i.test(narrative)) reasons.push('Espresso leaks filter workflow');
  if (plan.methodFamily === 'espresso' && !/dial|starting point|puck|yield|shot|aliran|flow/i.test(narrative)) reasons.push('Espresso missing dial-in guard');
  if (plan.methodFamily === 'moka_pot' && /bloom|final pour|tuang akhir/i.test(narrative)) reasons.push('Moka leaks bloom/final pour wording');
  if (plan.methodFamily === 'moka_pot' && /tamp/i.test(narrative) && !/no tamp|jangan tamp/i.test(narrative)) reasons.push('Moka includes tamp without no-tamp guard');
  if (plan.methodFamily === 'moka_pot' && !/sputter|sembur|boiler|basket/i.test(narrative)) reasons.push('Moka missing stop-before-sputter workflow');
  if (plan.methodFamily === 'french_press' && !/steep|rendam|settle|endapkan|decant|tuang pisah|press|tekan/i.test(narrative)) reasons.push('French Press missing steep/decant workflow');
  if (plan.methodFamily === 'cold_brew' && /hot extraction|ekstraksi panas|kettle|bloom/i.test(narrative)) reasons.push('Cold Brew leaks hot extraction wording');
  if (plan.methodFamily === 'batch_brew' && /manual pour|bloom pour|tuang tengah/i.test(narrative)) reasons.push('Batch Brewer leaks manual pour workflow');
  if (requestedMode === 'iced' && plan.brewMode === 'iced' && !/air panas|hot water|ice|es|konsentrat|server/i.test(narrative)) reasons.push('Iced plan missing hot water/ice guidance');
  if (requestedMode === 'hot' && /measured ice|es di server|ice in server/i.test(narrative)) reasons.push('Hot plan leaks iced split copy');
  if (waterCase.risk === 'zero_mineral' && !/mineral|RO|remineral|manual|zero|nol/i.test(narrative)) reasons.push('zero mineral water missing caution text');
  if (waterCase.risk === 'high_buffer' && !/buffer|alkalinity|alkalinitas|flat|muted|asam|clarity|jernih/i.test(narrative)) reasons.push('high-buffer water missing caution text');
}

function validateGuardrails(plan: AiBrewPlan, reasons: string[]) {
  const guard = validateBrewPlanOutput(plan);
  if (!guard.allowed) reasons.push(`anti-hallucination guard blocked plan: ${guard.reason || 'unknown'}`);
  const correction = buildTasteFeedbackCorrection(plan, 'sour', 'en');
  if (!correction.protectedNumbersLocked) reasons.push('taste correction does not lock protected numbers');
  const correctionText = `${correction.primaryCorrection} ${correction.backupCorrection}`;
  if (plan.methodFamily === 'espresso' && /add water|bloom|kettle/i.test(correctionText)) reasons.push('espresso correction leaks filter advice');
  if (plan.methodFamily === 'moka_pot' && /bloom|final pour/i.test(correctionText)) reasons.push('moka correction leaks filter advice');
  const grinderFallback = /fallback|derived|calibration|required|manual/i.test(`${plan.grindSettingMode} ${plan.grindSettingVerification} ${plan.grindCalibrationRequired} ${plan.grindSettingReference || ''}`);
  if (grinderFallback && plan.expectedCupProfile?.confidence === 'high') reasons.push('fallback grinder produced high confidence');
}

function validateIndonesianSample(plan: AiBrewPlan, reasons: string[]) {
  const localized = localizeAiBrewDynamicText([
    plan.summary,
    ...(plan.warnings || []),
    ...(plan.confidenceNotes || []),
    ...(plan.beanCoverage?.warnings || []),
  ].join(' '), 'id');
  if (/Additional details|Brew Guide|Expected cup|Confidence|Safety|Drawdown|Manual Required/i.test(localized)) {
    reasons.push('localized Indonesian sample leaks critical English');
  }
}

function scorePlan(plan: AiBrewPlan, reasons: string[], waterCase: StressWaterCase, beanCase: StressBeanCase): StressScores {
  const narrative = collectNarrative(plan);
  const guide = plan.workflowGuideSteps || [];
  const expectedCup = plan.expectedCupProfile;
  const score = (ok: boolean, strong = 96, weak = 86) => (ok ? strong : weak);
  const targetFits = Boolean(expectedCup) && (
    plan.targetProfileId === 'more_sweetness' ? (expectedCup?.sweetness || 0) >= 3
      : plan.targetProfileId === 'more_body' ? (expectedCup?.body || 0) >= 3
        : plan.targetProfileId === 'floral_transparent' ? (expectedCup?.clarity || 0) >= 3
          : true
  );
  const waterRiskHonest = waterCase.risk === 'balanced' || waterCase.risk === 'soft' || /water|air|buffer|mineral|manual|alkalinity|RO|remineral/i.test(narrative);
  const beanRiskHonest = beanCase.expectation !== 'risk' || /feedback|baseline|caution|hati-hati|sensitif|pahit|keruh|ferment|non-arabica/i.test(narrative);
  return {
    recipeEnvelopeSafety: reasons.length === 0 ? 99 : 80,
    methodGuideQuality: score(guide.length > 0 && /\d+\s*ml|\d+:\d{2}|shot|steep|press|decant|sputter|drawdown|air turun/i.test(narrative), 96, 88),
    targetRasaFit: score(targetFits, 95, 88),
    grinderConfidenceHonesty: score(!reasons.some((reason) => reason.includes('fallback grinder')), 96, 80),
    waterHonesty: score(waterRiskHonest, 95, 84),
    beanProcessRiskHonesty: score(beanRiskHonest, 95, 84),
    expectedCupPlausibility: score(Boolean(expectedCup) && reasons.every((reason) => !reason.startsWith('expected cup')), 96, 84),
    bahasaQuality: score(!reasons.some((reason) => reason.includes('Indonesian')), 95, 82),
    correctionLoopUsefulness: score(!reasons.some((reason) => reason.includes('correction')), 95, 84),
    confidenceHonesty: score(!reasons.some((reason) => reason.includes('confidence')), 95, 82),
  };
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    keys.join(','),
    ...rows.map((row) => keys.map((key) => escape(row[key])).join(',')),
  ].join('\n') + '\n';
}

function aggregateCountsToRows(counts: Record<string, number>, scoreMin: StressScores, label: string) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      [label]: key,
      count,
      recipeEnvelopeSafety: scoreMin.recipeEnvelopeSafety,
      methodGuideQuality: scoreMin.methodGuideQuality,
      confidenceHonesty: scoreMin.confidenceHonesty,
    }));
}

function mergeCounts(...buckets: Array<Record<string, number>>) {
  const merged: Record<string, number> = {};
  for (const bucket of buckets) {
    for (const [key, value] of Object.entries(bucket)) {
      merged[key] = (merged[key] || 0) + value;
    }
  }
  return merged;
}

function writeStressArtifacts(mode: 'hot' | 'iced', summary: AiBrewStressRunResult['summary'], samples: Array<Record<string, unknown>>, failures: StressFailure[]) {
  const sha = getCurrentAuditSha();
  const dir = `artifacts/ai-brew-audit/${mode}-500k-stress/${sha}`;
  fs.mkdirSync(dir, { recursive: true });
  const files = [
    `${dir}/summary.json`,
    `${dir}/samples.json`,
    `${dir}/failures.json`,
    `${dir}/method-scores.csv`,
    `${dir}/grinder-scores.csv`,
    `${dir}/water-scores.csv`,
    `${dir}/bean-risk-scores.csv`,
    `${dir}/recommendations.md`,
    `${dir}/improvement-prompt.md`,
  ];
  fs.writeFileSync(files[0], `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(files[1], `${JSON.stringify(samples, null, 2)}\n`, 'utf8');
  fs.writeFileSync(files[2], `${JSON.stringify(failures, null, 2)}\n`, 'utf8');
  fs.writeFileSync(files[3], toCsv(aggregateCountsToRows(summary.methodCounts, summary.scoreMin, 'method')), 'utf8');
  fs.writeFileSync(files[4], toCsv(aggregateCountsToRows(summary.grinderCounts, summary.scoreMin, 'grinder')), 'utf8');
  fs.writeFileSync(files[5], toCsv(aggregateCountsToRows(summary.waterCounts, summary.scoreMin, 'water')), 'utf8');
  fs.writeFileSync(files[6], toCsv(aggregateCountsToRows(summary.riskExpectationCounts, summary.scoreMin, 'beanRisk')), 'utf8');
  const recommendationText = buildRecommendationMarkdown(mode, summary, failures);
  fs.writeFileSync(files[7], recommendationText, 'utf8');
  fs.writeFileSync(files[8], buildImprovementPrompt(mode, summary, failures), 'utf8');
  return { dir, files };
}

function buildRecommendationMarkdown(mode: string, summary: AiBrewStressRunResult['summary'], failures: StressFailure[]) {
  const scoreRows = Object.entries(summary.scoreMin)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join('\n');
  const weakScores = Object.entries(summary.scoreMin).filter(([, value]) => value < 95);
  return [
    `# AI Brew ${mode.toUpperCase()} 500K Stress Recommendations`,
    '',
    `Generated cases: ${summary.total}`,
    `Passed cases: ${summary.passed}`,
    `Failures: ${failures.length}`,
    '',
    '## Minimum Scores',
    '| Area | Score |',
    '|---|---:|',
    scoreRows,
    '',
    '## Recommendation',
    failures.length === 0 && weakScores.length === 0
      ? 'No software blocker found. Keep physical brew validation separate before making sensory certainty claims.'
      : 'Patch only the listed weak/failing buckets. Do not change recipe math unless a failure explicitly proves a numeric envelope bug.',
    '',
    ...weakScores.map(([key, value]) => `- Strengthen ${key}: minimum score ${value}.`),
    ...failures.slice(0, 20).map((failure) => `- Case ${failure.index} ${failure.dripperName}: ${failure.reasons.join('; ')}`),
    '',
  ].join('\n');
}

function buildImprovementPrompt(mode: string, summary: AiBrewStressRunResult['summary'], failures: StressFailure[]) {
  return [
    `You are improving AI Brew after the ${mode} 500K software stress gate.`,
    `Total cases: ${summary.total}. Passed: ${summary.passed}. Failures: ${failures.length}.`,
    'Use only proven failure buckets from this artifact. Do not change recipe math unless the failure proves a math/envelope bug.',
    'Prioritize: guide copy, method leakage, grinder confidence, water honesty, bean risk honesty, and UI wording before recipe math.',
    failures.length === 0
      ? 'No blocking failure was found. Recommended next step: physical brew validation matrix and user taste feedback collection.'
      : `Top failures:\n${failures.slice(0, 30).map((failure) => `- ${failure.index} ${failure.dripperName}: ${failure.reasons.join('; ')}`).join('\n')}`,
    '',
  ].join('\n');
}

export function runAiBrewStressMatrix(options: AiBrewStressRunOptions): AiBrewStressRunResult {
  const catalog = buildProductionAiBrewCatalogForStress();
  const visibleDrippers = catalog.drippers.filter((dripper) => !dripper.hidden && !dripper.deprecated);
  const icedSupportedDrippers = visibleDrippers.filter((dripper) => supportsAiBrewIcedMode(catalog, dripper.id));
  const processEntries = catalog.processes.filter((entry) => entry.id);
  const varietyEntries = catalog.varieties.filter((entry) => entry.id);
  const waterCases = buildWaterCases(catalog);
  const grinderIds = pickStressGrinderIds(catalog);
  const base = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: options.mode,
    doseG: '15',
    targetWaterMl: '',
    grinderId: grinderIds[0],
    targetProfileId: 'balance_clean',
  };

  const scoreMin: StressScores = {
    recipeEnvelopeSafety: 100,
    methodGuideQuality: 100,
    targetRasaFit: 100,
    grinderConfidenceHonesty: 100,
    waterHonesty: 100,
    beanProcessRiskHonesty: 100,
    expectedCupPlausibility: 100,
    bahasaQuality: 100,
    correctionLoopUsefulness: 100,
    confidenceHonesty: 100,
  };
  const methodCounts: Record<string, number> = {};
  const targetCounts: Record<string, number> = {};
  const roastCounts: Record<string, number> = {};
  const processCounts: Record<string, number> = {};
  const varietyCounts: Record<string, number> = {};
  const grinderCounts: Record<string, number> = {};
  const waterCounts: Record<string, number> = {};
  const beanCoverageCounts: Record<string, number> = {};
  const riskExpectationCounts: Record<string, number> = {};
  const icedSplitStats = {
    exactSplitCount: 0,
    pourSumMatchesHotWaterCount: 0,
    finalTargetMatchesHotWaterCount: 0,
  };
  const samples: Array<Record<string, unknown>> = [];
  const failures: StressFailure[] = [];
  let actualHotPlans = 0;
  let actualIcedPlans = 0;
  let unsupportedIcedFallbacks = 0;

  for (let index = 0; index < options.total; index += 1) {
    const dripper = visibleDrippers[index % visibleDrippers.length];
    const targetProfileId = TARGET_PROFILE_IDS[Math.floor(index / visibleDrippers.length) % TARGET_PROFILE_IDS.length];
    const roastLevel = ROAST_LEVELS[Math.floor(index / (visibleDrippers.length * TARGET_PROFILE_IDS.length)) % ROAST_LEVELS.length];
    const processEntry = processEntries[index % processEntries.length];
    const varietyEntry = varietyEntries[Math.floor(index / processEntries.length) % varietyEntries.length];
    const beanCase = REAL_BEAN_CASES[index % REAL_BEAN_CASES.length];
    const waterCase = waterCases[Math.floor(index / (visibleDrippers.length * TARGET_PROFILE_IDS.length * ROAST_LEVELS.length)) % waterCases.length];
    const grinderId = grinderIds[index % grinderIds.length];
    const useCatalogTaxonomy = index % 5 !== 0 && beanCase.expectation !== 'unknown';
    const effectiveExpectation = resolveEffectiveBeanExpectation(useCatalogTaxonomy, beanCase, processEntry, varietyEntry, roastLevel);
    const methodFamily = dripper.methodFamily || 'v60';
    const doseG = methodFamily === 'espresso'
      ? '18'
      : methodFamily === 'cold_brew'
        ? '60'
        : methodFamily === 'batch_brew'
          ? '55'
          : String([12, 15, 18, 20][Math.floor(index / 23) % 4]);
    const targetWaterMl = methodFamily === 'espresso'
      ? '40'
      : methodFamily === 'cold_brew'
        ? '600'
        : methodFamily === 'batch_brew'
          ? '700'
          : '';
    const input: AiBrewFormState = {
      ...base,
      ...waterCase.input,
      ...beanCase.input,
      brewMode: options.mode,
      dripperId: dripper.id,
      targetProfileId,
      roastLevel,
      grinderId,
      doseG,
      targetWaterMl,
      coffeeName: beanCase.expectation === 'unknown'
        ? ''
        : `${beanCase.origin} ${useCatalogTaxonomy ? processEntry.label : beanCase.label} ${useCatalogTaxonomy ? varietyEntry.label : ''} ${roastLevel} ${options.mode} stress`,
      process: useCatalogTaxonomy ? processEntry.id : String(beanCase.input.process || ''),
      variety: useCatalogTaxonomy ? varietyEntry.id : String(beanCase.input.variety || ''),
      customProcess: useCatalogTaxonomy ? '' : String(beanCase.input.customProcess || ''),
      customVariety: useCatalogTaxonomy ? '' : String(beanCase.input.customVariety || ''),
    };

    let plan: AiBrewPlan | null = null;
    const reasons: string[] = [];
    try {
      plan = buildAiBrewPlan(input, catalog);
      validatePlanEnvelope(plan, options.mode, waterCase, { ...beanCase, expectation: effectiveExpectation }, reasons);
      validateExpectedCup(plan, reasons);
      validateMethodNarrative(plan, options.mode, waterCase, reasons);
      validateGuardrails(plan, reasons);
      if (index % 997 === 0) validateIndonesianSample(plan, reasons);
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : String(error));
    }

    if (plan) {
      if (plan.brewMode === 'hot') actualHotPlans += 1;
      if (plan.brewMode === 'iced') actualIcedPlans += 1;
      if (options.mode === 'iced' && plan.brewMode === 'hot' && !supportsAiBrewIcedMode(catalog, dripper.id)) unsupportedIcedFallbacks += 1;
      if (plan.brewMode === 'iced') {
        if (plan.hotWaterMl + plan.iceMl === plan.totalWaterMl) icedSplitStats.exactSplitCount += 1;
        if (plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0) === plan.hotWaterMl) icedSplitStats.pourSumMatchesHotWaterCount += 1;
        if (plan.steps.at(-1)?.targetVolumeMl === plan.hotWaterMl) icedSplitStats.finalTargetMatchesHotWaterCount += 1;
      }
      increment(methodCounts, plan.methodFamily);
      increment(targetCounts, plan.targetProfileId);
      increment(roastCounts, roastLevel);
      increment(processCounts, input.process || 'unknown');
      increment(varietyCounts, input.variety || 'unknown');
      increment(grinderCounts, grinderId);
      increment(waterCounts, waterCase.id);
      increment(beanCoverageCounts, plan.beanCoverage?.category);
      increment(riskExpectationCounts, effectiveExpectation);
      const scores = scorePlan(plan, reasons, waterCase, { ...beanCase, expectation: effectiveExpectation });
      minScores(scoreMin, scores);
      if (index % 4096 === 0 || reasons.length > 0 || effectiveExpectation !== 'classic') {
        if (samples.length < 320) {
          samples.push({
            index,
            requestedMode: options.mode,
            beanCase: beanCase.label,
            beanExpectation: effectiveExpectation,
            roastLevel,
            process: input.process || 'unknown',
            variety: input.variety || 'unknown',
            waterCase: waterCase.label,
            waterRisk: waterCase.risk,
            grinderId,
            scores,
            ...summarizePlan(plan),
          });
        }
      }
    }

    if (reasons.length > 0) {
      failures.push({
        index,
        mode: options.mode,
        dripperId: dripper.id,
        dripperName: dripper.name,
        methodFamily: String(dripper.methodFamily || 'unknown'),
        targetProfileId,
        beanCase: beanCase.label,
        grinderId,
        waterCase: waterCase.label,
        reasons,
        summary: plan ? summarizePlan(plan) : undefined,
      });
      if (failures.length > 500) break;
    }
  }

  const summary: AiBrewStressRunResult['summary'] = {
    requestedMode: options.mode,
    total: options.total,
    passed: options.total - failures.length,
    visibleDrippers: visibleDrippers.length,
    icedSupportedDrippers: icedSupportedDrippers.length,
    targets: TARGET_PROFILE_IDS.length,
    processes: processEntries.length,
    varieties: varietyEntries.length,
    grinders: grinderIds.length,
    waterCases: waterCases.length,
    beanCases: REAL_BEAN_CASES.length,
    actualHotPlans,
    actualIcedPlans,
    unsupportedIcedFallbacks,
    methodCounts,
    targetCounts,
    roastCounts,
    processCounts,
    varietyCounts,
    grinderCounts,
    waterCounts,
    beanCoverageCounts,
    riskExpectationCounts,
    icedSplitStats,
    scoreMin,
  };
  const artifacts = writeStressArtifacts(options.mode, summary, samples, failures);
  return {
    mode: options.mode,
    summary,
    samples,
    failures,
    artifactDir: artifacts.dir,
    files: artifacts.files,
  };
}

function writeAiBrewCombinedStressArtifacts(
  hot: AiBrewStressRunResult,
  iced: AiBrewStressRunResult,
  options: {
    slug: string;
    title: string;
    recommendationLabel: string;
    improvementLabel: string;
  },
) {
  const sha = getCurrentAuditSha();
  const dir = `artifacts/ai-brew-audit/${options.slug}/${sha}`;
  fs.mkdirSync(dir, { recursive: true });
  const failures = [...hot.failures, ...iced.failures];
  const total = hot.summary.total + iced.summary.total;
  const passed = hot.summary.passed + iced.summary.passed;
  const scoreMin: StressScores = { ...hot.summary.scoreMin };
  minScores(scoreMin, iced.summary.scoreMin);
  const summary = {
    total,
    passed,
    failures: failures.length,
    hot: hot.summary,
    iced: iced.summary,
    scoreMin,
    claim: 'AI Brew creates strong starting recipes and dial-in guidance; physical brew validation is still required for real-world taste certainty.',
  };
  const files = [
    `${dir}/summary.json`,
    `${dir}/samples.json`,
    `${dir}/failures.json`,
    `${dir}/method-scores.csv`,
    `${dir}/grinder-scores.csv`,
    `${dir}/water-scores.csv`,
    `${dir}/bean-risk-scores.csv`,
    `${dir}/recommendations.md`,
    `${dir}/improvement-prompt.md`,
  ];
  fs.writeFileSync(files[0], `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(files[1], `${JSON.stringify([...hot.samples, ...iced.samples].slice(0, 600), null, 2)}\n`, 'utf8');
  fs.writeFileSync(files[2], `${JSON.stringify(failures, null, 2)}\n`, 'utf8');
  fs.writeFileSync(files[3], toCsv(aggregateCountsToRows(mergeCounts(hot.summary.methodCounts, iced.summary.methodCounts), scoreMin, 'method')), 'utf8');
  fs.writeFileSync(files[4], toCsv(aggregateCountsToRows(mergeCounts(hot.summary.grinderCounts, iced.summary.grinderCounts), scoreMin, 'grinder')), 'utf8');
  fs.writeFileSync(files[5], toCsv(aggregateCountsToRows(mergeCounts(hot.summary.waterCounts, iced.summary.waterCounts), scoreMin, 'water')), 'utf8');
  fs.writeFileSync(files[6], toCsv(aggregateCountsToRows(mergeCounts(hot.summary.riskExpectationCounts, iced.summary.riskExpectationCounts), scoreMin, 'beanRisk')), 'utf8');
  fs.writeFileSync(files[7], [
    `# ${options.title} Recommendations`,
    '',
    `Total cases: ${total}`,
    `Passed cases: ${passed}`,
    `Failures: ${failures.length}`,
    '',
    failures.length === 0
      ? `No software blocker found in the ${options.recommendationLabel} stress gate. Continue with physical brew validation before sensory certainty claims.`
      : 'Patch the listed failures before release.',
    '',
  ].join('\n'), 'utf8');
  fs.writeFileSync(files[8], [
    `Use this prompt to improve AI Brew after the ${options.improvementLabel} software stress gate.`,
    `Total cases: ${total}; passed: ${passed}; failures: ${failures.length}.`,
    'Do not change recipe math unless a recorded failure proves a numeric envelope bug.',
    'If no failures remain, prioritize physical brew validation, field feedback, and documentation.',
    '',
  ].join('\n'), 'utf8');
  return {
    artifactDir: dir,
    files,
    total,
    passed,
    failures: failures.length,
    scoreMin,
  };
}

export function writeAiBrewAggregateStressArtifacts(hot: AiBrewStressRunResult, iced: AiBrewStressRunResult) {
  return writeAiBrewCombinedStressArtifacts(hot, iced, {
    slug: 'hot-iced-1m-stress',
    title: 'AI Brew 1M Hot + Iced',
    recommendationLabel: '500K hot + 500K iced',
    improvementLabel: '1M',
  });
}

export function writeAiBrewBalancedStressArtifacts(hot: AiBrewStressRunResult, iced: AiBrewStressRunResult) {
  return writeAiBrewCombinedStressArtifacts(hot, iced, {
    slug: 'hot-iced-500k-balanced-stress',
    title: 'AI Brew 500K Balanced Hot + Iced/Cold',
    recommendationLabel: '250K hot + 250K iced/cold/ice-supported',
    improvementLabel: '500K balanced',
  });
}
