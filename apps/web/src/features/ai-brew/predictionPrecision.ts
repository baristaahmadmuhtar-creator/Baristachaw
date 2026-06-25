import type {
  AiBrewReadinessScores,
  AiBrewScoreConfidence,
  BeanCoverageCategory,
  MethodWorkflowValidationResult,
} from './types.ts';

export type PredictionPrecisionBand = 'high' | 'strong' | 'baseline' | 'blocked';

export interface PredictionPrecisionInput {
  readinessScores: AiBrewReadinessScores;
  beanCoverage: {
    category: BeanCoverageCategory;
    confidence: AiBrewScoreConfidence;
  };
  expectedCupConfidence: AiBrewScoreConfidence;
  workflowStatus: MethodWorkflowValidationResult['status'];
  switchValidationStatus?: 'blocked' | 'caution' | 'safe';
  switchRecoveryApplied?: boolean;
  guardrailErrorCount: number;
}

export interface PredictionPrecisionResult {
  score: number;
  band: PredictionPrecisionBand;
}

const BEAN_COVERAGE_CAP: Record<BeanCoverageCategory, number> = {
  known_high: 100,
  partial_medium: 82,
  unknown_fallback: 64,
  risk_caution: 54,
  unsupported_unsafe: 39,
};

const CUP_CONFIDENCE_CAP: Record<AiBrewScoreConfidence, number> = {
  high: 100,
  medium: 86,
  low: 69,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildPredictionPrecision(input: PredictionPrecisionInput): PredictionPrecisionResult {
  const weightedScore = (
    input.readinessScores.recipe * 0.25
    + input.readinessScores.water * 0.15
    + input.readinessScores.grinder * 0.15
    + input.readinessScores.workflow * 0.25
    + input.readinessScores.catalog * 0.2
  );

  let score = Math.min(
    weightedScore,
    BEAN_COVERAGE_CAP[input.beanCoverage.category],
    CUP_CONFIDENCE_CAP[input.expectedCupConfidence],
  );

  if (input.workflowStatus === 'needs_review') score = Math.min(score, 69);
  
  if (input.workflowStatus === 'blocked') {
    if (input.switchRecoveryApplied && input.switchValidationStatus !== 'blocked') {
      // Bypass 39 hard-cap if Hario Switch safely recovered
    } else {
      score = Math.min(score, 39);
    }
  }
  
  if (input.switchValidationStatus === 'blocked') score = Math.min(score, 39);
  if (input.switchValidationStatus === 'caution') score = Math.min(score, 69);

  if (input.guardrailErrorCount > 0) {
    score = Math.min(score - (input.guardrailErrorCount * 8), 39);
  }

  const normalizedScore = clampScore(score);
  const band: PredictionPrecisionBand = normalizedScore >= 88
    ? 'high'
    : normalizedScore >= 76
      ? 'strong'
      : normalizedScore >= 40
        ? 'baseline'
        : 'blocked';

  return { score: normalizedScore, band };
}
