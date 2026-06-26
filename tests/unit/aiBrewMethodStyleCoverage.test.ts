import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

const REQUIRED_METHOD_STYLE_SCRIPTS = [
  'test:ai-brew:method-styles',
  'test:ai-brew:method-style-matrix',
  'test:ai-brew:method-style-guides',
  'test:ai-brew:method-style-language',
  'test:ai-brew:method-style-ui',
  'test:ai-brew:method-style-report',
  'test:ai-brew:v60-styles',
  'test:ai-brew:switch-styles',
  'test:ai-brew:chemex-styles',
  'test:ai-brew:flatbottom-styles',
  'test:ai-brew:origami-styles',
  'test:ai-brew:clever-styles',
  'test:ai-brew:aeropress-styles',
  'test:ai-brew:french-press-styles',
  'test:ai-brew:espresso-styles',
  'test:ai-brew:moka-styles',
  'test:ai-brew:cold-brew-styles',
  'test:ai-brew:batch-brew-styles',
  'test:ai-brew:siphon-styles',
];

test('AI Brew method-style audit commands are available', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const scriptName of REQUIRED_METHOD_STYLE_SCRIPTS) {
    assert.equal(typeof packageJson.scripts?.[scriptName], 'string', `${scriptName} must be registered in package.json`);
  }
  assert.ok(
    fs.existsSync(path.join(ROOT, 'scripts/ai-brew-method-style-audit.mjs')),
    'method-style audit script must exist',
  );
});

test('AI Brew method-style audit covers real methods, styles, guides, language, and UI surfaces', () => {
  const output = execFileSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--import',
      './tests/unit/register-sandbox-loader.mjs',
      'scripts/ai-brew-method-style-audit.mjs',
      '--mode=matrix',
      '--case-limit=1000',
      '--artifact-suffix=unit',
      '--no-docs',
    ],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const summary = JSON.parse(output.trim().split(/\r?\n/).at(-1) || '{}');

  assert.ok(summary.caseCount >= 1000, 'method-style matrix must cover at least 1000 deterministic cases');
  assert.ok(summary.methodCount >= 16, 'method-style matrix must include all visible method families');
  assert.ok(summary.styleCount >= 70, 'method-style matrix must include exposed style/gaya options');
  assert.equal(summary.failCount, 0, 'method-style matrix must have zero hard failures');
  assert.equal(summary.languageLeakCount, 0, 'method-style matrix must have zero language leakage hard failures');
  assert.equal(summary.methodLeakCount, 0, 'method-style matrix must have zero method vocabulary hard failures');
  assert.equal(summary.uiWarningCount, 0, 'method-style matrix must have zero mobile-density UI warnings');
  assert.ok(summary.guideCheckedCount >= summary.caseCount, 'each generated case must include Lite/Pro guide coverage');
  assert.ok(summary.uiCheckedCount >= summary.caseCount, 'each generated case must include result-card UI surface coverage');

  const artifactDir = path.join(ROOT, summary.artifactDir);
  for (const filename of ['summary.json', 'cases.json', 'failures.json', 'warnings.md', 'guide-snapshots.md']) {
    assert.ok(fs.existsSync(path.join(artifactDir, filename)), `${filename} must be written`);
  }
  assert.equal(summary.tutorialMismatchCount, 0, 'method-style matrix must have zero tutorial/action mismatches');
  assert.equal(summary.aeropressTargetRoastMismatchCount, 0, 'AeroPress target/roast tutorial sync must have zero mismatches');
  const cases = JSON.parse(fs.readFileSync(path.join(artifactDir, 'cases.json'), 'utf8'));
  assert.ok(cases.length >= summary.caseCount, 'cases artifact must include each generated case');
  for (const caseRecord of cases.slice(0, 40)) {
    assert.ok(caseRecord.tutorialActionCount >= caseRecord.workflowStepCount, `${caseRecord.id} must audit each generated workflow tutorial action`);
    assert.equal(caseRecord.tutorialMismatchReasons.length, 0, `${caseRecord.id} must have no tutorial/action mismatch`);
    assert.match(caseRecord.tutorialSnapshot, /[A-Za-z]/, `${caseRecord.id} must include tutorial snapshot text`);
  }
});
