import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import type { AiBrewCatalog, EquipmentCatalogEntry, ParsedNumericRange, VerificationLevel } from '../../apps/web/src/features/ai-brew/types.ts';
import {
  buildGrindSizeAdvice,
  getRatioMethodFamily,
} from '../../apps/web/src/features/barista-tools/grindSizeAdvisor.ts';
import { getGrinderSafetyProfile } from '../../apps/web/src/features/ai-brew/grinderSafetyGuardrails.ts';
import { BREW_METHOD_PROFILES } from '../../apps/web/src/features/barista-tools/brewProfiles.ts';
import type { RoastLevel } from '../../apps/web/src/features/barista-tools/types.ts';

type CoverageFailure = {
  severity: 'blocker' | 'high' | 'medium' | 'info';
  subject: string;
  message: string;
};

type ScoreBucket = {
  score: number;
  checked: number;
  failures: number;
};

const ROOT = process.cwd();
const ARTIFACT_ROOT = path.join(ROOT, 'artifacts/grinder-catalog-audit');
const ROAST_LEVELS: RoastLevel[] = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
const EXPECTED_VERIFICATION_LEVELS: VerificationLevel[] = [
  'official',
  'community_verified',
  'curated',
  'dataset_unverified',
  'fallback',
];

function installLocalDataFetch() {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const filePath = url.startsWith('/data/')
      ? path.join(ROOT, 'apps/web/public', url)
      : path.join(ROOT, url);
    const body = await fs.promises.readFile(filePath, 'utf8');
    return {
      ok: true,
      json: async () => JSON.parse(body),
    } as Response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = previousFetch;
  };
}

