import type {
  AiBrewMethodFamily,
  GrinderCalibrationProfile,
  RealBrewLogEntry,
  RealBrewMeasurement,
  RealBrewSensoryScore,
} from './types';

export interface RealBrewLogValidation {
  status: RealBrewLogEntry['validation']['status'];
  warnings: string[];
}

export interface RealBrewLogImportResult {
  entries: RealBrewLogEntry[];
  rejected: Array<{
    row: number;
    reason: string;
  }>;
}

export type RealBrewLogInput = Partial<Omit<RealBrewLogEntry, 'id' | 'createdAt' | 'updatedAt' | 'validation'>> & {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
};

const METHOD_FAMILIES: ReadonlySet<AiBrewMethodFamily> = new Set([
  'v60',
  'aeropress',
  'french_press',
  'espresso',
  'hario_switch',
  'kalita_wave',
  'clever_dripper',
  'chemex',
  'moka_pot',
  'cold_brew',
  'batch_brew',
  'siphon',
  'origami',
  'april',
  'melitta',
  'kono',
]);

function nowId(prefix: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${random}`;
}

function cleanText(value: unknown, fallback = '', maxLength = 240) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
  return normalized || fallback;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function cleanRequiredNumber(value: unknown, fallback = 0): number {
  return cleanNumber(value) ?? fallback;
}

function cleanTimestamp(value: unknown) {
  const numeric = cleanNumber(value);
  return numeric && numeric > 0 ? Math.round(numeric) : Date.now();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function clampSensory(value: unknown) {
  const numeric = cleanNumber(value);
  if (numeric === undefined) return undefined;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function normalizeSensory(input: unknown): RealBrewSensoryScore | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as Partial<RealBrewSensoryScore>;
  const required = {
    acidity: clampSensory(candidate.acidity),
    sweetness: clampSensory(candidate.sweetness),
    body: clampSensory(candidate.body),
    clarity: clampSensory(candidate.clarity),
    bitterness: clampSensory(candidate.bitterness),
    astringency: clampSensory(candidate.astringency),
    balance: clampSensory(candidate.balance),
  };
  if (Object.values(required).some((value) => value === undefined)) return undefined;
  return {
    acidity: required.acidity!,
    sweetness: required.sweetness!,
    body: required.body!,
    clarity: required.clarity!,
    bitterness: required.bitterness!,
    astringency: required.astringency!,
    balance: required.balance!,
    notes: cleanText(candidate.notes, '', 300) || undefined,
  };
}

function normalizeWater(input: unknown): RealBrewMeasurement | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as Partial<RealBrewMeasurement>;
  return {
    label: cleanText(candidate.label, '', 120) || undefined,
    tdsPpm: cleanNumber(candidate.tdsPpm),
    ghPpmAsCaCO3: cleanNumber(candidate.ghPpmAsCaCO3),
    khPpmAsCaCO3: cleanNumber(candidate.khPpmAsCaCO3),
    sourceBacked: Boolean(candidate.sourceBacked),
    measured: Boolean(candidate.measured),
    verifiedAt: cleanNumber(candidate.verifiedAt),
  };
}

function normalizeCalibration(input: unknown): GrinderCalibrationProfile | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as Partial<GrinderCalibrationProfile>;
  const grinderLabel = cleanText(candidate.grinderLabel, '', 120);
  if (!grinderLabel) return undefined;
  return {
    grinderId: cleanText(candidate.grinderId, '', 120) || undefined,
    grinderLabel,
    zeroPointClicks: cleanNumber(candidate.zeroPointClicks),
    burrTouchOffsetClicks: cleanNumber(candidate.burrTouchOffsetClicks),
    lastDrawdownSeconds: cleanNumber(candidate.lastDrawdownSeconds),
    lastTasteCorrection: cleanText(candidate.lastTasteCorrection, '', 160) || undefined,
    completedAt: cleanNumber(candidate.completedAt),
    confidence: candidate.confidence === 'high' || candidate.confidence === 'medium' ? candidate.confidence : 'low',
  };
}

export function calculateExtractionYieldPercent(
  doseG: number,
  beverageOutputG: number,
  tdsPercent: number,
): number | undefined {
  if (!(doseG > 0) || !(beverageOutputG > 0) || !(tdsPercent > 0)) return undefined;
  return Number(((beverageOutputG * (tdsPercent / 100)) / doseG * 100).toFixed(1));
}

export function validateRealBrewLogEntry(entry: RealBrewLogEntry): RealBrewLogValidation {
  const warnings: string[] = [];
  if (!entry.beanName) warnings.push('bean name is required');
  if (!METHOD_FAMILIES.has(entry.methodFamily)) warnings.push('method family is not supported');
  if (!(entry.doseG > 0)) warnings.push('dose must be positive');
  if (!(entry.brewWaterMl > 0)) warnings.push('brew water must be positive');
  if (entry.beverageOutputG !== undefined) {
    if (!(entry.beverageOutputG > 0)) warnings.push('output mass must be positive');
    if (entry.brewWaterMl > 0 && entry.beverageOutputG > entry.brewWaterMl) {
      warnings.push('output mass cannot exceed brew water');
    }
  }
  if (entry.tdsPercent !== undefined && (!(entry.tdsPercent > 0.1) || entry.tdsPercent > 4)) {
    warnings.push('TDS is outside practical brewed-coffee bounds');
  }
  if (entry.extractionYieldPercent !== undefined && (
    !(entry.extractionYieldPercent > 10) || entry.extractionYieldPercent > 30
  )) {
    warnings.push('extraction yield is outside practical bounds');
  }
  if (entry.drawdownSeconds !== undefined && (!(entry.drawdownSeconds > 0) || entry.drawdownSeconds > 86_400)) {
    warnings.push('drawdown/time must be positive and practical');
  }
  if (!entry.sensory) warnings.push('sensory sliders are required before this counts as physical cup evidence');
  if (!entry.water?.measured && !entry.water?.sourceBacked) {
    warnings.push('water requires measured or source-backed mineral evidence');
  }
  if (!entry.calibration || entry.calibration.confidence !== 'high') {
    warnings.push('grinder calibration is incomplete');
  }

  if (warnings.some((warning) => (
    /must be positive|cannot exceed|outside practical|method family is not supported/i.test(warning)
  ))) {
    return { status: 'blocked', warnings };
  }
  return {
    status: warnings.length ? 'needs_review' : 'validated',
    warnings,
  };
}

export function buildRealBrewLogEntry(input: RealBrewLogInput): RealBrewLogEntry {
  const doseG = cleanRequiredNumber(input.doseG);
  const brewWaterMl = cleanRequiredNumber(input.brewWaterMl);
  const beverageOutputG = cleanNumber(input.beverageOutputG);
  const tdsPercent = cleanNumber(input.tdsPercent);
  const extractionYieldPercent = cleanNumber(input.extractionYieldPercent)
    ?? (beverageOutputG !== undefined && tdsPercent !== undefined
      ? calculateExtractionYieldPercent(doseG, beverageOutputG, tdsPercent)
      : undefined);
  const createdAt = cleanTimestamp(input.createdAt);
  const methodFamily = METHOD_FAMILIES.has(input.methodFamily as AiBrewMethodFamily)
    ? input.methodFamily as AiBrewMethodFamily
    : 'v60';
  const entry: RealBrewLogEntry = {
    id: cleanText(input.id, '') || nowId('real_brew'),
    planId: cleanText(input.planId, '', 120) || undefined,
    fingerprint: cleanText(input.fingerprint, '', 180) || undefined,
    createdAt,
    updatedAt: cleanTimestamp(input.updatedAt || createdAt),
    brewDate: cleanText(input.brewDate, todayIsoDate(), 20),
    beanName: cleanText(input.beanName, 'Unknown bean', 160),
    methodFamily,
    brewerLabel: cleanText(input.brewerLabel, 'Unknown brewer', 120),
    grinderLabel: cleanText(input.grinderLabel, 'Unknown grinder', 120),
    grinderSetting: cleanText(input.grinderSetting, '', 80) || undefined,
    doseG,
    brewWaterMl,
    beverageOutputG,
    tdsPercent,
    extractionYieldPercent,
    drawdownSeconds: cleanNumber(input.drawdownSeconds),
    sensory: normalizeSensory(input.sensory),
    water: normalizeWater(input.water),
    calibration: normalizeCalibration(input.calibration),
    notes: cleanText(input.notes, '', 500) || undefined,
    validation: { status: 'needs_review', warnings: [] },
  };
  entry.validation = validateRealBrewLogEntry(entry);
  return entry;
}

export function exportRealBrewLogsToJson(entries: RealBrewLogEntry[]): string {
  return JSON.stringify({
    schema: 'baristachaw.real-brew-logs.v1',
    exportedAt: new Date().toISOString(),
    entries,
  }, null, 2);
}

function csvEscape(value: unknown) {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportRealBrewLogsToCsv(entries: RealBrewLogEntry[]): string {
  const headers = [
    'id',
    'brewDate',
    'beanName',
    'methodFamily',
    'brewerLabel',
    'grinderLabel',
    'grinderSetting',
    'doseG',
    'brewWaterMl',
    'beverageOutputG',
    'tdsPercent',
    'extractionYieldPercent',
    'drawdownSeconds',
    'acidity',
    'sweetness',
    'body',
    'clarity',
    'bitterness',
    'astringency',
    'balance',
    'sensoryNotes',
    'waterTdsPpm',
    'waterGhPpmAsCaCO3',
    'waterKhPpmAsCaCO3',
    'waterMeasured',
    'waterSourceBacked',
    'calibrationConfidence',
    'notes',
  ];
  const rows = entries.map((entry) => [
    entry.id,
    entry.brewDate,
    entry.beanName,
    entry.methodFamily,
    entry.brewerLabel,
    entry.grinderLabel,
    entry.grinderSetting,
    entry.doseG,
    entry.brewWaterMl,
    entry.beverageOutputG,
    entry.tdsPercent,
    entry.extractionYieldPercent,
    entry.drawdownSeconds,
    entry.sensory?.acidity,
    entry.sensory?.sweetness,
    entry.sensory?.body,
    entry.sensory?.clarity,
    entry.sensory?.bitterness,
    entry.sensory?.astringency,
    entry.sensory?.balance,
    entry.sensory?.notes,
    entry.water?.tdsPpm,
    entry.water?.ghPpmAsCaCO3,
    entry.water?.khPpmAsCaCO3,
    entry.water?.measured,
    entry.water?.sourceBacked,
    entry.calibration?.confidence,
    entry.notes,
  ].map(csvEscape).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function parseRealBrewLogsFromJson(raw: string): RealBrewLogImportResult {
  const rejected: RealBrewLogImportResult['rejected'] = [];
  try {
    const parsed = JSON.parse(raw) as { entries?: unknown[] } | unknown[];
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.entries) ? parsed.entries : [];
    const entries = rows
      .map((row, index) => {
        const entry = buildRealBrewLogEntry(row as RealBrewLogInput);
        if (entry.validation.status === 'blocked') {
          rejected.push({ row: index + 1, reason: entry.validation.warnings.join('; ') });
          return null;
        }
        return entry;
      })
      .filter((entry): entry is RealBrewLogEntry => Boolean(entry));
    return { entries, rejected };
  } catch (error) {
    return {
      entries: [],
      rejected: [{ row: 0, reason: error instanceof Error ? error.message : 'invalid JSON' }],
    };
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted && char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function csvBoolean(value: string) {
  return /^(true|1|yes|measured|source-backed)$/i.test(value.trim());
}

export function parseRealBrewLogsFromCsv(raw: string): RealBrewLogImportResult {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length <= 1) return { entries: [], rejected: [] };
  const headers = parseCsvLine(lines[0]);
  const entries: RealBrewLogEntry[] = [];
  const rejected: RealBrewLogImportResult['rejected'] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const values = parseCsvLine(lines[rowIndex]);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    const sensory = row.acidity && row.sweetness && row.body && row.clarity && row.bitterness && row.astringency && row.balance
      ? {
          acidity: cleanRequiredNumber(row.acidity),
          sweetness: cleanRequiredNumber(row.sweetness),
          body: cleanRequiredNumber(row.body),
          clarity: cleanRequiredNumber(row.clarity),
          bitterness: cleanRequiredNumber(row.bitterness),
          astringency: cleanRequiredNumber(row.astringency),
          balance: cleanRequiredNumber(row.balance),
          notes: row.sensoryNotes,
        }
      : undefined;
    const entry = buildRealBrewLogEntry({
      id: row.id,
      brewDate: row.brewDate,
      beanName: row.beanName,
      methodFamily: row.methodFamily as AiBrewMethodFamily,
      brewerLabel: row.brewerLabel,
      grinderLabel: row.grinderLabel,
      grinderSetting: row.grinderSetting,
      doseG: cleanRequiredNumber(row.doseG),
      brewWaterMl: cleanRequiredNumber(row.brewWaterMl),
      beverageOutputG: cleanRequiredNumber(row.beverageOutputG),
      tdsPercent: cleanRequiredNumber(row.tdsPercent),
      extractionYieldPercent: cleanRequiredNumber(row.extractionYieldPercent),
      drawdownSeconds: cleanRequiredNumber(row.drawdownSeconds),
      sensory,
      water: {
        tdsPpm: cleanNumber(row.waterTdsPpm),
        ghPpmAsCaCO3: cleanNumber(row.waterGhPpmAsCaCO3),
        khPpmAsCaCO3: cleanNumber(row.waterKhPpmAsCaCO3),
        measured: csvBoolean(row.waterMeasured),
        sourceBacked: csvBoolean(row.waterSourceBacked),
      },
      calibration: row.calibrationConfidence
        ? {
            grinderLabel: row.grinderLabel || 'Unknown grinder',
            confidence: row.calibrationConfidence === 'high' || row.calibrationConfidence === 'medium'
              ? row.calibrationConfidence
              : 'low',
          }
        : undefined,
      notes: row.notes,
    });
    if (entry.validation.status === 'blocked') {
      rejected.push({ row: rowIndex + 1, reason: entry.validation.warnings.join('; ') });
    } else {
      entries.push(entry);
    }
  }

  return { entries, rejected };
}
