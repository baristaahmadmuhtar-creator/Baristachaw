import type {
  AiBrewCatalog,
  AiBrewMethodFamily,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  GrinderSettingReference,
  GrinderWarningSeverity,
} from './types.ts';

export type GrindSizeCompatibilityState = 'compatible' | 'caution' | 'not_recommended' | 'unsupported';

export interface GrindSizeCompatibility {
  state: GrindSizeCompatibilityState;
  selectable: boolean;
  reason: string;
  tags?: string[];
}

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

export const ESPRESSO_READY_HINTS = [
  /\bencore\s*esp\b/i,
  /\bj[-\s]?ultra\b/i,
  /\bj[-\s]?max\b/i,
  /\bjx[-\s]?pro\b/i,
  /\bkingrinder\s*k4\b/i,
  /\bkinu\b/i,
  /\bm47\b/i,
  /\bbreville\s*smart\s*grinder\s*pro\b/i,
  /\bvaria\s*vs3\b/i,
  /\bfellow\s*opus\b/i,
  /\bmazzer\b/i,
  /\bomega\b/i,
  /\btimemore\s*c3\s*esp\b/i,
  /\btimemore\s*c5\s*esp\b/i,
  /\bs3\s*esp\b/i,
];

export const ESPRESSO_NOT_RECOMMENDED_HINTS = [
  /\btimemore\s*c2\b/i,
  /\btimemore\s*c3\b(?!\s*esp)/i,
  /\btimemore\s*s3\b(?!\s*esp)/i,
  /\bfellow\s*ode\b/i,
  /\bbaratza\s*encore\b(?!\s*esp)/i,
  /\bfeima\b/i,
  /\b600n\b/i,
  /\blatina\b/i,
  /\bflying\s*eagle\b/i,
  /\bmurane\b/i,
  /\bfomac\b/i,
  /\bkova\b/i,
  /\bhario\b/i,
  /\bporlex\b/i,
  /\bq\s*air\b/i,
  /\bq2\b/i,
  /\bzp6\b/i,
  /\bsculptor\s*078\b(?!\s*s)/i,
  /\bbrew[-\s]?focused\b/i,
  /\bunknown\s+manual\b/i,
  /\bunknown\s+electric\b/i,
  /\bfallback\s+manual\b/i,
  /\bfallback\s+electric\b/i,
  /\bmanual\s+calibration\b/i,
];

