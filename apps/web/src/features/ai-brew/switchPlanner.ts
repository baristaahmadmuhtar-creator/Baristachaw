import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewAgitationLevel,
  BrewPlanStep,
  BrewPourHeight,
  BrewPourPath,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  SwitchCompatibilityState,
  SwitchDoseMatrixRow,
  SwitchExpectedCupShift,
  SwitchPublicPreset,
  SwitchPublicPresetId,
  SwitchStepValidation,
  SwitchTasteProgrammePlan,
  TargetProfile,
  VerificationLevel,
  WaterClassification,
} from './types.ts';

const SWITCH_EXACT_IDS = new Set(['hario-switch-02', 'hario-switch-03', 'mugen-x-switch']);
const SWITCH_LEGACY_IDS = new Set(['hario-switch']);
const SWITCH_DOSE_CHIPS = [10, 12, 15, 18, 20];

export interface SwitchPlanSelection {
  preset: SwitchPublicPreset;
  doseRow?: SwitchDoseMatrixRow;
  compatibility: SwitchCompatibilityState;
  tasteProgramme: SwitchTasteProgrammePlan;
  adjustedProfile: DeviceBrewProfile;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nearestDoseChip(doseG: number) {
  return SWITCH_DOSE_CHIPS.reduce((best, current) => (
    Math.abs(current - doseG) < Math.abs(best - doseG) ? current : best
  ), SWITCH_DOSE_CHIPS[0]);
}

function isTruthyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isHarioSwitchDripperId(id: string) {
  return SWITCH_EXACT_IDS.has(id) || SWITCH_LEGACY_IDS.has(id);
}

export function isExactHarioSwitchDripperId(id: string) {
  return SWITCH_EXACT_IDS.has(id);
}

export function getSwitchSizeLabel(dripper: EquipmentCatalogEntry | { id: string; name?: string }) {
  if (dripper.id === 'hario-switch-02') return 'Switch 02';
  if (dripper.id === 'hario-switch-03') return 'Switch 03';
  if (dripper.id === 'mugen-x-switch') return 'MUGEN x SWITCH';
  return dripper.name || 'Hario Switch';
}

export function getSwitchPresets(catalog?: AiBrewCatalog) {
  return catalog?.switchPresets || [];
}

export function getSwitchPresetById(catalog: AiBrewCatalog | undefined, id?: string) {
  return getSwitchPresets(catalog).find((preset) => preset.id === id);
}

export function getSwitchDoseRows(catalog: AiBrewCatalog | undefined, dripperId: string) {
  return (catalog?.switchDoseMatrix || []).filter((row) => row.dripperId === dripperId);
}

export function resolveSwitchDoseRow(catalog: AiBrewCatalog, dripperId: string, doseG: number) {
  const rows = getSwitchDoseRows(catalog, dripperId);
  if (rows.length === 0) return undefined;
  const chipDose = nearestDoseChip(doseG);
  return rows.find((row) => row.doseG === chipDose)
    || rows.reduce((best, current) => (
      Math.abs(current.doseG - doseG) < Math.abs(best.doseG - doseG) ? current : best
    ), rows[0]);
}

function getCompatiblePreset(catalog: AiBrewCatalog, id: SwitchPublicPresetId, dripperId: string) {
  const preset = getSwitchPresetById(catalog, id);
  if (!preset) return undefined;
  if (!preset.compatibleDripperIds.includes(dripperId)) return undefined;
  return preset;
}

function isBodyTarget(targetProfile?: TargetProfile) {
  const haystack = `${targetProfile?.id || ''} ${targetProfile?.label || ''}`.toLowerCase();
  if (targetProfile?.id === 'soft_round') return false;
  return /body|dense|comfort/.test(haystack);
}

function isSweetTarget(targetProfile?: TargetProfile) {
  const haystack = `${targetProfile?.id || ''} ${targetProfile?.label || ''}`.toLowerCase();
  return /sweet|fruit|soft/.test(haystack);
}

function isBrightTarget(targetProfile?: TargetProfile) {
  const haystack = `${targetProfile?.id || ''} ${targetProfile?.label || ''}`.toLowerCase();
  if (targetProfile?.id === 'balance_clean') return false;
  return /acid|floral|bright|transparent/.test(haystack);
}

function isFruitTarget(targetProfile?: TargetProfile) {
  const haystack = `${targetProfile?.id || ''} ${targetProfile?.label || ''}`.toLowerCase();
  return /fruit|aroma/.test(haystack);
}

function isSoftRoundTarget(targetProfile?: TargetProfile) {
  const haystack = `${targetProfile?.id || ''} ${targetProfile?.label || ''}`.toLowerCase();
  return /soft|round/.test(haystack);
}

function isBalancedTarget(targetProfile?: TargetProfile) {
  const haystack = `${targetProfile?.id || ''} ${targetProfile?.label || ''}`.toLowerCase();
  return !targetProfile || targetProfile.id === 'balance_clean' || /balance|clean/.test(haystack);
}

function processHaystack(processEntry?: ProcessCatalogEntry) {
  return `${processEntry?.id || ''} ${processEntry?.label || ''}`.toLowerCase();
}

function isHeavyProcess(processEntry?: ProcessCatalogEntry) {
  const haystack = processHaystack(processEntry);
  return /wet|hulled|giling|sumatra|body|robusta|canephora/.test(haystack);
}

function isFermentProcess(processEntry?: ProcessCatalogEntry) {
  const haystack = processHaystack(processEntry);
  return /natural|anaerobic|carbonic|ferment|honey/.test(haystack);
}

function isClarityProcess(processEntry?: ProcessCatalogEntry) {
  const haystack = processHaystack(processEntry);
  return /washed|floral|geisha|gesha|ethiop|kenya|sl28|sl34/.test(haystack);
}

function isDarkOrRoastyProcess(processEntry?: ProcessCatalogEntry) {
  const haystack = `${processEntry?.id || ''} ${processEntry?.label || ''}`.toLowerCase();
  return /dark|roast|smoke|chocolate/.test(haystack);
}

const AUTO_SWITCH_PRESET_IDS: SwitchPublicPresetId[] = [
  'hybrid_balanced',
  'hybrid_bright_clean',
  'immersion_sweet',
  'immersion_heavy_body',
  'v60_mode',
  'iced_hybrid',
  'mugen_everyday_hybrid',
];

function scoreSwitchAutoPreset(
  presetId: SwitchPublicPresetId,
  params: {
    dripperId: string;
    doseRow?: SwitchDoseMatrixRow;
    targetProfile?: TargetProfile;
    processEntry?: ProcessCatalogEntry;
  },
) {
  const { dripperId, doseRow, targetProfile, processEntry } = params;
  if (doseRow?.blockedPresetIds.includes(presetId)) return Number.NEGATIVE_INFINITY;

  let score = 0;
  const targetId = targetProfile?.id || 'balance_clean';
  const isMugen = dripperId === 'mugen-x-switch';

  if (isBalancedTarget(targetProfile)) {
    if (presetId === 'hybrid_balanced') score += 10;
    if (presetId === 'mugen_everyday_hybrid') score += 11;
    if (presetId === 'hybrid_bright_clean') score += 3;
    if (presetId === 'immersion_sweet') score += 2;
    if (presetId === 'v60_mode') score += 1;
  }

  if (targetId === 'more_sweetness' || isSweetTarget(targetProfile)) {
    if (presetId === 'immersion_sweet') score += 12;
    if (presetId === 'hybrid_balanced') score += 7;
    if (presetId === 'mugen_everyday_hybrid') score += 7;
    if (presetId === 'immersion_heavy_body') score += 3;
    if (presetId === 'hybrid_bright_clean') score -= 2;
    if (presetId === 'v60_mode') score -= 4;
  }

  if (targetId === 'soft_round' || isSoftRoundTarget(targetProfile)) {
    if (presetId === 'immersion_sweet') score += 9;
    if (presetId === 'hybrid_balanced') score += 7;
    if (presetId === 'mugen_everyday_hybrid') score += 7;
    if (presetId === 'immersion_heavy_body') score += 2;
    if (presetId === 'v60_mode') score -= 2;
  }

  if (targetId === 'more_body' || targetId === 'dense_comforting' || isBodyTarget(targetProfile)) {
    if (presetId === 'immersion_heavy_body') score += 13;
    if (presetId === 'hybrid_balanced') score += 6;
    if (presetId === 'mugen_everyday_hybrid') score += 6;
    if (presetId === 'immersion_sweet') score += 3;
    if (presetId === 'hybrid_bright_clean') score -= 4;
    if (presetId === 'v60_mode') score -= 5;
  }

  if (targetId === 'more_acidity' || targetId === 'floral_transparent' || isBrightTarget(targetProfile)) {
    if (presetId === 'hybrid_bright_clean') score += 13;
    if (presetId === 'v60_mode') score += targetId === 'floral_transparent' ? 8 : 6;
    if (presetId === 'hybrid_balanced') score += 3;
    if (presetId === 'mugen_everyday_hybrid') score += 3;
    if (presetId === 'immersion_sweet') score -= 5;
    if (presetId === 'immersion_heavy_body') score -= 9;
  }

  if (targetId === 'fruit_forward' || isFruitTarget(targetProfile)) {
    if (presetId === 'hybrid_bright_clean') score += 8;
    if (presetId === 'hybrid_balanced') score += 7;
    if (presetId === 'mugen_everyday_hybrid') score += 7;
    if (presetId === 'v60_mode') score += 3;
    if (presetId === 'immersion_sweet') score += 2;
    if (presetId === 'immersion_heavy_body') score -= 5;
  }

  if (isClarityProcess(processEntry)) {
    if (presetId === 'hybrid_bright_clean') score += 3;
    if (presetId === 'v60_mode') score += 2;
    if (presetId === 'immersion_heavy_body') score -= 3;
  }

  if (isFermentProcess(processEntry)) {
    if (targetId === 'more_body' || targetId === 'dense_comforting') {
      if (presetId === 'immersion_heavy_body') score += 2;
      if (presetId === 'hybrid_balanced') score += 2;
    } else {
      if (presetId === 'hybrid_balanced') score += 3;
      if (presetId === 'mugen_everyday_hybrid') score += 3;
      if (presetId === 'hybrid_bright_clean') score += 1;
      if (presetId === 'immersion_heavy_body') score -= 2;
    }
  }

  if (isHeavyProcess(processEntry)) {
    if (targetId === 'more_body' || targetId === 'dense_comforting') {
      if (presetId === 'immersion_heavy_body') score += 4;
    } else {
      if (presetId === 'hybrid_balanced') score += 3;
      if (presetId === 'immersion_heavy_body') score -= 2;
    }
  }

  if (isDarkOrRoastyProcess(processEntry)) {
    if (presetId === 'v60_mode' || presetId === 'hybrid_balanced') score += 2;
    if (presetId === 'immersion_heavy_body' || presetId === 'immersion_sweet') score -= 3;
  }

  if (doseRow?.recommendedPresetIds.includes(presetId)) score += 4;
  if (doseRow?.cautionPresetIds.includes(presetId)) score -= 10;

  if (doseRow && doseRow.defaultTotalWaterMl > doseRow.safeClosedPhaseMaxMl) {
    if (presetId === 'v60_mode') score += 5;
    if (presetId === 'hybrid_balanced') score += 3;
    if (presetId === 'hybrid_bright_clean') score += 2;
    if (presetId === 'immersion_sweet' || presetId === 'immersion_heavy_body') score -= 8;
  }

  if (isMugen) {
    if (presetId === 'mugen_everyday_hybrid') score += 5;
    if (presetId === 'immersion_heavy_body' || presetId === 'immersion_sweet') score -= 4;
    if ((targetId === 'more_acidity' || targetId === 'floral_transparent') && presetId === 'v60_mode') score += 3;
  } else if (presetId === 'mugen_everyday_hybrid') {
    score -= 100;
  }

  return score;
}

function chooseAutoPresetId(params: {
  input: AiBrewFormState;
  dripperId: string;
  doseRow?: SwitchDoseMatrixRow;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
}) {
  const { input, dripperId, doseRow, targetProfile, processEntry } = params;
  if (input.brewMode === 'iced') return 'iced_hybrid' satisfies SwitchPublicPresetId;
  return AUTO_SWITCH_PRESET_IDS
    .filter((presetId) => dripperId === 'mugen-x-switch' || presetId !== 'mugen_everyday_hybrid')
    .map((presetId) => ({
      presetId,
      score: scoreSwitchAutoPreset(presetId, { dripperId, doseRow, targetProfile, processEntry }),
    }))
    .sort((a, b) => b.score - a.score)[0]?.presetId || 'hybrid_balanced';
}

export function resolveSwitchAutoMethodRecommendation(params: {
  input: AiBrewFormState;
  dripperId: string;
  doseRow?: SwitchDoseMatrixRow;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
}) {
  return chooseAutoPresetId(params);
}

function resolvePreset(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripperId: string;
  doseRow?: SwitchDoseMatrixRow;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
}) {
  const explicitId = isTruthyString(params.input.switchPresetId) ? params.input.switchPresetId : '';
  const candidateId = explicitId || resolveSwitchAutoMethodRecommendation(params);
  const candidate = getCompatiblePreset(params.catalog, candidateId as SwitchPublicPresetId, params.dripperId);
  if (candidate) return candidate;
  return getCompatiblePreset(params.catalog, params.dripperId === 'mugen-x-switch' ? 'mugen_everyday_hybrid' : 'hybrid_balanced', params.dripperId)
    || getSwitchPresets(params.catalog).find((preset) => preset.compatibleDripperIds.includes(params.dripperId))
    || getSwitchPresets(params.catalog)[0];
}