function currentSha() {
  try {
    return execSync('git rev-parse --short=12 HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown-sha';
  }
}

function increment(map: Record<string, number>, key: string | undefined) {
  const value = key || 'missing';
  map[value] = (map[value] || 0) + 1;
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath: string, headers: string[], rows: unknown[][]) {
  fs.writeFileSync(filePath, [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n'));
}

function hasRange(range?: ParsedNumericRange | null) {
  return Boolean(range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.max >= range.min);
}

function visibleGrinders(catalog: AiBrewCatalog) {
  return catalog.grinders.filter((grinder) => !grinder.hidden && !grinder.deprecated);
}

function hasSourceUrls(entry: { sourceUrls?: string[] }) {
  return Array.isArray(entry.sourceUrls) && entry.sourceUrls.some((url) => /^https?:\/\//i.test(url));
}

function makeBucket(checked: number, failures: number): ScoreBucket {
  return {
    checked,
    failures,
    score: checked === 0 ? 0 : Math.max(0, Math.round(((checked - failures) / checked) * 100)),
  };
}

function auditCatalogShape(catalog: AiBrewCatalog, failures: CoverageFailure[]) {
  const grinders = visibleGrinders(catalog);
  const byVerification: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let allBands = 0;
  let parsedAllBands = 0;
  let parsedAnyBand = 0;
  let methodSpecificGrinders = 0;
  let handGrinders = 0;
  let electricGrinders = 0;
  let unknownType = 0;
  const settingsByGrinder = new Map<string, number>();
  for (const setting of catalog.grinderSettings) {
    settingsByGrinder.set(setting.grinderId, (settingsByGrinder.get(setting.grinderId) || 0) + 1);
    if (['official', 'community_verified', 'curated'].includes(setting.verificationLevel) && !hasSourceUrls(setting)) {
      failures.push({
        severity: 'blocker',
        subject: setting.id,
        message: `${setting.verificationLevel} grinder setting is missing public source URLs.`,
      });
    }
    if (!setting.rangeLabel || (!setting.parsedRange && !/reference official grinder chart|manual setting required/i.test(setting.rangeLabel))) {
      failures.push({
        severity: 'blocker',
        subject: setting.id,
        message: `Setting range is not parseable or explicitly reference-only: ${setting.rangeLabel || '(empty)'}`,
      });
    }
  }

  for (const grinder of grinders) {
    increment(byVerification, grinder.verificationLevel);
    increment(byConfidence, grinder.confidence);
    increment(bySource, grinder.source);
    const bands = grinder.grindBands;
    const hasAllBands = Boolean(bands?.coarse && bands.medium && bands.fine);
    if (hasAllBands) allBands += 1;
    if ([bands?.parsedCoarse, bands?.parsedMedium, bands?.parsedFine].some(hasRange)) parsedAnyBand += 1;
    if ([bands?.parsedCoarse, bands?.parsedMedium, bands?.parsedFine].every(hasRange)) parsedAllBands += 1;
    if ((settingsByGrinder.get(grinder.id) || 0) > 0) methodSpecificGrinders += 1;
    
    if (grinder.grinderDriveType === 'hand') handGrinders += 1;
    else if (grinder.grinderDriveType === 'electric') electricGrinders += 1;
    else unknownType += 1;

    const nameText = grinder.name.toLowerCase();
    const brandText = (grinder.brand || '').toLowerCase();
    if (grinder.grinderDriveType === 'hand' && (brandText.includes('mahlkönig') || brandText.includes('eureka') || brandText.includes('mazzer'))) {
      failures.push({
        severity: 'blocker',
        subject: grinder.name,
        message: `Anomaly: ${grinder.brand} grinder marked as hand drive type.`,
      });
    }
    if (grinder.grinderDriveType === 'electric' && (brandText.includes('1zpresso') || brandText.includes('kingrinder') || brandText.includes('comandante'))) {
      failures.push({
        severity: 'blocker',
        subject: grinder.name,
        message: `Anomaly: ${grinder.brand} grinder marked as electric drive type.`,
      });
    }

    if (!hasAllBands) {
      failures.push({
        severity: 'blocker',
        subject: grinder.name,
        message: 'Visible grinder is missing coarse/medium/fine bands.',
      });
    }
    if (!EXPECTED_VERIFICATION_LEVELS.includes(grinder.verificationLevel)) {
      failures.push({
        severity: 'blocker',
        subject: grinder.name,
        message: `Unsupported verification level: ${grinder.verificationLevel}`,
      });
    }
    if (grinder.verificationLevel === 'dataset_unverified' && grinder.confidence === 'high') {
      failures.push({
        severity: 'blocker',
        subject: grinder.name,
        message: 'Dataset-unverified grinder must not have high confidence.',
      });
    }
    if (['official', 'community_verified', 'curated'].includes(grinder.verificationLevel) && !hasSourceUrls(grinder)) {
      failures.push({
        severity: 'blocker',
        subject: grinder.name,
        message: `${grinder.verificationLevel} grinder is missing public source URLs.`,
      });
    }
  }

  return {
    total: grinders.length,
    byVerification,
    byConfidence,
    bySource,
    allBands,
    parsedAnyBand,
    parsedAllBands,
    methodSpecificGrinders,
    totalSettings: catalog.grinderSettings.length,
    handGrinders,
    electricGrinders,
    unknownType,
  };
}

function evaluateMatrix(catalog: AiBrewCatalog, failures: CoverageFailure[]) {
  const grinders = visibleGrinders(catalog);
  const targetProfileIds = catalog.targetProfiles.map((profile) => profile.id);
  let checked = 0;
  let matrixFailures = 0;
  let blockedEspresso = 0;
  let selectableEspresso = 0;
  const grinderRows: unknown[][] = [];
  const methodRows: unknown[][] = [];
  const methodStats = new Map<string, { checked: number; failures: number; blocked: number; caution: number; compatible: number }>();

  for (const method of BREW_METHOD_PROFILES) {
    const stats = { checked: 0, failures: 0, blocked: 0, caution: 0, compatible: 0 };
    for (const grinder of grinders) {
      const compatibility = getGrinderSafetyProfile(catalog, getRatioMethodFamily(method.id), grinder);
      if (compatibility.state === 'compatible') stats.compatible += 1;
      if (compatibility.state === 'caution') stats.caution += 1;
      if (!compatibility.selectable) stats.blocked += 1;
      if (method.id === 'espresso') {
        if (compatibility.selectable) selectableEspresso += 1;
        else blockedEspresso += 1;
      }
      if (!compatibility.selectable) continue;

      for (const roastLevel of ROAST_LEVELS) {
        for (const targetProfileId of targetProfileIds) {
          checked += 1;
          stats.checked += 1;
          const advice = buildGrindSizeAdvice({
            catalog,
            methodId: method.id,
            grinderId: grinder.id,
            roastLevel,
            targetProfileId,
          });
          const outputText = [
            advice.primarySetting,
            advice.correctionRange,
            advice.confidenceLabel,
            advice.sourceLabel,
            advice.compatibilityReason,
          ].join(' ');
          const badOutput = /NaN|undefined|null/i.test(outputText) || !advice.primarySetting.trim();
          const fallbackOverclaim =
            (grinder.verificationLevel === 'dataset_unverified' || advice.sourceKind === 'baseline_method')
            && (advice.confidenceKind === 'official' || advice.confidenceKind === 'community_verified');
          if (badOutput || fallbackOverclaim || advice.compatibilityState === 'unsupported') {
            matrixFailures += 1;
            stats.failures += 1;
            failures.push({
              severity: 'blocker',
              subject: `${method.id}/${grinder.id}/${roastLevel}/${targetProfileId}`,
              message: badOutput
                ? `Invalid recommendation output: ${outputText}`
                : fallbackOverclaim
                  ? 'Fallback or dataset-unverified recommendation overclaimed high confidence.'
                  : 'Selectable recommendation returned unsupported compatibility.',
            });
          }
        }
      }
    }
    methodStats.set(method.id, stats);
  }

  for (const grinder of grinders) {
    const espresso = getGrinderSafetyProfile(catalog, getRatioMethodFamily('espresso'), grinder);
    const v60 = getGrinderSafetyProfile(catalog, getRatioMethodFamily('v60'), grinder);
    const frenchPress = getGrinderSafetyProfile(catalog, getRatioMethodFamily('french_press'), grinder);
    grinderRows.push([
      grinder.id,
      grinder.name,
      grinder.brand || '',
      grinder.verificationLevel,
      grinder.confidence,
      grinder.grindBands?.fine || '',
      grinder.grindBands?.medium || '',
      grinder.grindBands?.coarse || '',
      espresso.state,
      espresso.selectable,
      v60.state,
      frenchPress.state,
    ]);
  }

  for (const [methodId, stats] of methodStats.entries()) {
    methodRows.push([
      methodId,
      stats.checked,
      stats.failures,
      stats.compatible,
      stats.caution,
      stats.blocked,
      makeBucket(stats.checked, stats.failures).score,
    ]);
  }

  if (blockedEspresso === 0) {
    failures.push({
      severity: 'blocker',
      subject: 'espresso compatibility',
      message: 'No espresso grinders were blocked; compatibility guard is too permissive.',
    });
  }
  if (selectableEspresso === 0) {
    failures.push({
      severity: 'blocker',
      subject: 'espresso compatibility',
      message: 'No espresso grinders are selectable; compatibility guard is too strict.',
    });
  }

  return {
    checked,
    matrixFailures,
    blockedEspresso,
    selectableEspresso,
    grinderRows,
    methodRows,
    matrixScore: makeBucket(checked, matrixFailures),
  };
}

function buildRecommendations(failures: CoverageFailure[]) {
  if (failures.length === 0) {
    return [
      '# Grinder Catalog Recommendations',
      '',
      '- No blocker found in the software coverage gate.',
      '- Keep dataset-unverified grinders low confidence until public source URLs or calibration logs are added.',
      '- Treat every numeric setting as a starting point; real dial-in is still required for burr zero, seasoning, alignment, dose, and water.',
      '- Prioritize physical calibration logs for espresso-capable grinders before promoting confidence.',
      '',
    ].join('\n');
  }
  return [
    '# Grinder Catalog Recommendations',
    '',
    ...failures.map((failure) => `- [${failure.severity}] ${failure.subject}: ${failure.message}`),
    '',
  ].join('\n');
}

const restoreFetch = installLocalDataFetch();
try {
  const catalog = await loadAiBrewCatalog();
  const failures: CoverageFailure[] = [];
  const catalogShape = auditCatalogShape(catalog, failures);
  const matrix = evaluateMatrix(catalog, failures);
  const blockerCount = failures.filter((failure) => failure.severity === 'blocker').length;
  const highCount = failures.filter((failure) => failure.severity === 'high').length;
  const sha = currentSha();
  const outDir = path.join(ARTIFACT_ROOT, sha);
  fs.mkdirSync(outDir, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    sha,
    catalogShape,
    matrix: {
      checked: matrix.checked,
      failures: matrix.matrixFailures,
      score: matrix.matrixScore.score,
      blockedEspresso: matrix.blockedEspresso,
      selectableEspresso: matrix.selectableEspresso,
    },
    scores: {
      grinderCoverage: catalogShape.allBands === catalogShape.total ? 100 : Math.round((catalogShape.allBands / Math.max(1, catalogShape.total)) * 100),
      parsedRangeCoverage: Math.round((catalogShape.parsedAllBands / Math.max(1, catalogShape.total)) * 100),
      methodSpecificCoverage: Math.round((catalogShape.methodSpecificGrinders / Math.max(1, catalogShape.total)) * 100),
      methodCompatibility: matrix.matrixScore.score,
      espressoSafety: matrix.blockedEspresso > 0 && matrix.selectableEspresso > 0 ? 100 : 0,
      confidenceHonesty: blockerCount === 0 ? 100 : Math.max(0, 100 - blockerCount * 10),
    },
    blockerCount,
    highCount,
  };

  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, 'failures.json'), JSON.stringify(failures, null, 2));
  writeCsv(path.join(outDir, 'coverage.csv'), [
    'grinder_id',
    'name',
    'brand',
    'verification_level',
    'confidence',
    'fine',
    'medium',
    'coarse',
    'espresso_state',
    'espresso_selectable',
    'v60_state',
    'french_press_state',
  ], matrix.grinderRows);
  writeCsv(path.join(outDir, 'method-scores.csv'), [
    'method_id',
    'checked',
    'failures',
    'compatible_grinders',
    'caution_grinders',
    'blocked_grinders',
    'score',
  ], matrix.methodRows);
  fs.writeFileSync(path.join(outDir, 'recommendations.md'), buildRecommendations(failures));

  console.log(`Grinder catalog coverage report: artifacts/grinder-catalog-audit/${sha}`);
  console.log(JSON.stringify(summary, null, 2));


  if (blockerCount > 0 || highCount > 0) {
    console.error(`FAIL: ${blockerCount} blocker and ${highCount} high-risk grinder coverage issue(s).`);
    process.exit(1);
  }
  if (summary.scores.espressoSafety < 95 || summary.scores.confidenceHonesty < 95 || summary.scores.methodCompatibility < 90) {
    console.error('FAIL: grinder coverage score is below production threshold.');
    process.exit(1);
  }
  console.log('PASS: grinder catalog coverage gate is production-safe.');
} finally {
  restoreFetch();
}
