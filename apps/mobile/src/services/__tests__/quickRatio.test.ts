import { analyzeQuickRatio } from '@baristaclaw/shared';

describe('analyzeQuickRatio', () => {
  test('returns expected ratio and extraction yield for valid inputs', () => {
    const result = analyzeQuickRatio({
      doseG: 18,
      waterMl: 300,
      ratio: 16.67,
      tdsPercent: 1.35,
      outputMl: 250,
    });

    expect(result.expectedRatio).toBeCloseTo(16.67, 2);
    expect(result.extractionYield).toBeCloseTo(18.75, 2);
    expect(result.warnings).toHaveLength(0);
  });

  test('emits warnings for inconsistent recipe values', () => {
    const result = analyzeQuickRatio({
      doseG: 18,
      waterMl: 300,
      ratio: 10,
      tdsPercent: 0.8,
      outputMl: 10,
    });

    expect(result.warnings).toContain('Dose, water, and ratio are not aligned. Recheck the target recipe.');
    expect(result.warnings).toContain('TDS is outside the common hand-brew range.');
    expect(result.warnings).toContain('Measured output below dry dose is likely invalid.');
  });
});
