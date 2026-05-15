import { buildRoastAdjustedTargets } from './calculations.ts';
import type { BrewMethodId, RoastLevel } from './types.ts';
import { BREW_METHOD_MAP } from './brewProfiles.ts';
import { buildGrindRecommendation, resolveGrinderSettingReference } from '../ai-brew/grindPlanner.ts';
import type {
  AiBrewCatalog,
  AiBrewMethodFamily,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderSettingReference,
  VerificationLevel,
} from '../ai-brew/types.ts';

export interface GrindSizeAdviceInput {
  catalog: AiBrewCatalog;
  methodId: BrewMethodId;
  grinderId: string;
  roastLevel: RoastLevel;
  espressoContext?: EspressoDialInContext;
}

export type GrindSizeConfidenceKind =
  | 'official'
  | 'community_verified'
  | 'curated'
  | 'dataset_unverified'
  | 'safe_baseline'
  | 'directed_estimate';

export type GrindSizeCapabilityKind =
  | 'select_grinder'
  | 'espresso_baseline'
  | 'espresso_capable'
  | 'check_fine'
  | 'moka_fine_ready'
  | 'moka_fine_baseline'
  | 'wide_range'
  | 'focused_method';

export type GrindSizeWarningKind =
  | 'no_reference'
  | 'espresso_calibration'
  | 'calibration_required'
  | 'iced_adjustment';

export type GrindSizeCorrectionKind = 'finer' | 'coarser' | 'neutral';
export type EspressoDialInAction =
  | 'calibrate_zero'
  | 'grind_finer'
  | 'grind_coarser'
  | 'increase_yield'
  | 'reduce_yield'
  | 'check_pressure'
  | 'wait_degas'
  | 'older_bean_finer'
  | 'keep_range';

export interface EspressoDialInContext {
  doseG?: number;
  yieldG?: number;
  shotTimeSec?: number;
  pressureBar?: number;
  beanAgeDays?: number;
  zeroPointKnown?: boolean;
}

export interface EspressoDialInInsight {
  brewRatio: number | null;
  actions: EspressoDialInAction[];
  severity: 'ok' | 'caution';
}

export interface GrindSizeAdvice {
  methodFamily: AiBrewMethodFamily;
  brewMode: 'hot' | 'iced';
  dripper?: EquipmentCatalogEntry;
  grinder?: EquipmentCatalogEntry;
  deviceProfile?: DeviceBrewProfile;
  setting?: GrinderSettingReference;
  grindBandLabel: string;
  primarySetting: string;
  correctionRange: string;
  correctionTip: string;
  confidenceLabel: string;
  capabilityLabel: string;
  warning?: string;
  sourceLabel: string;
  confidenceKind: GrindSizeConfidenceKind;
  sourceKind: GrindSizeConfidenceKind | 'baseline_method';
  capabilityKind: GrindSizeCapabilityKind;
  warningKind?: GrindSizeWarningKind;
  correctionKind: GrindSizeCorrectionKind;
  espressoInsight?: EspressoDialInInsight;
}

const METHOD_FAMILY_BY_RATIO_METHOD: Record<BrewMethodId, AiBrewMethodFamily> = {
  espresso: 'espresso',
  v60: 'v60',
  v60_japanese_iced: 'v60',
  chemex: 'chemex',
  chemex_iced: 'chemex',
  kalita_wave: 'kalita_wave',
  kalita_wave_iced: 'kalita_wave',
  melitta: 'melitta',
  melitta_iced: 'melitta',
  french_press: 'french_press',
  aeropress: 'aeropress',
  clever_dripper: 'clever_dripper',
  clever_dripper_iced: 'clever_dripper',
  origami: 'origami',
  origami_iced: 'origami',
  april: 'april',
  april_iced: 'april',
  kono: 'kono',
  kono_iced: 'kono',
  siphon: 'siphon',
  moka_pot: 'moka_pot',
  cold_brew: 'cold_brew',
  batch_brew: 'batch_brew',
};

const PREFERRED_DRIPPER_HINTS: Partial<Record<AiBrewMethodFamily, RegExp[]>> = {
  v60: [/\bv60\b/i, /hario/i],
  chemex: [/chemex/i],
  kalita_wave: [/kalita.*wave/i],
  melitta: [/melitta/i],
  french_press: [/french.*press/i],
  aeropress: [/aeropress/i],
  clever_dripper: [/clever/i],
  origami: [/origami/i],
  april: [/april/i],
  kono: [/kono/i],
  siphon: [/siphon/i],
  moka_pot: [/moka/i],
  cold_brew: [/cold|toddy/i],
  batch_brew: [/batch/i],
  espresso: [/espresso/i],
};

