import { roundTo } from '../barista-tools/calculations.ts';
import type { AiBrewMethodFamily, BrewPlan, BrewPlanStep } from './types.ts';
import type { AiBrewOptimizationStepPatch } from './planner.ts';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveOptimizationDeltaBounds(methodFamily: AiBrewMethodFamily) {
  switch (methodFamily) {
    case 'espresso':
      return { ratio: 0.25, tempC: 1.5, timeSec: 5 };
    case 'cold_brew':
      return { ratio: 1.2, tempC: 4, timeSec: 3600 };
    case 'batch_brew':
      return { ratio: 0.7, tempC: 2, timeSec: 60 };
    case 'moka_pot':
      return { ratio: 0.35, tempC: 1, timeSec: 15 };
    default:
      return { ratio: 0.25, tempC: 1, timeSec: 10 };
  }
}

export function resolveOptimizationTimeBounds(methodFamily: AiBrewMethodFamily) {
  if (methodFamily === 'cold_brew') return { min: 21600, max: 64800 };
  if (methodFamily === 'espresso') return { min: 20, max: 45 };
  return { min: 75, max: 420 };
}

export function finitePatchNumber(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function clampPatchValue(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string,
  diagnostics: string[],
) {
  if (value === undefined) return fallback;
  const next = clamp(value, min, max);
  if (Math.abs(next - value) > 0.001) {
    diagnostics.push(`${label} clamped from ${roundTo(value, 2)} to ${roundTo(next, 2)}.`);
  }
  return next;
}

export function sanitizeOptimizationControl(value: string | undefined) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 180) return undefined;
  if (/\b(if\s+sour|if\s+bitter|next\s+cup|next\s+brew|optional|to taste|adjust as needed)\b/i.test(normalized)) {
    return undefined;
  }
  if (/\b(?:increase|decrease|raise|lower|coarsen|finer|coarser|change|adjust|bump|drop|reduce)\s+(?:the\s+)?(?:grind|temperature|temp|ratio|dose|water|time)\b/i.test(normalized)) {
    return undefined;
  }
  if (/\d+(?:\.\d+)?\s*(?:ml|g|c|°c|sec|secs|second|seconds|min|mins|minute|minutes)\b|1\s*:\s*\d/i.test(normalized)) {
    return undefined;
  }
  return normalized;
}

export function sanitizeOptimizationPourStyleHint(value: string | undefined) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!normalized) return undefined;
  if (['balanced', 'pulse', 'pulse_light', 'light_pulse', 'gentle'].includes(normalized)) {
    return normalized;
  }
  return undefined;
}

export function sanitizeOptimizationGrindGuidance(value: string | undefined, plan: BrewPlan) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 180) return undefined;
  if (/\b(?:ratio|rasio|dose|dosis|temperature|suhu|temp|water|air)\b/i.test(normalized)) {
    return undefined;
  }
  const explicitSetting = normalized.match(/\bsetting\s*\d+(?:[-.]\d+)?\b/i)?.[0];
  if (explicitSetting && !plan.grindRecommendation.toLowerCase().includes(explicitSetting.toLowerCase())) {
    return undefined;
  }
  return normalized;
}

function buildPourStyleControlCue(plan: BrewPlan, styleHint: string, index: number) {
  const isIndonesian = /[^\x00-\x7F]|tuang|jaga|ringan|seduh/i.test(styleHint);
  const first = index === 0;
  if (styleHint === 'pulse' || styleHint === 'pulse_light' || styleHint === 'light_pulse') {
    return isIndonesian
      ? first
        ? 'Pulse ringan: basahi bed merata tanpa agitasi besar.'
        : 'Pulse ringan: tuang pendek, stabil, dan tunggu slurry turun sedikit.'
      : first
        ? 'Light pulse: wet the bed evenly without heavy agitation.'
        : 'Light pulse: pour short and steady, then let the slurry settle slightly.';
  }
  if (styleHint === 'gentle') {
    return isIndonesian
      ? first
        ? 'Halus: tuang rendah dan lembut agar bed tidak pecah.'
        : 'Halus: jaga aliran tipis, pusatkan pour, dan hindari bypass.'
      : first
        ? 'Gentle: pour low and soft so the bed stays intact.'
        : 'Gentle: keep a thin centered stream and avoid bypass.';
  }
  return plan.brewMode === 'iced'
    ? isIndonesian
      ? 'Seimbang: jaga konsentrat panas stabil di atas es terukur.'
      : 'Balanced: keep the hot concentrate stable over measured ice.'
    : isIndonesian
      ? 'Seimbang: jaga flow stabil dan bed tetap rata.'
      : 'Balanced: keep flow steady and the bed even.';
}

export function buildStyleHintStepPatches(plan: BrewPlan, styleHint: string | undefined) {
  if (!styleHint) return [];
  return plan.steps.map((step, index) => ({
    stepId: step.id,
    index: index + 1,
    control: buildPourStyleControlCue(plan, styleHint, index),
  }));
}

export function resolveStepPatch(patches: AiBrewOptimizationStepPatch[], step: BrewPlanStep, index: number) {
  return patches.find((patch) => {
    if (patch.stepId && patch.stepId === step.id) return true;
    const rawIndex = finitePatchNumber(patch.index);
    if (rawIndex === undefined) return false;
    return Math.round(rawIndex) === index + 1 || Math.round(rawIndex) === index;
  });
}
