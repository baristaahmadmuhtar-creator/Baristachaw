import type {
  AiBrewCatalog,
  AiBrewMethodFamily,
  CatalogConfidence,
  CatalogMarketSegment,
  CatalogPopularityTier,
  CatalogReleaseStatus,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderSettingReference,
  ParsedNumericRange,
  ProcessCatalogEntry,
  RawDripperCatalogEntry,
  RawGrinderCatalogEntry,
  TargetProfile,
  VarietyCatalogEntry,
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
} as const;

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
  }>;
  verification_status: 'verified' | 'curated' | 'review_required';
  publish_state: WaterPublishState;
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
    precision: Math.max(decimalPlaces(min), decimalPlaces(max)),
  };
}

export function inferDripperMethodFamily(name: string, typeLabel: string): AiBrewMethodFamily {
  const haystack = `${name} ${typeLabel}`.toLowerCase();
  if (haystack.includes('espresso')) return 'espresso';
  if (haystack.includes('french press') || haystack.includes('press pot')) return 'french_press';
  if (haystack.includes('aeropress')) return 'aeropress';
  if (haystack.includes('siphon') || haystack.includes('syphon') || haystack.includes('vacuum')) return 'siphon';
  if (haystack.includes('moka') || haystack.includes('stovetop')) return 'moka_pot';
  if (haystack.includes('cold brew')) return 'cold_brew';
  if (haystack.includes('batch brewer') || haystack.includes('batch brew') || haystack.includes('automatic brewer')) return 'batch_brew';
  if (haystack.includes('chemex')) return 'chemex';
  if (haystack.includes('switch') || haystack.includes('clever') || haystack.includes('immersion')) {
    return 'clever_dripper';
  }
  if (haystack.includes('melitta') || haystack.includes('trapezoid') || haystack.includes('kalita 102')) {
    return 'melitta';
  }
  if (haystack.includes('kono')) return 'kono';
  if (haystack.includes('kalita')) return 'kalita_wave';
  if (haystack.includes('april')) return 'april';
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
  const verificationLevel = override?.verificationLevel || raw.verificationLevel || defaultVerificationLevel(raw.source);
  return {
    source: override?.source || raw.source || 'user_dataset',
    sourceUrls: override?.sourceUrls || toSourceUrls(raw.sourceUrl, raw.sourceUrls),
    verificationLevel,
    verifiedAt: override?.verifiedAt || raw.verifiedAt || raw.created_at || '2026-03-09',
    popularityTier: override?.popularityTier || raw.popularityTier || 'niche',
    marketSegment: override?.marketSegment || raw.marketSegment || 'small_market',
    releaseStatus: override?.releaseStatus || raw.releaseStatus || 'established',
    confidence: override?.confidence || raw.confidence || defaultConfidence(verificationLevel),
    catalogVersion: override?.catalogVersion || raw.catalogVersion || CATALOG_VERSION,
  };
}

function normalizeDripper(raw: RawDripperCatalogEntry, override?: MarketSignalRecord): EquipmentCatalogEntry {
  return {
    id: slugify(raw.name),
    kind: 'dripper',
    name: raw.name,
    brand: raw.brand,
    typeLabel: raw.type,
    description: override?.description || raw.description || undefined,
    searchText: buildSearchText(raw.name, raw.brand, raw.type, override?.description, raw.description || undefined),
    methodFamily: inferDripperMethodFamily(raw.name, raw.type),
    defaultProfileId: override?.defaultProfileId,
    ...applyEquipmentProvenance(raw, override),
  };
}

function normalizeGrinder(raw: RawGrinderCatalogEntry, override?: MarketSignalRecord): EquipmentCatalogEntry {
  const typeLabel = normalizeGrinderDisplayText(raw.type);
  const coarseLabel = normalizeGrinderDisplayText(raw.coarse);
  const mediumLabel = normalizeGrinderDisplayText(raw.medium);
  const fineLabel = normalizeGrinderDisplayText(raw.fine);

  return {
    id: slugify(raw.name),
    kind: 'grinder',
    name: raw.name,
    brand: raw.brand,
    typeLabel,
    description: override?.description,
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
    ),
    grindBands: {
      coarse: coarseLabel,
      medium: mediumLabel,
      fine: fineLabel,
      parsedMedium: parseNumericRange(mediumLabel),
    },
    ...applyEquipmentProvenance(raw, override),
  };
}

