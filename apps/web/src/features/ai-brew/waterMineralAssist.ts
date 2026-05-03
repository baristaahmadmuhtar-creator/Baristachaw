import type { WaterBrandProfile, WaterGuidance } from './types.ts';

export type AiWaterMineralAssistConfidence = 'medium' | 'low';

export type AiWaterMineralAssistMode =
  | 'source_backed_manual'
  | 'estimated_baseline'
  | 'remineralization_target';

export interface AiWaterMineralAssistResult {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
  confidence: AiWaterMineralAssistConfidence;
  mode: AiWaterMineralAssistMode;
  note: string;
  warnings: string[];
}

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

function hasVeryLowMinerals(waterBrand: WaterBrandProfile) {
  const minerals = waterBrand.resolvedMinerals;
  const tds = minerals?.tdsPpm ?? waterBrand.chemistry.tdsPpm;
  const hardness = minerals?.hardnessPpm ?? waterBrand.chemistry.hardnessPpm;
  const alkalinity = minerals?.alkalinityPpm ?? waterBrand.chemistry.alkalinityPpm;

  return (
    waterBrand.classification === 'zero_mineral_ro'
    || (Number.isFinite(tds) && Number(tds) <= 20)
    || (Number.isFinite(hardness) && Number(hardness) <= 15)
    || (Number.isFinite(alkalinity) && Number(alkalinity) <= 10)
  );
}

function buildAssistWarnings(waterBrand: WaterBrandProfile, language?: string) {
  const id = isIndonesian(language);
  const warnings = new Set<string>();

  if (waterBrand.resolvedMinerals?.derivation === 'estimated_from_classification') {
    warnings.add(id
      ? 'Nilai ini estimasi terkurasi; verifikasi label/lab jika tersedia.'
      : 'These values are curated estimates; verify label/lab data when available.');
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
  if (!waterBrand.sourceUrls.length) {
    warnings.add(id
      ? 'Belum ada URL sumber publik penuh untuk mineral brand ini.'
      : 'This brand does not yet have a complete public source URL for minerals.');
  }

  return Array.from(warnings);
}

export function resolveAiWaterMineralAssist(params: {
  waterBrand: WaterBrandProfile;
  guidance: WaterGuidance;
  language?: string;
}): AiWaterMineralAssistResult {
  const { waterBrand, guidance, language } = params;
  const id = isIndonesian(language);
  const guidanceTarget = buildGuidanceTarget(guidance);

  if (hasVeryLowMinerals(waterBrand)) {
    return {
      ...guidanceTarget,
      confidence: 'low',
      mode: 'remineralization_target',
      note: id
        ? 'AI memakai air ini sebagai base RO/low-mineral. Angka ini target remineralisasi untuk seduh, bukan klaim mineral asli pada label.'
        : 'AI treats this as an RO/low-mineral base. These values are a remineralization target for brewing, not a claim about the original label minerals.',
      warnings: [
        id
          ? 'Air terlalu rendah mineral untuk autofill siap seduh; tambahkan mineral manual atau pakai baseline ini sebagai target.'
          : 'This water is too low-mineral for ready-brew autofill; add minerals manually or use this baseline as the target.',
        ...buildAssistWarnings(waterBrand, language),
      ],
    };
  }

  const resolved = waterBrand.resolvedMinerals;
  if (resolved) {
    const isEstimated = resolved.derivation === 'estimated_from_classification';
    return {
      tdsPpm: sanitizeMineral(resolved.tdsPpm, guidanceTarget.tdsPpm, 1, 600),
      hardnessPpm: sanitizeMineral(resolved.hardnessPpm, guidanceTarget.hardnessPpm, 0, 500),
      alkalinityPpm: sanitizeMineral(resolved.alkalinityPpm, guidanceTarget.alkalinityPpm, 0, 400),
      confidence: isEstimated ? 'low' : 'medium',
      mode: isEstimated ? 'estimated_baseline' : 'source_backed_manual',
      note: isEstimated
        ? (id
          ? 'AI mengisi baseline dari klasifikasi air. Ini membantu pemula generate, tetapi tetap perlu verifikasi manual.'
          : 'AI filled a baseline from the water classification. This helps beginners generate, but still needs manual verification.')
        : (id
          ? 'AI memakai mineral yang tersedia di katalog sebagai input manual terkontrol.'
          : 'AI used the available catalog minerals as a controlled manual input.'),
      warnings: buildAssistWarnings(waterBrand, language),
    };
  }

  return {
    ...guidanceTarget,
    confidence: 'low',
    mode: 'estimated_baseline',
    note: id
      ? 'AI mengisi target mineral konservatif karena panel mineral brand belum lengkap.'
      : 'AI filled a conservative mineral target because the brand mineral panel is incomplete.',
    warnings: [
      id
        ? 'Baseline ini bukan klaim resmi brand; verifikasi label/lab saat tersedia.'
        : 'This baseline is not an official brand claim; verify label/lab data when available.',
      ...buildAssistWarnings(waterBrand, language),
    ],
  };
}
