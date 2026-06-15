import { buildRoastAdjustedTargets } from './calculations.ts';
import type { BrewMethodId, GrindBias, RoastLevel } from './types.ts';
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
import {
  getGrinderSafetyProfile,
  getGrinderCapabilityKind,
  buildGrinderSafetyWarning,
  getGeneralSafetyWarnings,
} from '../ai-brew/grinderSafetyGuardrails.ts';
import type {
  GrindSizeCompatibilityState,
  GrindSizeCapabilityKind,
  GrindSizeWarningKind,
  GrindSizeCompatibility,
} from '../ai-brew/grinderSafetyGuardrails.ts';

export interface GrindSizeAdviceInput {
  catalog: AiBrewCatalog;
  methodId: BrewMethodId;
  grinderId: string;
  roastLevel: RoastLevel;
  targetProfileId?: string;
  espressoContext?: EspressoDialInContext;
}

export type GrindSizeConfidenceKind =
  | 'official'
  | 'community_verified'
  | 'curated'
  | 'dataset_unverified'
  | 'safe_baseline'
  | 'directed_estimate';

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
  sourceLabel: string;
  confidenceKind: GrindSizeConfidenceKind;
  sourceKind: GrindSizeConfidenceKind | 'baseline_method';
  capabilityKind: GrindSizeCapabilityKind;
  warningKind?: GrindSizeWarningKind;
  correctionKind: GrindSizeCorrectionKind;
  roastBiasKind: GrindSizeCorrectionKind;
  targetBiasKind: GrindSizeCorrectionKind;
  targetProfileLabel?: string;
  targetProfileDescription?: string;
  compatibilityState: GrindSizeCompatibilityState;
  compatibilitySelectable: boolean;
  compatibilityReason: string;
  compatibilityTags?: string[];
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



function toCorrectionKind(value?: GrindBias): GrindSizeCorrectionKind {
  if (value === 'finer') return 'finer';
  if (value === 'coarser') return 'coarser';
  return 'neutral';
}

function combineGrindBias(roastBias: GrindBias, targetBias: GrindBias | undefined, methodFamily: AiBrewMethodFamily): GrindBias {
  if (methodFamily === 'cold_brew') {
    return roastBias === 'coarser' || targetBias === 'coarser' ? 'coarser' : roastBias;
  }
  if (!targetBias || targetBias === 'same') return roastBias;
  if (roastBias === 'same') return targetBias;
  if (roastBias === targetBias) return roastBias;
  return 'same';
}



function parsePrimarySetting(value: string) {
  const primary = value.match(/Starting grind:\s*(.*?)(?:\.\s+Correction range:|$)/i)?.[1]?.trim();
  return primary || value;
}

function parseCorrectionRange(value: string) {
  const range = value.match(/Correction range:\s*(.*?)(?:\.\s+If sour\/thin:|$)/i)?.[1]?.trim();
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
  const roastBias = buildRoastAdjustedTargets(method, input.roastLevel).suggestedGrindBias;
  const targetProfiles = Array.isArray(input.catalog.targetProfiles) ? input.catalog.targetProfiles : [];
  const targetProfile = targetProfiles.find((entry) => entry.id === input.targetProfileId)
    || targetProfiles.find((entry) => entry.id === 'balance_clean')
    || targetProfiles[0];
  const grindBias = combineGrindBias(roastBias, targetProfile?.grindBias, methodFamily);
  const compatibility = getGrinderSafetyProfile(input.catalog, methodFamily, grinder);
  const correctionKind = toCorrectionKind(grindBias);

  if (!compatibility.selectable) {
    return {
      methodFamily,
      brewMode,
      dripper,
      grinder,
      deviceProfile,
      setting: undefined,
      grindBandLabel: 'Tidak direkomendasikan',
      primarySetting: 'Tidak direkomendasikan untuk espresso',
      correctionRange: '',
      correctionTip: 'Pilih grinder espresso-capable, atau gunakan Moka Pot, AeroPress pekat, atau filter kuat sebagai alternatif.',
      confidenceLabel: '',
      sourceLabel: '',
      confidenceKind: 'safe_baseline',
      sourceKind: 'baseline_method',
      capabilityKind: 'check_fine',
      warningKind: undefined,
      correctionKind,
      roastBiasKind: toCorrectionKind(roastBias),
      targetBiasKind: toCorrectionKind(targetProfile?.grindBias),
      targetProfileLabel: targetProfile?.label,
      targetProfileDescription: targetProfile?.description,
      compatibilityState: compatibility.state,
      compatibilitySelectable: compatibility.selectable,
      compatibilityReason: compatibility.reason,
      compatibilityTags: compatibility.tags,
      espressoInsight: undefined,
    };
  }

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
      ? 'Baseline terkalibrasi'
      : verificationLabel(setting?.verificationLevel),
    sourceLabel: setting?.calibrationRequired
      ? 'Master table + metode'
      : verificationLabel(setting?.verificationLevel),
    confidenceKind,
    sourceKind,
    capabilityKind: getGrinderCapabilityKind(grinder, methodFamily, setting),
    warningKind: buildGrinderSafetyWarning({ methodFamily, setting, deviceProfile })?.warningKind,
    correctionKind,
    roastBiasKind: toCorrectionKind(roastBias),
    targetBiasKind: toCorrectionKind(targetProfile?.grindBias),
    targetProfileLabel: targetProfile?.label,
    targetProfileDescription: targetProfile?.description,
    compatibilityState: compatibility.state,
    compatibilitySelectable: compatibility.selectable,
    compatibilityReason: compatibility.reason,
    compatibilityTags: compatibility.tags,
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
        const compatibility = getGrinderSafetyProfile(catalog, family, grinder);
        if (compatibility.selectable) value += 100;
        if (compatibility.state === 'compatible') value += 30;
        if (compatibility.state === 'caution') value += 10;
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
