import fs from 'node:fs';
import path from 'node:path';

type AuditStatus =
  | 'PASS'
  | 'NEEDS_SOURCE'
  | 'CONFLICTING_RANGE'
  | 'UNPARSEABLE_RANGE'
  | 'DUPLICATE_OR_AMBIGUOUS_MODEL'
  | 'MISSING_SWITCH_PHYSICAL_CONSTRAINTS'
  | 'OK_CURATED'
  | 'OK_OFFICIAL';

type RawGrinder = {
  id?: string | number;
  name?: string;
  brand?: string;
  type?: string;
  coarse?: string;
  medium?: string;
  fine?: string;
  source?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  verificationLevel?: string;
  confidence?: string;
};

type GrinderSetting = {
  id?: string;
  grinderId?: string;
  profileIds?: string[];
  rangeLabel?: string;
  verificationLevel?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  confidence?: string;
  verifiedAt?: string;
};

type DeviceProfile = {
  id?: string;
  methodFamily?: string;
  exactMatch?: boolean;
  dripperIds?: string[];
  physicalConstraints?: {
    finishedCapacityMl?: number;
    recommendedClosedPhaseMaxMl?: number;
    workingHeadspaceMl?: number;
    filterSize?: string;
    coneType?: string;
  };
};

type ParsedRange = {
  min: number;
  max: number;
  unit: string;
};

const root = process.cwd();
const grinderPath = path.join(root, 'apps/web/public/data/ai-brew/grinders.v2026-03.json');
const settingPath = path.join(root, 'apps/web/public/data/ai-brew/grinder-settings.v2026-06.json');
const profilePath = path.join(root, 'apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json');
const reportDirArg = process.argv.find((arg) => arg.startsWith('--report-dir='));
const reportDir = reportDirArg ? path.resolve(root, reportDirArg.slice('--report-dir='.length)) : '';

