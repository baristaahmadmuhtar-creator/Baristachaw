import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type VerificationStatus = 'verified' | 'curated' | 'review_required';
type BrewRecommendation = 'excellent' | 'good' | 'acceptable' | 'poor';

type SourceType =
  | 'label'
  | 'official_report'
  | 'brand_site'
  | 'regulator'
  | 'distributor'
  | 'community_reference'
  | 'catalog_seed';

interface CatalogSource {
  source_type: SourceType;
  source_url: string;
  collected_at: string;
  confidence_score: number;
}

interface WaterRecord {
  id: string;
  brand_group_id: string;
  market_code: string;
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
    brew_recommendation: BrewRecommendation;
  };
  sources: CatalogSource[];
  primary_source: CatalogSource | null;
  published: boolean;
  publish_state: 'published' | 'review_only' | 'rejected';
  search_text: string;
  aliases: string[];
  verification_status: VerificationStatus;
  data_quality: {
    is_estimated: boolean;
    missing_fields: string[];
    completeness_score: number;
  };
  updated_at: string;
}

interface WatersFile {
  version: string;
  items: WaterRecord[];
}

interface CsvRow {
  brand: string;
  country: string;
  tds: number;
  calcium_mg_l: number;
  magnesium_mg_l: number;
  hco3_mg_l: number;
  ph: number;
}

const ROOT = path.resolve(process.cwd());
const WATERS_PATH = path.join(ROOT, 'data/catalog/normalized/phase1/waters.json');
const CSV_PATH = 'C:/Users/Alpha/Downloads/Indonesia_Bottled_Water_Dataset__53_brands_.csv';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function roundTo(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split(/\r?\n/);
  const rows = lines.slice(1).map((line) => line.split(',').map((cell) => cell.trim()));
  return rows.map((cells) => ({
    brand: cells[0],
    country: cells[1],
    tds: Number.parseFloat(cells[2]),
    calcium_mg_l: Number.parseFloat(cells[3]),
    magnesium_mg_l: Number.parseFloat(cells[4]),
    hco3_mg_l: Number.parseFloat(cells[5]),
    ph: Number.parseFloat(cells[6]),
  }));
}

function computeGh(calcium: number, magnesium: number) {
  return roundTo((2.497 * calcium) + (4.118 * magnesium), 1);
}

function computeKh(hco3: number) {
  return roundTo(0.82 * hco3, 1);
}

function computeRecommendation(tds: number, gh: number, kh: number, hasCriticalFlag: boolean): BrewRecommendation {
  if (hasCriticalFlag) return 'poor';
  if (tds >= 70 && tds <= 170 && gh >= 35 && gh <= 80 && kh >= 20 && kh <= 70) return 'excellent';
  if (tds >= 45 && tds <= 220 && gh >= 20 && gh <= 110 && kh >= 10 && kh <= 95) return 'good';
  return 'acceptable';
}

function buildSource(collectedAt: string): CatalogSource {
  return {
    source_type: 'catalog_seed',
    source_url: 'local:/data/catalog/raw-evidence/phase1/water-curated-dataset-snapshot.json#import-indonesia-water-dataset',
    collected_at: collectedAt,
    confidence_score: 0.7,
  };
}

