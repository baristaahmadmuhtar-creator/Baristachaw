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

function replaceConflictingGrind(markdown: string, plan: BrewPlan) {
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

  if (!/kalibrasi dengan drawdown dan rasa|calibrate by drawdown and taste/i.test(output)) {
    output += '\n\nSetting grinder adalah titik awal. Kalibrasi dengan drawdown dan rasa.';
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

function appendIcedOutputVocabulary(markdown: string, plan: BrewPlan) {
  if (plan.brewMode !== 'iced') return markdown;
  if (/total input/i.test(markdown) && /hot water|air panas/i.test(markdown) && /estimasi hasil|estimated cup/i.test(markdown)) {
    return markdown;
  }
  return [
    markdown,
    '',
    `Total input: ${plan.totalWaterMl} ml (${plan.hotWaterMl} ml air panas + ${plan.iceMl} g es).`,
    `Estimasi hasil cangkir setelah retensi kopi: ±${plan.estimatedCupOutputMl} ml.`,
  ].join('\n');
}

export function sanitizeAiCoachMarkdown(params: {
  action: CoachAction;
  markdown: string;
  plan: BrewPlan;
}): {
  markdown: string;
  risk: CoachRisk;
  replacements: string[];
} {
  let markdown = normalizeText(params.markdown || '');
  let risk: CoachRisk = 'none';
  const replacements: string[] = [];

  const sanitizedNarrative = sanitizeBrewNarrative(markdown, params.plan);
  if (sanitizedNarrative !== markdown) {
    markdown = sanitizedNarrative;
    replacements.push('brew_narrative');
    risk = maxRisk(risk, 'medium');
  }

  if (!isExplicitGeishaVariety(params.plan.variety) && /\b(?:geisha|gesha)\b/i.test(markdown)) {
    markdown = markdown.replace(/\b(?:geisha|gesha)\b/gi, 'kopi ini');
    replacements.push('geisha_claim');
    risk = maxRisk(risk, 'medium');
  }

  const numberGuard = replaceConflictingNumbers(markdown, params.plan);
  markdown = numberGuard.markdown;
  risk = maxRisk(risk, numberGuard.risk);
  replacements.push(...numberGuard.replacements);

  const grindGuard = replaceConflictingGrind(markdown, params.plan);
  markdown = grindGuard.markdown;
  risk = maxRisk(risk, grindGuard.risk);
  replacements.push(...grindGuard.replacements);

  if (params.plan.waterPresetStatus === 'manual_required' || !params.plan.waterIsBrewReady) {
    if (/\b(?:ideal water|air ideal|excellent water|ready brew|brew-ready)\b/i.test(markdown)) {
      markdown = markdown.replace(/\b(?:ideal water|air ideal|excellent water|ready brew|brew-ready)\b/gi, 'air perlu verifikasi mineral');
      replacements.push('water_claim');
      risk = maxRisk(risk, 'medium');
    }
  }

  if (params.plan.deviceProfileMode !== 'exact' && /\b(?:profil exact|exact profile)\b/i.test(markdown)) {
    markdown = markdown.replace(/\b(?:profil exact|exact profile)\b/gi, params.plan.deviceProfileMode === 'family_fallback' ? 'butuh kalibrasi' : 'profil turunan');
    replacements.push('brewer_profile_claim');
    risk = maxRisk(risk, 'medium');
  }

  if (hasUnsafeExtraWater(markdown, params.plan)) {
    replacements.push('unsafe_extra_water');
    risk = maxRisk(risk, 'high');
  }

  if (params.action === 'troubleshoot' && !/Mulai dari perubahan terkecil dulu/i.test(markdown)) {
    markdown = `Mulai dari perubahan terkecil dulu.\n\n${markdown}`;
    replacements.push('troubleshoot_order_note');
    risk = maxRisk(risk, 'low');
  }

  if (params.action === 'explain' && !/Catatan sumber data|source data/i.test(markdown)) {
    const caveat = formatSafeBrewCaveat(params.plan);
    if (caveat) {
      markdown += `\n\n### Catatan sumber data\n${caveat.split('\n').map((line) => `- ${line}`).join('\n')}`;
      replacements.push('source_caveat');
      risk = maxRisk(risk, 'low');
    }
  }

  markdown = appendIcedOutputVocabulary(markdown, params.plan);

  return {
    markdown,
    risk,
    replacements: Array.from(new Set(replacements)),
  };
}
