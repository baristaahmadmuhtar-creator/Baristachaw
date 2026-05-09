import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  SwitchCompatibilityState,
  SwitchDoseMatrixRow,
  SwitchExpectedCupShift,
  SwitchPublicPreset,
  SwitchPublicPresetId,
  SwitchTeachingMode,
  TargetProfile,
} from './types.ts';

const SWITCH_EXACT_IDS = new Set(['hario-switch-02', 'hario-switch-03', 'mugen-x-switch']);
const SWITCH_LEGACY_IDS = new Set(['hario-switch']);
const SWITCH_DOSE_CHIPS = [10, 12, 15, 18, 20];

export interface SwitchPlanSelection {
  preset: SwitchPublicPreset;
  doseRow?: SwitchDoseMatrixRow;
  compatibility: SwitchCompatibilityState;
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
  return /body|dense|comfort|round/.test(haystack);
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

function isHeavyProcess(processEntry?: ProcessCatalogEntry) {
  const haystack = `${processEntry?.id || ''} ${processEntry?.label || ''}`.toLowerCase();
  return /natural|wet|hulled|giling|anaerobic/.test(haystack);
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
  if (dripperId === 'mugen-x-switch') return 'mugen_everyday_hybrid' satisfies SwitchPublicPresetId;
  if (isBrightTarget(targetProfile)) return 'hybrid_bright_clean' satisfies SwitchPublicPresetId;
  if (isBodyTarget(targetProfile) || isHeavyProcess(processEntry)) {
    return doseRow?.blockedPresetIds.includes('immersion_heavy_body')
      ? 'hybrid_balanced'
      : 'immersion_heavy_body';
  }
  if (isSweetTarget(targetProfile)) {
    return doseRow?.blockedPresetIds.includes('immersion_sweet')
      ? 'hybrid_balanced'
      : 'immersion_sweet';
  }
  return 'hybrid_balanced' satisfies SwitchPublicPresetId;
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
  const candidateId = explicitId || chooseAutoPresetId(params);
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
  const doseLabel = row ? `${row.doseG} g` : 'Dose belum dipetakan';
  if (!row) {
    return {
      status: 'caution',
      sizeLabel,
      doseLabel,
      message: `${sizeLabel} belum punya baris dose matrix untuk dosis ini; gunakan sebagai titik awal konservatif.`,
      compatiblePresetIds: [preset.id],
    };
  }
  if (row.blockedPresetIds.includes(preset.id)) {
    return {
      status: 'blocked',
      sizeLabel,
      doseLabel,
      message: `${preset.label} tidak aman untuk ${sizeLabel} ${doseLabel}: muatan ruang tertutup melewati batas aman ${row.safeClosedPhaseMaxMl} ml.`,
      compatiblePresetIds: row.recommendedPresetIds,
    };
  }
  if (row.cautionPresetIds.includes(preset.id)) {
    return {
      status: 'caution',
      sizeLabel,
      doseLabel,
      message: `${preset.label} bisa dipakai untuk ${sizeLabel} ${doseLabel}, tetapi jaga muatan ruang di bawah ${row.safeClosedPhaseMaxMl} ml dan buka lebih awal jika flow melambat.`,
      compatiblePresetIds: row.recommendedPresetIds,
    };
  }
  return {
    status: 'safe',
    sizeLabel,
    doseLabel,
    message: `${preset.label} aman untuk ${sizeLabel} ${doseLabel}; batas muatan ruang ${row.safeClosedPhaseMaxMl} ml.`,
    compatiblePresetIds: row.recommendedPresetIds,
  };
}

function step(params: BrewTemplateStep): BrewTemplateStep {
  return params;
}

function fullImmersionSteps(preset: SwitchPublicPreset): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  return [
    step({
      id: 'switch_charge_closed',
      label: 'Closed charge',
      kind: 'pour',
      share: 1,
      startSeconds: 0,
      note: 'Katup tertutup. Tuang semua air panas yang direncanakan dengan agitasi rendah.',
      valveState: 'closed',
      chamberState: 'filling',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_closed_contact',
      label: 'Closed contact',
      kind: 'wait',
      share: 0,
      startSeconds: 0.55,
      note: 'Tahan kontak dengan slurry tenang; jangan swirl keras.',
      valveState: 'closed',
      chamberState: 'immersion',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_release',
      label: 'Release',
      kind: 'release',
      share: 0,
      startSeconds: 0.78,
      note: 'Buka katup dan biarkan release bersih.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: 1,
      note: 'Angkat dripper saat flow selesai dan aduk server singkat.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function balancedHybridSteps(preset: SwitchPublicPreset, row?: SwitchDoseMatrixRow): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  const smallChamber = row ? row.defaultTotalWaterMl > row.safeClosedPhaseMaxMl : false;
  if (smallChamber) {
    return [
      step({
        id: 'switch_closed_bloom',
        label: 'Closed bloom',
        kind: 'pour',
        share: 0.38,
        startSeconds: 0,
        note: 'Katup tertutup. Basahi semua kopi untuk menangkap sweetness awal.',
        valveState: 'closed',
        chamberState: 'bloom',
        switchProgramme: programme,
      }),
      step({
        id: 'switch_release_checkpoint',
        label: 'Release checkpoint',
        kind: 'release',
        share: 0,
        startSeconds: 0.26,
        note: 'Buka katup sebelum muatan ruang melewati batas aman.',
        valveState: 'open',
        chamberState: 'releasing',
        switchProgramme: programme,
      }),
      step({
        id: 'switch_open_fill',
        label: 'Open fill',
        kind: 'pour',
        share: 0.62,
        startSeconds: 0.36,
        note: 'Katup terbuka. Lanjutkan isi target dengan aliran tenang.',
        valveState: 'open',
        chamberState: 'percolation',
        switchProgramme: programme,
      }),
      step({
        id: 'switch_drawdown',
        label: 'Drawdown',
        kind: 'drawdown',
        share: 0,
        startSeconds: 0.82,
        note: 'Biarkan drawdown selesai tanpa swirl berat.',
        valveState: 'open',
        chamberState: 'drawdown',
        switchProgramme: programme,
      }),
      step({
        id: 'switch_serve',
        label: 'Serve',
        kind: 'serve',
        share: 0,
        startSeconds: 1,
        note: 'Aduk server singkat lalu sajikan.',
        valveState: 'open',
        chamberState: 'served',
        switchProgramme: programme,
      }),
    ];
  }
  return [
    step({
      id: 'switch_closed_bloom',
      label: 'Closed bloom',
      kind: 'pour',
      share: 0.35,
      startSeconds: 0,
      note: 'Katup tertutup. Basahi bed dan biarkan gas keluar.',
      valveState: 'closed',
      chamberState: 'bloom',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_closed_fill',
      label: 'Closed fill',
      kind: 'pour',
      share: 0.65,
      startSeconds: 0.30,
      note: 'Masih tertutup. Isi target dengan agitasi rendah.',
      valveState: 'closed',
      chamberState: 'filling',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_closed_contact',
      label: 'Closed contact',
      kind: 'wait',
      share: 0,
      startSeconds: 0.58,
      note: 'Tahan sebentar untuk sweetness; jangan tambah agitasi.',
      valveState: 'closed',
      chamberState: 'immersion',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_release',
      label: 'Release',
      kind: 'release',
      share: 0,
      startSeconds: 0.72,
      note: 'Buka katup saat titik release tercapai.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: 1,
      note: 'Aduk server singkat lalu sajikan.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function brightHybridSteps(preset: SwitchPublicPreset): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  return [
    step({
      id: 'switch_open_bloom',
      label: 'Open bloom',
      kind: 'pour',
      share: 0.32,
      startSeconds: 0,
      note: 'Katup terbuka. Bloom bersih dengan tuang rendah.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_open_build',
      label: 'Open build',
      kind: 'pour',
      share: 0.48,
      startSeconds: 0.30,
      note: 'Tetap terbuka untuk menjaga clarity dan flow.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_closed_capture',
      label: 'Short capture',
      kind: 'pour',
      share: 0.20,
      startSeconds: 0.62,
      note: 'Tutup katup sebentar untuk menangkap sweetness akhir.',
      valveState: 'closed',
      chamberState: 'immersion',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_release',
      label: 'Release',
      kind: 'release',
      share: 0,
      startSeconds: 0.78,
      note: 'Buka katup sebelum cup terasa berat.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: 1,
      note: 'Aduk server singkat lalu sajikan.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function v60ModeSteps(preset: SwitchPublicPreset): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  return [
    step({
      id: 'switch_v60_bloom',
      label: 'Open bloom',
      kind: 'pour',
      share: 0.30,
      startSeconds: 0,
      note: 'Katup terbuka. Perlakukan seperti Mode V60 tanpa fase immersion.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_v60_middle',
      label: 'Open middle',
      kind: 'pour',
      share: 0.42,
      startSeconds: 0.35,
      note: 'Jaga flow stabil dan jangan tutup katup.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_v60_finish',
      label: 'Open finish',
      kind: 'pour',
      share: 0.28,
      startSeconds: 0.65,
      note: 'Selesaikan target dengan jalur tuang bersih.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_v60_drawdown',
      label: 'Drawdown',
      kind: 'drawdown',
      share: 0,
      startSeconds: 0.86,
      note: 'Drawdown natural; tidak ada titik release karena katup terbuka sejak awal.',
      valveState: 'open',
      chamberState: 'drawdown',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_serve',
      label: 'Serve',
      kind: 'serve',
      share: 0,
      startSeconds: 1,
      note: 'Aduk server singkat lalu sajikan.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function icedHybridSteps(preset: SwitchPublicPreset): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  return [
    step({
      id: 'switch_iced_charge',
      label: 'Closed hot charge',
      kind: 'pour',
      share: 1,
      startSeconds: 0,
      note: 'Katup tertutup. Tuang seluruh air panas target; es sudah di server.',
      valveState: 'closed',
      chamberState: 'filling',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_iced_contact',
      label: 'Short hot contact',
      kind: 'wait',
      share: 0,
      startSeconds: 0.55,
      note: 'Tahan singkat untuk sweetness, tanpa bypass tersembunyi.',
      valveState: 'closed',
      chamberState: 'immersion',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_iced_release',
      label: 'Release over ice',
      kind: 'release',
      share: 0,
      startSeconds: 0.75,
      note: 'Buka katup dan release konsentrat panas langsung ke es.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_iced_serve',
      label: 'Stir and serve',
      kind: 'serve',
      share: 0,
      startSeconds: 1,
      note: 'Aduk 5-8 detik agar konsentrat dan es menyatu.',
      valveState: 'open',
      chamberState: 'served',
      switchProgramme: programme,
    }),
  ];
}

function stepsForPreset(preset: SwitchPublicPreset, row?: SwitchDoseMatrixRow): BrewTemplateStep[] {
  switch (preset.id) {
    case 'immersion_sweet':
    case 'immersion_heavy_body':
      return fullImmersionSteps(preset);
    case 'hybrid_bright_clean':
      return brightHybridSteps(preset);
    case 'v60_mode':
      return v60ModeSteps(preset);
    case 'iced_hybrid':
      return icedHybridSteps(preset);
    case 'mugen_everyday_hybrid':
      return balancedHybridSteps(preset, row);
    case 'hybrid_balanced':
    default:
      return balancedHybridSteps(preset, row);
  }
}

export function applySwitchPresetToDeviceProfile(
  profile: DeviceBrewProfile,
  selection: Pick<SwitchPlanSelection, 'preset' | 'doseRow'>,
): DeviceBrewProfile {
  const steps = stepsForPreset(selection.preset, selection.doseRow);
  return {
    ...profile,
    methodFamily: 'hario_switch',
    methodProgramme: selection.preset.defaultProgramme,
    note: `${profile.note} Switch preset: ${selection.preset.label}. ${selection.preset.why}`.trim(),
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
  doseG: number;
}): SwitchPlanSelection | null {
  const { input, catalog, dripper, profile, targetProfile, processEntry, doseG } = params;
  if (profile.methodFamily !== 'hario_switch' && dripper.methodFamily !== 'hario_switch') return null;
  if (!isExactHarioSwitchDripperId(dripper.id)) return null;
  const doseRow = resolveSwitchDoseRow(catalog, dripper.id, doseG);
  const preset = resolvePreset({
    input,
    catalog,
    dripperId: dripper.id,
    doseRow,
    targetProfile,
    processEntry,
  });
  if (!preset) return null;
  const compatibility = buildCompatibility(preset, doseRow, dripper);
  return {
    preset,
    doseRow,
    compatibility,
    adjustedProfile: applySwitchPresetToDeviceProfile(profile, { preset, doseRow }),
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
