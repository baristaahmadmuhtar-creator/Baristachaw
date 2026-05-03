import fs from 'node:fs';
import path from 'node:path';

type AuditStatus =
  | 'PASS'
  | 'NEEDS_SOURCE'
  | 'CONFLICTING_RANGE'
  | 'UNPARSEABLE_RANGE'
  | 'DUPLICATE_OR_AMBIGUOUS_MODEL'
  | 'OK_CURATED'
  | 'OK_OFFICIAL';

type RawGrinder = {
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
const profiles = readItems<{ id?: string }>(profilePath);
const profileIds = new Set(profiles.map((profile) => profile.id).filter(Boolean));
const grinderIds = new Set<string>();
const rows: ReturnType<typeof report>[] = [];

for (const grinder of grinders) {
  const name = String(grinder.name || '').trim();
  const id = slugify(name);
  const urls = sourceUrls(grinder);
  const verification = effectiveVerification(grinder);

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
      rows.push(report('DUPLICATE_OR_AMBIGUOUS_MODEL', names.join(', '), 'Model family needs source-level review before promotion to official.', false));
    }
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
for (const row of rows.filter((item) => item.fatal || item.status === 'DUPLICATE_OR_AMBIGUOUS_MODEL')) {
  console.log(`[${row.status}] ${row.subject} :: ${row.detail}`);
}

if (fatalRows.length > 0) {
  console.error(`FAIL: ${fatalRows.length} blocking grinder catalog issue(s).`);
  process.exit(1);
}

console.log('PASS: grinder catalog publish blockers are clear.');
