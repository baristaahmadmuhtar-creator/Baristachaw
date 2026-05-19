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

export function formatSafeBrewCaveat(plan: BrewPlan): string {
  const caveats: string[] = [];
  if (!isExplicitGeishaVariety(plan.variety)) {
    caveats.push('Data varietas belum dikunci; sistem tidak akan mengarang varietas.');
  }
  if (isUnknownValue(plan.process)) {
    caveats.push('Data proses belum dikunci; resep memakai baseline roast level dan target profil.');
  }
  if (isLowTrustWater(plan)) {
    caveats.push('Air ini rendah mineral atau butuh input manual; gunakan sebagai base remineralisasi atau isi mineral manual.');
  }
  if (plan.grindSettingVerification !== 'official') {
    caveats.push('Setting grinder adalah titik awal; kalibrasi dengan drawdown dan rasa.');
  }
  if (!brewerIsExact(plan)) {
    caveats.push('Profil alat ini turunan/eksperimental; lakukan kalibrasi rasa.');
  }
  return caveats.join('\n');
}

export function sanitizeBrewNarrative(text: string, plan: BrewPlan): string {
  let output = String(text || '');
  if (!output.trim()) return output;

  if (!isExplicitGeishaVariety(plan.variety)) {
    output = output.replace(GEISHA_PATTERN, 'kopi ini');
  }

  if (isUnknownValue(plan.process)) {
    output = output.replace(PROCESS_FACT_PATTERN, 'proses belum dikunci');
  }

  output = output.replace(ORIGIN_DETAIL_LINE_PATTERN, 'Catatan asal detail belum dikunci di planner.');

  if (isLowTrustWater(plan)) {
    output = output.replace(READY_WATER_CLAIM_PATTERN, 'butuh verifikasi mineral');
    if (!/rendah mineral|manual|required|remineral/i.test(output)) {
      output += `\n\n${formatSafeBrewCaveat(plan).split('\n').find((line) => /air/i.test(line)) || 'Air perlu diverifikasi manual sebelum dianggap siap seduh.'}`;
    }
  }

  if (plan.grindSettingVerification !== 'official') {
    output = output.replace(OFFICIAL_GRINDER_CLAIM_PATTERN, 'referensi grinder curated');
  }

  if (!brewerIsExact(plan)) {
    const label = plan.deviceProfileMode === 'family_fallback' ? 'Butuh kalibrasi' : 'Profil turunan';
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

  const blocked = reasons.some((reason) => /not finite|must equal|must be lower|conflicting|workflow guide failed|workflow wording/.test(reason));
  return {
    allowed: !blocked,
    risk: reasons.length === 0 ? 'none' : blocked ? 'blocked' : 'medium',
    reason: reasons.join('; ') || undefined,
    safeText: reasons.length ? formatSafeBrewCaveat(plan) : undefined,
  };
}