function buildCompatibility(
  preset: SwitchPublicPreset,
  row: SwitchDoseMatrixRow | undefined,
  dripper: EquipmentCatalogEntry,
): SwitchCompatibilityState {
  const sizeLabel = getSwitchSizeLabel(dripper);
  const doseLabel = row ? `${row.doseG} g` : 'Dose not mapped';
  if (!row) {
    return {
      status: 'caution',
      sizeLabel,
      doseLabel,
      message: `No dose matrix row found for this dose in ${sizeLabel}; use as a conservative starting point.`,
      compatiblePresetIds: [preset.id],
    };
  }
  if (row.blockedPresetIds.includes(preset.id)) {
    return {
      status: 'blocked',
      sizeLabel,
      doseLabel,
      message: `${preset.label} is not safe for ${sizeLabel} ${doseLabel}: closed chamber load exceeds the safe limit of ${row.safeClosedPhaseMaxMl} ml.`,
      compatiblePresetIds: row.recommendedPresetIds,
    };
  }
  if (row.cautionPresetIds.includes(preset.id)) {
    return {
      status: 'caution',
      sizeLabel,
      doseLabel,
      message: `${preset.label} can be used for ${sizeLabel} ${doseLabel}, but keep chamber load below ${row.safeClosedPhaseMaxMl} ml and open earlier if the flow slows.`,
      compatiblePresetIds: row.recommendedPresetIds,
    };
  }
  return {
    status: 'safe',
    sizeLabel,
    doseLabel,
    message: `${preset.label} is safe for ${sizeLabel} ${doseLabel}; chamber load limit is ${row.safeClosedPhaseMaxMl} ml.`,
    compatiblePresetIds: row.recommendedPresetIds,
  };
}

