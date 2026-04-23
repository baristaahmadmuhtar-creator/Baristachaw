import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildWaterCoffeeParameters,
  buildWaterDataQuality,
  createDataQuality,
  pickPrimarySource,
} from '../../lib/catalog/metrics.js';
import type {
  AvailabilityConfidence,
  CatalogPublishState,
  CatalogSource,
  DripperRecord,
  GrinderRecord,
  SourceType,
  VerificationStatus,
  WaterMinerals,
  WaterRecord,
} from '../../lib/catalog/types.js';

type RawWaterEvidenceFile = {
  version: string;
  sourceRuns: Array<{
    id: string;
    datasetKind: string;
    region: string;
    sourceType: string;
    evidenceCount: number;
    publishableCount: number;
    partialCount: number;
    errorCount: number;
    notes?: string;
  }>;
  items: RawWaterEvidence[];
};

type RawWaterEvidence = {
  id: string;
  brand_group_id: string;
  market_code: string;
  sku_label: string;
  brand: string;
  aliases?: string[];
  country_origin: string;
  available_in: string[];
  water_type: WaterRecord['water_type'];
  is_sparkling: boolean;
  minerals_mg_l: WaterMinerals;
  ph: number | null;
  tds_ppm: number | null;
  verification_status: VerificationStatus;
  publish_state: CatalogPublishState;
  sources: CatalogSource[];
};

type RawEquipment = {
  id: string | number;
  name: string;
  brand?: string;
  type: string;
  coarse?: string;
  medium?: string;
  fine?: string;
  source?: string;
  sourceUrl?: string;
};

type MarketSignalRecord = {
  id: string;
  kind: 'dripper' | 'grinder';
  description?: string;
  source?: string;
  sourceUrls?: string[];
  verificationLevel?: string;
  popularityTier?: 'widely_used' | 'specialty_common' | 'emerging' | 'niche';
  marketSegment?: 'mass_market' | 'specialty_mainstream' | 'small_market';
};

const ROOT = path.resolve(process.cwd());
const AI_BREW_ROOT = path.join(ROOT, 'apps/web/public/data/ai-brew');
const RAW_EVIDENCE_ROOT = path.join(ROOT, 'data/catalog/raw-evidence/phase1');
const TARGET_ROOT = path.join(ROOT, 'data/catalog/normalized/phase1');
const REPORT_ROOT = path.join(ROOT, 'data/catalog/reports');
const VERSION = '2026.03.10-asean-first-phase1';
const PRIORITY_REGIONS = ['Indonesia', 'Brunei', 'Singapore', 'Malaysia'] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapVerificationStatus(level: string | undefined): VerificationStatus {
  if (level === 'official' || level === 'verified') return 'verified';
  if (level === 'community_verified' || level === 'curated') return 'curated';
  return 'review_required';
}

function mapSourceType(input: string | undefined): SourceType {
  const value = String(input || '').toLowerCase();
  if (value.includes('label')) return 'label';
  if (value.includes('report')) return 'official_report';
  if (value.includes('regulator')) return 'regulator';
  if (value.includes('distributor') || value.includes('retailer')) return 'distributor';
  if (value.includes('brand') || value.includes('official')) return 'brand_site';
  return 'community_reference';
}

function inferBrand(name: string): string {
  return name.split(' ')[0] || name;
}

function inferMaterial(input: string): DripperRecord['material'] {
  const text = input.toLowerCase();
  if (text.includes('glass')) return 'glass';
  if (text.includes('ceramic')) return 'ceramic';
  if (text.includes('steel') || text.includes('metal')) return 'metal';
  if (text.includes('air') || text.includes('plastic') || text.includes('resin')) return 'plastic';
  return null;
}

function inferGeometry(input: string): DripperRecord['geometry'] {
  const text = input.toLowerCase();
  if (text.includes('hybrid')) return 'hybrid';
  if (
    text.includes('switch')
    || text.includes('clever')
    || text.includes('immersion')
    || text.includes('variable')
  ) return 'hybrid';
  if (text.includes('flat')) return 'flat_bottom';
  if (
    text.includes('wave')
    || text.includes('gem')
    || text.includes('b75')
    || text.includes('april')
    || text.includes('orea')
    || text.includes('stagg')
    || text.includes('blue bottle')
  ) return 'flat_bottom';
  if (
    text.includes('trapezoid')
    || text.includes('cono')
    || text.includes('volcano')
    || text.includes('mountain')
    || text.includes('master')
    || text.includes('gravity insert')
    || text.includes('vietnam drip')
    || text.includes('loveramics')
    || text.includes('elf')
    || text.includes('cone')
    || text.includes('chemex')
    || text.includes('v60')
    || text.includes('origami')
    || text.includes('flower')
    || text.includes('kono')
  ) return 'conical';
  if (text.includes('dripper')) return 'conical';
  return null;
}

