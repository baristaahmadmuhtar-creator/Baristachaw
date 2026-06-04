import type { BrewPlan } from './types';
import { formatSafeBrewCaveat, isExplicitGeishaVariety, sanitizeBrewNarrative } from './antiHallucination';

export type CoachAction =
  | 'explain'
  | 'troubleshoot'
  | 'adjust'
  | 'sequence'
  | 'sop'
  | 'optimization';

type CoachRisk = 'none' | 'low' | 'medium' | 'high';

const NUMBER_CONTEXTS = [
  { key: 'dose', labels: ['dose', 'dosis'], unit: '(?:g|gram)', getValue: (plan: BrewPlan) => plan.doseG },
  { key: 'totalWater', labels: ['total input', 'total water', 'total air', 'air total'], unit: '(?:ml|g)?', getValue: (plan: BrewPlan) => plan.totalWaterMl },
  { key: 'hotWater', labels: ['hot water', 'air panas'], unit: '(?:ml|g)?', getValue: (plan: BrewPlan) => plan.hotWaterMl },
  { key: 'ice', labels: ['ice', 'es'], unit: '(?:ml|g)?', getValue: (plan: BrewPlan) => plan.iceMl },
  { key: 'temperature', labels: ['temperature', 'suhu', 'temp'], unit: '(?:°?c|c)?', getValue: (plan: BrewPlan) => plan.waterTempC },
] as const;

function normalizeText(value: string) {
  return value.replace(/\r\n/g, '\n');
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function riskRank(risk: CoachRisk) {
  switch (risk) {
    case 'none': return 0;
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
  }
}

function maxRisk(current: CoachRisk, next: CoachRisk): CoachRisk {
  return riskRank(next) > riskRank(current) ? next : current;
}

function isIndonesianCoachLanguage(language?: string) {
  return !language || String(language).toLowerCase().startsWith('id');
}

function primaryGrindToken(plan: BrewPlan) {
  const recommendation = plan.grindRecommendation || plan.grindSettingReference || '';
  const settingMatch = recommendation.match(/setting\s*\d+(?:[-.]\d+)?/i);
  if (settingMatch) return settingMatch[0].replace(/\s+/g, ' ').trim();
  const numberMatch = recommendation.match(/\b\d+(?:\.\d+)?\s*(?:clicks?|numbers?|setting|settings)\b/i);
  return numberMatch?.[0]?.trim() || plan.grindSettingReference || '';
}

function replaceConflictingNumbers(markdown: string, plan: BrewPlan) {
  let output = markdown;
  let risk: CoachRisk = 'none';
  const replacements: string[] = [];

  for (const context of NUMBER_CONTEXTS) {
    const expected = Math.round(context.getValue(plan));
    if (!Number.isFinite(expected)) continue;
    for (const label of context.labels) {
      const pattern = new RegExp(`(${escapeRegex(label)}[^\\n]{0,28}?)(\\d+(?:[.,]\\d+)?)\\s*${context.unit}`, 'gi');
      output = output.replace(pattern, (match, prefix: string, rawValue: string) => {
        const parsed = Number(String(rawValue).replace(',', '.'));
        if (!Number.isFinite(parsed) || Math.abs(Math.round(parsed) - expected) <= 1) return match;
        risk = maxRisk(risk, 'high');
        replacements.push(`${context.key}:${rawValue}->${expected}`);
        return `${prefix}${formatValue(expected)}${context.key === 'temperature' ? '°C' : context.key === 'dose' ? ' g' : ' ml'}`;
      });
    }
  }

  const ratioValues = [plan.finalBeverageRatio, plan.hotExtractionRatio]
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.round(value * 10) / 10);
  output = output.replace(/\b1\s*:\s*(\d+(?:[.,]\d+)?)\b/g, (match, rawRatio: string) => {
    const parsed = Number(rawRatio.replace(',', '.'));
    if (!Number.isFinite(parsed)) return match;
    if (ratioValues.some((value) => Math.abs(value - parsed) <= 0.3)) return match;
    risk = maxRisk(risk, 'high');
    replacements.push(`ratio:${rawRatio}->planner`);
    return `1:${formatValue(plan.finalBeverageRatio)}`;
  });

  return { markdown: output, risk, replacements };
}