function readItems<T>(filePath: string): T[] {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { items?: T[] };
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function compactText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeRangeUnit(label: string) {
  const normalized = label.toLowerCase();
  if (/click|klik/.test(normalized)) return 'click';
  if (/number|nomor/.test(normalized)) return 'number';
  if (/setting/.test(normalized)) return 'setting';
  if (/micron|µm|um/.test(normalized)) return 'micron';
  return normalized.replace(/[^a-z0-9]+/g, ' ').trim();
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
  if (/^local:/i.test(value)) return 'local';
  return 'missing';
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

function isExplicitReference(label?: string) {
  return /reference official grinder chart|official stepped settings|manual setting required/i.test(String(label || ''));
}

function parseRange(label?: string): ParsedRange | null {
  const text = String(label || '').trim();
  if (!text || isExplicitReference(text)) return null;
  const normalized = text
    .replace(/,/g, '.')
    .replace(/[–—]/g, '-')
    .replace(/\bto\b/gi, '-')
    .replace(/\s+/g, ' ');
  const parentheticalClickRange = normalized.match(/\((-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*(?:clicks?|klik)\)/i);
  const match = parentheticalClickRange
    || normalized.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
    || normalized.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] !== undefined ? Number(match[2]) : first;
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
    unit: normalizeRangeUnit(normalized),
  };
}

function sourceUrls(item: { sourceUrl?: string; sourceUrls?: string[] }) {
  return [...(item.sourceUrls || []), ...(item.sourceUrl ? [item.sourceUrl] : [])]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function effectiveVerification(grinder: RawGrinder) {
  if (grinder.verificationLevel) return grinder.verificationLevel;
  if (grinder.source === 'official_2026') return 'official';
  if (grinder.source === 'curated_2026') return 'curated';
  return 'dataset_unverified';
}

function report(status: AuditStatus, subject: string, detail: string, fatal = false) {
  return { status, subject, detail, fatal };
}

const grinders = readItems<RawGrinder>(grinderPath);
const settings = readItems<GrinderSetting>(settingPath);
const profiles = readItems<DeviceProfile>(profilePath);
const profileIds = new Set(profiles.map((profile) => profile.id).filter(Boolean));
const grinderIds = new Set<string>();
const rows: ReturnType<typeof report>[] = [];
const aggregate = {
  byVerificationLevel: {} as Record<string, number>,
  bySource: {} as Record<string, number>,
  byConfidence: {} as Record<string, number>,
  byBrand: {} as Record<string, number>,
  byGrinderType: {} as Record<string, number>,
  byUnitFamily: {} as Record<string, number>,
  bySourceDomain: {} as Record<string, number>,
  byRangeParseability: {} as Record<string, number>,
  risks: {
    datasetUnverifiedLowConfidence: 0,
    sourceMissing: 0,
    conflictingMediumRanges: 0,
    familyAliasAmbiguity: 0,
    referenceOnlyNoCalibrationAid: 0,
    missingBrand: 0,
    missingVerifiedAt: 0,
    overlyPreciseWithoutPrimaryEvidence: 0,
  },
};
const auditTable: Array<Record<string, string>> = [];

for (const grinder of grinders) {
  const name = String(grinder.name || '').trim();
  const id = slugify(name);
  const urls = sourceUrls(grinder);
  const verification = effectiveVerification(grinder);
  const parsedMedium = parseRange(grinder.medium);
  const unitStyle = parsedMedium?.unit || (isExplicitReference(grinder.medium) ? 'reference-only' : normalizeRangeUnit(String(grinder.type || 'unknown')));
  const sourceDomains = urls.map(sourceDomain);

  increment(aggregate.byVerificationLevel, verification);
  increment(aggregate.bySource, grinder.source);
  increment(aggregate.byConfidence, grinder.confidence || (verification === 'official' ? 'high' : 'missing'));
  increment(aggregate.byBrand, grinder.brand || 'missing');
  increment(aggregate.byGrinderType, grinder.type);
  increment(aggregate.byUnitFamily, unitStyle);
  increment(aggregate.byRangeParseability, parsedMedium || isExplicitReference(grinder.medium) ? 'parseable_or_reference' : 'unparseable');
  for (const domain of sourceDomains.length ? sourceDomains : ['missing']) increment(aggregate.bySourceDomain, domain);
  if (verification === 'dataset_unverified' && (grinder.confidence || 'low') === 'low') aggregate.risks.datasetUnverifiedLowConfidence += 1;
  if (urls.length === 0) aggregate.risks.sourceMissing += 1;
  if (!grinder.brand) aggregate.risks.missingBrand += 1;
  if (['official', 'community_verified', 'curated'].includes(verification) && !('verifiedAt' in grinder)) aggregate.risks.missingVerifiedAt += 1;
  if (verification !== 'official' && /(?:\d+\.\d{2,}|\d+\s*-\s*\d+\.\d{2,})/.test(`${grinder.coarse} ${grinder.medium} ${grinder.fine}`)) {
    aggregate.risks.overlyPreciseWithoutPrimaryEvidence += 1;
  }

  if (!name || !id) {
    rows.push(report('NEEDS_SOURCE', name || '(unnamed grinder)', 'Missing non-empty name or stable normalized id.', true));
    continue;
  }
  grinderIds.add(id);

  if (!grinder.type) {
    rows.push(report('NEEDS_SOURCE', name, 'Missing grinder type.', true));
  }
  if (!grinder.brand) {
    rows.push(report('OK_CURATED', name, 'Brand is not explicit; infer only from model text in UI.', false));
  }

  const bands = [
    ['coarse', grinder.coarse],
    ['medium', grinder.medium],
    ['fine', grinder.fine],
  ] as const;
  for (const [band, label] of bands) {
    if (!label && !isExplicitReference(label)) {
      rows.push(report('NEEDS_SOURCE', name, `Missing ${band} range or explicit official-chart reference.`, true));
      continue;
    }
    if (label && !parseRange(label) && !isExplicitReference(label)) {
      rows.push(report('UNPARSEABLE_RANGE', name, `${band} range is not parseable: ${label}`, true));
    }
  }

  if (['official', 'community_verified', 'curated'].includes(verification) && urls.length === 0) {
    rows.push(report('NEEDS_SOURCE', name, `${verification} grinder has no public sourceUrls.`, true));
  }
  if (grinder.source === 'user_dataset' && urls.length === 0) {
    const confidence = grinder.confidence || 'low';
    if ((grinder.verificationLevel && grinder.verificationLevel !== 'dataset_unverified') || confidence !== 'low') {
      rows.push(report('NEEDS_SOURCE', name, 'user_dataset without sourceUrls must stay dataset_unverified with low confidence.', true));
    }
  }

  rows.push(report(verification === 'official' ? 'OK_OFFICIAL' : 'OK_CURATED', name, `${verification} source policy checked.`, false));

  let riskReason = 'none';
  let recommendedAction = 'use as published starting point';
  let calibrationSupportStatus = 'range available';
  let uiLabel = verification === 'official' ? 'Official' : verification === 'curated' ? 'Curated' : verification === 'community_verified' ? 'Curated' : 'Estimated';
  const evidenceGap: string[] = [];
  if (urls.length === 0) evidenceGap.push('public source missing');
  if (!grinder.brand) evidenceGap.push('brand missing');
  if (!parsedMedium && isExplicitReference(grinder.medium)) {
    calibrationSupportStatus = 'reference-only';
    if (!settings.some((setting) => setting.grinderId === id)) {
      aggregate.risks.referenceOnlyNoCalibrationAid += 1;
      evidenceGap.push('model-specific calibration aid missing');
    }
  } else if (!parsedMedium) {
    calibrationSupportStatus = 'unparseable range';
    evidenceGap.push('medium range not parseable');
  }
  if (verification === 'dataset_unverified') {
    riskReason = 'dataset-unverified starting point';
    recommendedAction = 'show fallback/estimated label and ask user to validate by drawdown and taste';
    uiLabel = 'Fallback';
  } else if (verification === 'curated') {
    riskReason = 'curated secondary evidence';
    recommendedAction = 'show curated label, not official';
    uiLabel = 'Curated';
  }

  auditTable.push({
    id,
    name,
    brand: grinder.brand || 'missing',
    currentVerification: verification,
    currentConfidence: grinder.confidence || (verification === 'official' ? 'high' : 'missing'),
    sourceTypes: grinder.source || 'missing',
    primarySourceDomain: sourceDomain(urls[0]),
    unitStyle,
    currentRangeFormat: grinder.medium || 'missing',
    riskReason,
    recommendedAction,
    evidenceGap: evidenceGap.join('; ') || 'none',
    calibrationSupportStatus,
    uiLabel,
    notes: grinder.type || '',
  });
}

for (const setting of settings) {
  const id = String(setting.id || '(missing setting id)');
  if (!setting.grinderId || !grinderIds.has(setting.grinderId)) {
    rows.push(report('NEEDS_SOURCE', id, `Unknown grinderId: ${setting.grinderId || '(empty)'}`, true));
  }
  for (const profileId of setting.profileIds || []) {
    if (!profileIds.has(profileId)) {
      rows.push(report('NEEDS_SOURCE', id, `Unknown profileId: ${profileId}`, true));
    }
  }
  if (!parseRange(setting.rangeLabel) && !isExplicitReference(setting.rangeLabel)) {
    rows.push(report('UNPARSEABLE_RANGE', id, `Setting rangeLabel is not parseable: ${setting.rangeLabel || '(empty)'}`, true));
  }
  if (['official', 'community_verified', 'curated'].includes(String(setting.verificationLevel || '')) && sourceUrls(setting).length === 0) {
    rows.push(report('NEEDS_SOURCE', id, 'Verified grinder setting has no sourceUrls.', true));
  }
  if (['official', 'community_verified', 'curated'].includes(String(setting.verificationLevel || '')) && !setting.verifiedAt) {
    aggregate.risks.missingVerifiedAt += 1;
  }
}

const rawById = new Map(grinders.map((grinder) => [slugify(String(grinder.name || '')), grinder]));
for (const setting of settings) {
  const grinder = setting.grinderId ? rawById.get(setting.grinderId) : undefined;
  const rawRange = parseRange(grinder?.medium);
  const settingRange = parseRange(setting.rangeLabel);
  if (!grinder || !rawRange || !settingRange) continue;
  if (/red\s*clix/i.test(String(setting.rangeLabel || ''))) continue;
  if (rawRange.unit !== settingRange.unit) continue;
  const overlap = rawRange.min <= settingRange.max && settingRange.min <= rawRange.max;
  const rawSpan = Math.max(1, rawRange.max - rawRange.min);
  const settingSpan = Math.max(1, settingRange.max - settingRange.min);
  const midpointGap = Math.abs(((rawRange.min + rawRange.max) / 2) - ((settingRange.min + settingRange.max) / 2));
  if (!overlap && midpointGap > Math.max(rawSpan, settingSpan) * 0.75) {
    aggregate.risks.conflictingMediumRanges += 1;
    rows.push(report(
      'CONFLICTING_RANGE',
      `${grinder.name} / ${setting.id}`,
      `Raw medium "${grinder.medium}" conflicts with AI Brew setting "${setting.rangeLabel}".`,
      true,
    ));
  }
}

const duplicateMatchers = [
  /timemore\s+c5/i,
  /timemore\s+c3/i,
  /kingrinder\s+[kp]\d/i,
  /1zpresso\s+(k|max|plus|ultra|q|air|x|j|zp6)/i,
  /comandante\s+(c40|c60|x25)/i,
];
for (const matcher of duplicateMatchers) {
  const matches = grinders.filter((grinder) => matcher.test(String(grinder.name || '')));
  const compactNames = new Map<string, string[]>();
  for (const grinder of matches) {
    const key = compactText(String(grinder.name || '').replace(/\b(pro|esp|max|plus|ultra|air)\b/gi, ''));
    compactNames.set(key, [...(compactNames.get(key) || []), String(grinder.name || '')]);
  }
  for (const names of compactNames.values()) {
    if (names.length > 1 || names.some((name) => /\/| series\b/i.test(name))) {
      aggregate.risks.familyAliasAmbiguity += 1;
      rows.push(report('DUPLICATE_OR_AMBIGUOUS_MODEL', names.join(', '), 'Model family needs source-level review before promotion to official.', false));
    }
  }
}

for (const profile of profiles) {
  const dripperIds = profile.dripperIds || [];
  const isExactSwitch = profile.methodFamily === 'hario_switch'
    && profile.exactMatch
    && dripperIds.some((id) => id === 'hario-switch-02' || id === 'hario-switch-03' || id === 'mugen-x-switch');
  if (!isExactSwitch) continue;
  const constraints = profile.physicalConstraints;
  const missing = [
    !constraints?.finishedCapacityMl ? 'finishedCapacityMl' : '',
    !constraints?.recommendedClosedPhaseMaxMl ? 'recommendedClosedPhaseMaxMl' : '',
    !constraints?.workingHeadspaceMl ? 'workingHeadspaceMl' : '',
    !constraints?.filterSize ? 'filterSize' : '',
    !constraints?.coneType ? 'coneType' : '',
  ].filter(Boolean);
  if (missing.length > 0) {
    rows.push(report(
      'MISSING_SWITCH_PHYSICAL_CONSTRAINTS',
      profile.id || 'unknown-profile',
      `Exact Hario Switch profile is missing physical constraint field(s): ${missing.join(', ')}.`,
      true,
    ));
  }
}

const counts = rows.reduce<Record<string, number>>((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});
const fatalRows = rows.filter((row) => row.fatal);

console.log('Grinder catalog audit report');
for (const [status, count] of Object.entries(counts).sort()) {
  console.log(`- ${status}: ${count}`);
}
console.log('Grinder catalog aggregate risk summary');
for (const [status, count] of Object.entries(aggregate.risks).sort()) {
  console.log(`- ${status}: ${count}`);
}
for (const row of rows.filter((item) => item.fatal || item.status === 'DUPLICATE_OR_AMBIGUOUS_MODEL')) {
  console.log(`[${row.status}] ${row.subject} :: ${row.detail}`);
}

if (reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, 'grinder-audit-report.json');
  const mdPath = path.join(reportDir, 'grinder-audit-report.md');
  const tableHeaders = [
    'id',
    'name',
    'brand',
    'current verification',
    'current confidence',
    'source type(s)',
    'primary source domain',
    'unit style',
    'current range format',
    'risk reason',
    'recommended action',
    'evidence gap',
    'calibration support status',
    'UI label to show',
    'notes',
  ];
  const tableRows = auditTable.map((row) => [
    row.id,
    row.name,
    row.brand,
    row.currentVerification,
    row.currentConfidence,
    row.sourceTypes,
    row.primarySourceDomain,
    row.unitStyle,
    row.currentRangeFormat,
    row.riskReason,
    row.recommendedAction,
    row.evidenceGap,
    row.calibrationSupportStatus,
    row.uiLabel,
    row.notes,
  ]);
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    catalogPath: path.relative(root, grinderPath),
    settingPath: path.relative(root, settingPath),
    counts,
    aggregate,
    rows,
    auditTable,
  }, null, 2));
  fs.writeFileSync(mdPath, [
    '# Grinder Catalog Audit Report',
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
    '## Grinder Audit Table',
    '',
    toMarkdownTable(tableHeaders, tableRows),
    '',
  ].join('\n'));
  console.log(`Wrote grinder audit report: ${path.relative(root, jsonPath)}`);
  console.log(`Wrote grinder audit report: ${path.relative(root, mdPath)}`);
}

if (fatalRows.length > 0) {
  console.error(`FAIL: ${fatalRows.length} blocking grinder catalog issue(s).`);
  process.exit(1);
}

console.log('PASS: grinder catalog publish blockers are clear.');
