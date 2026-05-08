import fs from 'node:fs';
import path from 'node:path';

type AuditStatus =
  | 'OK_PUBLIC_DIRECT'
  | 'OK_PUBLIC_DERIVED'
  | 'OK_CURATED'
  | 'NEEDS_PUBLIC_SOURCE'
  | 'SHOULD_BE_MANUAL_REQUIRED'
  | 'ZERO_MINERAL_NOT_READY'
  | 'ALKALINE_CAUTION'
  | 'HIGH_BUFFER_REVIEW'
  | 'DATA_CONFLICT';

type Source = {
  source_type?: string;
  source_url?: string;
  confidence_score?: number;
};

type WaterEntry = {
  id?: string;
  brand_group_id?: string;
  market_code?: string;
  brand?: string;
  country_origin?: string;
  tds_ppm?: number | null;
  ph?: number | null;
  water_type?: string;
  is_sparkling?: boolean;
  is_brew_ready?: boolean;
  publish_state?: string;
  verification_status?: string;
  brew_block_reason?: string[];
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
    missing_fields?: string[];
    completeness_score?: number;
  };
  sku_label?: string;
  presetStatus?: string;
  classification?: string;
  updated_at?: string;
};

const root = process.cwd();
const waterPath = path.join(root, 'apps/web/public/data/catalog/phase1/waters.catalog.json');
const normalizedWaterPath = path.join(root, 'data/catalog/normalized/phase1/waters.json');
const repoLocalPrefix = 'local:/data/catalog/raw-evidence/';
const reportDirArg = process.argv.find((arg) => arg.startsWith('--report-dir='));
const reportDir = reportDirArg ? path.resolve(root, reportDirArg.slice('--report-dir='.length)) : '';