function inferRibType(input: string): DripperRecord['rib_type'] {
  const text = input.toLowerCase();
  if (text.includes('spiral')) return 'spiral';
  if (text.includes('vertical')) return 'vertical';
  if (text.includes('hybrid')) return 'hybrid';
  return null;
}

function inferFilterType(input: string): DripperRecord['filter_type'] {
  const text = input.toLowerCase();
  if (text.includes('metal')) return 'metal';
  if (text.includes('cloth')) return 'cloth';
  return 'paper';
}

function inferGrinderType(input: string): GrinderRecord['grinder_type'] {
  const text = input.toLowerCase();
  if (text.includes('electric')) return 'electric';
  if (text.includes('manual') || text.includes('klik') || text.includes('putaran') || text.includes('nomor') || text.includes('notch')) return 'hand';
  return null;
}

function inferStepType(input: string): GrinderRecord['step_type'] {
  const text = input.toLowerCase();
  if (text.includes('stepless')) return 'stepless';
  if (
    text.includes('stepped')
    || text.includes('klik')
    || text.includes('putaran')
    || text.includes('nomor')
    || text.includes('setting')
    || text.includes('notch')
    || text.includes('mark')
  ) return 'stepped';
  return null;
}

function readAvailabilityConfidence(status: VerificationStatus): AvailabilityConfidence {
  if (status === 'verified') return 'high';
  if (status === 'curated') return 'medium';
  return 'low';
}

function readFilterPriority(popularity: MarketSignalRecord['popularityTier']) {
  if (popularity === 'widely_used') return 95;
  if (popularity === 'specialty_common') return 82;
  if (popularity === 'emerging') return 68;
  return 50;
}

function buildSources(sourceType: string | undefined, urls: string[] | undefined, collectedAt: string): CatalogSource[] {
  return (urls || [])
    .filter(Boolean)
    .map((url) => ({
      source_type: mapSourceType(sourceType),
      source_url: url,
      collected_at: collectedAt,
      confidence_score:
        sourceType?.includes('official') || sourceType?.includes('brand')
          ? 0.95
          : sourceType?.includes('retailer') || sourceType?.includes('distributor')
            ? 0.76
            : 0.66,
    }));
}

function buildWaterBlockReasons(item: RawWaterEvidence, strictPublished: boolean) {
  const reasons: string[] = [];
  if (item.is_sparkling) reasons.push('Sparkling water is not brew-ready for manual coffee recommendations.');
  if (item.minerals_mg_l.calcium === null) reasons.push('Calcium is missing.');
  if (item.minerals_mg_l.magnesium === null) reasons.push('Magnesium is missing.');
  if (item.minerals_mg_l.bicarbonate === null) reasons.push('Bicarbonate is missing.');
  if (item.tds_ppm === null) reasons.push('TDS is missing.');
  if (item.sources.length === 0) reasons.push('No source URLs are attached.');
  if (strictPublished && reasons.length > 0) reasons.push('Strict verified publish requirements were not met for this market-specific variant.');
  return reasons;
}

