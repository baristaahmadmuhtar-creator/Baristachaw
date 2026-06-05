import type { WaterBrandProfile, WaterClassification, WaterGuidance } from './types.ts';

export type WaterMineralCompletionConfidence = 'medium' | 'low';

export type WaterMineralCompletionMode =
  | 'source_backed_manual'
  | 'classification_baseline'
  | 'partial_profile_completion'
  | 'remineralization_target';

export interface WaterMineralCompletionResult {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
  confidence: WaterMineralCompletionConfidence;
  mode: WaterMineralCompletionMode;
  note: string;
  warnings: string[];
}

const CLASSIFICATION_BASELINES: Record<WaterClassification, {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
}> = {
  balanced: { tdsPpm: 105, hardnessPpm: 58, alkalinityPpm: 42 },
  low_mineral: { tdsPpm: 28, hardnessPpm: 20, alkalinityPpm: 16 },
  soft_low_buffer: { tdsPpm: 65, hardnessPpm: 32, alkalinityPpm: 24 },
  moderate: { tdsPpm: 110, hardnessPpm: 58, alkalinityPpm: 42 },
  moderate_upper_buffered: { tdsPpm: 130, hardnessPpm: 62, alkalinityPpm: 62 },
  hard_mineral: { tdsPpm: 190, hardnessPpm: 125, alkalinityPpm: 70 },
  high_tds: { tdsPpm: 240, hardnessPpm: 95, alkalinityPpm: 75 },
  blocked_unsuitable: { tdsPpm: 300, hardnessPpm: 160, alkalinityPpm: 130 },
  soft_balanced: { tdsPpm: 90, hardnessPpm: 48, alkalinityPpm: 34 },
  body_builder: { tdsPpm: 120, hardnessPpm: 70, alkalinityPpm: 48 },
  high_buffer: { tdsPpm: 145, hardnessPpm: 58, alkalinityPpm: 82 },
  alkaline_caution: { tdsPpm: 90, hardnessPpm: 45, alkalinityPpm: 28 },
  low_mineral_clarity: { tdsPpm: 20, hardnessPpm: 12, alkalinityPpm: 10 },
  demineral_direct_experiment: { tdsPpm: 95, hardnessPpm: 55, alkalinityPpm: 38 },
  zero_mineral_ro: { tdsPpm: 95, hardnessPpm: 55, alkalinityPpm: 38 },
  manual_required: { tdsPpm: 105, hardnessPpm: 55, alkalinityPpm: 40 },
};

function isIndonesian(language?: string) {
  return String(language || '').toLowerCase().startsWith('id');
}

function midpoint(range: [number, number]) {
  return (range[0] + range[1]) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMineral(value: number) {
  return Math.round(value * 10) / 10;
}

function sanitizeMineral(value: number | undefined | null, fallback: number, min: number, max: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) return roundMineral(clamp(fallback, min, max));
  return roundMineral(clamp(next, min, max));
}

function buildGuidanceTarget(guidance: WaterGuidance) {
  return {
    tdsPpm: sanitizeMineral(midpoint(guidance.recommended.tdsPpm), 95, 70, 120),
    hardnessPpm: sanitizeMineral(midpoint(guidance.recommended.hardnessPpm), 55, 45, 70),
    alkalinityPpm: sanitizeMineral(midpoint(guidance.recommended.alkalinityPpm), 38, 30, 50),
  };
}

function tuneForTarget(
  base: { tdsPpm: number; hardnessPpm: number; alkalinityPpm: number },
  targetProfileId?: string,
) {
  const target = String(targetProfileId || '').toLowerCase();
  if (target.includes('body')) {
    return {
      tdsPpm: base.tdsPpm + 10,
      hardnessPpm: base.hardnessPpm + 8,
      alkalinityPpm: base.alkalinityPpm + 4,
    };
  }
  if (target.includes('acid')) {
    return {
      tdsPpm: base.tdsPpm - 8,
      hardnessPpm: base.hardnessPpm - 6,
      alkalinityPpm: base.alkalinityPpm - 8,
    };
  }
  if (target.includes('sweet')) {
    return {
      tdsPpm: base.tdsPpm + 4,
      hardnessPpm: base.hardnessPpm + 5,
      alkalinityPpm: base.alkalinityPpm,
    };
  }
  return base;
}