function roundSwitchMl(value: number) {
  return Math.max(0, Math.round(value / 5) * 5);
}

function roundSwitchSeconds(value: number) {
  return Math.max(0, Math.round(value / 5) * 5);
}

function safeWaterReference(params: { input: AiBrewFormState; doseG: number; row?: SwitchDoseMatrixRow }) {
  const explicitWater = Number.parseFloat(params.input.targetWaterMl || '');
  if (Number.isFinite(explicitWater) && explicitWater > 0) return explicitWater;
  if (params.row?.defaultTotalWaterMl) return params.row.defaultTotalWaterMl;
  return params.doseG * 15;
}

function referenceHotWaterMl(params: { input: AiBrewFormState; doseG: number; row?: SwitchDoseMatrixRow }) {
  const total = safeWaterReference(params);
  return params.input.brewMode === 'iced' ? roundSwitchMl(total * 0.65) : roundSwitchMl(total);
}

type SwitchTasteIntent = 'balance' | 'sweet' | 'bright' | 'body' | 'floral' | 'fruit' | 'soft' | 'dense';

function resolveSwitchTasteIntent(targetProfile?: TargetProfile): SwitchTasteIntent {
  const targetId = targetProfile?.id || 'balance_clean';
  if (targetId === 'more_sweetness') return 'sweet';
  if (targetId === 'more_acidity') return 'bright';
  if (targetId === 'more_body') return 'body';
  if (targetId === 'floral_transparent') return 'floral';
  if (targetId === 'fruit_forward') return 'fruit';
  if (targetId === 'soft_round') return 'soft';
  if (targetId === 'dense_comforting') return 'dense';
  return 'balance';
}

function switchBloomRatioForIntent(intent: SwitchTasteIntent, params: {
  processEntry?: ProcessCatalogEntry;
  roastLevel?: AiBrewFormState['roastLevel'];
}) {
  let ratio = 2.7;
  if (intent === 'bright') ratio = 2.25;
  if (intent === 'floral') ratio = 2.05;
  if (intent === 'sweet' || intent === 'soft') ratio = 3;
  if (intent === 'body' || intent === 'dense') ratio = 3.35;
  if (intent === 'fruit') ratio = 2.8;

  if (isFermentProcess(params.processEntry) && (intent === 'bright' || intent === 'floral')) ratio -= 0.15;
  if (isHeavyProcess(params.processEntry) && (intent === 'body' || intent === 'dense')) ratio += 0.1;
  if (params.roastLevel === 'medium_dark' || params.roastLevel === 'dark') ratio -= 0.25;
  return clamp(ratio, 2, 3.5);
}

function switchTechniqueForIntent(intent: SwitchTasteIntent, presetId: SwitchPublicPresetId): {
  flowRateMlPerSec: [number, number];
  pourPath: BrewPourPath;
  pourHeight: BrewPourHeight;
  agitationLevel: BrewAgitationLevel;
  pourStyle: string;
} {
  if (presetId === 'v60_mode' || intent === 'bright' || intent === 'floral') {
    return {
      flowRateMlPerSec: [4, 5],
      pourPath: 'center_to_mid',
      pourHeight: 'low',
      agitationLevel: 'minimal',
      pourStyle: 'clean low-flow valve-open stream',
    };
  }
  if (intent === 'body' || intent === 'dense' || presetId === 'immersion_heavy_body') {
    return {
      flowRateMlPerSec: [4, 6],
      pourPath: 'center',
      pourHeight: 'low',
      agitationLevel: 'controlled',
      pourStyle: 'slow center pour, no hard swirl',
    };
  }
  if (intent === 'sweet' || intent === 'soft' || presetId === 'immersion_sweet') {
    return {
      flowRateMlPerSec: [5, 6],
      pourPath: 'center_to_mid',
      pourHeight: 'low',
      agitationLevel: 'low',
      pourStyle: 'gentle valve-open stream',
    };
  }
  return {
    flowRateMlPerSec: [5, 7],
    pourPath: 'center_to_mid',
    pourHeight: 'low',
    agitationLevel: 'low',
    pourStyle: 'balanced valve-open stream',
  };
}

