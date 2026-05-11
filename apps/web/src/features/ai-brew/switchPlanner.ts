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
  const heavyBody = preset.id === 'immersion_heavy_body';
  return [
    step({
      id: 'switch_closed_bloom',
      label: 'Closed bloom',
      kind: 'pour',
      share: heavyBody ? 0.26 : 0.22,
      startSeconds: 0,
      note: heavyBody
        ? 'Katup tertutup. Bloom tenang sampai bed basah penuh; jangan swirl keras.'
        : 'Katup tertutup. Bloom 2-3x dosis dengan tuang lembut untuk sweetness.',
      valveState: 'closed',
      chamberState: 'bloom',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_closed_fill',
      label: heavyBody ? 'Body fill' : 'Sweet fill',
      kind: 'pour',
      share: heavyBody ? 0.74 : 0.78,
      startSeconds: heavyBody ? 0.24 : 0.22,
      note: heavyBody
        ? 'Masih tertutup. Isi sisa air dengan aliran rendah agar body naik tanpa lumpur.'
        : 'Masih tertutup. Isi sisa air dengan tenang; targetnya manis dan bulat.',
      valveState: 'closed',
      chamberState: 'filling',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_closed_contact',
      label: 'Closed contact',
      kind: 'wait',
      share: 0,
      startSeconds: heavyBody ? 0.66 : 0.58,
      note: heavyBody
        ? 'Tahan kontak sedikit lebih lama; buka sebelum finish mulai kering atau berat.'
        : 'Tahan kontak singkat; buka sebelum rasa jadi datar.',
      valveState: 'closed',
      chamberState: 'immersion',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_release',
      label: 'Release',
      kind: 'release',
      share: 0,
      startSeconds: heavyBody ? 0.82 : 0.76,
      note: heavyBody
        ? 'Buka katup dan biarkan release bersih; jangan tambah agitasi.'
        : 'Buka katup saat sweetness sudah cukup, lalu biarkan drain bersih.',
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
      note: heavyBody
        ? 'Angkat dripper saat flow selesai; aduk server singkat dan cek risiko muddy.'
        : 'Angkat dripper saat flow selesai dan aduk server 5-8 detik.',
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
      share: 0.25,
      startSeconds: 0,
      note: 'Katup tertutup. Bloom tenang untuk sweetness awal tanpa over-agitasi.',
      valveState: 'closed',
      chamberState: 'bloom',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_closed_sweeten',
      label: 'Closed sweeten',
      kind: 'pour',
      share: 0.42,
      startSeconds: 0.28,
      note: 'Masih tertutup. Bangun sweetness sampai muatan ruang aman, lalu siap release.',
      valveState: 'closed',
      chamberState: 'immersion',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_release_checkpoint',
      label: 'Release checkpoint',
      kind: 'release',
      share: 0,
      startSeconds: 0.58,
      note: 'Buka katup sebelum bed terasa berat; ini menjaga finish tetap bersih.',
      valveState: 'open',
      chamberState: 'releasing',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_open_finish',
      label: 'Open finish',
      kind: 'pour',
      share: 0.33,
      startSeconds: 0.66,
      note: 'Katup terbuka. Selesaikan target dengan aliran pusat-ke-tengah yang bersih.',
      valveState: 'open',
      chamberState: 'percolation',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_drawdown',
      label: 'Drawdown',
      kind: 'drawdown',
      share: 0,
      startSeconds: 0.88,
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

function brightHybridSteps(preset: SwitchPublicPreset): BrewTemplateStep[] {
  const programme = preset.defaultProgramme;
  return [
    step({
      id: 'switch_open_bloom',
      label: 'Open bloom',
      kind: 'pour',
      share: 0.32,
      startSeconds: 0,
      note: 'Katup terbuka. Bloom bersih, rendah, dan tanpa wall-rinse agar floral tetap jelas.',
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
      note: 'Tetap terbuka. Bangun target air dengan flow stabil dan agitasi minimal.',
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
      note: 'Tutup sebentar hanya untuk menangkap sweetness akhir; jangan tahan terlalu lama.',
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
      note: 'Buka katup sebelum body menutup acidity atau aroma.',
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
      id: 'switch_iced_bloom',
      label: 'Closed iced bloom',
      kind: 'pour',
      share: 0.35,
      startSeconds: 0,
      note: 'Katup tertutup. Bloom konsentrat panas; es sudah ditimbang di server.',
      valveState: 'closed',
      chamberState: 'bloom',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_iced_hot_fill',
      label: 'Closed hot fill',
      kind: 'pour',
      share: 0.65,
      startSeconds: 0.35,
      note: 'Masih tertutup. Isi target air panas saja; jangan tambah bypass tersembunyi.',
      valveState: 'closed',
      chamberState: 'filling',
      switchProgramme: programme,
    }),
    step({
      id: 'switch_iced_contact',
      label: 'Short hot contact',
      kind: 'wait',
      share: 0,
      startSeconds: 0.58,
      note: 'Tahan singkat untuk sweetness; target akhir tetap hot water + es.',
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
      note: 'Buka katup dan release konsentrat panas langsung ke es di server.',
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
