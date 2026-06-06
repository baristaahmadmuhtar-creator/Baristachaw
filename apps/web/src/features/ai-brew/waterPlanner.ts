import type {
  AiBrewFormState,
  BrewPlan,
  WaterClassification,
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
  classification?: WaterBrandProfile['classification'];
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
    if (water.classification === 'low_mineral_clarity') {
      warnings.push('TDS sangat rendah; hasil seduhan bisa clean, tetapi body dapat tipis dan acidity terasa lebih tajam.');
      adjustments.push('Gunakan sebagai titik awal untuk seduhan filter; campur dengan air bermineral atau remineralisasi jika ingin body lebih penuh dan hasil lebih konsisten.');
    } else if (water.classification === 'demineral_direct_experiment') {
      warnings.push('Air demineral bisa dipakai sebagai eksperimen filter, tetapi body sering sangat ringan dan hasilnya dapat terasa kosong.');
      adjustments.push('Gunakan sebagai titik awal dengan keyakinan rendah; jika hasilnya kosong, remineralisasi, campur dengan air bermineral, atau haluskan sedikit gilingan.');
    } else {
      warnings.push('TDS sangat rendah; air rendah mineral dapat bekerja baik untuk seduhan yang mengutamakan kejernihan.');
      adjustments.push('Gunakan sebagai titik awal; remineralisasi atau campur dengan air bermineral jika hasilnya terasa kosong.');
    }
  }

  return { warnings, adjustments };
}

export function canUseWaterBrandAutofill(waterBrand?: WaterBrandProfile) {
  const minerals = waterBrand?.resolvedMinerals;
  return Boolean(
    waterBrand
    && waterBrand.presetStatus === 'autofill'
    && waterBrand.isBrewReady
    && minerals
    && minerals.derivation !== 'estimated_from_classification'
    && minerals.tdsPpm >= 0
    && minerals.tdsPpm <= 600
    && minerals.hardnessPpm >= 0
    && minerals.hardnessPpm <= 500
    && minerals.alkalinityPpm >= 0
    && minerals.alkalinityPpm <= 400,
  );
}

