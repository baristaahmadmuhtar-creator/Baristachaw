import type {
  AiBrewReadinessScores,
  BrewPlan,
  ExpectedCupProfile,
  ProcessCatalogEntry,
  TargetProfile,
  VarietyCatalogEntry,
} from './types';

function clampScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function clampReadiness(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addBias(base: number, bias?: number, weight = 0.45) {
  return base + (bias || 0) * weight;
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
  }

  let confidence: ExpectedCupProfile['confidence'] = 'high';
  if (plan.waterClassification === 'high_buffer' || plan.waterClassification === 'alkaline_caution') {
    acidity -= 0.7;
    clarity -= 0.6;
    warnings.push('High-buffer water can mute acidity and floral clarity.');
  }
  if (plan.waterClassification === 'zero_mineral_ro') {
    confidence = 'low';
    warnings.push('Zero-mineral/RO water should not be used without remineralization.');
  } else if (plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady || plan.waterMineralDerivation === 'estimated_from_classification') {
    confidence = 'medium';
    warnings.push('Water minerals need manual verification before treating this profile as locked.');
  }

  if (plan.grindSettingVerification === 'fallback' || plan.grindSettingMode === 'derived_baseline') {
    confidence = confidence === 'low' ? 'low' : 'medium';
    warnings.push('Fallback grinder setting lowers confidence; validate with drawdown and taste.');
  }

  if (plan.processRisk?.variability === 'high') {
    confidence = confidence === 'high' ? 'medium' : confidence;
    warnings.push('High-variability process needs taste feedback before stronger extraction changes.');
  }

  if (plan.workflowValidation && !plan.workflowValidation.passed) {
    confidence = 'low';
    warnings.push('Workflow validation did not pass, so sensory prediction is not release-grade.');
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
