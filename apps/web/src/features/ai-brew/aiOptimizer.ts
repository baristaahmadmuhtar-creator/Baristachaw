import type { AiBrewOptimizationPatch, AiBrewOptimizationStepPatch } from './planner.ts';

function normalizeJsonCandidate(raw: string) {
  const trimmed = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return '';
  return trimmed.slice(start, end + 1);
}

function finiteNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeStepPatch(raw: unknown): AiBrewOptimizationStepPatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const index = finiteNumber(source.index ?? source.stepIndex ?? source.step);
  const startSeconds = finiteNumber(source.startSeconds ?? source.timeSeconds ?? source.start);
  const pourVolumeMl = finiteNumber(source.pourVolumeMl ?? source.pourMl ?? source.pour);
  const control = typeof source.control === 'string'
    ? source.control
    : typeof source.instruction === 'string'
      ? source.instruction
      : typeof source.note === 'string'
        ? source.note
        : undefined;
  const stepId = typeof source.stepId === 'string' ? source.stepId : undefined;
  if (
    index === undefined
    && startSeconds === undefined
    && pourVolumeMl === undefined
    && !control
    && !stepId
  ) {
    return null;
  }
  return {
    index,
    stepId,
    startSeconds,
    pourVolumeMl,
    control,
  };
}

export function parseAiBrewOptimizationPatch(raw: string | null | undefined): AiBrewOptimizationPatch | null {
  if (!raw?.trim()) return null;

  try {
    const parsed = JSON.parse(normalizeJsonCandidate(raw)) as Record<string, unknown>;
    const source = (parsed.optimization && typeof parsed.optimization === 'object')
      ? parsed.optimization as Record<string, unknown>
      : parsed;
    const rawSteps = Array.isArray(source.steps)
      ? source.steps
      : Array.isArray(source.stepTargets)
        ? source.stepTargets
        : Array.isArray(source.stepPatches)
          ? source.stepPatches
          : [];
    const steps = rawSteps
      .map(normalizeStepPatch)
      .filter((step): step is AiBrewOptimizationStepPatch => Boolean(step));

    return {
      reason: typeof source.reason === 'string' ? source.reason : undefined,
      confidence: finiteNumber(source.confidence),
      recommendedRatio: finiteNumber(source.recommendedRatio ?? source.finalBeverageRatio ?? source.ratio),
      waterTempC: finiteNumber(source.waterTempC ?? source.temperatureC ?? source.tempC),
      totalTimeSeconds: finiteNumber(source.totalTimeSeconds ?? source.brewTimeSeconds ?? source.timeSeconds),
      hotWaterSharePercent: finiteNumber(source.hotWaterSharePercent ?? source.hotSharePercent),
      steps,
    };
  } catch {
    return null;
  }
}