function buildRecord(row: CsvRow, existing: WaterRecord | undefined, nowIso: string): WaterRecord {
  const brandGroupId = slugify(row.brand);
  const id = `${brandGroupId}-id`;
  const gh = computeGh(row.calcium_mg_l, row.magnesium_mg_l);
  const kh = computeKh(row.hco3_mg_l);
  const missingFields: string[] = [];
  const brewBlockReason: string[] = [];

  if (!Number.isFinite(row.tds)) missingFields.push('tds');
  if (!Number.isFinite(row.calcium_mg_l)) missingFields.push('calcium');
  if (!Number.isFinite(row.magnesium_mg_l)) missingFields.push('magnesium');
  if (!Number.isFinite(row.hco3_mg_l)) missingFields.push('bicarbonate');

  if (Number.isFinite(gh) && Number.isFinite(row.tds) && gh > row.tds) {
    brewBlockReason.push(`GH (${gh}) exceeds TDS (${row.tds}).`);
  }
  if (Number.isFinite(kh) && Number.isFinite(row.tds) && kh > row.tds) {
    brewBlockReason.push(`KH (${kh}) exceeds TDS (${row.tds}).`);
  }

  const hasCriticalFlag = brewBlockReason.length > 0 || missingFields.length > 0;
  const completenessScore = Math.max(0, 100 - (missingFields.length * 16));
  const recommendation = computeRecommendation(row.tds, gh, kh, hasCriticalFlag);
  const source = buildSource(nowIso);
  const aliases = Array.from(new Set([row.brand, row.brand.toUpperCase()]));

  const sourceMap = new Map<string, CatalogSource>();
  for (const item of existing?.sources || []) {
    sourceMap.set(item.source_url, item);
  }
  sourceMap.set(source.source_url, source);
  const mergedSources = Array.from(sourceMap.values());

  const publishState = hasCriticalFlag ? 'review_only' : 'published';
  const isBrewReady = !hasCriticalFlag;

  return {
    id,
    brand_group_id: brandGroupId,
    market_code: 'id',
    sku_label: `${row.brand} natural mineral water`,
    brand: row.brand,
    country_origin: row.country || 'Indonesia',
    available_in: ['Indonesia'],
    water_type: 'natural_mineral',
    is_sparkling: false,
    is_brew_ready: isBrewReady,
    brew_block_reason: brewBlockReason,
    minerals_mg_l: {
      calcium: Number.isFinite(row.calcium_mg_l) ? roundTo(row.calcium_mg_l, 1) : null,
      magnesium: Number.isFinite(row.magnesium_mg_l) ? roundTo(row.magnesium_mg_l, 1) : null,
      sodium: existing?.minerals_mg_l.sodium ?? null,
      potassium: existing?.minerals_mg_l.potassium ?? null,
      bicarbonate: Number.isFinite(row.hco3_mg_l) ? roundTo(row.hco3_mg_l, 1) : null,
      sulfate: existing?.minerals_mg_l.sulfate ?? null,
      chloride: existing?.minerals_mg_l.chloride ?? null,
      silica: existing?.minerals_mg_l.silica ?? null,
    },
    ph: Number.isFinite(row.ph) ? row.ph : existing?.ph ?? null,
    tds_ppm: Number.isFinite(row.tds) ? roundTo(row.tds, 1) : null,
    coffee_parameters: {
      hardness_ppm_as_caco3: Number.isFinite(gh) ? gh : null,
      alkalinity_ppm_as_caco3: Number.isFinite(kh) ? kh : null,
      sca_match_score: existing?.coffee_parameters.sca_match_score ?? null,
      brew_recommendation: recommendation,
    },
    sources: mergedSources,
    primary_source: source,
    published: publishState === 'published',
    publish_state: publishState,
    search_text: `${row.brand} indonesia id ${row.brand} natural mineral water ${brandGroupId}`.toLowerCase(),
    aliases,
    verification_status: 'curated',
    data_quality: {
      is_estimated: false,
      missing_fields: missingFields,
      completeness_score: completenessScore,
    },
    updated_at: nowIso,
  };
}

async function main() {
  const nowIso = new Date().toISOString();
  const [csvRaw, watersRaw] = await Promise.all([
    readFile(CSV_PATH, 'utf8'),
    readFile(WATERS_PATH, 'utf8'),
  ]);

  const waters = JSON.parse(watersRaw) as WatersFile;
  const rows = parseCsv(csvRaw);
  const map = new Map(waters.items.map((item) => [item.id, item]));

  for (const row of rows) {
    const id = `${slugify(row.brand)}-id`;
    const existing = map.get(id);
    map.set(id, buildRecord(row, existing, nowIso));
  }

  const nextItems = Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  const next: WatersFile = {
    version: waters.version,
    items: nextItems,
  };

  await writeFile(WATERS_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');

  const updated = rows.length;
  const total = nextItems.length;
  const flagged = nextItems.filter((item) => item.brew_block_reason.length > 0).length;
  console.log(`[import-indonesia-water-dataset] updated_rows=${updated} total_records=${total} flagged_records=${flagged}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

