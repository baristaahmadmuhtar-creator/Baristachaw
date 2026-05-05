import type {
  AiBrewFormState,
  BrewPlan,
  WaterBrandProfile,
  WaterGuidance,
  WaterMineralInput,
} from './types.ts';

function parseRequiredNumber(label: string, value: string, min: number, max: number) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} is required.`);
  if (parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return parsed;
}

export function resolveWaterAdjustmentAdvice(water: {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
}) {
  const warnings: string[] = [];
  const adjustments: string[] = [];

  if (water.hardnessPpm < 40) {
    warnings.push('Hardness air berada di bawah rentang rekomendasi.');
    adjustments.push('Naikkan suhu kecil +1°C hanya setelah tasting, atau gunakan grind sedikit lebih halus.');
  }
  if (water.alkalinityPpm < 30) {
    warnings.push('Alkalinity rendah dapat membuat acidity terasa tajam.');
    adjustments.push('Jaga agitasi tetap rapi sebelum tightening grind.');
  }
  if (water.tdsPpm < 30) {
    warnings.push('TDS sangat rendah; air ini lebih cocok sebagai base remineralisasi daripada brew-ready water.');
    adjustments.push('Pertimbangkan blend dengan air mineral lebih tinggi TDS/GH/KH.');
  }

  return { warnings, adjustments };
}

export function canUseWaterBrandAutofill(waterBrand?: WaterBrandProfile) {
  return Boolean(
    waterBrand
    && waterBrand.presetStatus === 'autofill'
    && waterBrand.isBrewReady
    && waterBrand.resolvedMinerals
    && waterBrand.resolvedMinerals.derivation !== 'estimated_from_classification',
  );
}

export function deriveWaterMineralProfile(input: AiBrewFormState, guidance: WaterGuidance, waterBrand?: WaterBrandProfile) {
  const canUseBrandPreset = input.waterMode === 'brand' && canUseWaterBrandAutofill(waterBrand);
  const presetTdsPpm = canUseBrandPreset
    ? (waterBrand?.resolvedMinerals?.tdsPpm ?? waterBrand?.chemistry.tdsPpm ?? null)
    : null;
  const presetHardnessPpm = canUseBrandPreset
    ? (waterBrand?.resolvedMinerals?.hardnessPpm ?? waterBrand?.chemistry.hardnessPpm ?? null)
    : null;
  const presetAlkalinityPpm = canUseBrandPreset
    ? (waterBrand?.resolvedMinerals?.alkalinityPpm ?? waterBrand?.chemistry.alkalinityPpm ?? null)
    : null;
  const tdsPpm = parseRequiredNumber('Water TDS', input.waterTdsPpm || String(presetTdsPpm ?? ''), 0, 600);
  const hardnessPpm = parseRequiredNumber('Water hardness', input.waterHardnessPpm || String(presetHardnessPpm ?? ''), 0, 500);
  const alkalinityPpm = parseRequiredNumber('Water alkalinity', input.waterAlkalinityPpm || String(presetAlkalinityPpm ?? ''), 0, 400);
  const mineralDerivation: NonNullable<BrewPlan['waterMineralDerivation']> = canUseBrandPreset && !input.waterCustomized
    ? waterBrand?.resolvedMinerals?.derivation || 'manual'
    : 'manual';

  let ratioDelta = 0;
  let tempDeltaC = 0;
  let brewTimeDeltaSec = 0;
  const notes: string[] = [...guidance.notes];
  const warnings: string[] = [];
  const confidenceNotes: string[] = [];

  if (input.waterMode === 'brand' && waterBrand) {
    notes.unshift(
      input.waterCustomized
        ? `${waterBrand.shortLabel} was selected as the brand baseline, then adjusted manually.`
        : `${waterBrand.shortLabel} brand water profile is active for this brew plan.`,
    );
    if (waterBrand.presetStatus !== 'autofill') {
      confidenceNotes.push(`${waterBrand.shortLabel} does not have a full autofill panel in this catalog version.`);
    }
    if (waterBrand.resolvedMinerals?.derivation === 'estimated_from_classification') {
      confidenceNotes.push(`${waterBrand.shortLabel} minerals were estimated from the water classification baseline.`);
      warnings.push(`${waterBrand.shortLabel}: Estimated, verify manually.`);
    }
    if (!waterBrand.isBrewReady) {
      confidenceNotes.push(...(waterBrand.brewBlockReason || []));
      warnings.push(...(waterBrand.brewBlockReason || []));
    }
    if (waterBrand.classification === 'zero_mineral_ro') {
      warnings.push('Water is too low-mineral for ready-brew use; add minerals manually.');
    }
    if (waterBrand.classification === 'alkaline_caution') {
      warnings.push('Alkaline water can mute acidity; verify manually before treating it as filter friendly.');
    }
    if (waterBrand.classification === 'high_buffer') {
      warnings.push('High alkalinity/buffer can mute acidity and flatten floral coffees. Use lower contact time or choose manual minerals for delicate beans.');
    }
  } else {
    notes.unshift('Manual mineral input is active for this brew plan.');
  }

  if (tdsPpm < guidance.recommended.tdsPpm[0]) {
    ratioDelta -= 0.05;
    tempDeltaC += 0.3;
    notes.push('Low-TDS water may need a touch more thermal energy.');
  }
  if (tdsPpm > guidance.recommended.tdsPpm[1]) {
    ratioDelta += 0.05;
    tempDeltaC -= 0.3;
    notes.push('Higher-TDS water can read fuller and heavier with the same brew settings.');
  }
  if (hardnessPpm < guidance.recommended.hardnessPpm[0]) {
    tempDeltaC += 0.4;
    warnings.push(guidance.caution.tooSoft);
    confidenceNotes.push('Water hardness is below the recommended band.');
  } else if (hardnessPpm > guidance.recommended.hardnessPpm[1]) {
    tempDeltaC -= 0.5;
    ratioDelta += 0.05;
    warnings.push(guidance.caution.tooHard);
    confidenceNotes.push('Water hardness is above the recommended band.');
  }

  if (alkalinityPpm < guidance.recommended.alkalinityPpm[0]) {
    brewTimeDeltaSec -= 4;
    warnings.push(guidance.caution.tooLowAlkalinity);
    confidenceNotes.push('Water alkalinity is below the recommended band.');
  } else if (alkalinityPpm > guidance.recommended.alkalinityPpm[1]) {
    tempDeltaC -= 0.2;
    warnings.push(guidance.caution.tooHighAlkalinity);
    confidenceNotes.push('Water alkalinity is above the recommended band.');
  }

  const waterAdvice = resolveWaterAdjustmentAdvice({ tdsPpm, hardnessPpm, alkalinityPpm });
  warnings.push(...waterAdvice.warnings);
  notes.push(...waterAdvice.adjustments);

  let styleLabel = 'Balanced mineral input';
  if (hardnessPpm < guidance.recommended.hardnessPpm[0] && alkalinityPpm < guidance.recommended.alkalinityPpm[0]) {
    styleLabel = 'Soft / low buffer water';
  } else if (hardnessPpm > guidance.recommended.hardnessPpm[1] || alkalinityPpm > guidance.recommended.alkalinityPpm[1]) {
    styleLabel = 'Hard / buffered water';
  } else if (tdsPpm < guidance.recommended.tdsPpm[0]) {
    styleLabel = 'Low-TDS water';
  } else if (tdsPpm > guidance.recommended.tdsPpm[1]) {
    styleLabel = 'High-TDS water';
  }

  return {
    minerals: {
      tdsPpm,
      hardnessPpm,
      alkalinityPpm,
      notes: input.waterNotes.trim() || undefined,
      styleLabel,
    } satisfies WaterMineralInput,
    ratioDelta,
    tempDeltaC,
    brewTimeDeltaSec,
    notes,
    warnings,
    confidenceNotes,
    mineralDerivation,
  };
}
