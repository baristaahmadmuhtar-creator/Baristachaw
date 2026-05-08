import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type JsonObject = Record<string, unknown>;

type Source = {
  source_type?: string;
  source_url?: string;
  confidence_score?: number;
};

type WaterEntry = {
  id?: string;
  brand?: string;
  brand_group_id?: string;
  market_code?: string;
  country_origin?: string;
  publish_state?: string;
  verification_status?: string;
  is_brew_ready?: boolean;
  tds_ppm?: number | null;
  ph?: number | null;
  sku_label?: string;
  water_type?: string;
  classification?: string;
  primary_source?: Source;
  sources?: Source[];
  minerals_mg_l?: {
    calcium?: number | null;
    magnesium?: number | null;
    bicarbonate?: number | null;
  };
  coffee_parameters?: {
    hardness_ppm_as_caco3?: number | null;
    alkalinity_ppm_as_caco3?: number | null;
    brew_recommendation?: string;
  };
  data_quality?: {
    is_estimated?: boolean;
    completeness_score?: number;
  };
};

type GrinderEntry = {
  id?: string | number;
  name?: string;
  brand?: string;
  type?: string;
  source?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  verificationLevel?: string;
  confidence?: string;
  medium?: string;
};

type GrinderSettingEntry = {
  id?: string;
  grinderId?: string;
  profileIds?: string[];
  rangeLabel?: string;
  verificationLevel?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  verifiedAt?: string;
};

const root = process.cwd();
const reportDirArg = process.argv.find((arg) => arg.startsWith('--report-dir='));
const reportDir = path.resolve(root, reportDirArg ? reportDirArg.slice('--report-dir='.length) : 'artifacts/ai-brew-audit');

