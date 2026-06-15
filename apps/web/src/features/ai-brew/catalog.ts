import type {
  AiBrewCatalog,
  AiBrewMethodFamily,
  BurrType,
  CatalogConfidence,
  CatalogMarketSegment,
  CatalogPopularityTier,
  CatalogReviewStatus,
  CatalogReleaseStatus,
  CatalogSensoryBias,
  CoffeeExtractionProfile,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderDriveType,
  GrinderSettingReference,
  ManualBrewPreset,
  ParsedNumericRange,
  ProcessRiskModel,
  ProcessCatalogEntry,
  RawDripperCatalogEntry,
  RawGrinderCatalogEntry,
  SwitchDoseMatrixRow,
  SwitchInternalProgramme,
  SwitchKnowledge,
  SwitchPublicPreset,
  SwitchTroubleshootingEntry,
  TargetProfile,
  VarietyCultivarType,
  VarietyCatalogEntry,
  VarietyLineageGroup,
  VarietyTaxonomySpecies,
  VerificationLevel,
  WaterBrandProfile,
  WaterClassification,
  WaterGuidance,
  WaterPresetStatus,
  WaterPublishState,
} from './types.ts';

const CATALOG_VERSION = '2026.03.10-asean-first-phase1';
const DATA_BASE = '/data/ai-brew';
const PLATFORM_DATA_BASE = '/data/catalog/phase1';
const FILES = {
  drippers: `${DATA_BASE}/drippers.v2026-03.json`,
  grinders: `${DATA_BASE}/grinders.v2026-03.json`,
  targets: `${DATA_BASE}/target-profiles.v2026-03.json`,
  processes: `${DATA_BASE}/processes.v2026-06.json`,
  varieties: `${DATA_BASE}/varieties.v2026-06.json`,
  waterBrands: `${PLATFORM_DATA_BASE}/waters.catalog.json`,
  waterGuidance: `${DATA_BASE}/water-guidance.v2026-06.json`,
  deviceProfiles: `${DATA_BASE}/device-brew-profiles.v2026-06.json`,
  grinderSettings: `${DATA_BASE}/grinder-settings.v2026-06.json`,
  marketSignals: `${DATA_BASE}/market-signals.v2026-06.json`,
  switchProgrammes: `${DATA_BASE}/switch-programmes.v2026-05.json`,
  switchDoseMatrix: `${DATA_BASE}/switch-dose-matrix.v2026-05.json`,
  switchTroubleshooting: `${DATA_BASE}/switch-troubleshooting.v2026-05.json`,
  switchKnowledge: `${DATA_BASE}/switch-knowledge.v2026-05.json`,
  manualBrewPresets: `${DATA_BASE}/manual-brew-presets.v2026-06.json`,
} as const;

const PROCESS_PROFILE_FALLBACK_SOURCE_URLS = [
  'https://sca.coffee/research/coffee-processing-glossary',
  'https://sca.coffee/sca-news/25-magazine/issue-10/english/the-fermentation-effect-25-magazine-issue-10',
];
const VARIETY_PROFILE_FALLBACK_SOURCE_URLS = [
  'https://worldcoffeeresearch.org/resources/coffee-varieties-catalog',
  'https://varieties.worldcoffeeresearch.org',
];

type EquipmentKind = 'dripper' | 'grinder';

interface JsonCollection<T> {
  catalogVersion?: string;
  version?: string;
  items?: T[];
}

type JsonCollectionPayload<T> = JsonCollection<T> | T[];

interface WaterGuidanceFile {
  catalogVersion?: string;
  item: WaterGuidance;
}

interface SwitchProgrammesFile {
  catalogVersion?: string;
  publicPresets?: SwitchPublicPreset[];
  internalProgrammes?: SwitchInternalProgramme[];
}

interface SwitchDoseMatrixFile {
  catalogVersion?: string;
  rows?: SwitchDoseMatrixRow[];
}

interface SwitchTroubleshootingFile {
  catalogVersion?: string;
  items?: SwitchTroubleshootingEntry[];
}

interface SwitchKnowledgeFile {
  catalogVersion?: string;
  item?: SwitchKnowledge;
}

interface RawPlatformWaterEntry {
  id: string;
  brand_group_id: string;
  market_code: 'id' | 'sg' | 'bn' | 'my' | 'global';
  sku_label: string;
  brand: string;
  country_origin: string;
  available_in: string[];
  water_type: 'natural_mineral' | 'spring' | 'purified' | 'alkaline' | 'sparkling';
  is_sparkling: boolean;
  is_brew_ready: boolean;
  brew_block_reason: string[];
  minerals_mg_l: {
    calcium: number | null;
    magnesium: number | null;
    sodium: number | null;
    potassium: number | null;
    bicarbonate: number | null;
    sulfate: number | null;
    chloride: number | null;
    silica: number | null;
  };
  ph: number | null;
  tds_ppm: number | null;
  coffee_parameters: {
    hardness_ppm_as_caco3: number | null;
    alkalinity_ppm_as_caco3: number | null;
    sca_match_score: number | null;
    brew_recommendation: 'excellent' | 'good' | 'acceptable' | 'poor';
  };
  sources: Array<{
    source_type: string;
    source_url: string;
    confidence_score?: number;
  }>;
  primary_source: {
    source_type: string;
    source_url: string;
    confidence_score?: number;
  };
  verification_status: 'verified' | 'curated' | 'review_required';
  publish_state: WaterPublishState;
  data_quality?: {
    is_estimated?: boolean;
    missing_fields?: string[];
    completeness_score?: number;
  };
  search_text: string;
  aliases: string[];
}

interface MarketSignalRecord {
  id: string;
  kind: EquipmentKind;
  description?: string;
  defaultProfileId?: string;
  source?: string;
  sourceUrls?: string[];
  verificationLevel?: VerificationLevel;
  verifiedAt?: string;
  popularityTier?: CatalogPopularityTier;
  marketSegment?: CatalogMarketSegment;
  releaseStatus?: CatalogReleaseStatus;
  confidence?: CatalogConfidence;
  catalogVersion?: string;
}

interface MarketSignalsFile {
  catalogVersion?: string;
  equipment: MarketSignalRecord[];
}

let catalogPromise: Promise<AiBrewCatalog> | null = null;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function buildSearchText(...values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGrinderDisplayText(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const normalized = trimmed
    .replace(/\bTidak Disarankan\b/gi, 'Not recommended')
    .replace(/\bKlik\b/gi, 'clicks')
    .replace(/\bPutaran\b/gi, 'turns')
    .replace(/\b(?:Nomor|Angka)\b/gi, 'numbers')
    .replace(/\bSetting\b/gi, 'settings')
    .replace(/\b(clicks|turns|numbers|settings)\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/gi, '$2 - $3 $1')
    .replace(/\b(clicks|turns|numbers|settings)\s+(\d+(?:\.\d+)?)(?!\s*-)/gi, '$2 $1')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized
    .replace(/^clicks\b/, 'Clicks')
    .replace(/^turns\b/, 'Turns')
    .replace(/^numbers\b/, 'Numbers')
    .replace(/^settings\b/, 'Settings');
}

function decimalPlaces(value: number) {
  const text = String(value);
  const [, decimals = ''] = text.split('.');
  return decimals.length;
}

function decimalPlacesFromText(value: string) {
  const [, decimals = ''] = value.split('.');
  return decimals.length;
}

function normalizeRangeUnitLabel(value: string) {
  const compact = value.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!compact) return 'steps';
  if (/\b(click|clicks|klik)\b/i.test(compact)) return 'clicks';
  if (/\b(turn|turns|rotation|rotations|putaran)\b/i.test(compact)) return 'turns';
  if (/\b(number|numbers|angka|nomor|major|minor|mark|marks)\b/i.test(compact)) return 'numbers';
  if (/\b(notch|notches)\b/i.test(compact)) return 'notch';
  if (/\b(setting|settings)\b/i.test(compact)) return 'settings';
  if (/\b(step|steps)\b/i.test(compact)) return 'steps';
  return compact;
}