function normalizeSearchEntry<T extends { id: string; label: string; aliases: string[]; searchText?: string; sourceUrls: string[]; verificationLevel: VerificationLevel; verifiedAt: string; popularityTier: CatalogPopularityTier; marketSegment: CatalogMarketSegment; releaseStatus: CatalogReleaseStatus; confidence: CatalogConfidence; catalogVersion?: string; source: string; group: string; notes: string[]; origins?: string[] }>(
  entry: T,
): T {
  const normalizedOrigins = Array.isArray(entry.origins)
    ? Array.from(new Set(entry.origins.map((value) => String(value || '').trim()).filter(Boolean)))
    : undefined;

  return {
    ...entry,
    origins: normalizedOrigins,
    searchText: entry.searchText || buildSearchText(entry.label, entry.group, ...entry.aliases),
    catalogVersion: entry.catalogVersion || CATALOG_VERSION,
  };
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

function mapCanonicalVerification(entry: RawPlatformWaterEntry): VerificationLevel {
  if (entry.verification_status === 'verified') return 'official';
  if (entry.verification_status === 'curated') return 'curated';
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
    classification: 'zero_mineral_ro',
    label: 'Zero mineral / RO',
    note: 'Observed around 0 ppm TDS, so it is best treated as a blank remineralization base.',
    caution: 'Do not trust zero-mineral water as-is for stable filter extraction.',
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
    classification: 'zero_mineral_ro',
    label: 'Zero mineral / RO',
    note: 'Observed around pH 7.3 with TDS under 10 ppm, so it is better treated as a low-mineral blank canvas.',
    caution: 'Use manual minerals or remineralization before trusting this for filter brew.',
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
  amidis: [
    'https://amidiswater.com/',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
  ],
  'air-alfamart': [
    'https://alfamart.co.id/',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
  ],
  'air-indomaret': [
    'https://www.indomaret.co.id/news/detail/press-release--air-minum-indomaret',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
  ],
  cleo: [
    'https://cleopurewater.com/',
    'https://ottencoffee.co.id/majalah/rekomendasi-air-mineral-yang-bagus-untuk-kopi',
  ],
  suci: [
    'https://www.tlt-ent.com/suci/',
    'https://www.tlt-ent.com/product/suci-drinking-water-1-5l/',
  ],
};

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
  soft_balanced: { tdsPpm: 95, hardnessPpm: 52, alkalinityPpm: 35 },
  body_builder: { tdsPpm: 120, hardnessPpm: 72, alkalinityPpm: 48 },
  high_buffer: { tdsPpm: 145, hardnessPpm: 58, alkalinityPpm: 92 },
  zero_mineral_ro: { tdsPpm: 12, hardnessPpm: 10, alkalinityPpm: 8 },
  alkaline_caution: { tdsPpm: 80, hardnessPpm: 40, alkalinityPpm: 24 },
  manual_required: { tdsPpm: 110, hardnessPpm: 55, alkalinityPpm: 40 },
};

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
  const mergedBrewBlockReason = Array.from(new Set([...entry.brew_block_reason, ...consistencyErrors]));
  const isBrewReady = entry.is_brew_ready && mergedBrewBlockReason.length === 0;
  const classification = classifyWaterBrand(entry, tdsPpm, hardnessPpm, alkalinityPpm);
  const baseline = WATER_CLASSIFICATION_BASELINES[classification.classification];
  const filledTdsPpm = tdsPpm ?? baseline.tdsPpm;
  const filledHardnessPpm = hardnessPpm ?? baseline.hardnessPpm;
  const filledAlkalinityPpm = alkalinityPpm ?? baseline.alkalinityPpm;
  const resolvedMinerals = isBrewReady && tdsPpm !== null && hardnessPpm !== null && alkalinityPpm !== null
    ? {
        tdsPpm,
        hardnessPpm,
        alkalinityPpm,
        derivation: directHardness !== null && directAlkalinity !== null ? 'direct' as const : 'derived_from_ions' as const,
      }
    : {
        tdsPpm: filledTdsPpm,
        hardnessPpm: filledHardnessPpm,
        alkalinityPpm: filledAlkalinityPpm,
        derivation: 'estimated_from_classification' as const,
      };

  const presetStatus: WaterPresetStatus = !entry.is_sparkling && resolvedMinerals
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
    description: entry.publish_state === 'published'
      ? `${entry.brand} is source-backed and brew-ready for ${entry.available_in.join(', ')}.`
      : `${entry.brand} is tracked for ${entry.available_in.join(', ')}, but still needs manual minerals.`,
    notes: mergedBrewBlockReason.length > 0
      ? [...mergedBrewBlockReason, classification.note]
      : [classification.note],
    presetStatus,
    publishState: entry.publish_state,
    isBrewReady: isBrewReady,
    brewBlockReason: mergedBrewBlockReason,
    still: !entry.is_sparkling,
    recommendedForFilter: isBrewReady && entry.coffee_parameters.brew_recommendation !== 'poor',
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
    sourceUrls: Array.from(new Set([
      ...entry.sources
        .map((source) => source.source_url)
        .filter((sourceUrl) => /^https?:\/\//i.test(sourceUrl)),
      ...(WATER_SOURCE_URL_OVERRIDES[entry.brand_group_id] || []),
    ])),
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
    ]) => {
      const dripperItems = getCollectionItems(drippers);
      const grinderItems = getCollectionItems(grinders);
      const targetItems = getCollectionItems(targets);
      const processItems = getCollectionItems(processes);
      const varietyItems = getCollectionItems(varieties);
      const waterBrandItems = getCollectionItems(waterBrands);
      const deviceProfileItems = getCollectionItems(deviceProfiles);
      const grinderSettingItems = getCollectionItems(grinderSettings);
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
          || marketSignals.catalogVersion
          || getCollectionVersion(drippers)
          || getCollectionVersion(grinders)
          || getCollectionVersion(targets)
          || CATALOG_VERSION,
        drippers: dripperItems.map((entry) =>
          normalizeDripper(entry, signalMap.get(`dripper:${slugify(entry.name)}`)),
        ),
        grinders: grinderItems.map((entry) =>
          normalizeGrinder(entry, signalMap.get(`grinder:${slugify(entry.name)}`)),
        ),
        processes: processItems.map(normalizeSearchEntry),
        varieties: varietyItems.map(normalizeSearchEntry),
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
  return catalog.processes.find((item) => item.id === id);
}

export function findVarietyEntry(catalog: AiBrewCatalog, id: string) {
  return catalog.varieties.find((item) => item.id === id);
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