function buildClassificationTarget(
  waterBrand: WaterBrandProfile,
  guidance: WaterGuidance,
  targetProfileId?: string,
) {
  const baseline = waterBrand.classification === 'zero_mineral_ro' || waterBrand.classification === 'demineral_direct_experiment'
    ? buildGuidanceTarget(guidance)
    : CLASSIFICATION_BASELINES[waterBrand.classification] || CLASSIFICATION_BASELINES.manual_required;
  const tuned = tuneForTarget(baseline, targetProfileId);
  return {
    tdsPpm: sanitizeMineral(tuned.tdsPpm, baseline.tdsPpm, 1, 600),
    hardnessPpm: sanitizeMineral(tuned.hardnessPpm, baseline.hardnessPpm, 0, 500),
    alkalinityPpm: sanitizeMineral(tuned.alkalinityPpm, baseline.alkalinityPpm, 0, 400),
  };
}

function hasVeryLowMinerals(waterBrand: WaterBrandProfile) {
  const minerals = waterBrand.resolvedMinerals;
  const tds = minerals?.tdsPpm ?? waterBrand.chemistry.tdsPpm;
  const hardness = minerals?.hardnessPpm ?? waterBrand.chemistry.hardnessPpm;
  const alkalinity = minerals?.alkalinityPpm ?? waterBrand.chemistry.alkalinityPpm;

  if (waterBrand.classification === 'low_mineral_clarity') return false;

  return (
    waterBrand.classification === 'zero_mineral_ro'
    || waterBrand.classification === 'demineral_direct_experiment'
    || (Number.isFinite(tds) && Number(tds) <= 20)
    || (Number.isFinite(hardness) && Number(hardness) <= 15)
    || (Number.isFinite(alkalinity) && Number(alkalinity) <= 10)
  );
}

function buildCompletionWarnings(waterBrand: WaterBrandProfile, language?: string) {
  const id = isIndonesian(language);
  const warnings = new Set<string>();

  if (waterBrand.resolvedMinerals?.derivation === 'estimated_from_classification') {
    warnings.add(id
      ? 'Nilai estimasi terkurasi; verifikasi label/lab jika tersedia.'
      : 'Curated estimate; verify label/lab data when available.');
  }
  if (waterBrand.classification === 'high_buffer') {
    warnings.add(id
      ? 'Buffer tinggi bisa meredam acidity dan kopi floral.'
      : 'High buffer can mute acidity and flatten floral coffees.');
  }
  if (waterBrand.classification === 'alkaline_caution') {
    warnings.add(id
      ? 'Air alkaline bisa meredam acidity; gunakan sebagai baseline hati-hati.'
      : 'Alkaline water can mute acidity; use this as a cautious baseline.');
  }
  if (waterBrand.classification === 'low_mineral_clarity') {
    warnings.add(id
      ? 'Air sangat rendah mineral bisa terasa clean, tetapi body dapat tipis dan acidity lebih tajam.'
      : 'Very low-mineral water can taste clean, but body may be thin and acidity sharper.');
  }
  if (waterBrand.classification === 'demineral_direct_experiment') {
    warnings.add(id
      ? 'Direct brew dengan air demineral adalah eksperimen; remineralisasi memberi body dan sweetness lebih stabil.'
      : 'Direct brewing with demineral water is experimental; remineralization gives more stable body and sweetness.');
  }
  if (!waterBrand.sourceUrls.length) {
    warnings.add(id
      ? 'Belum ada URL sumber publik penuh untuk mineral brand ini.'
      : 'This brand does not yet have a complete public source URL for minerals.');
  }

  return Array.from(warnings);
}