export function parseNumericRange(rangeLabel: string): ParsedNumericRange | null {
  const normalized = String(rangeLabel || '')
    .replace(/[\u2012-\u2015\u2212~]/g, '-')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\b(?:to|sampai|hingga)\b/gi, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const min = Number.parseFloat(match[1]);
  const max = Number.parseFloat(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null;
  const [fullMatch] = match;
  const unitSeed = normalized
    .replace(fullMatch, ' ')
    .replace(/\([^)]*\d[^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const unitLabel = normalizeRangeUnitLabel(unitSeed);
  return {
    min,
    max,
    unitLabel,
    precision: Math.max(decimalPlacesFromText(match[1]), decimalPlacesFromText(match[2])),
  };
}

export function inferDripperMethodFamily(name: string, typeLabel: string): AiBrewMethodFamily {
  const haystack = `${name} ${typeLabel}`.toLowerCase();
  if (haystack.includes('espresso')) return 'espresso';
  if (haystack.includes('french press') || haystack.includes('press pot')) return 'french_press';
  if (haystack.includes('aeropress')) return 'aeropress';
  if (haystack.includes('siphon') || haystack.includes('syphon') || haystack.includes('vacuum')) return 'siphon';
  if (haystack.includes('moka') || haystack.includes('stovetop')) return 'moka_pot';
  if (haystack.includes('cold brew') || haystack.includes('cold drip') || haystack.includes('toddy')) return 'cold_brew';
  if (haystack.includes('batch brewer') || haystack.includes('batch brew') || haystack.includes('automatic brewer')) return 'batch_brew';
  if (haystack.includes('chemex')) return 'chemex';
  if (haystack.includes('switch')) return 'hario_switch';
  if (
    haystack.includes('clever')
    || haystack.includes('immersion')
    || haystack.includes('no-bypass')
    || haystack.includes('no bypass')
    || haystack.includes('gravity insert')
    || haystack.includes('vietnam drip')
  ) {
    return 'clever_dripper';
  }
  if (haystack.includes('melitta') || haystack.includes('trapezoid') || haystack.includes('kalita 102')) {
    return 'melitta';
  }
  if (haystack.includes('kono')) return 'kono';
  if (haystack.includes('kalita')) return 'kalita_wave';
  if (haystack.includes('april')) return 'april';
  if (haystack.includes('wave dripper') && !haystack.includes('kalita')) return 'april';
  if (haystack.includes('origami')) return 'origami';
  if (
    haystack.includes('orea')
    || haystack.includes('b75')
    || haystack.includes('stagg')
    || haystack.includes('blue bottle')
    || haystack.includes('flat bottom')
    || haystack.includes('gem')
    || haystack.includes('tornado')
  ) {
    return 'april';
  }
  return 'v60';
}

function toSourceUrls(sourceUrl?: string | null, sourceUrls?: string[] | null) {
  const combined = [...(sourceUrls || []), ...(sourceUrl ? [sourceUrl] : [])]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(combined));
}

function defaultVerificationLevel(source?: string): VerificationLevel {
  if (source === 'official_2026') return 'official';
  if (source === 'curated_2026') return 'curated';
  return 'dataset_unverified';
}

function defaultConfidence(level: VerificationLevel): CatalogConfidence {
  if (level === 'official') return 'high';
  if (level === 'community_verified' || level === 'curated') return 'medium';
  return 'low';
}

function applyEquipmentProvenance(
  raw: RawDripperCatalogEntry | RawGrinderCatalogEntry,
  override: MarketSignalRecord | undefined,
) {
  const rawSourceUrls = toSourceUrls(raw.sourceUrl, raw.sourceUrls);
  const sourceUrls = override?.sourceUrls || rawSourceUrls;
  const userDatasetWithoutSources = raw.source === 'user_dataset' && sourceUrls.length === 0;
  const verificationLevel = userDatasetWithoutSources
    ? 'dataset_unverified'
    : override?.verificationLevel || raw.verificationLevel || defaultVerificationLevel(raw.source);
  return {
    source: override?.source || raw.source || 'user_dataset',
    sourceUrls,
    verificationLevel,
    verifiedAt: override?.verifiedAt || raw.verifiedAt || raw.created_at || '2026-03-09',
    popularityTier: override?.popularityTier || raw.popularityTier || 'niche',
    marketSegment: override?.marketSegment || raw.marketSegment || 'small_market',
    releaseStatus: override?.releaseStatus || raw.releaseStatus || 'established',
    confidence: userDatasetWithoutSources ? 'low' : override?.confidence || raw.confidence || defaultConfidence(verificationLevel),
    catalogVersion: override?.catalogVersion || raw.catalogVersion || CATALOG_VERSION,
  };
}

function compactInternalText(value?: string | null) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinInternalParts(parts: Array<string | undefined>) {
  return parts
    .map(compactInternalText)
    .filter(Boolean)
    .join(' ');
}

function formatSignedBias(label: string, value: number) {
  if (value > 0) return `${label}+${value}`;
  if (value < 0) return `${label}${value}`;
  return '';
}

function describeSensoryBias(bias: CatalogSensoryBias) {
  const cues = [
    formatSignedBias('acidity', bias.acidity),
    formatSignedBias('sweetness', bias.sweetness),
    formatSignedBias('body', bias.body),
    formatSignedBias('clarity', bias.clarity),
    bias.fermentIntensity > 0 ? `ferment intensity ${bias.fermentIntensity}/3` : '',
    bias.bitternessRisk > 0 ? `bitterness risk ${bias.bitternessRisk}/3` : '',
    bias.aromaVolatility > 0 ? `aroma volatility ${bias.aromaVolatility}/3` : '',
  ].filter(Boolean);
  return cues.length > 0 ? cues.join(', ') : 'neutral sensory bias';
}

function describeRiskTags(tags: string[] = []) {
  const uniqueTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  return uniqueTags.length > 0 ? `Risk tags: ${uniqueTags.join(', ')}.` : '';
}

function buildGuardrailSentence(confidence: CatalogConfidence, reviewStatus?: CatalogReviewStatus) {
  const evidence = confidence === 'high'
    ? 'source-backed'
    : confidence === 'medium'
      ? 'curated starting-point'
      : 'low-confidence starting-point';
  const review = reviewStatus === 'needs_review' || reviewStatus === 'conflicting'
    ? ' Review evidence before deterministic service use.'
    : '';
  return `Treat this as a ${evidence} tendency, keep numeric changes inside planner limits, avoid deterministic flavor claims, and require cup feedback before stronger extraction changes.${review}`;
}

function buildProcessFamilyCue(entry: ProcessCatalogEntry, risk: ProcessRiskModel) {
  const haystack = catalogHaystack(entry);
  if (/\b(coferment|co_ferment|co-ferment|infused|fruit_maceration|koji|enzyme|thermal_shock)\b/.test(haystack)) {
    return 'Experimental or ingredient-adjacent processing can show high aroma and high variability; protect clarity with conservative agitation and taste-led corrections.';
  }
  if (/\b(anaerobic|carbonic|lactic|yeast|extended_fermentation|mosto|submerged)\b/.test(haystack)) {
    return 'Controlled fermentation can increase perceived sweetness, acidity expression, and aroma volatility; keep extraction pressure conservative until cup feedback is known.';
  }
  if (/\b(wet_hulled|giling_basah|semi_washed_indonesia)\b/.test(haystack)) {
    return 'Wet-hulled and regional semi-washed lots often emphasize body, spice, and earthy sweetness; protect flow and avoid muddy late agitation.';
  }
  if (/\b(decaf|sugarcane|swiss_water|mountain_water|co2_decaf)\b/.test(haystack)) {
    return 'Decaf processing can make structure more porous and bitterness-prone; use conservative heat, contact, and agitation changes.';
  }
  if (/\b(natural|dry_process|honey|pulped_natural|raisin)\b/.test(haystack)) {
    return 'Fruit-on or mucilage-retained processing can build sweetness and body while raising muddiness and ferment-risk; keep bed flow clean.';
  }
  if (/\b(washed|fully_washed|double_washed|mechanically_demucilaged|wet_process)\b/.test(haystack)) {
    return 'Washed-style processing usually supports clarity, acidity definition, and lower ferment variability; protect even saturation before increasing agitation.';
  }
  if (risk.variability === 'high') {
    return 'High-variability process signal; use conservative extraction pressure and taste feedback before applying stronger changes.';
  }
  return 'Process signal is contextual rather than deterministic; roast, water, grinder, and cup feedback must dominate final recipe changes.';
}

function buildProcessExpertDescription(
  entry: ProcessCatalogEntry,
  sensoryBias: CatalogSensoryBias,
  processRisk: ProcessRiskModel,
  riskTags: string[],
) {
  const explicit = compactInternalText(entry.expertDescription);
  const role = explicit || buildProcessFamilyCue(entry, processRisk);
  return joinInternalParts([
    `Extraction role: ${role}`,
    `Sensory model: ${describeSensoryBias(sensoryBias)}.`,
    `Process risk: ${processRisk.variability} variability, ${processRisk.overFermentRisk} over-ferment risk, ${processRisk.recommendationMode} recommendation mode.`,
    describeRiskTags(riskTags),
    `Guardrail: ${buildGuardrailSentence(entry.confidence, entry.reviewStatus)}`,
  ]);
}

function buildProcessExtractionProfile(
  entry: ProcessCatalogEntry,
  sensoryBias: CatalogSensoryBias,
  processRisk: ProcessRiskModel,
  riskTags: string[],
): CoffeeExtractionProfile {
  const role = compactInternalText(entry.expertDescription) || buildProcessFamilyCue(entry, processRisk);
  const solubilityCue = processRisk.recommendationMode === 'taste_feedback_required'
    ? 'Variable solubility signal; keep recipe moves small until the brewed cup confirms direction.'
    : processRisk.variability === 'low'
      ? 'Stable process signal; normal planner solubility assumptions can remain active.'
      : 'Moderate solubility variance; use conservative temperature, grind, and agitation deltas.';
  return {
    extractionRole: role,
    solubilityCue,
    sensoryBias,
    riskTags: riskTags as CoffeeExtractionProfile['riskTags'],
    recipeGuidance: [
      buildProcessFamilyCue(entry, processRisk),
      `Use process modifier as an internal bias only: ${describeSensoryBias(sensoryBias)}.`,
      processRisk.recommendationMode === 'deterministic'
        ? 'Allow normal target-profile adjustments while keeping final cup feedback authoritative.'
        : 'Prefer gentle pour, grind, and temperature changes before stronger extraction pressure.',
    ],
    guardrails: [
      buildGuardrailSentence(entry.confidence, entry.reviewStatus),
      'Do not show this internal process profile in picker descriptions or promise fixed flavor outcomes.',
    ],
    confidence: entry.confidence,
    sourceUrls: Array.from(new Set([...(entry.sourceUrls || []), ...PROCESS_PROFILE_FALLBACK_SOURCE_URLS])).filter(Boolean),
    visibility: 'internal',
  };
}

function buildVarietyFamilyCue(entry: VarietyCatalogEntry, taxonomy: NonNullable<VarietyCatalogEntry['taxonomy']>) {
  const lineage = taxonomy.lineageGroup;
  if (taxonomy.species === 'canephora' || lineage === 'canephora_clone') {
    return 'Canephora or robusta-line material can bring body and bitterness risk; prioritize sweetness and clean texture over bright-acidity chasing.';
  }
  if (taxonomy.species === 'liberica' || taxonomy.species === 'excelsa' || lineage === 'liberica_excelsa') {
    return 'Liberica or Excelsa lineage can be aromatic, woody, and body-forward; use conservative extraction and avoid over-agitation.';
  }
  if (lineage === 'ethiopian_landrace' || lineage === 'specialty_reference') {
    return 'Aromatic specialty or landrace cue can support florals and clarity; protect aromatics with even saturation and restrained late agitation.';
  }
  if (lineage === 'kenyan_selection') {
    return 'Kenyan selection cue can carry high acidity structure; build enough sweetness while avoiding dry channeling.';
  }
  if (lineage === 'introgressed' || lineage === 'indonesia_selection') {
    return 'Introgressed or Indonesian selection cue can emphasize body, herbal tone, and robustness; keep bitterness guardrails active.';
  }
  if (lineage === 'bourbon_typica' || lineage === 'brazil_selection') {
    return 'Classic sweetness lineage cue; keep recipe shifts modest and let roast, process, and cup feedback lead.';
  }
  if (lineage === 'f1_hybrid') {
    return 'F1 hybrid cue can support sweetness and structure but remains lot-dependent; avoid assuming a fixed cup profile.';
  }
  return 'Variety cue is taxonomy context only; process, roast, water, grinder, and sensory feedback dominate final extraction decisions.';
}

function buildVarietyExpertDescription(
  entry: VarietyCatalogEntry,
  sensoryBias: CatalogSensoryBias,
  taxonomy: NonNullable<VarietyCatalogEntry['taxonomy']>,
  riskTags: string[],
) {
  const explicit = compactInternalText(entry.expertDescription);
  const role = explicit || buildVarietyFamilyCue(entry, taxonomy);
  return joinInternalParts([
    `Extraction role: ${role}`,
    `Taxonomy model: species ${taxonomy.species}, lineage ${taxonomy.lineageGroup}, cultivar type ${taxonomy.cultivarType}.`,
    `Sensory model: ${describeSensoryBias(sensoryBias)}.`,
    describeRiskTags(riskTags),
    `Guardrail: ${buildGuardrailSentence(entry.confidence, entry.reviewStatus)} Variety never overrides roast, process, water chemistry, grinder calibration, or cup feedback.`,
  ]);
}

function buildVarietyExtractionProfile(
  entry: VarietyCatalogEntry,
  sensoryBias: CatalogSensoryBias,
  taxonomy: NonNullable<VarietyCatalogEntry['taxonomy']>,
  riskTags: string[],
): CoffeeExtractionProfile {
  const role = compactInternalText(entry.expertDescription) || buildVarietyFamilyCue(entry, taxonomy);
  const solubilityCue = taxonomy.species === 'canephora' || taxonomy.species === 'liberica' || taxonomy.species === 'excelsa'
    ? 'Non-standard species cue; protect against bitterness, woody tone, and over-agitation.'
    : taxonomy.lineageGroup === 'ethiopian_landrace' || taxonomy.lineageGroup === 'specialty_reference'
      ? 'Aromatic lineage cue; protect volatile aromatics with even saturation and calm finish pours.'
      : 'Cultivar cue is secondary to roast, process, water chemistry, grinder calibration, and cup feedback.';
  return {
    extractionRole: role,
    solubilityCue,
    sensoryBias,
    riskTags: riskTags as CoffeeExtractionProfile['riskTags'],
    recipeGuidance: [
      buildVarietyFamilyCue(entry, taxonomy),
      `Use variety modifier as an internal bias only: ${describeSensoryBias(sensoryBias)}.`,
      'Keep cultivar assumptions subordinate to process, roast, water, grinder, and sensory feedback.',
    ],
    guardrails: [
      `${buildGuardrailSentence(entry.confidence, entry.reviewStatus)} Variety never overrides measured brew behavior.`,
      'Do not show this internal variety profile in picker descriptions or imply a fixed premium cup.',
    ],
    confidence: entry.confidence,
    sourceUrls: Array.from(new Set([...(entry.sourceUrls || []), ...VARIETY_PROFILE_FALLBACK_SOURCE_URLS])).filter(Boolean),
    visibility: 'internal',
  };
}

function describeGrinderBehaviorCue(params: {
  id: string;
  name: string;
  brand?: string;
  typeLabel: string;
  coarseLabel: string;
  mediumLabel: string;
  fineLabel: string;
  sourceDescription?: string;
}) {
  const haystack = buildSearchText(
    params.id,
    params.name,
    params.brand,
    params.typeLabel,
    params.coarseLabel,
    params.mediumLabel,
    params.fineLabel,
    params.sourceDescription,
  );
  if (/\b(zp6|comandante|c40|c60|pietro|ode gen 2|k-ultra|k-max|k-plus)\b/.test(haystack)) {
    return 'Higher-clarity grinder platform; it can usually support cleaner multi-pulse recipes, but dial-in still depends on burr zero, roast, paper, dose, and drawdown.';
  }
  if (/\b(timemore c2|timemore c3(?!\s*esp)|hario|porlex|skerton|mini slim|latina|feima|600n|smart g)\b/.test(haystack)) {
    return 'Entry or high-fines-risk grinder platform; keep final agitation controlled and treat finer settings cautiously when drawdown slows.';
  }
  if (/\b(espresso|esp|j-ultra|j-max|encore esp|opus|smart grinder pro)\b/.test(haystack)) {
    return 'Espresso-capable or espresso-leaning adjustment platform; filter settings need careful translation from zero point and should not be treated as universal.';
  }
  if (/\b(electric|stepless|setting|numbers)\b/.test(haystack)) {
    return 'Electric or numbered adjustment platform; retention, burr seasoning, and calibration can shift the effective setting between grinders.';
  }
  return 'Manual grinder setting cue; use the stored coarse, medium, and fine bands as starting points, not exact extraction guarantees.';
}

function buildGrinderExpertDescription(params: {
  id: string;
  raw: RawGrinderCatalogEntry;
  typeLabel: string;
  coarseLabel: string;
  mediumLabel: string;
  fineLabel: string;
  override?: MarketSignalRecord;
  provenance: ReturnType<typeof applyEquipmentProvenance>;
}) {
  const explicit = compactInternalText(params.raw.expertDescription);
  const sourceDescription = compactInternalText(params.override?.description);
  const role = explicit
    || sourceDescription
    || describeGrinderBehaviorCue({
      id: params.id,
      name: params.raw.name,
      brand: params.raw.brand,
      typeLabel: params.typeLabel,
      coarseLabel: params.coarseLabel,
      mediumLabel: params.mediumLabel,
      fineLabel: params.fineLabel,
      sourceDescription,
    });
  return joinInternalParts([
    `Burr/setting role: ${role}`,
    `Stored bands: coarse ${params.coarseLabel || 'unknown'}, medium ${params.mediumLabel || 'unknown'}, fine ${params.fineLabel || 'unknown'}.`,
    `Evidence: ${params.provenance.verificationLevel}, ${params.provenance.confidence} confidence, source ${params.provenance.source}.`,
    'Calibration guardrail: treat every setting as a starting range; confirm zero point, burr seasoning, roast level, dose, paper, and drawdown before making stronger recipe changes.',
  ]);
}

function mergeInternalExpertDescriptions(...values: Array<string | undefined>) {
  const unique = Array.from(new Set(values.map(compactInternalText).filter(Boolean)));
  return unique.join(' ');
}

function normalizeDripper(raw: RawDripperCatalogEntry, override?: MarketSignalRecord): EquipmentCatalogEntry {
  const explicitId = typeof raw.id === 'string' && raw.id.trim() && !/^\d+$/.test(raw.id.trim())
    ? slugify(raw.id)
    : undefined;
  const provenance = applyEquipmentProvenance(raw, override);
  return {
    id: explicitId || slugify(raw.name),
    kind: 'dripper',
    name: raw.name,
    brand: raw.brand,
    typeLabel: raw.type,
    description: override?.description || raw.description || undefined,
    expertDescription: compactInternalText(raw.expertDescription) || undefined,
    searchText: buildSearchText(raw.name, raw.brand, raw.type, override?.description, raw.description || undefined),
    methodFamily: inferDripperMethodFamily(raw.name, raw.type),
    defaultProfileId: override?.defaultProfileId,
    hidden: raw.hidden,
    deprecated: raw.deprecated,
    migrationTargetIds: raw.migrationTargetIds,
    physicalConstraints: raw.physicalConstraints,
    methodProgramme: raw.methodProgramme,
    ...provenance,
  };
}

export function normalizeGrinderDriveType(raw?: string | null, fallbackSearchText?: string): GrinderDriveType {
  const normalized = String(raw || '').toLowerCase().trim();
  if (normalized === 'hand' || normalized === 'manual') return 'hand';
  if (normalized === 'electric') return 'electric';
  
  if (fallbackSearchText) {
    const text = fallbackSearchText.toLowerCase();
    if (/\b(hand|manual)\b/.test(text)) return 'hand';
    if (/\belectric\b/.test(text)) return 'electric';
    
    // Brand fallbacks
    if (/\b(1zpresso|kingrinder|comandante|orphan espresso|kinu|c40|k-max|j-max|q2|pietro|hario|porlex|knock|helor|wacaco|vssl|rok|oe lido|mavo|latina|kalita dia|kaldi|flair|etzinger|cafflano|bravo|mhw-3bomber|goat story|hongbei|montwave|pinecone)\b/.test(text)) return 'hand';
    if (/\b(baratza|fellow|niche|mahlkönig|eureka|mazzer|df64|df83|df54|lagom|option-o|weber|timemore|femobook|varia|xbloom|zerno|fiorenzato|ceado|ode|opus|encore|wilfa|krups|de'?longhi|cuisinart|breville|acaia|bodum|balmuda|joy resolve|kalita next g|anfim|feima|600n|starseeker)\b/.test(text)) {
      if (/\b(timemore (c2|c3|s3|chestnut|nano|slim))\b/.test(text)) return 'hand';
      if (/\b(weber (hg-1|hg-2))\b/.test(text)) return 'hand';
      return 'electric';
    }
  }
  return 'unknown';
}

export function normalizeBurrType(raw?: string | null): BurrType {
  const normalized = String(raw || '').toLowerCase().trim();
  if (normalized === 'conical') return 'conical';
  if (normalized === 'flat') return 'flat';
  if (normalized === 'hybrid') return 'hybrid';
  return 'unknown';
}

function normalizeGrinder(raw: RawGrinderCatalogEntry, override?: MarketSignalRecord): EquipmentCatalogEntry {
  const id = slugify(raw.name);
  const typeLabel = normalizeGrinderDisplayText(raw.type);
  const coarseLabel = normalizeGrinderDisplayText(raw.coarse);
  const mediumLabel = normalizeGrinderDisplayText(raw.medium);
  const fineLabel = normalizeGrinderDisplayText(raw.fine);
  const provenance = applyEquipmentProvenance(raw, override);

  return {
    id,
    kind: 'grinder',
    name: raw.name,
    brand: raw.brand,
    grinderDriveType: normalizeGrinderDriveType(raw.grinderType, `${raw.name} ${raw.type} ${override?.description || ''}`),
    driveTypeConfidence: raw.driveTypeConfidence || 'estimated',
    burrType: normalizeBurrType(raw.burrType),
    safetyTags: Array.isArray(raw.safetyTags) ? raw.safetyTags : [],
    idealMethodFamilies: Array.isArray(raw.idealMethodFamilies) ? raw.idealMethodFamilies : undefined,
    avoidMethodFamilies: Array.isArray(raw.avoidMethodFamilies) ? raw.avoidMethodFamilies : undefined,
    typeLabel,
    description: override?.description,
    expertDescription: buildGrinderExpertDescription({
      id,
      raw,
      typeLabel,
      coarseLabel,
      mediumLabel,
      fineLabel,
      override,
      provenance,
    }),
    searchText: buildSearchText(
      raw.name,
      raw.brand,
      raw.type,
      typeLabel,
      override?.description,
      raw.coarse,
      coarseLabel,
      raw.medium,
      mediumLabel,
      raw.fine,
      fineLabel,
      raw.expertDescription,
    ),
    grindBands: {
      coarse: coarseLabel,
      medium: mediumLabel,
      fine: fineLabel,
      parsedCoarse: parseNumericRange(coarseLabel),
      parsedMedium: parseNumericRange(mediumLabel),
      parsedFine: parseNumericRange(fineLabel),
    },
    ...provenance,
  };
}

function normalizeSearchEntry<T extends { id: string; label: string; aliases: string[]; searchText?: string; sourceUrls: string[]; verificationLevel: VerificationLevel; verifiedAt: string; popularityTier: CatalogPopularityTier; marketSegment: CatalogMarketSegment; releaseStatus: CatalogReleaseStatus; confidence: CatalogConfidence; catalogVersion?: string; source: string; group: string; notes: string[]; origins?: string[] }>(
  entry: T,
): T {
  const normalizedOrigins = Array.isArray(entry.origins)
    ? Array.from(new Set(entry.origins.map((value) => String(value || '').trim()).filter(Boolean)))
    : undefined;
  const reviewStatus = normalizeCatalogReviewStatus(entry);
  const reviewNotes = normalizeReviewNotes(entry, reviewStatus);

  return {
    ...entry,
    origins: normalizedOrigins,
    searchText: entry.searchText || buildSearchText(entry.label, entry.group, ...entry.aliases),
    catalogVersion: entry.catalogVersion || CATALOG_VERSION,
    reviewStatus,
    lastReviewedAt: (entry as Partial<CatalogProvenanceLike>).lastReviewedAt || entry.verifiedAt,
    reviewNotes,
  } as T;
}

function normalizeRiskTags(entry: { riskTags?: string[] }) {
  return Array.from(
    new Set(
      (entry.riskTags || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );
}

type CatalogProvenanceLike = {
  source: string;
  sourceUrls: string[];
  verificationLevel: VerificationLevel;
  verifiedAt: string;
  confidence: CatalogConfidence;
  reviewStatus?: CatalogReviewStatus;
  lastReviewedAt?: string;
  reviewNotes?: string[];
};

const PROCESS_CANONICAL_ID_ALIASES: Record<string, string> = {
  co_fermented: 'coferment',
  cofermented: 'coferment',
};

function normalizeCatalogReviewStatus(entry: CatalogProvenanceLike): CatalogReviewStatus {
  if (entry.reviewStatus) return entry.reviewStatus;
  const sourceUrls = entry.sourceUrls || [];
  const hasPublicSource = sourceUrls.some((url) => /^https?:\/\//i.test(url));
  const hasLocalSource = sourceUrls.some((url) => /^local:/i.test(url));
  if (entry.confidence === 'low' || hasLocalSource) return 'needs_review';
  if (entry.verificationLevel === 'official' && entry.confidence === 'high' && hasPublicSource) return 'fresh';
  if (
    (entry.verificationLevel === 'curated' || entry.verificationLevel === 'community_verified')
    && (entry.confidence === 'high' || entry.confidence === 'medium')
    && hasPublicSource
  ) {
    return 'fresh';
  }
  return hasPublicSource ? 'needs_review' : 'needs_review';
}

function normalizeReviewNotes(entry: CatalogProvenanceLike, reviewStatus: CatalogReviewStatus) {
  const notes = Array.isArray(entry.reviewNotes)
    ? entry.reviewNotes.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  if (reviewStatus === 'needs_review' && notes.length === 0) {
    notes.push('Review catalog evidence before treating this as an official deterministic reference.');
  }
  if ((entry.sourceUrls || []).some((url) => /^local:/i.test(url))) {
    notes.push('Local snapshot source is not public evidence.');
  }
  return Array.from(new Set(notes));
}

function safeSensoryBias(bias?: Partial<CatalogSensoryBias> | null): CatalogSensoryBias {
  return {
    acidity: clampIntegerBias(bias?.acidity, -2, 2) as CatalogSensoryBias['acidity'],
    sweetness: clampIntegerBias(bias?.sweetness, -2, 2) as CatalogSensoryBias['sweetness'],
    body: clampIntegerBias(bias?.body, -2, 2) as CatalogSensoryBias['body'],
    clarity: clampIntegerBias(bias?.clarity, -2, 2) as CatalogSensoryBias['clarity'],
    fermentIntensity: clampIntegerBias(bias?.fermentIntensity, 0, 3) as CatalogSensoryBias['fermentIntensity'],
    bitternessRisk: clampIntegerBias(bias?.bitternessRisk, 0, 3) as CatalogSensoryBias['bitternessRisk'],
    aromaVolatility: clampIntegerBias(bias?.aromaVolatility, 0, 3) as CatalogSensoryBias['aromaVolatility'],
  };
}

function clampIntegerBias(value: unknown, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function catalogHaystack(entry: { id: string; label: string; group: string; aliases: string[]; searchText?: string }) {
  return buildSearchText(entry.id, entry.label, entry.group, entry.searchText, ...entry.aliases);
}

function normalizeLineageGroup(group: string, id = '', label = ''): VarietyLineageGroup {
  const haystack = buildSearchText(group, id, label).replace(/-/g, '_');
  if (/\b(ethiopian_landrace|ethiopian_heirloom|heirloom|landrace)\b/.test(haystack)) return 'ethiopian_landrace';
  if (/\b(bourbon|typica|caturra|catuai|villa_sarchi|mundo_novo|classic_arabica)\b/.test(haystack)) return 'bourbon_typica';
  if (/\b(introgressed|catimor|sarchimor|timor|disease_resistant|india_selection|south_asia)\b/.test(haystack)) return 'introgressed';
  if (/\b(f1_hybrid|hybrid_f1|centroamericano|starmaya|milkyway)\b/.test(haystack)) return 'f1_hybrid';
  if (/\b(canephora|robusta|conilon|clone)\b/.test(haystack)) return 'canephora_clone';
  if (/\b(liberica|excelsa|non_arabica|species_level)\b/.test(haystack)) return 'liberica_excelsa';
  if (/\b(brazil_selection|mundo_novo|yellow_bourbon)\b/.test(haystack)) return 'brazil_selection';
  if (/\b(kenyan_selection|east_africa_selection|sl28|sl34|ruiru|batian)\b/.test(haystack)) return 'kenyan_selection';
  if (/\b(indonesia_selection|s795|timtim|sigarar|ateng|linie_s)\b/.test(haystack)) return 'indonesia_selection';
  if (/\b(regional_selection)\b/.test(haystack)) return 'regional_selection';
  if (/\b(specialty_reference|geisha|gesha|sidra|wush_wush|pink_bourbon)\b/.test(haystack)) return 'specialty_reference';
  return 'unknown';
}

function inferVarietySpecies(entry: VarietyCatalogEntry, lineageGroup: VarietyLineageGroup): VarietyTaxonomySpecies {
  const haystack = catalogHaystack(entry);
  if (/\b(canephora|robusta|conilon)\b/.test(haystack) || lineageGroup === 'canephora_clone') return 'canephora';
  if (/\bliberica\b/.test(haystack)) return 'liberica';
  if (/\bexcelsa\b/.test(haystack)) return 'excelsa';
  if (/\beugenioides\b/.test(haystack)) return 'eugenioides';
  if (/\bstenophylla\b/.test(haystack)) return 'stenophylla';
  if (/\bracemosa\b/.test(haystack)) return 'racemosa';
  if (/\bhybrid\b/.test(haystack) && /\b(interspecific|canephora|robusta|timor)\b/.test(haystack)) return 'hybrid';
  if (lineageGroup === 'liberica_excelsa') return 'hybrid';
  return lineageGroup === 'unknown' ? 'unknown' : 'arabica';
}

function inferCultivarType(entry: VarietyCatalogEntry, lineageGroup: VarietyLineageGroup): VarietyCultivarType {
  const haystack = catalogHaystack(entry);
  if (/\b(mixed|blend|lot_composition|variety_mix|cultivar_mix)\b/.test(haystack)) return 'mixed_lot';
  if (/\b(landrace|heirloom)\b/.test(haystack) || lineageGroup === 'ethiopian_landrace') return 'landrace';
  if (/\b(clone|bp_\d+|kr\d+|conilon)\b/.test(haystack) || lineageGroup === 'canephora_clone') return 'clone';
  if (/\b(species_level|liberica|excelsa|robusta|canephora)\b/.test(haystack)) return 'botanical_variety';
  if (/\b(alias|regional)\b/.test(haystack)) return 'regional_alias';
  if (/\b(marketing|trade_name)\b/.test(haystack)) return 'marketing_label';
  return lineageGroup === 'unknown' ? 'unknown' : 'cultivar';
}

function inferVarietySensoryBias(entry: VarietyCatalogEntry, lineageGroup: VarietyLineageGroup): CatalogSensoryBias {
  if (entry.sensoryBias) return safeSensoryBias(entry.sensoryBias);
  switch (lineageGroup) {
    case 'ethiopian_landrace':
    case 'specialty_reference':
      return safeSensoryBias({ acidity: 2, sweetness: 1, body: -1, clarity: 2, aromaVolatility: 2 });
    case 'kenyan_selection':
      return safeSensoryBias({ acidity: 2, sweetness: 1, body: 0, clarity: 2, aromaVolatility: 2 });
    case 'canephora_clone':
    case 'liberica_excelsa':
      return safeSensoryBias({ acidity: -1, sweetness: 0, body: 2, clarity: -1, bitternessRisk: 2, aromaVolatility: 1 });
    case 'brazil_selection':
    case 'bourbon_typica':
      return safeSensoryBias({ acidity: 0, sweetness: 1, body: 1, clarity: 0, aromaVolatility: 1 });
    case 'introgressed':
      return safeSensoryBias({ acidity: 0, sweetness: 0, body: 1, clarity: -1, bitternessRisk: 1 });
    case 'indonesia_selection':
      return safeSensoryBias({ acidity: -1, sweetness: 1, body: 1, clarity: -1, bitternessRisk: 1 });
    case 'f1_hybrid':
      return safeSensoryBias({ acidity: 1, sweetness: 1, body: 0, clarity: 1, aromaVolatility: 1 });
    case 'regional_selection':
    case 'classic_arabica':
    case 'unknown':
    default:
      return safeSensoryBias();
  }
}

function inferProcessSensoryBias(entry: ProcessCatalogEntry): CatalogSensoryBias {
  if (entry.sensoryBias) return safeSensoryBias(entry.sensoryBias);
  const haystack = catalogHaystack(entry);
  const riskTags = new Set(normalizeRiskTags(entry));
  if (riskTags.has('decaf-sensitive')) {
    return safeSensoryBias({ acidity: -1, sweetness: -1, body: 0, clarity: -1, fermentIntensity: 0, bitternessRisk: 1, aromaVolatility: 0 });
  }
  if (riskTags.has('non-arabica') || riskTags.has('canephora') || riskTags.has('liberica') || riskTags.has('excelsa')) {
    return safeSensoryBias({ acidity: riskTags.has('excelsa') ? 1 : -1, sweetness: 0, body: 2, clarity: -1, fermentIntensity: 0, bitternessRisk: 2, aromaVolatility: 1 });
  }
  if (riskTags.has('experimental') || riskTags.has('ferment-risk') || riskTags.has('high-ferment')) {
    return safeSensoryBias({ acidity: 0, sweetness: 1, body: 1, clarity: -1, fermentIntensity: 2, bitternessRisk: 1, aromaVolatility: 3 });
  }
  if (riskTags.has('drying-only')) {
    return safeSensoryBias({ acidity: 0, sweetness: 1, body: 0, clarity: 0, fermentIntensity: 0, bitternessRisk: 0, aromaVolatility: 1 });
  }
  if (/\b(coferment|co_ferment|co-ferment|infused|fruit_maceration|koji|enzyme|thermal_shock)\b/.test(haystack)) {
    return safeSensoryBias({ acidity: 0, sweetness: 2, body: 1, clarity: -2, fermentIntensity: 3, bitternessRisk: 2, aromaVolatility: 3 });
  }
  if (/\b(anaerobic|carbonic|lactic|yeast|extended_fermentation|mosto|submerged)\b/.test(haystack)) {
    return safeSensoryBias({ acidity: 0, sweetness: 1, body: 1, clarity: -1, fermentIntensity: 2, bitternessRisk: 1, aromaVolatility: 3 });
  }
  if (/\b(wet_hulled|giling_basah|semi_washed_indonesia)\b/.test(haystack)) {
    return safeSensoryBias({ acidity: -1, sweetness: 1, body: 2, clarity: -1, fermentIntensity: 1, bitternessRisk: 1, aromaVolatility: 1 });
  }
  if (/\b(natural|dry_process|honey|pulped_natural|raisin)\b/.test(haystack)) {
    return safeSensoryBias({ acidity: 0, sweetness: 2, body: 1, clarity: -1, fermentIntensity: 1, bitternessRisk: 1, aromaVolatility: 2 });
  }
  if (/\b(decaf|sugarcane|swiss_water|mountain_water)\b/.test(haystack)) {
    return safeSensoryBias({ acidity: -1, sweetness: -1, body: 0, clarity: -1, fermentIntensity: 0, bitternessRisk: 1, aromaVolatility: 0 });
  }
  if (/\b(washed|fully_washed|double_washed|mechanically_demucilaged|wet_process)\b/.test(haystack)) {
    return safeSensoryBias({ acidity: 1, sweetness: 0, body: -1, clarity: 2, fermentIntensity: 0, bitternessRisk: 0, aromaVolatility: 1 });
  }
  return safeSensoryBias();
}

function inferProcessRisk(entry: ProcessCatalogEntry): ProcessRiskModel {
  if (entry.processRisk) return entry.processRisk;
  const haystack = catalogHaystack(entry);
  const riskTags = new Set(normalizeRiskTags(entry));
  if (riskTags.has('experimental') || riskTags.has('ferment-risk') || riskTags.has('high-ferment') || riskTags.has('taste-feedback-required')) {
    return { variability: 'high', overFermentRisk: 'high', recommendationMode: 'taste_feedback_required' };
  }
  if (riskTags.has('decaf-sensitive') || riskTags.has('non-arabica') || riskTags.has('canephora') || riskTags.has('liberica') || riskTags.has('excelsa')) {
    return { variability: 'medium', overFermentRisk: 'medium', recommendationMode: 'conservative' };
  }
  if (riskTags.has('drying-only')) {
    return { variability: 'medium', overFermentRisk: 'low', recommendationMode: 'conservative' };
  }
  if (/\b(coferment|co_ferment|co-ferment|infused|fruit_maceration|koji|enzyme|thermal_shock)\b/.test(haystack)) {
    return { variability: 'high', overFermentRisk: 'high', recommendationMode: 'taste_feedback_required' };
  }
  if (/\b(anaerobic|carbonic|lactic|yeast|extended_fermentation|mosto|submerged)\b/.test(haystack)) {
    return { variability: 'high', overFermentRisk: 'high', recommendationMode: 'conservative' };
  }
  if (/\b(natural|dry_process|honey|pulped_natural|wet_hulled|giling_basah)\b/.test(haystack)) {
    return { variability: 'medium', overFermentRisk: 'medium', recommendationMode: 'conservative' };
  }
  if (/\b(washed|fully_washed|double_washed|mechanically_demucilaged|wet_process)\b/.test(haystack)) {
    return { variability: 'low', overFermentRisk: 'low', recommendationMode: 'deterministic' };
  }
  return { variability: 'medium', overFermentRisk: 'medium', recommendationMode: 'conservative' };
}

function normalizeVarietyEntry(entry: VarietyCatalogEntry): VarietyCatalogEntry {
  const base = normalizeSearchEntry(entry);
  const taxonomyInput = (base.taxonomy || {}) as Partial<NonNullable<VarietyCatalogEntry['taxonomy']>>;
  const lineageGroup = taxonomyInput.lineageGroup || normalizeLineageGroup(base.group, base.id, base.label);
  const taxonomy = {
    species: taxonomyInput.species || inferVarietySpecies(base, lineageGroup),
    lineageGroup,
    cultivarType: taxonomyInput.cultivarType || inferCultivarType(base, lineageGroup),
    parentage: taxonomyInput.parentage,
  };
  const riskTags = normalizeRiskTags(base) as VarietyCatalogEntry['riskTags'];
  const sensoryBias = inferVarietySensoryBias(base, lineageGroup);
  const expertDescription = buildVarietyExpertDescription(base, sensoryBias, taxonomy, riskTags || []);
  return {
    ...base,
    riskTags,
    taxonomy,
    sensoryBias,
    expertDescription,
    extractionProfile: buildVarietyExtractionProfile(
      { ...base, expertDescription },
      sensoryBias,
      taxonomy,
      riskTags || [],
    ),
  };
}

function normalizeProcessEntry(entry: ProcessCatalogEntry): ProcessCatalogEntry {
  const base = normalizeSearchEntry(entry);
  const riskTags = normalizeRiskTags(base) as ProcessCatalogEntry['riskTags'];
  const sensoryBias = inferProcessSensoryBias(base);
  const processRisk = inferProcessRisk(base);
  const expertDescription = buildProcessExpertDescription(base, sensoryBias, processRisk, riskTags || []);
  return {
    ...base,
    riskTags,
    sensoryBias,
    processRisk,
    expertDescription,
    extractionProfile: buildProcessExtractionProfile(
      { ...base, expertDescription },
      sensoryBias,
      processRisk,
      riskTags || [],
    ),
  };
}

function mergeExtractionProfiles(
  existing?: CoffeeExtractionProfile,
  next?: CoffeeExtractionProfile,
): CoffeeExtractionProfile | undefined {
  if (!existing) return next;
  if (!next) return existing;
  return {
    ...existing,
    recipeGuidance: Array.from(new Set([...existing.recipeGuidance, ...next.recipeGuidance])),
    guardrails: Array.from(new Set([...existing.guardrails, ...next.guardrails])),
    riskTags: Array.from(new Set([...existing.riskTags, ...next.riskTags])),
    sourceUrls: Array.from(new Set([...existing.sourceUrls, ...next.sourceUrls])),
    visibility: 'internal',
  };
}

function normalizeProcessEntries(entries: ProcessCatalogEntry[]) {
  const byId = new Map<string, ProcessCatalogEntry>();
  for (const rawEntry of entries) {
    const canonicalId = PROCESS_CANONICAL_ID_ALIASES[rawEntry.id] || rawEntry.id;
    const entry = normalizeProcessEntry({
      ...rawEntry,
      id: canonicalId,
      aliases: Array.from(new Set([rawEntry.id, ...(rawEntry.aliases || [])].filter((value) => value !== canonicalId))),
    });
    const existing = byId.get(canonicalId);
    if (!existing) {
      byId.set(canonicalId, entry);
      continue;
    }
    byId.set(canonicalId, {
      ...existing,
      aliases: Array.from(new Set([...existing.aliases, rawEntry.id, ...entry.aliases].filter(Boolean))),
      searchText: buildSearchText(existing.searchText, entry.searchText, rawEntry.id),
      notes: Array.from(new Set([...existing.notes, ...entry.notes])),
      expertDescription: mergeInternalExpertDescriptions(existing.expertDescription, entry.expertDescription),
      extractionProfile: mergeExtractionProfiles(existing.extractionProfile, entry.extractionProfile),
      reviewStatus: 'conflicting',
      reviewNotes: Array.from(new Set([
        ...(existing.reviewNotes || []),
        ...(entry.reviewNotes || []),
        `Merged duplicate process concept "${rawEntry.id}" into canonical "${canonicalId}".`,
      ])),
    });
  }
  return Array.from(byId.values());
}

function normalizeDeviceProfile(profile: DeviceBrewProfile): DeviceBrewProfile {
  return {
    ...profile,
    catalogVersion: profile.catalogVersion || CATALOG_VERSION,
  };
}

function normalizeGrinderSetting(setting: GrinderSettingReference): GrinderSettingReference {
  const rangeLabel = normalizeGrinderDisplayText(setting.rangeLabel);
  return {
    ...setting,
    rangeLabel,
    parsedRange: setting.parsedRange || parseNumericRange(rangeLabel),
    catalogVersion: setting.catalogVersion || CATALOG_VERSION,
  };
}

function normalizeManualBrewPreset(preset: ManualBrewPreset): ManualBrewPreset {
  const targetDefaults = preset.targetDefaults || ({} as ManualBrewPreset['targetDefaults']);
  return {
    ...preset,
    safeLabel: String(preset.safeLabel || preset.id).trim(),
    sourceAttribution: String(preset.sourceAttribution || 'Curated manual brew reference').trim(),
    sourceUrls: Array.from(new Set((preset.sourceUrls || []).map((value) => String(value || '').trim()).filter(Boolean))),
    supportedDripperIds: Array.from(new Set((preset.supportedDripperIds || []).map((value) => String(value || '').trim()).filter(Boolean))),
    originalBrewerId: preset.originalBrewerId ? String(preset.originalBrewerId).trim() : undefined,
    fallbackDripperId: preset.fallbackDripperId ? String(preset.fallbackDripperId).trim() : undefined,
    fallbackReason: preset.fallbackReason ? String(preset.fallbackReason).trim() : undefined,
    targetDefaults: {
      ...targetDefaults,
      brewMode: targetDefaults.brewMode === 'iced' ? 'iced' : 'hot',
      targetProfileId: String(targetDefaults.targetProfileId || 'balance_clean'),
      doseG: Number.isFinite(targetDefaults.doseG) ? targetDefaults.doseG : 15,
      targetWaterMl: Number.isFinite(targetDefaults.targetWaterMl) ? targetDefaults.targetWaterMl : 240,
      targetTempC: Number.isFinite(targetDefaults.targetTempC) ? targetDefaults.targetTempC : 92,
      targetRatio: Number.isFinite(targetDefaults.targetRatio) ? targetDefaults.targetRatio : undefined,
      pourCount: targetDefaults.pourCount || '4',
      presetPourCount: Number.isFinite(targetDefaults.presetPourCount) && targetDefaults.presetPourCount > 0
        ? Math.round(targetDefaults.presetPourCount)
        : undefined,
      pourStyle: targetDefaults.pourStyle || 'balanced',
      waterTdsPpm: Number.isFinite(targetDefaults.waterTdsPpm) ? targetDefaults.waterTdsPpm : 90,
      waterHardnessPpm: Number.isFinite(targetDefaults.waterHardnessPpm) ? targetDefaults.waterHardnessPpm : 50,
      waterAlkalinityPpm: Number.isFinite(targetDefaults.waterAlkalinityPpm) ? targetDefaults.waterAlkalinityPpm : 35,
      origamiFilterStyle: targetDefaults.origamiFilterStyle || 'auto',
      aeropressStyle: targetDefaults.aeropressStyle || 'auto',
      frenchPressStyle: targetDefaults.frenchPressStyle || 'auto',
    },
    visibleSummary: String(preset.visibleSummary || '').trim(),
    internalTips: Array.from(new Set((preset.internalTips || []).map((value) => String(value || '').trim()).filter(Boolean))),
    guardrails: Array.from(new Set((preset.guardrails || []).map((value) => String(value || '').trim()).filter(Boolean))),
    catalogVersion: preset.catalogVersion || CATALOG_VERSION,
  };
}

export function deriveHardnessFromCalciumMagnesium(calciumMgL: number, magnesiumMgL: number) {
  return roundTo(calciumMgL * 2.497 + magnesiumMgL * 4.118, 1);
}

export function deriveAlkalinityFromBicarbonate(bicarbonateMgL: number) {
  return roundTo(bicarbonateMgL * 0.82, 1);
}

export function validateWaterChemistryConsistency(
  tdsPpm: number | null,
  hardnessPpm: number | null,
  alkalinityPpm: number | null,
) {
  const errors: string[] = [];
  if (tdsPpm !== null && hardnessPpm !== null && hardnessPpm > tdsPpm) {
    errors.push(`GH (${hardnessPpm}) exceeds TDS (${tdsPpm}).`);
  }
  if (tdsPpm !== null && alkalinityPpm !== null && alkalinityPpm > tdsPpm) {
    errors.push(`KH (${alkalinityPpm}) exceeds TDS (${tdsPpm}).`);
  }
  return errors;
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hasPublicWaterSource(entry: RawPlatformWaterEntry) {
  return entry.sources.some((source) => /^https?:\/\//i.test(source.source_url))
    || /^https?:\/\//i.test(entry.primary_source.source_url);
}

function hasDirectPublicWaterSource(entry: RawPlatformWaterEntry) {
  return [...entry.sources, entry.primary_source].some((source) =>
    /^https?:\/\//i.test(source.source_url)
    && ['official_report', 'lab_report', 'brand_site'].includes(source.source_type),
  );
}

function mapCanonicalVerification(entry: RawPlatformWaterEntry): VerificationLevel {
  if (entry.verification_status === 'verified' && hasDirectPublicWaterSource(entry)) return 'official';
  if (entry.verification_status === 'curated') return 'curated';
  if (entry.verification_status === 'verified' && hasPublicWaterSource(entry)) return 'curated';
  return 'dataset_unverified';
}

function mapWaterMarkets(availableIn: string[], marketCode: RawPlatformWaterEntry['market_code']) {
  const known = availableIn
    .map((value) => {
      if (value === 'Indonesia') return 'id';
      if (value === 'Singapore') return 'sg';
      if (value === 'Brunei') return 'bn';
      if (value === 'Malaysia') return 'my';
      if (value === 'Global') return 'global';
      return null;
    })
    .filter((value): value is RawPlatformWaterEntry['market_code'] => Boolean(value));
  return Array.from(new Set(known.length > 0 ? known : [marketCode]));
}

const WATER_CLASSIFICATION_OVERRIDES: Partial<Record<string, {
  classification: WaterClassification;
  label: string;
  note: string;
  caution?: string;
}>> = {
  amidis: {
    classification: 'demineral_direct_experiment',
    label: 'Demineral direct experiment',
    note: 'Baristas may use Amidis as a clean low-mineral filter experiment or custom-water base, but it has almost no minerals for extraction structure.',
    caution: 'Use only as a low-confidence filter starting point; remineralize or blend for better sweetness, body, and repeatability.',
  },
  rivero: {
    classification: 'zero_mineral_ro',
    label: 'Zero mineral / RO',
    note: 'Ultra-low mineral water is better treated as a remineralization base than a ready-brew brand water.',
    caution: 'Add minerals manually before generating a plan.',
  },
  'air-alfamart': {
    classification: 'zero_mineral_ro',
    label: 'Zero mineral / RO',
    note: 'Observed around pH 7.4 and 1 ppm TDS, so it behaves like a demineralized reference.',
    caution: 'Add minerals manually before generating a plan.',
  },
  'air-indomaret': {
    classification: 'soft_balanced',
    label: 'Soft-balanced',
    note: 'Observed around pH 6.9 and 31 ppm TDS, so it sits in a softer bottled-water lane.',
    caution: 'GH and KH are still incomplete, so treat autofilled hardness and alkalinity as estimates.',
  },
  cleo: {
    classification: 'low_mineral_clarity',
    label: 'Low-mineral clarity',
    note: 'Very low-TDS water can make filter coffee read clean and bright, but it has little mineral buffer.',
    caution: 'Use as a cautious filter starting point; verify with taste, blend, or remineralize when body and cafe consistency matter.',
  },
  suci: {
    classification: 'zero_mineral_ro',
    label: 'Zero mineral / RO',
    note: 'Suci is positioned as distilled drinking water with zero TDS, so it is best treated as a blank remineralization base.',
    caution: 'Use remineralization before trusting this for filter brew.',
  },
  aqua: {
    classification: 'body_builder',
    label: 'Body builder',
    note: 'Known in Indonesian brewing as a broader, body-first mineral profile when the exact label panel is incomplete.',
  },
  vit: {
    classification: 'body_builder',
    label: 'Body builder',
    note: 'Mountain-sourced mineral water that is commonly treated as a fuller, body-forward bottled-water option.',
  },
  crystalline: {
    classification: 'body_builder',
    label: 'Body builder',
    note: 'A medium-mineral profile that usually reads broader and more body-forward than very soft bottled waters.',
  },
  'le-minerale': {
    classification: 'high_buffer',
    label: 'High buffer',
    note: 'Often treated as a stronger buffer profile in Indonesian brewing, so acidity can read softer or flatter.',
    caution: 'High-buffer waters can mute acidity if you do not tighten the brew manually.',
  },
  equil: {
    classification: 'high_buffer',
    label: 'High buffer',
    note: 'Equil is commonly treated as a premium buffered mineral water with a smoother, rounder filter-brew profile.',
    caution: 'Buffered waters can soften acidity if you do not tighten the recipe.',
  },
  'pure-life': {
    classification: 'soft_balanced',
    label: 'Soft-balanced',
    note: 'Often used as a soft-balanced bottled-water baseline for filter brewing in Indonesia and Singapore.',
  },
  club: {
    classification: 'soft_balanced',
    label: 'Soft-balanced',
    note: 'A softer bottled-water profile that stays approachable and usually needs only minor manual adjustment.',
  },
  ades: {
    classification: 'soft_balanced',
    label: 'Soft-balanced',
    note: 'A softer medium-water profile that is often safer than very hard bottled waters for manual brew.',
  },
  oasis: {
    classification: 'soft_balanced',
    label: 'Soft-balanced',
    note: 'Oasis sits in the softer bottled-water lane and is usually easier to tune than high-buffer waters.',
  },
  prima: {
    classification: 'soft_balanced',
    label: 'Soft-balanced',
    note: 'A softer medium-water profile that is usually easier to work with than high-buffer bottled waters.',
  },
  '2tang': {
    classification: 'balanced',
    label: 'Balanced',
    note: 'This is treated as a medium bottled-water profile with no strong body-building or high-buffer bias.',
  },
  'ron-88': {
    classification: 'balanced',
    label: 'Balanced',
    note: 'This is treated as a medium bottled-water profile with moderate mineral intensity.',
  },
  frozen: {
    classification: 'balanced',
    label: 'Balanced',
    note: 'A medium bottled-water profile that usually sits between very soft and high-buffer waters.',
  },
  'oasis-plus': {
    classification: 'alkaline_caution',
    label: 'Alkaline caution',
    note: 'Higher-pH alkaline water can flatten acidity and make delicate coffees read dull.',
    caution: 'Treat alkaline bottled waters as cautionary references, not ready-brew defaults.',
  },
  'total-8-plus': {
    classification: 'alkaline_caution',
    label: 'Alkaline caution',
    note: 'Higher-pH alkaline water can make cups feel flatter and less articulate.',
    caution: 'Treat alkaline bottled waters as cautionary references, not ready-brew defaults.',
  },
  'pristine-8-6-plus': {
    classification: 'alkaline_caution',
    label: 'Alkaline caution',
    note: 'Pristine 8.6+ has a usable published mineral panel, but its alkaline profile can soften acidity and mute florals.',
    caution: 'Use as a capped-confidence filter starting point; choose lower-buffer water if floral clarity feels muted.',
  },
  'pristine-8-plus': {
    classification: 'alkaline_caution',
    label: 'Alkaline caution',
    note: 'This alkaline bottled water is better treated as a cautionary reference than a ready-brew default.',
    caution: 'Expect flatter acidity unless you manually tighten the brew.',
  },
  'eternal-plus': {
    classification: 'alkaline_caution',
    label: 'Alkaline caution',
    note: 'Low-mineral alkaline water usually needs manual minerals and tighter brew control.',
    caution: 'Do not trust low-mineral alkaline water as-is for ready-brew autofill.',
  },
  perfect: {
    classification: 'alkaline_caution',
    label: 'Alkaline caution',
    note: 'Ionized alkaline water can mute clarity and flatten perceived acidity in filter coffee.',
    caution: 'Treat alkaline bottled waters as cautionary references, not ready-brew defaults.',
  },
};

const WATER_SOURCE_URL_OVERRIDES: Partial<Record<string, string[]>> = {
  '2tang': [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  aqua: [
    'https://www.sehataqua.co.id/blog/air-mineral-terbaik-untuk-mesin-kopi/',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'le-minerale': [
    'https://www.leminerale.com/product',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  vit: [
    'https://www.minumvit.co.id/',
    'https://repository.urecol.org/index.php/proceeding/article/download/1773/1739',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  ades: [
    'https://www.coca-cola.com/id/id/brands/ades',
    'https://repository.urecol.org/index.php/proceeding/article/download/1773/1739',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  club: [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  crystalline: [
    'https://crystalinwater.com/product',
    'https://repository.urecol.org/index.php/proceeding/article/download/1773/1739',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'crystaline-plus': [
    'https://crystalinwater.com/product',
    'https://repository.urecol.org/index.php/proceeding/article/download/1773/1739',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  frozen: [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'nestle-pure-life': [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  oasis: [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'oasis-plus': [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  perfect: [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  prima: [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'ron-88': [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'total-8-plus': [
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'pristine-8-6-plus': [
    'https://pristineofficial.com/tentang-ph86',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'pristine-8-plus': [
    'https://pristineofficial.com/tentang-ph86',
    'https://www.pristine8plus.com/',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  amidis: [
    'https://amidiswater.com/',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'air-alfamart': [
    'https://alfamart.co.id/',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  'air-indomaret': [
    'https://www.indomaret.co.id/news/detail/press-release--air-minum-indomaret',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  cleo: [
    'https://cleopurewater.com/',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
    'https://ottencoffee.co.id/majalah/merek-air-untuk-kopi-pilih-sesuai-selera-seduh-kopi',
  ],
  suci: [
    'https://www.tlt-ent.com/suci/',
    'https://www.tlt-ent.com/product/suci-drinking-water-1-5l/',
  ],
};

const TRUSTED_WATER_COMMUNITY_SOURCE_PATTERNS = [
  /ottencoffee\.co\.id/i,
  /repository\.urecol\.org/i,
  /labskylibrary\.labschool-unj\.sch\.id/i,
  /ottencoffee/i,
];

function getWaterSourceUrls(entry: RawPlatformWaterEntry) {
  return Array.from(new Set([
    ...entry.sources.map((source) => source.source_url),
    entry.primary_source.source_url,
    ...(WATER_SOURCE_URL_OVERRIDES[entry.brand_group_id] || []),
  ].filter(Boolean)));
}

function hasTrustedPublicWaterSource(entry: RawPlatformWaterEntry) {
  return getWaterSourceUrls(entry).some((sourceUrl) =>
    /^https?:\/\//i.test(sourceUrl)
    && TRUSTED_WATER_COMMUNITY_SOURCE_PATTERNS.some((pattern) => pattern.test(sourceUrl)),
  );
}

function hasRepoLocalCuratedWaterEvidence(entry: RawPlatformWaterEntry) {
  return [...entry.sources, entry.primary_source].some((source) =>
    source.source_type === 'community_reference'
    && /^local:\/data\/catalog\/raw-evidence\//i.test(source.source_url)
    && typeof source.confidence_score === 'number'
    && source.confidence_score >= 0.65,
  );
}

function classifyWaterBrand(
  entry: RawPlatformWaterEntry,
  tdsPpm: number | null,
  hardnessPpm: number | null,
  alkalinityPpm: number | null,
): {
  classification: WaterClassification;
  label: string;
  note: string;
  caution?: string;
} {
  const override = WATER_CLASSIFICATION_OVERRIDES[entry.brand_group_id];
  if (override) return override;

  const calcium = Number(entry.minerals_mg_l.calcium || 0);
  const bicarbonate = Number(entry.minerals_mg_l.bicarbonate || 0);
  const ph = entry.ph;

  if (
    entry.water_type === 'purified'
    || (tdsPpm !== null && tdsPpm <= 20)
    || ((tdsPpm ?? 999) <= 40 && (hardnessPpm ?? 999) <= 20 && (alkalinityPpm ?? 999) <= 18)
  ) {
    return {
      classification: 'zero_mineral_ro',
      label: 'Zero mineral / RO',
      note: 'Very low-mineral water works best as a blank canvas or with manual remineralization.',
      caution: 'Use manual minerals before trusting this water for filter-brew accuracy.',
    };
  }

  if (ph !== null && ph >= 8.2) {
    return {
      classification: 'alkaline_caution',
      label: 'Alkaline caution',
      note: 'Higher-pH bottled water can flatten acidity and make the cup read dull.',
      caution: 'Watch for flat or muted cups with delicate coffees.',
    };
  }

  if (bicarbonate >= 100 || (alkalinityPpm !== null && alkalinityPpm >= 80)) {
    return {
      classification: 'high_buffer',
      label: 'High buffer',
      note: 'Bicarbonate-heavy water can tame sharp acidity, but it may also reduce clarity.',
      caution: 'High-buffer waters can mute acidity if you do not tighten the brew manually.',
    };
  }

  if (calcium >= 30 || (hardnessPpm !== null && hardnessPpm >= 75)) {
    return {
      classification: 'body_builder',
      label: 'Body builder',
      note: 'Higher-calcium water tends to build more body and broader sweetness.',
    };
  }

  if (
    tdsPpm !== null
    && tdsPpm >= 60
    && tdsPpm <= 170
    && hardnessPpm !== null
    && hardnessPpm >= 35
    && hardnessPpm <= 80
    && alkalinityPpm !== null
    && alkalinityPpm >= 25
    && alkalinityPpm <= 70
  ) {
    return {
      classification: 'soft_balanced',
      label: 'Soft-balanced',
      note: 'Balanced bottled water that usually stays approachable for filter brewing.',
    };
  }

  if (entry.publish_state === 'published' && entry.is_brew_ready) {
    return {
      classification: 'balanced',
      label: 'Balanced',
      note: 'This water sits in a broadly usable range for manual brew.',
    };
  }

  return {
    classification: 'manual_required',
    label: 'Estimated baseline',
    note: 'The mineral panel is incomplete, so the planner falls back to a conservative brew baseline.',
    caution: 'Treat this water as estimated until a full mineral panel is available.',
  };
}

const WATER_CLASSIFICATION_BASELINES: Record<WaterClassification, {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
}> = {
  balanced: { tdsPpm: 120, hardnessPpm: 60, alkalinityPpm: 45 },
  low_mineral: { tdsPpm: 28, hardnessPpm: 20, alkalinityPpm: 16 },
  soft_low_buffer: { tdsPpm: 65, hardnessPpm: 32, alkalinityPpm: 24 },
  moderate: { tdsPpm: 110, hardnessPpm: 58, alkalinityPpm: 42 },
  moderate_upper_buffered: { tdsPpm: 130, hardnessPpm: 62, alkalinityPpm: 62 },
  hard_mineral: { tdsPpm: 190, hardnessPpm: 125, alkalinityPpm: 70 },
  high_tds: { tdsPpm: 240, hardnessPpm: 95, alkalinityPpm: 75 },
  blocked_unsuitable: { tdsPpm: 300, hardnessPpm: 160, alkalinityPpm: 130 },
  soft_balanced: { tdsPpm: 95, hardnessPpm: 52, alkalinityPpm: 35 },
  body_builder: { tdsPpm: 120, hardnessPpm: 72, alkalinityPpm: 48 },
  high_buffer: { tdsPpm: 145, hardnessPpm: 58, alkalinityPpm: 92 },
  zero_mineral_ro: { tdsPpm: 12, hardnessPpm: 10, alkalinityPpm: 8 },
  low_mineral_clarity: { tdsPpm: 20, hardnessPpm: 12, alkalinityPpm: 10 },
  demineral_direct_experiment: { tdsPpm: 2, hardnessPpm: 1.4, alkalinityPpm: 1.2 },
  alkaline_caution: { tdsPpm: 80, hardnessPpm: 40, alkalinityPpm: 24 },
  manual_required: { tdsPpm: 110, hardnessPpm: 55, alkalinityPpm: 40 },
};

function validatePlannerWaterAutofillBounds(
  tdsPpm: number | null,
  hardnessPpm: number | null,
  alkalinityPpm: number | null,
) {
  const errors: string[] = [];
  if (tdsPpm !== null && (tdsPpm < 0 || tdsPpm > 600)) {
    errors.push('Water TDS is outside planner autofill bounds; verify or enter minerals manually.');
  }
  if (hardnessPpm !== null && (hardnessPpm < 0 || hardnessPpm > 500)) {
    errors.push('Water hardness is outside planner autofill bounds; verify or enter minerals manually.');
  }
  if (alkalinityPpm !== null && (alkalinityPpm < 0 || alkalinityPpm > 400)) {
    errors.push('Water alkalinity is outside planner autofill bounds; verify or enter minerals manually.');
  }
  return errors;
}

function normalizeWaterBrand(entry: RawPlatformWaterEntry): WaterBrandProfile {
  const tdsPpm = Number.isFinite(entry.tds_ppm) ? Number(entry.tds_ppm) : null;
  const directHardness = Number.isFinite(entry.coffee_parameters.hardness_ppm_as_caco3)
    ? Number(entry.coffee_parameters.hardness_ppm_as_caco3)
    : null;
  const directAlkalinity = Number.isFinite(entry.coffee_parameters.alkalinity_ppm_as_caco3)
    ? Number(entry.coffee_parameters.alkalinity_ppm_as_caco3)
    : null;
  const ionHardness = Number.isFinite(entry.minerals_mg_l.calcium) && Number.isFinite(entry.minerals_mg_l.magnesium)
    ? deriveHardnessFromCalciumMagnesium(Number(entry.minerals_mg_l.calcium), Number(entry.minerals_mg_l.magnesium))
    : null;
  const ionAlkalinity = Number.isFinite(entry.minerals_mg_l.bicarbonate)
    ? deriveAlkalinityFromBicarbonate(Number(entry.minerals_mg_l.bicarbonate))
    : null;

  const hardnessPpm = directHardness ?? ionHardness;
  const alkalinityPpm = directAlkalinity ?? ionAlkalinity;
  const consistencyErrors = validateWaterChemistryConsistency(tdsPpm, hardnessPpm, alkalinityPpm);
  const plannerBoundsErrors = validatePlannerWaterAutofillBounds(tdsPpm, hardnessPpm, alkalinityPpm);
  const classification = classifyWaterBrand(entry, tdsPpm, hardnessPpm, alkalinityPpm);
  const classificationIsZeroMineral = classification.classification === 'zero_mineral_ro';
  const classificationIsLowMineralClarity = classification.classification === 'low_mineral_clarity';
  const classificationIsDemineralDirectExperiment = classification.classification === 'demineral_direct_experiment';
  const classificationIsAlkaline = classification.classification === 'alkaline_caution';
  const classificationIsHighBuffer = classification.classification === 'high_buffer';
  const estimatedData = entry.data_quality?.is_estimated === true;
  const directPublicSource = hasDirectPublicWaterSource(entry);
  const completeMineralPanel = tdsPpm !== null && hardnessPpm !== null && alkalinityPpm !== null;
  const trustedCuratedSource = hasTrustedPublicWaterSource(entry);
  const localCuratedEvidence = hasRepoLocalCuratedWaterEvidence(entry);
  const officialSourceBacked = directPublicSource && entry.verification_status === 'verified';
  const trustedCommunitySourceBacked = entry.verification_status === 'curated'
    && trustedCuratedSource
    && localCuratedEvidence
    && completeMineralPanel;
  const sourceBackedForAutofill = officialSourceBacked || trustedCommunitySourceBacked;
  const missingTrustedSource = !sourceBackedForAutofill;
  const sourceBackedAlkalinePanel = classificationIsAlkaline
    && sourceBackedForAutofill
    && completeMineralPanel
    && entry.coffee_parameters.brew_recommendation !== 'poor';
  const policyBlockReasons = [
    ...(classificationIsZeroMineral
      ? ['Water is too low-mineral for ready-brew use; add minerals manually.']
      : []),
    ...(estimatedData
      ? ['Estimated water values must be verified manually before ready-brew use.']
      : []),
    ...(missingTrustedSource
      ? ['Water chemistry is not backed by official or trusted public community evidence; enter TDS, GH, and KH manually.']
      : []),
    ...plannerBoundsErrors,
  ];
  const mergedBrewBlockReason = Array.from(new Set([
    ...entry.brew_block_reason,
    ...consistencyErrors,
    ...policyBlockReasons,
  ]));
  const isBrewReady = entry.is_brew_ready
    && mergedBrewBlockReason.length === 0
    && sourceBackedForAutofill
    && !classificationIsZeroMineral
    && !estimatedData;
  const baseline = WATER_CLASSIFICATION_BASELINES[classification.classification];
  const filledTdsPpm = tdsPpm ?? baseline.tdsPpm;
  const filledHardnessPpm = hardnessPpm ?? baseline.hardnessPpm;
  const filledAlkalinityPpm = alkalinityPpm ?? baseline.alkalinityPpm;
  const resolvedMinerals = tdsPpm !== null && hardnessPpm !== null && alkalinityPpm !== null
    ? {
        tdsPpm,
        hardnessPpm,
        alkalinityPpm,
        derivation: trustedCommunitySourceBacked && !officialSourceBacked
          ? 'estimated_from_community_profile' as const
          : directHardness !== null && directAlkalinity !== null ? 'direct' as const : 'derived_from_ions' as const,
      }
    : {
        tdsPpm: filledTdsPpm,
        hardnessPpm: filledHardnessPpm,
        alkalinityPpm: filledAlkalinityPpm,
        derivation: 'estimated_from_classification' as const,
      };

  const resolvedMineralsAreEstimated = resolvedMinerals.derivation === 'estimated_from_classification';
  const requiresManualPreset = !isBrewReady
    || classificationIsZeroMineral
    || estimatedData
    || missingTrustedSource
    || resolvedMineralsAreEstimated
    || (classificationIsAlkaline && !sourceBackedAlkalinePanel);
  const canAutofillBrand = !entry.is_sparkling
    && !requiresManualPreset
    && tdsPpm !== null
    && hardnessPpm !== null
    && alkalinityPpm !== null;
  const presetStatus: WaterPresetStatus = canAutofillBrand
    ? 'autofill'
    : entry.sources.length > 0
      ? 'manual_required'
      : 'info_only';
  const verificationLevel = mapCanonicalVerification(entry);

  return {
    id: entry.id,
    brandGroupId: entry.brand_group_id,
    marketCode: entry.market_code,
    skuLabel: entry.sku_label,
    label: `${entry.brand} ${entry.market_code.toUpperCase()}`,
    shortLabel: entry.brand,
    subtitle: `${entry.available_in.join(', ')} \u00B7 ${entry.country_origin}`,
    country: entry.country_origin,
    markets: mapWaterMarkets(entry.available_in, entry.market_code),
    searchText: entry.search_text || buildSearchText(entry.brand, entry.country_origin, entry.market_code, ...entry.aliases),
    description: canAutofillBrand
      ? officialSourceBacked
        ? `${entry.brand} is source-backed and ready as a starting brew-water preset for ${entry.available_in.join(', ')}.`
        : `${entry.brand} uses trusted curated/community water evidence as a starting point for ${entry.available_in.join(', ')}; verify with a meter for cafe-standard precision.`
      : `${entry.brand} is tracked for ${entry.available_in.join(', ')}, but needs manual mineral review before generation.`,
    notes: mergedBrewBlockReason.length > 0
      ? [...mergedBrewBlockReason, classification.note, ...(classification.caution ? [classification.caution] : [])]
      : [
          ...(trustedCommunitySourceBacked ? ['Curated/community water values are used as a starting point; verify TDS, GH, and KH when precision matters.'] : []),
          classification.note,
          ...(classification.caution ? [classification.caution] : []),
        ],
    presetStatus,
    publishState: entry.publish_state,
    isBrewReady: isBrewReady,
    brewBlockReason: mergedBrewBlockReason,
    still: !entry.is_sparkling,
    recommendedForFilter: canAutofillBrand
      && entry.coffee_parameters.brew_recommendation !== 'poor'
      && !classificationIsHighBuffer
      && !classificationIsAlkaline
      && (!classificationIsLowMineralClarity || entry.coffee_parameters.brew_recommendation === 'acceptable')
      && (!classificationIsDemineralDirectExperiment || entry.coffee_parameters.brew_recommendation === 'acceptable'),
    classification: classification.classification,
    classificationLabel: classification.label,
    classificationNote: classification.note,
    classificationCaution: classification.caution,
    chemistry: {
      tdsPpm: tdsPpm ?? undefined,
      hardnessPpm: directHardness ?? undefined,
      alkalinityPpm: directAlkalinity ?? undefined,
      calciumMgL: entry.minerals_mg_l.calcium ?? undefined,
      magnesiumMgL: entry.minerals_mg_l.magnesium ?? undefined,
      bicarbonateMgL: entry.minerals_mg_l.bicarbonate ?? undefined,
      sodiumMgL: entry.minerals_mg_l.sodium ?? undefined,
    },
    resolvedMinerals,
    source: entry.sources[0]?.source_type || 'catalog_platform',
    sourceUrls: getWaterSourceUrls(entry).filter((sourceUrl) => /^https?:\/\//i.test(sourceUrl)),
    verificationLevel,
    verifiedAt: CATALOG_VERSION,
    popularityTier: entry.publish_state === 'published' ? 'widely_used' : 'specialty_common',
    marketSegment: entry.available_in.includes('Indonesia') || entry.available_in.includes('Singapore') ? 'mass_market' : 'specialty_mainstream',
    releaseStatus: 'established',
    confidence: verificationLevel === 'official' ? 'high' : verificationLevel === 'curated' ? 'medium' : 'low',
    catalogVersion: CATALOG_VERSION,
  };
}

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Failed to load AI Brew catalog asset: ${path}`);
  }
  return response.json() as Promise<T>;
}

function getCollectionItems<T>(payload: JsonCollectionPayload<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.items) ? payload.items : [];
}

function getCollectionVersion<T>(payload: JsonCollectionPayload<T>): string | undefined {
  if (Array.isArray(payload)) return undefined;
  return payload.catalogVersion || payload.version;
}

export async function loadAiBrewCatalog(): Promise<AiBrewCatalog> {
  if (catalogPromise) return catalogPromise;

  catalogPromise = Promise.all([
    readJson<JsonCollectionPayload<RawDripperCatalogEntry>>(FILES.drippers),
    readJson<JsonCollectionPayload<RawGrinderCatalogEntry>>(FILES.grinders),
    readJson<JsonCollectionPayload<TargetProfile>>(FILES.targets),
    readJson<JsonCollectionPayload<ProcessCatalogEntry>>(FILES.processes),
    readJson<JsonCollectionPayload<VarietyCatalogEntry>>(FILES.varieties),
    readJson<JsonCollectionPayload<RawPlatformWaterEntry>>(FILES.waterBrands),
    readJson<WaterGuidanceFile>(FILES.waterGuidance),
    readJson<JsonCollectionPayload<DeviceBrewProfile>>(FILES.deviceProfiles),
    readJson<JsonCollectionPayload<GrinderSettingReference>>(FILES.grinderSettings),
    readJson<MarketSignalsFile>(FILES.marketSignals),
    readJson<SwitchProgrammesFile>(FILES.switchProgrammes),
    readJson<SwitchDoseMatrixFile>(FILES.switchDoseMatrix),
    readJson<SwitchTroubleshootingFile>(FILES.switchTroubleshooting),
    readJson<SwitchKnowledgeFile>(FILES.switchKnowledge),
    readJson<JsonCollectionPayload<ManualBrewPreset>>(FILES.manualBrewPresets),
  ])
    .then(([
      drippers,
      grinders,
      targets,
      processes,
      varieties,
      waterBrands,
      waterGuidance,
      deviceProfiles,
      grinderSettings,
      marketSignals,
      switchProgrammes,
      switchDoseMatrix,
      switchTroubleshooting,
      switchKnowledge,
      manualBrewPresets,
    ]) => {
      const dripperItems = getCollectionItems(drippers);
      const grinderItems = getCollectionItems(grinders);
      const targetItems = getCollectionItems(targets);
      const processItems = getCollectionItems(processes);
      const varietyItems = getCollectionItems(varieties);
      const waterBrandItems = getCollectionItems(waterBrands);
      const deviceProfileItems = getCollectionItems(deviceProfiles);
      const grinderSettingItems = getCollectionItems(grinderSettings);
      const manualBrewPresetItems = getCollectionItems(manualBrewPresets);
      const equipmentSignals = Array.isArray(marketSignals.equipment) ? marketSignals.equipment : [];
      const signalMap = new Map(
        equipmentSignals.map((entry) => [`${entry.kind}:${entry.id}`, entry] as const),
      );

      return {
        catalogVersion:
          getCollectionVersion(processes)
          || getCollectionVersion(varieties)
          || getCollectionVersion(waterBrands)
          || waterGuidance.catalogVersion
          || getCollectionVersion(deviceProfiles)
          || getCollectionVersion(grinderSettings)
          || switchProgrammes.catalogVersion
          || switchDoseMatrix.catalogVersion
          || switchTroubleshooting.catalogVersion
          || switchKnowledge.catalogVersion
          || getCollectionVersion(manualBrewPresets)
          || marketSignals.catalogVersion
          || getCollectionVersion(drippers)
          || getCollectionVersion(grinders)
          || getCollectionVersion(targets)
          || CATALOG_VERSION,
        drippers: dripperItems.map((entry) => {
          const explicitId = typeof entry.id === 'string' && entry.id.trim() && !/^\d+$/.test(entry.id.trim())
            ? slugify(entry.id)
            : undefined;
          return normalizeDripper(
            entry,
            signalMap.get(`dripper:${explicitId || ''}`)
              || signalMap.get(`dripper:${slugify(entry.name)}`),
          );
        }),
        grinders: grinderItems.map((entry) =>
          normalizeGrinder(entry, signalMap.get(`grinder:${slugify(entry.name)}`)),
        ),
        processes: normalizeProcessEntries(processItems),
        varieties: varietyItems.map(normalizeVarietyEntry),
        waterBrands: waterBrandItems.map(normalizeWaterBrand),
        waterGuidance: {
          ...waterGuidance.item,
          catalogVersion: waterGuidance.item.catalogVersion || waterGuidance.catalogVersion || CATALOG_VERSION,
        },
        targetProfiles: targetItems.map((entry) => ({
          ...entry,
          catalogVersion: entry.catalogVersion || getCollectionVersion(targets) || CATALOG_VERSION,
        })),
        deviceProfiles: deviceProfileItems.map(normalizeDeviceProfile),
        grinderSettings: grinderSettingItems.map(normalizeGrinderSetting),
        manualBrewPresets: manualBrewPresetItems.map(normalizeManualBrewPreset),
        switchPresets: Array.isArray(switchProgrammes.publicPresets) ? switchProgrammes.publicPresets : [],
        switchProgrammes: Array.isArray(switchProgrammes.internalProgrammes) ? switchProgrammes.internalProgrammes : [],
        switchDoseMatrix: Array.isArray(switchDoseMatrix.rows) ? switchDoseMatrix.rows : [],
        switchTroubleshooting: Array.isArray(switchTroubleshooting.items) ? switchTroubleshooting.items : [],
        switchKnowledge: switchKnowledge.item,
      } satisfies AiBrewCatalog;
    })
    .catch((error) => {
      catalogPromise = null;
      throw error;
    });

  return catalogPromise;
}

export function findDripper(catalog: AiBrewCatalog, id: string) {
  return catalog.drippers.find((item) => item.id === id);
}

export function findGrinder(catalog: AiBrewCatalog, id: string) {
  return catalog.grinders.find((item) => item.id === id);
}

export function findProcessEntry(catalog: AiBrewCatalog, id: string) {
  const requestedId = String(id || '').trim();
  const canonicalId = PROCESS_CANONICAL_ID_ALIASES[requestedId] || requestedId;
  return catalog.processes.find((item) => item.id === canonicalId)
    || catalog.processes.find((item) => item.aliases.some((alias) => alias === requestedId));
}

export function findVarietyEntry(catalog: AiBrewCatalog, id: string) {
  const requestedId = String(id || '').trim();
  return catalog.varieties.find((item) => item.id === requestedId)
    || catalog.varieties.find((item) => item.aliases.some((alias) => alias === requestedId));
}

export function findManualBrewPreset(catalog: AiBrewCatalog, id: string) {
  const requestedId = String(id || '').trim();
  if (!requestedId) return undefined;
  return catalog.manualBrewPresets.find((item) => item.id === requestedId);
}

export function findWaterBrand(catalog: AiBrewCatalog, id: string) {
  return catalog.waterBrands.find((item) => item.id === id);
}

export function findTargetProfile(catalog: AiBrewCatalog, id: string) {
  return catalog.targetProfiles.find((item) => item.id === id);
}

export function findDeviceProfile(catalog: AiBrewCatalog, id: string) {
  return catalog.deviceProfiles.find((item) => item.id === id);
}

export function findGrinderSetting(catalog: AiBrewCatalog, id: string) {
  return catalog.grinderSettings.find((item) => item.id === id);
}

export function getAiBrewCatalogVersion() {
  return CATALOG_VERSION;
}






