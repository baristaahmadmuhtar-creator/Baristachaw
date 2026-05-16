import type {
  AiBrewReadinessScores,
  BrewPlan,
  ExpectedCupProfile,
  ProcessCatalogEntry,
  TargetProfile,
  VarietyCatalogEntry,
} from './types';
import { adjustScoresForSwitchPreset } from './switchPlanner.ts';

function clampScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function clampReadiness(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addBias(base: number, bias?: number, weight = 0.45) {
  return base + (bias || 0) * weight;
}

function hasRiskTag(entry: ProcessCatalogEntry | VarietyCatalogEntry | undefined, tags: string[]) {
  const riskTags = new Set((entry?.riskTags || []).map((tag) => String(tag)));
  return tags.some((tag) => riskTags.has(tag));
}

type IcedCupAdjustment = {
  acidityDelta: number;
  sweetnessDelta: number;
  bodyDelta: number;
  clarityDelta: number;
  aromaDelta: number;
  bitterRiskDelta: number;
  reasons: string[];
  warnings: string[];
  confidenceFloor?: ExpectedCupProfile['confidence'];
};

function resolveTargetIntent(plan: BrewPlan) {
  const targetId = plan.targetProfileId || '';
  if (targetId === 'more_acidity' || targetId === 'floral_transparent') return 'bright';
  if (targetId === 'more_sweetness' || targetId === 'soft_round') return 'sweet';
  if (targetId === 'more_body' || targetId === 'dense_comforting') return 'body';
  if (targetId === 'fruit_forward') return 'fruit';
  return 'balance';
}

function deriveIcedCupAdjustment(plan: BrewPlan): IcedCupAdjustment {
  const neutral: IcedCupAdjustment = {
    acidityDelta: 0,
    sweetnessDelta: 0,
    bodyDelta: 0,
    clarityDelta: 0,
    aromaDelta: 0,
    bitterRiskDelta: 0,
    reasons: [],
    warnings: [],
  };
  if (plan.brewMode !== 'iced' || plan.iceMl <= 0) return neutral;

  const intent = resolveTargetIntent(plan);
  const adjustment: IcedCupAdjustment = {
    ...neutral,
    reasons: ['Prediksi iced memakai konsentrat panas + bypass es terukur; ini prediksi kurasi, bukan jaminan.'],
  };

  if (intent === 'bright') {
    adjustment.acidityDelta += 0.6;
    adjustment.clarityDelta += 0.7;
    adjustment.bodyDelta -= 0.25;
    adjustment.aromaDelta += 0.3;
    adjustment.bitterRiskDelta -= 0.25;
  } else if (intent === 'fruit') {
    adjustment.acidityDelta += 0.35;
    adjustment.sweetnessDelta += 0.4;
    adjustment.clarityDelta += 0.45;
    adjustment.aromaDelta += 0.5;
    adjustment.bodyDelta -= 0.15;
    adjustment.bitterRiskDelta -= 0.2;
  } else if (intent === 'sweet') {
    adjustment.sweetnessDelta += 0.5;
    adjustment.clarityDelta += 0.3;
    adjustment.bodyDelta -= 0.1;
    adjustment.aromaDelta += 0.2;
    adjustment.bitterRiskDelta -= 0.15;
  } else if (intent === 'body') {
    adjustment.sweetnessDelta += 0.25;
    adjustment.bodyDelta += 0.1;
    adjustment.clarityDelta += 0.15;
    adjustment.bitterRiskDelta -= 0.1;
  } else {
    adjustment.sweetnessDelta += 0.25;
    adjustment.clarityDelta += 0.4;
    adjustment.bodyDelta -= 0.15;
    adjustment.aromaDelta += 0.2;
    adjustment.bitterRiskDelta -= 0.15;
  }

  if (plan.methodFamily === 'chemex' || plan.methodFamily === 'origami' || plan.methodFamily === 'v60' || plan.methodFamily === 'kono') {
    adjustment.clarityDelta += 0.2;
    adjustment.acidityDelta += 0.1;
  } else if (plan.methodFamily === 'kalita_wave' || plan.methodFamily === 'april' || plan.methodFamily === 'melitta') {
    adjustment.sweetnessDelta += 0.2;
    adjustment.clarityDelta += 0.1;
  } else if (plan.methodFamily === 'clever_dripper' || plan.methodFamily === 'hario_switch') {
    adjustment.sweetnessDelta += 0.25;
    adjustment.bodyDelta += 0.1;
  }

  if (plan.finalBeverageRatio > 15.2) {
    adjustment.warnings.push('Cup es bisa terasa ringan; gunakan target Lebih Manis/Body atau rapatkan rasio final setelah satu brew evaluasi.');
    adjustment.confidenceFloor = 'medium';
  }
  const dripperText = `${plan.dripper?.name || ''} ${plan.dripper?.typeLabel || ''}`.toLowerCase();
  const lowBypassDevice = /\b(tricolate|pulsar|nextlevel|mugen x switch|no[-\s]?bypass|vietnam drip)\b/i.test(dripperText);
  const flatOrChemexNearLightLimit = (
    (plan.methodFamily === 'april' || plan.methodFamily === 'kalita_wave' || plan.methodFamily === 'melitta')
    && plan.finalBeverageRatio >= 14.8
  ) || (plan.methodFamily === 'chemex' && plan.finalBeverageRatio >= 14.45);
  if (flatOrChemexNearLightLimit && plan.finalBeverageRatio <= 15.2) {
    adjustment.warnings.push('Seduhan es ini sengaja jernih. Jika terasa ringan, haluskan gilingan 0.5 step dulu.');
  }
  if (lowBypassDevice && plan.finalBeverageRatio >= 14.4) {
    adjustment.warnings.push('Low-bypass perlu konsentrat cukup kuat agar es tidak membuat cup tipis.');
  }
  if (plan.hotExtractionRatio > 10.6 && plan.methodFamily !== 'espresso' && plan.methodFamily !== 'moka_pot') {
    adjustment.warnings.push('Rasio konsentrat panas terlalu longgar; risiko iced terasa tipis atau kurang ekstrak.');
    adjustment.confidenceFloor = 'medium';
  }
  if (plan.hotExtractionRatio < 8.5 && plan.methodFamily !== 'espresso' && plan.methodFamily !== 'moka_pot') {
    adjustment.warnings.push('Rasio konsentrat panas sangat rapat; jaga agitasi agar iced tidak berat atau pahit.');
    adjustment.bitterRiskDelta += 0.25;
    adjustment.confidenceFloor = 'medium';
  }

  if (plan.waterClassification === 'high_buffer' || plan.waterClassification === 'alkaline_caution') {
    adjustment.clarityDelta -= 0.15;
    adjustment.warnings.push('Air berbuffer tinggi bisa membuat iced bright/floral terasa lebih muted.');
  }

  if (plan.grindSettingVerification === 'fallback' || plan.grindSettingMode === 'derived_baseline' || plan.grindCalibrationRequired) {
    adjustment.confidenceFloor = 'medium';
  }

  return adjustment;
}

function sensoryReason(prefix: string, entry?: { label: string; sensoryBias?: { acidity: number; sweetness: number; body: number; clarity: number; fermentIntensity: number; bitternessRisk: number; aromaVolatility: number } }) {
  if (!entry?.sensoryBias) return '';
  const bias = entry.sensoryBias;
  const strongest = [
    ['acidity', bias.acidity],
    ['sweetness', bias.sweetness],
    ['body', bias.body],
    ['clarity', bias.clarity],
    ['ferment', bias.fermentIntensity],
    ['aroma', bias.aromaVolatility],
  ]
    .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))[0];
  return `${prefix} ${entry.label} cue: ${strongest[0]} tendency ${strongest[1]}.`;
}