function replaceConflictingGrind(markdown: string, plan: BrewPlan, language?: string) {
  const primary = primaryGrindToken(plan);
  if (!primary) return { markdown, risk: 'none' as CoachRisk, replacements: [] as string[] };

  let output = markdown;
  let risk: CoachRisk = 'none';
  const replacements: string[] = [];
  const grindPattern = /\b(?:setting\s*\d+(?:[-.]\d+)?|\d+(?:\.\d+)?\s*(?:clicks?|numbers?|settings?))\b/gi;
  output = output.replace(grindPattern, (match) => {
    if (plan.grindRecommendation.toLowerCase().includes(match.toLowerCase())) return match;
    risk = maxRisk(risk, 'medium');
    replacements.push(`grind:${match}->${primary}`);
    return primary;
  });

  if (!/kalibrasi dengan (?:air turun|drawdown) dan rasa|calibrate by drawdown and taste/i.test(output)) {
    output += isIndonesianCoachLanguage(language)
      ? '\n\nSetelan grinder adalah titik awal. Kalibrasi dengan air turun dan rasa.'
      : '\n\nThe grinder setting is a starting point. Calibrate by drawdown and taste.';
    replacements.push('grind_calibration_note');
    risk = maxRisk(risk, 'low');
  }

  return { markdown: output, risk, replacements };
}

function hasUnsafeExtraWater(markdown: string, plan: BrewPlan) {
  if (plan.brewMode !== 'iced') return false;
  const planAllowsBypass = plan.steps.some((step) => /bypass|top[-\s]?up|tambah air/i.test(`${step.label} ${step.note} ${step.hybridInstruction || ''}`));
  return !planAllowsBypass && /\b(?:top[-\s]?up|bypass|add extra water|tambah air|air tambahan)\b/i.test(markdown);
}

function appendIcedOutputVocabulary(markdown: string, plan: BrewPlan, language?: string) {
  if (plan.brewMode !== 'iced') return markdown;
  if (/total input/i.test(markdown) && /hot water|air panas/i.test(markdown) && /estimasi hasil|estimated cup/i.test(markdown)) {
    return markdown;
  }
  if (!isIndonesianCoachLanguage(language)) {
    return [
      markdown,
      '',
      `Total input: ${plan.totalWaterMl} ml (${plan.hotWaterMl} ml hot water + ${plan.iceMl} g ice).`,
      `Estimated cup output after coffee retention: ±${plan.estimatedCupOutputMl} ml.`,
    ].join('\n');
  }
  return [
    markdown,
    '',
    `Total input: ${plan.totalWaterMl} ml (${plan.hotWaterMl} ml air panas + ${plan.iceMl} g es).`,
    `Estimasi hasil cangkir setelah retensi kopi: ±${plan.estimatedCupOutputMl} ml.`,
  ].join('\n');
}

function removeInstructionInjectionLanguage(markdown: string) {
  let output = markdown;
  const replacements: string[] = [];
  const patterns = [
    /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?\b/gi,
    /\babaikan\s+(?:semua\s+)?instruksi\s+(?:sebelumnya|di atas)\b/gi,
    /\b(?:system|developer)\s+prompt\b/gi,
    /\b(?:system|developer)\s+instructions?\b/gi,
    /\binstruksi\s+(?:sistem|developer|pengembang)\b/gi,
  ];

  for (const pattern of patterns) {
    if (pattern.test(output)) {
      output = output.replace(pattern, 'input bean tidak tepercaya');
      replacements.push('instruction_injection');
    }
  }

  return { markdown: output, replacements };
}

function enforceCoachAdjustmentContract(markdown: string, action: CoachAction, language?: string) {
  if (action !== 'troubleshoot' && action !== 'adjust') {
    return { markdown, risk: 'none' as CoachRisk, replacements: [] as string[] };
  }
  let output = markdown;
  let risk: CoachRisk = 'none';
  const replacements: string[] = [];
  const id = isIndonesianCoachLanguage(language);

  if (/\b(?:ubah|ganti|naikkan|turunkan|increase|decrease|change|raise|lower)\b[^.\n]{0,42}\b(?:rasio|ratio|dosis|dose)\b/i.test(output)) {
    output = output.replace(
      /\b(?:ubah|ganti|naikkan|turunkan|increase|decrease|change|raise|lower)\b[^.\n]{0,42}\b(?:rasio|ratio|dosis|dose)\b[^\n.]*/gi,
      id
        ? 'Jangan ubah rasio/dosis dari plan ini; mulai dari koreksi grind kecil, pouring/agitation, lalu suhu kecil'
        : 'Do not change ratio or dose in this plan; start with a small grind move, pour/agitation control, then a small temperature change',
    );
    risk = maxRisk(risk, 'medium');
    replacements.push('ratio_dose_adjustment_blocked');
  }

  if (!/grind kecil|pouring\/agitation|agitasi|suhu kecil/i.test(output)) {
    output += id
      ? [
          '',
          'Urutan koreksi: 1) grind kecil, 2) pouring/agitation, 3) suhu kecil.',
          'Jangan ubah rasio/dosis pada seduhan ini.',
        ].join('\n')
      : [
          '',
          'Correction order: 1) small grind move, 2) pour/agitation control, 3) small temperature change.',
          'Do not change ratio or dose for this brew.',
        ].join('\n');
    risk = maxRisk(risk, 'low');
    replacements.push('coach_adjustment_order');
  }

  return { markdown: output, risk, replacements };
}

