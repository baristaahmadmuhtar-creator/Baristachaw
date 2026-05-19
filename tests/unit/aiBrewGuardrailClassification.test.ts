import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('AI Brew real-world gate separates hard failures from honest warnings', () => {
  const script = fs.readFileSync('scripts/ai-brew-real-world-1000.mjs', 'utf8');

  assert.match(script, /function addReason\(reasons, code, severity, message\)/);
  assert.match(script, /severity === 'fail'/);
  assert.match(script, /severity === 'warn'/);

  for (const hardFailureCode of [
    'numeric_nan',
    'numeric_negative',
    'impossible_ratio',
    'iced_split_wrong',
    'method_leak_espresso',
    'water_risk_high_confidence',
    'fallback_grinder_high_confidence',
    'zero_mineral_brew_ready',
  ]) {
    assert.match(script, new RegExp(`${hardFailureCode}[\\s\\S]{0,120}'fail'`), `${hardFailureCode} must stay a hard failure`);
  }

  for (const warningCode of [
    'target mismatch',
    'fallback_grinder_calibration_risk',
    'water_manual_verification_risk',
    'low_mineral_filter_clarity_risk',
    'dark_floral_target_risk',
    'real_brew_validation_pending',
  ]) {
    assert.match(script, new RegExp(`${warningCode}[\\s\\S]{0,180}'warn'`), `${warningCode} must stay an honest warning`);
  }
});