export function getRatioMethodFamily(methodId: BrewMethodId): AiBrewMethodFamily {
  return METHOD_FAMILY_BY_RATIO_METHOD[methodId] || 'v60';
}

export function getRatioMethodBrewMode(methodId: BrewMethodId): 'hot' | 'iced' {
  return /iced|ice/.test(methodId) ? 'iced' : 'hot';
}

function findDripperForRatioMethod(catalog: AiBrewCatalog, methodId: BrewMethodId) {
  const family = getRatioMethodFamily(methodId);
  const candidates = catalog.drippers.filter((dripper) =>
    !dripper.hidden
    && !dripper.deprecated
    && (dripper.methodFamily === family || dripper.searchText.toLowerCase().includes(family.replace(/_/g, ' ')))
  );
  if (candidates.length === 0) return undefined;
  const hints = PREFERRED_DRIPPER_HINTS[family] || [];
  return candidates.find((candidate) =>
    hints.some((hint) => hint.test(`${candidate.name} ${candidate.id} ${candidate.searchText}`))
  ) || candidates[0];
}

function resolveDeviceProfile(
  catalog: AiBrewCatalog,
  dripper: EquipmentCatalogEntry | undefined,
  methodFamily: AiBrewMethodFamily,
  brewMode: 'hot' | 'iced',
) {
  if (dripper) {
    const defaultProfileId = brewMode === 'iced'
      ? dripper.defaultProfileId?.replace(/_hot$/, '_iced')
      : dripper.defaultProfileId;
    const exact =
      (defaultProfileId
        ? catalog.deviceProfiles.find((profile) => profile.id === defaultProfileId && profile.brewMode === brewMode)
        : undefined)
      || catalog.deviceProfiles.find((profile) =>
        profile.exactMatch
        && profile.brewMode === brewMode
        && profile.dripperIds.includes(dripper.id)
      );
    if (exact) return exact;
  }

  return catalog.deviceProfiles.find((profile) =>
    profile.methodFamily === methodFamily
    && profile.brewMode === brewMode
    && !profile.exactMatch
  ) || catalog.deviceProfiles.find((profile) =>
    profile.methodFamily === methodFamily
    && profile.brewMode === brewMode
  );
}

function parsePrimarySetting(value: string) {
  const primary = value.match(/Starting grind:\s*([^.]*)\./i)?.[1]?.trim();
  return primary || value;
}

function parseCorrectionRange(value: string) {
  const range = value.match(/Correction range:\s*([^.]*)\./i)?.[1]?.trim();
  return range?.replace(/\s+to\s+/i, ' sampai ') || '';
}

function verificationLabel(value?: VerificationLevel) {
  if (value === 'official') return 'Referensi resmi';
  if (value === 'community_verified') return 'Terverifikasi komunitas';
  if (value === 'curated') return 'Kurasi katalog';
  if (value === 'dataset_unverified') return 'Butuh verifikasi';
  return 'Baseline aman';
}

function verificationKind(value?: VerificationLevel): GrindSizeConfidenceKind {
  if (value === 'official') return 'official';
  if (value === 'community_verified') return 'community_verified';
  if (value === 'curated') return 'curated';
  if (value === 'dataset_unverified') return 'dataset_unverified';
  return 'safe_baseline';
}

function capabilityLabel(params: {
  methodFamily: AiBrewMethodFamily;
  setting?: GrinderSettingReference;
  grinder?: EquipmentCatalogEntry;
}) {
  if (!params.grinder) return 'Pilih grinder';
  const hasFine = Boolean(params.grinder.grindBands?.fine?.trim());
  const hasMedium = Boolean(params.grinder.grindBands?.medium?.trim());
  const hasCoarse = Boolean(params.grinder.grindBands?.coarse?.trim());
  const hasFullBand = hasFine && hasMedium && hasCoarse;
  if (params.methodFamily === 'espresso') {
    if (params.setting?.calibrationRequired) return 'Espresso: baseline, wajib dial-in';
    return hasFine ? 'Espresso-capable' : 'Cek kemampuan fine';
  }
  if (params.methodFamily === 'moka_pot') return hasFine ? 'Fine aman untuk moka' : 'Butuh baseline fine';
  if (hasFullBand) return 'Luas: filter sampai coarse';
  return 'Fokus metode tertentu';
}