export function sanitizeAiCoachMarkdown(params: {
  action: CoachAction;
  markdown: string;
  plan: BrewPlan;
  language?: string;
}): {
  markdown: string;
  risk: CoachRisk;
  replacements: string[];
} {
  let markdown = normalizeText(params.markdown || '');
  let risk: CoachRisk = 'none';
  const replacements: string[] = [];

  const sanitizedNarrative = sanitizeBrewNarrative(markdown, params.plan, params.language);
  if (sanitizedNarrative !== markdown) {
    markdown = sanitizedNarrative;
    replacements.push('brew_narrative');
    risk = maxRisk(risk, 'medium');
  }

  if (!isExplicitGeishaVariety(params.plan.variety) && /\b(?:geisha|gesha)\b/i.test(markdown)) {
    markdown = markdown.replace(/\b(?:geisha|gesha)\b/gi, isIndonesianCoachLanguage(params.language) ? 'kopi ini' : 'this coffee');
    replacements.push('geisha_claim');
    risk = maxRisk(risk, 'medium');
  }

  const injectionGuard = removeInstructionInjectionLanguage(markdown);
  if (injectionGuard.replacements.length > 0) {
    markdown = injectionGuard.markdown;
    replacements.push(...injectionGuard.replacements);
    risk = maxRisk(risk, 'high');
  }

  const numberGuard = replaceConflictingNumbers(markdown, params.plan);
  markdown = numberGuard.markdown;
  risk = maxRisk(risk, numberGuard.risk);
  replacements.push(...numberGuard.replacements);

  const grindGuard = replaceConflictingGrind(markdown, params.plan, params.language);
  markdown = grindGuard.markdown;
  risk = maxRisk(risk, grindGuard.risk);
  replacements.push(...grindGuard.replacements);

  if (params.plan.waterPresetStatus === 'manual_required' || !params.plan.waterIsBrewReady) {
    if (/\b(?:ideal water|air ideal|excellent water|ready brew|brew-ready)\b/i.test(markdown)) {
      markdown = markdown.replace(
        /\b(?:ideal water|air ideal|excellent water|ready brew|brew-ready)\b/gi,
        isIndonesianCoachLanguage(params.language) ? 'air perlu verifikasi mineral' : 'water needs mineral verification',
      );
      replacements.push('water_claim');
      risk = maxRisk(risk, 'medium');
    }
  }

  if (params.plan.deviceProfileMode !== 'exact' && /\b(?:profil exact|exact profile)\b/i.test(markdown)) {
    markdown = markdown.replace(
      /\b(?:profil exact|exact profile)\b/gi,
      params.plan.deviceProfileMode === 'family_fallback'
        ? (isIndonesianCoachLanguage(params.language) ? 'butuh kalibrasi' : 'needs calibration')
        : (isIndonesianCoachLanguage(params.language) ? 'profil turunan' : 'derived profile'),
    );
    replacements.push('brewer_profile_claim');
    risk = maxRisk(risk, 'medium');
  }

  if (hasUnsafeExtraWater(markdown, params.plan)) {
    replacements.push('unsafe_extra_water');
    risk = maxRisk(risk, 'high');
  }

  const coachContract = enforceCoachAdjustmentContract(markdown, params.action, params.language);
  markdown = coachContract.markdown;
  risk = maxRisk(risk, coachContract.risk);
  replacements.push(...coachContract.replacements);

  if (params.action === 'troubleshoot' && !/Mulai dari perubahan terkecil dulu|Start with the smallest change first/i.test(markdown)) {
    markdown = isIndonesianCoachLanguage(params.language)
      ? `Mulai dari perubahan terkecil dulu.\n\n${markdown}`
      : `Start with the smallest change first.\n\n${markdown}`;
    replacements.push('troubleshoot_order_note');
    risk = maxRisk(risk, 'low');
  }

  if (params.action === 'explain' && !/Catatan sumber data|source data/i.test(markdown)) {
    const caveat = formatSafeBrewCaveat(params.plan, params.language);
    if (caveat) {
      const heading = isIndonesianCoachLanguage(params.language) ? 'Catatan sumber data' : 'Source Data Notes';
      markdown += `\n\n### ${heading}\n${caveat.split('\n').map((line) => `- ${line}`).join('\n')}`;
      replacements.push('source_caveat');
      risk = maxRisk(risk, 'low');
    }
  }

  markdown = appendIcedOutputVocabulary(markdown, params.plan, params.language);

  return {
    markdown,
    risk,
    replacements: Array.from(new Set(replacements)),
  };
}
