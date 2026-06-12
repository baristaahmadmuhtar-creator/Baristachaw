import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRealBrewLogEntry,
  calculateExtractionYieldPercent,
  exportRealBrewLogsToCsv,
  exportRealBrewLogsToJson,
  parseRealBrewLogsFromCsv,
  parseRealBrewLogsFromJson,
  validateRealBrewLogEntry,
} from '../../apps/web/src/features/ai-brew/realBrewLogs.ts';
import type { RealBrewLogEntry } from '../../apps/web/src/features/ai-brew/types.ts';

function makeLog(overrides: Partial<RealBrewLogEntry> = {}): RealBrewLogEntry {
  return {
    id: 'real-brew-1',
    planId: 'plan-1',
    fingerprint: 'fingerprint-1',
    createdAt: 1_718_000_000_000,
    updatedAt: 1_718_000_000_000,
    brewDate: '2026-06-12',
    beanName: 'Test Coffee',
    methodFamily: 'v60',
    brewerLabel: 'Hario V60',
    grinderLabel: 'Comandante C40',
    grinderSetting: '24 clicks',
    doseG: 20,
    brewWaterMl: 300,
    beverageOutputG: 255,
    tdsPercent: 1.42,
    extractionYieldPercent: 18.1,
    drawdownSeconds: 210,
    sensory: {
      acidity: 3,
      sweetness: 4,
      body: 3,
      clarity: 4,
      bitterness: 2,
      astringency: 1,
      balance: 4,
      notes: 'Sweet citrus, clean finish',
    },
    water: {
      label: 'Measured custom water',
      tdsPpm: 80,
      ghPpmAsCaCO3: 55,
      khPpmAsCaCO3: 40,
      sourceBacked: true,
      measured: true,
    },
    calibration: {
      grinderId: 'comandante-c40-mk4',
      grinderLabel: 'Comandante C40',
      zeroPointClicks: 0,
      burrTouchOffsetClicks: 0,
      lastDrawdownSeconds: 210,
      lastTasteCorrection: 'none',
      completedAt: 1_718_000_000_000,
      confidence: 'high',
    },
    validation: {
      status: 'validated',
      warnings: [],
    },
    ...overrides,
  };
}

test('real brew log builder stores measured fields without synthesizing sensory proof', () => {
  const entry = buildRealBrewLogEntry({
    planId: 'plan-1',
    fingerprint: 'fingerprint-1',
    beanName: 'Washed Kenya',
    methodFamily: 'v60',
    brewerLabel: 'Hario V60',
    grinderLabel: '1Zpresso K-Ultra',
    doseG: 20,
    brewWaterMl: 300,
    beverageOutputG: 252,
    tdsPercent: 1.45,
    drawdownSeconds: 205,
  });

  assert.equal(entry.validation.status, 'needs_review');
  assert.match(entry.validation.warnings.join('\n'), /sensory sliders are required/i);
  assert.equal(entry.extractionYieldPercent, calculateExtractionYieldPercent(20, 252, 1.45));
});

test('real brew log validation rejects impossible measurements', () => {
  const result = validateRealBrewLogEntry(makeLog({
    doseG: -20,
    brewWaterMl: 300,
    beverageOutputG: 420,
    tdsPercent: 14,
    extractionYieldPercent: 250,
  }));

  assert.equal(result.status, 'blocked');
  assert.match(result.warnings.join('\n'), /dose must be positive/i);
  assert.match(result.warnings.join('\n'), /output mass cannot exceed brew water/i);
  assert.match(result.warnings.join('\n'), /TDS is outside practical brewed-coffee bounds/i);
  assert.match(result.warnings.join('\n'), /extraction yield is outside practical bounds/i);
});

test('real brew log JSON and CSV round-trip validated physical logs only', () => {
  const logs = [makeLog()];
  const json = exportRealBrewLogsToJson(logs);
  const csv = exportRealBrewLogsToCsv(logs);

  const fromJson = parseRealBrewLogsFromJson(json);
  const fromCsv = parseRealBrewLogsFromCsv(csv);

  assert.equal(fromJson.entries.length, 1);
  assert.equal(fromJson.rejected.length, 0);
  assert.equal(fromCsv.entries.length, 1);
  assert.equal(fromCsv.rejected.length, 0);
  assert.equal(fromCsv.entries[0].beanName, 'Test Coffee');
  assert.equal(fromCsv.entries[0].validation.status, 'validated');
});
