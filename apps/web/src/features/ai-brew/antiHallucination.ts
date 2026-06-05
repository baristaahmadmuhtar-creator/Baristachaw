import type { BrewPlan } from './types';

export type BrewHallucinationRisk =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'blocked';

export interface BrewGuardResult {
  allowed: boolean;
  risk: BrewHallucinationRisk;
  reason?: string;
  safeText?: string;
}

const PROCESS_FACT_PATTERN = /\b(washed|natural|honey|wet[-\s]?hulled|anaerobic|carbonic maceration)\b/gi;
const GEISHA_PATTERN = /\b(?:geisha|gesha)\b/gi;
const GEISHA_TEST_PATTERN = /\b(?:geisha|gesha)\b/i;
const ORIGIN_DETAIL_LINE_PATTERN = /^(?:.*\b(?:altitude|ketinggian|farm|estate|roaster|harvest|panen)\b.*)$/gim;
const READY_WATER_CLAIM_PATTERN = /\b(?:ideal|excellent|ready[-\s]?brew|brew[-\s]?ready|sangat cocok|sempurna)\b/gi;
const OFFICIAL_GRINDER_CLAIM_PATTERN = /\b(?:official grinder|official grind|verified grind reference|referensi grinder resmi|setting resmi)\b/gi;
const EXACT_BREWER_CLAIM_PATTERN = /\b(?:profil exact|exact profile|profil siap)\b/gi;
const PLACEHOLDER_OR_BROKEN_COPY_PATTERN = /\$(?:\d+|\{)|\b(?:undefined|null|NaN|\[object Object\]|ActionAction|Pressgentle|Stophiss|Programbloom|Valveset|Press35-45 seconds|Stophiss finished)\b|target-profile extraction pressure|deterministic planner numbers, not AI-invented copy|flow matched to french_press/i;
const BROKEN_MIXED_LANGUAGE_PATTERN = /\b(?:Valveset sebelum seduh|Programbloom then immersion|Serve setelah aliran finish cleanly|Level coffee bed datar|Let partikel coffee)\b/i;

function normalized(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function isUnknownValue(value?: string) {
  const n = normalized(value);
  return !n || n === 'not specified' || n === 'none' || n === '-' || n === 'unknown' || n === 'tidak dipilih';
}

function isLowTrustWater(plan: BrewPlan) {
  const blockText = `${plan.waterBrewBlockReason.join(' ')} ${plan.waterMinerals.styleLabel || ''}`.toLowerCase();
  return plan.waterPresetStatus === 'manual_required'
    || plan.waterMineralDerivation === 'estimated_from_classification'
    || plan.waterMineralDerivation === 'estimated_from_community_profile'
    || !plan.waterIsBrewReady
    || blockText.includes('zero')
    || blockText.includes('ro')
    || blockText.includes('low-mineral')
    || blockText.includes('rendah mineral')
    || plan.waterMinerals.tdsPpm <= 20
    || plan.waterMinerals.hardnessPpm <= 15
    || plan.waterMinerals.alkalinityPpm <= 10;
}

function brewerIsExact(plan: BrewPlan) {
  return plan.deviceProfileMode === 'exact'
    && plan.dripper.confidence === 'high';
}

export function isExplicitGeishaVariety(variety?: string): boolean {
  return GEISHA_TEST_PATTERN.test(String(variety || ''));
}

function isIndonesianLanguage(language?: string) {
  return !language || String(language).toLowerCase().startsWith('id');
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function formatRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  return roundToOneDecimal(value).toFixed(1);
}

function canonicalFinishSeconds(plan: BrewPlan) {
  return Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
}

function collectUserFacingRecipeText(plan: BrewPlan) {
  return [
    plan.summary,
    plan.grindRecommendation,
    plan.waterMinerals.styleLabel,
    plan.extractionRationale?.ratio,
    plan.extractionRationale?.temperature,
    plan.extractionRationale?.time,
    plan.extractionRationale?.grind,
    plan.extractionRationale?.pour,
    ...(plan.extractionRationale?.warnings || []),
    ...plan.notes,
    ...plan.warnings,
    ...plan.steps.map((step) => `${step.label} ${step.note} ${step.hybridInstruction || ''}`),
    ...(plan.workflowGuideSteps || []).map((step) => [
      step.label,
      step.primaryText,
      step.secondaryText || '',
      ...step.techniqueChips.map((chip) => `${chip.label} ${chip.value}`),
      ...step.warnings,
    ].join(' ')),
    ...(plan.aiNotes ? Object.values(plan.aiNotes).filter(Boolean) : []),
  ].filter(Boolean).join('\n');
}

function validateBrewPlanRatioInvariants(plan: BrewPlan) {
  const reasons: string[] = [];
  if (Number.isFinite(plan.doseG) && plan.doseG > 0) {
    const expectedFinal = plan.totalWaterMl / plan.doseG;
    const expectedHot = plan.hotWaterMl / plan.doseG;
    if (Math.abs(plan.finalBeverageRatio - expectedFinal) > 0.05) {
      reasons.push(`final ratio mismatch: expected 1:${formatRatio(expectedFinal)}, got 1:${formatRatio(plan.finalBeverageRatio)}`);
    }
    if (Math.abs(plan.hotExtractionRatio - expectedHot) > 0.05) {
      reasons.push(`hot extraction ratio mismatch: expected 1:${formatRatio(expectedHot)}, got 1:${formatRatio(plan.hotExtractionRatio)}`);
    }
    const ratioText = collectUserFacingRecipeText(plan);
    if (!ratioText.includes(`1:${formatRatio(expectedFinal)}`)) {
      reasons.push(`user-facing ratio text does not include canonical final ratio 1:${formatRatio(expectedFinal)}`);
    }
  }
  return reasons;
}

export function validateBrewPlanTiming(plan: BrewPlan): BrewGuardResult {
  const reasons: string[] = [];
  const finish = canonicalFinishSeconds(plan);
  if (typeof plan.serveStartSeconds === 'number' && Number.isFinite(plan.serveStartSeconds) && plan.serveStartSeconds < finish) {
    reasons.push(`serve starts before canonical finish (${plan.serveStartSeconds}s < ${finish}s)`);
  }
  const guideSteps = plan.workflowGuideSteps || [];
  const finalGuideStep = guideSteps[guideSteps.length - 1];
  if (finalGuideStep && /serve|sajikan|decant|tuang/i.test(`${finalGuideStep.label} ${finalGuideStep.primaryText}`) && finalGuideStep.startSeconds < finish) {
    reasons.push(`workflow final service step starts before canonical finish (${finalGuideStep.startSeconds}s < ${finish}s)`);
  }
  const rationaleTime = plan.extractionRationale?.time || '';
  if (rationaleTime && !rationaleTime.includes(formatSafeBrewTime(finish))) {
    reasons.push(`extraction rationale time does not match canonical finish ${formatSafeBrewTime(finish)}`);
  }
  if (
    typeof plan.extractionEndSeconds === 'number'
    && Math.abs(plan.totalTimeSeconds - plan.extractionEndSeconds) > 45
    && !plan.timeDisplayMode
  ) {
    reasons.push('totalTimeSeconds differs from extractionEndSeconds without timeDisplayMode');
  }
  return {
    allowed: reasons.length === 0,
    risk: reasons.length === 0 ? 'none' : 'blocked',
    reason: reasons.join('; ') || undefined,
    safeText: reasons.length ? formatSafeBrewCaveat(plan) : undefined,
  };
}

function formatSafeBrewTime(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function validateUserFacingRecipeText(plan: BrewPlan): BrewGuardResult {
  const reasons: string[] = [];
  const text = collectUserFacingRecipeText(plan);
  if (PLACEHOLDER_OR_BROKEN_COPY_PATTERN.test(text) || BROKEN_MIXED_LANGUAGE_PATTERN.test(text)) {
    reasons.push('user-facing text contains placeholder, broken concatenation, or developer copy');
  }
  if (
    /Hard \/ buffered water/i.test(text)
    && plan.waterMinerals.hardnessPpm < 90
    && plan.waterMinerals.alkalinityPpm < 85
  ) {
    reasons.push('moderate hardness/alkalinity water is mislabeled as hard buffered water');
  }
  if (plan.methodFamily === 'aeropress' && /\b(drawdown|pour map|bloom pour|final pour|bed drawdown|center-to-mid)\b/i.test(text)) {
    reasons.push('AeroPress text contains pour-over workflow vocabulary');
  }
  if (plan.methodFamily === 'french_press' && /\b(drawdown|pour map|bloom pour|final pour|center-to-mid|flow matched to french_press)\b/i.test(text)) {
    reasons.push('French Press text contains pour-over workflow vocabulary');
  }
  if (plan.methodFamily === 'espresso' && /\b(bloom|kettle pour|filter wall|add water like manual brew)\b/i.test(text)) {
    reasons.push('Espresso text contains manual brew workflow vocabulary');
  }
  if (plan.methodFamily === 'moka_pot' && /\b(bloom|pour pulses|drawdown bed|final pour)\b/i.test(text)) {
    reasons.push('Moka Pot text contains pour-over workflow vocabulary');
  }
  if (plan.methodFamily === 'cold_brew' && /\b(hot bloom|kettle temperature|hot pour)\b/i.test(text)) {
    reasons.push('Cold Brew text contains hot brew workflow vocabulary');
  }
  return {
    allowed: reasons.length === 0,
    risk: reasons.length === 0 ? 'none' : 'blocked',
    reason: reasons.join('; ') || undefined,
    safeText: reasons.length
      ? 'Recipe adjusted to keep timing, ratio, and device safety consistent.'
      : undefined,
  };
}

export function formatSafeBrewCaveat(plan: BrewPlan, language?: string): string {
  const caveats: string[] = [];
  const id = isIndonesianLanguage(language);
  if (!isExplicitGeishaVariety(plan.variety)) {
    caveats.push(id
      ? 'Data varietas belum dikunci; sistem tidak akan mengarang varietas.'
      : 'Variety data is not locked; the system will not invent it.');
  }
  if (isUnknownValue(plan.process)) {
    caveats.push(id
      ? 'Data proses belum dikunci; resep memakai baseline roast level dan target profil.'
      : 'Process data is not locked; the recipe uses roast level and target profile as the baseline.');
  }
  if (isLowTrustWater(plan)) {
    caveats.push(id
      ? 'Air ini rendah mineral atau butuh input manual; gunakan sebagai base remineralisasi atau isi mineral manual.'
      : 'This water is low-mineral or needs manual input; use it as a remineralization base or enter minerals manually.');
  }
  if (plan.grindSettingVerification !== 'official') {
    const calibrationCue = plan.methodFamily === 'aeropress'
      ? (id ? 'waktu rendam, durasi tekan, dan rasa' : 'steep time, press duration, and taste')
      : plan.methodFamily === 'french_press'
        ? (id ? 'waktu rendam, kejernihan tuang pisah, dan rasa' : 'steep time, clean decanting, and taste')
        : plan.methodFamily === 'espresso'
          ? (id ? 'yield, flow, dan rasa' : 'yield, flow, and taste')
          : (id ? 'air turun dan rasa' : 'drawdown and taste');
    caveats.push(id
      ? `Setelan grinder adalah titik awal; kalibrasi dengan ${calibrationCue}.`
      : `The grinder setting is a starting point; calibrate by ${calibrationCue}.`);
  }
  if (!brewerIsExact(plan)) {
    caveats.push(id
      ? 'Profil alat ini turunan/eksperimental; lakukan kalibrasi rasa.'
      : 'This brewer profile is derived or experimental; calibrate from the cup.');
  }
  return caveats.join('\n');
}

export function sanitizeBrewNarrative(text: string, plan: BrewPlan, language?: string): string {
  let output = String(text || '');
  if (!output.trim()) return output;
  const id = isIndonesianLanguage(language);

  if (!isExplicitGeishaVariety(plan.variety)) {
    output = output.replace(GEISHA_PATTERN, id ? 'kopi ini' : 'this coffee');
  }

  if (isUnknownValue(plan.process)) {
    output = output.replace(PROCESS_FACT_PATTERN, id ? 'proses belum dikunci' : 'process not locked');
  }

  output = output.replace(
    ORIGIN_DETAIL_LINE_PATTERN,
    id ? 'Catatan asal detail belum dikunci di planner.' : 'Detailed origin notes are not locked in the planner.',
  );

  if (isLowTrustWater(plan)) {
    output = output.replace(READY_WATER_CLAIM_PATTERN, id ? 'butuh verifikasi mineral' : 'needs mineral verification');
    if (!/rendah mineral|manual|required|remineral/i.test(output)) {
      output += `\n\n${formatSafeBrewCaveat(plan, language).split('\n').find((line) => /air|water/i.test(line)) || (id ? 'Air perlu diverifikasi manual sebelum dianggap siap seduh.' : 'Water needs manual verification before it is treated as brew-ready.')}`;
    }
  }

  if (plan.grindSettingVerification !== 'official') {
    output = output.replace(OFFICIAL_GRINDER_CLAIM_PATTERN, 'referensi grinder curated');
  }

  if (!brewerIsExact(plan)) {
    const label = plan.deviceProfileMode === 'family_fallback'
      ? (id ? 'Butuh kalibrasi' : 'Needs calibration')
      : (id ? 'Profil turunan' : 'Derived profile');
    output = output.replace(EXACT_BREWER_CLAIM_PATTERN, label);
  }

  if (plan.brewMode === 'iced') {
    const totalPattern = new RegExp(`(?:hasil cangkir|cup output|final output)[^\\n]{0,40}\\b${plan.totalWaterMl}\\b\\s*(?:ml|g)?`, 'gi');
    output = output.replace(totalPattern, `estimasi hasil cangkir ±${plan.estimatedCupOutputMl} ml setelah retensi kopi`);
  }

  return output;
}

export function validateBrewPlanOutput(plan: BrewPlan): BrewGuardResult {
  const reasons: string[] = [];
  const numericFields = [
    ['doseG', plan.doseG],
    ['totalWaterMl', plan.totalWaterMl],
    ['hotWaterMl', plan.hotWaterMl],
    ['iceMl', plan.iceMl],
    ['waterTempC', plan.waterTempC],
    ['totalTimeSeconds', plan.totalTimeSeconds],
    ['finalBeverageRatio', plan.finalBeverageRatio],
    ['hotExtractionRatio', plan.hotExtractionRatio],
  ] as const;

  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value)) reasons.push(`${field} is not finite`);
  }
  reasons.push(...validateBrewPlanRatioInvariants(plan));

  if (plan.brewMode === 'iced') {
    if (Math.abs((plan.hotWaterMl + plan.iceMl) - plan.totalWaterMl) > 1) {
      reasons.push('iced hotWaterMl + iceMl must equal totalWaterMl');
    }
    if (!(plan.estimatedCupOutputMl < plan.totalWaterMl)) {
      reasons.push('iced estimatedCupOutputMl must be lower than totalWaterMl');
    }
    const volumeTargetSteps = plan.steps.filter((step) => {
      const kind = step.kind || 'pour';
      return (kind === 'pour' || kind === 'extract') && step.pourVolumeMl > 0;
    });
    const lastVolumeTargetStep = volumeTargetSteps[volumeTargetSteps.length - 1];
    const totalPouredHotWaterMl = volumeTargetSteps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
    if (!lastVolumeTargetStep || Math.abs(lastVolumeTargetStep.targetVolumeMl - plan.hotWaterMl) > 1) {
      reasons.push('iced last hot-water target step must equal hotWaterMl');
    }
    if (Math.abs(totalPouredHotWaterMl - plan.hotWaterMl) > 1) {
      reasons.push('iced pour/extract volume sum must equal hotWaterMl');
    }
  }

  const narrative = [
    plan.summary,
    ...plan.notes,
    ...plan.warnings,
    ...(plan.workflowGuideSteps || []).map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`),
    ...(plan.aiNotes ? Object.values(plan.aiNotes).filter(Boolean) : []),
  ].join('\n');
  const sanitized = sanitizeBrewNarrative(narrative, plan);
  if (sanitized !== narrative && /geisha|gesha|official grind|profil exact|ready[-\s]?brew/i.test(narrative)) {
    reasons.push('stored narrative contains unsafe factual claims');
  }

  const timingValidation = validateBrewPlanTiming(plan);
  if (!timingValidation.allowed && timingValidation.reason) reasons.push(timingValidation.reason);
  const textValidation = validateUserFacingRecipeText(plan);
  if (!textValidation.allowed && textValidation.reason) reasons.push(textValidation.reason);

  if (isLowTrustWater(plan) && /ideal|excellent|ready[-\s]?brew|sangat cocok/i.test(narrative)) {
    reasons.push('low-trust water narrative claims ready-brew status');
  }

  if (plan.grindRecommendation && /Gilingan:\s*setting 4-4[\s\S]*Sumber.*setting 4-5/i.test(plan.grindRecommendation)) {
    reasons.push('conflicting grind display');
  }

  if (plan.workflowValidation && !plan.workflowValidation.passed) {
    reasons.push(`workflow guide failed validation: ${plan.workflowValidation.blockingErrors.join(', ')}`);
  }

  if (plan.methodFamily === 'aeropress' && /final pour|drawdown bed|wall rinse/i.test(narrative)) {
    reasons.push('AeroPress narrative contains pour-over workflow wording');
  }
  if (plan.methodFamily === 'french_press' && /final pour|bloom pour|center-to-mid/i.test(narrative)) {
    reasons.push('French Press narrative contains pour-over workflow wording');
  }
  if (plan.methodFamily === 'moka_pot' && /bloom|final pour|center-to-mid|kettle pour/i.test(narrative)) {
    reasons.push('Moka Pot narrative contains pour-over workflow wording');
  }
  if (plan.methodFamily === 'espresso' && /bloom|kettle|filter wall|final pour|add water/i.test(narrative)) {
    reasons.push('Espresso narrative contains filter-brew workflow wording');
  }
  if (plan.methodFamily === 'cold_brew' && /hot bloom|kettle temperature|hot pour/i.test(narrative)) {
    reasons.push('Cold Brew narrative contains hot workflow wording');
  }

  const blocked = reasons.some((reason) => /not finite|must equal|must be lower|conflicting|workflow guide failed|workflow wording|ratio mismatch|canonical|placeholder|developer copy|mislabeled|vocabulary|starts before/.test(reason));
  return {
    allowed: !blocked,
    risk: reasons.length === 0 ? 'none' : blocked ? 'blocked' : 'medium',
    reason: reasons.join('; ') || undefined,
    safeText: reasons.length ? formatSafeBrewCaveat(plan) : undefined,
  };
}