function capabilityKind(params: {
  methodFamily: AiBrewMethodFamily;
  setting?: GrinderSettingReference;
  grinder?: EquipmentCatalogEntry;
}): GrindSizeCapabilityKind {
  if (!params.grinder) return 'select_grinder';
  const hasFine = Boolean(params.grinder.grindBands?.fine?.trim());
  const hasMedium = Boolean(params.grinder.grindBands?.medium?.trim());
  const hasCoarse = Boolean(params.grinder.grindBands?.coarse?.trim());
  const hasFullBand = hasFine && hasMedium && hasCoarse;
  if (params.methodFamily === 'espresso') {
    if (params.setting?.calibrationRequired) return 'espresso_baseline';
    return hasFine ? 'espresso_capable' : 'check_fine';
  }
  if (params.methodFamily === 'moka_pot') return hasFine ? 'moka_fine_ready' : 'moka_fine_baseline';
  if (hasFullBand) return 'wide_range';
  return 'focused_method';
}

function warningCopy(params: {
  methodFamily: AiBrewMethodFamily;
  setting?: GrinderSettingReference;
  deviceProfile?: DeviceBrewProfile;
}) {
  if (!params.setting) return 'Belum ada referensi grinder. Pakai range alat sebagai titik awal, lalu koreksi dari rasa.';
  if (params.methodFamily === 'espresso' && params.setting.calibrationRequired) {
    return 'Espresso sangat sensitif. Ini baseline grinder, bukan jaminan shot; kalibrasi nol, dose, yield, dan waktu shot dulu.';
  }
  if (params.setting.calibrationRequired) {
    return 'Belum ada chart spesifik untuk metode ini. Mulai dari baseline katalog, lalu koreksi satu variabel dari rasa.';
  }
  if (params.deviceProfile?.brewMode === 'iced') {
    return 'Untuk seduh es, mulai sedikit lebih halus dari hot bila cup terasa tipis, tetapi jangan ubah air panas dan es sekaligus.';
  }
  return undefined;
}

function warningKind(params: {
  methodFamily: AiBrewMethodFamily;
  setting?: GrinderSettingReference;
  deviceProfile?: DeviceBrewProfile;
}): GrindSizeWarningKind | undefined {
  if (!params.setting) return 'no_reference';
  if (params.methodFamily === 'espresso' && params.setting.calibrationRequired) return 'espresso_calibration';
  if (params.setting.calibrationRequired) return 'calibration_required';
  if (params.deviceProfile?.brewMode === 'iced') return 'iced_adjustment';
  return undefined;
}

