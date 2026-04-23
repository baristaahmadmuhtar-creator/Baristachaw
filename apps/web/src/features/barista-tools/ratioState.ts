import { BREW_METHOD_MAP } from './brewProfiles.ts';
import { calcWaterFromDoseRatio } from './calculations.ts';
import { getMethodEvidenceProfile } from './evidence/pack.ts';
import type {
  BrewCalcMode,
  BrewMethodId,
  BrewUnitMode,
  RoastInputMode,
  RoastLevel,
  ShotPresetId,
} from './types.ts';

export interface RatioSettingsState {
  v: 5;
  methodId: BrewMethodId;
  mode: BrewCalcMode;
  unitMode: BrewUnitMode;
  espressoShotPresetId: ShotPresetId;
  roastInputMode: RoastInputMode;
  roastLevel: RoastLevel;
  agtronValue: string;
  applyRoastAdaptiveDefaults: boolean;
  dose: string;
  water: string;
  ratio: string;
  tdsPercent: string;
  measuredOutput: string;
}

interface LegacyRatioState {
  v?: number;
  methodId?: string;
  mode?: string;
  unitMode?: string;
  espressoShotPresetId?: string;
  roastInputMode?: string;
  roastLevel?: string;
  agtronValue?: string | number;
  applyRoastAdaptiveDefaults?: boolean;
  dose?: string | number;
  water?: string | number;
  ratio?: string | number;
  tdsPercent?: string | number;
  measuredOutput?: string | number;
}

const METHOD_IDS = Object.keys(BREW_METHOD_MAP) as BrewMethodId[];
const ROAST_LEVELS: RoastLevel[] = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
const SHOT_PRESETS: ShotPresetId[] = ['ristretto', 'espresso', 'lungo', 'doppio'];
const LEGACY_STORAGE_KEYS = ['BARISTA_TOOLS_RATIO_V5', 'BARISTA_TOOLS_RATIO_V4'];
const DEFAULT_METHOD_ID: BrewMethodId = 'v60';

export const RATIO_STORAGE_KEY = 'BARISTA_TOOLS_RATIO_V5';

function parseFinite(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function roundTo(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number, digits = 2): string {
  const safeValue = Number.isFinite(value) ? roundTo(value, digits) : 0;
  if (Number.isInteger(safeValue)) return String(safeValue);
  return String(safeValue);
}

function sanitizeRange(value: unknown, fallback: number, min: number, max: number, digits = 2): string {
  const parsed = parseFinite(value);
  if (parsed === undefined) return formatNumber(fallback, digits);
  return formatNumber(Math.min(max, Math.max(min, parsed)), digits);
}

function sanitizeOptionalRange(value: unknown, min: number, max: number, digits = 2): string {
  const parsed = parseFinite(value);
  if (parsed === undefined || parsed <= 0) return '';
  return formatNumber(Math.min(max, Math.max(min, parsed)), digits);
}

function normalizeMethodId(value: unknown): BrewMethodId {
  if (value === 'coffee_machine') return 'espresso';
  const asString = String(value ?? '').trim() as BrewMethodId;
  if (METHOD_IDS.includes(asString)) return asString;
  return DEFAULT_METHOD_ID;
}

function normalizeMode(value: unknown): BrewCalcMode {
  return value === 'advanced' ? 'advanced' : 'basic';
}

function normalizeUnit(value: unknown): BrewUnitMode {
  return value === 'imperial' ? 'imperial' : 'metric';
}

function normalizeRoastLevel(value: unknown, methodId: BrewMethodId): RoastLevel {
  const asLevel = String(value ?? '') as RoastLevel;
  if (ROAST_LEVELS.includes(asLevel)) return asLevel;
  return getMethodEvidenceProfile(methodId)?.roastSupport.defaultLevel
    ?? BREW_METHOD_MAP[methodId].roastSupport?.defaultLevel
    ?? 'medium';
}

function normalizeShotPreset(value: unknown): ShotPresetId {
  const asPreset = String(value ?? '') as ShotPresetId;
  return SHOT_PRESETS.includes(asPreset) ? asPreset : 'espresso';
}

function normalizeRoastInputMode(value: unknown, agtronValue: string): RoastInputMode {
  if (value === 'agtron' && agtronValue !== '') return 'agtron';
  return 'level';
}

function sanitizeAgtronValue(value: unknown): string {
  const parsed = parseFinite(value);
  if (parsed === undefined || parsed <= 0) return '';
  return formatNumber(Math.min(120, Math.max(1, parsed)), 1);
}

export function migrateRatioSettings(raw: unknown): RatioSettingsState {
  const candidate = (raw && typeof raw === 'object' ? raw : {}) as LegacyRatioState;
  const methodId = normalizeMethodId(candidate.methodId);
  const method = BREW_METHOD_MAP[methodId];
  const mode = normalizeMode(candidate.mode);
  const unitMode = normalizeUnit(candidate.unitMode);
  const espressoShotPresetId = normalizeShotPreset(candidate.espressoShotPresetId);
  const agtronValue = sanitizeAgtronValue(candidate.agtronValue);
  const roastLevel = normalizeRoastLevel(candidate.roastLevel, methodId);
  const roastInputMode = normalizeRoastInputMode(candidate.roastInputMode, agtronValue);
  const applyRoastAdaptiveDefaults = candidate.applyRoastAdaptiveDefaults !== false;
  const baseRatio = methodId === 'espresso'
    ? (method.shotPresets?.find((preset) => preset.id === espressoShotPresetId)?.ratio ?? method.ratioDefault)
    : method.ratioDefault;
  const dose = sanitizeRange(candidate.dose, 18, 0.1, 400, 2);
  const ratio = sanitizeRange(candidate.ratio, baseRatio, 0.5, 60, 2);
  const fallbackWater = calcWaterFromDoseRatio(Number.parseFloat(dose), Number.parseFloat(ratio));
  const water = sanitizeRange(candidate.water, fallbackWater, 1, 10000, 1);
  const tdsPercent = sanitizeOptionalRange(candidate.tdsPercent, 0.01, 25, 2);
  const measuredOutput = sanitizeOptionalRange(candidate.measuredOutput, 0.1, 10000, 1);

  return {
    v: 5,
    methodId,
    mode,
    unitMode,
    espressoShotPresetId,
    roastInputMode,
    roastLevel: mode === 'basic' ? 'medium' : roastLevel,
    agtronValue: mode === 'basic' ? '' : agtronValue,
    applyRoastAdaptiveDefaults,
    dose,
    water,
    ratio,
    tdsPercent,
    measuredOutput,
  };
}

export function loadRatioSettingsFromStorage(storage: Pick<Storage, 'getItem'> = localStorage): RatioSettingsState {
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as LegacyRatioState;
      return migrateRatioSettings(parsed);
    } catch {
      // continue to next key
    }
  }

  return migrateRatioSettings({
    v: 5,
    methodId: 'v60',
    mode: 'basic',
    unitMode: 'metric',
    espressoShotPresetId: 'espresso',
    roastInputMode: 'level',
    roastLevel: 'medium',
    agtronValue: '',
    applyRoastAdaptiveDefaults: true,
    dose: '18',
    ratio: '16',
    water: '288',
    tdsPercent: '',
    measuredOutput: '',
  });
}