function classifyManualWaterMinerals(params: {
  tdsPpm: number;
  hardnessPpm: number;
  alkalinityPpm: number;
  brandClassification?: WaterClassification;
}) {
  const { tdsPpm, hardnessPpm, alkalinityPpm, brandClassification } = params;
  if (brandClassification && brandClassification !== 'balanced') {
    if (brandClassification === 'zero_mineral_ro' || brandClassification === 'demineral_direct_experiment') {
      return {
        classification: brandClassification,
        styleLabel: brandClassification === 'zero_mineral_ro' ? 'Zero-mineral / RO base water' : 'Demineralized direct-use experiment',
        warning: 'Zero-mineral or demineralized water is not a full brew-ready profile without mineral context.',
      };
    }
    if (brandClassification === 'low_mineral_clarity') {
      return {
        classification: brandClassification,
        styleLabel: 'Low-mineral clarity water',
        warning: 'Low-mineral water can taste clean, but body may be thin and acidity may sharpen.',
      };
    }
    if (brandClassification === 'high_buffer' || brandClassification === 'alkaline_caution') {
      return {
        classification: brandClassification,
        styleLabel: brandClassification === 'high_buffer' ? 'High-buffer water' : 'Alkaline caution water',
        warning: brandClassification === 'high_buffer'
          ? 'High alkalinity can mute acidity and flatten floral clarity.'
          : 'Alkaline-labeled water can soften acidity and floral clarity; verify with a meter or taste before treating it as locked.',
      };
    }
  }

  if (tdsPpm <= 10 || (hardnessPpm <= 5 && alkalinityPpm <= 5)) {
    return {
      classification: 'zero_mineral_ro' as WaterClassification,
      styleLabel: 'Zero-mineral / RO base water',
      warning: 'Zero-mineral water needs remineralization or a verified mineral blend before normal brewing.',
    };
  }
  if (tdsPpm >= 220) {
    return {
      classification: 'high_tds' as WaterClassification,
      styleLabel: 'High-TDS water',
      warning: 'High-TDS water can make the cup heavy and muted; verify minerals before using it as a baseline.',
    };
  }
  if (hardnessPpm >= 120 && alkalinityPpm >= 85) {
    return {
      classification: 'hard_mineral' as WaterClassification,
      styleLabel: 'Hard mineral / high-buffer water',
      warning: 'Hard, high-buffer water can mute acidity, flatten florals, and increase scale risk.',
    };
  }
  if (hardnessPpm >= 120) {
    return {
      classification: 'hard_mineral' as WaterClassification,
      styleLabel: 'Hard mineral water',
      warning: 'High hardness can make the cup heavier and raise scale risk.',
    };
  }
  if (alkalinityPpm >= 85) {
    return {
      classification: 'high_buffer' as WaterClassification,
      styleLabel: 'High-buffer water',
      warning: 'High alkalinity can mute acidity and flatten floral clarity.',
    };
  }
  if (hardnessPpm < 40 && alkalinityPpm < 30) {
    return {
      classification: 'soft_low_buffer' as WaterClassification,
      styleLabel: 'Soft / low-buffer water',
      warning: 'Soft, low-buffer water can taste vivid but may sharpen acidity.',
    };
  }
  if (tdsPpm < 30 || hardnessPpm < 25) {
    return {
      classification: 'low_mineral' as WaterClassification,
      styleLabel: 'Low-mineral water',
      warning: 'Low-mineral water can taste clean, but the cup may be thin without mineral support.',
    };
  }
  if (hardnessPpm >= 40 && hardnessPpm <= 90 && alkalinityPpm >= 55 && alkalinityPpm < 85) {
    return {
      classification: 'moderate_upper_buffered' as WaterClassification,
      styleLabel: 'Moderate mineral / upper-buffered water',
      warning: 'Upper-buffered water may soften acidity and floral clarity.',
    };
  }
  return {
    classification: 'moderate' as WaterClassification,
    styleLabel: 'Moderate mineral water',
    warning: undefined,
  };
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
    if (waterBrand.resolvedMinerals?.derivation === 'estimated_from_community_profile') {
      confidenceNotes.push(`${waterBrand.shortLabel} uses curated coffee-community water evidence; treat it as a capped-confidence starting point.`);
      warnings.push(`${waterBrand.shortLabel}: community/profile autofill. Verify by taste or meter for cafe repeatability.`);
    }
    if (!waterBrand.isBrewReady) {
      confidenceNotes.push(...(waterBrand.brewBlockReason || []));
      warnings.push(...(waterBrand.brewBlockReason || []));
    }
    if (waterBrand.classification === 'zero_mineral_ro') {
      warnings.push(`${waterBrand.shortLabel}: useful as a custom-water base; low-TDS water can work well for clarity-focused brewing, but remineralize if cup tastes hollow.`);
    }
    if (waterBrand.classification === 'low_mineral_clarity') {
      warnings.push(`${waterBrand.shortLabel}: low-mineral clarity water. Expect a clean cup, but verify body and acidity from taste.`);
      confidenceNotes.push(`${waterBrand.shortLabel} is a low-mineral starting point, not a universal best water.`);
    }
    if (waterBrand.classification === 'demineral_direct_experiment') {
      warnings.push(`${waterBrand.shortLabel}: direct filter use is experimental and low confidence; expect clean/light body and hollow risk.`);
      confidenceNotes.push(`${waterBrand.shortLabel} works best as a remineralization base or deliberate low-mineral filter experiment.`);
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

  const numericClassification = classifyManualWaterMinerals({
    tdsPpm,
    hardnessPpm,
    alkalinityPpm,
    brandClassification: waterBrand?.classification,
  });
  if (numericClassification.warning) {
    if (numericClassification.classification === 'moderate_upper_buffered') {
      warnings.push(numericClassification.warning);
      confidenceNotes.push('Water classification separates moderate hardness from upper-buffered alkalinity.');
    } else if (!warnings.some((warning) => warning === numericClassification.warning)) {
      warnings.push(numericClassification.warning);
    }
  }

  const waterAdvice = resolveWaterAdjustmentAdvice({
    tdsPpm,
    hardnessPpm,
    alkalinityPpm,
    classification: numericClassification.classification,
  });
  warnings.push(...waterAdvice.warnings);
  notes.push(...waterAdvice.adjustments);

  const delicateTarget = /acidity|floral|transparent/i.test(input.targetProfileId || '');
  const upperBufferedTempMaxC = numericClassification.classification === 'moderate_upper_buffered'
    || numericClassification.classification === 'high_buffer'
    || numericClassification.classification === 'alkaline_caution'
    ? delicateTarget ? 92 : 93.5
    : undefined;

  return {
    classification: numericClassification.classification,
    tempMaxC: upperBufferedTempMaxC,
    minerals: {
      tdsPpm,
      hardnessPpm,
      alkalinityPpm,
      notes: input.waterNotes.trim() || undefined,
      styleLabel: numericClassification.styleLabel,
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