function withGlobalAvailability(regions: string[], publishState: CatalogPublishState) {
  if (publishState !== 'published') return Array.from(new Set(['Global', ...regions]));
  return Array.from(new Set(['Global', ...PRIORITY_REGIONS, ...regions]));
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function normalizeWater(item: RawWaterEvidence): WaterRecord {
  const strictPublished = item.publish_state === 'published';
  const brewBlockReason = buildWaterBlockReasons(item, strictPublished);
  const isBrewReady = brewBlockReason.length === 0;
  const publishState: CatalogPublishState = strictPublished && isBrewReady ? 'published' : item.publish_state === 'rejected' ? 'rejected' : 'review_only';
  const published = publishState === 'published';
  const sources = item.sources;

  const record: WaterRecord = {
    id: item.id,
    brand_group_id: item.brand_group_id,
    market_code: item.market_code,
    sku_label: item.sku_label,
    brand: item.brand,
    country_origin: item.country_origin,
    available_in: item.available_in,
    water_type: item.water_type,
    is_sparkling: item.is_sparkling,
    is_brew_ready: isBrewReady,
    brew_block_reason: brewBlockReason,
    minerals_mg_l: item.minerals_mg_l,
    ph: item.ph,
    tds_ppm: item.tds_ppm,
    coffee_parameters: buildWaterCoffeeParameters({
      minerals_mg_l: item.minerals_mg_l,
      ph: item.ph,
      tds_ppm: item.tds_ppm,
      is_sparkling: item.is_sparkling,
    }),
    sources,
    primary_source: pickPrimarySource(sources),
    published,
    publish_state: publishState,
    search_text: `${item.brand} ${item.country_origin} ${item.market_code} ${item.sku_label} ${(item.aliases || []).join(' ')}`.toLowerCase(),
    aliases: Array.from(new Set([item.brand, ...(item.aliases || [])])),
    verification_status: item.verification_status,
    data_quality: buildWaterDataQuality({
      minerals_mg_l: item.minerals_mg_l,
      ph: item.ph,
      tds_ppm: item.tds_ppm,
      sources,
    }),
    updated_at: sources[0]?.collected_at || '2026-03-10T00:00:00.000Z',
  };

  return record;
}

function normalizeDripper(raw: RawEquipment, signal?: MarketSignalRecord): DripperRecord {
  const brand = raw.brand || inferBrand(raw.name);
  const model = raw.brand ? raw.name.replace(new RegExp(`^${raw.brand}\\s+`, 'i'), '') || raw.name : raw.name;
  const sources = signal?.sourceUrls?.length
    ? buildSources(signal.source, signal.sourceUrls, '2026-03-10T00:00:00.000Z')
    : buildSources(raw.source, raw.sourceUrl ? [raw.sourceUrl] : [], '2026-03-10T00:00:00.000Z');
  const geometry = inferGeometry(`${raw.name} ${raw.type}`);
  const filterType = inferFilterType(`${raw.name} ${raw.type}`);
  const verificationStatus = signal ? mapVerificationStatus(signal.verificationLevel) : sources.length > 0 ? 'verified' : 'review_required';
  const publishState: CatalogPublishState = sources.length > 0 && geometry && filterType && verificationStatus !== 'review_required'
    ? 'published'
    : 'review_only';

  return {
    id: String(raw.id),
    brand,
    model,
    material: inferMaterial(`${raw.name} ${raw.type}`),
    geometry,
    hole_count: null,
    rib_type: inferRibType(`${raw.name} ${raw.type}`),
    filter_type: filterType,
    capacity_cups: null,
    brew_style_notes: signal?.description || raw.type,
    available_in: withGlobalAvailability([], publishState),
    sources,
    primary_source: pickPrimarySource(sources),
    source_type: sources[0]?.source_type || null,
    confidence_score: sources[0]?.confidence_score || 0.25,
    manual_brew_capable: true,
    filter_priority: readFilterPriority(signal?.popularityTier),
    availability_confidence: readAvailabilityConfidence(verificationStatus),
    published: publishState === 'published',
    publish_state: publishState,
    search_text: `${brand} ${model} ${raw.type}`.toLowerCase(),
    aliases: [raw.name, `${brand} ${model}`.trim()],
    verification_status: verificationStatus,
    data_quality: createDataQuality({
      geometry,
      filter_type: filterType,
      sources,
    }, { estimated: publishState !== 'published' }),
    updated_at: sources[0]?.collected_at || '2026-03-10T00:00:00.000Z',
  };
}

function normalizeGrinder(raw: RawEquipment, signal?: MarketSignalRecord): GrinderRecord {
  const brand = raw.name.startsWith('1Zpresso')
    ? '1Zpresso'
    : raw.name.startsWith('TIMEMORE')
      ? 'TIMEMORE'
      : inferBrand(raw.name);
  const model = raw.name.replace(new RegExp(`^${brand}\\s+`, 'i'), '') || raw.name;
  const sources = signal?.sourceUrls?.length
    ? buildSources(signal.source, signal.sourceUrls, '2026-03-10T00:00:00.000Z')
    : buildSources(raw.source, raw.sourceUrl ? [raw.sourceUrl] : [], '2026-03-10T00:00:00.000Z');
  const grinderType = inferGrinderType(`${raw.name} ${raw.type}`);
  const stepType = inferStepType(`${raw.name} ${raw.type}`);
  const verificationStatus = signal ? mapVerificationStatus(signal.verificationLevel) : sources.length > 0 ? 'verified' : 'review_required';
  const hasPourOverRange = Boolean(raw.medium);
  const publishState: CatalogPublishState = sources.length > 0 && grinderType && stepType && hasPourOverRange && verificationStatus !== 'review_required'
    ? 'published'
    : 'review_only';

  return {
    id: String(raw.id),
    brand,
    model,
    grinder_type: grinderType,
    burr_type: null,
    burr_material: null,
    burr_size_mm: null,
    step_type: stepType,
    recommended_range: {
      espresso: raw.fine || null,
      pour_over: raw.medium || null,
      french_press: raw.coarse || null,
    },
    retention_notes: publishState === 'published'
      ? 'Use the linked source panel as the grind reference baseline.'
      : 'Held in review_only until source-backed filter guidance is confirmed.',
    available_in: withGlobalAvailability([], publishState),
    sources,
    primary_source: pickPrimarySource(sources),
    source_type: sources[0]?.source_type || null,
    confidence_score: sources[0]?.confidence_score || 0.25,
    manual_brew_capable: true,
    filter_priority: readFilterPriority(signal?.popularityTier),
    availability_confidence: readAvailabilityConfidence(verificationStatus),
    published: publishState === 'published',
    publish_state: publishState,
    search_text: `${brand} ${model} ${raw.type} ${signal?.description || ''}`.toLowerCase(),
    aliases: [raw.name, `${brand} ${model}`.trim()],
    verification_status: verificationStatus,
    data_quality: createDataQuality({
      grinder_type: grinderType,
      step_type: stepType,
      pour_over: raw.medium || null,
      sources,
    }, { estimated: publishState !== 'published' }),
    updated_at: sources[0]?.collected_at || '2026-03-10T00:00:00.000Z',
  };
}

async function main() {
  const waterEvidence = await readJson<RawWaterEvidenceFile>(path.join(RAW_EVIDENCE_ROOT, 'waters.asean-first.json'));
  const drippers = await readJson<{ items: RawEquipment[] }>(path.join(AI_BREW_ROOT, 'drippers.v2026-03.json'));
  const grinders = await readJson<{ items: RawEquipment[] }>(path.join(AI_BREW_ROOT, 'grinders.v2026-03.json'));
  const marketSignals = await readJson<{ equipment: MarketSignalRecord[] }>(path.join(AI_BREW_ROOT, 'market-signals.v2026-06.json'));

  const dripperSignals = new Map(
    marketSignals.equipment
      .filter((entry) => entry.kind === 'dripper')
      .map((entry) => [entry.id, entry] as const),
  );
  const grinderSignals = new Map(
    marketSignals.equipment
      .filter((entry) => entry.kind === 'grinder')
      .map((entry) => [entry.id, entry] as const),
  );

  const mappedWaters = waterEvidence.items.map(normalizeWater);
  const mappedDrippers = drippers.items.map((item) => normalizeDripper(item, dripperSignals.get(slugify(item.name))));
  const mappedGrinders = grinders.items.map((item) => normalizeGrinder(item, grinderSignals.get(slugify(item.name))));

  const ingestManifest = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    source_runs: waterEvidence.sourceRuns,
    totals: {
      waters_total: mappedWaters.length,
      waters_published: mappedWaters.filter((item) => item.published).length,
      waters_review_only: mappedWaters.filter((item) => item.publish_state === 'review_only').length,
      drippers_total: mappedDrippers.length,
      drippers_published: mappedDrippers.filter((item) => item.published).length,
      grinders_total: mappedGrinders.length,
      grinders_published: mappedGrinders.filter((item) => item.published).length,
    },
  };

  await mkdir(TARGET_ROOT, { recursive: true });
  await mkdir(REPORT_ROOT, { recursive: true });
  await writeFile(path.join(TARGET_ROOT, 'waters.json'), JSON.stringify({ version: VERSION, items: mappedWaters }, null, 2));
  await writeFile(path.join(TARGET_ROOT, 'drippers.json'), JSON.stringify({ version: VERSION, items: mappedDrippers }, null, 2));
  await writeFile(path.join(TARGET_ROOT, 'grinders.json'), JSON.stringify({ version: VERSION, items: mappedGrinders }, null, 2));
  await writeFile(path.join(REPORT_ROOT, 'phase1-ingest-manifest.json'), JSON.stringify(ingestManifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