export function buildExpectedCupProfile(
  plan: BrewPlan,
  processEntry?: ProcessCatalogEntry,
  varietyEntry?: VarietyCatalogEntry,
  targetProfile?: TargetProfile,
): ExpectedCupProfile {
  let acidity = 3;
  let sweetness = 3;
  let body = 3;
  let clarity = 3;
  let bitterRisk = 2;
  let aromaIntensity = 3;
  const reasons: string[] = [];
  const warnings: string[] = [];

  switch (plan.targetProfileId) {
    case 'more_acidity':
    case 'floral_transparent':
      acidity += 1;
      clarity += 1;
      body -= 0.5;
      bitterRisk -= 0.5;
      reasons.push(`${targetProfile?.label || plan.targetProfileLabel} target protects acidity and clarity.`);
      break;
    case 'more_sweetness':
      sweetness += 1;
      body += 0.4;
      reasons.push(`${targetProfile?.label || plan.targetProfileLabel} target pushes sweetness before body.`);
      break;
    case 'more_body':
    case 'dense_comforting':
      body += 1.1;
      clarity -= 0.6;
      bitterRisk += 0.6;
      reasons.push(`${targetProfile?.label || plan.targetProfileLabel} target favors body with bitterness protection.`);
      break;
    case 'fruit_forward':
      sweetness += 0.8;
      aromaIntensity += 1;
      clarity -= 0.2;
      bitterRisk += 0.2;
      reasons.push(`${targetProfile?.label || plan.targetProfileLabel} target protects high-aroma fruit expression.`);
      break;
    case 'soft_round':
      sweetness += 0.6;
      body += 0.6;
      acidity -= 0.3;
      reasons.push(`${targetProfile?.label || plan.targetProfileLabel} target rounds acidity and keeps sweetness soft.`);
      break;
    default:
      reasons.push('Balance target keeps acidity, sweetness, body, and clarity near baseline.');
  }

  const processBias = processEntry?.sensoryBias;
  if (processBias) {
    acidity = addBias(acidity, processBias.acidity);
    sweetness = addBias(sweetness, processBias.sweetness);
    body = addBias(body, processBias.body);
    clarity = addBias(clarity, processBias.clarity);
    bitterRisk += processBias.bitternessRisk * 0.35;
    aromaIntensity += processBias.aromaVolatility * 0.35 + processBias.fermentIntensity * 0.25;
    const reason = sensoryReason('Process', processEntry);
    if (reason) reasons.push(reason);
  }
  if (hasRiskTag(processEntry, ['decaf-sensitive'])) {
    acidity -= 0.25;
    sweetness -= 0.2;
    bitterRisk += 0.25;
    warnings.push('Decaf bisa lebih sensitif. Mulai dari baseline aman, lalu koreksi dari rasa.');
  }
  if (hasRiskTag(processEntry, ['experimental', 'ferment-risk', 'high-ferment', 'taste-feedback-required'])) {
    aromaIntensity += 0.35;
    clarity -= 0.2;
    bitterRisk += 0.2;
    warnings.push('Proses ini sangat bergantung pada kontrol produser; prediksi rasa perlu feedback setelah seduh.');
  }
  if (hasRiskTag(processEntry, ['drying-only'])) {
    reasons.push('Info pengeringan dipakai sebagai konteks ringan, bukan jaminan profil rasa.');
  }
  if (hasRiskTag(processEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa'])) {
    body += 0.35;
    clarity -= 0.2;
    bitterRisk += 0.35;
    warnings.push('Robusta/canephora/non-arabica cenderung lebih body-heavy dan mudah pahit jika ekstraksi terlalu agresif.');
  }

  const varietyBias = varietyEntry?.sensoryBias;
  if (varietyBias) {
    acidity = addBias(acidity, varietyBias.acidity, 0.35);
    sweetness = addBias(sweetness, varietyBias.sweetness, 0.35);
    body = addBias(body, varietyBias.body, 0.35);
    clarity = addBias(clarity, varietyBias.clarity, 0.35);
    bitterRisk += varietyBias.bitternessRisk * 0.25;
    aromaIntensity += varietyBias.aromaVolatility * 0.3;
    const reason = sensoryReason('Variety', varietyEntry);
    if (reason) reasons.push(reason);
  }
  if (hasRiskTag(varietyEntry, ['non-arabica', 'canephora', 'liberica', 'excelsa', 'unusual-species'])) {
    body += 0.3;
    clarity -= 0.2;
    bitterRisk += 0.3;
    warnings.push('Spesies/varietas robusta/canephora/non-arabica atau tidak umum menurunkan keyakinan prediksi rasa.');
  }
  if (hasRiskTag(varietyEntry, ['lot-dependent', 'floral-possible', 'clarity-leaning'])) {
    reasons.push('Varietas memberi sinyal potensi, tetapi hasil tetap lot-dependent.');
  }

  if (plan.roastLevel === 'light' || plan.roastLevel === 'medium_light') {
    acidity += 0.4;
    clarity += 0.25;
    body -= 0.2;
  } else if (plan.roastLevel === 'medium_dark' || plan.roastLevel === 'dark') {
    body += 0.45;
    bitterRisk += plan.roastLevel === 'dark' ? 0.8 : 0.45;
    acidity -= 0.35;
    clarity -= 0.25;
  }

  if (plan.methodFamily === 'espresso' || plan.methodFamily === 'moka_pot') {
    body += 0.6;
    bitterRisk += 0.4;
    clarity -= 0.2;
    reasons.push(`${plan.methodFamily} workflow raises body and needs bitterness control.`);
  } else if (plan.methodFamily === 'chemex' || plan.methodFamily === 'siphon') {
    clarity += 0.35;
  } else if (plan.methodFamily === 'french_press' || plan.methodFamily === 'cold_brew') {
    body += 0.45;
    clarity -= 0.35;
  } else if (plan.methodFamily === 'hario_switch') {
    const adjusted = adjustScoresForSwitchPreset(plan.switchExpectedCupShift, {
      acidity,
      sweetness,
      body,
      clarity,
      bitterRisk,
      aromaIntensity,
    });
    acidity = adjusted.acidity;
    sweetness = adjusted.sweetness;
    body = adjusted.body;
    clarity = adjusted.clarity;
    bitterRisk = adjusted.bitterRisk;
    aromaIntensity = adjusted.aromaIntensity;
    if (plan.switchPresetLabel) {
      reasons.push(`${plan.switchPresetLabel} preset shapes Switch sweetness, clarity, body, and valve timing.`);
    }
    if (plan.switchTasteProgramme) {
      const closedShare = plan.hotWaterMl > 0 ? plan.switchTasteProgramme.closedPhaseMl / plan.hotWaterMl : 0;
      const openShare = plan.hotWaterMl > 0 ? plan.switchTasteProgramme.openPhaseMl / plan.hotWaterMl : 0;
      const targetId = plan.targetProfileId;
      if (targetId === 'more_acidity' || targetId === 'floral_transparent') {
        acidity += openShare >= 0.55 ? 0.35 : 0.15;
        clarity += openShare >= 0.55 ? 0.35 : 0.2;
        body -= 0.15;
      } else if (targetId === 'more_sweetness' || targetId === 'soft_round') {
        sweetness += closedShare >= 0.45 ? 0.35 : 0.18;
        body += 0.15;
      } else if (targetId === 'more_body' || targetId === 'dense_comforting') {
        body += closedShare >= 0.6 ? 0.45 : 0.25;
        sweetness += 0.18;
        clarity -= closedShare >= 0.6 ? 0.25 : 0.1;
        bitterRisk += closedShare >= 0.72 ? 0.35 : 0.15;
      } else if (targetId === 'fruit_forward') {
        aromaIntensity += 0.35;
        sweetness += 0.2;
        clarity += openShare >= 0.35 ? 0.15 : 0;
      }
      if (plan.switchPresetId === 'v60_mode') {
        clarity += 0.35;
        acidity += 0.25;
        body -= 0.25;
      }
      if (plan.switchPresetId === 'iced_hybrid') {
        clarity += 0.25;
        acidity += 0.2;
        bitterRisk -= 0.2;
      }
      if (plan.dripper.id === 'mugen-x-switch') {
        sweetness += 0.2;
        clarity += 0.1;
      }
      reasons.push(plan.switchTasteProgramme.sensoryReason);
      warnings.push(...plan.switchTasteProgramme.riskWarnings.slice(0, 2));
    }
  }

  const icedAdjustment = deriveIcedCupAdjustment(plan);
  if (
    icedAdjustment.acidityDelta
    || icedAdjustment.sweetnessDelta
    || icedAdjustment.bodyDelta
    || icedAdjustment.clarityDelta
    || icedAdjustment.aromaDelta
    || icedAdjustment.bitterRiskDelta
  ) {
    acidity += icedAdjustment.acidityDelta;
    sweetness += icedAdjustment.sweetnessDelta;
    body += icedAdjustment.bodyDelta;
    clarity += icedAdjustment.clarityDelta;
    aromaIntensity += icedAdjustment.aromaDelta;
    bitterRisk += icedAdjustment.bitterRiskDelta;
    reasons.push(...icedAdjustment.reasons);
    warnings.push(...icedAdjustment.warnings);
  }

  let confidence: ExpectedCupProfile['confidence'] = 'high';
  const highBufferWater = plan.waterClassification === 'high_buffer'
    || plan.waterClassification === 'alkaline_caution'
    || (plan.waterMinerals?.alkalinityPpm ?? 0) > 85;
  if (highBufferWater) {
    acidity -= 0.7;
    clarity -= 0.6;
    confidence = confidence === 'high' ? 'medium' : confidence;
    warnings.push('High-buffer water can mute acidity and floral clarity.');
  }
  const zeroMineralWater = plan.waterClassification === 'zero_mineral_ro'
    || (
      (plan.waterMinerals?.tdsPpm ?? 999) < 30
      && (plan.waterMinerals?.hardnessPpm ?? 999) < 20
      && (plan.waterMinerals?.alkalinityPpm ?? 999) < 20
    );
  if (zeroMineralWater) {
    confidence = 'low';
    warnings.push('Zero-mineral/RO water should not be used without remineralization.');
  } else if (plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady || plan.waterMineralDerivation === 'estimated_from_classification') {
    confidence = 'medium';
    warnings.push('Water minerals need manual verification before treating this profile as locked.');
  }

  if (plan.grindSettingVerification === 'fallback' || plan.grindSettingMode === 'derived_baseline' || plan.grindCalibrationRequired) {
    confidence = confidence === 'low' ? 'low' : 'medium';
    warnings.push('Baseline grinder menurunkan keyakinan; validasi dari waktu ekstraksi dan rasa.');
  }

  if (plan.processRisk?.variability === 'high') {
    confidence = confidence === 'high' ? 'medium' : confidence;
    warnings.push('High-variability process needs taste feedback before stronger extraction changes.');
  }
  if (
    hasRiskTag(processEntry, ['decaf-sensitive', 'experimental', 'ferment-risk', 'high-ferment', 'non-arabica', 'taste-feedback-required'])
    || hasRiskTag(varietyEntry, ['non-arabica', 'unusual-species', 'low-confidence-if-unverified'])
  ) {
    confidence = confidence === 'high' ? 'medium' : confidence;
  }

  if (plan.workflowValidation && !plan.workflowValidation.passed) {
    confidence = 'low';
    warnings.push('Workflow validation did not pass, so sensory prediction is not release-grade.');
  }
  if (plan.methodFamily === 'hario_switch' && plan.switchStepValidation?.status === 'blocked') {
    confidence = 'low';
    warnings.push('Switch chamber validation is blocked; use the suggested safe programme before brewing.');
  } else if (plan.methodFamily === 'hario_switch' && plan.switchStepValidation?.status === 'caution' && confidence === 'high') {
    confidence = 'medium';
    warnings.push('Switch chamber load is close to the safe limit; treat taste prediction as medium confidence.');
  }
  if (plan.methodFamily === 'hario_switch' && plan.switchProvenance?.sensoryModelConfidence === 'medium' && confidence === 'high') {
    confidence = 'medium';
    warnings.push('Switch preset cup profile is a curated prediction, not a guaranteed result.');
  }
  if (icedAdjustment.confidenceFloor === 'medium' && confidence === 'high') {
    confidence = 'medium';
  }

  return {
    acidity: clampScore(acidity),
    sweetness: clampScore(sweetness),
    body: clampScore(body),
    clarity: clampScore(clarity),
    bitterRisk: clampScore(bitterRisk),
    aromaIntensity: clampScore(aromaIntensity),
    confidence,
    reasons: Array.from(new Set(reasons)).slice(0, 4),
    warnings: Array.from(new Set(warnings)).slice(0, 4),
  };
}

export function buildAiBrewReadinessScores(plan: BrewPlan): AiBrewReadinessScores {
  const recipe = clampReadiness(
    96
    - plan.guardrails.errors.length * 18
    - plan.warnings.length * 2
    - (plan.provenanceAttentionNeeded ? 3 : 0),
  );
  const workflow = clampReadiness(plan.workflowValidation?.readinessScore ?? 82);
  const water = (() => {
    if (plan.waterClassification === 'zero_mineral_ro') return 35;
    if (plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady) return 58;
    if (plan.waterMineralDerivation === 'estimated_from_classification') return 64;
    if (plan.waterClassification === 'high_buffer' || plan.waterClassification === 'alkaline_caution') return 76;
    if (plan.waterMineralDerivation === 'manual') return 88;
    return 94;
  })();
  const grinder = (() => {
    if (plan.grindCalibrationRequired) return plan.grindSettingVerification === 'fallback' ? 62 : 82;
    if (plan.grindSettingVerification === 'official' && plan.grindSettingMode !== 'derived_baseline') return 97;
    if (plan.grindSettingVerification === 'community_verified') return 93;
    if (plan.grindSettingVerification === 'curated') return 86;
    if (plan.grindSettingVerification === 'dataset_unverified') return 74;
    return 62;
  })();
  const catalog = clampReadiness(
    94
    - (plan.deviceProfileMode === 'family_fallback' ? 14 : plan.deviceProfileMode === 'derived_template' ? 7 : 0)
    - (plan.processReviewStatus === 'needs_review' || plan.varietyReviewStatus === 'needs_review' ? 6 : 0)
    - (plan.processReviewStatus === 'conflicting' || plan.varietyReviewStatus === 'conflicting' ? 12 : 0),
  );

  return {
    recipe,
    water: clampReadiness(water),
    grinder: clampReadiness(grinder),
    workflow,
    catalog,
  };
}