function suggestedSafeSwitchPreset(params: {
  dripperId: string;
  targetProfile?: TargetProfile;
  presetId: SwitchPublicPresetId;
  brewMode: AiBrewFormState['brewMode'];
}) {
  if (params.brewMode === 'iced') return 'iced_hybrid' satisfies SwitchPublicPresetId;
  if (params.dripperId === 'mugen-x-switch') return 'mugen_everyday_hybrid' satisfies SwitchPublicPresetId;
  const intent = resolveSwitchTasteIntent(params.targetProfile);
  if (intent === 'bright' || intent === 'floral') return 'v60_mode' satisfies SwitchPublicPresetId;
  return 'hybrid_balanced' satisfies SwitchPublicPresetId;
}

type SwitchTargetTuningParams = {
  input: AiBrewFormState;
  preset: SwitchPublicPreset;
  doseRow?: SwitchDoseMatrixRow;
  dripperId: string;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
  waterClassification?: WaterClassification;
  grinderVerification?: VerificationLevel;
};

export function deriveSwitchTargetTuning(params: SwitchTargetTuningParams): SwitchTasteProgrammePlan {
  const { input, preset, doseRow, dripperId, targetProfile, processEntry, doseG } = params;
  const intent = resolveSwitchTasteIntent(targetProfile);
  const hotReferenceMl = Math.max(60, referenceHotWaterMl({ input, doseG, row: doseRow }));
  const maxClosedLoadMl = doseRow?.safeClosedPhaseMaxMl || (dripperId === 'hario-switch-03' ? 320 : 180);
  const technique = switchTechniqueForIntent(intent, preset.id);
  const bloomRatio = switchBloomRatioForIntent(intent, { processEntry, roastLevel: input.roastLevel });
  const practicalMinBloomMl = doseG <= 12 ? 25 : 35;
  const bloomMl = roundSwitchMl(clamp(doseG * bloomRatio, practicalMinBloomMl, Math.min(maxClosedLoadMl, hotReferenceMl - 5)));
  const isMugen = dripperId === 'mugen-x-switch';
  const waterTight = hotReferenceMl > maxClosedLoadMl;
  const riskWarnings: string[] = [];

  let closedRatio = 0.58;
  if (intent === 'sweet' || intent === 'soft') closedRatio = 0.66;
  if (intent === 'body' || intent === 'dense') closedRatio = 0.74;
  if (intent === 'bright' || intent === 'floral') closedRatio = 0.2;
  if (intent === 'fruit') closedRatio = 0.55;
  if (preset.id === 'immersion_sweet') closedRatio = 1;
  if (preset.id === 'immersion_heavy_body') closedRatio = 1;
  if (preset.id === 'v60_mode') closedRatio = 0;
  if (preset.id === 'hybrid_bright_clean') closedRatio = Math.min(closedRatio, 0.22);
  if (preset.id === 'iced_hybrid') closedRatio = waterTight ? 0.55 : 0.68;
  if (isMugen) closedRatio = Math.min(closedRatio, 0.48);

  const desiredClosedMl = preset.id === 'v60_mode'
    ? 0
    : Math.max(bloomMl, roundSwitchMl(hotReferenceMl * closedRatio));
  const fullImmersionRequested = preset.id === 'immersion_sweet' || preset.id === 'immersion_heavy_body';
  const closedPhaseMl = preset.id === 'v60_mode'
    ? 0
    : fullImmersionRequested
      ? hotReferenceMl
      : Math.min(maxClosedLoadMl, desiredClosedMl);
  const openPhaseMl = Math.max(0, hotReferenceMl - Math.min(hotReferenceMl, closedPhaseMl));
  const bloomSeconds = roundSwitchSeconds(clamp(
    intent === 'bright' || intent === 'floral' ? 35 : intent === 'body' || intent === 'dense' ? 55 : intent === 'sweet' || intent === 'soft' ? 50 : 45,
    30,
    60,
  ));
  const closedPhaseSeconds = roundSwitchSeconds(clamp(
    intent === 'bright' || intent === 'floral' ? 40 : intent === 'body' || intent === 'dense' ? 105 : intent === 'sweet' || intent === 'soft' ? 90 : 75,
    35,
    120,
  ));
  const releaseSeconds = preset.id === 'v60_mode'
    ? 0
    : roundSwitchSeconds(bloomSeconds + closedPhaseSeconds);

  if (fullImmersionRequested && hotReferenceMl > maxClosedLoadMl) {
    riskWarnings.push(`Full immersion requires closed chamber load of ${Math.round(hotReferenceMl)} ml, exceeding the safe limit of ${Math.round(maxClosedLoadMl)} ml.`);
  }
  if (waterTight && preset.id !== 'v60_mode' && !fullImmersionRequested) {
    riskWarnings.push(`Keep the closed valve phase at ${Math.round(maxClosedLoadMl)} ml or lower; finish with the valve open.`);
  }
  if (params.waterClassification === 'high_buffer' || params.waterClassification === 'alkaline_caution') {
    riskWarnings.push('High-buffer water can mute bright notes; open the valve earlier if the cup tastes flat.');
  }
  if (params.grinderVerification === 'fallback' || params.grinderVerification === 'dataset_unverified') {
    riskWarnings.push('Grinder reference has low confidence; validate the drawdown before shifting recipe numbers.');
  }
  if (isTruthyString(input.switchPresetId)) {
    const brightTarget = intent === 'bright' || intent === 'floral';
    const bodyTarget = intent === 'body' || intent === 'dense';
    const sweetTarget = intent === 'sweet' || intent === 'soft';
    if (brightTarget && (preset.id === 'immersion_heavy_body' || preset.id === 'immersion_sweet')) {
      riskWarnings.push('Manual preset is less aligned with bright/floral targets; clarity can drop. Use Hybrid Bright Clean or V60 Mode for more transparency.');
    }
    if (bodyTarget && (preset.id === 'v60_mode' || preset.id === 'hybrid_bright_clean')) {
      riskWarnings.push('Manual preset is cleaner than the body target; body can taste lighter. Use Heavy Body only if the chamber capacity is safe.');
    }
    if (sweetTarget && preset.id === 'v60_mode') {
      riskWarnings.push('Manual V60 mode is more transparent than the sweet/round target; sweetness can taste lighter.');
    }
  }

  const suggestedPresetId = fullImmersionRequested && hotReferenceMl > maxClosedLoadMl
    ? suggestedSafeSwitchPreset({ dripperId, targetProfile, presetId: preset.id, brewMode: input.brewMode })
    : undefined;
  const valvePath = preset.id === 'v60_mode'
    ? ['open'] as const
    : openPhaseMl > 0
      ? ['closed', 'open'] as const
      : ['closed', 'open'] as const;

  const targetLabel = targetProfile?.label || 'Balance & Clean';
  const sensoryReason = (() => {
    if (isMugen) {
      if (intent === 'bright' || intent === 'floral') return `${targetLabel}: MUGEN low-bypass is used with a cleaner open phase to boost clarity without exceeding Mugen capacity.`;
      if (intent === 'body' || intent === 'dense') return `${targetLabel}: MUGEN low-bypass provides focus and body, keeping the 200 ml chamber safe with a conservative hybrid.`;
      return `${targetLabel}: MUGEN low-bypass gives focused sweetness, with a safe hybrid keeping the 200 ml chamber controlled.`;
    }
    if (preset.id === 'v60_mode') return `${targetLabel}: valve open from the start to maximize clarity and transparency.`;
    if (intent === 'bright' || intent === 'floral') return `${targetLabel}: short closed phase to prevent acidity, aroma, and clarity from being masked by body.`;
    if (intent === 'sweet' || intent === 'soft') return `${targetLabel}: larger bloom and gentle closed contact capturing sweetness without harsh swirling.`;
    if (intent === 'body' || intent === 'dense') return `${targetLabel}: longer closed contact to enhance body, keeping chamber loads safe to avoid muddy notes.`;
    if (intent === 'fruit') return `${targetLabel}: medium closed capture preserving fruit sweetness, followed by an open finish to keep it clean.`;
    return `${targetLabel}: closed bloom capturing early sweetness, followed by an open finish to maintain a clean cup.`;
  })();

  return {
    presetId: preset.id,
    bloomMl,
    bloomRatio: Number(bloomRatio.toFixed(2)),
    bloomSeconds,
    closedPhaseMl: Math.round(closedPhaseMl),
    closedPhaseSeconds,
    openPhaseMl: Math.round(openPhaseMl),
    releaseSeconds,
    pourStyle: technique.pourStyle,
    flowRateMlPerSec: technique.flowRateMlPerSec,
    pourPath: technique.pourPath,
    pourHeight: technique.pourHeight,
    agitationLevel: technique.agitationLevel,
    valvePath: [...valvePath],
    chamberLoadPlan: [
      {
        stepId: 'switch_closed_bloom',
        valveState: preset.id === 'v60_mode' ? 'open' : 'closed',
        chamberLoadMl: preset.id === 'v60_mode' ? 0 : bloomMl,
      },
      {
        stepId: 'switch_closed_phase',
        valveState: preset.id === 'v60_mode' ? 'open' : 'closed',
        chamberLoadMl: preset.id === 'v60_mode' ? 0 : Math.round(closedPhaseMl),
      },
    ],
    sensoryReason,
    riskWarnings,
    suggestedPresetId,
    canonicalHotWaterMl: hotReferenceMl,
    canonicalTotalWaterMl: safeWaterReference({ input, doseG, row: doseRow }),
  };
}

