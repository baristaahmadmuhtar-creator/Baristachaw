import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRE_PHYSICAL_LOGS = process.argv.includes('--require-physical-logs');

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function has(file, pattern) {
  if (!existsSync(path.join(ROOT, file))) return false;
  const content = read(file);
  return pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern);
}

function bucket(id, label, checks) {
  const passed = checks.filter((check) => check.ok).length;
  const score = checks.length === 0 ? 0 : Number((passed / checks.length * 9.9).toFixed(1));
  return {
    id,
    label,
    score,
    passed,
    total: checks.length,
    failedChecks: checks.filter((check) => !check.ok).map((check) => check.label),
  };
}

const presetData = JSON.parse(read('apps/web/public/data/ai-brew/manual-brew-presets.v2026-06.json'));
const manualPresets = Array.isArray(presetData) ? presetData : presetData.items || presetData.presets || [];
const tetsuTen = manualPresets.find((preset) => preset.id === 'inspired-tetsu-kasuya-2026-ten-pour');

const buckets = [
  bucket('recipe_arithmetic', 'Recipe arithmetic', [
    { label: 'strict plan integrity unit tests exist', ok: existsSync(path.join(ROOT, 'tests/unit/aiBrewPlanIntegrity.test.ts')) },
    { label: 'validator blocks non-finite step values', ok: has('apps/web/src/features/ai-brew/antiHallucination.ts', 'steps[${index}].${field} is not finite') },
    { label: 'validator blocks negative values', ok: has('apps/web/src/features/ai-brew/antiHallucination.ts', 'cannot be negative') },
    { label: 'validator blocks non-monotonic targets', ok: has('apps/web/src/features/ai-brew/antiHallucination.ts', 'cumulative target must be monotonic') },
    { label: 'validator blocks dropped source step ids', ok: has('apps/web/src/features/ai-brew/antiHallucination.ts', 'workflow guide missing source step') },
    { label: 'Tetsu 10x preset has explicit pour metadata', ok: tetsuTen?.targetDefaults?.presetPourCount === 10 },
  ]),
  bucket('language_quality', 'Bahasa ID/EN quality', [
    { label: 'manual preset ID/EN audit is in i18n script', ok: has('package.json', 'aiBrewManualBrewPresets.test.ts') },
    { label: 'onboarding ID brewer copy is present', ok: has('apps/web/src/components/onboarding/FirstRunOnboarding.tsx', 'Alat seduh tidak ada? Tulis model alat seduh Anda') },
    { label: 'onboarding EN brewer copy is present', ok: has('apps/web/src/components/onboarding/FirstRunOnboarding.tsx', 'Brewer not listed? Enter your brewer model') },
    { label: 'real brew ID copy is present', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'Catat bukti seduh fisik terpisah dari prediksi software') },
    { label: 'real brew EN copy is present', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'Record physical brew evidence separately from software prediction') },
  ]),
  bucket('source_fidelity', 'Source fidelity / anti-hallucination', [
    { label: 'Tetsu 10x remains curated reference', ok: tetsuTen?.verificationLevel === 'curated_reference' },
    { label: 'Tetsu 10x is not falsely official', ok: tetsuTen?.verificationLevel !== 'official_reference' },
    { label: 'Tetsu 10x keeps source URLs', ok: Array.isArray(tetsuTen?.sourceUrls) && tetsuTen.sourceUrls.length > 0 },
    { label: 'real brew helper blocks synthesized physical proof', ok: has('apps/web/src/features/ai-brew/realBrewLogs.ts', 'sensory sliders are required before this counts as physical cup evidence') },
    { label: 'real brew import rejects blocked logs', ok: has('apps/web/src/features/ai-brew/realBrewLogs.ts', "entry.validation.status === 'blocked'") },
  ]),
  bucket('grinder_calibration', 'Grinder calibration', [
    { label: 'GrinderCalibrationProfile public type exists', ok: has('apps/web/src/features/ai-brew/types.ts', 'export interface GrinderCalibrationProfile') },
    { label: 'Advanced Brew calibration UI exists', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'data-testid="ai-brew-grinder-calibration"') },
    { label: 'zero-point field exists', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'data-testid="ai-brew-grinder-zero-point"') },
    { label: 'burr offset field exists', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'data-testid="ai-brew-grinder-burr-offset"') },
    { label: 'drawdown field exists', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'data-testid="ai-brew-grinder-drawdown"') },
    { label: 'confidence upgrade requires complete calibration', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'grinderCalibrationComplete') },
  ]),
  bucket('water_verification', 'Water practical accuracy', [
    { label: 'RealBrewMeasurement public type exists', ok: has('apps/web/src/features/ai-brew/types.ts', 'export interface RealBrewMeasurement') },
    { label: 'GH uses ppm as CaCO3', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'GH ${plan.waterMinerals.hardnessPpm} ppm as CaCO3') },
    { label: 'KH uses ppm as CaCO3', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'KH ${plan.waterMinerals.alkalinityPpm} ppm as CaCO3') },
    { label: 'water source-backed flag is stored', ok: has('apps/web/src/features/ai-brew/realBrewLogs.ts', 'sourceBacked') },
    { label: 'unknown water cannot validate physical evidence silently', ok: has('apps/web/src/features/ai-brew/realBrewLogs.ts', 'water requires measured or source-backed mineral evidence') },
  ]),
  bucket('ui_ux_accessibility', 'UI/UX/accessibility guard surface', [
    { label: 'onboarding uses BaristaChaw logo', ok: has('apps/web/src/components/onboarding/FirstRunOnboarding.tsx', 'data-testid="onboarding-logo"') },
    { label: 'onboarding native select removed by regression', ok: has('tests/unit/aiBrewAnnotationRegression.test.ts', 'custom equipment pickers') },
    { label: 'AI Brew picker applies keyboard scroll padding', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'scrollPaddingBottom') },
    { label: 'process category chips remain shrink-0', ok: has('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'data-testid="ai-brew-process-category-chips"') },
  ]),
];

const physicalLogsProvided = false;
const failed = buckets.filter((item) => item.score < 9.9);

console.log('AI Brew 9.9 readiness buckets');
for (const item of buckets) {
  console.log(`- ${item.label}: ${item.score.toFixed(1)}/9.9 (${item.passed}/${item.total})`);
  for (const failedCheck of item.failedChecks) {
    console.log(`  missing: ${failedCheck}`);
  }
}
console.log(`- Real cup/sensory evidence: ${physicalLogsProvided ? 'provided' : 'pending physical brew logs'}`);

if (failed.length > 0) {
  process.exitCode = 1;
}

if (REQUIRE_PHYSICAL_LOGS && !physicalLogsProvided) {
  console.error('Physical real-brew logs are required but were not supplied.');
  process.exitCode = 1;
}