const waterCatalogPath = path.join(root, 'apps/web/public/data/catalog/phase1/waters.catalog.json');
const grinderPath = path.join(root, 'apps/web/public/data/ai-brew/grinders.v2026-03.json');
const grinderSettingPath = path.join(root, 'apps/web/public/data/ai-brew/grinder-settings.v2026-06.json');
const waterAuditPath = path.join(reportDir, 'water-audit-report.json');
const grinderAuditPath = path.join(reportDir, 'grinder-audit-report.json');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readItems<T>(filePath: string): T[] {
  const parsed = readJson<{ items?: T[] }>(filePath);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function readOptionalJson(filePath: string): JsonObject | null {
  if (!fs.existsSync(filePath)) return null;
  return readJson<JsonObject>(filePath);
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function increment(map: Record<string, number>, key: unknown) {
  const normalized = String(key ?? 'missing') || 'missing';
  map[normalized] = (map[normalized] || 0) + 1;
}

function sourceUrls(item: { sourceUrl?: string; sourceUrls?: string[] }) {
  return [...(item.sourceUrls || []), ...(item.sourceUrl ? [item.sourceUrl] : [])]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function allWaterSources(entry: WaterEntry) {
  return [...(entry.sources || []), ...(entry.primary_source ? [entry.primary_source] : [])];
}

function sourceDomain(url?: string) {
  const value = String(url || '');
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return 'invalid-url';
    }
  }
  if (value.startsWith('local:/data/catalog/raw-evidence/')) return 'repo-local-evidence';
  if (/^local:/i.test(value)) return 'local';
  return 'missing';
}

function gitValue(command: string) {
  try {
    return execSync(command, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unavailable';
  }
}

function toMarkdownTable(headers: string[], rows: string[][]) {
  const safe = (value: unknown) => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim() || '-';
  return [
    `| ${headers.map(safe).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(safe).join(' | ')} |`),
  ].join('\n');
}

const waters = readItems<WaterEntry>(waterCatalogPath);
const grinders = readItems<GrinderEntry>(grinderPath);
const grinderSettings = readItems<GrinderSettingEntry>(grinderSettingPath);
const waterAudit = readOptionalJson(waterAuditPath);
const grinderAudit = readOptionalJson(grinderAuditPath);

const waterMissing = {
  tds: [] as string[],
  gh: [] as string[],
  kh: [] as string[],
  ph: [] as string[],
  calcium: [] as string[],
  magnesium: [] as string[],
  bicarbonate: [] as string[],
  sourceUrl: [] as string[],
};
const waterCounts = {
  bySourceType: {} as Record<string, number>,
  byVerificationStatus: {} as Record<string, number>,
  byPublishState: {} as Record<string, number>,
  byMarketCode: {} as Record<string, number>,
  byCountry: {} as Record<string, number>,
  bySourceDomain: {} as Record<string, number>,
};
const waterRiskyEntries: Array<Record<string, unknown>> = [];

for (const entry of waters) {
  const id = entry.id || entry.brand || 'unknown-water';
  const sources = allWaterSources(entry);
  const sourceTypes = sources.map((source) => source.source_type || 'missing');
  for (const sourceType of sourceTypes.length ? sourceTypes : ['missing']) increment(waterCounts.bySourceType, sourceType);
  for (const source of sources.length ? sources : [{} as Source]) increment(waterCounts.bySourceDomain, sourceDomain(source.source_url));
  increment(waterCounts.byVerificationStatus, entry.verification_status);
  increment(waterCounts.byPublishState, entry.publish_state);
  increment(waterCounts.byMarketCode, entry.market_code);
  increment(waterCounts.byCountry, entry.country_origin);

  if (num(entry.tds_ppm) === null) waterMissing.tds.push(id);
  if (num(entry.coffee_parameters?.hardness_ppm_as_caco3) === null) waterMissing.gh.push(id);
  if (num(entry.coffee_parameters?.alkalinity_ppm_as_caco3) === null) waterMissing.kh.push(id);
  if (num(entry.ph) === null) waterMissing.ph.push(id);
  if (num(entry.minerals_mg_l?.calcium) === null) waterMissing.calcium.push(id);
  if (num(entry.minerals_mg_l?.magnesium) === null) waterMissing.magnesium.push(id);
  if (num(entry.minerals_mg_l?.bicarbonate) === null) waterMissing.bicarbonate.push(id);
  if (sources.every((source) => !source.source_url)) waterMissing.sourceUrl.push(id);

  const tds = num(entry.tds_ppm);
  const gh = num(entry.coffee_parameters?.hardness_ppm_as_caco3);
  const kh = num(entry.coffee_parameters?.alkalinity_ppm_as_caco3);
  const bicarbonate = num(entry.minerals_mg_l?.bicarbonate);
  const lowMineral = (tds !== null && tds <= 20) || (gh !== null && gh <= 15) || (kh !== null && kh <= 10);
  const highBuffer = (kh !== null && kh >= 80) || (bicarbonate !== null && bicarbonate >= 100);
  const estimated = Boolean(entry.data_quality?.is_estimated);
  const publicSource = sources.some((source) => /^https?:\/\//i.test(String(source.source_url || '')));
  const sourceConfidence = sources
    .map((source) => typeof source.confidence_score === 'number' ? source.confidence_score : null)
    .filter((value): value is number => value !== null);
  const maxConfidence = sourceConfidence.length ? Math.max(...sourceConfidence) : null;
  const lowConfidenceReady = entry.is_brew_ready === true && maxConfidence !== null && maxConfidence < 0.85;
  const publishedCommunityOnly = entry.publish_state === 'published' && !publicSource;

  if (lowMineral || highBuffer || estimated || lowConfidenceReady || publishedCommunityOnly) {
    waterRiskyEntries.push({
      id,
      brand: entry.brand || 'missing',
      market: entry.market_code || 'missing',
      status: lowMineral ? 'base_water_remineralize' : highBuffer ? 'high_buffer_caution' : estimated ? 'estimated_manual_review' : 'needs_evidence_review',
      isBrewReady: entry.is_brew_ready,
      reason: [
        lowMineral ? 'low mineral / RO-style baseline' : '',
        highBuffer ? 'high buffer can mute acidity/floral targets' : '',
        estimated ? 'estimated mineral values' : '',
        lowConfidenceReady ? 'ready state with confidence below 0.85' : '',
        publishedCommunityOnly ? 'published without public source' : '',
      ].filter(Boolean).join('; '),
      recommendedAction: lowMineral
        ? 'require remineralization or manual minerals before brewing'
        : highBuffer
          ? 'show high-buffer caution'
          : 'downgrade confidence and require evidence review',
    });
  }
}

const grinderCounts = {
  byVerificationLevel: {} as Record<string, number>,
  byConfidence: {} as Record<string, number>,
  byBrand: {} as Record<string, number>,
  byType: {} as Record<string, number>,
  bySourceDomain: {} as Record<string, number>,
};
const grinderRiskyEntries: Array<Record<string, unknown>> = [];

for (const grinder of grinders) {
  const id = String(grinder.id || grinder.name || 'unknown-grinder');
  const urls = sourceUrls(grinder);
  const verification = grinder.verificationLevel || (grinder.source === 'official_2026' ? 'official' : grinder.source === 'curated_2026' ? 'curated' : 'dataset_unverified');
  const confidence = grinder.confidence || (verification === 'official' ? 'high' : 'missing');
  increment(grinderCounts.byVerificationLevel, verification);
  increment(grinderCounts.byConfidence, confidence);
  increment(grinderCounts.byBrand, grinder.brand || 'missing');
  increment(grinderCounts.byType, grinder.type || 'missing');
  for (const url of urls.length ? urls : ['']) increment(grinderCounts.bySourceDomain, sourceDomain(url));

  const sourceMissing = urls.length === 0;
  const unofficialHighConfidence = verification !== 'official' && confidence === 'high';
  const fallback = verification === 'dataset_unverified' || confidence === 'low';
  if (sourceMissing || unofficialHighConfidence || fallback) {
    grinderRiskyEntries.push({
      id,
      name: grinder.name || id,
      brand: grinder.brand || 'missing',
      verification,
      confidence,
      reason: [
        sourceMissing ? 'missing public source URL' : '',
        unofficialHighConfidence ? 'high confidence without official verification' : '',
        fallback ? 'fallback or dataset-unverified starting point' : '',
      ].filter(Boolean).join('; '),
      recommendedAction: verification === 'official'
        ? 'keep official only if source remains public and model-specific'
        : 'show curated/estimated/fallback label and ask user to validate by drawdown and taste',
    });
  }
}

const settingsMissingZeroPoint = grinderSettings
  .filter((setting) => !('zero_point_method' in setting))
  .map((setting) => setting.id || `${setting.grinderId || 'unknown'}:${setting.rangeLabel || 'range'}`);
const settingsMissingMethodRanges = grinderSettings
  .filter((setting) => !Array.isArray(setting.profileIds) || setting.profileIds.length === 0)
  .map((setting) => setting.id || `${setting.grinderId || 'unknown'}:${setting.rangeLabel || 'range'}`);

const report = {
  generatedAt: new Date().toISOString(),
  repo: {
    branch: gitValue('git rev-parse --abbrev-ref HEAD'),
    head: gitValue('git rev-parse HEAD'),
    latestCommit: gitValue('git log -1 --pretty=%s'),
    workflowFiles: fs.existsSync(path.join(root, '.github/workflows'))
      ? fs.readdirSync(path.join(root, '.github/workflows')).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      : [],
  },
  sourceReports: {
    waterAuditReport: fs.existsSync(waterAuditPath) ? path.relative(root, waterAuditPath) : null,
    grinderAuditReport: fs.existsSync(grinderAuditPath) ? path.relative(root, grinderAuditPath) : null,
  },
  water: {
    totalProfiles: waters.length,
    counts: waterCounts,
    auditCounts: waterAudit?.counts || null,
    auditRiskCounts: (waterAudit?.aggregate as JsonObject | undefined)?.risks || null,
    missing: Object.fromEntries(Object.entries(waterMissing).map(([key, items]) => [key, { count: items.length, items }])),
    riskyEntries: waterRiskyEntries,
  },
  grinder: {
    totalModels: grinders.length,
    totalSettingReferences: grinderSettings.length,
    counts: grinderCounts,
    auditCounts: grinderAudit?.counts || null,
    auditRiskCounts: (grinderAudit?.aggregate as JsonObject | undefined)?.risks || null,
    settingsMissingZeroPoint: {
      count: settingsMissingZeroPoint.length,
      items: settingsMissingZeroPoint,
    },
    settingsMissingMethodRanges: {
      count: settingsMissingMethodRanges.length,
      items: settingsMissingMethodRanges,
    },
    riskyEntries: grinderRiskyEntries,
  },
  evidencePolicy: {
    waters: [
      'Official brand analysis, official lab report, or official label evidence outranks retailer/community/local evidence.',
      'RO, demineral, purified, and very-low-mineral waters are base water until remineralized.',
      'High-buffer waters can be brew-usable but must carry acidity/floral caution.',
      'Market/SKU variants must not be merged when mineral composition differs.',
    ],
    grinders: [
      'Official manuals and manufacturer charts outrank curated/community settings.',
      'Grinder settings are starting points affected by zero point, roast, age, dose, and method.',
      'Dataset-unverified or fallback models must not display official labels.',
    ],
  },
};

fs.mkdirSync(reportDir, { recursive: true });
const jsonPath = path.join(reportDir, 'dataQualityReport.json');
const mdPath = path.join(reportDir, 'dataQualityReport.md');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

const waterRiskRows = waterRiskyEntries.slice(0, 40).map((entry) => [
  String(entry.id),
  String(entry.brand),
  String(entry.market),
  String(entry.status),
  String(entry.reason),
  String(entry.recommendedAction),
]);
const grinderRiskRows = grinderRiskyEntries.slice(0, 40).map((entry) => [
  String(entry.id),
  String(entry.name),
  String(entry.verification),
  String(entry.confidence),
  String(entry.reason),
  String(entry.recommendedAction),
]);

fs.writeFileSync(mdPath, [
  '# AI Brew Data Quality Report',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  '## Repo',
  '',
  toMarkdownTable(['field', 'value'], Object.entries(report.repo).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)])),
  '',
  '## Water Summary',
  '',
  toMarkdownTable(['metric', 'value'], [
    ['total profiles', String(waters.length)],
    ['risky entries', String(waterRiskyEntries.length)],
    ['missing TDS', String(waterMissing.tds.length)],
    ['missing GH', String(waterMissing.gh.length)],
    ['missing KH', String(waterMissing.kh.length)],
    ['missing source URL', String(waterMissing.sourceUrl.length)],
  ]),
  '',
  '## Water Risky Entries',
  '',
  toMarkdownTable(['id', 'brand', 'market', 'status', 'reason', 'recommended action'], waterRiskRows),
  '',
  '## Grinder Summary',
  '',
  toMarkdownTable(['metric', 'value'], [
    ['total models', String(grinders.length)],
    ['setting references', String(grinderSettings.length)],
    ['risky entries', String(grinderRiskyEntries.length)],
    ['settings missing zero point method', String(settingsMissingZeroPoint.length)],
  ]),
  '',
  '## Grinder Risky Entries',
  '',
  toMarkdownTable(['id', 'name', 'verification', 'confidence', 'reason', 'recommended action'], grinderRiskRows),
  '',
].join('\n'));

console.log(`Wrote AI Brew data quality report: ${path.relative(root, jsonPath)}`);
console.log(`Wrote AI Brew data quality report: ${path.relative(root, mdPath)}`);
