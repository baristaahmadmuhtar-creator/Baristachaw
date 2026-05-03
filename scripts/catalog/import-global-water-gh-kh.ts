import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type SourceType =
  | 'label'
  | 'official_report'
  | 'brand_site'
  | 'regulator'
  | 'distributor'
  | 'community_reference'
  | 'catalog_seed';

type BrewRecommendation = 'excellent' | 'good' | 'acceptable' | 'poor';

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
  brand: string;
  country_origin: string;
  tds_ppm: number | null;
  coffee_parameters: {
    hardness_ppm_as_caco3: number | null;
    alkalinity_ppm_as_caco3: number | null;
    sca_match_score: number | null;
    brew_recommendation: BrewRecommendation;
  };
  is_brew_ready: boolean;
  brew_block_reason: string[];
  published: boolean;
  publish_state: 'published' | 'review_only' | 'rejected';
  sources: CatalogSource[];
  primary_source: CatalogSource | null;
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
  gh: number;
  kh: number;
}

const ROOT = path.resolve(process.cwd());
const WATERS_PATH = path.join(ROOT, 'data/catalog/normalized/phase1/waters.json');
const CSV_PATH = process.env.WATER_GLOBAL_GH_KH_CSV;
const CSV_SOURCE_URL = 'local:/data/catalog/raw-evidence/phase1/water-curated-dataset-snapshot.json#import-global-water-gh-kh';

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/é/g, 'e')
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
  return lines.slice(1).map((line) => {
    const [brand, country, tds, gh, kh] = line.split(',').map((v) => v.trim());
    return {
      brand,
      country,
      tds: Number.parseFloat(tds),
      gh: Number.parseFloat(gh),
      kh: Number.parseFloat(kh),
    } satisfies CsvRow;
  });
}

function validateConsistency(tds: number, gh: number, kh: number) {
  const errors: string[] = [];
  if (gh > tds) errors.push(`GH (${gh}) exceeds TDS (${tds}).`);
  if (kh > tds) errors.push(`KH (${kh}) exceeds TDS (${tds}).`);
  return errors;
}

function computeRecommendation(tds: number, gh: number, kh: number, hasCriticalFlag: boolean): BrewRecommendation {
  if (hasCriticalFlag) return 'poor';
  if (tds >= 70 && tds <= 170 && gh >= 35 && gh <= 80 && kh >= 20 && kh <= 70) return 'excellent';
  if (tds >= 45 && tds <= 220 && gh >= 20 && gh <= 110 && kh >= 10 && kh <= 95) return 'good';
  return 'acceptable';
}

function makeSource(nowIso: string): CatalogSource {
  return {
    source_type: 'catalog_seed',
    source_url: CSV_SOURCE_URL,
    collected_at: nowIso,
    confidence_score: 0.7,
  };
}

async function main() {
  if (!CSV_PATH) {
    throw new Error('Set WATER_GLOBAL_GH_KH_CSV to the internal curated CSV path before running this importer.');
  }

  const nowIso = new Date().toISOString();
  const [csvRaw, watersRaw] = await Promise.all([
    readFile(CSV_PATH, 'utf8'),
    readFile(WATERS_PATH, 'utf8'),
  ]);

  const rows = parseCsv(csvRaw)
    .filter((row) => Number.isFinite(row.tds) && Number.isFinite(row.gh) && Number.isFinite(row.kh));
  const waters = JSON.parse(watersRaw) as WatersFile;

  const byGroup = new Map<string, WaterRecord[]>();
  for (const item of waters.items) {
    const arr = byGroup.get(item.brand_group_id) || [];
    arr.push(item);
    byGroup.set(item.brand_group_id, arr);
  }

  let updatedRecords = 0;
  let matchedRows = 0;
  let unmatchedRows = 0;

  for (const row of rows) {
    const groupId = slugify(row.brand);
    const targets = byGroup.get(groupId) || [];
    if (targets.length === 0) {
      unmatchedRows += 1;
      continue;
    }
    matchedRows += 1;

    for (const record of targets) {
      const tds = roundTo(row.tds, 1);
      const gh = roundTo(row.gh, 1);
      const kh = roundTo(row.kh, 1);
      const consistencyErrors = validateConsistency(tds, gh, kh);
      const missingFields: string[] = [];
      const hasCriticalFlag = consistencyErrors.length > 0;

      const rec = computeRecommendation(tds, gh, kh, hasCriticalFlag);
      const source = makeSource(nowIso);
      const sourceMap = new Map<string, CatalogSource>();
      for (const existing of record.sources || []) sourceMap.set(existing.source_url, existing);
      sourceMap.set(source.source_url, source);

      record.tds_ppm = tds;
      record.coffee_parameters.hardness_ppm_as_caco3 = gh;
      record.coffee_parameters.alkalinity_ppm_as_caco3 = kh;
      record.coffee_parameters.brew_recommendation = rec;
      record.brew_block_reason = consistencyErrors;
      record.is_brew_ready = !hasCriticalFlag;
      record.publish_state = hasCriticalFlag ? 'review_only' : 'published';
      record.published = !hasCriticalFlag;
      record.sources = Array.from(sourceMap.values());
      record.primary_source = source;
      record.data_quality = {
        is_estimated: false,
        missing_fields: missingFields,
        completeness_score: 100,
      };
      record.updated_at = nowIso;

      updatedRecords += 1;
    }
  }

  const dedupeMap = new Map<string, WaterRecord>();
  for (const item of waters.items) {
    const key = `${item.brand_group_id}|${item.market_code}`;
    const current = dedupeMap.get(key);
    if (!current) {
      dedupeMap.set(key, item);
      continue;
    }
    const currentTs = Date.parse(current.updated_at || '1970-01-01T00:00:00.000Z') || 0;
    const nextTs = Date.parse(item.updated_at || '1970-01-01T00:00:00.000Z') || 0;
    if (nextTs >= currentTs) dedupeMap.set(key, item);
  }

  waters.items = Array.from(dedupeMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(WATERS_PATH, `${JSON.stringify(waters, null, 2)}\n`, 'utf8');

  console.log(`[import-global-water-gh-kh] rows=${rows.length} matched_rows=${matchedRows} unmatched_rows=${unmatchedRows} updated_records=${updatedRecords} final_records=${waters.items.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