function roundTo(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function addUnique<T>(items: T[], item: T) {
  if (!items.includes(item)) items.push(item);
}

export function deriveEspressoDialInInsight(context?: EspressoDialInContext): EspressoDialInInsight {
  const dose = Number(context?.doseG);
  const output = Number(context?.yieldG);
  const shotTime = Number(context?.shotTimeSec);
  const pressure = Number(context?.pressureBar);
  const beanAge = Number(context?.beanAgeDays);
  const brewRatio = Number.isFinite(dose) && dose > 0 && Number.isFinite(output) && output > 0
    ? roundTo(output / dose, 2)
    : null;
  const actions: EspressoDialInAction[] = [];

  if (!context?.zeroPointKnown) addUnique(actions, 'calibrate_zero');
  if (brewRatio !== null && brewRatio < 1.6) addUnique(actions, 'increase_yield');
  if (brewRatio !== null && brewRatio > 2.8) addUnique(actions, 'reduce_yield');
  if (Number.isFinite(shotTime) && shotTime > 0) {
    if (shotTime < 23) addUnique(actions, 'grind_finer');
    if (shotTime > 35) addUnique(actions, 'grind_coarser');
  }
  if (Number.isFinite(pressure) && pressure > 0 && (pressure < 6 || pressure > 10)) {
    addUnique(actions, 'check_pressure');
  }
  if (Number.isFinite(beanAge) && beanAge > 0) {
    if (beanAge < 5) addUnique(actions, 'wait_degas');
    if (beanAge > 45) addUnique(actions, 'older_bean_finer');
  }
  if (actions.length === 0) actions.push('keep_range');

  return {
    brewRatio,
    actions,
    severity: actions.length === 1 && actions[0] === 'keep_range' ? 'ok' : 'caution',
  };
}

export function buildGrindSizeAdvice(input: GrindSizeAdviceInput): GrindSizeAdvice {
  const methodFamily = getRatioMethodFamily(input.methodId);
  const brewMode = getRatioMethodBrewMode(input.methodId);
  const dripper = findDripperForRatioMethod(input.catalog, input.methodId);
  const deviceProfile = resolveDeviceProfile(input.catalog, dripper, methodFamily, brewMode);
  const grinder = input.catalog.grinders.find((entry) => entry.id === input.grinderId)
    || input.catalog.grinders.find((entry) => !entry.hidden && !entry.deprecated);
  const method = BREW_METHOD_MAP[input.methodId];
  const grindBias = buildRoastAdjustedTargets(method, input.roastLevel).suggestedGrindBias;
  const setting = grinder && deviceProfile
    ? resolveGrinderSettingReference(input.catalog, grinder, deviceProfile, brewMode)
    : undefined;
  const recommendation = grinder
    ? buildGrindRecommendation(grinder, setting, grindBias, input.roastLevel, brewMode)
    : undefined;
  const confidenceKind: GrindSizeConfidenceKind = setting?.calibrationRequired
    ? 'directed_estimate'
    : verificationKind(setting?.verificationLevel);
  const sourceKind: GrindSizeConfidenceKind | 'baseline_method' = setting?.calibrationRequired
    ? 'baseline_method'
    : verificationKind(setting?.verificationLevel);
  const correctionKind: GrindSizeCorrectionKind = grindBias === 'finer'
    ? 'finer'
    : grindBias === 'coarser'
      ? 'coarser'
      : 'neutral';

  return {
    methodFamily,
    brewMode,
    dripper,
    grinder,
    deviceProfile,
    setting,
    grindBandLabel: recommendation?.grindBandLabel || 'Belum ada range',
    primarySetting: recommendation ? parsePrimarySetting(recommendation.grindRecommendation) : '-',
    correctionRange: recommendation ? parseCorrectionRange(recommendation.grindRecommendation) : '',
    correctionTip: grindBias === 'finer'
      ? 'Sangrai terang biasanya butuh sedikit lebih halus.'
      : grindBias === 'coarser'
        ? 'Sangrai gelap biasanya lebih aman sedikit lebih kasar.'
        : 'Mulai dari tengah range, lalu koreksi 0.5 step atau 1-2 klik dari rasa.',
    confidenceLabel: setting?.calibrationRequired
      ? 'Estimasi terarah'
      : verificationLabel(setting?.verificationLevel),
    capabilityLabel: capabilityLabel({ methodFamily, setting, grinder }),
    warning: warningCopy({ methodFamily, setting, deviceProfile }),
    sourceLabel: setting?.calibrationRequired
      ? 'Baseline katalog + metode'
      : verificationLabel(setting?.verificationLevel),
    confidenceKind,
    sourceKind,
    capabilityKind: capabilityKind({ methodFamily, setting, grinder }),
    warningKind: warningKind({ methodFamily, setting, deviceProfile }),
    correctionKind,
    espressoInsight: methodFamily === 'espresso'
      ? deriveEspressoDialInInsight(input.espressoContext)
      : undefined,
  };
}

export function sortGrindersForMethod(catalog: AiBrewCatalog, methodId: BrewMethodId) {
  const family = getRatioMethodFamily(methodId);
  return catalog.grinders
    .filter((grinder) => !grinder.hidden && !grinder.deprecated)
    .slice()
    .sort((a, b) => {
      const score = (grinder: EquipmentCatalogEntry) => {
        let value = 0;
        if (grinder.grindBands?.fine) value += family === 'espresso' || family === 'moka_pot' ? 4 : 1;
        if (grinder.grindBands?.medium) value += family === 'espresso' ? 1 : 3;
        if (grinder.grindBands?.coarse) value += family === 'cold_brew' || family === 'french_press' || family === 'chemex' ? 4 : 1;
        if (grinder.verificationLevel === 'official') value += 3;
        if (grinder.verificationLevel === 'community_verified') value += 2;
        if (grinder.confidence === 'high') value += 2;
        return value;
      };
      const delta = score(b) - score(a);
      if (delta !== 0) return delta;
      return a.name.localeCompare(b.name);
    });
}

export function formatMethodGrindBand(methodFamily: AiBrewMethodFamily, language = 'id') {
  const isId = language === 'id';
  if (methodFamily === 'espresso') return isId ? 'halus' : 'fine';
  if (methodFamily === 'moka_pot') return isId ? 'sedang-halus' : 'medium-fine';
  if (methodFamily === 'cold_brew' || methodFamily === 'french_press' || methodFamily === 'chemex') {
    return isId ? 'lebih kasar' : 'coarse';
  }
  if (methodFamily === 'aeropress' || methodFamily === 'clever_dripper' || methodFamily === 'batch_brew') return 'medium';
  return isId ? 'sedang sampai sedang-halus' : 'medium to medium-fine';
}

export function compactRangeLabel(value: string) {
  return value.replace(/\s+/g, ' ').replace(/(\d+\.\d)0\b/g, '$1').trim();
}