export function resolveSwitchTasteProgramme(params: SwitchTargetTuningParams): SwitchTasteProgrammePlan {
  // Compatibility wrapper: the selected Switch method remains the method.
  // Target rasa only tunes bloom, valve timing, flow, path, and agitation inside that method.
  return deriveSwitchTargetTuning(params);
}

function step(params: BrewTemplateStep): BrewTemplateStep {
  return params;
}

function shareFromMl(ml: number, hotReferenceMl: number) {
  if (hotReferenceMl <= 0) return 0;
  return clamp(ml / hotReferenceMl, 0, 1);
}

function targetTechnique(taste: SwitchTasteProgrammePlan, override?: Partial<Pick<BrewTemplateStep, 'flowRateMlPerSec' | 'pourPath' | 'pourHeight' | 'agitationLevel'>>) {
  return {
    flowRateMlPerSec: override?.flowRateMlPerSec || taste.flowRateMlPerSec,
    pourPath: override?.pourPath || taste.pourPath,
    pourHeight: override?.pourHeight || taste.pourHeight,
    agitationLevel: override?.agitationLevel || taste.agitationLevel,
  };
}

function fullImmersionSteps(preset: SwitchPublicPreset, taste: SwitchTasteProgrammePlan, hotReferenceMl: number): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  const fillMl = Math.max(0, hotReferenceMl - taste.bloomMl);
  return [
    step({
      id: 'switch_closed_bloom',
      label: 'Closed bloom',
      kind: 'pour',
      share: shareFromMl(taste.bloomMl, hotReferenceMl),
      startSeconds: 0,
      note: `Valve closed. Bloom ${taste.bloomMl} ml (${taste.bloomRatio}x dose); pour gently and avoid aggressive swirling.`,
      valveState: 'closed',
      chamberState: 'bloom',
      chamberLoadMl: Math.round(taste.bloomMl),
      chamberLoadShare: shareFromMl(taste.bloomMl, hotReferenceMl),
      switchProgramme: programme,
      ...targetTechnique(taste, { pourPath: 'immersion_charge' }),
    }),
    step({
      id: 'switch_closed_fill',
      label: preset.id === 'immersion_heavy_body' ? 'Body fill' : 'Sweet fill',
      kind: 'pour',
      share: shareFromMl(fillMl, hotReferenceMl),
      startSeconds: taste.bloomSeconds,
      note: preset.id === 'immersion_heavy_body'
        ? 'Still closed. Fill slowly to build body; open before it feels heavy or muddy.'
        : 'Still closed. Fill the remaining water gently to promote sweetness and round body.',
      valveState: 'closed',
      chamberState: 'filling',
      chamberLoadMl: Math.round(hotReferenceMl),
      chamberLoadShare: 1,
      switchProgramme: programme,
      ...targetTechnique(taste, { pourPath: 'immersion_charge' }),
    }),
    step({
      id: 'switch_closed_contact',
      label: 'Closed contact',
      kind: 'wait',
      share: 0,
      startSeconds: Math.max(taste.bloomSeconds + 30, taste.releaseSeconds - 35),
      note: 'Hold closed contact time; open before flow stalls.',
      valveState: 'closed',
      chamberState: 'immersion',
      chamberLoadMl: Math.round(hotReferenceMl),
      chamberLoadShare: 1,
      switchProgramme: programme,
    }),
    step({
      id: 'switch_release',
      label: 'Release',
      kind: 'release',
      share: 0,
      startSeconds: taste.releaseSeconds,
      note: 'Open the valve cleanly and let the release drain without extra agitation.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: taste.releaseSeconds + 85,
      note: 'Swirl the server 5-8 seconds to integrate, then serve. Note if body starts tasting muddy.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function balancedHybridSteps(preset: SwitchPublicPreset, taste: SwitchTasteProgrammePlan, hotReferenceMl: number): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  const closedFillMl = Math.max(0, taste.closedPhaseMl - taste.bloomMl);
  const openFinishMl = Math.max(0, hotReferenceMl - taste.closedPhaseMl);
  return [
    step({
      id: 'switch_closed_bloom',
      label: 'Closed bloom',
      kind: 'pour',
      share: shareFromMl(taste.bloomMl, hotReferenceMl),
      startSeconds: 0,
      note: `Valve closed. Bloom ${taste.bloomMl} ml (${taste.bloomRatio}x dose); pour gently and avoid aggressive swirling.`,
      valveState: 'closed',
      chamberState: 'bloom',
      chamberLoadMl: Math.round(taste.bloomMl),
      chamberLoadShare: shareFromMl(taste.bloomMl, hotReferenceMl),
      switchProgramme: programme,
      ...targetTechnique(taste, { pourPath: 'immersion_charge' }),
    }),
    ...(closedFillMl > 0
      ? [step({
        id: 'switch_closed_sweeten',
        label: 'Closed sweeten',
        kind: 'pour',
        share: shareFromMl(closedFillMl, hotReferenceMl),
        startSeconds: taste.bloomSeconds,
        note: `Still closed. Raise the chamber load to about ${taste.closedPhaseMl} ml, then prepare for release.`,
        valveState: 'closed',
        chamberState: 'immersion',
        chamberLoadMl: Math.round(taste.closedPhaseMl),
        chamberLoadShare: shareFromMl(taste.closedPhaseMl, hotReferenceMl),
        switchProgramme: programme,
        ...targetTechnique(taste, { pourPath: 'immersion_charge' }),
      })]
      : []),
    step({
      id: 'switch_release_checkpoint',
      label: 'Release checkpoint',
      kind: 'release',
      share: 0,
      startSeconds: taste.releaseSeconds,
      note: 'Open the valve before the bed stalls; this keeps the finish clean.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    ...(openFinishMl > 0
      ? [step({
        id: 'switch_open_finish',
        label: 'Open finish',
        kind: 'pour',
        share: shareFromMl(openFinishMl, hotReferenceMl),
        startSeconds: taste.releaseSeconds + 35,
        note: 'Valve open. Complete the target with a steady open-flow stream, avoiding heavy wall-rinse.',
        valveState: 'open',
        chamberState: 'percolation',
        switchProgramme: programme,
        ...targetTechnique(taste),
      })]
      : []),
    step({
      id: 'switch_drawdown',
      label: 'Drawdown',
      kind: 'drawdown',
      share: 0,
      startSeconds: taste.releaseSeconds + 80,
      note: 'Allow the drawdown to complete naturally; do not add extra water.',
      valveState: 'open',
      chamberState: 'drawdown',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: taste.releaseSeconds + 115,
      note: 'Swirl the server 5-8 seconds to integrate, then serve.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function brightHybridSteps(preset: SwitchPublicPreset, taste: SwitchTasteProgrammePlan, hotReferenceMl: number): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  const closedCaptureMl = Math.max(0, taste.closedPhaseMl);
  const openBeforeCaptureMl = Math.max(0, hotReferenceMl - closedCaptureMl);
  const openBloomMl = Math.min(taste.bloomMl, openBeforeCaptureMl);
  const openBuildMl = Math.max(0, openBeforeCaptureMl - openBloomMl);
  return [
    step({
      id: 'switch_open_bloom',
      label: 'Open bloom',
      kind: 'pour',
      share: shareFromMl(openBloomMl, hotReferenceMl),
      startSeconds: 0,
      note: `Valve open. Bloom cleanly with ${openBloomMl} ml; keep flow low and avoid wall-rinse.`,
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
      ...targetTechnique(taste),
    }),
    step({
      id: 'switch_open_build',
      label: 'Open build',
      kind: 'pour',
      share: shareFromMl(openBuildMl, hotReferenceMl),
      startSeconds: taste.bloomSeconds,
      note: 'Valve open. Build clarity with a steady stream and minimal agitation.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
      ...targetTechnique(taste),
    }),
    step({
      id: 'switch_closed_capture',
      label: 'Short capture',
      kind: 'pour',
      share: shareFromMl(closedCaptureMl, hotReferenceMl),
      startSeconds: taste.releaseSeconds - 45,
      note: `Close the valve briefly to capture late sweetness (${closedCaptureMl} ml). Do not hold too long.`,
      valveState: 'closed',
      chamberState: 'immersion',
      chamberLoadMl: Math.round(closedCaptureMl),
      chamberLoadShare: shareFromMl(closedCaptureMl, hotReferenceMl),
      switchProgramme: programme,
      ...targetTechnique(taste, { pourPath: 'center' }),
    }),
    step({
      id: 'switch_release',
      label: 'Release',
      kind: 'release',
      share: 0,
      startSeconds: taste.releaseSeconds,
      note: 'Open the valve early to keep the aroma, acidity, and clarity from being muted by body.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: taste.releaseSeconds + 75,
      note: 'Swirl the server gently and serve.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function v60ModeSteps(preset: SwitchPublicPreset, taste: SwitchTasteProgrammePlan, hotReferenceMl: number): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  const bloomMl = Math.min(taste.bloomMl, hotReferenceMl * 0.32);
  const middleMl = Math.max(0, (hotReferenceMl - bloomMl) * 0.58);
  const finishMl = Math.max(0, hotReferenceMl - bloomMl - middleMl);
  return [
    step({
      id: 'switch_v60_bloom',
      label: 'Open bloom',
      kind: 'pour',
      share: shareFromMl(bloomMl, hotReferenceMl),
      startSeconds: 0,
      note: `Valve open from the start. Bloom ${roundSwitchMl(bloomMl)} ml; this is V60 mode, not immersion.`,
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
      ...targetTechnique(taste),
    }),
    step({
      id: 'switch_v60_middle',
      label: 'Open middle',
      kind: 'pour',
      share: shareFromMl(middleMl, hotReferenceMl),
      startSeconds: taste.bloomSeconds + 20,
      note: 'Keep the valve open and maintain a steady flow to protect clarity.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
      ...targetTechnique(taste),
    }),
    step({
      id: 'switch_v60_finish',
      label: 'Open finish',
      kind: 'pour',
      share: shareFromMl(finishMl, hotReferenceMl),
      startSeconds: taste.bloomSeconds + 75,
      note: 'Complete the target volume with a clean path; do not close the valve.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
      ...targetTechnique(taste),
    }),
    step({
      id: 'switch_v60_drawdown',
      label: 'Drawdown',
      kind: 'drawdown',
      share: 0,
      startSeconds: taste.bloomSeconds + 120,
      note: 'Drawdown naturally; no release checkpoint since the valve is already open.',
      valveState: 'open',
      chamberState: 'drawdown',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: taste.bloomSeconds + 155,
      note: 'Swirl the server gently and serve.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function icedHybridSteps(preset: SwitchPublicPreset, taste: SwitchTasteProgrammePlan, hotReferenceMl: number): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  const closedFillMl = Math.max(0, taste.closedPhaseMl - taste.bloomMl);
  const openFinishMl = Math.max(0, hotReferenceMl - taste.closedPhaseMl);
  return [
    step({
      id: 'switch_iced_bloom',
      label: 'Closed iced bloom',
      kind: 'pour',
      share: shareFromMl(taste.bloomMl, hotReferenceMl),
      startSeconds: 0,
      note: `Valve closed. Bloom the hot concentrate with ${taste.bloomMl} ml; ice is pre-weighed in the server.`,
      valveState: 'closed',
      chamberState: 'bloom',
      chamberLoadMl: Math.round(taste.bloomMl),
      chamberLoadShare: shareFromMl(taste.bloomMl, hotReferenceMl),
      switchProgramme: programme,
      ...targetTechnique(taste, { pourPath: 'immersion_charge' }),
    }),
    ...(closedFillMl > 0
      ? [step({
        id: 'switch_iced_hot_fill',
        label: 'Closed hot fill',
        kind: 'pour',
        share: shareFromMl(closedFillMl, hotReferenceMl),
        startSeconds: taste.bloomSeconds,
        note: `Still closed. Fill the hot concentrate target up to about ${taste.closedPhaseMl} ml; do not add hidden bypass.`,
        valveState: 'closed',
        chamberState: 'filling',
        chamberLoadMl: Math.round(taste.closedPhaseMl),
        chamberLoadShare: shareFromMl(taste.closedPhaseMl, hotReferenceMl),
        switchProgramme: programme,
        ...targetTechnique(taste, { pourPath: 'immersion_charge' }),
      })]
      : []),
    step({
      id: 'switch_iced_release',
      label: 'Release over ice',
      kind: 'release',
      share: 0,
      startSeconds: taste.releaseSeconds,
      note: 'Open the valve and release the hot concentrate directly over the ice in the server.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    ...(openFinishMl > 0
      ? [step({
        id: 'switch_iced_open_finish',
        label: 'Open hot finish',
        kind: 'pour',
        share: shareFromMl(openFinishMl, hotReferenceMl),
        startSeconds: taste.releaseSeconds + 35,
        note: 'Valve open. Pour only up to the hot water target; final volume is hot water + ice.',
        valveState: 'open',
        chamberState: 'percolation',
        switchProgramme: programme,
        ...targetTechnique(taste),
      })]
      : []),
    step({
      id: 'switch_iced_serve',
      label: 'Stir and serve',
      kind: 'serve',
      share: 0,
      startSeconds: taste.releaseSeconds + 95,
      note: 'Stir the server 5-8 seconds to integrate concentrate and ice thoroughly.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function stepsForPreset(preset: SwitchPublicPreset, taste: SwitchTasteProgrammePlan): BrewTemplateStep[] {
  const hotReferenceMl = Math.max(60, taste.closedPhaseMl + taste.openPhaseMl);
  switch (preset.id) {
    case 'immersion_sweet':
    case 'immersion_heavy_body':
      return fullImmersionSteps(preset, taste, hotReferenceMl);
    case 'hybrid_bright_clean':
      return brightHybridSteps(preset, taste, hotReferenceMl);
    case 'v60_mode':
      return v60ModeSteps(preset, taste, hotReferenceMl);
    case 'iced_hybrid':
      return icedHybridSteps(preset, taste, hotReferenceMl);
    case 'mugen_everyday_hybrid':
    case 'hybrid_balanced':
    default:
      return balancedHybridSteps(preset, taste, hotReferenceMl);
  }
}

export function applySwitchPresetToDeviceProfile(
  profile: DeviceBrewProfile,
  selection: Pick<SwitchPlanSelection, 'preset' | 'doseRow' | 'tasteProgramme'>,
): DeviceBrewProfile {
  const steps = stepsForPreset(selection.preset, selection.tasteProgramme);
  return {
    ...profile,
    methodFamily: 'hario_switch',
    methodProgramme: selection.preset.defaultProgramme,
    recipeStyle: selection.preset.id,
    targetWaterMl: selection.tasteProgramme.canonicalTotalWaterMl || profile.targetWaterMl,
    hotWaterMl: selection.tasteProgramme.canonicalHotWaterMl || profile.hotWaterMl,
    note: `${profile.note} Switch method: ${selection.preset.label}. ${selection.preset.why}`.trim(),
    steps,
  };
}

export function resolveSwitchPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  waterClassification?: WaterClassification;
  grinderVerification?: VerificationLevel;
  doseG: number;
}): SwitchPlanSelection | null {
  const { input, catalog, dripper, profile, targetProfile, processEntry, waterClassification, grinderVerification, doseG } = params;
  if (profile.methodFamily !== 'hario_switch' && dripper.methodFamily !== 'hario_switch') return null;
  if (!isExactHarioSwitchDripperId(dripper.id)) return null;
  const doseRow = resolveSwitchDoseRow(catalog, dripper.id, doseG);
  let preset = resolvePreset({
    input,
    catalog,
    dripperId: dripper.id,
    doseRow,
    targetProfile,
    processEntry,
  });
  if (!preset) return null;

  const originalPresetId = preset.id;
  let tasteProgramme = deriveSwitchTargetTuning({
    input,
    preset,
    doseRow,
    dripperId: dripper.id,
    targetProfile,
    processEntry,
    waterClassification,
    grinderVerification,
    doseG,
  });

  const maxClosedLoadMl = doseRow?.safeClosedPhaseMaxMl || (dripper.id === 'hario-switch-03' ? 320 : 180);
  const peakLoad = Math.max(0, ...tasteProgramme.chamberLoadPlan.map((c) => c.chamberLoadMl));

  let originalPresetStatus: 'safe' | 'caution' | 'blocked' = 'safe';
  if (peakLoad > maxClosedLoadMl) {
    originalPresetStatus = 'blocked';
  } else if (maxClosedLoadMl > 0 && peakLoad > maxClosedLoadMl * 0.9) {
    originalPresetStatus = 'caution';
  }

  let recoveryApplied = false;
  let recoveryReason = '';
  let finalPresetStatus = originalPresetStatus;

  const explicitPresetSelected = isTruthyString(input.switchPresetId);
  const wantsRecovery = originalPresetStatus === 'blocked' || (!explicitPresetSelected && tasteProgramme.suggestedPresetId && tasteProgramme.suggestedPresetId !== preset.id);

  if (wantsRecovery) {
    const suggestedId = tasteProgramme.suggestedPresetId || suggestedSafeSwitchPreset({ dripperId: dripper.id, targetProfile, presetId: preset.id, brewMode: input.brewMode });
    const safePreset = getCompatiblePreset(catalog, suggestedId, dripper.id);

    if (safePreset && safePreset.id !== preset.id && !doseRow?.blockedPresetIds.includes(safePreset.id)) {
      preset = safePreset;
      tasteProgramme = deriveSwitchTargetTuning({
        input,
        preset,
        doseRow,
        dripperId: dripper.id,
        targetProfile,
        processEntry,
        waterClassification,
        grinderVerification,
        doseG,
      });
      recoveryApplied = true;
      recoveryReason = `Full immersion exceeds safe capacity (${maxClosedLoadMl} ml). Recovered to a safe hybrid method.`;

      const newPeakLoad = Math.max(0, ...tasteProgramme.chamberLoadPlan.map((c) => c.chamberLoadMl));
      finalPresetStatus = newPeakLoad > maxClosedLoadMl ? 'blocked' : (maxClosedLoadMl > 0 && newPeakLoad > maxClosedLoadMl * 0.9) ? 'caution' : 'safe';
    }
  }

  tasteProgramme = {
    ...tasteProgramme,
    originalPresetId,
    finalPresetId: preset.id,
    recoveryApplied,
    recoveryReason,
    originalPresetStatus,
    finalPresetStatus,
    safeClosedPhaseMaxMl: maxClosedLoadMl,
    peakClosedLoadMl: Math.max(0, ...tasteProgramme.chamberLoadPlan.map((c) => c.chamberLoadMl)),
    recoveryOptions: doseRow?.recommendedPresetIds || [],
  };

  const compatibility = buildCompatibility(preset, doseRow, dripper);
  return {
    preset,
    doseRow,
    compatibility,
    tasteProgramme,
    adjustedProfile: applySwitchPresetToDeviceProfile(profile, { preset, doseRow, tasteProgramme }),
  };
}

export function validateSwitchStepSafety(params: {
  steps: BrewPlanStep[];
  doseRow?: SwitchDoseMatrixRow;
  presetId?: SwitchPublicPresetId;
  hotWaterMl: number;
  constraints?: { recommendedClosedPhaseMaxMl?: number; finishedCapacityMl?: number };
  suggestedPresetId?: SwitchPublicPresetId;
}): SwitchStepValidation {
  const maxClosedLoadMl = params.doseRow?.safeClosedPhaseMaxMl
    || params.constraints?.recommendedClosedPhaseMaxMl
    || params.constraints?.finishedCapacityMl
    || 0;
  const closedSteps = params.steps.filter((step) => step.valveState === 'closed');
  const closedLoads = closedSteps
    .map((step) => step.chamberLoadMl ?? step.targetVolumeMl)
    .filter((value) => Number.isFinite(value));
  const peakClosedLoadMl = Math.max(0, ...closedLoads);
  const unsafeStepIds = maxClosedLoadMl > 0
    ? closedSteps
      .filter((step) => (step.chamberLoadMl ?? step.targetVolumeMl) > maxClosedLoadMl + 1)
      .map((step) => step.id)
    : [];
  const fullImmersion = params.presetId === 'immersion_sweet' || params.presetId === 'immersion_heavy_body';
  const fullImmersionOverCapacity = fullImmersion && maxClosedLoadMl > 0 && params.hotWaterMl > maxClosedLoadMl + 1;
  const status: SwitchStepValidation['status'] = unsafeStepIds.length > 0 || fullImmersionOverCapacity
    ? 'blocked'
    : maxClosedLoadMl > 0 && peakClosedLoadMl > maxClosedLoadMl * 0.9
      ? 'caution'
      : 'safe';
  const message = status === 'blocked'
    ? `Puncak muatan ruang tertutup ${Math.round(Math.max(peakClosedLoadMl, params.hotWaterMl))} ml melebihi batas aman ${Math.round(maxClosedLoadMl)} ml. Gunakan Switch 03, Mode V60, atau hybrid konservatif.`
    : status === 'caution'
      ? `Puncak muatan ruang tertutup ${Math.round(peakClosedLoadMl)} ml mendekati batas aman ${Math.round(maxClosedLoadMl)} ml. Buka katup sebelum bed mulai macet.`
      : `Puncak muatan ruang tertutup ${Math.round(peakClosedLoadMl)} ml masih aman di bawah batas ${Math.round(maxClosedLoadMl)} ml.`;
  return {
    status,
    maxClosedLoadMl,
    peakClosedLoadMl: Math.round(peakClosedLoadMl),
    unsafeStepIds,
    message,
    suggestedPresetId: status === 'blocked' ? params.suggestedPresetId : undefined,
  };
}

export function adjustScoresForSwitchPreset(
  shift: SwitchExpectedCupShift | undefined,
  scores: {
    acidity: number;
    sweetness: number;
    body: number;
    clarity: number;
    bitterRisk: number;
    aromaIntensity: number;
  },
) {
  if (!shift) return scores;
  return {
    acidity: clamp(scores.acidity + (shift.acidity || 0), 1, 5),
    sweetness: clamp(scores.sweetness + (shift.sweetness || 0), 1, 5),
    body: clamp(scores.body + (shift.body || 0), 1, 5),
    clarity: clamp(scores.clarity + (shift.clarity || 0), 1, 5),
    bitterRisk: clamp(scores.bitterRisk + (shift.bitterRisk || 0), 1, 5),
    aromaIntensity: clamp(scores.aromaIntensity + (shift.aromaIntensity || 0), 1, 5),
  };
}
