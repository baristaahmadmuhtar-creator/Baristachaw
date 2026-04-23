export type QuickRatioAnalysisInput = {
  doseG: number;
  waterMl: number;
  ratio: number;
  tdsPercent?: number;
  outputMl?: number;
};

export type QuickRatioAnalysis = {
  warnings: string[];
  extractionYield: number;
  expectedRatio: number;
};

function roundTo(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function analyzeQuickRatio(input: QuickRatioAnalysisInput): QuickRatioAnalysis {
  const warnings: string[] = [];
  const dose = Number.isFinite(input.doseG) ? input.doseG : 0;
  const water = Number.isFinite(input.waterMl) ? input.waterMl : 0;
  const ratio = Number.isFinite(input.ratio) ? input.ratio : 0;
  const tds = Number.isFinite(input.tdsPercent) ? Number(input.tdsPercent) : 0;
  const output = Number.isFinite(input.outputMl) ? Number(input.outputMl) : 0;

  if (dose <= 0 || water <= 0 || ratio <= 0) {
    warnings.push('Dose, water, and ratio must be greater than 0.');
    return {
      warnings,
      extractionYield: 0,
      expectedRatio: 0,
    };
  }

  const expectedRatio = roundTo(water / dose, 2);
  if (Math.abs(expectedRatio - ratio) > 1.2) {
    warnings.push('Dose, water, and ratio are not aligned. Recheck the target recipe.');
  }

  if (ratio < 1 || ratio > 25) {
    warnings.push('Ratio is outside a practical brewing range.');
  }

  if (tds > 0 && (tds < 1.1 || tds > 1.6)) {
    warnings.push('TDS is outside the common hand-brew range.');
  }

  if (output > 0 && output < dose) {
    warnings.push('Measured output below dry dose is likely invalid.');
  }

  const extractionYield = dose > 0 && output > 0 && tds > 0
    ? roundTo((tds * output) / dose, 2)
    : 0;

  return {
    warnings,
    extractionYield,
    expectedRatio,
  };
}