export function resolveWaterMineralCompletion(params: {
  waterBrand: WaterBrandProfile;
  guidance: WaterGuidance;
  language?: string;
  targetProfileId?: string;
}): WaterMineralCompletionResult {
  const { waterBrand, guidance, language, targetProfileId } = params;
  const id = isIndonesian(language);
  const classificationTarget = buildClassificationTarget(waterBrand, guidance, targetProfileId);

  if (hasVeryLowMinerals(waterBrand)) {
    return {
      ...classificationTarget,
      confidence: 'low',
      mode: 'remineralization_target',
      note: id
        ? 'Air ini terlalu rendah mineral untuk dipakai langsung. Angka ini adalah target remineralisasi untuk seduh, bukan profil mineral asli label.'
        : 'This water is too low-mineral to use directly. These values are a remineralization target for brewing, not the original label profile.',
      warnings: [
        id
          ? 'Pakai air ini sebagai base RO/low-mineral, lalu tambahkan mineral atau gunakan baseline target ini.'
          : 'Use this as an RO/low-mineral base, then add minerals or use this target baseline.',
        ...buildCompletionWarnings(waterBrand, language),
      ],
    };
  }

  const resolved = waterBrand.resolvedMinerals;
  if (resolved) {
    const isEstimated = resolved.derivation === 'estimated_from_classification';
    return {
      tdsPpm: sanitizeMineral(resolved.tdsPpm, classificationTarget.tdsPpm, 1, 600),
      hardnessPpm: sanitizeMineral(resolved.hardnessPpm, classificationTarget.hardnessPpm, 0, 500),
      alkalinityPpm: sanitizeMineral(resolved.alkalinityPpm, classificationTarget.alkalinityPpm, 0, 400),
      confidence: isEstimated ? 'low' : 'medium',
      mode: isEstimated ? 'classification_baseline' : 'source_backed_manual',
      note: isEstimated
        ? (id
          ? 'Mineral dilengkapi dari baseline klasifikasi. Ini membantu generate, tetapi tetap perlu verifikasi manual.'
          : 'Minerals were completed from a classification baseline. This enables generation, but still needs manual verification.')
        : (id
          ? 'Mineral tersedia di katalog dan dipakai sebagai input manual terkontrol.'
          : 'Catalog minerals are available and used as a controlled manual input.'),
      warnings: buildCompletionWarnings(waterBrand, language),
    };
  }

  const hasPartialChemistry = [
    waterBrand.chemistry.tdsPpm,
    waterBrand.chemistry.hardnessPpm,
    waterBrand.chemistry.alkalinityPpm,
  ].some((value) => Number.isFinite(Number(value)));

  return {
    tdsPpm: sanitizeMineral(waterBrand.chemistry.tdsPpm, classificationTarget.tdsPpm, 1, 600),
    hardnessPpm: sanitizeMineral(waterBrand.chemistry.hardnessPpm, classificationTarget.hardnessPpm, 0, 500),
    alkalinityPpm: sanitizeMineral(waterBrand.chemistry.alkalinityPpm, classificationTarget.alkalinityPpm, 0, 400),
    confidence: 'low',
    mode: hasPartialChemistry ? 'partial_profile_completion' : 'classification_baseline',
    note: hasPartialChemistry
      ? (id
        ? 'Field mineral yang kosong dilengkapi dari klasifikasi air dan field yang sudah tersedia.'
        : 'Missing mineral fields were completed from the water classification and available fields.')
      : (id
        ? 'Panel mineral brand belum lengkap, jadi dipakai baseline klasifikasi yang konservatif.'
        : 'The brand mineral panel is incomplete, so a conservative classification baseline is used.'),
    warnings: [
      id
        ? 'Baseline ini bukan klaim resmi brand; verifikasi label/lab saat tersedia.'
        : 'This baseline is not an official brand claim; verify label/lab data when available.',
      ...buildCompletionWarnings(waterBrand, language),
    ],
  };
}