export function grinderHaystack(grinder: EquipmentCatalogEntry) {
  return [
    grinder.id,
    grinder.name,
    grinder.brand,
    grinder.typeLabel,
    grinder.description,
    grinder.searchText,
    grinder.grindBands?.fine,
    grinder.grindBands?.medium,
    grinder.grindBands?.coarse,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
}

export function hasAnyPattern(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

export function isEspressoBlockedGrinder(grinder: EquipmentCatalogEntry): boolean {
  if (grinder.grinderDriveType === 'unknown') return true;
  const hasFine = Boolean(grinder.grindBands?.fine?.trim());
  if (!hasFine) return true;
  const haystack = grinderHaystack(grinder);
  return hasAnyPattern(haystack, ESPRESSO_NOT_RECOMMENDED_HINTS);
}

export function isEspressoReadyGrinder(grinder: EquipmentCatalogEntry, settings: GrinderSettingReference[] = []): boolean {
  if (isEspressoBlockedGrinder(grinder)) return false;
  const haystack = grinderHaystack(grinder);
  const hasFine = Boolean(grinder.grindBands?.fine?.trim());
  if (!hasFine) return false;
  
  const exactSettingExists = settings.some(
    (setting) => setting.grinderId === grinder.id && !setting.calibrationRequired && setting.profileIds.length > 0
  );
  
  return hasAnyPattern(haystack, ESPRESSO_READY_HINTS) || exactSettingExists;
}

export function getMethodRequiredBand(methodFamily: AiBrewMethodFamily): ('fine' | 'medium' | 'coarse')[] {
  switch (methodFamily) {
    case 'espresso':
    case 'moka_pot':
      return ['fine'];
    case 'cold_brew':
    case 'french_press':
    case 'chemex':
      return ['coarse'];
    case 'v60':
    case 'kalita_wave':
    case 'origami':
    case 'april':
    case 'melitta':
    case 'kono':
      return ['medium', 'fine'];
    case 'aeropress':
    case 'clever_dripper':
    case 'batch_brew':
    case 'siphon':
      return ['medium'];
    default:
      return ['medium'];
  }
}

export function getGrinderCapabilityKind(
  grinder: EquipmentCatalogEntry | undefined,
  methodFamily: AiBrewMethodFamily,
  setting?: GrinderSettingReference,
): GrindSizeCapabilityKind {
  if (!grinder) return 'select_grinder';
  const hasFine = Boolean(grinder.grindBands?.fine?.trim());
  const hasMedium = Boolean(grinder.grindBands?.medium?.trim());
  const hasCoarse = Boolean(grinder.grindBands?.coarse?.trim());
  const hasFullBand = hasFine && hasMedium && hasCoarse;
  if (methodFamily === 'espresso') {
    if (setting?.calibrationRequired) return 'espresso_baseline';
    return hasFine && !isEspressoBlockedGrinder(grinder) ? 'espresso_capable' : 'check_fine';
  }
  if (methodFamily === 'moka_pot') return hasFine ? 'moka_fine_ready' : 'moka_fine_baseline';
  if (hasFullBand) return 'wide_range';
  return 'focused_method';
}

export function getGrinderSafetyProfile(
  catalog: AiBrewCatalog,
  methodFamily: AiBrewMethodFamily,
  grinder?: EquipmentCatalogEntry,
): GrindSizeCompatibility {
  if (!grinder) {
    return {
      state: 'unsupported',
      selectable: false,
      reason: 'Pilih grinder terlebih dahulu.',
    };
  }

  const hasFine = Boolean(grinder.grindBands?.fine?.trim());
  const hasMedium = Boolean(grinder.grindBands?.medium?.trim());
  const hasCoarse = Boolean(grinder.grindBands?.coarse?.trim());
  const grinderSettings = Array.isArray(catalog.grinderSettings) ? catalog.grinderSettings : [];
  const deviceProfiles = Array.isArray(catalog.deviceProfiles) ? catalog.deviceProfiles : [];
  
  const matchingMethodSettingExists = grinderSettings.some((setting) =>
    setting.grinderId === grinder.id &&
    setting.profileIds.some((profileId) => {
      const profile = deviceProfiles.find((entry) => entry.id === profileId);
      return profile?.methodFamily === methodFamily;
    })
  );
  
  const exactSettingExists = grinderSettings.some((setting) =>
    setting.grinderId === grinder.id &&
    !setting.calibrationRequired &&
    setting.profileIds.some((profileId) => {
      const profile = deviceProfiles.find((entry) => entry.id === profileId);
      return profile?.methodFamily === methodFamily;
    })
  );

  const tags = grinder.safetyTags || [];

  if (grinder.avoidMethodFamilies?.includes(methodFamily) || (methodFamily === 'espresso' && isEspressoBlockedGrinder(grinder))) {
    return {
      state: 'not_recommended',
      selectable: false,
      reason: methodFamily === 'espresso'
        ? 'Tidak disarankan untuk espresso: grinder ini belum punya fine range atau kalibrasi espresso yang aman. Pilih grinder espresso-capable atau gunakan Moka Pot, AeroPress pekat, atau filter kuat.'
        : `Tidak disarankan untuk metode ${methodFamily}.`,
      tags,
    };
  }

  if (methodFamily === 'espresso') {
    if (grinder.idealMethodFamilies?.includes('espresso') || isEspressoReadyGrinder(grinder, grinderSettings) || exactSettingExists) {
      return {
        state: 'compatible',
        selectable: true,
        reason: 'Cocok sebagai starting point espresso, tetap wajib dial-in shot nyata.',
        tags,
      };
    }
    return {
      state: 'caution',
      selectable: true,
      reason: 'Hati-hati untuk espresso: fine range ada, tetapi titik nol dan performa shot wajib dikalibrasi.',
      tags,
    };
  }

  if ((methodFamily === 'cold_brew' || methodFamily === 'french_press') && !hasCoarse) {
    return {
      state: 'caution',
      selectable: true,
      reason: 'Metode kasar butuh kalibrasi karena katalog grinder ini belum punya rentang coarse yang jelas.',
      tags,
    };
  }

  if ((methodFamily === 'v60' || methodFamily === 'chemex' || methodFamily === 'kalita_wave') && !hasMedium && !hasFine) {
    return {
      state: 'caution',
      selectable: true,
      reason: 'Metode filter butuh kalibrasi karena rentang medium/fine belum lengkap.',
      tags,
    };
  }

  return {
    state: exactSettingExists || matchingMethodSettingExists || grinder.idealMethodFamilies?.includes(methodFamily) ? 'compatible' : 'caution',
    selectable: true,
    reason: exactSettingExists || grinder.idealMethodFamilies?.includes(methodFamily)
      ? 'Cocok dengan referensi metode di katalog.'
      : matchingMethodSettingExists
        ? 'Cocok sebagai baseline master table; tetap dial-in dari rasa seduhan pertama.'
        : 'Bisa dipakai sebagai baseline, tetapi tetap butuh koreksi dari rasa.',
    tags,
  };
}

export function buildGrinderSafetyWarning(params: {
  methodFamily: AiBrewMethodFamily;
  setting?: GrinderSettingReference;
  deviceProfile?: DeviceBrewProfile;
}): { warning: string; warningKind: GrindSizeWarningKind; severity: GrinderWarningSeverity } | undefined {
  if (!params.setting) {
    return {
      warning: 'Belum ada referensi spesifik grinder ini untuk metode tersebut. Gunakan rentang alat sebagai titik awal dan koreksi dari rasa.',
      warningKind: 'no_reference',
      severity: 'caution',
    };
  }
  if (params.methodFamily === 'espresso' && params.setting.calibrationRequired) {
    return {
      warning: 'Untuk espresso, validasi dengan dose, yield, shot time, pressure, umur biji, dan rasa. Jangan hanya mengikuti angka grinder.',
      warningKind: 'espresso_calibration',
      severity: 'caution',
    };
  }
  if (params.setting.calibrationRequired) {
    return {
      warning: 'Angka ini baseline terkalibrasi, bukan jaminan hasil. Kalibrasi titik nol, timbang dose/yield, lalu koreksi 1–2 klik atau 0.5 step dari rasa.',
      warningKind: 'calibration_required',
      severity: 'info',
    };
  }
  if (params.deviceProfile?.brewMode === 'iced') {
    return {
      warning: 'Untuk seduh es, mulai sedikit lebih halus daripada hot brew, tapi jangan ubah grind, air panas, dan es sekaligus.',
      warningKind: 'iced_adjustment',
      severity: 'info',
    };
  }
  return undefined;
}

export function getGeneralSafetyWarnings(grinder?: EquipmentCatalogEntry): string[] {
  const warnings: string[] = [];
  if (!grinder) return warnings;
  
  if (grinder.grinderDriveType === 'electric') {
    warnings.push('Untuk electric grinder, ubah setting saat motor berjalan jika manual alat menyarankan. Jangan paksa burr ketika tersumbat.');
  } else if (grinder.grinderDriveType === 'hand') {
    warnings.push('Untuk hand grinder, jangan mengencangkan melewati burr touch. Bersihkan burr jika terasa macet atau klik tidak konsisten.');
  }
  
  warnings.push('Titik nol grinder belum dikonfirmasi. Setting bisa bergeser antar unit; cari burr touch/true zero sebelum mengandalkan angka.');
  
  return warnings;
}