function readItems<T>(filePath: string): T[] {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { items?: T[] };
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function report(status: AuditStatus, subject: string, detail: string, fatal = false) {
  return { status, subject, detail, fatal };
}

function isLocalUsers(url?: string) {
  return /^local:\/Users\/Alpha\//i.test(String(url || ''));
}

function isRepoLocalEvidence(url?: string) {
  return String(url || '').startsWith(repoLocalPrefix);
}

function isPublicUrl(url?: string) {
  return /^https?:\/\//i.test(String(url || ''));
}

function repoLocalEvidenceExists(url?: string) {
  if (!isRepoLocalEvidence(url)) return false;
  const withoutHash = String(url).slice('local:/'.length).split('#')[0];
  return fs.existsSync(path.join(root, 'apps/web/public', withoutHash));
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function safeCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return text.replace(/\|/g, '\\|') || '-';
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
  if (value.startsWith(repoLocalPrefix)) return 'repo-local-evidence';
  if (/^local:/i.test(value)) return 'local';
  return 'missing';
}

function confidenceBucket(value: number | null) {
  if (value === null) return 'missing';
  if (value >= 0.85) return 'high';
  if (value >= 0.65) return 'medium';
  return 'low';
}

function increment(map: Record<string, number>, key: unknown) {
  const normalized = String(key ?? 'missing') || 'missing';
  map[normalized] = (map[normalized] || 0) + 1;
}

function toMarkdownTable(headers: string[], tableRows: string[][]) {
  const header = `| ${headers.map(safeCell).join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = tableRows.map((row) => `| ${row.map(safeCell).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

function hasPublicSource(entry: WaterEntry) {
  return [...(entry.sources || []), ...(entry.primary_source ? [entry.primary_source] : [])]
    .some((source) => isPublicUrl(source.source_url));
}

function hasPublicDirectSource(entry: WaterEntry) {
  return [...(entry.sources || []), ...(entry.primary_source ? [entry.primary_source] : [])]
    .some((source) => isPublicUrl(source.source_url) && ['official_report', 'lab_report', 'brand_site'].includes(String(source.source_type || '')));
}

function allSources(entry: WaterEntry) {
  return [...(entry.sources || []), ...(entry.primary_source ? [entry.primary_source] : [])];
}

const waters = readItems<WaterEntry>(waterPath);
const rows: ReturnType<typeof report>[] = [];
const aggregate = {
  bySourceType: {} as Record<string, number>,
  byVerificationStatus: {} as Record<string, number>,
  byPublishState: {} as Record<string, number>,
  byPresetStatus: {} as Record<string, number>,
  byBrewReady: {} as Record<string, number>,
  byClassification: {} as Record<string, number>,
  byConfidenceBucket: {} as Record<string, number>,
  bySourceDomain: {} as Record<string, number>,
  byMarketCode: {} as Record<string, number>,
  risks: {
    lowMineralBaseWater: 0,
    highBuffer: 0,
    alkalineCaution: 0,
    estimatedValues: 0,
    missingPublicSource: 0,
    communityOrLocalOnly: 0,
    missingGhKhTds: 0,
    missingCoreIons: 0,
    missingReviewDate: 0,
  },
};
const auditTable: Array<Record<string, string>> = [];

for (const sourceFilePath of [waterPath, normalizedWaterPath]) {
  if (!fs.existsSync(sourceFilePath)) continue;
  const raw = fs.readFileSync(sourceFilePath, 'utf8');
  if (/local:\/Users\/Alpha\//i.test(raw)) {
    rows.push(report(
      'NEEDS_PUBLIC_SOURCE',
      path.relative(root, sourceFilePath),
      'Private local source path is not allowed in normalized or published water catalog data.',
      true,
    ));
  }
}

for (const entry of waters) {
  const id = entry.id || '(missing id)';
  const subject = `${entry.brand || '(missing brand)'} / ${id}`;
  const sources = allSources(entry);
  const sourceTypes = sources.map((source) => source.source_type || 'missing');
  const sourceDomains = sources.map((source) => sourceDomain(source.source_url));
  const maxConfidence = sources
    .map((source) => typeof source.confidence_score === 'number' ? source.confidence_score : null)
    .filter((value): value is number => value !== null)
    .reduce<number | null>((max, value) => max === null ? value : Math.max(max, value), null);
  const requiredFields: Array<[string, unknown]> = [
    ['id', entry.id],
    ['brand_group_id', entry.brand_group_id],
    ['market_code', entry.market_code],
    ['brand', entry.brand],
    ['country_origin', entry.country_origin],
    ['sources', entry.sources],
    ['primary_source', entry.primary_source],
    ['publish_state', entry.publish_state],
    ['is_brew_ready', entry.is_brew_ready],
    ['data_quality', entry.data_quality],
  ];
  for (const [field, value] of requiredFields) {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') {
      rows.push(report('NEEDS_PUBLIC_SOURCE', subject, `Missing required field: ${field}`, true));
    }
  }

  for (const source of allSources(entry)) {
    if (isLocalUsers(source.source_url)) {
      rows.push(report('NEEDS_PUBLIC_SOURCE', subject, `Private local source path is not publishable: ${source.source_url}`, true));
    }
    if (source.source_type === 'official_report' && /^local:/i.test(String(source.source_url || ''))) {
      rows.push(report('NEEDS_PUBLIC_SOURCE', subject, 'local: source cannot be official_report.', true));
    }
    if (/^local:/i.test(String(source.source_url || '')) && !isRepoLocalEvidence(source.source_url)) {
      rows.push(report('NEEDS_PUBLIC_SOURCE', subject, `Local source must point to repo raw evidence: ${source.source_url}`, true));
    }
    if (isRepoLocalEvidence(source.source_url) && !repoLocalEvidenceExists(source.source_url)) {
      rows.push(report('NEEDS_PUBLIC_SOURCE', subject, `Repo-local raw evidence file is missing: ${source.source_url}`, true));
    }
    if (/^local:/i.test(String(source.source_url || '')) && typeof source.confidence_score === 'number' && source.confidence_score > 0.75) {
      rows.push(report('DATA_CONFLICT', subject, `Repo-local curated source confidence is too high: ${source.confidence_score}`, true));
    }
  }

  const tds = num(entry.tds_ppm);
  const gh = num(entry.coffee_parameters?.hardness_ppm_as_caco3);
  const kh = num(entry.coffee_parameters?.alkalinity_ppm_as_caco3);
  const bicarbonate = num(entry.minerals_mg_l?.bicarbonate);
  const ph = num(entry.ph);
  const lowMineral = (tds !== null && tds <= 20)
    || (gh !== null && gh <= 15)
    || (kh !== null && kh <= 10);
  const highBuffer = (kh !== null && kh >= 80) || (bicarbonate !== null && bicarbonate >= 100);
  const alkaline = ph !== null && ph >= 8.2;
  const estimated = Boolean(entry.data_quality?.is_estimated);
  const publicSource = hasPublicSource(entry);
  const publicDirectSource = hasPublicDirectSource(entry);
  const communityOrLocalOnly = !publicSource && sources.length > 0;
  const missingCoreIons = ['calcium', 'magnesium', 'bicarbonate']
    .some((field) => num(entry.minerals_mg_l?.[field as keyof NonNullable<WaterEntry['minerals_mg_l']>]) === null);
  const missingGhKhTds = tds === null || gh === null || kh === null;
  const missingReviewDate = !entry.updated_at && !sources.some((source) => source.source_url && 'collected_at' in source);

  for (const sourceType of sourceTypes.length ? sourceTypes : ['missing']) increment(aggregate.bySourceType, sourceType);
  for (const domain of sourceDomains.length ? sourceDomains : ['missing']) increment(aggregate.bySourceDomain, domain);
  increment(aggregate.byVerificationStatus, entry.verification_status);
  increment(aggregate.byPublishState, entry.publish_state);
  increment(aggregate.byPresetStatus, entry.presetStatus || entry.coffee_parameters?.brew_recommendation || 'missing');
  increment(aggregate.byBrewReady, String(entry.is_brew_ready));
  increment(aggregate.byClassification, entry.classification || entry.water_type);
  increment(aggregate.byConfidenceBucket, confidenceBucket(maxConfidence));
  increment(aggregate.byMarketCode, entry.market_code);
  if (lowMineral) aggregate.risks.lowMineralBaseWater += 1;
  if (highBuffer) aggregate.risks.highBuffer += 1;
  if (alkaline) aggregate.risks.alkalineCaution += 1;
  if (estimated) aggregate.risks.estimatedValues += 1;
  if (!publicSource) aggregate.risks.missingPublicSource += 1;
  if (communityOrLocalOnly) aggregate.risks.communityOrLocalOnly += 1;
  if (missingGhKhTds) aggregate.risks.missingGhKhTds += 1;
  if (missingCoreIons) aggregate.risks.missingCoreIons += 1;
  if (missingReviewDate) aggregate.risks.missingReviewDate += 1;

  let currentStatus = 'ready';
  let riskReason = 'none';
  let recommendedAction = 'allow as brew-ready baseline';
  let liveUiActionLabel = 'Ready';
  const evidenceGap: string[] = [];
  if (!publicDirectSource) evidenceGap.push(publicSource ? 'direct official/lab source missing' : 'public source missing');
  if (missingGhKhTds) evidenceGap.push('GH/KH/TDS incomplete');
  if (missingCoreIons) evidenceGap.push('core ion data incomplete');
  if (lowMineral) {
    currentStatus = 'base_water_remineralize';
    riskReason = 'very low mineral / RO-style water';
    recommendedAction = 'require manual remineralization before brewing';
    liveUiActionLabel = 'Manual Required';
  } else if (estimated) {
    currentStatus = 'estimated_manual_only';
    riskReason = 'estimated mineral values';
    recommendedAction = 'require manual verification';
    liveUiActionLabel = 'Estimated';
  } else if (highBuffer) {
    currentStatus = 'high_buffer_caution';
    riskReason = 'high alkalinity/buffer can mute acidity';
    recommendedAction = 'show caution and avoid idealizing bright/floral targets';
    liveUiActionLabel = 'High Buffer';
  } else if (alkaline) {
    currentStatus = 'alkaline_caution';
    riskReason = 'alkaline pH can mute acidity';
    recommendedAction = 'show caution';
    liveUiActionLabel = 'High Buffer';
  } else if (!publicSource) {
    currentStatus = 'curated_needs_review';
    riskReason = 'repo-local/community-only evidence';
    recommendedAction = 'keep curated and do not claim official';
    liveUiActionLabel = 'Manual Required';
  }

  if (tds !== null && gh !== null && kh !== null && gh + kh > tds * 2.5) {
    rows.push(report('DATA_CONFLICT', subject, `REVIEW_HIGH_BUFFER_SUM: GH+KH (${gh + kh}) is high versus TDS (${tds}).`, false));
  }
  if (gh !== null && tds !== null && gh > tds && !highBuffer) {
    rows.push(report('DATA_CONFLICT', subject, `GH exceeds TDS without high-buffer context: GH ${gh}, TDS ${tds}.`, false));
  }
  if (kh !== null && tds !== null && kh > tds && !highBuffer) {
    rows.push(report('DATA_CONFLICT', subject, `KH exceeds TDS without high-buffer context: KH ${kh}, TDS ${tds}.`, false));
  }

  if (lowMineral) {
    const manualReady = entry.is_brew_ready === false && entry.coffee_parameters?.brew_recommendation === 'poor';
    rows.push(report('ZERO_MINERAL_NOT_READY', subject, 'Low-mineral/RO water must be used as a base with manual minerals.', !manualReady));
  }
  if (estimated) {
    const safeEstimated = entry.is_brew_ready === false && entry.publish_state !== 'published';
    rows.push(report('SHOULD_BE_MANUAL_REQUIRED', subject, 'Estimated values must be verify-manually, not ready brew.', !safeEstimated));
  }
  if (alkaline) {
    const safeAlkaline = entry.is_brew_ready === false || hasPublicDirectSource(entry);
    rows.push(report('ALKALINE_CAUTION', subject, 'Alkaline water can mute acidity and should not be idealized.', !safeAlkaline));
  }
  if (highBuffer) {
    const notExcellent = entry.coffee_parameters?.brew_recommendation !== 'excellent';
    rows.push(report('HIGH_BUFFER_REVIEW', subject, 'High alkalinity/buffer can mute acidity; recommendation must not be excellent.', !notExcellent));
  }

  if (entry.publish_state === 'published') {
    if (hasPublicDirectSource(entry)) {
      rows.push(report('OK_PUBLIC_DIRECT', subject, 'Published entry has direct public source.', false));
    } else if (hasPublicSource(entry)) {
      rows.push(report('OK_PUBLIC_DERIVED', subject, 'Published entry has public supporting source but remains curated.', false));
    } else {
      rows.push(report('OK_CURATED', subject, 'Published entry uses repo-local curated evidence; UI must not claim official fact.', false));
    }
  } else {
    rows.push(report('OK_CURATED', subject, 'Review-only entry remains curated/manual.', false));
  }

  auditTable.push({
    id,
    brand: entry.brand || '(missing brand)',
    market: entry.market_code || 'missing',
    skuLabel: entry.sku_label || id,
    currentStatus,
    sourceTypes: sourceTypes.join(', ') || 'missing',
    primarySourceDomain: sourceDomain(entry.primary_source?.source_url),
    evidenceStrength: publicDirectSource ? 'public_direct' : publicSource ? 'public_supporting' : 'curated_local_or_community',
    currentReadyState: String(entry.is_brew_ready),
    riskReason,
    recommendedAction,
    evidenceGap: evidenceGap.join('; ') || 'none',
    liveUiActionLabel,
    notes: entry.coffee_parameters?.brew_recommendation || entry.water_type || '',
  });
}

const counts = rows.reduce<Record<string, number>>((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});
const fatalRows = rows.filter((row) => row.fatal);

console.log('Water catalog audit report');
for (const [status, count] of Object.entries(counts).sort()) {
  console.log(`- ${status}: ${count}`);
}
console.log('Water catalog aggregate risk summary');
for (const [status, count] of Object.entries(aggregate.risks).sort()) {
  console.log(`- ${status}: ${count}`);
}
for (const row of rows.filter((item) => item.fatal || item.status !== 'OK_CURATED' && item.status !== 'OK_PUBLIC_DIRECT' && item.status !== 'OK_PUBLIC_DERIVED')) {
  console.log(`[${row.status}] ${row.subject} :: ${row.detail}`);
}

if (reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, 'water-audit-report.json');
  const mdPath = path.join(reportDir, 'water-audit-report.md');
  const tableHeaders = [
    'id',
    'brand',
    'market',
    'sku/label',
    'current status',
    'source type(s)',
    'primary source domain',
    'evidence strength',
    'current ready state',
    'risk reason',
    'recommended action',
    'evidence gap',
    'live UI action label',
    'notes',
  ];
  const tableRows = auditTable.map((row) => [
    row.id,
    row.brand,
    row.market,
    row.skuLabel,
    row.currentStatus,
    row.sourceTypes,
    row.primarySourceDomain,
    row.evidenceStrength,
    row.currentReadyState,
    row.riskReason,
    row.recommendedAction,
    row.evidenceGap,
    row.liveUiActionLabel,
    row.notes,
  ]);
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    catalogPath: path.relative(root, waterPath),
    counts,
    aggregate,
    rows,
    auditTable,
  }, null, 2));
  fs.writeFileSync(mdPath, [
    '# Water Catalog Audit Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Status Counts',
    '',
    toMarkdownTable(['status', 'count'], Object.entries(counts).sort().map(([status, count]) => [status, String(count)])),
    '',
    '## Risk Counts',
    '',
    toMarkdownTable(['risk', 'count'], Object.entries(aggregate.risks).sort().map(([status, count]) => [status, String(count)])),
    '',
    '## Water Audit Table',
    '',
    toMarkdownTable(tableHeaders, tableRows),
    '',
  ].join('\n'));
  console.log(`Wrote water audit report: ${path.relative(root, jsonPath)}`);
  console.log(`Wrote water audit report: ${path.relative(root, mdPath)}`);
}

if (fatalRows.length > 0) {
  console.error(`FAIL: ${fatalRows.length} blocking water catalog issue(s).`);
  process.exit(1);
}

console.log('PASS: water catalog publish blockers are clear.');
