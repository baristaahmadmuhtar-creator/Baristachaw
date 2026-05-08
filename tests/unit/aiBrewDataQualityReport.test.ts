import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { AI_BREW_DATABASE_ACCURACY_ROADMAP } from '../../apps/web/src/features/ai-brew/databaseAccuracyRoadmap.ts';

test('ai brew database accuracy roadmap keeps evidence-first promotion gates', () => {
  assert.ok(AI_BREW_DATABASE_ACCURACY_ROADMAP.priorityMarkets.includes('Indonesia'));
  assert.ok(AI_BREW_DATABASE_ACCURACY_ROADMAP.priorityWaters.includes('Aqua'));
  assert.ok(AI_BREW_DATABASE_ACCURACY_ROADMAP.priorityGrinders.includes('1Zpresso K-Ultra'));

  const fallbackWater = AI_BREW_DATABASE_ACCURACY_ROADMAP.waterEvidenceRequirements.find((entry) => entry.evidenceLevel === 'fallback_estimate');
  const officialGrinder = AI_BREW_DATABASE_ACCURACY_ROADMAP.grinderEvidenceRequirements.find((entry) => entry.evidenceLevel === 'official_public');

  assert.equal(fallbackWater?.acceptedForProduction, false);
  assert.equal(officialGrinder?.acceptedForProduction, true);
  assert.match(AI_BREW_DATABASE_ACCURACY_ROADMAP.promotionRules.official, /official/i);
  assert.match(AI_BREW_DATABASE_ACCURACY_ROADMAP.promotionRules.manual_only, /manual/i);
});

test('ai brew data quality report generator writes consolidated audit artifacts', () => {
  const reportDir = path.resolve(process.cwd(), 'artifacts/ai-brew-audit/unit-report');
  const tsxCli = path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  fs.rmSync(reportDir, { recursive: true, force: true });

  execFileSync(process.execPath, [tsxCli, 'scripts/catalog/audit-grinder-catalog.ts', `--report-dir=${reportDir}`], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  execFileSync(process.execPath, [tsxCli, 'scripts/catalog/audit-water-catalog.ts', `--report-dir=${reportDir}`], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  execFileSync(process.execPath, [tsxCli, 'scripts/catalog/build-ai-brew-data-quality-report.ts', `--report-dir=${reportDir}`], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });

  const reportPath = path.join(reportDir, 'dataQualityReport.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
    water: { totalProfiles: number; riskyEntries: unknown[] };
    grinder: { totalModels: number; totalSettingReferences: number; riskyEntries: unknown[] };
    evidencePolicy: { waters: string[]; grinders: string[] };
  };

  assert.ok(report.water.totalProfiles > 0);
  assert.ok(report.grinder.totalModels > 0);
  assert.ok(report.grinder.totalSettingReferences > 0);
  assert.ok(Array.isArray(report.water.riskyEntries));
  assert.ok(Array.isArray(report.grinder.riskyEntries));
  assert.match(report.evidencePolicy.waters.join(' '), /remineralized/i);
  assert.match(report.evidencePolicy.grinders.join(' '), /starting points/i);
});
